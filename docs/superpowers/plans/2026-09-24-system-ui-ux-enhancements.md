# System UI/UX Enhancements, Motion Polish & Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement system-wide UI/UX enhancements, touch target standardization ($44\text{px}$), light-mode contrast floors, `prefers-reduced-motion` safety, high-frequency motion tuning, smart chat auto-scroll, leave date overlap validation, and GPS timeout fallbacks.

**Architecture:** Refactor UI component touch geometries, global CSS animation rules, table scroll containers, chat viewport scroll sensing, and form validation utilities while strictly maintaining existing TypeScript type definitions and build integrity.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS, Shadcn UI (Radix Primitives), Lucide Icons, Date-fns.

**Spec:** [`docs/superpowers/specs/2026-09-24-system-ui-ux-enhancements-design.md`](file:///C:/Users/HP/Documents/CODING/Basechan-team-main/docs/superpowers/specs/2026-09-24-system-ui-ux-enhancements-design.md)

## Global Constraints

- **Touch Target Floor:** All interactive mobile buttons must have at least $44\times 44\text{px}$ touch geometry.
- **Accessibility Floor:** All icon-only buttons must include an explicit `aria-label`.
- **Reduced Motion:** System `prefers-reduced-motion: reduce` preference must disable layout-shifting keyframe transitions.
- **Type Safety & Build:** `npx tsc --noEmit` and `npm run build` must pass with 0 errors after each task.

## Review Focus

- **No Obscured Controls:** Verify mobile bottom sheet dialogs float cleanly above `BottomNavBar` without hiding submit buttons.
- **Scroll Position Protection:** Verify scrolling up in chat history is not disrupted by incoming messages.
- **Leave Pre-Validation:** Verify date overlaps in leave requests trigger inline form errors before submission.

---

### Task 1: Mobile Touch Targets & BottomNavBar Safe Area Alignment

**Files:**
- Modify: `src/components/layout/AppHeader.tsx:100-180`
- Modify: `src/components/layout/BottomNavBar.tsx:80-140`
- Modify: `src/components/layout/shell/SidebarDock.tsx:80-140`

**Interfaces:**
- Consumes: Existing Radix Popover and Sheet triggers in `AppHeader.tsx` and `BottomNavBar.tsx`
- Produces: Touch-accessible $44\times 44\text{px}$ triggers with `pb-safe` sheet padding

- [ ] **Step 1: Enforce $44\times 44\text{px}$ touch targets in `AppHeader.tsx`**

Update ThemeToggle, Notification Bell, Analytics Sparkles, and user navigation triggers to include `min-h-[44px] min-w-[44px] flex items-center justify-center`.

- [ ] **Step 2: Align `BottomNavBar.tsx` Sheet z-index and safe-area padding**

Ensure mobile `SheetContent` applies `z-[500]` and `pb-[calc(1.5rem+env(safe-area-inset-bottom))]` so sheet footers float above the fixed bottom bar (`z-[450]`).

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Task 1**

```bash
git add src/components/layout/AppHeader.tsx src/components/layout/BottomNavBar.tsx src/components/layout/shell/SidebarDock.tsx
git commit -m "style(mobile): standardize 44px touch targets and sheet safe-area alignment"
```

---

### Task 2: Data Table Edge-Mask Scroll Cues & Screen Reader Labels

**Files:**
- Modify: `src/components/profile/staff/WorkforceRoster.tsx:120-200`
- Modify: `src/components/accounting/JournalEntries.tsx:80-150`
- Modify: `src/components/chat/ChatPageContent.tsx:150-220`

**Interfaces:**
- Consumes: Table wrappers in `WorkforceRoster.tsx` & `JournalEntries.tsx`, icon-only triggers in `ChatPageContent.tsx`
- Produces: Accessible table viewports with visual scroll indicators and `aria-label` tags

- [ ] **Step 1: Add `aria-label` attributes to icon buttons in `ChatPageContent.tsx`**

Add `aria-label="Send message"`, `aria-label="Attach file"`, and `aria-label="More options"` to input action buttons.

- [ ] **Step 2: Add gradient edge-mask indicators to tables in `WorkforceRoster.tsx` and `JournalEntries.tsx`**

Wrap table viewports in `.relative.overflow-x-auto.scrollbar-thin` with a subtle right-hand gradient overlay (`after:bg-gradient-to-l after:from-background/80`).

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Task 2**

```bash
git add src/components/profile/staff/WorkforceRoster.tsx src/components/accounting/JournalEntries.tsx src/components/chat/ChatPageContent.tsx
git commit -m "accessibility: add aria-labels and table scroll gradient cues"
```

---

### Task 3: Global Theme Contrast Floor & Motion Physics Optimization

**Files:**
- Modify: `src/app/globals.css:100-216`
- Modify: `src/components/layout/shell/SidebarDock.tsx:30-70`

**Interfaces:**
- Consumes: Custom CSS classes (`.m3-surface-low`, `.border-white/5`) and sidebar transition props
- Produces: `@media (prefers-reduced-motion)` rules and calibrated 200ms spring transitions

- [ ] **Step 1: Implement `prefers-reduced-motion` and Light Mode contrast overrides in `src/app/globals.css`**

Add global reduced-motion rule that sets `animation-duration: 0.01ms !important` and `transition-duration: 0.01ms !important` when `prefers-reduced-motion: reduce` is active. Update light mode overrides for `.m3-surface-low` to ensure card borders remain distinct (`border-slate-200/80`).

- [ ] **Step 2: Calibrate sidebar expansion transition in `SidebarDock.tsx`**

Change transition class from `duration-500` to `duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]` for quick responsive expansion.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Task 3**

```bash
git add src/app/globals.css src/components/layout/shell/SidebarDock.tsx
git commit -m "style(motion): add prefers-reduced-motion support and calibrate 200ms navigation easing"
```

---

### Task 4: Functional Edge Cases & Component Resiliency

**Files:**
- Modify: `src/components/chat/ChatPageContent.tsx:60-120`
- Modify: `src/components/leave/RequestLeaveDialog.tsx:110-180`
- Modify: `src/components/attendance/ClockControl.tsx:140-210`

**Interfaces:**
- Consumes: `ChatMessages` scroll handler, `RequestLeaveDialog` form validation, `ClockControl` geolocation hook
- Produces: Smart chat auto-scroll, leave date intersection validation, 7-second GPS timeout fallback

- [ ] **Step 1: Implement smart scroll-sensing in `ChatMessages` (`ChatPageContent.tsx`)**

In `useEffect` for messages, query `data-radix-scroll-area-viewport`. Calculate `isNearBottom = scrollHeight - scrollTop - clientHeight < 120`. Only invoke `scrollTo` if `isNearBottom` is `true`.

- [ ] **Step 2: Add client-side leave date overlap validation in `RequestLeaveDialog.tsx`**

Check if selected start date / end date intersects with user's approved/pending leave requests (`isWithinInterval`). Set form error if overlap is detected.

- [ ] **Step 3: Implement 7-second GPS location timeout fallback in `ClockControl.tsx`**

Wrap `navigator.geolocation.getCurrentPosition` in a 7000ms `Promise.race` timeout. If location times out, trigger toast warning while permitting fallback submission.

- [ ] **Step 4: Run full Next.js production build check**

Run: `npm run build`
Expected: PASS with static export generated in `out/`.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/components/chat/ChatPageContent.tsx src/components/leave/RequestLeaveDialog.tsx src/components/attendance/ClockControl.tsx
git commit -m "fix(resiliency): smart chat auto-scroll, leave overlap validation, and GPS timeout fallback"
```
