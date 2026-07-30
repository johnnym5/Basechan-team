
import {
  LayoutDashboard,
  CalendarCheck2,
  ReceiptText,
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

export const mainNavItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { dialog: "profile", icon: User, label: "My Profile" },
  { href: "/staff", icon: Users, label: "Staff", permission: 'canViewTeam' },
  { isSeparator: true },
  { href: "/tasks", icon: ListTodo, label: "Tasks", permission: 'canAccessTasks' },
  { dialog: "workbooks", icon: BookOpenCheck, label: "Workbooks", permission: 'canAccessWorkbooks' },
  { dialog: "displays", icon: MonitorDot, label: "Live Displays", permission: 'canAccessDisplays' },
  { href: "/finance", icon: Landmark, label: "Finance", permission: 'canAccessRequisitions' },
  { href: "/library", icon: Library, label: "Library", permission: 'canAccessLibrary' },
  { href: "/reports", icon: BarChart, label: "Reports", permission: 'canAccessReports' },
  { isSeparator: true },
  { dialog: "chat", icon: MessageSquare, label: "Chat", permission: "canAccessChat"},
  { href: "/settings", icon: Settings, label: "Admin Settings", permission: "canManageCompany"},
  { href: "/superadmin", icon: MonitorDot, label: "Super Console", permission: "isSuperAdmin"},
];
