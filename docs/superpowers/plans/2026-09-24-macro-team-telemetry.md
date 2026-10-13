# Macro Team Telemetry & Data Accuracy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate false attendance claims for inactive staff and replace 45 individual staff cards in Team Overview mode with 5 dynamic **Macro Team Telemetry Cards**.

**Architecture:** Fix zero-shift fallback logic in `InsightEngine.ts` to return "No shift logs" for inactive users. Add `InsightEngine.evaluateTeamMacroTelemetry()` to aggregate org-level metrics. Refactor `IntelligentSummaryCenter.tsx` to render Macro Cards in Team Mode and individual details ONLY when a single staff member is selected.

**Tech Stack:** Next.js 15, Tailwind CSS, Lucide Icons, Date-fns, Firebase Web SDK v11.

**Spec:** [`docs/superpowers/specs/2026-09-24-macro-team-telemetry-design.md`](file:///C:/Users/HP/Documents/CODING/Basechan-team-main/docs/superpowers/specs/2026-09-24-macro-team-telemetry-design.md)

## Global Constraints

- **Zero Fake Attendance Claims:** Users with 0 shift logs must never be claimed to have "100% on-time attendance" or "Verified location".
- **Pure Team Overview:** Team Overview mode must render 5 Macro Organizational Telemetry Cards without individual staff names (`peter: ...`, `collins: ...`).
- **Single Personnel Isolation:** Individual staff details render only when a specific personnel is selected.
- **Type Safety & Build:** `npx tsc --noEmit` and `npm run build` must pass with 0 errors after each task.

## Review Focus

- **Inactive Personnel Guard:** Verify that selecting an inactive admin (e.g. Collins) shows "No shift logs recorded for this personnel" and zero fake attendance claims.
- **Macro Telemetry Accuracy:** Verify that Team Overview Mode shows true org-wide metrics (Shift deployment, work notes filed, task turnaround, pending leaves).

---

### Task 1: Inactive Staff Data Guard (`src/lib/InsightEngine.ts`)

**Files:**
- Modify: `src/lib/InsightEngine.ts`

**Interfaces:**
- Modifies: `InsightEngine.evaluateBehavioralPatterns()`

- [ ] **Step 1: Implement zero-log check in `evaluateBehavioralPatterns()` in `src/lib/InsightEngine.ts`**

When `validShifts.length === 0`:
Return a single pattern:
- **ID:** `BP-INACTIVE`
- **Code:** `BP-NONE`
- **Title:** `Operational Readiness`
- **Metric:** `0 shift logs`
- **Message:** `No shift logs recorded for this personnel.`

Suppress all automated fallback cards claiming 100% attendance or verified location.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit Task 1**

```bash
git add src/lib/InsightEngine.ts
git commit -m "fix: eliminate false attendance claims for inactive personnel with 0 shift logs"
```

---

### Task 2: Macro Team Telemetry Aggregator (`src/lib/InsightEngine.ts`)

**Files:**
- Modify: `src/lib/InsightEngine.ts`

**Interfaces:**
- Produces: `InsightEngine.evaluateTeamMacroTelemetry()`

- [ ] **Step 1: Implement `InsightEngine.evaluateTeamMacroTelemetry()` in `src/lib/InsightEngine.ts`**

Aggregate global organizational metrics across all active staff:
1. **Shift Deployment Status:** `{checkedInCount}/{totalStaffCount}` personnel checked in today (`{lateCount}` late).
2. **Work Note Coverage:** `{filedCount}/{checkedInCount}` checked-in staff filed daily work notes today.
3. **Team Deliverable Velocity:** `{completedCount}` tasks completed this week, `{overdueCount}` overdue tasks.
4. **HR Time-Off Queue:** `{pendingLeaveCount}` pending leave requests.
5. **Cultural Engagement:** `{kudosCount}` peer Kudos awarded across departments this week.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit Task 2**

```bash
git add src/lib/InsightEngine.ts
git commit -m "feat: implement evaluateTeamMacroTelemetry for organizational team views"
```

---

### Task 3: Refactor UI Component in `IntelligentSummaryCenter.tsx`

**Files:**
- Modify: `src/components/reports/IntelligentSummaryCenter.tsx`

**Interfaces:**
- Consumes: `InsightEngine.evaluateTeamMacroTelemetry()`

- [ ] **Step 1: Refactor `isTeamMode` in `IntelligentSummaryCenter.tsx`**

When `isTeamMode: true`:
- Call `InsightEngine.evaluateTeamMacroTelemetry()`.
- Render **ONLY** the 5 Macro Organizational Telemetry Cards.
- Remove loop that generated 45 individual staff cards (`peter: ...`, `collins: ...`).

When `isTeamMode: false` (Single Personnel Selected):
- Render **ONLY** that selected individual's actual Daily Work Note, Weekly Activity, and Habits.
- For inactive personnel (like Collins), display: `"No shift logs recorded for this personnel."`

- [ ] **Step 2: Verify full Next.js production build**

Run: `npm run build`
Expected: PASS with static export in `out/`.

- [ ] **Step 3: Commit Task 3**

```bash
git add src/components/reports/IntelligentSummaryCenter.tsx
git commit -m "feat: render pure Macro Team Telemetry in Team Overview mode and isolate individual selection"
```
