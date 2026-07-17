
'use client';
import { UserNav } from "@/components/layout/UserNav";
import { useState, useEffect, useRef } from 'react';
import { useUser, useMemoFirebase, useCollection, updateDocumentNonBlocking, useFirestore } from '@/firebase';
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
      let timeGreeting = 'Morning';
      if (hour >= 12 && hour < 17) timeGreeting = 'Afternoon';
      else if (hour >= 17 && hour < 22) timeGreeting = 'Evening';
      else if (hour >= 22 || hour < 5) timeGreeting = 'Night';
      
      const rawName = userProfile?.fullName || user?.displayName || 'User';
      const firstName = rawName.split(' ')[0];
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
  
  const announcementsQuery = useMemoFirebase(() => 
    firestore && userProfile ? query(collection(firestore, 'announcements'), where('orgId', '==', userProfile.orgId), orderBy('createdAt', 'desc'), limit(5)) : null
  , [firestore, userProfile]);

  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  const { data: announcements } = useCollection<Announcement>(announcementsQuery);

  const unreadNotifications = notifications?.filter(n => !n.isRead) || [];
  const unreadCount = unreadNotifications.length;
  const broadcastCount = announcements?.length || 0;

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

  const handleOpenIntelligence = () => {
    uiEmitter.emit('open-assistant-dialog');
  };

  if (isVertical) {
      return (
          <div className="flex flex-col items-center gap-4 py-4 border-b border-white/5">
              {/* Profile & Status Header */}
              <div className="w-full px-2 overflow-hidden min-h-[2.5rem] flex flex-col justify-center items-center">
                  <Image src="/logo.png" alt="Basechan International" width={120} height={34} className="w-full h-auto object-contain opacity-80" />
              </div>

              <div className="flex flex-col items-center gap-3">
                  <UserNav userProfile={userProfile} />
                  <ThemeToggle />
                  
                  {/* Daily Updates Button */}
                  <button 
                    onClick={handleOpenIntelligence}
                    className="relative text-gray-400 hover:text-amber-500 transition-all p-1.5 rounded-full hover:bg-amber-500/5 group/btn"
                    title="Daily Updates"
                  >
                      <Sparkles className="w-5 h-5" />
                      {broadcastCount > 0 && (
                          <span className="absolute top-0.5 right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-primary text-[7px] font-black text-white ring-2 ring-background animate-pulse">
                              {broadcastCount}
                          </span>
                      )}
                      <div className="absolute left-full ml-4 px-2 py-1 bg-amber-500 text-white text-[9px] font-black uppercase rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                          Updates
                      </div>
                  </button>

                   <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                      <PopoverTrigger asChild>
                          <button className="relative text-gray-400 hover:text-primary transition-all p-1.5 rounded-full hover:bg-primary/5 group/btn">
                              <Bell className={cn("w-5 h-5", unreadCount > 0 && "text-primary")} />
                              {unreadCount > 0 && (
                                  <span className="absolute top-0.5 right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive text-[7px] font-black text-white ring-2 ring-background">
                                      {unreadCount}
                                  </span>
                              )}
                              <div className="absolute left-full ml-4 px-2 py-1 bg-destructive text-white text-[9px] font-black uppercase rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap z-50">
                                  Alerts
                              </div>
                          </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" side="right" className="w-[85vw] sm:w-80 p-0 apple-glass border-none shadow-2xl ml-2">
                            <div className="p-3 border-b border-white/5 bg-secondary/10 flex items-center justify-between">
                                <h3 className="font-black text-[9px] uppercase tracking-widest opacity-60">Notifications</h3>
                            </div>
                            <ScrollArea className="h-80">
                                {notifications?.length === 0 ? (
                                    <div className="p-10 text-center text-[9px] text-muted-foreground uppercase font-black opacity-30">No new messages</div>
                                ) : notifications?.map(n => (
                                    <div key={n.id} className={cn("p-3 border-b border-white/5 transition-colors cursor-pointer", n.isRead ? "opacity-40" : "bg-primary/5")} onClick={() => handleNotificationClick(n)}>
                                        <p className="font-bold text-xs leading-tight">{n.title}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{n.description}</p>
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
    <header className={cn("flex flex-col shrink-0 bg-transparent transition-all", className)}>
        <div className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6">
            <Logo />
            <div className="flex items-center space-x-3">
                {isLoggedIn && (
                    <>
                        <ThemeToggle />
                        <UserNav userProfile={userProfile} />
                    </>
                )}
            </div>
        </div>
    </header>
  );
}
