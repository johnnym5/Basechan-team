# CODEBASE MAP & BASELINE SECURITY AUDIT

**Project:** UT Basechan Enterprise Platform  
**Mode:** BROWNFIELD  
**Audit Date:** Baseline Grounding (Stage 0)  

---

## 1. CLIENT-SIDE FIRESTORE WRITE POINTS

The following table details all client-side Firestore mutations (`addDoc`, `updateDoc`, `setDoc`, `deleteDoc`, `writeBatch`) originating directly from browser client code. Under zero-trust architecture, all critical domain logic mutations must be shifted to server-authoritative runtimes.

| Service / Component | File Path | Operations Used | Target Collection(s) | Description / Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Accounting Service** | `src/services/accounting-service.ts` | `writeBatch` | `journal_entries`, `accounts` | Client computes journal entries and updates account balances. High risk of ledger corruption or financial tampering. |
| **Attendance Service** | `src/services/attendance-service.ts` | `updateDoc`, `setDoc` | `attendance`, `users` | Client calculates geofence distance, clock-in/out timestamps, and writes directly to attendance log and user status. |
| **Auth Service** | `src/services/auth-service.ts` | `writeBatch`, `setDoc`, `updateDoc` | `users` | Client registers user profiles and updates user state. |
| **Login Form** | `src/components/auth/LoginForm.tsx` | `writeBatch`, `setDoc`, `updateDoc` | `users` | Client-side user creation and profile initialization. |
| **WebRTC / Telemetry** | `src/services/webrtc-service.ts`, `src/services/telemetry-service.ts` | `addDoc`, `setDoc`, `deleteDoc`, `updateDoc` | `webrtc_calls`, `signaling` | Client manages WebRTC session negotiation and candidate exchange. |
| **Chat Service** | `src/services/chat-service.ts` | `writeBatch` | `chat_messages`, `chats` | Direct client-side message posting and channel creation. |
| **Task Service** | `src/services/task-service.ts` | `setDoc` | `tasks` | Direct task creation and assignment from client. |
| **Report Service** | `src/services/report-service.ts` | `setDoc` | `daily_reports` | Client writes daily reports directly. |
| **Leave Service** | `src/services/leave-service.ts` | `updateDoc` | `users`, `leave_requests` | Client updates user leave balances and statuses. |
| **User Access Editor** | `src/components/settings/security/UserAccessEditor.tsx` | `updateDoc` | `users` | Client directly modifies user `roleIds` and `customPermissions`. Direct privilege escalation risk. |
| **Role Manager** | `src/components/settings/security/RoleManager.tsx` | `setDoc`, `deleteDoc` | `roles` | Client creates and purges system roles directly. |
| **Attendance Admin** | `src/components/attendance/EditAttendanceRecordDialog.tsx` | `setDoc` | `attendance` | Client overrides attendance records directly. |
| **Live Staff Monitor** | `src/components/attendance/LiveStaffMonitor.tsx` | `updateDoc` | `users` | Client issues remote commands (`pendingCommand`) to users. |
| **Staff Action Menu** | `src/components/shared/StaffActionMenu.tsx` | `updateDoc` | `users` | Client updates user employment status and roles. |
| **SuperAdmin Tools** | `src/components/superadmin/DatabaseExplorer.tsx`, `DataManagement.tsx` | `writeBatch`, `setDoc`, `deleteDoc` | Any collection | Unrestricted client-side CRUD operations across all collections. |
| **Non-Blocking Wrappers**| `src/firebase/non-blocking-updates.tsx` | `addDoc`, `setDoc`, `updateDoc`, `deleteDoc` | Various | Global utility wrappers for unverified fire-and-forget client writes. |

---

## 2. PERMISSIONS, IMPERSONATION & ROLE-CHECKING LOGIC

| File Path | Component / Hook | Mechanism | Risk Assessment |
| :--- | :--- | :--- | :--- |
| `src/hooks/useSuperAdmin.ts` | `useSuperAdmin` | Client string checks: email matches `jegbase@gmail.com`, UID matches `nM0bBwaybEQP95OPKUyQ97iAm3u2`, or email/displayName contains `"johnmary"`. | **CRITICAL**: Hardcoded string checks grant full SuperAdmin access if user display name contains "johnmary". |
| `src/context/ImpersonationProvider.tsx` | `ImpersonationProvider` | React context reading/writing state from `localStorage` keys (`basechanstaff-impersonation-mode`). | **HIGH**: Impersonation status and target user IDs are stored in browser `localStorage` without backend custom claims verification. |
| `src/hooks/usePermissions.ts` | `usePermissions` | Evaluates role permissions, custom permissions, and system configs purely on client state. | **HIGH**: Bypasses are calculated client-side (e.g., `canBypassGeofence`). Without server-side enforcement in Security Rules or Cloud Functions, these permissions are purely cosmetic. |
| `src/app/(app)/layout.tsx` | App Root Layout | Wraps entire app in `ImpersonationProvider`. | Exposes impersonation state to all routes. |
| `src/components/layout/MainAppLayout.tsx` | App Layout | Reads `usePermissions` and `useImpersonation` to derive UI nav visibility. | UI elements hidden client-side, but endpoints/collections remain accessible. |
| `src/components/profile/staff/Employee360Profile.tsx` | Staff Profile | Checks `canEnableSuperAdminMode` client-side to toggle SuperAdmin tools. | UI switch relies on client-side state without re-authenticating against backend. |

---

## 3. UNCONSTRAINED FIRESTORE COLLECTION SNAPSHOTS

The following hooks and components subscribe to entire Firestore collections without query bounding (`limit()`, `where()` date ranges, or cursor pagination), leading to potential runaway reads and memory leaks:

| Component / File Path | Query Target | Current Query Constraints | Risk / Mitigation Required |
| :--- | :--- | :--- | :--- |
| `src/components/attendance/AttendancePageContent.tsx` | `attendance`, `users`, `leaves`, `pulse`, `nominations` | None (Unbounded collection reads) | Subscribes to full collections across organization. Add date bounds and pagination. |
| `src/components/attendance/LiveStaffMonitor.tsx` | `attendance`, `users`, `tasks` | Filtered by orgId only | Fetches all org users and attendance. Restrict to active daily logs. |
| `src/components/chat/ChatDialog.tsx` & `ChatPageContent.tsx` | `chat_messages`, `users`, `tasks`, `requisitions` | Subscribes to full channels/collections | Messages query lacks message limits. Add `limit(50)` and cursor pagination. |
| `src/components/dashboard/AdminDashboard.tsx` & `StaffDashboard.tsx` | `attendance`, `tasks`, `leave_requests`, `users`, `nominations` | Filtered by orgId | Unconstrained real-time listeners on primary dashboard load. |
| `src/components/accounting/JournalEntries.tsx` | `journal_entries` | Filtered by orgId | Fetches entire journal history. Implement date range filter & `limit(50)`. |
| `src/components/accounting/ChartOfAccounts.tsx` | `accounts` | Filtered by orgId | Unbounded fetch of all general ledger accounts. |
| `src/components/reports/IntelligentBrief.tsx` | `attendance`, `daily_reports`, `tasks`, `pulses`, `users` | Unbounded multi-collection snapshots | Triggers 5 simultaneous full-collection reads on render. |
| `src/components/reports/KPIAnalytics.tsx` | `tasks`, `accolades`, `attendance` | Unbounded snapshots | Unbounded analytical query across all historical records. |

---

## 4. SECURITY & CONFIGURATION MANIFEST INVENTORY

- `firestore.rules`:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if true;
      }
    }
  }
  ```
  *Status:* **CRITICAL VULNERABILITY**. Completely open database. All security checks currently reside in client JS.
- `firebase.json`:
  Defines static hosting rewrites to `/index.html`, Firestore rules pointing to `firestore.rules`, indexes to `firestore.indexes.json`. Missing Cloud Functions configuration block if functions are deployed via CLI.
- `functions/src/index.ts`:
  Contains `autoClockOutDailyV1` (scheduled pubsub function). Lacks API endpoints or Cloud Functions for accounting transactions, geofence verification, or custom claims synchronization.

---

## 5. TOP 5 FRAGILITY HOT SPOTS

1. **Fully Permissive Security Rules (`firestore.rules`)**
   - *Impact:* `allow read, write: if true;` exposes every document in Firestore to arbitrary unauthenticated/authenticated network requests via the Firebase Web SDK.
2. **Client-Authoritative Financial Double-Entry Accounting (`accounting-service.ts`)**
   - *Impact:* Debit/credit balance increments and journal entry creation happen directly in browser transactions (`writeBatch`). A malicious or compromised client can alter account balances arbitrarily.
3. **Client-Side Geofence Validation & Clock-In Fraud (`attendance-service.ts` & `ClockControl.tsx`)**
   - *Impact:* Haversine distance and geofence eligibility are calculated in client JS. Users can spoof GPS coordinates or bypass checks via client-side permission overrides (e.g. string matching "johnmary").
4. **Insecure Impersonation & Hardcoded SuperAdmin Logic (`useSuperAdmin.ts` & `ImpersonationProvider.tsx`)**
   - *Impact:* SuperAdmin privilege is granted based on client email/displayName checks and stored in `localStorage`. There is zero server-side token claim validation (`request.auth.token.role`).
5. **Unbounded Firestore Snapshots & Listener Overhead (`useCollection` Hooks)**
   - *Impact:* Critical components subscribe to entire Firestore collections without `limit()` or date range filters, causing expensive reads, high latency, and client UI lag as dataset size grows.
