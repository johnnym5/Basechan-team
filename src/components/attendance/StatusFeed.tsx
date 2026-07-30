'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "../ui/scroll-area";
import type { UserProfile } from "@/lib/types";
import type { Permissions } from "@/hooks/usePermissions";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, updateDoc } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { MessageSquare, LifeBuoy, Trophy, Monitor, Smartphone, MonitorPlay, Camera, Radio } from "lucide-react";
import { RequestAssistanceDialog } from "../tasks/RequestAssistanceDialog";
import { AwardKudosDialog } from "../reports/AwardKudosDialog";
import { uiEmitter } from '@/lib/ui-emitter';
import { useToast } from "@/hooks/use-toast";
import { useContextMenu } from "@/hooks/useContextMenu";
import { ContextMenu, type ContextMenuItem } from "../shared/ContextMenu";
import { cn } from "@/lib/utils";

interface StatusFeedProps {
  userProfile: UserProfile | null;
  permissions: Permissions;
}

export function StatusFeed({ userProfile, permissions }: StatusFeedProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [assistanceUser, setAssistanceUser] = useState<UserProfile | null>(null);
  const [kudosUser, setKudosUser] = useState<UserProfile | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const { isOpen, anchorPoint, handleContextMenu, handleTouchStart, handleTouchEnd, closeMenu } = useContextMenu();
  const [contextUser, setContextUser] = useState<UserProfile | null>(null);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(
      collection(firestore, 'users'),
      where('orgId', '==', userProfile.orgId)
    );
  }, [firestore, userProfile]);

  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

  const sortedUsers = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => {
      if (a.status === 'ONLINE' && b.status !== 'ONLINE') return -1;
      if (a.status !== 'ONLINE' && b.status === 'ONLINE') return 1;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [users]);
  
  const handleChat = (userId: string) => {
      uiEmitter.emit('open-chat-dialog', { initialUserId: userId });
  };

  const handleOversight = async (user: UserProfile, type: 'SCREENSHOT' | 'SCREEN_SHARE') => {
      if (!firestore) return;
      setIsProcessing(user.id);
      try {
          await updateDoc(doc(firestore, 'users', user.id), { pendingCommand: type });
          if (type === 'SCREEN_SHARE') {
              uiEmitter.emit('open-live-monitor-dialog', { targetUserId: user.id, targetUserName: user.fullName });
          }
          toast({ title: 'Request Sent', description: `Oversight command dispatched to ${user.fullName.split(' ')[0]}.` });
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Error', description: e.message });
      } finally {
          setTimeout(() => setIsProcessing(null), 1000);
      }
  };

  const menuItems = useMemo((): ContextMenuItem[] => {
      if (!contextUser || contextUser.id === userProfile?.id) return [];
      const items: ContextMenuItem[] = [
          { label: 'Send Transmission', icon: <MessageSquare className="h-4 w-4 text-primary" />, action: () => handleChat(contextUser.id) },
          { label: 'Recognize Unit', icon: <Trophy className="h-4 w-4 text-amber-500" />, action: () => setKudosUser(contextUser) },
      ];

      if (permissions.canManageStaff && contextUser.status === 'ONLINE' && contextUser.deviceType === 'PC') {
          items.push({ isSeparator: true } as any);
          items.push({ label: 'View Screen', icon: <MonitorPlay className="h-4 w-4 text-emerald-500" />, action: () => handleOversight(contextUser, 'SCREEN_SHARE') });
          items.push({ label: 'Capture Screen', icon: <Camera className="h-4 w-4 text-primary" />, action: () => handleOversight(contextUser, 'SCREENSHOT') });
      }

      return items;
  }, [contextUser, userProfile, permissions]);

  return (
    <Card className="border border-border/60 bg-muted/30 rounded-xl p-4 shadow-sm flex flex-col h-full overflow-hidden">
      <CardHeader className="p-0 pb-4 bg-white/5 border-b border-white/5 -mx-4 px-4 pt-4 mb-4">
          <CardTitle className="text-xl font-black font-headline tracking-tighter flex items-center gap-2 text-white uppercase">
              <Radio className="h-5 w-5 text-primary animate-pulse" />
              Live Status
          </CardTitle>
          <CardDescription className="text-[9px] font-black uppercase tracking-widest opacity-60">Real-time Team Activity</CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {isLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                          <Skeleton key={i} className="h-14 w-full rounded-2xl bg-white/5" />
                      ))
                  ) : sortedUsers.length === 0 ? (
                      <div className="p-8 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-30 col-span-full">No Active Nodes</div>
                  ) : (
                      sortedUsers.map(user => {
                          const isSelf = user.id === userProfile?.id;
                          const isOnline = user.status === 'ONLINE';

                          return (
                              <Popover key={user.id}>
                                  <PopoverTrigger asChild>
                                      <div
                                          className={cn(
                                              "p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer relative group",
                                              isOnline && "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_15px_-5px_rgba(16,185,129,0.2)]"
                                          )}
                                          onContextMenu={(e) => { setContextUser(user); handleContextMenu(e); }}
                                          onTouchStart={(e) => { setContextUser(user); handleTouchStart(e); }}
                                          onTouchEnd={handleTouchEnd}
                                      >
                                          <div className="flex items-center gap-3">
                                              <div className="relative">
                                                  <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center font-black text-xs text-white">
                                                      {user.fullName.charAt(0)}
                                                  </div>
                                                  <span className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${isOnline ? 'bg-emerald-500' : 'bg-muted-foreground opacity-30'}`} />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                  <p className="font-black text-[11px] truncate text-white">{user.fullName} {isSelf && "(You)"}</p>
                                                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest truncate opacity-50">{user.position}</p>
                                              </div>
                                          </div>
                                      </div>
                                  </PopoverTrigger>
                                  {!isSelf && (
                                      <PopoverContent className="w-56 p-1 m3-surface-high border-none rounded-2xl shadow-3xl">
                                          <Button variant="ghost" className="w-full justify-start text-[10px] font-black uppercase tracking-widest rounded-xl h-10" onClick={() => handleChat(user.id)}>
                                              <MessageSquare className="mr-3 h-4 w-4 text-primary" /> Transmission
                                          </Button>
                                          <Button variant="ghost" className="w-full justify-start text-[10px] font-black uppercase tracking-widest rounded-xl h-10" onClick={() => setKudosUser(user)}>
                                              <Trophy className="mr-3 h-4 w-4 text-amber-500" /> Recognize
                                          </Button>
                                          <Button variant="ghost" className="w-full justify-start text-[10px] font-black uppercase tracking-widest rounded-xl h-10" onClick={() => setAssistanceUser(user)}>
                                              <LifeBuoy className="mr-3 h-4 w-4 text-primary" /> Assistance
                                          </Button>
                                          {permissions.canManageStaff && user.status === 'ONLINE' && user.deviceType === 'PC' && (
                                              <>
                                                  <div className="h-px bg-white/5 my-1 mx-2" />
                                                  <Button variant="ghost" className="w-full justify-start text-[10px] font-black uppercase tracking-widest rounded-xl h-10 text-emerald-500" onClick={() => handleOversight(user, 'SCREEN_SHARE')}>
                                                      <MonitorPlay className="mr-3 h-4 w-4" /> Live Feed
                                                  </Button>
                                                  <Button variant="ghost" className="w-full justify-start text-[10px] font-black uppercase tracking-widest rounded-xl h-10" onClick={() => handleOversight(user, 'SCREENSHOT')}>
                                                      <Camera className="mr-3 h-4 w-4 text-primary" /> Capture
                                                  </Button>
                                              </>
                                          )}
                                      </PopoverContent>
                                  )}
                              </Popover>
                          );
                      })
                  )}
              </div>
          </ScrollArea>
      </CardContent>
      
      {assistanceUser && userProfile && (
        <RequestAssistanceDialog
            open={!!assistanceUser}
            onOpenChange={(isOpen) => !isOpen && setAssistanceUser(null)}
            targetUser={assistanceUser}
            currentUserProfile={userProfile}
        />
      )}

      {kudosUser && userProfile && (
          <AwardKudosDialog 
            open={!!kudosUser}
            onOpenChange={(isOpen) => !isOpen && setKudosUser(null)}
            targetUser={kudosUser}
            currentUserProfile={userProfile}
          />
      )}
      <ContextMenu isOpen={isOpen} anchorPoint={anchorPoint} items={menuItems} onClose={closeMenu} />
    </Card>
  );
}
