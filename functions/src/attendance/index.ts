import { https } from "firebase-functions/v1";
import { getFirestore } from "firebase-admin/firestore";

const GEOFENCE_RADIUS_METERS = 100;

interface BranchLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius?: number;
}

const DEFAULT_BRANCHES: BranchLocation[] = [
  { id: "abuja", name: "Abuja Office", lat: 9.049688, lng: 7.481471, radius: 100 },
  { id: "benin", name: "Benin Office", lat: 6.333300, lng: 5.622200, radius: 100 },
];

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateHaversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const clockInSession = https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new https.HttpsError("unauthenticated", "Authentication required.");
  }

  const { lat, lng, today, lateReason, branchName } = data || {};
  if (!today) {
    throw new https.HttpsError("invalid-argument", "Date is required for clock-in.");
  }

  const db = getFirestore();
  const callerUid = context.auth.uid;

  const userSnap = await db.collection("users").doc(callerUid).get();
  if (!userSnap.exists) {
    throw new https.HttpsError("not-found", "User profile not found.");
  }

  const userData = userSnap.data()!;
  const orgId = userData.orgId;

  // Server-Authoritative Geofence Calculation
  let branches = DEFAULT_BRANCHES;
  if (orgId) {
    const sysConfigSnap = await db.collection("system_configs").doc(orgId).get();
    if (sysConfigSnap.exists && sysConfigSnap.data()?.branches) {
      branches = sysConfigSnap.data()!.branches;
    }
  }

  let isWithinGeofence = false;
  let closestBranch: BranchLocation | null = null;
  let minDistanceMeters = Infinity;

  if (typeof lat === "number" && typeof lng === "number") {
    for (const b of branches) {
      const dist = calculateHaversineDistanceMeters(lat, lng, b.lat, b.lng);
      if (dist < minDistanceMeters) {
        minDistanceMeters = dist;
        closestBranch = b;
      }
      const allowedRadius = b.radius || GEOFENCE_RADIUS_METERS;
      if (dist <= allowedRadius) {
        isWithinGeofence = true;
      }
    }
  }

  // Exempt roles
  const userRole = context.auth.token.role || userData.role;
  const isBypassRole = ["SUPERADMIN", "ORG_ADMIN", "MANAGING_DIRECTOR", "HR_MANAGER"].includes(userRole);
  const isExempt = isBypassRole || context.auth.token.canBypassGeofence === true;

  const now = new Date();
  const nowIso = now.toISOString();
  const deterministicId = `${callerUid}_${today}`;
  const attRef = db.collection("attendance").doc(deterministicId);

  const status = isWithinGeofence || isExempt ? "APPROVED" : "PENDING";
  const remarks: string[] = [];

  if (!isWithinGeofence && !isExempt) {
    remarks.push("GEOFENCE_BYPASS_ATTEMPT");
  }

  const attendancePayload = {
    id: deterministicId,
    userId: callerUid,
    userName: userData.fullName || "Staff Member",
    orgId: userData.orgId || "",
    date: today,
    clockIn: nowIso,
    clockOut: null,
    status,
    location: isWithinGeofence ? "OFFICE" : "REMOTE",
    remarks,
    idleTime: 0,
    totalBreak: 0,
    onBreak: false,
    breaks: [],
    lateReason: lateReason || null,
    clockInLocation: typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null,
    serverCalculatedDistanceMeters: Math.round(minDistanceMeters),
    branchName: branchName || (closestBranch ? closestBranch.name : null),
    branchLocation: closestBranch ? closestBranch.name : null,
    createdAt: nowIso,
  };

  await attRef.set(attendancePayload, { merge: true });

  // Update user online status
  await db.collection("users").doc(callerUid).update({
    status: status === "APPROVED" ? "ONLINE" : "PENDING",
    lastSeen: nowIso,
  });

  return {
    success: true,
    status,
    isWithinGeofence,
    distanceMeters: Math.round(minDistanceMeters),
    recordId: deterministicId,
  };
});

export const clockOutSession = https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new https.HttpsError("unauthenticated", "Authentication required.");
  }

  const { recordId, debriefReport, attachedTaskId } = data || {};
  if (!recordId) {
    throw new https.HttpsError("invalid-argument", "Record ID is required.");
  }

  const db = getFirestore();
  const callerUid = context.auth.uid;

  const attRef = db.collection("attendance").doc(recordId);
  const attSnap = await attRef.get();

  if (!attSnap.exists) {
    throw new https.HttpsError("not-found", "Attendance record not found.");
  }

  const record = attSnap.data()!;
  if (record.userId !== callerUid) {
    throw new https.HttpsError("permission-denied", "Unauthorized shift access.");
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const clockInTime = new Date(record.clockIn);
  const totalDurationSec = Math.max(0, Math.floor((now.getTime() - clockInTime.getTime()) / 1000));

  const finalUpdate: any = {
    clockOut: nowIso,
    status: "APPROVED",
    onBreak: false,
    duration: Math.max(0, totalDurationSec - (record.totalBreak || 0) - (record.idleTime || 0)),
    eodReport: debriefReport || null,
    linkedTaskIds: attachedTaskId ? [attachedTaskId] : [],
    updatedAt: nowIso,
  };

  await attRef.update(finalUpdate);

  await db.collection("users").doc(callerUid).update({
    status: "OFFLINE",
    lastSeen: nowIso,
  });

  return { success: true, message: "Successfully clocked out." };
});
