'use client';
import { UserNav } from "@/components/layout/UserNav";
import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useDoc, useMemoFirebase, useCollection, updateDocumentNonBlocking, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, doc, arrayUnion } from 'firebase/firestore';
import type { UserProfile, Notification, Attendance, SystemConfig, Announcement, Task, Chat } from '@/lib/types';
import { Bell, Zap, Megaphone, CheckCircle2, Circle, Clock } from 'lucide-react';
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
}

export default function AppHeader({ 
  userProfile, 
  isLoggedIn,
  className,
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

  const activeTickerAlert = useMemo(() => {
    if (isBriefing) {
        return {
            id: 'briefing',
            label: 'DEBRIEF',
            icon: <Zap className="h-4 w-4 text-primary animate-pulse" />,
            title: greeting.toUpperCase(),
            content: `MISSIONS: ${activeTasksCount} | COMMS: ${unreadChatsCount} | ALERTS: ${unreadCount} | ${currentTime}`,
            color: 'bg-slate-900 border-b border-primary/20',
            onClick: () => uiEmitter.emit('open-assistant-dialog')
        };
    }
    if (latestAnnouncement) {
      return {
        id: latestAnnouncement.id,
        label: 'BROADCAST',
        icon: <Megaphone className="h-4 w-4 animate-bounce" />,
        title: latestAnnouncement.title,
        content: latestAnnouncement.content,
        color: 'bg-primary/95',
        onClick: () => uiEmitter.emit('open-assistant-dialog')
      };
    }
    return null;
  }, [isBriefing, activeTasksCount, unreadChatsCount, unreadCount, greeting, latestAnnouncement, currentTime]);

  return (
    <header className={cn("flex flex-col shrink-0 bg-transparent transition-all", className)}>
        {activeTickerAlert && (
            <div className={cn("h-10 text-white flex items-center overflow-hidden cursor-pointer hover:opacity-90 transition-all z-50", activeTickerAlert.color)} onClick={activeTickerAlert.onClick}>
                <div className="flex-shrink-0 bg-white/10 h-full flex items-center px-4 z-10 shadow-lg gap-2 backdrop-blur-md">
                    {activeTickerAlert.icon}
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">{activeTickerAlert.label}</span>
                </div>
                <div className="relative flex-1 overflow-hidden h-full flex items-center">
                    <p className="animate-marquee text-[10px] md:text-sm font-black uppercase tracking-tight">
                        <span className="mx-8">{activeTickerAlert.title} — {activeTickerAlert.content}</span>
                        <span className="mx-8 opacity-50">•</span>
                        <span className="mx-8">{activeTickerAlert.title} — {activeTickerAlert.content}</span>
                    </p>
                </div>
            </div>
        )}

        <div className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3">
                <div className="md:hidden"><Logo /></div>
                <div className="hidden md:flex flex-col min-w-0">
                    <h2 className="text-xl lg:text-2xl font-bold font-headline tracking-tight text-foreground truncate">{greeting}</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Organisation: {userProfile?.orgId}</p>
                </div>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
                {isLoggedIn && (
                    <>
                        <div className="hidden lg:block"><UniversalSearch userProfile={userProfile!} /></div>
                        <div className="flex items-center gap-1">
                          <ThemeToggle />
                          <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                              <PopoverTrigger asChild>
                                  <button className="relative text-gray-400 hover:text-primary transition-all interactive-element p-2 rounded-full hover:bg-primary/5">
                                      <Bell className={cn("w-5 h-5 lg:w-6 lg:h-6", unreadCount > 0 && "text-primary")} />
                                      {unreadCount > 0 && (
                                          <span className="absolute top-1.5 right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-destructive text-[8px] font-black text-white ring-2 ring-background">
                                              {unreadCount}
                                          </span>
                                      )}
                                  </button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-[90vw] sm:w-96 p-0 apple-glass border-none shadow-3xl overflow-hidden mt-2">
                                  <div className="p-4 border-b border-white/5 bg-secondary/20 flex items-center justify-between">
                                      <h3 className="font-bold text-xs uppercase tracking-widest">Alerts</h3>
                                      <button onClick={() => unreadNotifications.forEach(n => updateDocumentNonBlocking(doc(firestore!, 'notifications', n.id), { isRead: true }))} className="text-[9px] font-bold text-primary hover:underline uppercase">Clear</button>
                                  </div>
                                  <ScrollArea className="h-96">
                                      {!notifications?.length ? (
                                          <div className="flex flex-col items-center justify-center py-20 opacity-30 text-xs font-bold uppercase tracking-widest"><Bell className="h-10 w-10 mb-2" />Zero Alerts</div>
                                      ) : (
                                          <div className="divide-y divide-white/5">
                                              {notifications.map(n => (
                                                  <div key={n.id} className={cn("p-4 transition-colors cursor-pointer group flex items-start gap-4", n.isRead ? "opacity-60" : "bg-primary/5")} onClick={() => handleNotificationClick(n)}>
                                                      {n.isRead ? <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-1" /> : <Circle className="h-4 w-4 text-primary fill-primary mt-1" />}
                                                      <div className="flex-1 min-w-0">
                                                          <p className="font-bold text-sm text-foreground group-hover:text-primary">{n.title}</p>
                                                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.description}</p>
                                                          <p className="text-[9px] font-bold text-muted-foreground mt-2 uppercase">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </ScrollArea>
                              </PopoverContent>
                          </Popover>
                        </div>
                        <UserNav userProfile={userProfile} />
                    </>
                )}
            </div>
        </div>

        {selectedAnnouncement && userProfile && (
            <AnnouncementDetailDialog
                announcement={selectedAnnouncement}
                isOpen={!!selectedAnnouncement}
                onOpenChange={(open) => !open && setSelectedAnnouncement(null)}
                userProfile={userProfile}
            />
        )}
    </header>
  );
}
