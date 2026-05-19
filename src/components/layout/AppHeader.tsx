'use client';
import { UserNav } from "@/components/layout/UserNav";
import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useDoc, useMemoFirebase, useCollection, updateDocumentNonBlocking, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
import type { UserProfile, Notification, Attendance, SystemConfig, Announcement, Task, Chat } from '@/lib/types';
import { Bell, Zap, Megaphone, CheckCircle2, Circle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UniversalSearch } from '@/components/layout/UniversalSearch';
import { playNotificationSound, showBrowserNotification } from '@/lib/notifications';
import { useRouter } from 'next/navigation';
import { AnnouncementDetailDialog } from '@/components/dashboard/AnnouncementDetailDialog';
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
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isBriefing, setIsBriefing] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const prevUnreadCount = useRef(0);

  useEffect(() => {
    const updateTime = () => setCurrentTime(format(new Date(), 'HH:mm'));
    updateTime();
    const clockInterval = setInterval(updateTime, 10000);
    const briefingTimer = setTimeout(() => setIsBriefing(false), 5000);
    return () => {
        clearInterval(clockInterval);
        clearTimeout(briefingTimer);
    };
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
  const tasksQuery = useMemoFirebase(() => 
    firestore && user ? query(collection(firestore, 'tasks'), where('assignedTo', '==', user.uid)) : null
  , [firestore, user]);
  const chatsQuery = useMemoFirebase(() => 
    firestore && user ? query(collection(firestore, 'chats'), where('participants', 'array-contains', user.uid)) : null
  , [firestore, user]);

  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  const { data: tasks } = useCollection<Task>(tasksQuery);
  const { data: chats } = useCollection<Chat>(chatsQuery);

  const unreadNotifications = notifications?.filter(n => !n.isRead) || [];
  const unreadCount = unreadNotifications.length;
  const activeTasksCount = tasks?.filter(t => t.status !== 'ARCHIVED').length || 0;
  const unreadChatsCount = chats?.filter(c => {
      const lastRead = c.readReceipts?.[user?.uid || ''];
      return !lastRead || (c.lastMessage && new Date(c.lastMessage.timestamp) > new Date(lastRead));
  }).length || 0;

  const announcementsQuery = useMemoFirebase(() => 
    firestore && userProfile ? query(collection(firestore, 'announcements'), where('orgId', '==', userProfile.orgId), orderBy('createdAt', 'desc'), limit(3)) : null
  , [firestore, userProfile]);
  const { data: announcements } = useCollection<Announcement>(announcementsQuery);
  const latestAnnouncement = announcements?.[0] || null;

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

  if (isVertical) {
      return (
          <div className="flex flex-col items-center gap-6 py-6 border-b border-white/5">
              <div className="shrink-0"><Logo /></div>
              <div className="flex flex-col items-center gap-4">
                  <UserNav userProfile={userProfile} />
                  <ThemeToggle />
                   <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                      <PopoverTrigger asChild>
                          <button className="relative text-gray-400 hover:text-primary transition-all p-2 rounded-full hover:bg-primary/5">
                              <Bell className={cn("w-6 h-6", unreadCount > 0 && "text-primary")} />
                              {unreadCount > 0 && (
                                  <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-destructive text-[8px] font-black text-white ring-2 ring-background">
                                      {unreadCount}
                                  </span>
                              )}
                          </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" side="right" className="w-[90vw] sm:w-96 p-0 apple-glass border-none shadow-3xl overflow-hidden ml-2">
                            <div className="p-4 border-b border-white/5 bg-secondary/20 flex items-center justify-between">
                                <h3 className="font-bold text-xs uppercase tracking-widest">Alerts</h3>
                            </div>
                            <ScrollArea className="h-96">
                                {notifications?.map(n => (
                                    <div key={n.id} className={cn("p-4 border-b border-white/5 transition-colors cursor-pointer", n.isRead ? "opacity-60" : "bg-primary/5")} onClick={() => handleNotificationClick(n)}>
                                        <p className="font-bold text-sm">{n.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{n.description}</p>
                                    </div>
                                ))}
                            </ScrollArea>
                      </PopoverContent>
                  </Popover>
                  <div className="hidden group-hover:flex flex-col items-center mt-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary truncate max-w-[150px]">{greeting}</p>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Status: Operational</p>
                  </div>
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
