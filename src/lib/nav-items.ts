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
} from "lucide-react";

export const mainNavItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { dialog: "profile", icon: User, label: "My Profile" },
  { isSeparator: true },
  { dialog: "attendance", icon: CalendarCheck2, label: "Attendance" },
  { dialog: "leave", icon: CalendarPlus, label: "Leave" },
  { isSeparator: true },
  { dialog: "tasks", icon: ListTodo, label: "Task Manager" },
  { dialog: "workbooks", icon: BookOpenCheck, label: "Workbooks" },
  { dialog: "requisitions", icon: ReceiptText, label: "Finances", permission: 'canAccessRequisitions' },
  { dialog: "reports", icon: BarChart, label: "Reports" },
  { isSeparator: true },
  { dialog: "chat", icon: MessageSquare, label: "Chat", permission: "canAccessChat"},
  { dialog: "settings", icon: Settings, label: "Settings", permission: "canViewTeam"},
];
