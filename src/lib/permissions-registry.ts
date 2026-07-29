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

  // --- Communication ---
  CHAT_ACCESS: 'chat:access',
  CHAT_SEND_MESSAGE: 'chat:send-message',

  // --- Reporting ---
  REPORT_ACCESS: 'report:access',
  REPORT_SUBMIT: 'report:submit',

  // --- Self-Service ---
  PROFILE_EDIT_OWN: 'profile:edit-own',
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

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
