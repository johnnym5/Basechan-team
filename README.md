<<<<<<< HEAD
# Basechan Staff: Internal Staff & Workflow Automation

Basechan Staff is a comprehensive, all-in-one internal management tool designed to streamline and automate key business operations for small to medium-sized organizations. Built on a modern technology stack including Next.js, Firebase, and Tailwind CSS, it provides a centralized platform for managing staff, finances, tasks, and internal communication.

The application is architected around a multi-tenant system where each organization operates in its own secure environment, managed by a super administrator.

## Core Features

The platform is composed of several integrated modules:

### 1. Unified Dashboard
A centralized command center providing at-a-glance insights into your daily operations.
- **Stat Cards**: Key metrics including active tasks, online staff members, and pending requisitions.
- **My Active Tasks**: A feed of your most recent and active tasks.
- **Announcements**: A broadcast system for organization-wide messages.
- **Recent Conversations**: Quick access to your latest private chats.

### 2. Staff & System Management
- **Authentication**: Secure, organization-based login system.
- **Team Directory**: A central place to view and manage all staff members. Administrators can add, edit, and remove users.
- **Role-Based Permissions**: A granular permission system (Staff, HR Manager, Finance Manager, Managing Director, Org Admin) controls access to different modules and actions.
- **Profile Management**: Users can manage their own profile details and change their passwords.
- **Super Admin Console**: A top-level interface for super administrators to oversee all registered organizations.

### 3. Attendance Center
A complete solution for time and attendance tracking.
- **Clock-In/Out**: Staff can clock in and out with a single click.
- **Approval Workflow**: Clock-ins are subject to HR approval to ensure validity.
- **Live Status Feed**: See who is currently online, offline, or on leave across the organization.
- **Attendance History**: A detailed log of personal attendance records, including shift duration and remarks (e.g., late, overtime).

### 4. Financial Requisitions
A structured workflow for managing financial requests, from submission to payment.
- **Multi-Step Approval**: Requisitions flow through a predefined approval chain: HR ➔ Finance ➔ Managing Director.
- **Status Tracking**: Clear status badges (e.g., `PENDING_HR`, `APPROVED`, `PAID`) make it easy to track the progress of any request.
- **Activity Feed**: Every action—from creation to approval to comments—is logged in a detailed, real-time activity feed for full transparency.

### 5. Task Manager
A Kanban-style task management system to delegate and monitor work.
- **Visual Task Board**: Organize tasks in columns: `QUEUED`, `ACTIVE`, `AWAITING_REVIEW`, and `ARCHIVED`.
- **Task Assignment**: Managers can assign tasks to specific team members, setting priorities and due dates.
- **Assistance Requests**: Users can formally request help from a colleague on a specific task.
- **Task Details**: Each task includes a detailed view with a checklist, activity feed, and comment threads.

### 6. Workbooks
A powerful, in-app spreadsheet and data management tool.
- **Excel/CSV Import**: Create workbooks by importing existing `.xlsx` or `.csv` files.
- **Editable Data Grid**: View and edit data directly in a familiar, spreadsheet-like interface.
- **Full CRUD Operations**:
    - **Workbooks**: Create, edit, and delete entire workbooks.
    - **Sheets**: Add, rename, and delete individual sheets within a workbook.
    - **Rows & Columns**: Dynamically add and delete rows and columns.
- **Excel Export**: Export your sheet data back to an `.xlsx` file at any time.

### 7. Internal Communication
- **Direct Messaging**: Engage in private, one-on-one conversations with any team member in your organization.
- **Announcements**: Administrators can post organization-wide announcements that appear on every user's dashboard.

## Potential Future Enhancements

Basechan Staff is built on a scalable architecture that allows for numerous future enhancements:

- **AI-Powered Automation**: Integrate GenAI to create tasks from natural language, summarize long comment threads, analyze workbook data, and provide intelligent assistance.
- **Advanced Notifications**: Implement a full-featured notification system (in-app, email, push) for task assignments, requisition updates, and new chat messages.
- **File & Document Management**: Enable file uploads for requisitions and tasks by integrating with Firebase Storage.
- **Advanced Workbook Features**: Introduce Excel-like formulas, data validation, conditional formatting, and real-time collaboration on sheets.
- **Geofencing for Attendance**: Enforce attendance policies by using the device's location to validate clock-ins against the configured office coordinates.
- **Team Chat Channels**: Expand the chat module to support group conversations and topic-based channels.
- **Reporting & Analytics**: Develop a dedicated module for generating and visualizing reports on attendance, financial spending, and team productivity.
- **Calendar & Leave Management**: Introduce a formal system for requesting, approving, and tracking employee leave.

<!-- This is a small change to ensure git has something to commit. --> 
=======
# Basechan Staff: Internal Staff & Workflow Automation

Basechan Staff is a comprehensive, all-in-one internal management tool designed to streamline and automate key business operations for small to medium-sized organizations. Built on a modern technology stack including Next.js, Firebase, and Tailwind CSS, it provides a centralized platform for managing staff, finances, tasks, and internal communication.

The application is architected around a multi-tenant system where each organization operates in its own secure environment, managed by a super administrator.

## Core Features

The platform is composed of several integrated modules:

### 1. Unified Dashboard
A centralized command center providing at-a-glance insights into your daily operations.
- **Stat Cards**: Key metrics including active tasks, online staff members, and pending requisitions.
- **My Active Tasks**: A feed of your most recent and active tasks.
- **Announcements**: A broadcast system for organization-wide messages.
- **Recent Conversations**: Quick access to your latest private chats.

### 2. Staff & System Management
- **Authentication**: Secure, organization-based login system.
- **Team Directory**: A central place to view and manage all staff members. Administrators can add, edit, and remove users.
- **Role-Based Permissions**: A granular permission system (Staff, HR Manager, Finance Manager, Managing Director, Org Admin) controls access to different modules and actions.
- **Profile Management**: Users can manage their own profile details and change their passwords.
- **Super Admin Console**: A top-level interface for super administrators to oversee all registered organizations.

### 3. Attendance Center
A complete solution for time and attendance tracking.
- **Clock-In/Out**: Staff can clock in and out with a single click.
- **Approval Workflow**: Clock-ins are subject to HR approval to ensure validity.
- **Live Status Feed**: See who is currently online, offline, or on leave across the organization.
- **Attendance History**: A detailed log of personal attendance records, including shift duration and remarks (e.g., late, overtime).

### 4. Financial Requisitions
A structured workflow for managing financial requests, from submission to payment.
- **Multi-Step Approval**: Requisitions flow through a predefined approval chain: HR ➔ Finance ➔ Managing Director.
- **Status Tracking**: Clear status badges (e.g., `PENDING_HR`, `APPROVED`, `PAID`) make it easy to track the progress of any request.
- **Activity Feed**: Every action—from creation to approval to comments—is logged in a detailed, real-time activity feed for full transparency.

### 5. Task Manager
A Kanban-style task management system to delegate and monitor work.
- **Visual Task Board**: Organize tasks in columns: `QUEUED`, `ACTIVE`, `AWAITING_REVIEW`, and `ARCHIVED`.
- **Task Assignment**: Managers can assign tasks to specific team members, setting priorities and due dates.
- **Assistance Requests**: Users can formally request help from a colleague on a specific task.
- **Task Details**: Each task includes a detailed view with a checklist, activity feed, and comment threads.

### 6. Workbooks
A powerful, in-app spreadsheet and data management tool.
- **Excel/CSV Import**: Create workbooks by importing existing `.xlsx` or `.csv` files.
- **Editable Data Grid**: View and edit data directly in a familiar, spreadsheet-like interface.
- **Full CRUD Operations**:
    - **Workbooks**: Create, edit, and delete entire workbooks.
    - **Sheets**: Add, rename, and delete individual sheets within a workbook.
    - **Rows & Columns**: Dynamically add and delete rows and columns.
- **Excel Export**: Export your sheet data back to an `.xlsx` file at any time.

### 7. Internal Communication
- **Direct Messaging**: Engage in private, one-on-one conversations with any team member in your organization.
- **Announcements**: Administrators can post organization-wide announcements that appear on every user's dashboard.

## Potential Future Enhancements

Basechan Staff is built on a scalable architecture that allows for numerous future enhancements:

- **AI-Powered Automation**: Integrate GenAI to create tasks from natural language, summarize long comment threads, analyze workbook data, and provide intelligent assistance.
- **Advanced Notifications**: Implement a full-featured notification system (in-app, email, push) for task assignments, requisition updates, and new chat messages.
- **File & Document Management**: Enable file uploads for requisitions and tasks by integrating with Firebase Storage.
- **Advanced Workbook Features**: Introduce Excel-like formulas, data validation, conditional formatting, and real-time collaboration on sheets.
- **Geofencing for Attendance**: Enforce attendance policies by using the device's location to validate clock-ins against the configured office coordinates.
- **Team Chat Channels**: Expand the chat module to support group conversations and topic-based channels.
- **Reporting & Analytics**: Develop a dedicated module for generating and visualizing reports on attendance, financial spending, and team productivity.
- **Calendar & Leave Management**: Introduce a formal system for requesting, approving, and tracking employee leave.

<!-- This is a small change to ensure git has something to commit. --> 
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
