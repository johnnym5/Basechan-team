# Personal Intelligence Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fragmented, cliché-heavy personal insight widgets with a single, high-tier **Personal Intelligence Companion (`PersonalInsightHub`)** that calculates real dynamic achievements and time-gated directives with zero token cost.

**Architecture:** A unified 60/40 asymmetric command dashboard under the "Personal Insight" tab. `InsightEngine.ts` calculates real weekly wins (kudos, deliverables, report streaks) and time-gated action directives ($16:30+$ PM for EOD reports), completely eliminating canned fallback cards.

**Tech Stack:** Next.js 15 (Client Components), Tailwind CSS, Lucide Icons, Date-fns, Firebase Web SDK v11.

**Spec:** [`docs/superpowers/specs/2026-09-24-personal-insight-companion-design.md`](file:///C:/Users/HP/Documents/CODING/Basechan-team-main/docs/superpowers/specs/2026-09-24-personal-insight-companion-design.md)

## Global Constraints

- **Zero Canned Fallback Cards:** Personal insight items must be derived dynamically from actual user activity logs.
- **Time-Gated EOD Directives:** "Daily Report Due" directive must appear only after 16:30 (4:30 PM) during active unsubmitted shifts.
- **Deterministic Standard:** All computations must run in $<5\text{ms}$ with zero LLM/token cost.
- **Type Safety & Build:** `npx tsc --noEmit` and `npm run build` must pass with 0 errors after each task.

## Review Focus

- **No Overlapping Widgets:** Verify that old fragmented insight components on `/staff/reports` are replaced cleanly by `<PersonalInsightHub />`.
- **Zero Canned Text:** Ensure no boilerplate strings (*"Steady Attendance: Arrives on time 100% of shifts"*) appear for active or new users.
- **CTA Actions:** Verify 1-click CTA buttons (`Review Task`, `Write Daily Report`, `View Leave Status`) trigger the correct `uiEmitter` dialog events.

---

### Task 1: Type Definitions (`src/types/insights.ts`)

**Files:**
- Modify: `src/types/insights.ts`

**Interfaces:**
- Produces: `WeeklyWinHighlight`, `PersonalInsightSummary`

- [ ] **Step 1: Define `WeeklyWinHighlight` and `PersonalInsightSummary` interfaces in `src/types/insights.ts`**

```ts
export interface WeeklyWinHighlight {
  id: string;
  title: string;
  description: string;
  category: 'KUDOS' | 'VELOCITY' | 'PUNCTUALITY' | 'STREAK';
  iconType: 'trophy' | 'zap' | 'check' | 'clock';
}

export interface PersonalInsightSummary {
  score: number; // 0 - 100 Performance Score (OMI)
  trend: 'UPWARD' | 'STABLE' | 'DOWNWARD';
  reportStreakDays: number;
  punctualityStreakDays: number;
  totalOperationsThisWeek: number;
  weeklyWins: WeeklyWinHighlight[];
  dailyWorkNote: {
    text: string;
    reportDate?: string;
    quality: 'GOOD' | 'FAIR' | 'POOR';
    warningMessage?: string;
  };
  needsAttentionQueue: ActionableDirective[];
  attendanceAudit: AbsenceTriage;
  healthMetrics: {
    punctualityScore: number;
    taskVelocityScore: number;
    debriefCadenceScore: number;
  };
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit Task 1**

```bash
git add src/types/insights.ts
git commit -m "feat: add PersonalInsightSummary and WeeklyWinHighlight interfaces"
```

---

### Task 2: Refactor Data Engine (`src/lib/InsightEngine.ts`)

**Files:**
- Modify: `src/lib/InsightEngine.ts`

**Interfaces:**
- Consumes: `WeeklyWinHighlight`, `PersonalInsightSummary` from `src/types/insights.ts`
- Produces: `InsightEngine.evaluatePersonalSummary()`

- [ ] **Step 1: Implement `InsightEngine.evaluatePersonalSummary()` in `src/lib/InsightEngine.ts`**

Calculate real dynamic weekly wins:
1. Kudos received in last 7 days (`"Received X peer Kudos for teamwork"`).
2. Deliverables completed in last 7 days (`"Completed X deliverables this week"`).
3. Consecutive on-time arrivals (`"🔥 X-shift on-time arrival streak"`).
4. Consecutive daily report filings (`"🔥 X consecutive daily reports filed on time"`).

- [ ] **Step 2: Enforce time-gated EOD report directive rule ($16:30+$ PM during active unsubmitted shift)**

Ensure "Daily Report Due" directive only generates when `currentHour > 16 || (currentHour === 16 && currentMinute >= 30)` AND user has clocked in today AND has not submitted today's report.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Task 2**

```bash
git add src/lib/InsightEngine.ts
git commit -m "feat: implement evaluatePersonalSummary with dynamic weekly wins and time-gated EOD directives"
```

---

### Task 3: Create Personal Intelligence Hub Component (`src/components/reports/PersonalInsightHub.tsx`)

**Files:**
- Create: `src/components/reports/PersonalInsightHub.tsx`

**Interfaces:**
- Consumes: `userProfile: UserProfile`, `InsightEngine.evaluatePersonalSummary()`
- Produces: `<PersonalInsightHub userProfile={userProfile} />`

- [ ] **Step 1: Implement `PersonalInsightHub.tsx` with 60/40 Asymmetric Apple Glass Layout**

1. **Header Banner:**
   - Score Gauge (0–100) with trend icon.
   - Active Streak Badges (`🔥 X-Day Report Streak`, `⚡ X-Shift On-Time`).
   - Total Operations Index counter.
2. **60% Left Panel:**
   - Weekly Achievements & Highlights (Trophy/Zap/Check icon cards).
   - Daily Work Note (Real EOD report text + quality badge + tags).
   - Attendance & Scheduled Rest Cross-Reference Audit.
3. **40% Right Panel:**
   - Needs Attention Queue (Overdue tasks, EOD report due after 16:30, pending leave) with 1-click CTA buttons.
   - All Systems Nominal Badge (when queue is empty).
   - Health Matrix progress bars.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit Task 3**

```bash
git add src/components/reports/PersonalInsightHub.tsx
git commit -m "feat: create PersonalInsightHub component with 60/40 asymmetric dashboard layout"
```

---

### Task 4: Consolidate UI & Integrate into `/staff/reports` (`MyBriefingDashboard.tsx` & `ReportsPageContent.tsx`)

**Files:**
- Modify: `src/components/reports/MyBriefingDashboard.tsx`
- Modify: `src/components/reports/ReportsPageContent.tsx`

**Interfaces:**
- Consumes: `<PersonalInsightHub />` from Task 3

- [ ] **Step 1: Replace fragmented accordion widgets under "Personal Insight" tab in `MyBriefingDashboard.tsx` with `<PersonalInsightHub />`**

- [ ] **Step 2: Ensure `IntelligentSummaryCenter.tsx` is retained exclusively for Admin/Manager Team Overview mode**

- [ ] **Step 3: Run full Next.js production build check**

Run: `npm run build`
Expected: PASS with static export generated in `out/`.

- [ ] **Step 4: Commit Task 4**

```bash
git add src/components/reports/MyBriefingDashboard.tsx src/components/reports/ReportsPageContent.tsx
git commit -m "feat: consolidate personal insights tab into unified PersonalInsightHub dashboard"
```
