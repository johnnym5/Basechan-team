import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { differenceInSeconds } from "date-fns";

admin.initializeApp();

export const autoClockOutDaily = onSchedule({
  schedule: "30 18 * * *",
  timeZone: "Africa/Lagos"
}, async (event) => {
  const db = admin.firestore();
  const now = new Date();

  // Query all active attendance sessions where clockOut is null
  const activeShiftsQuery = db.collection("attendance").where("clockOut", "==", null);
  const snap = await activeShiftsQuery.get();

  for (const docSnap of snap.docs) {
    const record = docSnap.data();
    const recordRef = docSnap.ref;

    // Determine target clockOut: 17:00 (5:00 PM) on the day they clocked in
    const clockInDate = new Date(record.clockIn);
    let clockOutDate = new Date(clockInDate);
    clockOutDate.setHours(17, 0, 0, 0);

    // If clock-in happened after 17:00, use the current run time
    if (clockOutDate <= clockInDate) {
      clockOutDate = now;
    }

    const clockOutIso = clockOutDate.toISOString();
    const totalDurationSec = differenceInSeconds(clockOutDate, clockInDate);
    let duration = Math.max(0, totalDurationSec - (record.totalBreak || 0) - (record.idleTime || 0));

    const currentRemarks = record.remarks || [];
    const remarksSet = new Set([...currentRemarks, "AUTO_CLOCKED_OUT"]);
    const remarks = Array.from(remarksSet);

    const finalUpdate: any = {
      clockOut: clockOutIso,
      status: "APPROVED",
      onBreak: false,
      remarks,
      duration
    };

    // If the user was on active break, close the break session
    if (record.onBreak && record.breaks && record.breaks.length > 0) {
      const lastBreak = record.breaks[record.breaks.length - 1];
      if (!lastBreak.end) {
        const breakSeconds = differenceInSeconds(clockOutDate, new Date(lastBreak.start));
        const updatedBreaks = [...record.breaks];
        updatedBreaks[updatedBreaks.length - 1].end = clockOutIso;
        finalUpdate.breaks = updatedBreaks;
        finalUpdate.totalBreak = admin.firestore.FieldValue.increment(breakSeconds);
        finalUpdate.duration = Math.max(0, duration - breakSeconds);
      }
    }

    // Update attendance record
    await recordRef.update(finalUpdate);

    // Sync corresponding user status to OFFLINE
    const userRef = db.collection("users").doc(record.userId);
    await userRef.update({
      status: "OFFLINE",
      lastSeen: clockOutIso
    });

    console.log(`Auto Clockout: Successfully finalized shift for ${record.userName} (ID: ${docSnap.id})`);
  }
});
