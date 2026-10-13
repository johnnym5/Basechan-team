# System-Wide UI/UX Enhancements, Motion Polish & Bug Fixes Specification

**Target Modules:**
- Layout & Navigation: `src/components/layout/AppHeader.tsx`, `src/components/layout/shell/SidebarDock.tsx`, `src/components/layout/BottomNavBar.tsx`
- Chat Engine: `src/components/chat/ChatPageContent.tsx`
- Leave Management: `src/components/leave/RequestLeaveDialog.tsx`
- Attendance & Geolocation: `src/components/attendance/ClockControl.tsx`
- Tables & Roster: `src/components/profile/staff/WorkforceRoster.tsx`, `src/components/accounting/JournalEntries.tsx`
- Global Theme & Motion: `src/app/globals.css`

**Governing Standards:** W3C Web Content Accessibility Guidelines (WCAG 2.1 AA), Touch & Interaction Best Practices (44px min target), Emil Kowalski & Jakub Krehel Motion Physics, Human-First Enterprise UX.

---

## 1. Goal & Architectural Overview

This system-wide enhancement elevates the **Basechan Staff** enterprise platform across 4 core operational dimensions:
1. **Mobile Geometry & Touch Safety:** Eliminates undersized touch targets ($<44\text{px}$), prevents bottom navbar overlay lockouts on mobile sheet dialogs, and introduces edge-mask scroll cues for dense data tables.
2. **Accessibility & Light Mode Contrast:** Guarantees accessible contrast ($>4.5:1$) for glassmorphism card borders in Light Mode, adds explicit `aria-label` tags to icon-only controls, and ensures visible keyboard focus rings.
3. **Motion Physics & Reduced Motion Safety:** Enforces `@media (prefers-reduced-motion: reduce)` rules across keyframes and tunes high-frequency navigation expanding animations to $200\text{ms}$ with cubic-bezier spring physics.
4. **Resilience & Key Bug Fixes:** Upgrades Chat message auto-scrolling to smart scroll-sensing (preventing scroll-jacking when reading history), adds client-side date overlap checks for leave requests, and provides a 7-second timeout fallback for GPS clock-in signals.

---

## 2. Detailed Technical Design by Component

### 2.1 Phase 1: Mobile UI Geometry & Touch Safety

#### A. Touch Target Standardization ($44\times 44\text{px}$)
- **Target Files:** `src/components/layout/AppHeader.tsx`, `src/components/layout/shell/SidebarDock.tsx`
- **Specification:**
  - Update icon-only triggers (ThemeToggle, Notifications Bell badge, Analytics Sparkles button, and row action `⋮` triggers) to have a minimum outer dimension of $44\times 44\text{px}$ (`min-h-[44px] min-w-[44px]` or `size-11 flex items-center justify-center`).

#### B. Mobile BottomNavBar & Sheet Dialog Safe Area Alignment
- **Target File:** `src/components/layout/BottomNavBar.tsx`
- **Specification:**
  - On mobile viewports (`md:hidden`), ensure `SheetContent` applies `pb-[calc(1rem+env(safe-area-inset-bottom))]` and `z-[500]` so active sheets float cleanly above the fixed bottom navigation bar (`z-[450]`).

#### C. Mobile Data Table Scroll Cues & Sticky Headers
- **Target Files:** `src/components/profile/staff/WorkforceRoster.tsx`, `src/components/accounting/JournalEntries.tsx`
- **Specification:**
  - Wrap table containers in `relative overflow-x-auto scrollbar-thin`.
  - Add gradient edge indicators (`after:absolute after:right-0 after:top-0 after:bottom-0 after:w-4 after:bg-gradient-to-l after:from-background after:to-transparent pointer-events-none`) to indicate scrollable content on small viewports.

---

### 2.2 Phase 2: Accessibility & Light Theme Contrast

#### A. Screen Reader Labels (`aria-label`)
- **Target Files:** `src/components/layout/AppHeader.tsx`, `src/components/chat/ChatPageContent.tsx`, `src/components/layout/shell/SidebarDock.tsx`
- **Specification:**
  - Add `aria-label` attributes to all icon-only buttons:
    - Bell: `aria-label="View notifications"`
    - Sparkles: `aria-label="Open daily analytics"`
    - Send button: `aria-label="Send chat message"`
    - Paperclip button: `aria-label="Attach file"`
    - Sidebar items: `aria-label={item.label}`

#### B. Light Mode Glassmorphism Contrast Floor
- **Target File:** `src/app/globals.css`
- **Specification:**
  - In `html:not(.dark)` layer:
    - Upgrade `.border-white\/5` and `.border-white\/10` overrides to `border-slate-200` (`rgba(0, 0, 0, 0.12)`).
    - Ensure `.m3-surface-low` applies a clean neutral border (`border border-slate-200/80 shadow-sm`) so card edges are clearly defined against peach backgrounds.

#### C. Focus Ring Consistency
- **Target File:** `src/app/globals.css`
- **Specification:**
  - Ensure all interactive button and input states retain `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`.

---

### 2.3 Phase 3: Motion Physics & Reduced Motion Safety

#### A. Prefers-Reduced-Motion Safety Rule
- **Target File:** `src/app/globals.css`
- **Specification:**
  - Enforce global media query:
    ```css
    @media (prefers-reduced-motion: reduce) {
      *, ::before, ::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    ```

#### B. Sidebar Expansion Timing Optimization
- **Target File:** `src/components/layout/shell/SidebarDock.tsx`
- **Specification:**
  - Transition sidebar width from `duration-500` to `duration-200` with easing `cubic-bezier(0.16, 1, 0.3, 1)` to eliminate hover latency during rapid navigation.

---

### 2.4 Phase 4: Functional Resiliency & Bug Fixes

#### A. Smart Chat Auto-Scroll (Prevent Scroll-Jacking)
- **Target File:** `src/components/chat/ChatPageContent.tsx`
- **Specification:**
  - Refactor message scroll effect:
    ```ts
    const viewport = scrollContainer.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      const isNearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 150;
      if (isNearBottom) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      }
    }
    ```

#### B. Leave Request Date Range Overlap Pre-Validation
- **Target File:** `src/components/leave/RequestLeaveDialog.tsx`
- **Specification:**
  - Calculate date intersection with existing user leave requests (`APPROVED` or `PENDING`):
    ```ts
    const hasOverlap = approvedLeaves?.some(req => 
      req.userId === selectedUserId &&
      isWithinInterval(startDate, { start: new Date(req.startDate), end: new Date(req.endDate) })
    );
    if (hasOverlap) {
      form.setError("startDate", { message: "Selected dates overlap with an existing leave request." });
    }
    ```

#### C. Geolocation Timeout & Fallback UX
- **Target File:** `src/components/attendance/ClockControl.tsx`
- **Specification:**
  - Wrap `navigator.geolocation.getCurrentPosition` in a 7-second `Promise.race` timeout:
    - If location signal times out or fails, surface a helpful toast: *"GPS signal weak. Re-trying with network location..."* while permitting fallback check-in.

---

## 3. Verification & Acceptance Criteria

1. **Touch Targets:** All interactive triggers on mobile evaluate to $\ge 44\text{px}$ bounding boxes.
2. **Accessibility:** Zero unlabelled icon-only buttons; keyboard focus rings visible on Tab navigation.
3. **Motion:** Enabling "Reduce Motion" in OS settings completely disables `pop-in` and `slide-up-fade` transitions.
4. **Chat Scroll:** Reading message history is uninterrupted by incoming messages unless user is within 150px of bottom.
5. **Build & Type Check:** `npx tsc --noEmit` and `npm run build` pass with zero errors.
