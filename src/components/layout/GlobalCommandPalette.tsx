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
  CheckCircle2
} from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import type { UserProfile, Task } from "@/lib/types"
import { usePermissions } from "@/hooks/usePermissions"
import { useTheme } from "next-themes"
import { uiEmitter } from "@/lib/ui-emitter"
import { sanitizeSearchQuery } from "@/lib/security"

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false)
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
    command()
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      filter={(value: string, search: string) => {
        const cleanSearch = sanitizeSearchQuery(search);
        if (!cleanSearch) return 1;

        const normalizedValue = value.toLowerCase();
        const normalizedSearch = cleanSearch.toLowerCase();

        if (normalizedValue.includes(normalizedSearch)) return 1;

        // Fuzzy match logic
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
      <CommandInput placeholder="Search tasks, pages, or commands..." />
      <CommandList className="custom-scrollbar">
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push('/dashboard'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
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
            <Clock className="mr-2 h-4 w-4" />
            <span>Clock In / Out</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => uiEmitter.emit('open-assign-task-dialog'))}>
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>Create New Task</span>
          </CommandItem>
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
