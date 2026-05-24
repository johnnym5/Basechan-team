
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
    start: string;
    end: string;
  };
  reporting_schedule?: {
    required: boolean;
    deadline: string; // HH:mm format
  };
  currency_symbol: string;
  branding_color?: string | null;
  accent_color?: string | null;
}

export interface UserProfile {
  id: string;
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
  joinedDate: string;
  status?: UserStatus;
  lastSeen?: string;
  activeSessionId?: string | null;
  deviceType?: 'MOBILE' | 'PC' | null;
  lastHeartbeat?: string | null;
  pendingCommand?: 'SCREENSHOT' | 'NONE' | null;
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
    canManageLibrary?: boolean;
    canViewAudit?: boolean;
    canManageDisplays?: boolean;
  };
}

export type AttendanceStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AttendanceLocation = "OFFICE" | "REMOTE";

export interface Attendance {
    id: string;
    userId: string;
    userName: string;
    orgId: string;
    date: string;
    clockIn: string;
    clockOut?: string;
    status: AttendanceStatus;
    location: AttendanceLocation;
    approvedBy?: string;
    approvedAt?: string;
    remarks?: Array<'EARLY' | 'LATE' | 'OVERTIME' | 'UNDERTIME'>;
    duration?: number;
    idleTime?: number;
    overtime?: number;
    undertime?: number;
    onBreak?: boolean;
    breaks?: {
        start: string;
        end?: string;
    }[];
    totalBreak?: number;
}

export type ShiftType = "MORNING" | "AFTERNOON" | "NIGHT" | "ON_CALL";

export interface Roster {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  date: string; // ISO string (just date)
  shiftType: ShiftType;
  notes?: string;
  createdAt: string;
}

export type RequisitionStatus = "PENDING_HR" | "PENDING_FINANCE" | "PENDING_MD" | "APPROVED" | "PAID" | "REJECTED";
export type TaskStatus = "QUEUED" | "ACTIVE" | "AWAITING_REVIEW" | "ARCHIVED";
export type ActivityType = 'LOG' | 'COMMENT';

export interface ActivityEntry {
    type: ActivityType;
    actorId: string;
    actorName: string;
    timestamp: string;
    text: string;
    fromStatus?: RequisitionStatus | TaskStatus | 'N/A';
    toStatus?: RequisitionStatus | TaskStatus;
}

export interface Vendor {
    id: string;
    orgId: string;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    category: string;
    rating: number;
    isActive: boolean;
    createdAt: string;
}

export interface PurchaseOrder {
    id: string;
    serialNo: string;
    orgId: string;
    vendorId: string;
    vendorName: string;
    requisitionId?: string;
    title: string;
    totalAmount: number;
    status: 'DRAFT' | 'SENT' | 'DELIVERED' | 'CANCELLED';
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }[];
    createdAt: string;
    createdBy: string;
}

export interface Requisition {
  id: string;
  serialNo: string;
  orgId: string;
  createdBy: string;
  creatorName: string;
  title: string;
  amount: number;
  description: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  status: RequisitionStatus;
  activity: ActivityEntry[];
  createdAt: string;
  vendorId?: string;
  vendorName?: string;
}

export type TaskPriority = "LEVEL_1" | "LEVEL_2" | "LEVEL_3";

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  serialNo: string;
  orgId: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  priority: TaskPriority;
  estimatedHours?: number;
  actualHours?: number;
  status: TaskStatus;
  dueDate?: string | null;
  createdBy: string;
  activity: ActivityEntry[];
  createdAt: string;
  workbookId?: string | null;
  sheetId?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
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
  authorId: string;
  authorName: string;
  createdAt: string;
  viewedBy: string[];
  visibleTo: string[];
}

export type ChatType = 'DIRECT' | 'CHANNEL';

export interface Chat {
    id: string;
    orgId: string;
    type: ChatType;
    name?: string;
    createdBy?: string;
    participants: string[];
    participantProfiles: {
        [key: string]: {
            fullName: string;
        }
    };
    readReceipts?: {
        [userId: string]: string; // ISO timestamp of last view
    };
    lastMessage?: {
        text: string;
        senderId: string;
        senderName: string;
        timestamp: string;
    };
    updatedAt: string;
}

export interface ChatMessage {
    id: string;
    chatId: string;
    orgId: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: string;
    asset?: {
        id: string;
        type: 'TASK' | 'REQUISITION';
        title: string;
        serialNo?: string;
    };
}

export interface Notification {
  id: string;
  orgId: string;
  userId: string;
  title: string;
  description: string;
  href: string;
  isRead: boolean;
  createdAt: string;
}

export type WorkbookRole = "VIEWER" | "EDITOR" | "MANAGER";

export interface Workbook {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  createdBy: string;
  creatorName: string;
  createdAt: string;
  visibleTo: string[];
  sharedWith?: {
    userId: string;
    role: WorkbookRole;
  }[];
}

export interface ColumnConfig {
    type: 'text' | 'number' | 'date' | 'select';
    selectOptions?: string[];
    min?: number;
    max?: number;
}

export interface Sheet {
  id: string;
  workbookId: string;
  name: string;
  data: Record<string, any>[];
  headers: string[];
  columnConfig?: Record<string, ColumnConfig>;
  hiddenHeaders?: string[];
  createdAt: string;
}

export interface LibraryItem {
    id: string;
    orgId: string;
    name: string;
    type: 'FILE' | 'FOLDER';
    parentFolderId: string | null;
    url?: string | null;
    mimeType?: string | null;
    size?: number;
    createdBy: string;
    creatorName: string;
    createdAt: string;
}

export interface Feedback {
  id: string;
  orgId: string;
  organizationName: string;
  name: string;
  contactInfo: string;
  message: string;
  createdAt: string;
  status: 'NEW' | 'READ';
}

export interface AuditLog {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  resourceId?: string;
  resourceType?: string;
  timestamp: string;
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
  canViewTeam: boolean;
  canManageAccounting: boolean;
  canAccessLibrary: boolean;
  canManageLibrary: boolean;
  canViewFiles: boolean;
  canViewAudit: boolean;
  canManageDisplays: boolean;
  canBypassGeofence: boolean;
}

export type LeaveType = "ANNUAL" | "SICK" | "UNPAID" | "MATERNITY" | "PATERNITY";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LeaveRequest {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface DailyReport {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  reportDate: string;
  content: string;
  completedTasks?: {
    taskId: string;
    title: string;
  }[];
  createdAt: string;
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
  path?: string;
}

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export interface Account {
  id: string;
  orgId: string;
  name: string;
  code: string;
  type: AccountType;
  category: string;
  balance: number;
  isDebitNormal: boolean;
  description?: string;
  isActive: boolean;
}

export type JournalEntryStatus = "DRAFT" | "POSTED";

export interface JournalEntryLine {
    accountId: string;
    accountName: string;
    debit: number;
    credit: number;
}

export interface JournalEntry {
    id: string;
    orgId: string;
    date: string;
    description: string;
    reference: string;
    status: JournalEntryStatus;
    createdBy: string;
    creatorName: string;
    createdAt: string;
    lines: JournalEntryLine[];
}

export interface ExternalDisplay {
  id: string;
  orgId: string;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  createdBy: string;
  createdAt: string;
}

export type BadgeType = "TEAM_PLAYER" | "PROBLEM_SOLVER" | "INNOVATOR" | "RELENTLESS";

export interface Kudos {
    id: string;
    orgId: string;
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    badgeType: BadgeType;
    message: string;
    timestamp: string;
}

export type PulseMood = "SMOOTH" | "HEAVY" | "OVERWHELMED";

export interface PulseCheck {
    id: string;
    orgId: string;
    userId: string;
    userName: string;
    date: string;
    mood: PulseMood;
    timestamp: string;
}

export interface ActivityPoint {
    id: string; // userId_YYYY-MM-DD
    orgId: string;
    userId: string;
    date: string;
    points: number;
}
