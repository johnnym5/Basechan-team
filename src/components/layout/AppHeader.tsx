'use client';
import { UserNav } from "@/components/layout/UserNav";
import { useState, useEffect, useRef } from 'react';
import { useUser, useMemoFirebase, useCollection, updateDocumentNonBlocking, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
import type { UserProfile, Notification, Attendance, SystemConfig, Announcement, Task, Chat } from '@/lib/types';
import { Bell, Sparkles, Megaphone } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UniversalSearch } from '@/components/layout/UniversalSearch';
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
  const [greeting, setGreeting] = useState('Mission Control');
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
      let timeGreeting = 'Good Morning';
      if (hour >= 12 && hour < 17) timeGreeting = 'Good Afternoon';
      else if (hour >= 17 && hour < 22) timeGreeting = 'Good Evening';
      else if (hour >= 22 || hour < 5) timeGreeting = 'Good Night';
      
      const rawName = userProfile?.fullName || user?.displayName || 'Personnel';
      const firstName = rawName.split(' ')[0];
      setGreeting(`${timeGreeting}, ${firstName}`);
    };
    updateGreeting();
  }, [userProfile, user]);

  const notificationsQuery = useMemoFirebase(() => 
    firestore && user ? query(collection(firestore, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(20)) : null
  , [firestore, user]);
  
  const announcementsQuery = useMemoFirebase(() => 
    firestore && userProfile ? query(collection(firestore, 'announcements'), where('orgId', '==', userProfile.orgId), orderBy('createdAt', 'desc'), limit(3)) : null
  , [firestore, userProfile]);

  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  const { data: announcements } = useCollection<Announcement>(announcementsQuery);

  const unreadNotifications = notifications?.filter(n => !n.isRead) || [];
  const unreadCount = unreadNotifications.length;

  useEffect(() => {
    if (unreadCount > prevUnreadCount.current) {
        const latest = unreadNotifications[0];
        if (latest) {
            playNotificationSound();
            showBrowserNotification("StaffPortal Alert", latest.title, latest.id);
        }
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount, unreadNotifications]);

  const handleNotificationClick = (n: Notification) => {
    if (firestore) updateDocumentNonBlocking(doc(firestore, 'notifications', n.id), { isRead: true });
    setIsNotificationsOpen(false);
    router.push(n.href);
  };

  const handleOpenDebrief = () => {
    uiEmitter.emit('open-assistant-dialog');
  };

  const handleOpenAnnouncements = () => {
    // Navigate home if not there, then scroll to announcements or just trigger panel
    window.location.href = '/';
  };

  if (isVertical) {
      return (
          <div className="flex flex-col items-center gap-6 py-6 border-b border-white/5">
              <div className="shrink-0"><Logo /></div>
              <div className="flex flex-col items-center gap-4">
                  <UserNav userProfile={userProfile} />
                  <ThemeToggle />
                  
                  {/* Tactical Debrief Button */}
                  <button 
                    onClick={handleOpenDebrief}
                    className="relative text-gray-400 hover:text-amber-500 transition-all p-2 rounded-full hover:bg-amber-500/5 group/btn"
                    title="Mission Debrief"
                  >
                      <Sparkles className="w-6 h-6" />
                      <div className="absolute left-full ml-4 px-2 py-1 bg-amber-500 text-white text-[10px] font-black uppercase rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap z-50">
                          Briefing
                      </div>
                  </button>

                  {/* Broadcast Indicator */}
                  <button 
                    onClick={handleOpenAnnouncements}
                    className="relative text-gray-400 hover:text-primary transition-all p-2 rounded-full hover:bg-primary/5 group/btn"
                    title="Organizational Broadcasts"
                  >
                      <Megaphone className="w-6 h-6" />
                      {announcements && announcements.length > 0 && (
                          <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[8px] font-black text-white ring-2 ring-background">
                              {announcements.length}
                          </span>
                      )}
                       <div className="absolute left-full ml-4 px-2 py-1 bg-primary text-white text-[10px] font-black uppercase rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap z-50">
                          Broadcasts
                      </div>
                  </button>

                   <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                      <PopoverTrigger asChild>
                          <button className="relative text-gray-400 hover:text-primary transition-all p-2 rounded-full hover:bg-primary/5 group/btn">
                              <Bell className={cn("w-6 h-6", unreadCount > 0 && "text-primary")} />
                              {unreadCount > 0 && (
                                  <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-destructive text-[8px] font-black text-white ring-2 ring-background">
                                      {unreadCount}
                                  </span>
                              )}
                              <div className="absolute left-full ml-4 px-2 py-1 bg-destructive text-white text-[10px] font-black uppercase rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap z-50">
                                  Alerts
                              </div>
                          </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" side="right" className="w-[90vw] sm:w-96 p-0 apple-glass border-none shadow-3xl overflow-hidden ml-2">
                            <div className="p-4 border-b border-white/5 bg-secondary/20 flex items-center justify-between">
                                <h3 className="font-bold text-xs uppercase tracking-widest">Alerts</h3>
                            </div>
                            <ScrollArea className="h-96">
                                {notifications?.length === 0 ? (
                                    <div className="p-12 text-center text-xs text-muted-foreground uppercase font-black opacity-30">Zero Alerts</div>
                                ) : notifications?.map(n => (
                                    <div key={n.id} className={cn("p-4 border-b border-white/5 transition-colors cursor-pointer", n.isRead ? "opacity-60" : "bg-primary/5")} onClick={() => handleNotificationClick(n)}>
                                        <p className="font-bold text-sm">{n.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{n.description}</p>
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
        <div className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8">
            <Logo />
            <div className="flex items-center space-x-2 md:space-x-4">
                {isLoggedIn && (
                    <>
                        <div className="hidden lg:block"><UniversalSearch userProfile={userProfile!} /></div>
                        <ThemeToggle />
                        <UserNav userProfile={userProfile} />
                    </>
                )}
            </div>
        </div>
    </header>
  );
}
