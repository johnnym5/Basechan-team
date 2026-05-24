
'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { uiEmitter } from '@/lib/ui-emitter';
import type { UserProfile, Permissions } from '@/lib/types';

// Dynamically import heavy dialog components
const WorkbookDialog = dynamic(() => import('@/components/workbook/WorkbookDialog').then(m => m.WorkbookDialog), { ssr: false });
const RequisitionsDialog = dynamic(() => import('@/components/requisitions/RequisitionsDialog').then(m => m.RequisitionsDialog), { ssr: false });
const TasksDialog = dynamic(() => import('@/components/tasks/TasksDialog').then(m => m.TasksDialog), { ssr: false });
const AttendanceDialog = dynamic(() => import('@/components/attendance/AttendanceDialog').then(m => m.AttendanceDialog), { ssr: false });
const LeaveDialog = dynamic(() => import('@/components/leave/LeaveDialog').then(m => m.LeaveDialog), { ssr: false });
const ReportsDialog = dynamic(() => import('@/components/reports/ReportsDialog').then(m => m.ReportsDialog), { ssr: false });
const AccountingDialog = dynamic(() => import('@/components/accounting/AccountingDialog').then(m => m.AccountingDialog), { ssr: false });
const LibraryDialog = dynamic(() => import('@/components/library/LibraryDialog').then(m => m.LibraryDialog), { ssr: false });
const DisplaysDialog = dynamic(() => import('@/components/dashboards/WebDashboardDialog').then(m => m.WebDashboardDialog), { ssr: false });
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
const NotificationsDialog = dynamic(() => import('@/components/layout/NotificationsDialog').then(m => m.NotificationsDialog), { ssr: false });
const CreateChannelDialog = dynamic(() => import('@/components/chat/CreateChannelDialog').then(m => m.CreateChannelDialog), { ssr: false });
const LiveMonitorDialog = dynamic(() => import('@/components/superadmin/LiveMonitorDialog').then(m => m.LiveMonitorDialog), { ssr: false });

interface GlobalDialogsProps {
  userProfile: UserProfile | null;
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
  const [isDisplaysOpen, setIsDisplaysOpen] = useState(false);
  const [initialDisplaysPayload, setInitialDisplaysPayload] = useState<{ displayId?: string } | undefined>();
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [isNewRequisitionOpen, setIsNewRequisitionOpen] = useState(false);
  const [isRequestLeaveOpen, setIsRequestLeaveOpen] = useState(false);
  const [isNewWorkbookOpen, setIsNewWorkbookOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialChatPayload, setInitialChatPayload] = useState<{ initialUserId?: string; chatId?: string } | undefined>();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isNewAnnouncementOpen, setIsNewAnnouncementOpen] = useState(false);
  const [isSuperAdminOpen, setIsSuperAdminOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isLiveMonitorOpen, setIsLiveMonitorOpen] = useState(false);
  const [liveMonitorPayload, setLiveMonitorPayload] = useState<{ targetUserId: string; targetUserName: string } | null>(null);

  const closeAllDialogs = useCallback(() => {
    setIsWorkbookOpen(false);
    setIsRequisitionsOpen(false);
    setIsTasksOpen(false);
    setIsAttendanceOpen(false);
    setIsLeaveOpen(false);
    setIsReportsOpen(false);
    setIsAccountingOpen(false);
    setIsLibraryOpen(false);
    setIsDisplaysOpen(false);
    setIsAssignTaskOpen(false);
    setIsNewRequisitionOpen(false);
    setIsRequestLeaveOpen(false);
    setIsNewWorkbookOpen(false);
    setIsProfileOpen(false);
    setIsSettingsOpen(false);
    setIsChatOpen(false);
    setIsInviteOpen(false);
    setIsNewAnnouncementOpen(false);
    setIsSuperAdminOpen(false);
    setIsNotificationsOpen(false);
    setIsCreateChannelOpen(false);
    setIsLiveMonitorOpen(false);
  }, []);

  useEffect(() => {
    const isOpen = 
        isWorkbookOpen || isRequisitionsOpen || isTasksOpen || isAttendanceOpen || 
        isLeaveOpen || isReportsOpen || isAccountingOpen || isLibraryOpen || isDisplaysOpen || 
        isAssignTaskOpen || isNewRequisitionOpen || isRequestLeaveOpen || 
        isNewWorkbookOpen || isProfileOpen || isSettingsOpen || isChatOpen || 
        isInviteOpen || isNewAnnouncementOpen || isSuperAdminOpen || isNotificationsOpen ||
        isCreateChannelOpen || isLiveMonitorOpen;
    onAnyDialogOpenChange(isOpen);
  }, [
    isWorkbookOpen, isRequisitionsOpen, isTasksOpen, isAttendanceOpen, 
    isLeaveOpen, isReportsOpen, isAccountingOpen, isLibraryOpen, isDisplaysOpen, 
    isAssignTaskOpen, isNewRequisitionOpen, isRequestLeaveOpen, 
    isNewWorkbookOpen, isProfileOpen, isSettingsOpen, isChatOpen, 
    isInviteOpen, isNewAnnouncementOpen, isSuperAdminOpen, isNotificationsOpen,
    isCreateChannelOpen, isLiveMonitorOpen,
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
    const openDisplays = (payload?: any) => {
        if (payload) setInitialDisplaysPayload(payload);
        setIsDisplaysOpen(true);
    };
    const openAssignTask = () => setIsAssignTaskOpen(true);
    const openNewRequisition = () => setIsNewRequisitionOpen(true);
    const openRequestLeave = () => setIsRequestLeaveOpen(true);
    const openNewWorkbook = () => setIsNewWorkbookOpen(true);
    const openInviteUser = () => setIsInviteOpen(true);
    const openNewAnnouncement = () => setIsNewAnnouncementOpen(true);
    const openSuperAdmin = () => setIsSuperAdminOpen(true);
    const openNotifications = () => setIsNotificationsOpen(true);
    const openCreateChannel = () => setIsCreateChannelOpen(true);
    const openLiveMonitor = (payload: any) => {
        setLiveMonitorPayload(payload);
        setIsLiveMonitorOpen(true);
    };

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
    uiEmitter.on('open-displays-dialog', openDisplays);
    uiEmitter.on('open-assign-task-dialog', openAssignTask);
    uiEmitter.on('open-new-requisition-dialog', openNewRequisition);
    uiEmitter.on('open-request-leave-dialog', openRequestLeave);
    uiEmitter.on('open-new-workbook-dialog', openNewWorkbook);
    uiEmitter.on('open-invite-user-dialog', openInviteUser);
    uiEmitter.on('open-new-announcement-dialog', openNewAnnouncement);
    uiEmitter.on('open-superadmin-dialog', openSuperAdmin);
    uiEmitter.on('open-notifications-dialog', openNotifications);
    uiEmitter.on('open-create-channel-dialog', openCreateChannel);
    uiEmitter.on('open-live-monitor-dialog', openLiveMonitor);
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
      uiEmitter.off('open-displays-dialog', openDisplays);
      uiEmitter.off('open-assign-task-dialog', openAssignTask);
      uiEmitter.off('open-new-requisition-dialog', openNewRequisition);
      uiEmitter.off('open-request-leave-dialog', openRequestLeave);
      uiEmitter.off('open-new-workbook-dialog', openNewWorkbook);
      uiEmitter.off('open-invite-user-dialog', openInviteUser);
      uiEmitter.off('open-new-announcement-dialog', openNewAnnouncement);
      uiEmitter.off('open-superadmin-dialog', openSuperAdmin);
      uiEmitter.off('open-notifications-dialog', openNotifications);
      uiEmitter.off('open-create-channel-dialog', openCreateChannel);
      uiEmitter.off('open-live-monitor-dialog', openLiveMonitor);
      uiEmitter.off('close-all-dialogs', closeAllDialogs);
    };
  }, [closeAllDialogs]);

  return (
    <>
      <WorkbookDialog
          open={isWorkbookOpen}
          onOpenChange={(isOpen) => {
              setIsWorkbookOpen(isOpen);
              if (!isOpen) setInitialWorkbookPayload(undefined);
          }}
          initialPayload={initialWorkbookPayload}
          modal={false}
      />
      <RequisitionsDialog
          open={isRequisitionsOpen}
          onOpenChange={(isOpen) => {
              setIsRequisitionsOpen(isOpen);
              if (!isOpen) setInitialReqPayload(undefined);
          }}
          initialPayload={initialReqPayload}
          modal={false}
      />
      <TasksDialog
          open={isTasksOpen}
          onOpenChange={(isOpen) => {
              setIsTasksOpen(isOpen);
              if (!isOpen) setInitialTaskPayload(undefined);
          }}
          initialPayload={initialTaskPayload}
          userProfile={userProfile}
          permissions={permissions}
          modal={false}
      />
      <AttendanceDialog open={isAttendanceOpen} onOpenChange={setIsAttendanceOpen} modal={false} />
      <LeaveDialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen} modal={false} />
      <ReportsDialog
          open={isReportsOpen}
          onOpenChange={(isOpen) => {
              setIsReportsOpen(isOpen);
              if (!isOpen) setInitialReportsPayload(undefined);
          }}
          initialPayload={initialReportsPayload}
          modal={false}
      />
      <AccountingDialog open={isAccountingOpen} onOpenChange={setIsAccountingOpen} modal={false} />
      <LibraryDialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen} modal={false} />
      <DisplaysDialog 
        open={isDisplaysOpen} 
        onOpenChange={(isOpen) => {
            setIsDisplaysOpen(isOpen);
            if (!isOpen) setInitialDisplaysPayload(undefined);
        }} 
        initialPayload={initialDisplaysPayload}
        modal={false}
      />
      <SuperAdminDialog open={isSuperAdminOpen} onOpenChange={setIsSuperAdminOpen} modal={false} />
      
      {isProfileOpen && userProfile && (
        <ProfileDialog 
          open={isProfileOpen} 
          onOpenChange={setIsProfileOpen} 
          userProfile={userProfile} 
          modal={false}
        />
      )}
      {isSettingsOpen && userProfile && (
        <SettingsDialog 
          open={isSettingsOpen} 
          onOpenChange={setIsSettingsOpen} 
          userProfile={userProfile} 
          modal={false}
        />
      )}
      {isChatOpen && userProfile && (
          <ChatDialog
            open={isChatOpen}
            onOpenChange={(isOpen) => {
                setIsChatOpen(isOpen);
                if (!isOpen) setInitialChatPayload(undefined);
            }}
            currentUserProfile={userProfile}
            permissions={permissions}
            initialPayload={initialChatPayload}
            modal={false}
          />
      )}

      {isNotificationsOpen && userProfile && (
          <NotificationsDialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen} userProfile={userProfile} />
      )}

      {isAssignTaskOpen && userProfile && <AssignTaskDialog open={isAssignTaskOpen} onOpenChange={setIsAssignTaskOpen} currentUserProfile={userProfile} permissions={permissions} initialData={null} />}
      {isNewRequisitionOpen && userProfile && <NewRequisitionDialog open={isNewRequisitionOpen} onOpenChange={setIsNewRequisitionOpen} userProfile={userProfile} />}
      {isRequestLeaveOpen && userProfile && <RequestLeaveDialog open={isRequestLeaveOpen} onOpenChange={setIsRequestLeaveOpen} userProfile={userProfile} />}
      {isNewWorkbookOpen && userProfile && <NewWorkbookDialog open={isNewWorkbookOpen} onOpenChange={setIsNewWorkbookOpen} userProfile={userProfile} />}
      {isInviteOpen && userProfile && <InviteUserDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} currentUserProfile={userProfile} />}
      {permissions.canManageAnnouncements && isNewAnnouncementOpen && userProfile && (
          <NewAnnouncementDialog 
              open={isNewAnnouncementOpen}
              onOpenChange={setIsNewAnnouncementOpen}
              userProfile={userProfile}
          />
      )}
      {isCreateChannelOpen && userProfile && (
          <CreateChannelDialog 
              open={isCreateChannelOpen} 
              onOpenChange={setIsCreateChannelOpen} 
              currentUserProfile={userProfile} 
          />
      )}
      {isLiveMonitorOpen && liveMonitorPayload && (
          <LiveMonitorDialog
            open={isLiveMonitorOpen}
            onOpenChange={setIsLiveMonitorOpen}
            targetUserId={liveMonitorPayload.targetUserId}
            targetUserName={liveMonitorPayload.targetUserName}
          />
      )}
    </>
  );
}
