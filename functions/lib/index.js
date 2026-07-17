"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoClockOutDaily = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const date_fns_1 = require("date-fns");
admin.initializeApp();
exports.autoClockOutDaily = (0, scheduler_1.onSchedule)({
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
        // If the user was on active break, close the break session
        if (record.onBreak && record.breaks && record.breaks.length > 0) {
            const lastBreak = record.breaks[record.breaks.length - 1];
            if (!lastBreak.end) {
                const breakSeconds = (0, date_fns_1.differenceInSeconds)(clockOutDate, new Date(lastBreak.start));
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
//# sourceMappingURL=index.js.map