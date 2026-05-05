'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { uiEmitter } from '@/lib/ui-emitter';
import type { UserProfile, Permissions } from '@/lib/types';
import { ListTodo, FileText, CalendarPlus, BookOpenCheck, MessageSquare, Megaphone, UserPlus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

// Dynamically import heavy dialog components
const WorkbookDialog = dynamic(() => import('@/components/workbook/WorkbookDialog').then(m => m.WorkbookDialog), { ssr: false });
const RequisitionsDialog = dynamic(() => import('@/components/requisitions/RequisitionsDialog').then(m => m.RequisitionsDialog), { ssr: false });
const TasksDialog = dynamic(() => import('@/components/tasks/TasksDialog').then(m => m.TasksDialog), { ssr: false });
const AttendanceDialog = dynamic(() => import('@/components/attendance/AttendanceDialog').then(m => m.AttendanceDialog), { ssr: false });
const LeaveDialog = dynamic(() => import('@/components/leave/LeaveDialog').then(m => m.LeaveDialog), { ssr: false });
const ReportsDialog = dynamic(() => import('@/components/reports/ReportsDialog').then(m => m.ReportsDialog), { ssr: false });
const AccountingDialog = dynamic(() => import('@/components/accounting/AccountingDialog').then(m => m.AccountingDialog), { ssr: false });
const LibraryDialog = dynamic(() => import('@/components/library/LibraryDialog').then(m => m.LibraryDialog), { ssr: false });
const AssignTaskDialog = dynamic(() => import('@/components/tasks/AssignTaskDialog').then(m => m.AssignTaskDialog), { ssr: false });
const NewRequisitionDialog = dynamic(() => import('@/components/requisitions/NewRequisitionDialog').then(m => m.NewRequisitionDialog), { ssr: false });
const RequestLeaveDialog = dynamic(() => import('@/components/leave/RequestLeaveDialog').then(m => m.RequestLeaveDialog), { ssr: false });
const NewWorkbookDialog = dynamic(() => import('@/components/workbook/NewWorkbookDialog').then(m => m.NewWorkbookDialog), { ssr: false });
const ProfileDialog = dynamic(() => import('@/components/profile/ProfileDialog').then(m => m.ProfileDialog), { ssr: false });
const SettingsDialog = dynamic(() => import('@/components/settings/SettingsDialog').then(m => m.SettingsDialog), { ssr: false });
const ChatDialog = dynamic(() => import('@/components/chat/ChatDialog').then(m => m.ChatDialog), { ssr: false });
const InviteUserDialog = dynamic(() => import('@/components/settings/InviteUserDialog').then(m => m.InviteUserDialog), { ssr: false });
const NewAnnouncementDialog = dynamic(() => import('@/components/dashboard/NewAnnouncementDialog').then(m => m.NewAnnouncementDialog), { ssr: false });
const SuperAdminDialog = dynamic(() => import('@/components/superadmin/SuperAdminDialog').then(m => m.SuperAdminDialog), { ssr: false });

interface GlobalDialogsProps {
  userProfile: UserProfile;
  permissions: Permissions;
  onAnyDialogOpenChange: (isOpen: boolean) => void;
}

export function GlobalDialogs({ userProfile, permissions, onAnyDialogOpenChange }: GlobalDialogsProps) {
  const [isWorkbookOpen, setIsWorkbookOpen] = useState(false);
  const [initialWorkbookPayload, setInitialWorkbookPayload] = useState<{ workbookId?: string; sheetId?: string | null } | undefined>();
  const [isRequisitionsOpen, setIsRequisitionsOpen] = useState(false);
  const [initialReqPayload, setInitialReqPayload] = useState<{ reqId?: string } | undefined>();
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [initialTaskPayload, setInitialTaskPayload] = useState<{ taskId?: string } | undefined>();
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [initialReportsPayload, setInitialReportsPayload] = useState<{ tab?: string } | undefined>();
  const [isAccountingOpen, setIsAccountingOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [isNewRequisitionOpen, setIsNewRequisitionOpen] = useState(false);
  const [isRequestLeaveOpen, setIsRequestLeaveOpen] = useState(false);
  const [isNewWorkbookOpen, setIsNewWorkbookOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialChatPayload, setInitialChatPayload] = useState<{ initialUserId?: string; chatId?: string } | undefined>();
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [isNewAnnouncementOpen, setIsNewAnnouncementOpen] = useState(false);
  const [isSuperAdminOpen, setIsSuperAdminOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  const closeAllDialogs = useCallback(() => {
    setIsWorkbookOpen(false);
    setIsRequisitionsOpen(false);
    setIsTasksOpen(false);
    setIsAttendanceOpen(false);
    setIsLeaveOpen(false);
    setIsReportsOpen(false);
    setIsAccountingOpen(false);
    setIsLibraryOpen(false);
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
    const isOpen = 
        isWorkbookOpen || isRequisitionsOpen || isTasksOpen || isAttendanceOpen || 
        isLeaveOpen || isReportsOpen || isAccountingOpen || isLibraryOpen || 
        isAssignTaskOpen || isNewRequisitionOpen || isRequestLeaveOpen || 
        isNewWorkbookOpen || isProfileOpen || isSettingsOpen || isChatOpen || 
        isInviteUserOpen || isNewAnnouncementOpen || isSuperAdminOpen;
    onAnyDialogOpenChange(isOpen);
  }, [
    isWorkbookOpen, isRequisitionsOpen, isTasksOpen, isAttendanceOpen, 
    isLeaveOpen, isReportsOpen, isAccountingOpen, isLibraryOpen, 
    isAssignTaskOpen, isNewRequisitionOpen, isRequestLeaveOpen, 
    isNewWorkbookOpen, isProfileOpen, isSettingsOpen, isChatOpen, 
    isInviteUserOpen, isNewAnnouncementOpen, isSuperAdminOpen,
    onAnyDialogOpenChange
  ]);

  useEffect(() => {
    const openProfile = () => setIsProfileOpen(true);
    const openSettings = () => setIsSettingsOpen(true);
    const openChat = (payload?: any) => {
      if (payload) setInitialChatPayload(payload);
      setIsChatOpen(true);
    };
    const openTasks = (payload?: any) => {
        if (payload) setInitialTaskPayload(payload);
        setIsTasksOpen(true);
    };
    const openWorkbooks = (payload?: any) => {
      if (payload) setInitialWorkbookPayload(payload);
      setIsWorkbookOpen(true);
    };
    const openRequisitions = (payload?: any) => {
        if (payload) setInitialReqPayload(payload);
        setIsRequisitionsOpen(true);
    };
    const openAttendance = () => setIsAttendanceOpen(true);
    const openLeave = () => setIsLeaveOpen(true);
    const openReports = (payload?: any) => {
        if (payload) setInitialReportsPayload(payload);
        setIsReportsOpen(true);
    };
    const openAccounting = () => setIsAccountingOpen(true);
    const openLibrary = () => setIsLibraryOpen(true);
    const openAssignTask = () => setIsAssignTaskOpen(true);
    const openNewRequisition = () => setIsNewRequisitionOpen(true);
    const openRequestLeave = () => setIsRequestLeaveOpen(true);
    const openNewWorkbook = () => setIsNewWorkbookOpen(true);
    const openInviteUser = () => setIsInviteUserOpen(true);
    const openNewAnnouncement = () => setIsNewAnnouncementOpen(true);
    const openSuperAdmin = () => setIsSuperAdminOpen(true);
    const openFabMenu = () => setIsFabMenuOpen(true);

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
    uiEmitter.on('open-library-dialog', openLibrary);
    uiEmitter.on('open-assign-task-dialog', openAssignTask);
    uiEmitter.on('open-new-requisition-dialog', openNewRequisition);
    uiEmitter.on('open-request-leave-dialog', openRequestLeave);
    uiEmitter.on('open-new-workbook-dialog', openNewWorkbook);
    uiEmitter.on('open-invite-user-dialog', openInviteUser);
    uiEmitter.on('open-new-announcement-dialog', openNewAnnouncement);
    uiEmitter.on('open-superadmin-dialog', openSuperAdmin);
    uiEmitter.on('open-fab-menu' as any, openFabMenu);
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
      uiEmitter.off('open-library-dialog', openLibrary);
      uiEmitter.off('open-assign-task-dialog', openAssignTask);
      uiEmitter.off('open-new-requisition-dialog', openNewRequisition);
      uiEmitter.off('open-request-leave-dialog', openRequestLeave);
      uiEmitter.off('open-new-workbook-dialog', openNewWorkbook);
      uiEmitter.off('open-invite-user-dialog', openInviteUser);
      uiEmitter.off('open-new-announcement-dialog', openNewAnnouncement);
      uiEmitter.off('open-superadmin-dialog', openSuperAdmin);
      uiEmitter.off('open-fab-menu' as any, openFabMenu);
      uiEmitter.off('close-all-dialogs', closeAllDialogs);
    };
  }, [closeAllDialogs]);

  return (
    <>
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

      {isWorkbookOpen && (
        <WorkbookDialog
            open={isWorkbookOpen}
            onOpenChange={(isOpen) => {
                setIsWorkbookOpen(isOpen);
                if (!isOpen) setInitialWorkbookPayload(undefined);
            }}
            initialPayload={initialWorkbookPayload}
        />
      )}
      {isRequisitionsOpen && (
        <RequisitionsDialog
            open={isRequisitionsOpen}
            onOpenChange={(isOpen) => {
                setIsRequisitionsOpen(isOpen);
                if (!isOpen) setInitialReqPayload(undefined);
            }}
            initialPayload={initialReqPayload}
        />
      )}
      {isTasksOpen && (
        <TasksDialog
            open={isTasksOpen}
            onOpenChange={(isOpen) => {
                setIsTasksOpen(isOpen);
                if (!isOpen) setInitialTaskPayload(undefined);
            }}
            initialPayload={initialTaskPayload}
        />
      )}
      {isAttendanceOpen && <AttendanceDialog open={isAttendanceOpen} onOpenChange={setIsAttendanceOpen} />}
      {isLeaveOpen && <LeaveDialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen} />}
      {isReportsOpen && (
        <ReportsDialog
            open={isReportsOpen}
            onOpenChange={(isOpen) => {
                setIsReportsOpen(isOpen);
                if (!isOpen) setInitialReportsPayload(undefined);
            }}
            initialPayload={initialReportsPayload}
        />
      )}
      {isAccountingOpen && <AccountingDialog open={isAccountingOpen} onOpenChange={setIsAccountingOpen} />}
      {isLibraryOpen && <LibraryDialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen} />}
      {isSuperAdminOpen && <SuperAdminDialog open={isSuperAdminOpen} onOpenChange={setIsSuperAdminOpen} />}
      
      {isProfileOpen && <ProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} userProfile={userProfile} />}
      {isSettingsOpen && <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} userProfile={userProfile} />}
      {isChatOpen && (
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

      {isAssignTaskOpen && <AssignTaskDialog open={isAssignTaskOpen} onOpenChange={setIsAssignTaskOpen} currentUserProfile={userProfile} permissions={permissions} initialData={null} />}
      {isNewRequisitionOpen && <NewRequisitionDialog open={isNewRequisitionOpen} onOpenChange={setIsNewRequisitionOpen} userProfile={userProfile} />}
      {isRequestLeaveOpen && <RequestLeaveDialog open={isRequestLeaveOpen} onOpenChange={setIsRequestLeaveOpen} userProfile={userProfile} />}
      {isNewWorkbookOpen && <NewWorkbookDialog open={isNewWorkbookOpen} onOpenChange={setIsNewWorkbookOpen} userProfile={userProfile} />}
      {isInviteUserOpen && <InviteUserDialog open={isInviteUserOpen} onOpenChange={setIsInviteUserOpen} currentUserProfile={userProfile} />}
      {permissions.canManageAnnouncements && isNewAnnouncementOpen && (
          <NewAnnouncementDialog 
              open={isNewAnnouncementOpen}
              onOpenChange={setIsNewAnnouncementOpen}
              userProfile={userProfile}
          />
      )}
    </>
  );
}
