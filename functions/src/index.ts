import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { pubsub } from "firebase-functions/v1";
import { differenceInSeconds } from "date-fns";

export { createJournalEntry, postJournalEntry } from "./accounting";
export { clockInSession, clockOutSession } from "./attendance";
export { submitRequisition } from "./procurement";
export { syncUserCustomClaimsOnWrite, setCustomClaimsAdmin, startImpersonationSession } from "./auth";

export const autoClockOutDailyV1 = pubsub
  .schedule("30 18 * * *")
  .timeZone("Africa/Lagos")
  .onRun(async () => {
    if (!getApps().length) {
      initializeApp();
    }
    const db = getFirestore();
    const now = new Date();

    // Query all active attendance sessions where clockOut is null
    const activeShiftsQuery = db.collection("attendance").where("clockOut", "==", null);
    const snap = await activeShiftsQuery.get();

    for (const docSnap of snap.docs) {
      const record = docSnap.data();
      const recordRef = docSnap.ref;

      const clockInDate = new Date(record.clockIn);
      let clockOutDate = new Date(clockInDate);
      clockOutDate.setHours(17, 0, 0, 0);

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

      if (record.onBreak && record.breaks && record.breaks.length > 0) {
        const lastBreak = record.breaks[record.breaks.length - 1];
        if (!lastBreak.end) {
          const breakSeconds = differenceInSeconds(clockOutDate, new Date(lastBreak.start));
          const updatedBreaks = [...record.breaks];
          updatedBreaks[updatedBreaks.length - 1].end = clockOutIso;
          finalUpdate.breaks = updatedBreaks;
          finalUpdate.totalBreak = FieldValue.increment(breakSeconds);
          finalUpdate.duration = Math.max(0, duration - breakSeconds);
        }
      }

      await recordRef.update(finalUpdate);

      const userRef = db.collection("users").doc(record.userId);
      await userRef.update({
        status: "OFFLINE",
        lastSeen: clockOutIso
      });

      console.log(`Auto Clockout: Successfully finalized shift for ${record.userName} (ID: ${docSnap.id})`);
    }
  });
