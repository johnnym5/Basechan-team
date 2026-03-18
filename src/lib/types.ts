import { PREDEFINED_ROLES } from './roles-and-departments';

export type UserPosition = (typeof PREDEFINED_ROLES)[number];
export type UserRole = "ORG_ADMIN" | "MANAGING_DIRECTOR" | "HR_MANAGER" | "FINANCE_MANAGER" | "STAFF";
export type UserStatus = "ONLINE" | "OFFLINE" | "ON_LEAVE";

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface Department {
  id: string;
  orgId: string;
  name: string;
}

export interface SystemConfig {
  id:string;
  orgId: string;
  finance_access: boolean;
  admin_tools: boolean;
  attendance_strict: boolean;
  chat_enabled: boolean;
  allow_self_edit: boolean;
  office_coordinates?: {
    lat: number;
    lng: number;
  } | null;
  work_hours?: {
    start: string; // "HH:mm"
    end: string;   // "HH:mm"
  };
  currency_symbol: string;
  branding_color?: string | null; // Hex code
  accent_color?: string | null; // Hex code
}

export interface UserProfile {
  id: string; // UID
  orgId: string;
  email: string;
  username: string;
  fullName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  position: UserPosition;
  departmentId?: string;
  departmentName?: string;
  joinedDate: string; // ISO String for timestamp
  status?: UserStatus;
  lastSeen?: string; // ISO String
  notificationPreferences?: {
    requisitionUpdates?: boolean;
    taskAssignments?: boolean;
    announcements?: boolean;
  };
  customPermissions?: {
    canAccessRequisitions?: boolean;
    canAccessChat?: boolean;
    canAccessAllTasks?: boolean;
    canAccessAllWorkbooks?: boolean;
    canManageAnnouncements?: boolean;
  };
}

export type AttendanceStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AttendanceLocation = "OFFICE" | "REMOTE";

export interface Attendance {
    id: string;
    userId: string;
    userName: string;
    orgId: string;
    date: string; // YYYY-MM-DD
    clockIn: string; // ISO String for timestamp
    clockOut?: string; // ISO String for timestamp
    status: AttendanceStatus;
    location: AttendanceLocation;
    approvedBy?: string; // userId
    approvedAt?: string; // ISO String
    remarks?: Array<'EARLY' | 'LATE' | 'OVERTIME' | 'UNDERTIME'>;
    duration?: number; // seconds
    overtime?: number; // seconds
    undertime?: number; // seconds;
    onBreak?: boolean;
    breaks?: {
        start: string;
        end?: string;
    }[];
    totalBreak?: number; // seconds
}

export type RequisitionStatus = "PENDING_HR" | "PENDING_FINANCE" | "PENDING_MD" | "APPROVED" | "PAID" | "REJECTED";
export type TaskStatus = "QUEUED" | "ACTIVE" | "AWAITING_REVIEW" | "ARCHIVED";
export type ActivityType = 'LOG' | 'COMMENT';

export interface ActivityEntry {
    type: ActivityType;
    actorId: string; // userId
    actorName: string;
    timestamp: string; // ISO String for timestamp
    text: string; // The content of the log or comment
    
    // Optional fields for LOG entries
    fromStatus?: RequisitionStatus | TaskStatus | 'N/A';
    toStatus?: RequisitionStatus | TaskStatus;
}


export interface Requisition {
  id: string;
  serialNo: string;
  orgId: string;
  createdBy: string; // userId
  creatorName: string;
  title: string;
  amount: number;
  description: string;
  attachmentUrl?: string | null;
  status: RequisitionStatus;
  activity: ActivityEntry[];
  createdAt: string; // ISO String for timestamp
}

export type TaskPriority = "LEVEL_1" | "LEVEL_2" | "LEVEL_3";

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  orgId: string;
  title: string;
  description: string;
  assignedTo: string; // userId
  assignedToName: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string | null;
  createdBy: string; // userId
  activity: ActivityEntry[];
  createdAt: string; // ISO string
  workbookId?: string | null;
  sheetId?: string | null;
  sharedWith?: string[];
  subTasks?: SubTask[];
  type?: 'STANDARD' | 'ASSISTANCE_REQUEST';
  relatedTaskId?: string;
  requesterId?: string;
  requesterName?: string;
}


export interface Announcement {
  id: string;
  orgId: string;
  title: string;
  content: string;
  isPinned: boolean;
  authorId: string; // userId
  authorName: string;
  createdAt: string; // ISO String for timestamp
  viewedBy: string[]; // Array of userIds
  visibleTo: string[]; // `['ALL']` for all users, or `['userId1', 'userId2']` for specific users
}

export type ChatType = 'DIRECT' | 'CHANNEL';

export interface Chat {
    id: string;
    orgId: string;
    type: ChatType;
    name?: string; // For channels
    createdBy?: string; // For channels
    participants: string[]; // userIds
    participantProfiles: { // Map userId to a mini profile
        [key: string]: {
            fullName: string;
        }
    };
    lastMessage?: {
        text: string;
        senderId: string;
        senderName: string;
        timestamp: string;
    };
    updatedAt: string; // ISO String for timestamp
}

export interface ChatMessage {
    id: string;
    chatId: string;
    orgId: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: string; // ISO String for timestamp
}

export interface Notification {
  id: string;
  orgId: string;
  userId: string; // The user who receives the notification
  title: string;
  description: string;
  href: string; // URL to navigate to on click
  isRead: boolean;
  createdAt: string; // ISO String
}

export type WorkbookRole = "VIEWER" | "EDITOR" | "MANAGER";

export interface Workbook {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  createdBy: string;
  creatorName: string;
  createdAt: string; // ISO String
  visibleTo: string[];
  sharedWith?: {
    userId: string;
    role: WorkbookRole;
  }[];
}

export interface ColumnConfig {
    type: 'text' | 'number' | 'date' | 'select';
    selectOptions?: string[];
}

export interface Sheet {
  id: string;
  workbookId: string;
  name: string;
  data: Record<string, any>[];
  headers: string[];
  columnConfig?: Record<string, ColumnConfig>;
  hiddenHeaders?: string[];
  createdAt: string; // ISO String
}

export interface Feedback {
  id: string;
  orgId: string;
  organizationName: string;
  name: string;
  contactInfo: string;
  message: string;
  createdAt: string; // ISO String
  status: 'NEW' | 'READ';
}

export interface Permissions {
  canApproveHR: boolean;
  canApproveFinance: boolean;
  canApproveMD: boolean;
  canDisburse: boolean;
  canManageStaff: boolean;
  canManageCompany: boolean;
  canClockIn: boolean;
  canEditOwnProfile: boolean;
  canAccessRequisitions: boolean;
  canAccessChat: boolean;
  canAccessAllTasks: boolean;
  canAccessAllWorkbooks: boolean;
  canManageAnnouncements: boolean;
}

export type LeaveType = "ANNUAL" | "SICK" | "UNPAID" | "MATERNITY" | "PATERNITY";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LeaveRequest {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  leaveType: LeaveType;
  startDate: string; // ISO String
  endDate: string; // ISO String
  reason: string;
  status: LeaveStatus;
  approvedBy?: string; // userId
  approvedAt?: string; // ISO String
  createdAt: string; // ISO String
}

export interface DailyReport {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  reportDate: string; // YYYY-MM-DD
  content: string;
  completedTasks?: {
    taskId: string;
    title: string;
  }[];
  createdAt: string; // ISO String
}

export interface ErrorLog {
  id: string;
  orgId?: string;
  userId?: string;
  userName?: string;
  timestamp: string;
  errorMessage: string;
  stackTrace?: string;
  componentStack?: string;
  path?: string; // e.g., window.location.pathname
}
