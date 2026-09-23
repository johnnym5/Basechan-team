import { firestore, https } from "firebase-functions/v1";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Syncs user profile role and metadata to Firebase Auth Custom Claims.
 * Triggered automatically when a user document is updated in Firestore.
 */
export const syncUserCustomClaimsOnWrite = firestore
  .document("users/{userId}")
  .onWrite(async (change) => {
    const userId = change.after.id;
    if (!change.after.exists) {
      return null;
    }

    const userData = change.after.data()!;
    const role = userData.role || "STAFF";
    const orgId = userData.orgId || "";
    const department = userData.department || "";

    const auth = getAuth();
    try {
      await auth.setCustomUserClaims(userId, {
        role,
        orgId,
        department,
        canBypassGeofence: Boolean(userData.canBypassGeofence || role === "SUPERADMIN" || role === "ORG_ADMIN"),
      });

      console.log(`Successfully synced Custom Claims for user ${userId}: role=${role}, orgId=${orgId}`);
    } catch (error) {
      console.error(`Failed to set Custom Claims for user ${userId}:`, error);
    }
    return null;
  });

/**
 * Callable function for SuperAdmin to set custom claims explicitly.
 */
export const setCustomClaimsAdmin = https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new https.HttpsError("unauthenticated", "Authentication required.");
  }

  const callerRole = context.auth.token.role;
  if (callerRole !== "SUPERADMIN" && callerRole !== "ORG_ADMIN") {
    throw new https.HttpsError("permission-denied", "Only SuperAdmins or OrgAdmins can modify user claims.");
  }

  const { targetUserId, role, orgId, department, canBypassGeofence } = data || {};
  if (!targetUserId || !role) {
    throw new https.HttpsError("invalid-argument", "Target User ID and Role are required.");
  }

  const auth = getAuth();
  const db = getFirestore();

  await auth.setCustomUserClaims(targetUserId, {
    role,
    orgId: orgId || "",
    department: department || "",
    canBypassGeofence: Boolean(canBypassGeofence),
  });

  // Keep Firestore document in sync
  await db.collection("users").doc(targetUserId).update({
    role,
    ...(orgId ? { orgId } : {}),
    ...(department ? { department } : {}),
    updatedAt: new Date().toISOString(),
  });

  // Audit log
  await db.collection("audit_logs").add({
    orgId: context.auth.token.orgId || orgId || "",
    actorId: context.auth.uid,
    action: "ROLE_CLAIM_UPDATE",
    details: `Updated user ${targetUserId} custom claims to role: ${role}`,
    targetId: targetUserId,
    targetType: "USER",
    timestamp: new Date().toISOString(),
  });

  return { success: true, message: `Updated claims for ${targetUserId}` };
});

/**
 * Start authenticated Impersonation Session strictly restricted to SUPERADMIN.
 */
export const startImpersonationSession = https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new https.HttpsError("unauthenticated", "Authentication required.");
  }

  const callerUid = context.auth.uid;
  const callerRole = context.auth.token.role;

  // Strict check: Caller MUST be a verified SUPERADMIN in Auth token claims
  if (callerRole !== "SUPERADMIN") {
    throw new https.HttpsError("permission-denied", "Impersonation requires authenticated SUPERADMIN claim.");
  }

  const { targetUserId } = data || {};
  const db = getFirestore();
  const now = new Date().toISOString();

  let targetUserEmail = "Staff Mode";
  if (targetUserId) {
    const targetSnap = await db.collection("users").doc(targetUserId).get();
    if (!targetSnap.exists) {
      throw new https.HttpsError("not-found", "Target user profile not found.");
    }
    targetUserEmail = targetSnap.data()!.email || targetUserId;
  }

  // Record immutable audit log
  await db.collection("audit_logs").add({
    orgId: context.auth.token.orgId || "SYSTEM",
    actorId: callerUid,
    action: "IMPERSONATION_START",
    details: `SuperAdmin ${callerUid} initiated impersonation session targeting ${targetUserEmail}`,
    targetId: targetUserId || "STAFF_MODE",
    targetType: "IMPERSONATION",
    timestamp: now,
  });

  return {
    success: true,
    isImpersonating: true,
    targetUserId: targetUserId || null,
    timestamp: now,
  };
});
