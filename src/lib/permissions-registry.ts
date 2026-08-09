/**
 * CENTRAL PERMISSIONS REGISTRY
 *
 * Defines all granular technical strings used for Authorization checks.
 * Grouped by module/functional area.
 */

export const PERMISSIONS = {
  // --- Attendance & Workforce ---
  ATTENDANCE_CLOCK_IN: 'attendance:clock-in',
  ATTENDANCE_BYPASS_GEOFENCE: 'attendance:bypass-geofence',
  ATTENDANCE_APPROVE_HR: 'attendance:approve:hr',
  ATTENDANCE_VIEW_TEAM: 'attendance:view-team',
  ATTENDANCE_MANAGE_ROSTER: 'attendance:manage-roster',

  // --- Finance & Requisitions ---
  REQUISITION_CREATE: 'requisition:create',
  REQUISITION_APPROVE_HR: 'requisition:approve:hr',
  REQUISITION_APPROVE_FINANCE: 'requisition:approve:finance',
  REQUISITION_APPROVE_MD: 'requisition:approve:md',
  REQUISITION_DISBURSE: 'requisition:disburse',
  FINANCE_MANAGE_ACCOUNTS: 'finance:manage-accounts',
  FINANCE_VIEW_REPORTS: 'finance:view-reports',

  // --- Tasks & Projects ---
  TASK_CREATE: 'task:create',
  TASK_ACCESS_ALL: 'task:access-all',
  TASK_MANAGE_STAFF: 'task:manage-staff',

  // --- Workbooks & Data ---
  WORKBOOK_CREATE: 'workbook:create',
  WORKBOOK_ACCESS_ALL: 'workbook:access-all',

  // --- Library & Assets ---
  LIBRARY_ACCESS: 'library:access',
  LIBRARY_MANAGE: 'library:manage',
  LIBRARY_VIEW_FILES: 'library:view-files',

  // --- Admin & Governance ---
  ADMIN_MANAGE_COMPANY: 'admin:manage-company',
  ADMIN_MANAGE_STAFF: 'admin:manage-staff',
  ADMIN_MANAGE_ANNOUNCEMENTS: 'admin:manage-announcements',
  ADMIN_VIEW_AUDIT: 'admin:view-audit',
  ADMIN_MANAGE_DISPLAYS: 'admin:manage-displays',

  // --- Real-time & Media ---
  WEBRTC_SHARE_SCREEN: 'webrtc:share-screen',
  WEBRTC_ALLOW_AUDIO: 'webrtc:allow-audio',

  // --- Communication & Signals ---
  CHAT_ACCESS: 'chat:access',
  CHAT_SEND_MESSAGE: 'chat:send-message',
  NOTIFICATIONS_SEND: 'notifications:send',
  LOCATION_SHARE: 'location:share',

  // --- File Management ---
  FILES_READ: 'files:read',
  FILES_MODIFY: 'files:modify',

  // --- Reporting ---
  REPORT_ACCESS: 'report:access',
  REPORT_SUBMIT: 'report:submit',

  // --- Leave Management ---
  LEAVE_ACCESS: 'leave:access',
  LEAVE_REQUEST: 'leave:request',

  // --- Self-Service ---
  PROFILE_EDIT_OWN: 'profile:edit-own',
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/** Human-readable labels for permission badges, editors, and audit surfaces. */
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  [PERMISSIONS.ATTENDANCE_CLOCK_IN]: 'Attendance Clock In',
  [PERMISSIONS.ATTENDANCE_BYPASS_GEOFENCE]: 'Bypass Geofence',
  [PERMISSIONS.ATTENDANCE_APPROVE_HR]: 'Approve Attendance (HR)',
  [PERMISSIONS.ATTENDANCE_VIEW_TEAM]: 'View Team Attendance',
  [PERMISSIONS.ATTENDANCE_MANAGE_ROSTER]: 'Manage Attendance Roster',
  [PERMISSIONS.REQUISITION_CREATE]: 'Create Requisitions',
  [PERMISSIONS.REQUISITION_APPROVE_HR]: 'Approve Requisitions (HR)',
  [PERMISSIONS.REQUISITION_APPROVE_FINANCE]: 'Approve Requisitions (Finance)',
  [PERMISSIONS.REQUISITION_APPROVE_MD]: 'Approve Requisitions (Managing Director)',
  [PERMISSIONS.REQUISITION_DISBURSE]: 'Disburse Requisitions',
  [PERMISSIONS.FINANCE_MANAGE_ACCOUNTS]: 'Manage Finance Accounts',
  [PERMISSIONS.FINANCE_VIEW_REPORTS]: 'View Finance Reports',
  [PERMISSIONS.TASK_CREATE]: 'Create Tasks',
  [PERMISSIONS.TASK_ACCESS_ALL]: 'Access All Tasks',
  [PERMISSIONS.TASK_MANAGE_STAFF]: 'Manage Staff Tasks',
  [PERMISSIONS.WORKBOOK_CREATE]: 'Create Workbooks',
  [PERMISSIONS.WORKBOOK_ACCESS_ALL]: 'Access All Workbooks',
  [PERMISSIONS.LIBRARY_ACCESS]: 'Access Library',
  [PERMISSIONS.LIBRARY_MANAGE]: 'Manage Library',
  [PERMISSIONS.LIBRARY_VIEW_FILES]: 'View Library Files',
  [PERMISSIONS.ADMIN_MANAGE_COMPANY]: 'Manage Company',
  [PERMISSIONS.ADMIN_MANAGE_STAFF]: 'Manage Staff',
  [PERMISSIONS.ADMIN_MANAGE_ANNOUNCEMENTS]: 'Manage Announcements',
  [PERMISSIONS.ADMIN_VIEW_AUDIT]: 'View Audit Log',
  [PERMISSIONS.ADMIN_MANAGE_DISPLAYS]: 'Manage Live Displays',
  [PERMISSIONS.WEBRTC_SHARE_SCREEN]: 'Share Screen',
  [PERMISSIONS.WEBRTC_ALLOW_AUDIO]: 'Allow Audio',
  [PERMISSIONS.CHAT_ACCESS]: 'Access Chat',
  [PERMISSIONS.CHAT_SEND_MESSAGE]: 'Send Chat Messages',
  [PERMISSIONS.NOTIFICATIONS_SEND]: 'Send Notifications',
  [PERMISSIONS.LOCATION_SHARE]: 'Share Location',
  [PERMISSIONS.FILES_READ]: 'Read Files',
  [PERMISSIONS.FILES_MODIFY]: 'Modify Files',
  [PERMISSIONS.REPORT_ACCESS]: 'Access Reports',
  [PERMISSIONS.REPORT_SUBMIT]: 'Submit Reports',
  [PERMISSIONS.LEAVE_ACCESS]: 'Access Leave Management',
  [PERMISSIONS.LEAVE_REQUEST]: 'Request Leave',
  [PERMISSIONS.PROFILE_EDIT_OWN]: 'Edit Own Profile',
};

/**
 * DUTIES: Logical groups of permissions for easier Role composition.
 */
export const DUTIES = {
  STAFF_BASIC: [
    PERMISSIONS.ATTENDANCE_CLOCK_IN,
    PERMISSIONS.REQUISITION_CREATE,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.CHAT_ACCESS,
    PERMISSIONS.CHAT_SEND_MESSAGE,
    PERMISSIONS.PROFILE_EDIT_OWN,
    PERMISSIONS.REPORT_SUBMIT,
    PERMISSIONS.LIBRARY_ACCESS,
    PERMISSIONS.LIBRARY_VIEW_FILES,
    PERMISSIONS.LEAVE_ACCESS,
    PERMISSIONS.LEAVE_REQUEST,
  ],
  HR_OPERATIONS: [
    PERMISSIONS.ATTENDANCE_APPROVE_HR,
    PERMISSIONS.ADMIN_MANAGE_STAFF,
    PERMISSIONS.ADMIN_MANAGE_ANNOUNCEMENTS,
    PERMISSIONS.ATTENDANCE_MANAGE_ROSTER,
    PERMISSIONS.ATTENDANCE_VIEW_TEAM,
    PERMISSIONS.TASK_ACCESS_ALL,
    PERMISSIONS.WORKBOOK_ACCESS_ALL,
  ],
  FINANCE_CONTROL: [
    PERMISSIONS.REQUISITION_APPROVE_FINANCE,
    PERMISSIONS.REQUISITION_DISBURSE,
    PERMISSIONS.FINANCE_MANAGE_ACCOUNTS,
    PERMISSIONS.FINANCE_VIEW_REPORTS,
  ],
  EXECUTIVE_OVERSIGHT: [
    PERMISSIONS.REQUISITION_APPROVE_MD,
    PERMISSIONS.ADMIN_MANAGE_COMPANY,
    PERMISSIONS.ADMIN_VIEW_AUDIT,
    PERMISSIONS.ADMIN_MANAGE_DISPLAYS,
    PERMISSIONS.TASK_ACCESS_ALL,
    PERMISSIONS.WORKBOOK_ACCESS_ALL,
  ]
} as const;
