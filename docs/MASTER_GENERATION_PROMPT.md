# Master Generation Prompt: Basechan Staff (Palilious ERP)

## 🎯 Application Objective
Build "Basechan Staff," a high-velocity, premium internal management platform designed for small-to-medium organizations. The app functions as a "Mission Control" workstation, focusing on workflow automation, operational transparency, and financial control.

## 🛠️ Technology Stack
- **Framework**: Next.js 15 (App Router), React 19, TypeScript.
- **Styling**: Tailwind CSS, Shadcn UI, Framer Motion (or CSS animations).
- **Backend**: Firebase (Firestore, Authentication, Storage, Realtime Database).
- **UI Vision**: "Apple-style" premium aesthetic. Glassmorphism (blurs), fluid spring animations, high-density layouts, and full-screen slide-in side panels for workstations.
- **Utilities**: Lucide-react, date-fns, xlsx (Excel processing), recharts (Analytics).

## 📊 Core Data Architecture (backend.json)
Define entities for:
- **Identity**: `UserProfile` (RBAC: STAFF, HR, FINANCE, MD, ADMIN), `Organization`.
- **Operations**: `Attendance` (geofencing), `Roster`, `Task` (Kanban + Subtasks), `LeaveRequest`.
- **Financial**: `Requisition` (Multi-step workflow), `Vendor`, `PurchaseOrder`, `Account`, `JournalEntry`.
- **Knowledge**: `Workbook` (Sheets/Grid), `LibraryItem` (Files/Folders), `Announcement`.
- **Telemetry**: `AuditLog`, `Notification`, `ErrorLog`.

## 🎨 UI/UX Requirements
1. **Layout**: A floating sidebar (retractable) and a glassmorphism header with dynamic greetings.
2. **Workstation Logic**: All primary modules (Attendance, Tasks, etc.) must open as **Full-Screen Side Panels** sliding from left to right.
3. **Responsive**: Flawless performance across desktop, tablet, and mobile (use drawers for mobile).
4. **Interaction**: Scale transforms on click (`active:scale-95`), staggered list entries, and persistent state synced with URL parameters.

## 🚀 Feature Specifications
### 1. The Dashboard (The Bridge)
- **Stats**: Real-time gauges for team success, punctuality, and reporting compliance.
- **Feeds**: Active missions, recent encrypted chats, and organization-wide broadcasts.
- **Radar**: A "Maintenance Radar" that scans workbooks for upcoming service dates.

### 2. Operational Workstations
- **Attendance**: Geofenced clock-in/out, automated break timer, and live status feed.
- **Task Manager**: Kanban board with priority load balancing (e.g., max 1 High Prio per user).
- **Workbooks**: A spreadsheet-like data grid with Excel import/export and barcode scanning support for inventory.
- **Procurement**: A strict approval chain: Request -> HR -> Finance -> MD -> Paid. Automatic Purchase Order (PO) generation.

### 3. Management & Security
- **Admin Console**: Team directory, immutable audit logs, and global system configuration (branding, geofence toggles).
- **Chat**: Encrypted channels and direct messaging with read receipts.
- **Library**: Hierarchical knowledge base for SOPs and documents.

## ⚙️ Technical Constraints
- **Firebase Pattern**: Use a centralized `services/` layer. All writes must be **non-blocking** with contextual error emission to a global listener.
- **Stable Identity**: Provide a layout-level "Stable Profile" fallback to ensure the UI renders even during database synchronization.
- **Clean Code**: Zero use of redundant route groups; stick to a clean root directory structure. Implement hydration-safe components.
