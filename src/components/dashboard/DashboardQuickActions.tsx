"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { uiEmitter } from "@/lib/ui-emitter";
import {
  CheckSquare,
  PlusCircle,
  FileText,
  Calendar,
  Star,
  LifeBuoy,
  FilePlus,
  CreditCard,
  MessageSquare,
  BookOpen,
  CheckCircle,
  ShieldAlert,
  Users,
  Settings,
  Activity
} from "lucide-react";

// Import Local Content Components
import { PeerNominationForm } from "@/components/reports/PeerNominationForm";
import { PulseCheckForm } from "@/components/reports/PulseCheckForm";
import { NewRequisitionForm } from "@/components/requisitions/NewRequisitionForm";
import { RequestLeaveForm } from "@/components/leave/RequestLeaveForm";
import { CreateTaskForm } from "@/components/tasks/CreateTaskForm";
import { SubmitDailyReport } from "@/components/reports/SubmitDailyReport";
import { NewAnnouncementForm } from "./NewAnnouncementForm";

/**
 * DashboardQuickActions Component
 * v1.0.4 - Production-Ready Refactor
 * Grouping 15+ actions into a single data-driven grid.
 */

// 1. CONFIGURATION ARRAY
const QUICK_ACTIONS = [
  { id: 'add_task', label: 'Add Task', icon: PlusCircle, type: 'emit', target: 'open-assign-task-dialog', roles: ['ALL'] },
  { id: 'eod_report', label: 'Submit EOD Report', icon: FileText, type: 'modal', target: 'EOD_REPORT', roles: ['ALL'] },
  { id: 'req_leave', label: 'Request Leave', icon: Calendar, type: 'emit', target: 'open-request-leave-dialog', roles: ['ALL'] },
  { id: 'nominate', label: 'Nominate Peer', icon: Star, type: 'modal', target: 'NOMINATE_PEER', roles: ['ALL'] },
  { id: 'it_support', label: 'IT Support', icon: LifeBuoy, type: 'emit', target: 'open-it-support-dialog', roles: ['ALL'] },
  { id: 'new_req', label: 'New Requisition', icon: FilePlus, type: 'emit', target: 'open-new-requisition-dialog', roles: ['ALL'] },
  { id: 'log_expense', label: 'Log Expense', icon: CreditCard, type: 'emit', target: 'open-new-requisition-dialog', roles: ['ALL'] },
  { id: 'chat', label: 'Message', icon: MessageSquare, type: 'emit', target: 'open-chat-dialog', roles: ['ALL'] },
  { id: 'workbooks', label: 'Workbooks', icon: BookOpen, type: 'route', target: '/library', roles: ['ALL'] },
  { id: 'pulse', label: 'Team Pulse', icon: Activity, type: 'modal', target: 'TEAM_PULSE', roles: ['ALL'] },
  // ADMIN ONLY
  { id: 'approve_leaves', label: 'Approve Leaves', icon: CheckCircle, type: 'route', target: '/staff/leave', roles: ['ADMIN', 'SUPERADMIN'] },
  { id: 'announce', label: 'Announce', icon: ShieldAlert, type: 'emit', target: 'open-new-announcement-dialog', roles: ['ADMIN', 'SUPERADMIN'] },
  { id: 'directory', label: 'Staff Directory', icon: Users, type: 'emit', target: 'open-staff-directory-dialog', roles: ['ADMIN', 'SUPERADMIN'] },
  { id: 'master_console', label: 'Master Console', icon: Settings, type: 'route', target: '/settings', roles: ['SUPERADMIN'] },
] as const;

export function DashboardQuickActions() {
  const router = useRouter();
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() =>
    authUser ? doc(firestore!, "users", authUser.uid) : null,
    [firestore, authUser]
  );
  const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);

  // Fetch Staff List for Nominations
  const staffQuery = useMemoFirebase(() =>
    firestore && userProfile ? query(collection(firestore, 'users'), where('orgId', '==', userProfile.orgId)) : null
  , [firestore, userProfile]);
  const { data: rawStaff } = useCollection<UserProfile>(staffQuery);

  const staffList = useMemo(() =>
    rawStaff?.filter(s => s.id !== authUser?.uid).map(s => ({ id: s.id, name: s.fullName })) || []
  , [rawStaff, authUser?.uid]);

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-2xl" />;
  }

  // 2. RBAC FILTERING
  const visibleActions = QUICK_ACTIONS.filter(action => {
    const roles = action.roles as readonly string[];
    if (roles.includes('ALL')) return true;
    if (!userProfile?.role) return false;

    const userRole = userProfile.role;

    if (roles.includes(userRole)) return true;

    // Abstracted 'ADMIN' role check for broader management roles
    if (roles.includes('ADMIN') &&
        ['ORG_ADMIN', 'MANAGING_DIRECTOR', 'HR_MANAGER', 'FINANCE_MANAGER'].includes(userRole)) {
      return true;
    }

    return false;
  });

  const handleActionClick = (action: typeof QUICK_ACTIONS[number]) => {
    if (action.type === 'route') {
      router.push(action.target);
    } else if (action.type === 'emit') {
      uiEmitter.emit(action.target as any);
    } else {
      setActiveModal(action.target);
    }
  };

  const handleNominationSubmit = async (payload: any) => {
    if (!firestore) return;
    try {
        const nominationBatch = payload.nominations.map((nom: any) => ({
            ...nom,
            orgId: userProfile?.orgId,
            nominatorId: payload.nominatorId,
            nominatorName: payload.nominatorName,
            timestamp: payload.date,
            status: 'PENDING',
            additionalNotes: payload.additionalNotes
        }));

        const { addDocumentNonBlocking } = await import('@/firebase');
        for (const nomination of nominationBatch) {
            await addDocumentNonBlocking(collection(firestore, 'nominations'), nomination);
        }

        toast({ title: "Nominations Submitted", description: "Thank you for recognizing your teammates!" });
        setActiveModal(null);
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Submission Failed", description: e.message });
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-6 shadow-sm">
      <h3 className="text-[10px] font-black uppercase mb-4 text-muted-foreground tracking-[0.25em]">Quick Actions</h3>

      {/* 3. BUTTON GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className="flex items-center gap-3 p-3 text-[10px] font-black uppercase tracking-tight border border-border rounded-lg hover:bg-secondary hover:border-primary/50 transition-all text-left group"
            >
              <Icon className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
              <span className="truncate">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. MODAL RENDERING ENGINE */}
      <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border rounded-[2.5rem] max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-xs font-black uppercase tracking-widest text-primary">
              {QUICK_ACTIONS.find(a => (a as any).target === activeModal)?.label || "Action"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-6">
            {/* Modal Injection Points - NO PLACEHOLDERS ALLOWED */}
            {activeModal === 'CREATE_TASK' && userProfile && (
                <CreateTaskForm
                    currentUserProfile={userProfile}
                    permissions={permissions}
                    onSuccess={() => setActiveModal(null)}
                />
            )}
            {activeModal === 'EOD_REPORT' && userProfile && (
                <SubmitDailyReport userProfile={userProfile} onSuccess={() => setActiveModal(null)} />
            )}
            {activeModal === 'REQUEST_LEAVE' && userProfile && (
                <RequestLeaveForm userProfile={userProfile} onSuccess={() => setActiveModal(null)} />
            )}
            {activeModal === 'NOMINATE_PEER' && (
                <PeerNominationForm staffList={staffList} onSubmit={handleNominationSubmit} />
            )}
            {activeModal === 'ANNOUNCE' && userProfile && (
                <NewAnnouncementForm userProfile={userProfile} onSuccess={() => setActiveModal(null)} />
            )}
            {(activeModal === 'NEW_REQUISITION' || activeModal === 'LOG_EXPENSE' || activeModal === 'IT_SUPPORT') && userProfile && (
                <NewRequisitionForm userProfile={userProfile} onSuccess={() => setActiveModal(null)} />
            )}
             {activeModal === 'TEAM_PULSE' && userProfile && (
                <PulseCheckForm userProfile={userProfile} onSuccess={() => setActiveModal(null)} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
