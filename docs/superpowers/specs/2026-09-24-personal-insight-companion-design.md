# Personal Intelligence Companion Specification (v3.0)

**Target Modules:** 
- `src/types/insights.ts`
- `src/lib/InsightEngine.ts`
- `src/components/reports/PersonalInsightHub.tsx`
- `src/components/reports/MyBriefingDashboard.tsx`
- `src/components/reports/ReportsPageContent.tsx`

**Governing Standard:** Human-First Enterprise UX & Pure Deterministic Calculation (Zero LLM, $<5\text{ms}$ execution time, $0$ token cost).

---

## 1. Goal & Architectural Overview

The goal of this redesign is to replace the fragmented, cliché-heavy personal insights experience with a unified, high-tier **Personal Intelligence Companion (`PersonalInsightHub`)**.

### Key Architectural Improvements:
1. **Consolidation:** Replaces 3 fragmented personal insight widgets on the `/reports` page with a single, elegant 60/40 asymmetric dashboard (`PersonalInsightHub.tsx`).
2. **Elimination of Canned Fallback Cards:** Eliminates static boilerplate cards (*"Steady Attendance: Arrives on time 100% of shifts"*). Replaces them with real dynamic achievements computed from user activity (kudos received, deliverables completed, report streaks, peak focus time).
3. **Balanced Performance & Action:** Combines a top **Hero Performance Score & Streaks** banner, a **Weekly Wins & Highlights** feed, and a 1-click **Needs Attention** priority queue.
4. **Time-Gated EOD Directives:** Restricts the "Daily Report Due" directive strictly to $16:30+$ (4:30 PM+) during active unsubmitted shifts.

---

## 2. Data Engine & Types (`src/types/insights.ts` & `src/lib/InsightEngine.ts`)

### 2.1 Schema Definition (`src/types/insights.ts`)

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

### 2.2 Dynamic Weekly Wins Evaluator (`InsightEngine.ts`)

Instead of fallback boilerplate cards, `InsightEngine.evaluatePersonalSummary()` computes real dynamic highlights:

1. **Peer Recognition Wins:** Checks for Kudos received in the last 7 days (`"Received X peer Kudos for teamwork"`).
2. **Task Turnaround Wins:** Checks for tasks archived in the last 7 days (`"Completed X deliverables this week"`).
3. **Punctuality Streak:** Calculates consecutive on-time shift arrivals (`"🔥 X-shift on-time arrival streak"`).
4. **Report Discipline Streak:** Calculates consecutive EOD daily report submissions (`"🔥 X consecutive daily reports filed on time"`).
5. **Zero-Activity Baseline:** For new users with zero logs, highlights active assigned tasks or tenure milestones rather than canned repetitive text.

---

## 3. UI Component Architecture (`src/components/reports/PersonalInsightHub.tsx`)

`PersonalInsightHub.tsx` implements a dark Apple Glass theme (`apple-glass-darker border-white/5 shadow-2xl rounded-[2.5rem] p-6 md:p-8 backdrop-blur-xl`).

### 3.1 Hero Performance Banner
- **Performance Score Badge (0–100):** Circular gauge with dynamic color (emerald for $\ge 80$, amber for $60\text{--}79$, rose for $< 60$) and trend indicator (`UPWARD` / `STABLE` / `DOWNWARD`).
- **Active Streak Badges:**
  - `🔥 X-Day Report Streak`
  - `⚡ X-Shift On-Time Streak`
- **Total Operations Index:** Counter displaying total shifts, completed tasks, and reports logged this week.

### 3.2 60% Left Panel — "Weekly Achievements & Operational Focus"
- **Weekly Wins & Highlights Section:** Dynamic cards with trophy/zap/check icons displaying actual user achievements.
- **Latest Daily Work Note:** Real text preview of the user's latest EOD report with quality status (`GOOD`, `FAIR`, `POOR`) and extracted module tags.
- **Attendance & Time-Off Cross-Reference Audit:** Status cards for approved scheduled rest, pending leave validation, and unexcused absences.

### 3.3 40% Right Panel — "Needs Attention Queue & Health Matrix"
- **Needs Attention Queue:** Rendered **only when action items exist** (e.g. overdue tasks, EOD report due after 16:30, pending leave). Each card includes a 1-click CTA button (`Review Task`, `Write Daily Report`, `View Leave Status`).
- **All Systems Nominal Badge:** When the queue is empty, displays a clean *"All Systems Nominal — Zero pending friction items"* badge.
- **Health Matrix:** Visual progress bars for Punctuality Score, Task Velocity Index, and Debrief Cadence.

---

## 4. Component Consolidation & Migration

1. **Single Source of Truth on `/staff/reports`:**
   - On the `/staff/reports` page under the "Personal Insight" tab, replace `IntelligentBrief` and `MyBriefingDashboard` accordion clutter with `<PersonalInsightHub userProfile={userProfile} />`.
2. **Team Overview Separation:**
   - Retain `IntelligentSummaryCenter.tsx` solely for Admin/Manager Team Overview mode.

---

## 5. Verification & Acceptance Criteria

1. **Zero Canned Fallback Cards:** The Personal Insight tab renders 100% dynamic, user-specific data and achievements.
2. **Gated EOD Directives:** "Daily Report Due" directive appears **only from 16:30+ onwards** during active unsubmitted shifts.
3. **Responsive & Scrollable:** All cards fit within a clean, single-page command console layout without overflowing or hiding context.
4. **Performance & Build:** `npx tsc --noEmit` and `npm run build` pass with 0 errors. Execution time $<5\text{ms}$.
