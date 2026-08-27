"use client"

import React, { useState, Suspense } from "react"
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ShieldAlert } from 'lucide-react';
import { SettingsSidebar, type SettingsSection } from './SettingsSidebar';
import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";

// Pane Imports
import { OperationsSettingsPane } from "./panes/OperationsSettingsPane";
import { SystemListsPane } from "./panes/SystemListsPane";
import { GeneralSettingsPane } from "./panes/GeneralSettingsPane";
import { SecuritySettingsPane } from "./panes/SecuritySettingsPane";
import { IntegrationsPane } from "./panes/IntegrationsPane";
import { CompliancePane } from "./panes/CompliancePane";

export function AdminConsoleLayout() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const { isSuperAdmin } = useSuperAdmin();
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  const userProfileRef = useMemoFirebase(() =>
    firestore && authUser ? doc(firestore, 'users', authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile || null);

  if (isProfileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // RBAC Check: Ensure only Administrators can access this console
  const isAdmin = userProfile?.role === 'ORG_ADMIN' ||
                  userProfile?.role === 'MANAGING_DIRECTOR' ||
                  userProfile?.role === 'HR_MANAGER' ||
                  permissions.canManageCompany ||
                  isSuperAdmin;

  if (!isProfileLoading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 grayscale opacity-50">
        <div className="p-6 rounded-full bg-destructive/10 mb-4">
          <ShieldAlert className="h-16 w-16 text-destructive" />
        </div>
        <h1 className="text-3xl font-black font-headline uppercase tracking-tighter text-foreground">Restricted Access</h1>
        <p className="text-muted-foreground mt-2 max-w-md uppercase text-[10px] font-bold tracking-widest opacity-60 leading-relaxed">
          You need Administrator privileges to view this page. Your current authorization tier does not permit access to this secure configuration node.
        </p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'operations':
        return <OperationsSettingsPane userProfile={userProfile!} />;
      case 'security':
        return <SecuritySettingsPane />;
      case 'workflows':
      case 'finance':
        return <div className="flex flex-col items-center justify-center h-full opacity-30 grayscale py-32"><Loader2 className="h-12 w-12 animate-spin mb-4" /><p className="font-black uppercase tracking-widest text-xs">Policy Engine Syncing...</p></div>;
      case 'communications':
        return <IntegrationsPane />;
      case 'system-lists':
        return <SystemListsPane userProfile={userProfile!} />;
      default:
        return <GeneralSettingsPane />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full animate-in fade-in duration-500 bg-background overflow-y-auto custom-scrollbar">
      <div className="max-w-[1600px] mx-auto w-full px-6 md:px-10 py-10">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-8 mb-10">
            <div>
                <h1 className="text-3xl font-black font-headline uppercase tracking-tighter text-white">System Settings</h1>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60 mt-1">System Settings</p>
            </div>
            <div className="flex items-center gap-4">
            </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start relative">
            {/* LEFT: STICKY CAPSULE SIDEBAR */}
            <aside className="lg:col-span-3 sticky top-10 h-fit max-h-[calc(100vh-8rem)]">
                <SettingsSidebar
                    activeSection={activeSection}
                    onSectionChange={setActiveSection}
                />
            </aside>

            {/* RIGHT: CONTENT AREA */}
            <main className="lg:col-span-9 space-y-10 pb-32">
                <Suspense fallback={
                    <div className="space-y-8">
                        <Skeleton className="h-12 w-1/3 rounded-2xl" />
                        <Skeleton className="h-64 w-full rounded-[2.5rem]" />
                    </div>
                }>
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {renderContent()}
                    </div>
                </Suspense>
            </main>
        </div>
      </div>
    </div>
  );
}
