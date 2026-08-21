
import { PREDEFINED_ROLES } from './roles-and-departments';

export type UserPosition = (typeof PREDEFINED_ROLES)[number];
export type UserRole = "SUPERADMIN" | "ORG_ADMIN" | "MANAGING_DIRECTOR" | "HR_MANAGER" | "FINANCE_MANAGER" | "STAFF";
export type UserStatus = "ONLINE" | "OFFLINE" | "ON_LEAVE" | "ACTIVE" | "SUSPENDED" | "TERMINATED" | "DISABLED";
export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
export type ModuleOverrideState = "default" | "restricted" | "unlocked";

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
  require_screen_share?: boolean;
  enable_beta_features?: boolean;
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
  document_template?: {
    header_text: string;
    footer_text: string;
    logo_url?: string;
    company_address: string;
    terms_conditions: string;
  };
  modules?: {
    finance?: 'hidden' | 'admin' | 'staff';
    chat?: 'hidden' | 'admin' | 'staff';
    attendance?: 'hidden' | 'admin' | 'staff';
    tasks?: 'hidden' | 'admin' | 'staff';
    workbooks?: 'hidden' | 'admin' | 'staff';
    library?: 'hidden' | 'admin' | 'staff';
    leave?: 'hidden' | 'admin' | 'staff';
    live_displays?: 'hidden' | 'admin' | 'staff';
    reports?: 'hidden' | 'admin' | 'staff';
  };
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface StaffDocument {
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
}

export interface EmploymentMilestone {
  role: string;
  date: string;
  type: 'HIRING' | 'PROMOTION' | 'TRANSFER' | 'ADJUSTMENT';
  notes?: string;
}

export interface UserProfile {
  id: string;
  orgId: string;
  email: string;
  username: string;
  password?: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  position: UserPosition;
  departmentId?: string;
  departmentName?: string;
  joinedDate: string;
  status?: UserStatus;

  // RBAC & Authorization
  roleIds?: string[]; // IDs of roles assigned to this user
  resolvedPermissions?: string[]; // Cached flat list of all permissions (for performance)

  // Enhanced Staff Profile Fields
  dateOfBirth?: string;
  address?: string;
  employeeId?: string;
  jobTitle?: string;
  managerId?: string; // Reference to another UserProfile ID
  employmentType?: EmploymentType;
  joinDate?: string;
  emergencyContact?: EmergencyContact;
  documents?: StaffDocument[];
  employmentHistory?: EmploymentMilestone[];
  workSchedule?: {
    days: string[]; // e.g. ["MON", "TUE", ...]
    hours: string; // e.g. "09:00 - 17:00"
  };

  // IT & Asset Management
  assignedEquipment?: {
    id: string;
    name: string;
    serialNumber: string;
    assignedDate: string;
  }[];
  softwareLicenses?: {
    id: string;
    name: string;
    key?: string;
    assignedDate: string;
  }[];

  // Identity & Personalization
  preferredName?: string;
  pronouns?: string;
  bio?: string;
  timezone?: string;
  location?: string; // e.g. "Office", "Remote - Abuja"

  // Skills & Culture
  skills?: string[];
  languages?: string[];

  adminNotes?: string;

  // Performance & Points System
  performanceScore?: number; // 0-100, baseline 50
  performanceRating?: 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  performanceStatus?: 'EXCELLING' | 'STABLE' | 'NEEDS_IMPROVEMENT' | 'FLAGGED';

  isArchived?: boolean;
  archivedAt?: string;
  accessRevokedAt?: string;

  leaveEntitlements?: {
    ANNUAL: number;
    SICK: number;
  };

  lastSeen?: string;
  activeSessionId?: string | null;
  deviceType?: 'MOBILE' | 'PC' | null;
  lastHeartbeat?: string | null;
  pendingCommand?: 'SCREENSHOT' | 'SCREEN_SHARE' | 'NONE' | null;
  dismissedAlertIds?: string[]; // Persisted acknowledgments for Intelligent Summary
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
    canManageAccounting?: boolean;
    canAccessLibrary?: boolean;
    modules?: {
      finance?: 'default' | 'hidden' | 'admin' | 'staff';
      chat?: 'default' | 'hidden' | 'admin' | 'staff';
      attendance?: 'default' | 'hidden' | 'admin' | 'staff';
      tasks?: 'default' | 'hidden' | 'admin' | 'staff';
      workbooks?: 'default' | 'hidden' | 'admin' | 'staff';
      library?: 'default' | 'hidden' | 'admin' | 'staff';
      leave?: 'default' | 'hidden' | 'admin' | 'staff';
      live_displays?: 'default' | 'hidden' | 'admin' | 'staff';
      reports?: 'default' | 'hidden' | 'admin' | 'staff';
    };
  };
}

export type AttendanceStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AttendanceLocation = "OFFICE" | "REMOTE";
export type AttendanceRemark = 'EARLY' | 'LATE' | 'OVERTIME' | 'UNDERTIME';

export interface AttendanceSession {
    clockIn: string;
    clockOut?: string;
}

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
    remarks?: AttendanceRemark[];
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
    lateReason?: string | null;
    sessions?: AttendanceSession[];
    eodReport?: string | null;
    linkedTaskIds?: string[];
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

export interface TaskTransferRecord {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  timestamp: string;
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
  isTransferred?: boolean;
  transferHistory?: TaskTransferRecord[];
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
  canShareScreen: boolean;
  canSendNotifications: boolean;
  canShareLocation: boolean;
  canAllowAudio: boolean;
  canModifyFiles: boolean;
  canReadFiles: boolean;
  canCreateRequisition: boolean;
  canSendChatMessage: boolean;
  canAccessAttendance: boolean;
  canAccessLeave: boolean;
  canRequestLeave: boolean;
  canAccessTasks: boolean;
  canCreateTask: boolean;
  canAccessWorkbooks: boolean;
  canCreateWorkbook: boolean;
  canAccessDisplays: boolean;
  canAccessReports: boolean;
  canSubmitReport: boolean;
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
  totalDays: number;
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
  accomplishments: string;
  blockers: string;
  nextFocus: string;
  pulse: 'GREAT' | 'PRODUCTIVE' | 'AVERAGE' | 'STRUGGLING';
  content: string; // Legacy field or consolidated view
  completedTasks?: {
    taskId: string;
    title: string;
    notes?: string;
  }[];
  createdAt: string;
  isReviewed?: boolean;
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

export interface ExternalDisplay {
    id: string;
    orgId: string;
    title: string;
    description?: string;
    url: string;
    displayMode: 'GLOBAL' | 'PRIVATE';
    createdBy: string;
    createdAt: string;
}

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

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

export type JournalEntryStatus = 'DRAFT' | 'POSTED';

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

export interface ActivityPoint {
  id: string;
  userId: string;
  orgId: string;
  date: string;
  points: number;
}

export interface Nomination {
  id: string;
  orgId: string;
  nomineeId: string;
  nomineeName: string;
  nominatorId: string;
  nominatorName: string;
  categoryId: string;
  categoryTitle: string;
  reason: string;
  timestamp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface PerformanceReview {
  id: string;
  orgId: string;
  userId: string; // The employee being reviewed
  userName: string;
  reviewerId: string; // The manager performing the review
  reviewerName: string;
  cycle: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  reviewDate: string; // ISO string
  createdAt: string; // ISO string
  qualitative: {
    successAreas: string;
    areasForImprovement: string;
    focusAreasNextReview: string;
    overallAchievements: string;
    agreedActionPlan: string;
  };
  // Dynamic Arrays instead of hardcoded fields
  businessTargets: { metricName: string; score: number }[];
  interpersonalSkills: { skillName: string; score: number }[];
  signatures: {
    manager?: {
        signedAt: string;
        signedBy: string;
        name: string;
    };
    employee?: {
        signedAt: string;
        signedBy: string;
        name: string;
    };
  };
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED';
}

export interface ReviewTemplate {
  id: string;
  orgId: string;
  templateName: string;
  department?: string;
  businessTargets: string[]; // List of metric names
  interpersonalSkills: string[]; // List of skill names
  createdBy: string;
  createdAt: string;
}

export interface AppRole {
  id: string;
  name: string;
  description?: string;
  orgId: string | 'SYSTEM';
  duties: string[]; // List of Duty IDs (from registry)
  permissions: string[]; // Resolved flat list of technical permission strings
  isSystem?: boolean; // If true, cannot be deleted
  createdAt: string;
  updatedAt: string;
}

export interface AccoladeCategory {
    id: string;
    orgId: string;
    title: string;
    description: string;
    icon?: string; // Lucide icon name or emoji
    isActive: boolean;
    createdAt: string;
}

export interface AccoladeVote {
    id: string;
    orgId: string;
    nominatorId: string;
    nominatorName: string;
    nomineeId: string;
    nomineeName: string;
    categoryId: string;
    categoryTitle: string;
    timestamp: string; // ISO string
}
