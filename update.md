# Basechan Staff (Palilious ERP) - Enhancement & Implementation Guide

This document outlines strategic improvements for the Basechan Staff web application. It focuses on elevating the User Experience (UX), polishing the User Interface (UI), and refactoring the codebase for better maintainability, scalability, and performance.

---

## 1. UI & UX Enhancements

### 1.1. Reduce "Dialog Overload" (Deep Linking & Routing)
**Current State:** The application relies heavily on global Dialogs for almost all features (Tasks, Requisitions, Chat, Profiles) using an event emitter (`uiEmitter`). 
**UX Issue:** Users cannot use the browser's "Back" button to close a dialog, nor can they bookmark or share a direct link to a specific task or requisition.
**Solution:** Implement Next.js Intercepting Routes and Parallel Routes.
* **Implementation:** Move detail views (e.g., `TaskDetailDialog`, `RequisitionDetailDialog`) to their own route segments (e.g., `/tasks/[id]`). Use Next.js intercepting routes (`@modal/(.)tasks/[id]`) so they open as a modal when navigated to from the dashboard, but act as standalone pages if the user refreshes or shares the link.

### 1.2. Mobile Experience Optimization
**Current State:** Large forms (like `AssignTaskDialog` and `NewRequisitionDialog`) render inside standard `DialogContent`.
**UX Issue:** On mobile devices, centered dialogs can be cramped and hard to scroll, especially when the keyboard opens.
**Solution:** Use Shadcn's responsive Drawer/Sheet component for mobile.
* **Implementation:** Use a wrapper component (like `vaul` drawer or Shadcn's `Sheet` with `side="bottom"`) for screens smaller than `md`.
* *Code Example:*
    ```tsx
    // components/ui/responsive-modal.tsx
    import { useMediaQuery } from "@/hooks/use-media-query"
    import { Dialog, DialogContent } from "@/components/ui/dialog"
    import { Drawer, DrawerContent } from "@/components/ui/drawer"

    export function ResponsiveModal({ children, open, onOpenChange }) {
      const isDesktop = useMediaQuery("(min-width: 768px)")
      if (isDesktop) return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>{children}</DialogContent></Dialog>
      return <Drawer open={open} onOpenChange={onOpenChange}><DrawerContent>{children}</DrawerContent></Drawer>
    }
    ```

### 1.3. Optimistic UI Updates
**Current State:** When a user approves a requisition or checks off a subtask, the app waits for Firestore to confirm the write before updating the UI, showing a loading spinner.
**UX Issue:** The UI feels slightly sluggish during network latency.
**Solution:** Implement optimistic updates. Update the local React state immediately, and revert it if the Firebase call fails.

### 1.4. Enhanced Data Tables
**Current State:** Tables (like `RequisitionTable` and `SheetDataTable`) are basic HTML tables.
**UX Issue:** No native sorting, column filtering, or pagination on the client side.
**Solution:** Integrate `@tanstack/react-table`.
* **Implementation:** Wrap your data feeds in TanStack table instances to provide instant client-side sorting by columns (e.g., sorting requisitions by Amount or Date), column visibility toggles, and fuzzy filtering.

---

## 2. Code Quality & Architecture

### 2.1. Abstract Firebase Calls (Service Layer Pattern)
**Current State:** Firebase calls (`addDocumentNonBlocking`, `updateDocumentNonBlocking`, `getDocs`) are written directly inside UI components (e.g., `onSubmit` functions in forms).
**Code Issue:** This violates the Single Responsibility Principle and makes components massive and hard to test.
**Solution:** Create a service layer.
* **Implementation:** Create a `src/services/` directory.
    ```typescript
    // src/services/taskService.ts
    import { firestore, addDocumentNonBlocking } from '@/firebase';
    import { collection } from 'firebase/firestore';
    import type { Task } from '@/lib/types';

    export const taskService = {
      createTask: async (taskData: Omit<Task, 'id'>) => {
         return await addDocumentNonBlocking(collection(firestore, 'tasks'), taskData);
      },
      // ... other task operations
    }
    ```
    Then, in your components, simply call `await taskService.createTask(values)`.

### 2.2. Replace Custom Firebase Hooks with TanStack Query
**Current State:** The app uses custom `useCollection` and `useDoc` hooks tied directly to `onSnapshot`.
**Code Issue:** Memory leaks can occur if `useMemoFirebase` isn't used perfectly. There is no deduplication of identical queries across different components, leading to higher Firestore read costs.
**Solution:** Use `@tanstack/react-query` alongside Firebase.
* **Implementation:** React Query handles caching, background refetching, and deduping automatically.
    ```tsx
    import { useQuery } from '@tanstack/react-query';
    import { getDocs, query, collection, where } from 'firebase/firestore';

    export function useTasks(userId: string) {
      return useQuery({
        queryKey: ['tasks', userId],
        queryFn: async () => {
          const q = query(collection(firestore, 'tasks'), where('assignedTo', '==', userId));
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
      });
    }
    ```

### 2.3. Form Logic Extraction
**Current State:** Complex validation and submission logic live directly inside presentation components (e.g., `AssignTaskDialog.tsx` is over 350 lines long).
**Solution:** Extract forms into custom hooks.
* **Implementation:** Move the `useForm` initialization and `onSubmit` logic into a `useAssignTaskForm.ts` hook. The UI component should only handle the JSX rendering.

---

## 3. Security & Performance

### 3.1. Move Privileged Actions to Cloud Functions
**Current State:** The `handleDeleteUser` function in `TeamPane.tsx` simulates deleting a user from Firebase Auth via a client-side warning, and relies purely on client-side logic to delete the Firestore document.
**Security Risk:** A malicious client could bypass UI restrictions. A client should *never* have the permission to blindly delete user profiles unless strictly governed by backend rules, and clients cannot delete Firebase Auth records natively.
**Solution:** Write Firebase Cloud Functions.
* **Implementation:** Create a callable Cloud Function for sensitive actions:
    ```javascript
    // functions/index.js
    exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
      // 1. Verify caller is an Admin
      // 2. Delete from Firebase Auth: admin.auth().deleteUser(data.uid)
      // 3. Delete from Firestore: admin.firestore().collection('users').doc(data.uid).delete()
    });
    ```

### 3.2. Implement Firestore Pagination
**Current State:** The `TeamDailyReports.tsx` and `ErrorLogViewer.tsx` query up to 50 documents at once without pagination.
**Performance Issue:** As the database grows, querying large chunks of data will degrade performance and increase Firebase billing.
**Solution:** Implement cursor-based pagination.
* **Implementation:** Use Firestore's `startAfter` and `limit` methods combined with an "Intersection Observer" (infinite scrolling) at the bottom of your ScrollAreas.

### 3.3. Bundle Size Optimization
**Current State:** `xlsx` and `recharts` are imported globally in several files.
**Solution:** Dynamically import heavy libraries only when needed.
* **Implementation:** Use Next.js `next/dynamic` for the charting components and the Excel parser so they are only loaded when a user actually opens a report or imports a workbook.
    ```tsx
    import dynamic from 'next/dynamic';
    
    const FinancialReportChart = dynamic(() => import('./FinancialReportChart'), { 
      ssr: false, 
      loading: () => <Skeleton className="h-72 w-full" /> 
    });
    ```

---

## 4. Immediate Action Plan

To implement these changes safely without breaking existing functionality, follow this phased approach:

**Phase 1: Component Refactoring (Low Risk)**
1. Extract all Firebase `addDoc`/`updateDoc` calls from component files into a `src/services` folder.
2. Abstract form logic into custom hooks (e.g., `useRequisitionForm`).
3. Replace `ScrollArea` tables with `@tanstack/react-table` for the Workbooks grid.

**Phase 2: UX Improvements (Medium Risk)**
1. Create a `ResponsiveModal` component that switches between `<Dialog>` and `<Drawer>` based on screen size using your `useMediaQuery` hook. Replace standard Dialogs with this.
2. Add Next.js Intercepting Routes for the `TaskDetailDialog` and `RequisitionDetailDialog` to enable deep linking.

**Phase 3: Backend Security (High Priority)**
1. Initialize Firebase Functions in your project repository.
2. Move User Deletion and Organization Creation logic entirely to the backend.
3. Remove the simulated `initializeApp` workaround currently sitting in `InviteUserDialog.tsx` (which is highly insecure on the client).