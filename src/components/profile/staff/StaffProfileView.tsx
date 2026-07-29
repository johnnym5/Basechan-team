'use client';

import { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User,
  Briefcase,
  FileText,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShieldCheck,
  Download,
  Edit3,
  ChevronLeft,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useStaffProfile } from '@/hooks/useStaff';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { EditStaffProfileForm } from './EditStaffProfileForm';
import { StaffDocumentUpload } from './StaffDocumentUpload';
import type { Permissions } from '@/hooks/usePermissions';

interface StaffProfileViewProps {
  userId: string;
  onBack?: () => void;
  currentUserProfile: any;
  permissions: Permissions;
}

export function StaffProfileView({ userId, onBack, currentUserProfile, permissions }: StaffProfileViewProps) {
  const { data: profile, isLoading } = useStaffProfile(userId);
  const [isEditing, setIsEditing] = useState(false);

  const isOwnProfile = currentUserProfile?.id === userId;
  const canEditEmployment = permissions.canManageStaff;
  const canEditBasic = isOwnProfile || permissions.canManageStaff;

  if (isLoading) return <Skeleton className="h-[600px] w-full rounded-[2.5rem]" />;
  if (!profile) return <div className="p-20 text-center uppercase font-black opacity-20">Profile Not Found</div>;

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)} className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-2xl font-black font-headline tracking-tighter">Modify Staff Profile</h2>
        </div>
        <EditStaffProfileForm
          profile={profile}
          onCancel={() => setIsEditing(false)}
          permissions={permissions}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-8">
      {/* Header / Summary */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 bg-card/20 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
         {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="absolute top-4 left-4 rounded-full z-10">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}

        <div className="relative">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-white/5 shadow-2xl rounded-[2.5rem]">
            <AvatarImage src={profile.avatarUrl || ''} />
            <AvatarFallback className="bg-secondary text-white text-4xl font-black">{profile.fullName.charAt(0)}</AvatarFallback>
          </Avatar>
          <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl border-none">
            {profile.status || 'ACTIVE'}
          </Badge>
        </div>

        <div className="flex-1 text-center md:text-left space-y-4 pt-2">
          <div>
            <h1 className="text-4xl font-black font-headline tracking-tighter">{profile.fullName}</h1>
            <p className="text-lg font-bold text-primary tracking-tight">{profile.jobTitle || 'No Title'}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
              <Badge variant="secondary" className="bg-white/5 border-white/5 text-[9px] font-black uppercase tracking-widest px-3">
                {profile.departmentName || 'Operations'}
              </Badge>
              <Badge variant="outline" className="border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest px-3">
                {profile.role.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto md:mx-0">
             <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold">{profile.email}</span>
             </div>
             <div className="flex items-center gap-2 text-muted-foreground">
                <Smartphone className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold">{profile.phoneNumber || 'No Phone'}</span>
             </div>
          </div>
        </div>

        {canEditBasic && (
          <Button onClick={() => setIsEditing(true)} className="rounded-2xl h-12 px-6 gap-2 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 m3-interactive">
            <Edit3 className="h-4 w-4" /> Edit Profile
          </Button>
        )}
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-secondary/10 rounded-2xl p-1.5 border border-white/5 w-fit self-center md:self-start mb-6 shrink-0">
          <TabsTrigger value="overview" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Overview</TabsTrigger>
          <TabsTrigger value="employment" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Employment</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Documents</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <TabsContent value="overview" className="mt-0 focus-visible:outline-none space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="m3-surface-low border-none rounded-[2rem] shadow-xl">
                <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-widest opacity-50 flex items-center gap-2"><User className="h-4 w-4" /> Personal Details</CardTitle></CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-[10px] font-black uppercase opacity-40">Date of Birth</p><p className="font-bold text-sm">{profile.dateOfBirth ? format(new Date(profile.dateOfBirth), 'MMMM d, yyyy') : '—'}</p></div>
                    <div><p className="text-[10px] font-black uppercase opacity-40">Employee ID</p><p className="font-mono text-sm">{profile.employeeId || '—'}</p></div>
                  </div>
                  <div><p className="text-[10px] font-black uppercase opacity-40">Residential Address</p><p className="font-bold text-sm leading-relaxed">{profile.address || 'Not provided'}</p></div>
                </CardContent>
              </Card>

              <Card className="m3-surface-low border-none rounded-[2rem] shadow-xl">
                <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-widest opacity-50 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" /> Emergency Contact</CardTitle></CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {profile.emergencyContact ? (
                    <>
                      <div><p className="text-[10px] font-black uppercase opacity-40">Contact Name</p><p className="font-bold text-sm">{profile.emergencyContact.name}</p></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-[10px] font-black uppercase opacity-40">Relationship</p><p className="font-bold text-sm">{profile.emergencyContact.relationship}</p></div>
                        <div><p className="text-[10px] font-black uppercase opacity-40">Phone Number</p><p className="font-bold text-sm text-emerald-500">{profile.emergencyContact.phone}</p></div>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center"><p className="text-xs font-bold opacity-30 italic">No emergency contact on file</p></div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employment" className="mt-0 focus-visible:outline-none">
            <Card className="m3-surface-low border-none rounded-[2rem] shadow-xl overflow-hidden">
               <CardHeader className="bg-white/5 border-b border-white/5"><CardTitle className="text-sm uppercase tracking-widest opacity-50 flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Corporate Records</CardTitle></CardHeader>
               <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
                    <div className="p-8 space-y-6">
                       <div><p className="text-[10px] font-black uppercase opacity-40 mb-1">Contract Type</p><Badge className="rounded-lg">{profile.employmentType || 'FULL_TIME'}</Badge></div>
                       <div><p className="text-[10px] font-black uppercase opacity-40 mb-1">Onboarding Date</p><p className="font-bold">{profile.joinDate ? format(new Date(profile.joinDate), 'PPP') : '—'}</p></div>
                    </div>
                    <div className="p-8 space-y-6">
                       <div><p className="text-[10px] font-black uppercase opacity-40 mb-1">Line Manager</p><div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback>{profile.managerId ? 'M' : '?'}</AvatarFallback></Avatar><span className="font-bold text-sm">John Wick (Placeholder)</span></div></div>
                       <div><p className="text-[10px] font-black uppercase opacity-40 mb-1">System Clearance</p><p className="font-mono text-sm text-primary">{profile.role}</p></div>
                    </div>
                    <div className="p-8 bg-primary/5">
                        <p className="text-[10px] font-black uppercase opacity-40 mb-4">Security Credentials</p>
                        <div className="space-y-3">
                           <div className="flex items-center justify-between text-[10px] font-bold"><span className="opacity-50">Auth Verified</span> <ShieldCheck className="h-4 w-4 text-emerald-500" /></div>
                           <div className="flex items-center justify-between text-[10px] font-bold"><span className="opacity-50">MFA Enabled</span> <Badge variant="outline" className="text-[8px]">ACTIVE</Badge></div>
                        </div>
                    </div>
                  </div>
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-0 focus-visible:outline-none space-y-6">
             {permissions.canManageStaff && (
               <StaffDocumentUpload userId={userId} orgId={profile.orgId} />
             )}

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.documents && profile.documents.length > 0 ? (
                  profile.documents.map((doc, idx) => (
                    <Card key={idx} className="bg-white/5 border-white/5 hover:bg-white/10 transition-all rounded-2xl group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <div className="p-2.5 rounded-xl bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
                           <div className="overflow-hidden">
                              <p className="font-bold text-sm truncate">{doc.name}</p>
                              <p className="text-[9px] font-black uppercase opacity-40">{format(new Date(doc.uploadedAt), 'MMM d, yyyy')}</p>
                           </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
                           <a href={doc.url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center border border-dashed border-white/5 rounded-3xl">
                     <p className="text-xs font-bold opacity-30 uppercase tracking-[0.2em]">Zero Documents Archived</p>
                  </div>
                )}
             </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
