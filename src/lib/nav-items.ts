import {
  LayoutDashboard,
  ListTodo,
  BarChart,
  CalendarPlus,
  BookOpenCheck,
  MessageSquare,
  Settings,
  User,
  Users,
  Landmark,
  Library,
  MonitorDot,
} from "lucide-react";

export interface NavItem {
  href?: string;
  dialog?: string;
  icon: any;
  label: string;
  group: 'Core Operations' | 'People & HR' | 'Finance & Analytics' | 'System Admin';
  permission?: string;
}

export const navGroups = [
  { id: 'core', label: 'Core Operations' },
  { id: 'people', label: 'People & HR' },
  { id: 'finance', label: 'Finance & Analytics' },
  { id: 'admin', label: 'System Admin' },
] as const;

export const mainNavItems: NavItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", group: 'Core Operations' },
  { href: "/tasks", icon: ListTodo, label: "Tasks", group: 'Core Operations', permission: 'canAccessTasks' },
  { href: "/library", icon: BookOpenCheck, label: "Workbooks", group: 'Core Operations', permission: 'canAccessWorkbooks' },
  { href: "/livedisplay", icon: MonitorDot, label: "Live Dashboards", group: 'Core Operations', permission: 'canAccessDisplays' },

  { href: "/staff/profile", icon: User, label: "My Profile", group: 'People & HR' },
  { dialog: "leave", icon: CalendarPlus, label: "Leave", group: 'People & HR', permission: 'canAccessLeave' },
  { href: "/staff", icon: Users, label: "Staff", group: 'People & HR', permission: 'canViewTeam' },

  { href: "/finance", icon: Landmark, label: "Finance", group: 'Finance & Analytics', permission: 'canAccessRequisitions' },
  { href: "/library", icon: Library, label: "Knowledge Base", group: 'Finance & Analytics', permission: 'canAccessLibrary' },
  { href: "/staff/reports", icon: BarChart, label: "Reports", group: 'Finance & Analytics', permission: 'canAccessReports' },

  { href: "/chat", icon: MessageSquare, label: "Chat", group: 'System Admin', permission: "canAccessChat"},
  { href: "/settings", icon: Settings, label: "Admin Settings", group: 'System Admin', permission: "canManageCompany"},
  { href: "/superadmin", icon: MonitorDot, label: "Super Console", group: 'System Admin', permission: "isSuperAdmin"},
];
