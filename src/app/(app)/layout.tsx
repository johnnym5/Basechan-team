'use client';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { ListTodo, FileText, CalendarPlus, BookOpenCheck, Plus, UserPlus, MessageSquare, Megaphone, Landmark, BookCopy } from 'lucide-react';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import type { UserProfile, Attendance } from '@/lib/types';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { hexToHslString, cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { BottomNavBar } from '@/components/layout/BottomNavBar';
import AppHeader from '@/components/layout/AppHeader';
import { WorkbookDialog } from '@/components/workbook/WorkbookDialog';
import { RequisitionsDialog } from '@/components/requisitions/RequisitionsDialog';
import { TasksDialog } from '@/components/tasks/TasksDialog';
import { AttendanceDialog } from '@/components/attendance/AttendanceDialog';
import { LeaveDialog } from '@/components/leave/LeaveDialog';
import { ReportsDialog } from '@/components/reports/ReportsDialog';
import { uiEmitter } from '@/lib/ui-emitter';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { NewRequisitionDialog } from '@/components/requisitions/NewRequisitionDialog';
import { RequestLeaveDialog } from '@/components/leave/RequestLeaveDialog';
import { NewWorkbookDialog } from '@/components/workbook/NewWorkbookDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { ProfileDialog } from '@/components/profile/ProfileDialog';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { ChatDialog } from '@/components/chat/ChatDialog';
import { InviteUserDialog } from '@/components/settings/InviteUserDialog';
import { useImpersonation } from '@/context/ImpersonationProvider';
import { NewAnnouncementDialog } from '@/components/dashboard/NewAnnouncementDialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { SuperAdminDialog } from '@/components/superadmin/SuperAdminDialog';
import { format } from 'date-fns';
import { AccountingDialog } from '@/components/accounting/AccountingDialog';
import { mainNavItems } from '@/lib/nav-items';
import { ScrollArea } from '@/components/ui/scroll-area';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { theme } = useTheme();
  
  const [isWorkbookOpen, setIsWorkbookOpen] = useState(false);
  const [initialWorkbookPayload, setInitialWorkbookPayload] = useState<{ workbookId?: string; sheetId?: string | null } | undefined>();
  const [isRequisitionsOpen, setIsRequisitionsOpen] = useState(false);
  const [initialReqPayload, setInitialReqPayload] = useState<{ reqId?: string } | undefined>();
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [initialTaskPayload, setInitialTaskPayload] = useState<{ taskId?: string } | undefined>();
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isAccountingOpen, setIsAccountingOpen] = useState(false);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [isNewRequisitionOpen, setIsNewRequisitionOpen] = useState(false);
  const [isRequestLeaveOpen, setIsRequestLeaveOpen] = useState(false);
  const [isNewWorkbookOpen, setIsNewWorkbookOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialChatPayload, setInitialChatPayload] = useState<{ initialUserId?: string } | undefined>();
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [isNewAnnouncementOpen, setIsNewAnnouncementOpen] = useState(false);
  const { isImpersonating } = useImpersonation();
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isSuperAdminOpen, setIsSuperAdminOpen] = useState(false);

  const [today, setToday] = useState('');

  const isLoggedIn = !!user;

  const closeAllDialogs = useCallback(() => {
    setIsWorkbookOpen(false);
    setIsRequisitionsOpen(false);
    setIsTasksOpen(false);
    setIsAttendanceOpen(false);
    setIsLeaveOpen(false);
    setIsReportsOpen(false);
    setIsAccountingOpen(false);
    setIsAssignTaskOpen(false);
    setIsNewRequisitionOpen(false);
    setIsRequestLeaveOpen(false);
    setIsNewWorkbookOpen(false);
    setIsProfileOpen(false);
    setIsSettingsOpen(false);
    setIsChatOpen(false);
    setIsInviteUserOpen(false);
    setIsNewAnnouncementOpen(false);
    setIsSuperAdminOpen(false);
  }, []);

  useEffect(() => {
    if (isLoggedIn) setIsAuthDialogOpen(false);
  }, [isLoggedIn]);

  useEffect(() => {
      setToday(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const isAnyMainDialogOpen =
    isLoggedIn && (
        isWorkbookOpen ||
        isRequisitionsOpen ||
        isTasksOpen ||
        isAttendanceOpen ||
        isLeaveOpen ||
        isReportsOpen ||
        isAccountingOpen ||
        isAssignTaskOpen ||
        isNewRequisitionOpen ||
        isRequestLeaveOpen ||
        isNewWorkbookOpen ||
        isProfileOpen ||
        isSettingsOpen ||
        isChatOpen ||
        isInviteUserOpen ||
        isNewAnnouncementOpen ||
        isSuperAdminOpen
    );

  const isAnyDialogOpen = isAnyMainDialogOpen || isAuthDialogOpen;

  const userProfileRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  
  const attendanceQuery = useMemoFirebase(() => {
    if (!user || !firestore || !today) return null;
    return query(
      collection(firestore, 'attendance'),
      where('userId', '==', user.uid),
      where('date', '==', today),
      limit(1)
    );
  }, [user, firestore, today]);
  const { data: attendanceData } = useCollection<Attendance>(attendanceQuery);
  const attendanceRecord = attendanceData?.[0] || null;

  const permissions = usePermissions(userProfile);
  const { config } = useSystemConfig(userProfile?.orgId);
  
  useEffect(() => {
    const root = document.documentElement;
    const defaultPrimary = '222 83% 53%';
    const defaultAccent = '217.2 32.6% 17.5%';
    
    if (config?.branding_color) {
      const hslString = hexToHslString(config.branding_color);
      if (hslString) root.style.setProperty('--primary', hslString);
    } else {
      root.style.setProperty('--primary', defaultPrimary);
    }

    if (config?.accent_color) {
      const hslString = hexToHslString(config.accent_color);
      if (hslString) root.style.setProperty('--accent', hslString);
    } else {
      root.style.setProperty('--accent', defaultAccent);
    }
  }, [config, theme]);

  const handleDialogClick = (dialog: string) => {
    switch(dialog) {
      case 'chat': setIsChatOpen(true); break;
      case 'settings': setIsSettingsOpen(true); break;
      case 'tasks': setIsTasksOpen(true); break;
      case 'workbooks': setIsWorkbookOpen(true); break;
      case 'requisitions': setIsRequisitionsOpen(true); break;
      case 'attendance': setIsAttendanceOpen(true); break;
      case 'leave': setIsLeaveOpen(true); break;
      case 'reports': setIsReportsOpen(true); break;
      case 'profile': setIsProfileOpen(true); break;
      case 'accounting': setIsAccountingOpen(true); break;
      case 'superadmin': setIsSuperAdminOpen(true); break;
    }
  };

  useEffect(() => {
    const openProfile = () => setIsProfileOpen(true);
    const openSettings = () => setIsSettingsOpen(true);
    const openChat = (payload?: { initialUserId?: string }) => {
      if (payload) setInitialChatPayload(payload);
      setIsChatOpen(true);
    };
    const openTasks = (payload?: { taskId?: string }) => {
        if (payload) setInitialTaskPayload(payload);
        setIsTasksOpen(true);
    };
    const openWorkbooks = (payload?: { workbookId?: string; sheetId?: string | null }) => {
      if (payload) setInitialWorkbookPayload(payload);
      setIsWorkbookOpen(true);
    };
    const openRequisitions = (payload?: { reqId?: string }) => {
        if (payload) setInitialReqPayload(payload);
        setIsRequisitionsOpen(true);
    };
    const openAttendance = () => setIsAttendanceOpen(true);
    const openLeave = () => setIsLeaveOpen(true);
    const openReports = () => setIsReportsOpen(true);
    const openAccounting = () => setIsAccountingOpen(true);
    const openAssignTask = () => setIsAssignTaskOpen(true);
    const openNewRequisition = () => setIsNewRequisitionOpen(true);
    const openRequestLeave = () => setIsRequestLeaveOpen(true);
    const openNewWorkbook = () => setIsNewWorkbookOpen(true);
    const openInviteUser = () => setIsInviteUserOpen(true);
    const openNewAnnouncement = () => setIsNewAnnouncementOpen(true);
    const openSuperAdmin = () => setIsSuperAdminOpen(true);

    uiEmitter.on('open-profile-dialog', openProfile);
    uiEmitter.on('open-settings-dialog', openSettings);
    uiEmitter.on('open-chat-dialog', openChat);
    uiEmitter.on('open-tasks-dialog', openTasks);
    uiEmitter.on('open-workbooks-dialog', openWorkbooks);
    uiEmitter.on('open-requisitions-dialog', openRequisitions);
    uiEmitter.on('open-attendance-dialog', openAttendance);
    uiEmitter.on('open-leave-dialog', openLeave);
    uiEmitter.on('open-reports-dialog', openReports);
    uiEmitter.on('open-accounting-dialog', openAccounting);
    uiEmitter.on('open-assign-task-dialog', openAssignTask);
    uiEmitter.on('open-new-requisition-dialog', openNewRequisition);
    uiEmitter.on('open-request-leave-dialog', openRequestLeave);
    uiEmitter.on('open-new-workbook-dialog', openNewWorkbook);
    uiEmitter.on('open-invite-user-dialog', openInviteUser);
    uiEmitter.on('open-new-announcement-dialog', openNewAnnouncement);
    uiEmitter.on('open-superadmin-dialog', openSuperAdmin);
    uiEmitter.on('close-all-dialogs', closeAllDialogs);
    
    return () => {
      uiEmitter.off('open-profile-dialog', openProfile);
      uiEmitter.off('open-settings-dialog', openSettings);
      uiEmitter.off('open-chat-dialog', openChat);
      uiEmitter.off('open-tasks-dialog', openTasks);
      uiEmitter.off('open-workbooks-dialog', openWorkbooks);
      uiEmitter.off('open-requisitions-dialog', openRequisitions);
      uiEmitter.off('open-attendance-dialog', openAttendance);
      uiEmitter.off('open-leave-dialog', openLeave);
      uiEmitter.off('open-reports-dialog', openReports);
      uiEmitter.off('open-accounting-dialog', openAccounting);
      uiEmitter.off('open-assign-task-dialog', openAssignTask);
      uiEmitter.off('open-new-requisition-dialog', openNewRequisition);
      uiEmitter.off('open-request-leave-dialog', openRequestLeave);
      uiEmitter.off('open-new-workbook-dialog', openNewWorkbook);
      uiEmitter.off('open-invite-user-dialog', openInviteUser);
      uiEmitter.off('open-new-announcement-dialog', openNewAnnouncement);
      uiEmitter.off('open-superadmin-dialog', openSuperAdmin);
      uiEmitter.off('close-all-dialogs', closeAllDialogs);
    };
  }, [closeAllDialogs]);

  return (
    <>
      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />

      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72 md:hidden">
            <VisuallyHidden>
              <SheetHeader>
                <SheetTitle>Main Menu</SheetTitle>
                <SheetDescription>Navigation links for the application.</SheetDescription>
              </SheetHeader>
            </VisuallyHidden>
            <div className="flex flex-col h-full bg-background">
                <div className="p-6 border-b flex items-center gap-2">
                    <BookCopy className="h-6 w-6 text-primary" />
                    <h2 className="font-bold text-lg">Basechan Staff</h2>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-2">
                         {mainNavItems.map((item, idx) => {
                            if ('isSeparator' in item) return <div key={idx} className="h-px bg-border my-2" />;
                            if ('permission' in item && userProfile && !permissions[item.permission as keyof typeof permissions]) return null;

                            return (
                                <Button
                                    key={item.label}
                                    variant="ghost"
                                    className="w-full justify-start gap-3"
                                    onClick={() => {
                                        setIsMobileSidebarOpen(false);
                                        'href' in item ? router.push(item.href) : handleDialogClick(item.dialog!);
                                    }}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </Button>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>
        </SheetContent>
      </Sheet>

      <div className="relative min-h-screen flex flex-col bg-background">
            <AppHeader
                userProfile={userProfile || null}
                onMenuClick={() => setIsMobileSidebarOpen(true)}
                isLoggedIn={isLoggedIn}
                attendanceRecord={attendanceRecord}
                systemConfig={config || null}
            />
            <main className={cn(
                "flex-1 transition-all duration-500 ease-in-out",
                isAnyDialogOpen ? "md:scale-[0.98] md:px-6" : "w-full md:px-10",
                "py-6 pb-28 md:pb-10"
            )}>
                {children}
            </main>
            {isLoggedIn && <BottomNavBar onFabClick={() => setIsFabMenuOpen(true)} />}
      </div>


       {isLoggedIn && (
        <>
            {/* FAB for Desktop */}
            <div className="hidden md:block">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-lg z-40">
                            <Plus className="h-8 w-8" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 mb-2" align="end">
                        {permissions.canManageStaff && (
                            <DropdownMenuItem onSelect={() => setIsInviteUserOpen(true)}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                <span>Add Team Member</span>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => setIsAssignTaskOpen(true)}>
                            <ListTodo className="mr-2 h-4 w-4" />
                            <span>New Task</span>
                        </DropdownMenuItem>
                        {permissions.canAccessRequisitions && (
                            <DropdownMenuItem onSelect={() => setIsNewRequisitionOpen(true)}>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>New Requisition</span>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => setIsRequestLeaveOpen(true)}>
                            <CalendarPlus className="mr-2 h-4 w-4" />
                            <span>Request Leave</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setIsNewWorkbookOpen(true)}>
                            <BookOpenCheck className="mr-2 h-4 w-4" />
                            <span>New Workbook</span>
                        </DropdownMenuItem>
                        {permissions.canManageAnnouncements && (
                            <DropdownMenuItem onSelect={() => setIsNewAnnouncementOpen(true)}>
                                <Megaphone className="mr-2 h-4 w-4" />
                                <span>New Announcement</span>
                            </DropdownMenuItem>
                        )}
                        {permissions.canAccessChat && (
                            <DropdownMenuItem onSelect={() => setIsChatOpen(true)}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                <span>New Chat</span>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* FAB Menu for Mobile */}
            <DropdownMenu open={isFabMenuOpen} onOpenChange={setIsFabMenuOpen}>
                <DropdownMenuContent className="w-56 mb-20 md:hidden" align="end">
                {permissions.canManageStaff && (
                        <DropdownMenuItem onSelect={() => setIsInviteUserOpen(true)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            <span>Add Team Member</span>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => setIsAssignTaskOpen(true)}>
                        <ListTodo className="mr-2 h-4 w-4" />
                        <span>New Task</span>
                    </DropdownMenuItem>
                    {permissions.canAccessRequisitions && (
                        <DropdownMenuItem onSelect={() => setIsNewRequisitionOpen(true)}>
                            <FileText className="mr-2 h-4 w-4" />
                            <span>New Requisition</span>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => setIsRequestLeaveOpen(true)}>
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        <span>Request Leave</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsNewWorkbookOpen(true)}>
                        <BookOpenCheck className="mr-2 h-4 w-4" />
                        <span>New Workbook</span>
                    </DropdownMenuItem>
                    {permissions.canManageAnnouncements && (
                        <DropdownMenuItem onSelect={() => setIsNewAnnouncementOpen(true)}>
                            <Megaphone className="mr-2 h-4 w-4" />
                            <span>New Announcement</span>
                        </DropdownMenuItem>
                    )}
                    {permissions.canAccessChat && (
                        <DropdownMenuItem onSelect={() => setIsChatOpen(true)}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            <span>New Chat</span>
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <WorkbookDialog
                open={isWorkbookOpen}
                onOpenChange={(isOpen) => {
                    setIsWorkbookOpen(isOpen);
                    if (!isOpen) setInitialWorkbookPayload(undefined);
                }}
                initialPayload={initialWorkbookPayload}
            />
            <RequisitionsDialog
                open={isRequisitionsOpen}
                onOpenChange={(isOpen) => {
                    setIsRequisitionsOpen(isOpen);
                    if (!isOpen) setInitialReqPayload(undefined);
                }}
                initialPayload={initialReqPayload}
            />
            <TasksDialog
                open={isTasksOpen}
                onOpenChange={(isOpen) => {
                    setIsTasksOpen(isOpen);
                    if (!isOpen) setInitialTaskPayload(undefined);
                }}
                initialPayload={initialTaskPayload}
            />
            <AttendanceDialog open={isAttendanceOpen} onOpenChange={setIsAttendanceOpen} />
            <LeaveDialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen} />
            <ReportsDialog open={isReportsOpen} onOpenChange={setIsReportsOpen} />
            <AccountingDialog open={isAccountingOpen} onOpenChange={setIsAccountingOpen} />
            <SuperAdminDialog open={isSuperAdminOpen} onOpenChange={setIsSuperAdminOpen} />
            {userProfile && <ProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} userProfile={userProfile} />}
            {userProfile && <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} userProfile={userProfile} />}
            {userProfile && (
                <ChatDialog
                open={isChatOpen}
                onOpenChange={(isOpen) => {
                    setIsChatOpen(isOpen);
                    if (!isOpen) setInitialChatPayload(undefined);
                }}
                currentUserProfile={userProfile}
                permissions={permissions}
                initialPayload={initialChatPayload}
                />
            )}

            {userProfile && (
                <>
                    <AssignTaskDialog open={isAssignTaskOpen} onOpenChange={setIsAssignTaskOpen} currentUserProfile={userProfile} permissions={permissions} initialData={null} />
                    <NewRequisitionDialog open={isNewRequisitionOpen} onOpenChange={setIsNewRequisitionOpen} userProfile={userProfile} />
                    <RequestLeaveDialog open={isRequestLeaveOpen} onOpenChange={setIsRequestLeaveOpen} userProfile={userProfile} />
                    <NewWorkbookDialog open={isNewWorkbookOpen} onOpenChange={setIsNewWorkbookOpen} userProfile={userProfile} />
                    <InviteUserDialog open={isInviteUserOpen} onOpenChange={setIsInviteUserOpen} currentUserProfile={userProfile} />
                    {permissions.canManageAnnouncements && (
                        <NewAnnouncementDialog 
                            open={isNewAnnouncementOpen}
                            onOpenChange={setIsNewAnnouncementOpen}
                            userProfile={userProfile}
                        />
                    )}
                </>
            )}
        </>
      )}
    </>
  );
}
