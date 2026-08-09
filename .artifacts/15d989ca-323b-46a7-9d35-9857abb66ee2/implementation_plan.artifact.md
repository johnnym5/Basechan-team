# Implementation Plan - Staff Attendance Analytics & UI Layering Fix

This plan covers the fixing of z-index issues in the header/notifications, the creation of a new performant HR analytics component with daily session drill-downs, and its integration into the Staff Profile and Attendance Command Center with RBAC.

## User Review Required

> [!IMPORTANT]
> The `Attendance` type will be updated to include a `sessions` array. Ensure that the backend/ingestion logic populates this array for the analytics component to function correctly.

## Proposed Changes

### [Core] Types & Data Model

#### [MODIFY] [types.ts](file:///C:/Users/HP/Documents/CODING/Basechan-team-main/src/lib/types.ts)
- Update `Attendance` interface to include `sessions: AttendanceSession[]`.
- Add `AttendanceSession` interface with `clockIn: string` and `clockOut?: string`.

---

### [UI/UX] Stacking Context Fixes

#### [MODIFY] [AppHeader.tsx](file:///C:/Users/HP/Documents/CODING/Basechan-team-main/src/components/layout/AppHeader.tsx)
- Enforce `relative z-50 bg-background/80 backdrop-blur-md` on the main `<header>`.
- Add `z-[100]` to `PopoverContent` for notifications.
- Ensure no `overflow-hidden` on the header or wrapper that clips the dropdown.

#### [MODIFY] [NotificationsDialog.tsx](file:///C:/Users/HP/Documents/CODING/Basechan-team-main/src/components/layout/NotificationsDialog.tsx)
- Add `z-[100]` to `DialogContent` if necessary (though Dialogs usually portal to body).

---

### [Feature] HR Analytics Component

#### [NEW] [StaffAttendanceAnalytics.tsx](file:///C:/Users/HP/Documents/CODING/Basechan-team-main/src/components/attendance/StaffAttendanceAnalytics.tsx)
- **Props**: `staffId: string`.
- **State**: `selectedMonth: Date`, `selectedDate: Date | undefined`.
- **Logic**:
    - Fetch attendance records for the month.
    - `useMemo` for metrics: Days Worked, Avg Work Hours, Avg Clock-in.
    - Helper `calculateDailyTotalHours(sessions)` to aggregate time safely.
- **UI**:
    - Top Metrics Grid (4 cards).
    - Split Layout: Calendar (Left) | Pill Accordion (Right).
    - Accordion maps through `sessions` for the selected day.
    - Warning badge for missing clock-outs.

---

### [Integration] RBAC & Placement

#### [MODIFY] [Employee360Profile.tsx](file:///C:/Users/HP/Documents/CODING/Basechan-team-main/src/components/profile/staff/Employee360Profile.tsx)
- Add "Attendance" tab to the `TabsList`.
- Render `StaffAttendanceAnalytics` inside `TabsContent` only if `isAdmin` is true.

#### [MODIFY] [AttendancePageContent.tsx](file:///C:/Users/HP/Documents/CODING/Basechan-team-main/src/components/attendance/AttendancePageContent.tsx)
- Add "Historical Analytics" tab.
- Implement a `Select` component to choose a staff member.
- Pass selected staff ID to `StaffAttendanceAnalytics`.

## Verification Plan

### Automated Tests
- Verification of `calculateDailyTotalHours` helper logic via a scratch script.

### Manual Verification
- Verify `AppHeader` z-index by opening notifications and ensuring it overlaps content.
- Verify `StaffAttendanceAnalytics` metrics and accordion behavior on both Profile and Attendance pages.
- Verify RBAC: Ensure standard staff cannot see the Attendance tab in their own or others' profiles.
