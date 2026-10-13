"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator
} from "@/components/ui/command"
import {
  LayoutDashboard,
  User,
  CalendarCheck2,
  BarChart3,
  ListTodo,
  MonitorPlay,
  SunMoon,
  Clock,
  PlusCircle,
  Users,
  Search,
  CheckCircle2,
  Calendar,
  FileText,
  Palmtree,
  Sparkles,
  Trophy
} from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import type { UserProfile, Task } from "@/lib/types"
import { usePermissions } from "@/hooks/usePermissions"
import { useTheme } from "next-themes"
import { uiEmitter } from "@/lib/ui-emitter"
import { sanitizeSearchQuery } from "@/lib/security"
import { NIGERIAN_PUBLIC_HOLIDAYS } from "@/lib/holidays"

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const router = useRouter()
  const { user } = useUser()
  const firestore = useFirestore()
  const { theme, setTheme } = useTheme()

  const userProfileRef = useMemoFirebase(() =>
    firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user])
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef)

  const permissions = usePermissions(userProfile || null)

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.orgId || !permissions.canManageStaff) return null;
    return query(
      collection(firestore, 'users'),
      where('orgId', '==', userProfile.orgId)
    );
  }, [firestore, userProfile?.orgId, permissions.canManageStaff]);

  const { data: staffList } = useCollection<UserProfile>(usersQuery);

  const tasksQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.id || !userProfile?.orgId) return null;
    return query(
      collection(firestore, 'tasks'),
      where('orgId', '==', userProfile.orgId),
      where('assignedTo', '==', userProfile.id),
      where('status', '!=', 'ARCHIVED')
    );
  }, [firestore, userProfile?.id, userProfile?.orgId]);

  const { data: myTasks } = useCollection<Task>(tasksQuery);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)

    const handleOpen = () => setOpen(true);
    uiEmitter.on('open-command-palette', handleOpen);

    return () => {
      document.removeEventListener("keydown", down)
      uiEmitter.off('open-command-palette', handleOpen);
    }
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    setSearch("")
    command()
  }

  // Live Predictive Auto-Recommendations as user types
  const recommendations = useMemo(() => {
    const clean = search.trim().toLowerCase();
    if (!clean) return [];

    const recs: { title: string; subtitle: string; icon: any; action: () => void }[] = [];

    if (clean.includes("leave") || clean.includes("pto") || clean.includes("vacation")) {
      recs.push({ title: "Request Leave", subtitle: "Submit new time-off application", icon: Palmtree, action: () => uiEmitter.emit('open-request-leave-dialog') });
      recs.push({ title: "My Leave Balance", subtitle: "Check annual leave entitlement", icon: Calendar, action: () => router.push('/staff/leave') });
      if (permissions.canManageStaff) {
        recs.push({ title: "Pending HR Leave Approvals", subtitle: "Review team leave requests", icon: CalendarCheck2, action: () => router.push('/staff/leave') });
      }
    }

    if (clean.includes("report") || clean.includes("debrief") || clean.includes("eod")) {
      recs.push({ title: "Write Daily Report", subtitle: "Submit EOD accomplishments and blockers", icon: FileText, action: () => uiEmitter.emit('open-debrief-modal' as any) });
      recs.push({ title: "View My Reports", subtitle: "Inspect daily report history", icon: BarChart3, action: () => router.push('/staff/reports') });
    }

    if (clean.includes("task") || clean.includes("assign") || clean.includes("work")) {
      recs.push({ title: "Assign New Task", subtitle: "Create operational task ticket", icon: PlusCircle, action: () => uiEmitter.emit('open-assign-task-dialog') });
      recs.push({ title: "My Active Tasks", subtitle: "View assigned deliverable queue", icon: ListTodo, action: () => router.push('/tasks') });
    }

    if (clean.includes("holiday") || clean.includes("calendar") || clean.includes("date")) {
      recs.push({ title: "View Operational Calendar", subtitle: "Interactive shifts, leave & holiday hub", icon: Calendar, action: () => router.push('/dashboard?tab=calendar') });
      recs.push({ title: "Upcoming Nigerian Holidays", subtitle: "Check official public holiday dates", icon: Sparkles, action: () => router.push('/dashboard?tab=calendar') });
    }

    return recs;
  }, [search, permissions.canManageStaff, router]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      filter={(value: string, searchInput: string) => {
        const cleanSearch = sanitizeSearchQuery(searchInput);
        if (!cleanSearch) return 1;

        const normalizedValue = value.toLowerCase();
        const normalizedSearch = cleanSearch.toLowerCase();

        if (normalizedValue.includes(normalizedSearch)) return 1;

        let searchIndex = 0;
        for (let i = 0; i < normalizedValue.length; i++) {
          if (normalizedValue[i] === normalizedSearch[searchIndex]) {
            searchIndex++;
          }
          if (searchIndex === normalizedSearch.length) return 0.5;
        }
        return 0;
      }}
    >
      <CommandInput
        placeholder="Type a command, page, staff name, or keyword (e.g. leave, report, task)..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="custom-scrollbar">
        <CommandEmpty>No matching results found.</CommandEmpty>

        {recommendations.length > 0 && (
          <CommandGroup heading="Live Predictive Recommendations">
            {recommendations.map((rec, idx) => {
              const Icon = rec.icon;
              return (
                <CommandItem key={`rec-${idx}`} onSelect={() => runCommand(rec.action)}>
                  <Icon className="mr-2 h-4 w-4 text-primary shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-bold text-xs">{rec.title}</span>
                    <span className="text-[9px] text-muted-foreground">{rec.subtitle}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push('/dashboard'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard Overview</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/dashboard?tab=calendar'))}>
            <Calendar className="mr-2 h-4 w-4 text-purple-400" />
            <span>Operational Calendar & Attendance</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/staff/profile'))}>
            <User className="mr-2 h-4 w-4" />
            <span>My Profile</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/staff/attendance'))}>
            <CalendarCheck2 className="mr-2 h-4 w-4" />
            <span>Attendance Center</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/reports'))}>
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Analytics & Reports</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/tasks'))}>
            <ListTodo className="mr-2 h-4 w-4" />
            <span>Task Manager</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/livedisplay'))}>
            <MonitorPlay className="mr-2 h-4 w-4" />
            <span>Live Displays</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))}>
            <SunMoon className="mr-2 h-4 w-4" />
            <span>Toggle Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => uiEmitter.emit('open-attendance-dialog'))}>
            <Clock className="mr-2 h-4 w-4 text-emerald-400" />
            <span>Clock In / Out</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => uiEmitter.emit('open-debrief-modal' as any))}>
            <FileText className="mr-2 h-4 w-4 text-blue-400" />
            <span>Write Daily Report</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => uiEmitter.emit('open-request-leave-dialog'))}>
            <Palmtree className="mr-2 h-4 w-4 text-orange-400" />
            <span>Request Time Off</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => uiEmitter.emit('open-assign-task-dialog'))}>
            <PlusCircle className="mr-2 h-4 w-4 text-primary" />
            <span>Assign New Task</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Nigerian Public Holidays">
          {NIGERIAN_PUBLIC_HOLIDAYS.slice(0, 4).map((h, idx) => (
            <CommandItem key={`holiday-${idx}`} onSelect={() => runCommand(() => router.push('/dashboard?tab=calendar'))}>
              <Sparkles className="mr-2 h-4 w-4 text-purple-400 shrink-0" />
              <span>{h.name}</span>
              <span className="ml-auto text-[9px] font-mono text-purple-300 font-bold">{h.date}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {myTasks && myTasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="My Active Tasks">
              {myTasks.map((task) => (
                <CommandItem
                  key={task.id}
                  onSelect={() => runCommand(() => uiEmitter.emit('open-tasks-dialog', { taskId: task.id }))}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
                  <span className="truncate">{task.title}</span>
                  <span className="ml-2 text-[8px] font-black uppercase opacity-40 px-1 border rounded">{task.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {permissions.canManageStaff && staffList && staffList.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Staff Directory">
              {staffList.map((staff) => (
                <CommandItem
                  key={staff.id}
                  onSelect={() => runCommand(() => router.push(`/staff/profile?id=${staff.id}`))}
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span>{staff.fullName}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground uppercase opacity-50">{staff.jobTitle || staff.role}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
