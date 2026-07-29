'use client';

import { useState, Suspense } from 'react';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsSidebar, type SettingsSection } from '@/components/settings/SettingsSidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldAlert, Loader2 } from 'lucide-react';

// Form Component Imports (to be created)
import { GeneralSettingsForm } from '@/components/settings/forms/GeneralSettingsForm';
import { SecuritySettingsForm } from '@/components/settings/forms/SecuritySettingsForm';
import { NotificationSettingsForm } from '@/components/settings/forms/NotificationSettingsForm';
import { WorkflowSettingsForm } from '@/components/settings/forms/WorkflowSettingsForm';
import { DataExportCard } from '@/components/settings/forms/DataExportCard';

export default function AdminSettingsPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
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

  // RBAC Check
  if (!permissions.canManageCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="p-4 rounded-full bg-destructive/10 mb-4">
          <ShieldAlert className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-black font-headline uppercase tracking-tighter">Access Forbidden</h1>
        <p className="text-muted-foreground mt-2 max-w-md uppercase text-[10px] font-bold tracking-widest opacity-60">
          This secure infrastructure node requires ORG_ADMIN clearance. Your current interaction tier is restricted.
        </p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return <GeneralSettingsForm orgId={userProfile?.orgId} />;
      case 'security':
        return <SecuritySettingsForm orgId={userProfile?.orgId} />;
      case 'notifications':
        return <NotificationSettingsForm orgId={userProfile?.orgId} />;
      case 'workflows':
        return <WorkflowSettingsForm orgId={userProfile?.orgId} />;
      case 'data':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-black font-headline tracking-tighter uppercase">Data & Compliance</h3>
            <DataExportCard orgId={userProfile?.orgId} />
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full opacity-30 grayscale py-20">
            <Loader2 className="h-12 w-12 animate-spin mb-4" />
            <p className="font-black uppercase tracking-widest text-xs">Module Under Construction</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden animate-in fade-in duration-500">
      {/* Vertical Sidebar */}
      <aside className="w-80 h-full border-r border-white/5 bg-white/5 backdrop-blur-xl shrink-0">
        <SettingsSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full flex flex-col min-w-0">
        <header className="h-20 border-b border-white/5 flex items-center px-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Operational Status: Optimized</span>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="max-w-5xl mx-auto p-10 pb-32">
            <Suspense fallback={
              <div className="space-y-8">
                <Skeleton className="h-12 w-1/3 rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-[2.5rem]" />
              </div>
            }>
              {renderContent()}
            </Suspense>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
