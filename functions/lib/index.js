"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoClockOutDailyV1 = exports.startImpersonationSession = exports.setCustomClaimsAdmin = exports.syncUserCustomClaimsOnWrite = exports.submitRequisition = exports.clockOutSession = exports.clockInSession = exports.postJournalEntry = exports.createJournalEntry = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const v1_1 = require("firebase-functions/v1");
const date_fns_1 = require("date-fns");
var accounting_1 = require("./accounting");
Object.defineProperty(exports, "createJournalEntry", { enumerable: true, get: function () { return accounting_1.createJournalEntry; } });
Object.defineProperty(exports, "postJournalEntry", { enumerable: true, get: function () { return accounting_1.postJournalEntry; } });
var attendance_1 = require("./attendance");
Object.defineProperty(exports, "clockInSession", { enumerable: true, get: function () { return attendance_1.clockInSession; } });
Object.defineProperty(exports, "clockOutSession", { enumerable: true, get: function () { return attendance_1.clockOutSession; } });
var procurement_1 = require("./procurement");
Object.defineProperty(exports, "submitRequisition", { enumerable: true, get: function () { return procurement_1.submitRequisition; } });
var auth_1 = require("./auth");
Object.defineProperty(exports, "syncUserCustomClaimsOnWrite", { enumerable: true, get: function () { return auth_1.syncUserCustomClaimsOnWrite; } });
Object.defineProperty(exports, "setCustomClaimsAdmin", { enumerable: true, get: function () { return auth_1.setCustomClaimsAdmin; } });
Object.defineProperty(exports, "startImpersonationSession", { enumerable: true, get: function () { return auth_1.startImpersonationSession; } });
exports.autoClockOutDailyV1 = v1_1.pubsub
    .schedule("30 18 * * *")
    .timeZone("Africa/Lagos")
    .onRun(async () => {
    if (!(0, app_1.getApps)().length) {
        (0, app_1.initializeApp)();
    }
    const db = (0, firestore_1.getFirestore)();
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
        const totalDurationSec = (0, date_fns_1.differenceInSeconds)(clockOutDate, clockInDate);
        let duration = Math.max(0, totalDurationSec - (record.totalBreak || 0) - (record.idleTime || 0));
        const currentRemarks = record.remarks || [];
        const remarksSet = new Set([...currentRemarks, "AUTO_CLOCKED_OUT"]);
        const remarks = Array.from(remarksSet);
        const finalUpdate = {
            clockOut: clockOutIso,
            status: "APPROVED",
            onBreak: false,
            remarks,
            duration
        };
        if (record.onBreak && record.breaks && record.breaks.length > 0) {
            const lastBreak = record.breaks[record.breaks.length - 1];
            if (!lastBreak.end) {
                const breakSeconds = (0, date_fns_1.differenceInSeconds)(clockOutDate, new Date(lastBreak.start));
                const updatedBreaks = [...record.breaks];
                updatedBreaks[updatedBreaks.length - 1].end = clockOutIso;
                finalUpdate.breaks = updatedBreaks;
                finalUpdate.totalBreak = firestore_1.FieldValue.increment(breakSeconds);
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
//# sourceMappingURL=index.js.map