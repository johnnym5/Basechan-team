# Macro Team Telemetry & Data Accuracy Specification (v4.0)

**Target Modules:**
- `src/lib/InsightEngine.ts`
- `src/types/insights.ts`
- `src/components/reports/IntelligentSummaryCenter.tsx`

**Governing Standard:** Absolute Data Fidelity & Clean Organizational UX (Zero Fake Claims, Zero Individual Clutter in Team Views).

---

## 1. Goal & Architectural Overview

The goal of this architectural spec is twofold:
1. **Fix Inactive Staff Fake Data Bug:** Eliminate false attendance claims (*"100% on-time attendance"*, *"Verified location"*) generated for inactive users or admins who have never clocked in (e.g., Collins).
2. **Pure Macro Organizational Telemetry in Team Mode:** Replace the 45 individual staff cards (`peter: ...`, `collins: ...`) in **Team Overview Mode** with 5 dynamic, aggregated **Macro Team Telemetry Cards**. Individual staff data will render **ONLY** when a specific personnel is selected.

---

## 2. Data Accuracy Guard & Schema (`src/types/insights.ts` & `src/lib/InsightEngine.ts`)

### 2.1 Inactive Staff Guard (`InsightEngine.evaluateBehavioralPatterns`)

When evaluating a staff member with **0 attendance logs** (`validShifts.length === 0`):
- **Old Behavior:** Evaluated `onTimeRatio = 100%`, generating fake claims (*"100% on-time attendance"*, *"Verified location"*).
- **New Fix:** Checks `if (validShifts.length === 0)`:
  - Generates a single accurate pattern:
    - **ID:** `BP-INACTIVE`
    - **Code:** `BP-NONE`
    - **Title:** `Operational Readiness`
    - **Metric:** `0 shift logs`
    - **Message:** `No shift logs recorded for this personnel.`
  - Suppresses all attendance, location, and reporting claims for users without shift logs.

---

## 3. Macro Team Telemetry Aggregator (`InsightEngine.evaluateTeamMacroTelemetry`)

Create a new static method `InsightEngine.evaluateTeamMacroTelemetry(params)` that computes global organizational telemetry:

```ts
export interface MacroTelemetryCard {
  id: string;
  type: 'action' | 'warning' | 'success' | 'info';
  severity: 'CRITICAL' | 'STANDARD';
  icon: any;
  title: string;
  text: string;
  actionLabel: string;
  actionType: string;
  actionTarget: string;
  category: 'TEAM';
}
```

### Telemetry Cards Generated for Team Mode:
1. **Shift Deployment Status:**
   - Evaluates active clock-ins today vs total roster.
   - Text: `Active Operational Deployment: {checkedInCount}/{totalStaffCount} personnel checked in today ({lateCount} late arrivals).`
2. **Daily Work Note Coverage:**
   - Evaluates daily reports filed today vs checked-in personnel.
   - Text: `Daily Work Note Coverage: {filedCount}/{checkedInCount} checked-in staff filed daily work notes today.`
3. **Team Deliverable Velocity:**
   - Evaluates tasks completed this week vs overdue tasks across the organization.
   - Text: `Team Task Velocity: {completedThisWeekCount} tasks completed this week, {overdueCount} overdue tasks seeking resolution.`
4. **HR Time-Off Queue:**
   - Evaluates pending leave requests.
   - Text: `HR Approval Queue: {pendingLeaveCount} pending leave request(s) awaiting management review.`
5. **Cultural Engagement:**
   - Evaluates peer Kudos awarded across departments this week.
   - Text: `Cultural Engagement: {kudosCount} peer Kudos awarded across departments this week.`

---

## 4. UI Component Refactoring (`IntelligentSummaryCenter.tsx`)

### 4.1 Global Team Overview Mode (`isTeamMode: true`):
- Calls `InsightEngine.evaluateTeamMacroTelemetry()` and renders **ONLY** the 5 Macro Organizational Telemetry Cards.
- Completely removes the loop that generated individual cards (`peter: ...`, `collins: ...`).

### 4.2 Individual Personnel Mode (`isTeamMode: false`):
- Renders **ONLY** the selected staff member's actual data:
  - **Daily Work Note:** Live text from `daily_reports` or `eodReport`.
  - **This Week's Activity:** Real count of shifts, hours logged, tasks completed, and reports filed.
  - **Key Notes / Needs Attention:** Individual behavioral habits and directives.
- For inactive personnel (like Collins), cleanly displays:
  - Daily Work Note: *"No daily work note submitted yet for this period."*
  - Work Habits: *"No shift logs recorded for this personnel."*

---

## 5. Verification & Acceptance Criteria

1. **Zero Fake Claims for Inactive Users:** Inactive personnel with 0 shift logs show "No shift logs recorded for this personnel" and zero fake attendance claims.
2. **Pure Macro Overview:** Team Overview mode renders 5 macro organizational telemetry cards with zero individual staff clutter.
3. **Single Personnel View:** Selecting an individual staff member displays only that staff member's personal data.
4. **Build Check:** `npx tsc --noEmit` and `npm run build` pass with 0 errors.
