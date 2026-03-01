const admin = require("firebase-admin");
const express = require("express");
const fs = require("fs");
const path = require("path");
const { getSlotConfig } = require("../functions/slots-configs");
const { normalizeFeatureState, runSpin } = require("../functions/slots-engine-runtime");

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : path.join(__dirname, "serviceAccountKey.json");

  if (!fs.existsSync(configuredPath)) {
    throw new Error(
      `Missing service account key. Expected ${configuredPath}. ` +
      "Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS."
    );
  }

  return require(configuredPath);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount())
  });
}

const app = express();
app.use(express.json({ limit: "64kb" }));

function safeInt(value, min = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.floor(parsed));
}

function safeString(value, max = 120) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

async function verifyIdToken(req) {
  const authHeader = String(req.headers.authorization || "");
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    throw new Error("missing token");
  }
  return admin.auth().verifyIdToken(match[1]);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "slot-server" });
});

app.post("/spin", async (req, res) => {
  try {
    const decoded = await verifyIdToken(req);
    const uid = decoded.uid;

    const machineId = safeString(req.body?.machineId || req.body?.configId || "noir_paylines_5x3", 80);
    const roundId = safeString(req.body?.roundId || "", 120);
    const stake = safeInt(req.body?.stake ?? req.body?.bet, -1);
    const denom = safeInt(req.body?.denom ?? 1, 1);
    const clientSeed = safeString(req.body?.clientSeed || "", 160);
    const featureState = normalizeFeatureState(req.body?.state || req.body?.featureState || null);

    if (!roundId) {
      return res.status(400).json({ ok: false, error: "roundId required" });
    }
    if (!Number.isInteger(stake) || stake < 1) {
      return res.status(400).json({ ok: false, error: "stake must be a positive integer" });
    }

    const config = getSlotConfig(machineId);
    const spin = runSpin(config, {
      bet: stake,
      denom,
      roundId,
      seed: clientSeed || `${uid}:${roundId}`,
      featureState
    });

    console.log(JSON.stringify({
      type: "slot_spin",
      uid,
      roundId,
      machineId: config.id,
      stake,
      totalWin: spin.result.totalWin
    }));

    res.json({
      ok: true,
      machineId: config.id,
      outcome: {
        ...spin.result,
        totalPayout: spin.result.totalWin
      },
      audit: spin.audit
    });
  } catch (error) {
    const message = String(error?.message || error || "slot server error");
    const status = /token/i.test(message) ? 401 : 500;
    res.status(status).json({ ok: false, error: message });
  }
});

module.exports = {
  app,
  verifyIdToken
};

if (require.main === module) {
  const port = safeInt(process.env.PORT || 3000, 1);
  app.listen(port, () => {
    console.log(`slot server on :${port}`);
  });
}
