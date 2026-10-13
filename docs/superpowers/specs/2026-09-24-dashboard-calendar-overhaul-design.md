# Dashboard UI/UX & Interactive Operational Calendar Overhaul Specification (v1.0)

**Target Modules:**
- `src/components/dashboard/AdminDashboard.tsx`
- `src/components/dashboard/StaffDashboard.tsx`
- `src/components/dashboard/OperationalCalendarHub.tsx`
- `src/components/layout/GlobalCommandPalette.tsx`
- `src/lib/holidays.ts`
- `src/types/calendar.ts`

**Governing Standards:** Executive Glassmorphism, Human-First Enterprise UX, High Contrast ($>7:1$), Nigerian Official Holidays Integration.

---

## 1. Goal & Architectural Overview

The goal of this overhaul is to elevate the UT Basechan Dashboard UI/UX into an executive-grade ERP console and introduce a full-screen, interactive **Operational Calendar & Attendance Hub**.

### Key Architectural Improvements:
1. **Executive Glassmorphism System:** Canvas `#090d16` with ambient radial glow overlays, frosted semi-transparent cards (`bg-slate-900/60 backdrop-blur-2xl border-white/10 shadow-2xl rounded-[2.5rem]`), high-contrast Plus Jakarta Sans headings, and Geist Mono numerical metrics.
2. **Dual-Tab Dashboard View:**
   - **Overview Tab:** Streamlined Hero KPI Strip, Active Duty Clock, Personal/Team Intelligence Companion, Active Task Hub, Announcements & Comms.
   - **Calendar & Attendance Tab:** Interactive full-page operational calendar.
3. **Predictive Search Command Palette (`GlobalCommandPalette.tsx`):**
   - Top action bar + `Ctrl+K` shortcut.
   - As the user types (e.g., *"leave"*, *"report"*, *"task"*, or staff names), live predictive recommendations appear instantly.
4. **Interactive Operational Calendar Hub (`OperationalCalendarHub.tsx`):**
   - Month / Week / Day view toggles + Month/Year navigation.
   - **Pre-populated Nigerian Official Public Holidays** (New Year's Day, Good Friday, Easter Monday, Workers' Day May 1st, Democracy Day June 12th, Independence Day Oct 1st, Christmas Day Dec 25th, Boxing Day Dec 26th, Eid al-Fitr, Eid al-Adha).
   - **Color-Coded Status Badges:**
     - 🟣 **Public / Nigerian Holiday:** `bg-purple-500/20 text-purple-300 border-purple-500/30`
     - 🟢 **On-Time Shift:** `bg-emerald-500/20 text-emerald-300 border-emerald-500/30`
     - 🟡 **Late Arrival:** `bg-amber-500/20 text-amber-300 border-amber-500/30`
     - 🔵 **Remote Shift:** `bg-cyan-500/20 text-cyan-300 border-cyan-500/30`
     - 🔴 **Missed / Unexcused:** `bg-rose-500/20 text-rose-300 border-rose-500/30`
     - 🏖️ **Approved Leave:** `bg-orange-500/20 text-orange-300 border-orange-500/30`
   - **Interactive Day Inspection Drawer/Modal (Dual-Mode):**
     - **Staff Mode:** Clicking any date opens exact shift details (clock-in/out, hours worked, daily work note filed, completed tasks).
     - **Admin Mode:** Clicking any date opens the **Team Day Audit Panel** displaying all staff who clocked in, who was late, who took leave, and who missed shift on that date. Clicking any individual staff member opens their full 360 personnel profile for that day.

---

## 2. Nigerian Official Public Holidays Data (`src/lib/holidays.ts`)

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

---

## 3. Predictive Search Command Palette (`GlobalCommandPalette.tsx`)

### Live Auto-Recommendations:
- **Keyword "leave":** Offers *"Request Leave"*, *"My Leave Balance"*, *"Pending HR Approvals"*.
- **Keyword "report":** Offers *"Write Daily Report"*, *"View My Reports"*, *"Export Master Report"*.
- **Keyword "task":** Offers *"Assign New Task"*, *"My Active Tasks"*, *"Overdue Tasks"*.
- **Keyword "holiday" / "calendar":** Offers *"View Operational Calendar"*, *"Upcoming Public Holidays"*.
- **Staff Search:** Matching name shows *"View Staff Profile"*, *"Audit Attendance"*.

---

## 4. UI Component Hierarchy & View Switching

### 4.1 Dashboard Navigation Tabs:
- `<Tabs defaultValue="overview">`
  - `<TabsTrigger value="overview">Overview</TabsTrigger>`
  - `<TabsTrigger value="calendar">Operational Calendar & Attendance</TabsTrigger>`

### 4.2 Overview View:
- Hero KPI Strip $\to$ Quick Action Command Bar $\to$ Operational Row (Duty Clock + Personal/Team Intelligence Companion) $\to$ Management Grid (Task Hub + Comms Stack).

### 4.3 Operational Calendar View:
- Header Controls (Month/Week/Day Switcher + Date Navigation + Upcoming Holiday Alert Banner).
- Color-coded Calendar Grid.
- Interactive Day Inspection Drawer for Staff / Team Day Audit Panel for Admins.

---

## 5. Verification & Acceptance Criteria

1. **Executive Glassmorphic Aesthetic:** High-contrast crisp white typography, dark `#090d16` canvas, frosted glass cards.
2. **Nigerian Holidays Included:** Pre-populated official Nigerian public holidays rendered with purple badges.
3. **Color-Coded Status Badges:** On-time (green), late (amber), remote (cyan), missed (red), leave (orange), holiday (purple).
4. **Predictive Search Bar:** Auto-recommends actions live as the user types in command bar.
5. **Interactive Day Drawer:** Clicking any day cell opens the detailed day summary / team audit drawer.
6. **Build Check:** `npx tsc --noEmit` and `npm run build` pass with 0 errors.
