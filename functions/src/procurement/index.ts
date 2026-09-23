import { https } from "firebase-functions/v1";
import { getFirestore, Transaction } from "firebase-admin/firestore";

export const submitRequisition = https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new https.HttpsError("unauthenticated", "Authentication required.");
  }

  const { idempotencyKey, title, amount, vendorId, vendorName, description, attachmentName, attachmentUrl } = data || {};
  if (!idempotencyKey || !title || !amount) {
    throw new https.HttpsError("invalid-argument", "Missing idempotencyKey, title, or amount.");
  }

  const db = getFirestore();
  const callerUid = context.auth.uid;

  const userSnap = await db.collection("users").doc(callerUid).get();
  if (!userSnap.exists) {
    throw new https.HttpsError("not-found", "User profile not found.");
  }

  const userData = userSnap.data()!;
  const orgId = userData.orgId;
  const idempotencyRef = db.collection("idempotency_keys").doc(String(idempotencyKey));

  // Server-Side Idempotency Protection Transaction
  const result = await db.runTransaction(async (transaction: Transaction) => {
    const keySnap = await transaction.get(idempotencyRef);
    if (keySnap.exists) {
      // Idempotency key already processed, return existing record ID
      return { success: true, duplicate: true, requisitionId: keySnap.data()!.requisitionId };
    }

    // Generate transactional serial number
    const reqsQuery = db.collection("requisitions").where("orgId", "==", orgId);
    const reqsSnap = await transaction.get(reqsQuery);
    const serialNo = `REQ-${String(reqsSnap.size + 1).padStart(4, "0")}`;

    const now = new Date().toISOString();
    const reqRef = db.collection("requisitions").doc();

    const initialActivity = {
      type: "LOG",
      actorId: callerUid,
      actorName: userData.fullName || "Staff Member",
      timestamp: now,
      text: "created the requisition and sent for HR approval.",
      fromStatus: "N/A",
      toStatus: "PENDING_HR",
    };

    const newRequisition = {
      id: reqRef.id,
      serialNo,
      orgId,
      createdBy: callerUid,
      creatorName: userData.fullName || "Staff Member",
      title: String(title).trim(),
      amount: Number(amount),
      vendorId: vendorId || null,
      vendorName: vendorName || "Unknown Vendor",
      description: String(description || "").trim(),
      status: "PENDING_HR",
      createdAt: now,
      activity: [initialActivity],
      attachmentUrl: attachmentUrl || null,
      attachmentName: attachmentName || null,
    };

    transaction.set(reqRef, newRequisition);
    transaction.set(idempotencyRef, {
      idempotencyKey,
      requisitionId: reqRef.id,
      createdAt: now,
      createdBy: callerUid,
    });

    return { success: true, duplicate: false, requisitionId: reqRef.id, serialNo };
  });

  return result;
});
