const admin = require("firebase-admin");
const cors = require("cors");
const express = require("express");
const rateLimit = require("express-rate-limit");
const { getSlotConfig } = require("../functions/slots-configs");
const { normalizeFeatureState, runSpin } = require("../functions/slots-engine-runtime");

function loadServiceAccountFromEnv() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
  }

  try {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (error) {
    throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${error.message}`);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccountFromEnv())
  });
}

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const spinLimiter = rateLimit({
  windowMs: 15 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler(_req, res) {
    return sendError(res, 429, "Too many requests");
  }
});

function sendError(res, status, error) {
  return res.status(status).json({
    error
  });
}

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS blocked"));
  },
  credentials: true
}));
app.use(express.json({ limit: "64kb" }));
app.use("/spin", spinLimiter);

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
  res.status(200).json({
    status: "ok",
    timestamp: Date.now()
  });
});

app.post("/spin", async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return sendError(res, 400, "Invalid request body");
    }

    const requestedBetAmount = req.body.betAmount ?? req.body.stake ?? req.body.bet;
    if (typeof requestedBetAmount !== "number" || !Number.isFinite(requestedBetAmount)) {
      return sendError(res, 400, "Invalid bet amount");
    }

    const decoded = await verifyIdToken(req);
    const uid = decoded.uid;

    const machineId = safeString(req.body?.machineId || req.body?.configId || "noir_paylines_5x3", 80);
    const roundId = safeString(req.body?.roundId || "", 120);
    const stake = safeInt(requestedBetAmount, -1);
    const denom = safeInt(req.body?.denom ?? 1, 1);
    const clientSeed = safeString(req.body?.clientSeed || "", 160);
    const featureState = normalizeFeatureState(req.body?.state || req.body?.featureState || null);

    if (!roundId) {
      return sendError(res, 400, "roundId required");
    }
    if (!Number.isInteger(stake) || stake < 1) {
      return sendError(res, 400, "stake must be a positive integer");
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
    return sendError(res, status, status === 500 ? "Internal server error" : message);
  }
});

app.use((err, _req, res, _next) => {
  console.error("Server error:", err);
  if (err?.message === "CORS blocked") {
    return sendError(res, 403, "CORS blocked");
  }
  return sendError(res, 500, "Internal server error");
});

module.exports = {
  app,
  verifyIdToken
};

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Slot server running on port ${PORT}`);
  });
}
