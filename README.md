# Basechan Staff: Enterprise Internal Staff & Workflow Automation Suite

**Basechan Staff** is an enterprise-grade, multi-tenant digital workplace and operations automation platform. Designed to consolidate fragmented administrative processes into a single cohesive, high-performance web interface, Basechan Staff enables small-to-medium enterprises (SMEs) and high-growth teams to seamlessly manage staff tracking, double-entry bookkeeping, multi-level financial requisitions, project tasks, spreadsheet data, dynamic reporting, and live team collaboration.

Built using **Next.js 15 (App Router)**, **React 19**, **Firebase (Authentication, Firestore, Storage)**, and **Tailwind CSS**, the platform delivers lightning-fast, secure, and responsive user experiences optimized for both full-screen workstations and mobile devices.

---

## 🚀 Architectural Stack & Core Technologies

*   **Frontend Framework**: Next.js 15 (App Router, Static HTML Export Mode) & React 19.
*   **Styling & UI Components**: Tailwind CSS & customized Radix UI Primitives (enhanced dialogs, sheets, modals, and tables).
*   **Database & Backend Services**: Google Firebase Firestore (NoSQL Document database with fully configured indexing).
*   **Authentication**: Firebase Authentication with deep integration for organization-based multi-tenancy.
*   **File Storage**: Firebase Storage for direct and secure uploads of document libraries and workflow attachments.
*   **Document Parsing Engine**: Integrated `pdfjs-dist` (PDF extraction) and `mammoth` (Word `.doc`/`.docx` parsing) for raw text conversion and workbook ingestion.
*   **State Management**: Optimized local react state combined with an asynchronous event bus (`uiEmitter`) and real-time Firestore listeners (`onSnapshot`) to coordinate background activities.

---

## 📂 Detailed Module & Feature Walkthrough

### 1. Unified Tactical Dashboard & Daily AI Debrief
*   **Live Metrics Board**: Displays dynamic count indicators showing active tasks, online staff members, and pending requisitions at a glance.
*   **Adaptive Daily Debrief Modal**: An "AI-style" morning debrief panel that launches automatically upon the user's first login of the day (or can be manually summoned via the header). It parses real-time database feeds to deliver a localized status breakdown of:
    *   Unread private messages.
    *   Urgent or overdue tasks due today or tomorrow.
    *   Latest organization-wide corporate broadcasts.
*   **Personalized Feeds**: Quick access cards showing personal task queues, recent direct chats, and general team updates.

### 2. Advanced Task Manager (Kanban System)
*   **Visual Kanban Boards**: Organizes tasks through structural progression columns: `QUEUED` ➔ `ACTIVE` ➔ `AWAITING_REVIEW` ➔ `ARCHIVED`.
*   **Granular Task Properties**: Assignees can set tasks with specific priorities (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), target due dates, and descriptive notes.
*   **Task Checklists & Live Feed**: Every task supports micro-level checklists and records a chronological, real-time activity log showing status changes, checklist updates, and collaborative comment threads.
*   **Peer Assistance Request**: Staff can trigger a formal assistance workflow to request help from a colleague on a specific task without losing primary assignment ownership.

### 3. Complete Attendance Tracking Center
*   **Clock-In & Clock-Out Registry**: One-click action controls that sync shift timings, breaks, and daily notes to the server.
*   **Manager Approval Queues**: To prevent log-tampering, all clocked hours are stored in a pending state until reviewed and approved by HR or Org Administrators.
*   **Live Status Board**: Shows who is currently online, offline, on a break, or on leave across the entire team in real time.
*   **Attendance History Logs**: Detailed history view displaying daily shift durations, arrival statuses (e.g., Late, On-Time, Overtime), and remarks.

### 4. Financial Requisition Workflow
*   **Multi-Step Approvals Chain**: Requisitions securely transition through a highly managed approval pipeline: `SUBMITTED` ➔ `APPROVED_BY_HR` ➔ `APPROVED_BY_FINANCE` ➔ `APPROVED_BY_MD` ➔ `PAID`.
*   **Transparency & Audit Trails**: Every stage of the requisition's lifecycle is logged. Managers can view history, append receipts, and converse in the internal discussion thread attached to each financial request.
*   **Expense Categorization**: Requisitions support precise departmental routing (HR, Finance, Operations, IT, etc.) to ensure accurate ledger logging.

### 5. Double-Entry Accounting & Bookkeeping Module
*   **Chart of Accounts (COA)**: Create and organize structural accounts under Asset, Liability, Equity, Revenue, and Expense classes.
*   **Double-Entry Journal Entries**: Formulate compound journal entries with dual debit/credit validation rules to ensure perfect balance compliance before database submission.
*   **Dynamic Financial Statements**: Automatically aggregates journal ledger items in real time to generate:
    *   **Trial Balances** (validating total debits equal total credits).
    *   **Income Statements** (Profit & Loss summary).
    *   **Balance Sheets** (summarizing Assets = Liabilities + Equity).
    *   **Cash Flow Statements** (tracking operating, investing, and financing cash flows).

### 6. Leave & Absence Management Suite
*   **Balance Dashboard**: Displays remaining leave allocations by category (e.g., Annual, Sick, Casual, Maternity, Paternity, Compassionate, Unpaid).
*   **Leave Application Wizards**: Interactive dialog allowing staff to request time off by selecting date ranges, leaving reasons, and designating coverage partners.
*   **Team Leave Calendar**: A visual shared scheduler showing current and scheduled team absences to help managers plan coverage and project timelines.
*   **HR Decisions Center**: Managers can view, approve, or reject pending leave requests with attached explanations.

### 7. Multi-Format Data Workbooks Engine
*   **Editable Spreadsheet Grid**: Completely customizable virtualized data sheets with full cell-editing capabilities, sorting, and dynamic row/column additions or configurations.
*   **Universal Document Importer**: Create structured sheets by importing diverse file types:
    *   **Microsoft Excel (`.xlsx`) & CSV (`.csv`)**: Parses tabular structures directly into grid rows and columns.
    *   **Word Documents (`.doc`, `.docx`)**: Uses the `mammoth` parser to extract text headings and convert paragraphs into workbook content.
    *   **Adobe PDFs (`.pdf`) & Text files (`.txt`)**: Employs `pdfjs-dist` to extract raw layout text and inject it into editable workbook tables.
*   **Security & Sheet Sharing**: Workbook owners can share access with team members, specifying read-only or read-write permissions.
*   **One-Click Excel Export**: Instantly export workbook sheets back into high-fidelity `.xlsx` files.

### 8. Document Library & Cloud Storage Hub
*   **Dynamic Folder Structures**: Organize organizational assets using recursive folders and subfolders.
*   **Secure Multi-File Uploads**: Drag-and-drop or select files to upload directly to Firebase Storage with a live progress indicator bar.
*   **Unified Search & Directory Navigation**: Instantly filter documents and directories across the organization.
*   **Secure Downloads**: Single-click secure file downloads with built-in CORS configurations.

### 9. Team Health, Sentiment & Kudos Center
*   **Daily Pulse Checks**: Periodic, non-intrusive micro-surveys asking staff to rate their daily well-being, mood, and blockers.
*   **End-of-Day (EOD) Daily Reports**: Users can submit structured daily summaries detailing achievements, ongoing work, and roadblocks. Managers can audit their entire team's EOD reports under a dedicated tab.
*   **Kudos Recognition System**: Peer-to-peer or manager-to-peer appreciation system to award Kudos points and badges for reinforcing positive work culture.
*   **Analytics Reports**: Track overall productivity trends, attendance percentages, spending patterns, and sentiment indices in the reporting panel.

### 10. Real-Time Chat & Communications
*   **Direct Messaging**: High-performance one-on-one private messaging with team members. Includes instant message status updates and read-receipt synchronization.
*   **Announcements Board**: System-wide corporate broadcasts posted by administrators that pin to top-level user dashboards for critical updates.

---

## 🔒 Security & Multi-Tenant Access Roles

Basechan Staff strictly enforces a robust **Role-Based Access Control (RBAC)** architecture that determines modular access and button interactions:

| Access Role | Privileges & Modular Permissions |
| :--- | :--- |
| **STAFF** | Accesses personal profile, clock-in, personal attendance logs, leave requests, assigned tasks, direct chats, and submits daily reports. |
| **HR MANAGER** | Inherits STAFF privileges. Reviews and approves/rejects all organization-wide clock-in records and leave applications. |
| **FINANCE MANAGER** | Inherits STAFF privileges. Directly manages and audits financial requisitions, Chart of Accounts, Journal Entries, and Financial Statements. |
| **MANAGING DIRECTOR** | Full managerial oversight. Reviews and provides final signatures for high-tier financial requests, and views performance dashboards. |
| **ORG ADMIN** | Complete administrative control over the single tenant organization. Invites/manages users, configures organization profiles, and overrides system configurations. |
| **SUPER ADMIN** | Global system administrator. Operates from the Superadmin dashboard to create, manage, disable, and audit all tenant organizations across the entire application instance. |

---

## 🛠️ Local Setup & Configuration

### Prerequisites
*   Node.js (v18.x or later)
*   npm or yarn
*   Firebase CLI (optional, for deploying)

### Installation
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/johnnym5/Basechan-team.git
    cd Basechan-team-main
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Variables**:
    Create a `.env.local` or `.env` file in the root directory and configure your Firebase client credentials:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.firebasestorage.app"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
    NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
    ```

4.  **Launch Dev Server**:
    ```bash
    npm run dev
    ```
    The application will launch locally at `http://localhost:9002`.

### Production Build & Static Export
To compile the static bundle for production deployment:
```bash
# Compile and export static HTML
npm run build
```
This generates an optimized static bundle in the `/out` directory.

### Deploying to Firebase
To deploy Firestore rules, indexes, and the compiled static hosting:
```bash
# Deploy to Firebase Hosting & Firestore
firebase deploy --only hosting,firestore
```
