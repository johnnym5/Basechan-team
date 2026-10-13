# Dashboard UI/UX & Interactive Operational Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the UT Basechan Dashboard UI/UX to Executive Glassmorphism (`#090d16` canvas, frosted glass cards, high contrast) and introduce an interactive **Operational Calendar & Attendance Hub** with pre-populated Nigerian public holidays, color-coded shift status badges, and dual Staff/Admin day inspection drawers.

**Architecture:** Dual-tab dashboard layout (**Overview** vs. **Operational Calendar & Attendance**). `OperationalCalendarHub.tsx` handles month/week/day views, color-coded status badges, and day inspection drawers. `GlobalCommandPalette.tsx` adds predictive auto-recommendations as the user types.

**Tech Stack:** Next.js 15, Tailwind CSS, Lucide Icons, Date-fns, Recharts, Firebase Web SDK v11.

**Spec:** [`docs/superpowers/specs/2026-09-24-dashboard-calendar-overhaul-design.md`](file:///C:/Users/HP/Documents/CODING/Basechan-team-main/docs/superpowers/specs/2026-09-24-dashboard-calendar-overhaul-design.md)

## Global Constraints

- **Executive Glassmorphism:** Canvas `#090d16`, cards `bg-slate-900/60 backdrop-blur-2xl border-white/10 shadow-2xl rounded-[2.5rem]`.
- **Nigerian Public Holidays Pre-Populated:** Includes official Nigerian holidays rendered with purple badges.
- **Color-Coded Statuses:** Holiday (purple), On-time (green), Late (amber), Remote (cyan), Missed (red), Leave (orange).
- **Type Safety & Build:** `npx tsc --noEmit` and `npm run build` must pass with 0 errors after each task.

## Review Focus

- **Calendar Interactivity:** Verify that clicking any day cell opens the Day Inspection Drawer (Staff Mode) or Team Day Audit Panel (Admin Mode).
- **Predictive Search:** Verify that typing keywords ("leave", "report", "task", "holiday") in Command Palette shows live auto-recommendations.

---

### Task 1: Nigerian Public Holidays & Calendar Types (`src/lib/holidays.ts` & `src/types/calendar.ts`)

**Files:**
- Create: `src/lib/holidays.ts`
- Create: `src/types/calendar.ts`

**Interfaces:**
- Produces: `PublicHoliday`, `NIGERIAN_PUBLIC_HOLIDAYS`, `DayInspectionData`

- [ ] **Step 1: Create `src/lib/holidays.ts` with official Nigerian public holidays**

```ts
export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  country: 'NG';
  isRecurring: boolean;
}

export const NIGERIAN_PUBLIC_HOLIDAYS: PublicHoliday[] = [
  { date: '2026-01-01', name: "New Year's Day", country: 'NG', isRecurring: true },
  { date: '2026-04-03', name: 'Good Friday', country: 'NG', isRecurring: false },
  { date: '2026-04-06', name: 'Easter Monday', country: 'NG', isRecurring: false },
  { date: '2026-05-01', name: "Workers' Day", country: 'NG', isRecurring: true },
  { date: '2026-06-12', name: 'Democracy Day', country: 'NG', isRecurring: true },
  { date: '2026-10-01', name: 'Independence Day', country: 'NG', isRecurring: true },
  { date: '2026-12-25', name: 'Christmas Day', country: 'NG', isRecurring: true },
  { date: '2026-12-26', name: 'Boxing Day', country: 'NG', isRecurring: true },
];
```

- [ ] **Step 2: Create `src/types/calendar.ts` for calendar inspection data interfaces**

```ts
import type { UserProfile, Attendance, DailyReport, Task, LeaveRequest } from '@/lib/types';
import type { PublicHoliday } from '@/lib/holidays';

export interface DayInspectionData {
  dateStr: string;
  holiday?: PublicHoliday;
  shiftLogs: Attendance[];
  dailyReports: DailyReport[];
  tasksDone: Task[];
  approvedLeaves: LeaveRequest[];
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Task 1**

```bash
git add src/lib/holidays.ts src/types/calendar.ts
git commit -m "feat: add Nigerian official public holidays and calendar type definitions"
```

---

### Task 2: Predictive Search Command Palette (`src/components/layout/GlobalCommandPalette.tsx`)

**Files:**
- Modify: `src/components/layout/GlobalCommandPalette.tsx`

**Interfaces:**
- Consumes: `NIGERIAN_PUBLIC_HOLIDAYS`
- Produces: Predictive auto-recommendations as user types in command palette

- [ ] **Step 1: Add live keyword recommendations in `GlobalCommandPalette.tsx`**

When user types keywords in command input:
- `"leave"` $\to$ Recommendations: *"Request Leave"*, *"My Leave Balance"*, *"Pending HR Approvals"*.
- `"report"` $\to$ Recommendations: *"Write Daily Report"*, *"View My Reports"*, *"Export Master Report"*.
- `"task"` $\to$ Recommendations: *"Assign New Task"*, *"My Active Tasks"*, *"Overdue Tasks"*.
- `"holiday"` / `"calendar"` $\to$ Recommendations: *"View Operational Calendar"*, *"Upcoming Public Holidays"*.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit Task 2**

```bash
git add src/components/layout/GlobalCommandPalette.tsx
git commit -m "feat: add predictive search recommendations to GlobalCommandPalette"
```

---

### Task 3: Create Interactive Operational Calendar Hub (`src/components/dashboard/OperationalCalendarHub.tsx`)

**Files:**
- Create: `src/components/dashboard/OperationalCalendarHub.tsx`

**Interfaces:**
- Consumes: `NIGERIAN_PUBLIC_HOLIDAYS`, `Attendance`, `LeaveRequest`, `UserProfile`, `Task`, `DailyReport`
- Produces: `<OperationalCalendarHub userProfile={userProfile} ... />`

- [ ] **Step 1: Build `OperationalCalendarHub.tsx` with Month/Week/Day view switcher & date controls**

Include:
1. View Switcher buttons (Month / Week / Day).
2. Date navigation (`Prev`, `Next`, `Today`, Month/Year header).
3. **Upcoming Holiday Banner:** Displays upcoming Nigerian holiday (e.g. *"🎉 Independence Day - Oct 1st (3 days away)"*).

- [ ] **Step 2: Implement color-coded calendar grid & dual-mode Day Inspection Drawer**

Render days with color-coded status badges:
- 🟣 Public / Nigerian Holiday (`bg-purple-500/20 text-purple-300 border-purple-500/30`)
- 🟢 On-Time Shift (`bg-emerald-500/20 text-emerald-300 border-emerald-500/30`)
- 🟡 Late Arrival (`bg-amber-500/20 text-amber-300 border-amber-500/30`)
- 🔵 Remote Shift (`bg-cyan-500/20 text-cyan-300 border-cyan-500/30`)
- 🔴 Missed / Unexcused (`bg-rose-500/20 text-rose-300 border-rose-500/30`)
- 🏖️ Approved Leave (`bg-orange-500/20 text-orange-300 border-orange-500/30`)

**Interactive Day Inspection Drawer:**
- **Staff Mode:** Clicking any date opens shift breakdown (clock-in/out, hours worked, daily work note filed, completed tasks).
- **Admin Mode:** Clicking any date opens Team Day Audit Panel (all staff who clocked in, who was late, who took leave, who missed shift). Clicking a staff member opens their 360 profile.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Task 3**

```bash
git add src/components/dashboard/OperationalCalendarHub.tsx
git commit -m "feat: create OperationalCalendarHub with Nigerian public holidays and dual inspection drawers"
```

---

### Task 4: Dual-Tab Dashboard Integration & Visual Overhaul (`AdminDashboard.tsx` & `StaffDashboard.tsx`)

**Files:**
- Modify: `src/components/dashboard/AdminDashboard.tsx`
- Modify: `src/components/dashboard/StaffDashboard.tsx`

**Interfaces:**
- Consumes: `<OperationalCalendarHub />`

- [ ] **Step 1: Upgrade `AdminDashboard.tsx` and `StaffDashboard.tsx` to Executive Glassmorphism**

Apply canvas `#090d16` styling, frosted cards (`bg-slate-900/60 backdrop-blur-2xl border-white/10 shadow-2xl rounded-[2.5rem]`), high-contrast text.

- [ ] **Step 2: Add top `<Tabs>` switcher for Overview vs. Operational Calendar & Attendance**

Render `<OperationalCalendarHub />` when the "Calendar & Attendance" tab is active.

- [ ] **Step 3: Verify full Next.js production build**

Run: `npm run build`
Expected: PASS with static export in `out/`.

- [ ] **Step 4: Commit Task 4**

```bash
git add src/components/dashboard/AdminDashboard.tsx src/components/dashboard/StaffDashboard.tsx
git commit -m "feat: integrate OperationalCalendarHub and upgrade dashboards to Executive Glassmorphism"
```
