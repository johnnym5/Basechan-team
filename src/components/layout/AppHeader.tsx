
'use client';
import { UserNav } from "@/components/layout/UserNav";
import { useState, useEffect, useRef } from 'react';
import { useUser, useMemoFirebase, useCollection, updateDocumentNonBlocking, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
import type { UserProfile, Notification, Attendance, SystemConfig, Announcement } from '@/lib/types';
import { Bell, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { playNotificationSound, showBrowserNotification } from '@/lib/notifications';
import { useRouter } from 'next/navigation';
import { Logo } from '../Logo';
import { uiEmitter } from '@/lib/ui-emitter';
import { ThemeToggle } from "./ThemeToggle";

interface AppHeaderProps {
  userProfile: UserProfile | null;
  onMenuClick: () => void;
  isLoggedIn: boolean;
  attendanceRecord: Attendance | null;
  systemConfig: SystemConfig | null;
  className?: string;
  isVertical?: boolean;
}

export default function AppHeader({ 
  userProfile, 
  isLoggedIn,
  className,
  isVertical
} : AppHeaderProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [greeting, setGreeting] = useState('User');
  const [currentTime, setCurrentTime] = useState('');
  const prevUnreadCount = useRef(0);

  useEffect(() => {
    const updateTime = () => setCurrentTime(format(new Date(), 'HH:mm'));
    updateTime();
    const clockInterval = setInterval(updateTime, 10000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      let timeGreeting = 'MORNING';
      if (hour >= 12 && hour < 17) timeGreeting = 'AFTERNOON';
      else if (hour >= 17 && hour < 22) timeGreeting = 'EVENING';
      else if (hour >= 22 || hour < 5) timeGreeting = 'NIGHT';
      
      const rawName = userProfile?.fullName || user?.displayName || 'User';
      const firstName = rawName.split(' ')[0].toUpperCase();
      setGreeting(`${timeGreeting}, ${firstName}`);
    };
    updateGreeting();
  }, [userProfile, user]);

  const notificationsQuery = useMemoFirebase(() => 
    firestore && user && userProfile?.orgId ? query(
        collection(firestore, 'notifications'), 
        where('orgId', '==', userProfile.orgId),
        where('userId', '==', user.uid), 
        orderBy('createdAt', 'desc'), 
        limit(15)
    ) : null
  , [firestore, user, userProfile?.orgId]);
  
  const { data: notifications } = useCollection<Notification>(notificationsQuery);

  const orgRef = useMemoFirebase(() =>
    firestore && userProfile?.orgId ? doc(firestore, 'organizations', userProfile.orgId) : null
  , [firestore, userProfile?.orgId]);
  const { data: organization } = useDoc<any>(orgRef);

  const unreadNotifications = notifications?.filter(n => !n.isRead) || [];
  const unreadCount = unreadNotifications.length;

  useEffect(() => {
    if (unreadCount > prevUnreadCount.current) {
        const latest = unreadNotifications[0];
        if (latest) {
            playNotificationSound();
            showBrowserNotification("Staff Alert", latest.title, latest.id);
        }
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount, unreadNotifications]);

  const handleNotificationClick = (n: Notification) => {
    if (firestore) updateDocumentNonBlocking(doc(firestore, 'notifications', n.id), { isRead: true });
    setIsNotificationsOpen(false);
    router.push(n.href);
  };

  const handleOpenAnalytics = () => {
    uiEmitter.emit('open-assistant-dialog');
  };

    if (isVertical) {
      return (
          <div className="flex flex-col items-center gap-6 py-6 border-b border-border">
              <div className="w-full px-4 overflow-hidden min-h-[3rem] flex flex-col justify-center items-center">
                  <Image src="/logo.png" alt="Basechan International" width={140} height={40} className="w-full h-auto object-contain opacity-90 brightness-110" />
              </div>

              <div className="flex flex-col items-center gap-5">
                  <UserNav userProfile={userProfile} />
                  <ThemeToggle />
                  
                  {/* Daily Updates Button */}
                  <button 
                    onClick={handleOpenAnalytics}
                    className="relative text-muted-foreground hover:text-amber-500 transition-all p-2 rounded-2xl hover:bg-amber-500/10 group/btn m3-interactive"
                    title="Daily Updates"
                  >
                      <Sparkles className="w-6 h-6" />
                      <div className="absolute left-full ml-4 px-3 py-1.5 bg-amber-500 text-primary-foreground text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-2xl">
                          Analytics
                      </div>
                  </button>

                   <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                      <PopoverTrigger asChild>
                          <button className="relative text-muted-foreground hover:text-primary transition-all p-2 rounded-2xl hover:bg-primary/10 group/btn m3-interactive">
                              <Bell className={cn("w-6 h-6", unreadCount > 0 && "text-primary")} />
                              {unreadCount > 0 && (
                                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-black text-destructive-foreground ring-2 ring-background shadow-sm">
                                      {unreadCount}
                                  </span>
                              )}
                              <div className="absolute left-full ml-4 px-3 py-1.5 bg-destructive text-destructive-foreground text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-2xl">
                                  Alerts
                              </div>
                          </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" side="right" className="w-[85vw] sm:w-80 p-0 m3-surface-high border-none shadow-3xl ml-4 rounded-[2rem] overflow-hidden z-[100]">
                            <div className="p-4 border-b border-border bg-secondary/20 flex items-center justify-between">
                                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] opacity-80">Notifications</h3>
                            </div>
                            <ScrollArea className="h-96">
                                {notifications?.length === 0 ? (
                                    <div className="p-16 text-center text-[10px] text-muted-foreground uppercase font-black opacity-20 tracking-tighter">No recent updates</div>
                                ) : notifications?.map(n => (
                                    <div key={n.id} className={cn("p-4 border-b border-border transition-all cursor-pointer hover:bg-primary/5", n.isRead ? "opacity-50" : "bg-primary/10")} onClick={() => handleNotificationClick(n)}>
                                        <p className="font-black text-xs leading-tight tracking-tight text-foreground">{n.title}</p>
                                        <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed font-medium">{n.description}</p>
                                        <div className="mt-2 text-[8px] font-black uppercase tracking-widest text-primary/60">{format(new Date(n.createdAt), 'MMM d, HH:mm')}</div>
                                    </div>
                                ))}
                            </ScrollArea>
                      </PopoverContent>
                  </Popover>
              </div>
          </div>
      )
  }

  return (
    <header className={cn("shrink-0 h-20 flex items-center justify-between px-10 border-b border-border bg-background/80 backdrop-blur-md transition-all relative z-50", className)}>
        <div className="flex flex-col">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary opacity-50 mb-1">{greeting}</h3>
            <p className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" />
                {currentTime} <span className="opacity-30">—</span> {organization?.name || 'Workspace'}
            </p>
        </div>

        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
                <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                    <PopoverTrigger asChild>
                        <button className="relative text-muted-foreground hover:text-primary transition-all p-2.5 rounded-2xl bg-muted hover:bg-primary/10 group/btn m3-interactive">
                            <Bell className={cn("w-5 h-5", unreadCount > 0 && "text-primary")} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-black text-destructive-foreground ring-2 ring-background shadow-lg">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-[85vw] sm:w-80 p-0 m3-surface-high border-none shadow-3xl rounded-[2rem] overflow-hidden z-[100]">
                        <div className="p-4 border-b border-border bg-secondary flex items-center justify-between">
                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] opacity-80 text-foreground">System Alerts</h3>
                            <span className="text-[8px] font-black uppercase text-primary px-2 py-0.5 rounded-full bg-primary/10">{unreadCount} New</span>
                        </div>
                        <ScrollArea className="h-96">
                            {notifications?.length === 0 ? (
                                <div className="p-16 text-center text-[10px] text-muted-foreground uppercase font-black opacity-20 tracking-tighter">No recent updates</div>
                            ) : notifications?.map(n => (
                                <div key={n.id} className={cn("p-4 border-b border-border transition-all cursor-pointer hover:bg-primary/5", n.isRead ? "opacity-50" : "bg-primary/10")} onClick={() => handleNotificationClick(n)}>
                                    <p className="font-black text-xs leading-tight tracking-tight text-foreground">{n.title}</p>
                                    <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed font-medium">{n.description}</p>
                                    <div className="mt-2 text-[8px] font-black uppercase tracking-widest text-primary/60">{format(new Date(n.createdAt), 'MMM d, HH:mm')}</div>
                                </div>
                            ))}
                        </ScrollArea>
                    </PopoverContent>
                </Popover>

                <button
                    onClick={handleOpenAnalytics}
                    className="relative text-muted-foreground hover:text-amber-500 transition-all p-2.5 rounded-2xl bg-muted hover:bg-amber-500/10 group/btn m3-interactive"
                    title="Daily Updates"
                >
                    <Sparkles className="w-5 h-5" />
                </button>
            </div>

            <div className="h-10 w-px bg-border" />

            <div className="flex items-center gap-4">
                <ThemeToggle />
                {isLoggedIn && <UserNav userProfile={userProfile} />}
            </div>
        </div>
    </header>
  );
}

import { Clock } from "lucide-react";
