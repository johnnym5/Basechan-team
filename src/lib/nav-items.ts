
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
  Landmark,
  Library,
  MonitorDot,
} from "lucide-react";

export const mainNavItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { dialog: "profile", icon: User, label: "My Profile" },
  { isSeparator: true },
  { dialog: "attendance", icon: CalendarCheck2, label: "Attendance", permission: 'canAccessAttendance' },
  { dialog: "leave", icon: CalendarPlus, label: "Leave", permission: 'canAccessLeave' },
  { isSeparator: true },
  { dialog: "tasks", icon: ListTodo, label: "Tasks", permission: 'canAccessTasks' },
  { dialog: "workbooks", icon: BookOpenCheck, label: "Workbooks", permission: 'canAccessWorkbooks' },
  { dialog: "displays", icon: MonitorDot, label: "Live Displays", permission: 'canAccessDisplays' },
  { dialog: "finance", icon: Landmark, label: "Finance", permission: 'canAccessRequisitions' },
  { dialog: "library", icon: Library, label: "Library", permission: 'canAccessLibrary' },
  { dialog: "reports", icon: BarChart, label: "Reports", permission: 'canAccessReports' },
  { isSeparator: true },
  { dialog: "chat", icon: MessageSquare, label: "Chat", permission: "canAccessChat"},
  { dialog: "settings", icon: Settings, label: "Management Console", permission: "canViewTeam"},
];
