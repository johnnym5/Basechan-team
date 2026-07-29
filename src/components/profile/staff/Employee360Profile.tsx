'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEmployee360 } from '@/hooks/useEmployee360';
import { Skeleton } from '@/components/ui/skeleton';
import { StaffProfileView } from './StaffProfileView';
import { ActivityTimeline } from './ActivityTimeline';
import { UserAccessEditor } from '@/components/settings/security/UserAccessEditor';
import { Button } from '@/components/ui/button';
import { ChevronLeft, LayoutDashboard, History, ShieldCheck, User } from 'lucide-react';
import type { Permissions } from '@/hooks/usePermissions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Employee360ProfileProps {
  userId: string;
  orgId: string;
  currentUserProfile: any;
  permissions: Permissions;
  onBack?: () => void;
}

export function Employee360Profile({
  userId,
  orgId,
  currentUserProfile,
  permissions,
  onBack
}: Employee360ProfileProps) {
  const { data, isLoading } = useEmployee360(userId, orgId);
  const [activeTab, setActiveTab] = useState('profile');

  const isOwnProfile = currentUserProfile?.id === userId;
  const isAdmin = permissions.canManageStaff;

  if (isLoading) return <Skeleton className="h-[600px] w-full rounded-[2.5rem]" />;
  if (!data?.profile) return <div className="p-20 text-center uppercase font-black opacity-20">Profile Not Found</div>;

  const { profile, attendance, tasks } = data;

  // PEER VIEW LOGIC: Standard staff viewing another member
  if (!isOwnProfile && !isAdmin) {
    return (
      <div className="space-y-8">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="rounded-full gap-2 px-4 hover:bg-white/5">
             <ChevronLeft className="h-4 w-4" /> Personnel Directory
          </Button>
        )}
        <div className="bg-card/20 p-8 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row items-center gap-8">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 rounded-[2.5rem] border-4 border-white/5 shadow-2xl">
            <AvatarImage src={profile.avatarUrl || ''} />
            <AvatarFallback className="text-4xl font-black bg-secondary">{profile.fullName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="text-center md:text-left space-y-4">
            <div>
              <h1 className="text-4xl font-black font-headline tracking-tighter">{profile.fullName}</h1>
              <p className="text-lg font-bold text-primary tracking-tight">{profile.jobTitle || 'Staff Member'}</p>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <Badge variant="secondary" className="bg-white/5 text-[9px] font-black uppercase px-3">{profile.departmentName || 'Operations'}</Badge>
              <Badge variant="outline" className="text-primary border-primary/20 text-[9px] font-black uppercase px-3">{profile.role.replace('_', ' ')}</Badge>
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">{profile.email}</p>
          </div>
        </div>
        <div className="p-10 text-center border border-dashed border-white/5 rounded-[2.5rem] bg-secondary/5 opacity-40">
           <ShieldCheck className="h-10 w-10 mx-auto mb-4 text-primary" />
           <p className="text-xs font-black uppercase tracking-[0.2em]">Detailed History Protected by Authority Protocol</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between gap-4">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="rounded-xl gap-2 px-4 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest">
             <ChevronLeft className="h-4 w-4" /> Back to Directory
          </Button>
        )}
        <div className="flex-1">
           <h1 className="text-2xl font-black font-headline tracking-tight uppercase">Operational 360: {profile.fullName.split(' ')[0]}</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-secondary/10 rounded-2xl p-1.5 border border-white/5 w-fit self-center md:self-start mb-6 shrink-0">
          <TabsTrigger value="profile" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary transition-all">
            <User className="h-3.5 w-3.5" /> Identity
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary transition-all">
            <History className="h-3.5 w-3.5" /> Activity History
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="access" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary transition-all">
              <ShieldCheck className="h-3.5 w-3.5" /> Authorization
            </TabsTrigger>
          )}
        </TabsList>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <TabsContent value="profile" className="mt-0 focus-visible:outline-none">
            <StaffProfileView
              userId={userId}
              currentUserProfile={currentUserProfile}
              permissions={permissions}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-0 focus-visible:outline-none max-w-4xl mx-auto w-full">
            <div className="space-y-8 py-4">
               <div>
                  <h3 className="text-xl font-black font-headline tracking-tighter uppercase mb-1">Operational Timeline</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Consolidated Tasks & Attendance Records</p>
               </div>
               <ActivityTimeline attendance={attendance} tasks={tasks} />
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="access" className="mt-0 focus-visible:outline-none">
              <div className="space-y-8 py-4">
                 <div>
                    <h3 className="text-xl font-black font-headline tracking-tighter uppercase mb-1">Authorization Matrix</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Capability Overrides & Functional Clearance</p>
                 </div>
                 <UserAccessEditor userProfile={profile} />
              </div>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
