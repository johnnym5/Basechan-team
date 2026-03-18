'use client';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, ListTodo, FileText, CalendarPlus, BookOpenCheck, Plus, UserPlus, MessageSquare, Megaphone, Home, CalendarDays, User } from 'lucide-react';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import type { UserProfile, Attendance } from '@/lib/types';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { hexToHslString, cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { BottomNavBar } from '@/components/layout/BottomNavBar';
import AppSidebar from '@/components/layout/AppSidebar';
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


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { theme } = useTheme();
  // Sidebar is always in hover-to-expand mode, so local state for pinning is removed.
  const [isWorkbookOpen, setIsWorkbookOpen] = useState(false);
  const [initialWorkbookPayload, setInitialWorkbookPayload] = useState<{ workbookId?: string; sheetId?: string | null } | undefined>();
  const [isRequisitionsOpen, setIsRequisitionsOpen] = useState(false);
  const [initialReqPayload, setInitialReqPayload] = useState<{ reqId?: string } | undefined>();
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [initialTaskPayload, setInitialTaskPayload] = useState<{ taskId?: string } | undefined>();
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
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

  // When user logs in successfully, close the auth dialog.
  useEffect(() => {
    if (isLoggedIn) {
        setIsAuthDialogOpen(false);
    }
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
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
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
  const { config, isLoading: isConfigLoading } = useSystemConfig(userProfile?.orgId);
  
  useEffect(() => {
    const root = document.documentElement;
    const defaultPrimary = '222 83% 53%';
    const defaultAccent = '217.2 32.6% 17.5%';
    
    if (config?.branding_color) {
      const hslString = hexToHslString(config.branding_color);
      if (hslString) {
        root.style.setProperty('--primary', hslString);
      }
    } else {
      root.style.setProperty('--primary', defaultPrimary);
    }

    if (config?.accent_color) {
      const hslString = hexToHslString(config.accent_color);
      if (hslString) {
        root.style.setProperty('--accent', hslString);
      }
    } else {
      root.style.setProperty('--accent', defaultAccent);
    }

  }, [config, theme]);

  useEffect(() => {
    const openProfile = () => setIsProfileOpen(true);
    const openSettings = () => setIsSettingsOpen(true);
    const openChat = (payload?: { initialUserId?: string }) => {
      if (payload) {
        setInitialChatPayload(payload);
      }
      setIsChatOpen(true);
    };
    const openTasks = (payload?: { taskId?: string }) => {
        if (payload) {
            setInitialTaskPayload(payload);
        }
        setIsTasksOpen(true);
    };
    const openWorkbooks = (payload?: { workbookId?: string; sheetId?: string | null }) => {
      if (payload) {
        setInitialWorkbookPayload(payload);
      }
      setIsWorkbookOpen(true);
    };
    const openRequisitions = (payload?: { reqId?: string }) => {
        if (payload) {
            setInitialReqPayload(payload);
        }
        setIsRequisitionsOpen(true);
    };
    const openAttendance = () => setIsAttendanceOpen(true);
    const openLeave = () => setIsLeaveOpen(true);
    const openReports = () => setIsReportsOpen(true);
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
    uiEmitter.on('open-assign-task-dialog', openAssignTask);
    uiEmitter.on('open-new-requisition-dialog', openNewRequisition);
    uiEmitter.on('open-request-leave-dialog', openRequestLeave);
    uiEmitter.on('open-new-workbook-dialog', openNewWorkbook);
    uiEmitter.on('open-invite-user-dialog', openInviteUser);
    uiEmitter.on('open-new-announcement-dialog', openNewAnnouncement);
    uiEmitter.on('open-superadmin-dialog', openSuperAdmin);
    
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
      uiEmitter.off('open-assign-task-dialog', openAssignTask);
      uiEmitter.off('open-new-requisition-dialog', openNewRequisition);
      uiEmitter.off('open-request-leave-dialog', openRequestLeave);
      uiEmitter.off('open-new-workbook-dialog', openNewWorkbook);
      uiEmitter.off('open-invite-user-dialog', openInviteUser);
      uiEmitter.off('open-new-announcement-dialog', openNewAnnouncement);
      uiEmitter.off('open-superadmin-dialog', openSuperAdmin);
    };
  }, []);

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
            <AppSidebar 
              isMobile={true} 
              isCollapsed={false} 
              isLoggedIn={isLoggedIn}
              isAuthLoading={isUserLoading}
              onSignInClick={() => setIsAuthDialogOpen(true)}
            />
        </SheetContent>
      </Sheet>

      <div className="group/sidebar relative">
        <div className="flex min-h-screen w-full bg-muted/40 md:bg-background">
            <AppSidebar 
              isCollapsed={true}
              isLoggedIn={isLoggedIn}
              isAuthLoading={isUserLoading}
              onSignInClick={() => setIsAuthDialogOpen(true)}
            />
             <div className={cn(
                "flex flex-1 flex-col bg-background transition-all duration-500 ease-in-out",
                isAnyDialogOpen ? "md:scale-[0.97] md:rounded-2xl md:overflow-hidden md:shadow-2xl" : "md:scale-100 rounded-none",
                isMobileSidebarOpen && "scale-90 translate-x-8 rounded-2xl overflow-hidden shadow-2xl"
            )}>
                <AppHeader
                    userProfile={userProfile}
                    onMenuClick={() => setIsMobileSidebarOpen(true)}
                    isLoggedIn={isLoggedIn}
                    attendanceRecord={attendanceRecord}
                    systemConfig={config}
                />
                <main className="flex-1 overflow-y-auto md:p-6 pb-28 md:pb-6">
                    {children}
                </main>
            </div>
            {isLoggedIn && <BottomNavBar onFabClick={() => setIsFabMenuOpen(true)} />}
        </div>
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


            {/* Main Feature Dialogs */}
            <WorkbookDialog
                open={isWorkbookOpen}
                onOpenChange={(isOpen) => {
                setIsWorkbookOpen(isOpen);
                if (!isOpen) {
                    setInitialWorkbookPayload(undefined); // Clear payload on close
                }
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
            <SuperAdminDialog open={isSuperAdminOpen} onOpenChange={setIsSuperAdminOpen} />
            {userProfile && <ProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} userProfile={userProfile} />}
            {userProfile && <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} userProfile={userProfile} />}
            {userProfile && (
                <ChatDialog
                open={isChatOpen}
                onOpenChange={(isOpen) => {
                    setIsChatOpen(isOpen);
                    if (!isOpen) {
                    setInitialChatPayload(undefined); // Clear payload on close
                    }
                }}
                currentUserProfile={userProfile}
                permissions={permissions}
                initialPayload={initialChatPayload}
                />
            )}

            {/* Creation Dialogs */}
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
