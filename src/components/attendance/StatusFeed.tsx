
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "../ui/scroll-area";
import type { UserProfile } from "@/lib/types";
import type { Permissions } from "@/hooks/usePermissions";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { MessageSquare, LifeBuoy, Trophy } from "lucide-react";
import { RequestAssistanceDialog } from "../tasks/RequestAssistanceDialog";
import { AwardKudosDialog } from "../reports/AwardKudosDialog";
import { uiEmitter } from '@/lib/ui-emitter';

interface StatusFeedProps {
  userProfile: UserProfile | null;
  permissions: Permissions;
}

export function StatusFeed({ userProfile, permissions }: StatusFeedProps) {
  const firestore = useFirestore();
  const [assistanceUser, setAssistanceUser] = useState<UserProfile | null>(null);
  const [kudosUser, setKudosUser] = useState<UserProfile | null>(null);

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

  return (
    <>
      <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {isLoading && Array.from({ length: 8 }).map((_, i) => (
                      <Card key={i} className="p-4"><Skeleton className="h-12 w-full" /></Card>
                 ))}
                 {!isLoading && sortedUsers.map(user => {
                     const isSelf = user.id === userProfile?.id;
                     return (
                        <Popover key={user.id}>
                            <PopoverTrigger asChild>
                                <Card className="p-4 hover:bg-accent cursor-pointer transition-all active:scale-[0.98] group overflow-hidden relative">
                                    {user.status === 'ONLINE' && (
                                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                                    )}
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${user.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                                            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">
                                                {user.fullName.split(' ').map(n=>n[0]).join('')}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm truncate">{user.fullName} {isSelf && "(You)"}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{user.position}</p>
                                        </div>
                                    </div>
                                </Card>
                            </PopoverTrigger>
                            {!isSelf && (
                                <PopoverContent className="w-56 p-1 apple-glass-darker border-none rounded-xl">
                                    <Button variant="ghost" className="w-full justify-start text-xs font-bold rounded-lg" onClick={() => handleChat(user.id)}>
                                        <MessageSquare className="mr-2 h-4 w-4 text-primary" /> Send Transmission
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-start text-xs font-bold rounded-lg" onClick={() => setKudosUser(user)}>
                                        <Trophy className="mr-2 h-4 w-4 text-amber-500" /> Recognize Unit
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-start text-xs font-bold rounded-lg" onClick={() => setAssistanceUser(user)}>
                                        <LifeBuoy className="mr-2 h-4 w-4 text-primary" /> Request Assistance
                                    </Button>
                                </PopoverContent>
                            )}
                        </Popover>
                 )})}
                  {!isLoading && sortedUsers.length === 0 && (
                       <p className="text-sm text-muted-foreground text-center py-20 col-span-full uppercase tracking-widest font-black opacity-30">Zero Personnel Found</p>
                  )}
          </div>
      </div>
      
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
    </>
  );
}
