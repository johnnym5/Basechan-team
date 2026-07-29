'use client';

import { useState, useEffect, useMemo } from 'react';
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
  AlertCircle,
  Globe,
  Clock,
  Quote,
  Languages,
  Trophy,
  Star,
  Award,
  Users,
  Sparkles,
  GitBranch,
  ArrowDown,
  ArrowUp,
  History,
  Monitor,
  Cpu,
  Key,
  ListTodo,
  CheckCircle2,
  Timer
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useStaffProfile } from '@/hooks/useStaff';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { uiEmitter } from '@/lib/ui-emitter';
import { EditStaffProfileForm } from './EditStaffProfileForm';
import { StaffDocumentUpload } from './StaffDocumentUpload';
import { UserAccessEditor } from '@/components/settings/security/UserAccessEditor';
import type { Permissions } from '@/hooks/usePermissions';
import type { UserProfile, Kudos } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StaffProfileViewProps {
  userId: string;
  onBack?: () => void;
  onViewProfile?: (userId: string) => void;
  currentUserProfile: any;
  permissions: Permissions;
}

export function StaffProfileView({ userId, onBack, onViewProfile, currentUserProfile, permissions }: StaffProfileViewProps) {
  const firestore = useFirestore();
  const { data: profile, isLoading } = useStaffProfile(userId);
  const [isEditing, setIsEditing] = useState(false);
  const [localTime, setLocalTime] = useState<string>('');

  const reportsQuery = useMemoFirebase(() =>
    firestore && userId && profile?.orgId ? query(collection(firestore, 'users'), where('orgId', '==', profile.orgId), where('managerId', '==', userId)) : null
  , [firestore, userId, profile?.orgId]);
  const { data: directReports } = useCollection<UserProfile>(reportsQuery);

  const tasksQuery = useMemoFirebase(() =>
    firestore && userId && profile?.orgId ? query(collection(firestore, 'tasks'), where('orgId', '==', profile.orgId), where('assignedTo', '==', userId), where('status', '!=', 'ARCHIVED')) : null
  , [firestore, userId, profile?.orgId]);
  const { data: activeTasks } = useCollection<any>(tasksQuery);

  const today = format(new Date(), 'yyyy-MM-dd');
  const attendanceQuery = useMemoFirebase(() =>
    firestore && userId && profile?.orgId ? query(collection(firestore, 'attendance'), where('orgId', '==', profile.orgId), where('userId', '==', userId), where('date', '==', today)) : null
  , [firestore, userId, today, profile?.orgId]);
  const { data: attendanceData } = useCollection<any>(attendanceQuery);
  const attendance = attendanceData?.[0] || null;

  const { data: manager } = useStaffProfile(profile?.managerId);

  const kudosQuery = useMemoFirebase(() =>
    firestore && userId && profile?.orgId ? query(collection(firestore, 'kudos'), where('orgId', '==', profile.orgId), where('toUserId', '==', userId), orderBy('timestamp', 'desc')) : null
  , [firestore, userId, profile?.orgId]);
  const { data: kudos, isLoading: isKudosLoading } = useCollection<Kudos>(kudosQuery);

  useEffect(() => {
    if (!profile?.timezone) return;

    const updateTime = () => {
      try {
        const timeStr = new Intl.DateTimeFormat('en-US', {
          timeZone: profile.timezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZoneName: 'short'
        }).format(new Date());
        setLocalTime(timeStr);
      } catch (e) {
        console.warn("Invalid timezone", profile.timezone);
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, [profile?.timezone]);

  const isBirthday = useMemo(() => {
    if (!profile?.dateOfBirth) return false;
    const dob = new Date(profile.dateOfBirth);
    const today = new Date();
    return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
  }, [profile?.dateOfBirth]);

  const isWorkAnniversary = useMemo(() => {
    if (!profile?.joinDate) return false;
    const joinDate = new Date(profile.joinDate);
    const today = new Date();
    return joinDate.getDate() === today.getDate() && joinDate.getMonth() === today.getMonth() && joinDate.getFullYear() < today.getFullYear();
  }, [profile?.joinDate]);

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
      {/* Celebratory Banner */}
      {(isBirthday || isWorkAnniversary) && (
        <div className="bg-gradient-to-r from-amber-500 to-primary text-white p-4 rounded-3xl flex items-center justify-between shadow-xl animate-in slide-in-from-top duration-1000">
           <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                 {isBirthday ? '🎂' : '🎊'}
              </div>
              <div>
                 <h3 className="font-black font-headline tracking-tight">
                    {isBirthday ? `Happy Birthday, ${profile.preferredName || profile.fullName.split(' ')[0]}!` : `Happy Work Anniversary!`}
                 </h3>
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                    {isBirthday ? "Celebrating another year of excellence." : `${new Date().getFullYear() - new Date(profile.joinDate!).getFullYear()} Years of Dedication & Impact.`}
                 </p>
              </div>
           </div>
           <Sparkles className="h-8 w-8 opacity-40 mr-4 animate-pulse" />
        </div>
      )}

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
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
             <Badge className={cn(
               "px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl border-none",
               attendance?.clockIn && !attendance?.clockOut ? "bg-emerald-500" : "bg-muted-foreground opacity-50"
             )}>
               {attendance?.clockIn && !attendance?.clockOut ? 'CLOCKED IN' : profile.status || 'OFFLINE'}
             </Badge>
          </div>
        </div>

        <div className="flex-1 text-center md:text-left space-y-4 pt-2">
          <div>
            <div className="flex flex-col md:flex-row md:items-baseline gap-2">
              <h1 className="text-4xl font-black font-headline tracking-tighter">{profile.fullName}</h1>
              {profile.preferredName && (
                <span className="text-lg font-bold text-muted-foreground">({profile.preferredName})</span>
              )}
              {profile.pronouns && (
                <Badge variant="outline" className="w-fit self-center md:self-auto text-[8px] font-black uppercase opacity-40 border-white/10 px-2 py-0">
                  {profile.pronouns}
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3 mt-1">
              <p className="text-lg font-bold text-primary tracking-tight">{profile.jobTitle || 'No Title'}</p>
              <div className="h-4 w-px bg-white/10 hidden md:block" />
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                 <ListTodo className="h-3 w-3 text-primary" />
                 {activeTasks?.length || 0} Missions Active
              </div>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
              <Badge variant="secondary" className="bg-white/5 border-white/5 text-[9px] font-black uppercase tracking-widest px-3">
                {profile.departmentName || 'Operations'}
              </Badge>
              <Badge variant="outline" className="border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest px-3">
                {profile.role.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl mx-auto md:mx-0">
             <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold truncate">{profile.email}</span>
             </div>
             <div className="flex items-center gap-2 text-muted-foreground">
                <Smartphone className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold">{profile.phoneNumber || 'No Phone'}</span>
             </div>
             {profile.location && (
               <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-bold truncate">{profile.location}</span>
               </div>
             )}
             {localTime && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold">{localTime}</span>
                </div>
             )}
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
          <TabsTrigger value="recognition" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Recognition</TabsTrigger>
          <TabsTrigger value="structure" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Structure</TabsTrigger>
          <TabsTrigger value="assets" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Assets</TabsTrigger>
          {permissions.canManageStaff && (
            <TabsTrigger value="access" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Access</TabsTrigger>
          )}
          <TabsTrigger value="employment" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Employment</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Documents</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <TabsContent value="overview" className="mt-0 focus-visible:outline-none space-y-6">
            {profile.bio && (
              <Card className="m3-surface-low border-none rounded-[2rem] shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Quote className="h-20 w-20" /></div>
                <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-widest opacity-50 flex items-center gap-2">About {profile.preferredName || profile.fullName.split(' ')[0]}</CardTitle></CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium leading-relaxed italic opacity-80 whitespace-pre-wrap">"{profile.bio}"</p>
                </CardContent>
              </Card>
            )}

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
                <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-widest opacity-50 flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Expertise & Skills</CardTitle></CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex flex-wrap gap-2">
                    {profile.skills && profile.skills.length > 0 ? (
                      profile.skills.map(skill => (
                        <Badge key={skill} variant="secondary" className="bg-primary/10 text-primary border-primary/20 rounded-lg px-3 py-1 font-bold text-[10px] uppercase">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-xs font-bold opacity-30 italic">No skills listed</p>
                    )}
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] font-black uppercase opacity-40 mb-2 flex items-center gap-2"><Languages className="h-3 w-3" /> Languages</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.languages && profile.languages.length > 0 ? (
                        profile.languages.map(lang => (
                          <Badge key={lang} variant="outline" className="border-white/10 opacity-60 rounded-lg px-2 font-bold text-[9px] uppercase">
                            {lang}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-[10px] font-bold opacity-30 italic">Not specified</p>
                      )}
                    </div>
                  </div>
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

            <div className="space-y-4 pt-6 border-t border-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2"><ListTodo className="h-3 w-3" /> Tactical Mission Snapshot</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeTasks && activeTasks.length > 0 ? (
                    activeTasks.slice(0, 6).map((task) => (
                      <Card
                        key={task.id}
                        className="bg-white/5 border-white/5 hover:bg-white/10 transition-all rounded-2xl cursor-pointer p-4 group"
                        onClick={() => uiEmitter.emit('open-tasks-dialog', { taskId: task.id })}
                      >
                         <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                               <p className="font-black text-xs tracking-tight truncate group-hover:text-primary transition-colors">{task.title}</p>
                               <Badge variant="outline" className="text-[7px] font-black uppercase opacity-40">{task.status}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground uppercase">
                                  <Timer className="h-2.5 w-2.5" />
                                  {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'No Due Date'}
                                </div>
                                {task.status === 'AWAITING_REVIEW' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                            </div>
                         </div>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full py-10 text-center border border-dashed border-white/5 rounded-3xl">
                       <p className="text-xs font-bold opacity-30 uppercase tracking-[0.2em]">Zero Active Missions</p>
                    </div>
                  )}
                </div>
            </div>
          </TabsContent>

          <TabsContent value="recognition" className="mt-0 focus-visible:outline-none space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isKudosLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
                ) : kudos && kudos.length > 0 ? (
                  kudos.map((k, idx) => (
                    <Card key={idx} className="bg-gradient-to-br from-amber-500/5 to-primary/5 border-amber-500/10 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-all">
                       <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Star className="h-12 w-12 text-amber-500" /></div>
                       <CardContent className="p-5 space-y-4">
                          <div className="flex items-center gap-3">
                             <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500"><Award className="h-6 w-6" /></div>
                             <div>
                                <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">{k.badgeType.replace('_', ' ')}</p>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase">{format(new Date(k.timestamp), 'PPP')}</p>
                             </div>
                          </div>
                          <p className="text-xs font-medium leading-relaxed italic opacity-80">"{k.message}"</p>
                          <div className="pt-3 border-t border-white/5 flex items-center gap-2">
                             <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[8px] font-black text-white">{k.fromUserName.charAt(0)}</div>
                             <p className="text-[9px] font-black uppercase opacity-40">From {k.fromUserName}</p>
                          </div>
                       </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center border border-dashed border-white/5 rounded-3xl bg-secondary/5">
                     <p className="text-xs font-bold opacity-30 uppercase tracking-[0.2em]">Awaiting First Recognition</p>
                  </div>
                )}
             </div>

            <div className="space-y-4 pt-6 border-t border-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2"><ListTodo className="h-3 w-3" /> Tactical Mission Snapshot</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeTasks && activeTasks.length > 0 ? (
                    activeTasks.slice(0, 6).map((task) => (
                      <Card
                        key={task.id}
                        className="bg-white/5 border-white/5 hover:bg-white/10 transition-all rounded-2xl cursor-pointer p-4 group"
                        onClick={() => uiEmitter.emit('open-tasks-dialog', { taskId: task.id })}
                      >
                         <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                               <p className="font-black text-xs tracking-tight truncate group-hover:text-primary transition-colors">{task.title}</p>
                               <Badge variant="outline" className="text-[7px] font-black uppercase opacity-40">{task.status}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground uppercase">
                                  <Timer className="h-2.5 w-2.5" />
                                  {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'No Due Date'}
                                </div>
                                {task.status === 'AWAITING_REVIEW' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                            </div>
                         </div>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full py-10 text-center border border-dashed border-white/5 rounded-3xl">
                       <p className="text-xs font-bold opacity-30 uppercase tracking-[0.2em]">Zero Active Missions</p>
                    </div>
                  )}
                </div>
            </div>
          </TabsContent>

          <TabsContent value="structure" className="mt-0 focus-visible:outline-none space-y-8">
             {/* Manager Section */}
             <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2"><ArrowUp className="h-3 w-3" /> Reporting Line</p>
                {manager ? (
                  <Card
                    className={cn(
                        "max-w-md bg-white/5 border-white/5 hover:bg-white/10 transition-all rounded-3xl p-4",
                        onViewProfile ? "cursor-pointer group" : "cursor-default"
                    )}
                    onClick={() => onViewProfile?.(manager.id)}
                  >
                    <div className="flex items-center gap-4">
                       <Avatar className="h-12 w-12 rounded-2xl border border-white/10 group-hover:border-primary/50 transition-all">
                          <AvatarImage src={manager.avatarUrl || ''} />
                          <AvatarFallback className="bg-secondary font-black">{manager.fullName.charAt(0)}</AvatarFallback>
                       </Avatar>
                       <div>
                          <p className="font-black text-sm tracking-tight">{manager.fullName}</p>
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{manager.jobTitle || 'Unit Manager'}</p>
                       </div>
                    </div>
                  </Card>
                ) : (
                  <p className="text-xs font-bold opacity-30 italic">No manager assigned</p>
                )}
             </div>

             {/* Peer Section / Separator */}
             <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-white/5" />
                <GitBranch className="h-5 w-5 opacity-20" />
                <div className="h-px flex-1 bg-white/5" />
             </div>

             {/* Direct Reports Section */}
             <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2"><ArrowDown className="h-3 w-3" /> Direct Reports</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {directReports && directReports.length > 0 ? (
                    directReports.map((report) => (
                      <Card
                        key={report.id}
                        className={cn(
                            "bg-white/5 border-white/5 hover:bg-white/10 transition-all rounded-3xl p-4",
                            onViewProfile ? "cursor-pointer group" : "cursor-default"
                        )}
                        onClick={() => onViewProfile?.(report.id)}
                      >
                         <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10 rounded-xl border border-white/10 group-hover:border-emerald-500/50 transition-all">
                               <AvatarImage src={report.avatarUrl || ''} />
                               <AvatarFallback className="bg-secondary text-xs font-black">{report.fullName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                               <p className="font-black text-xs tracking-tight">{report.fullName}</p>
                               <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{report.jobTitle || 'Unit Staff'}</p>
                            </div>
                         </div>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full py-10 text-center border border-dashed border-white/5 rounded-3xl">
                       <p className="text-xs font-bold opacity-30 uppercase tracking-[0.2em]">Zero Direct Reports</p>
                    </div>
                  )}
                </div>
             </div>

            <div className="space-y-4 pt-6 border-t border-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2"><ListTodo className="h-3 w-3" /> Tactical Mission Snapshot</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeTasks && activeTasks.length > 0 ? (
                    activeTasks.slice(0, 6).map((task) => (
                      <Card
                        key={task.id}
                        className="bg-white/5 border-white/5 hover:bg-white/10 transition-all rounded-2xl cursor-pointer p-4 group"
                        onClick={() => uiEmitter.emit('open-tasks-dialog', { taskId: task.id })}
                      >
                         <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                               <p className="font-black text-xs tracking-tight truncate group-hover:text-primary transition-colors">{task.title}</p>
                               <Badge variant="outline" className="text-[7px] font-black uppercase opacity-40">{task.status}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground uppercase">
                                  <Timer className="h-2.5 w-2.5" />
                                  {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'No Due Date'}
                                </div>
                                {task.status === 'AWAITING_REVIEW' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                            </div>
                         </div>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full py-10 text-center border border-dashed border-white/5 rounded-3xl">
                       <p className="text-xs font-bold opacity-30 uppercase tracking-[0.2em]">Zero Active Missions</p>
                    </div>
                  )}
                </div>
            </div>
          </TabsContent>

          <TabsContent value="assets" className="mt-0 focus-visible:outline-none space-y-8">
             {/* Equipment Section */}
             <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2"><Monitor className="h-3 w-3" /> Hardware Assignments</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.assignedEquipment && profile.assignedEquipment.length > 0 ? (
                    profile.assignedEquipment.map((item) => (
                      <Card key={item.id} className="bg-white/5 border-white/5 rounded-3xl p-5 shadow-sm group">
                         <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                               <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center text-primary group-hover:scale-110 transition-transform"><Cpu className="h-6 w-6" /></div>
                               <div>
                                  <p className="font-black text-sm tracking-tight">{item.name}</p>
                                  <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">{item.serialNumber}</p>
                               </div>
                            </div>
                            <Badge variant="outline" className="text-[8px] font-black opacity-40 uppercase">Assigned {format(new Date(item.assignedDate), 'MMM yyyy')}</Badge>
                         </div>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full py-10 text-center border border-dashed border-white/5 rounded-3xl">
                       <p className="text-xs font-bold opacity-30 uppercase tracking-[0.2em]">No Hardware Assigned</p>
                    </div>
                  )}
                </div>
             </div>

             {/* Software Licenses Section */}
             <div className="space-y-4 pt-6 border-t border-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2"><Key className="h-3 w-3" /> Software Licenses</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profile.softwareLicenses && profile.softwareLicenses.length > 0 ? (
                    profile.softwareLicenses.map((license) => (
                      <Card key={license.id} className="bg-white/5 border-white/5 rounded-2xl p-4 shadow-sm group">
                         <div className="space-y-3">
                            <div className="flex items-center justify-between">
                               <p className="font-black text-xs tracking-tight">{license.name}</p>
                               <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><Key className="h-3 w-3" /></div>
                            </div>
                            {license.key && (
                              <div className="bg-black/20 p-2 rounded-lg font-mono text-[9px] opacity-60 break-all select-all">
                                {license.key}
                              </div>
                            )}
                            <p className="text-[8px] font-black uppercase opacity-30 tracking-widest">Added {format(new Date(license.assignedDate), 'PPP')}</p>
                         </div>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full py-10 text-center border border-dashed border-white/5 rounded-3xl">
                       <p className="text-xs font-bold opacity-30 uppercase tracking-[0.2em]">Zero Licenses Records</p>
                    </div>
                  )}
                </div>
             </div>

            <div className="space-y-4 pt-6 border-t border-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2"><ListTodo className="h-3 w-3" /> Tactical Mission Snapshot</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeTasks && activeTasks.length > 0 ? (
                    activeTasks.slice(0, 6).map((task) => (
                      <Card
                        key={task.id}
                        className="bg-white/5 border-white/5 hover:bg-white/10 transition-all rounded-2xl cursor-pointer p-4 group"
                        onClick={() => uiEmitter.emit('open-tasks-dialog', { taskId: task.id })}
                      >
                         <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                               <p className="font-black text-xs tracking-tight truncate group-hover:text-primary transition-colors">{task.title}</p>
                               <Badge variant="outline" className="text-[7px] font-black uppercase opacity-40">{task.status}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground uppercase">
                                  <Timer className="h-2.5 w-2.5" />
                                  {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'No Due Date'}
                                </div>
                                {task.status === 'AWAITING_REVIEW' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                            </div>
                         </div>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full py-10 text-center border border-dashed border-white/5 rounded-3xl">
                       <p className="text-xs font-bold opacity-30 uppercase tracking-[0.2em]">Zero Active Missions</p>
                    </div>
                  )}
                </div>
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
                       <div><p className="text-[10px] font-black uppercase opacity-40 mb-1">Standard Shift</p><p className="font-black text-sm text-amber-500">{profile.workSchedule?.hours || '09:00 - 17:00'}</p></div>
                       <div className="flex flex-wrap gap-1">
                          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => {
                            const isActive = profile.workSchedule?.days?.includes(day);
                            return (
                              <div key={day} className={cn(
                                "text-[7px] font-black w-6 h-6 rounded flex items-center justify-center border",
                                isActive ? "bg-primary text-white border-primary" : "opacity-20 border-white/10"
                              )}>
                                {day[0]}
                              </div>
                            );
                          })}
                       </div>
                    </div>
                    <div className="p-8 space-y-6">
                       <div><p className="text-[10px] font-black uppercase opacity-40 mb-1">Line Manager</p><div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback>{profile.managerId ? 'M' : '?'}</AvatarFallback></Avatar><span className="font-bold text-sm">John Wick (Placeholder)</span></div></div>
                       <div><p className="text-[10px] font-black uppercase opacity-40 mb-1">System Clearance</p><p className="font-mono text-sm text-primary">{profile.role}</p></div>
                    </div>
                  </div>
               </CardContent>
            </Card>

            {/* Employment Timeline */}
            <div className="space-y-4 pt-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2"><History className="h-3 w-3" /> Career Milestones</p>
                <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5">
                   {profile.employmentHistory && profile.employmentHistory.length > 0 ? (
                     profile.employmentHistory.map((milestone, idx) => (
                       <div key={idx} className="relative">
                          <div className="absolute -left-8 top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                          <div className="space-y-1">
                             <div className="flex items-center gap-3">
                                <p className="font-black text-sm tracking-tight">{milestone.role}</p>
                                <Badge variant="outline" className="text-[8px] font-black uppercase opacity-40">{milestone.type}</Badge>
                             </div>
                             <p className="text-[10px] font-bold text-muted-foreground uppercase">{format(new Date(milestone.date), 'MMMM yyyy')}</p>
                             {milestone.notes && <p className="text-xs opacity-60 italic mt-1 leading-relaxed">"{milestone.notes}"</p>}
                          </div>
                       </div>
                     ))
                   ) : (
                     <div className="relative">
                        <div className="absolute -left-8 top-1.5 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-background" />
                        <div className="space-y-1">
                           <p className="font-black text-sm tracking-tight">Onboarding Phase</p>
                           <p className="text-[10px] font-bold text-muted-foreground uppercase">{profile.joinDate ? format(new Date(profile.joinDate), 'MMMM yyyy') : 'Recently Joined'}</p>
                        </div>
                     </div>
                   )}
                </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2"><ListTodo className="h-3 w-3" /> Tactical Mission Snapshot</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeTasks && activeTasks.length > 0 ? (
                    activeTasks.slice(0, 6).map((task) => (
                      <Card
                        key={task.id}
                        className="bg-white/5 border-white/5 hover:bg-white/10 transition-all rounded-2xl cursor-pointer p-4 group"
                        onClick={() => uiEmitter.emit('open-tasks-dialog', { taskId: task.id })}
                      >
                         <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                               <p className="font-black text-xs tracking-tight truncate group-hover:text-primary transition-colors">{task.title}</p>
                               <Badge variant="outline" className="text-[7px] font-black uppercase opacity-40">{task.status}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground uppercase">
                                  <Timer className="h-2.5 w-2.5" />
                                  {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'No Due Date'}
                                </div>
                                {task.status === 'AWAITING_REVIEW' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                            </div>
                         </div>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full py-10 text-center border border-dashed border-white/5 rounded-3xl">
                       <p className="text-xs font-bold opacity-30 uppercase tracking-[0.2em]">Zero Active Missions</p>
                    </div>
                  )}
                </div>
            </div>
          </TabsContent>

          {permissions.canManageStaff && (
            <TabsContent value="access" className="mt-0 focus-visible:outline-none">
                <UserAccessEditor userProfile={profile} />
            </TabsContent>
          )}

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

            <div className="space-y-4 pt-6 border-t border-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2"><ListTodo className="h-3 w-3" /> Tactical Mission Snapshot</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeTasks && activeTasks.length > 0 ? (
                    activeTasks.slice(0, 6).map((task) => (
                      <Card
                        key={task.id}
                        className="bg-white/5 border-white/5 hover:bg-white/10 transition-all rounded-2xl cursor-pointer p-4 group"
                        onClick={() => uiEmitter.emit('open-tasks-dialog', { taskId: task.id })}
                      >
                         <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                               <p className="font-black text-xs tracking-tight truncate group-hover:text-primary transition-colors">{task.title}</p>
                               <Badge variant="outline" className="text-[7px] font-black uppercase opacity-40">{task.status}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground uppercase">
                                  <Timer className="h-2.5 w-2.5" />
                                  {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'No Due Date'}
                                </div>
                                {task.status === 'AWAITING_REVIEW' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                            </div>
                         </div>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full py-10 text-center border border-dashed border-white/5 rounded-3xl">
                       <p className="text-xs font-bold opacity-30 uppercase tracking-[0.2em]">Zero Active Missions</p>
                    </div>
                  )}
                </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
