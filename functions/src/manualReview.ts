import * as functions from "firebase-functions";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { requireAuthed } from "./utils";
import { optionalString } from "./walletStore";

type ManualReviewReq = {
  payid?: string;
  reference?: string;
  description?: string;
  filePath?: string;
};

export const vvCreateManualReview = functions.https.onCall(
  async (data: ManualReviewReq, context) => {
    const uid = requireAuthed(context);
    const filePath = optionalString(data?.filePath, 300);

    if (!filePath.startsWith(`uploads/${uid}/`)) {
      throw new functions.https.HttpsError("permission-denied", "Invalid upload path");
    }

    const db = getFirestore();
    const ref = db.collection("manualReviews").doc();
    await ref.set({
      uid,
      payid: optionalString(data?.payid, 120),
      reference: optionalString(data?.reference, 60),
      description: optionalString(data?.description, 500),
      filePath,
      status: "pending",
      createdAt: FieldValue.serverTimestamp()
    });

    return { ok: true, id: ref.id };
  }
);
