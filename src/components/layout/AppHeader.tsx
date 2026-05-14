'use client';
import { UserNav } from "@/components/layout/UserNav";
import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useDoc, useMemoFirebase, useCollection, updateDocumentNonBlocking, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, doc, arrayUnion } from 'firebase/firestore';
import type { UserProfile, Notification, Attendance, SystemConfig, Announcement, Task, Chat } from '@/lib/types';
import { Bell, Search as SearchIcon, CheckCircle2, Circle, Megaphone, Info, AlertTriangle, Zap, Check, MessageSquare, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UniversalSearch } from '@/components/layout/UniversalSearch';
import { playNotificationSound, showBrowserNotification } from '@/lib/notifications';
import { useRouter } from 'next/navigation';
import { AnnouncementDetailDialog } from '@/components/dashboard/AnnouncementDetailDialog';

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

  // Hydration-safe clock and briefing timer
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

  // Update Greeting
  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      let timeGreeting = 'Good Morning';
      
      if (hour >= 12 && hour < 17) {
        timeGreeting = 'Good Afternoon';
      } else if (hour >= 17 && hour < 22) {
        timeGreeting = 'Good Evening';
      } else if (hour >= 22 || hour < 5) {
        timeGreeting = 'Good Night';
      }
      
      const rawName = (userProfile?.fullName && userProfile.fullName !== 'Personnel')
          ? userProfile.fullName
          : user?.displayName
          ? user.displayName
          : user?.email
          ? user.email.split('@')[0].split(/[._-]/).join(' ')
          : 'Personnel';

      const firstName = rawName.split(' ')[0];
      const formattedName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

      setGreeting(`${timeGreeting}, ${formattedName}`);
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 300000);
    return () => clearInterval(interval);
  }, [userProfile, user]);

  // Telemetry Queries for Debrief
  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(20)
    );
  }, [firestore, user]);

  const tasksQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'tasks'),
        where('assignedTo', '==', user.uid)
    );
  }, [firestore, user]);

  const chatsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'chats'),
        where('participants', 'array-contains', user.uid)
    );
  }, [firestore, user]);

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

  // Announcements Query for Ticker
  const announcementsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(
        collection(firestore, 'announcements'),
        where('orgId', '==', userProfile.orgId),
        orderBy('createdAt', 'desc'),
        limit(3)
    );
  }, [firestore, userProfile]);

  const { data: announcements } = useCollection<Announcement>(announcementsQuery);
  
  const latestAnnouncement = useMemo(() => {
    if (!announcements || announcements.length === 0) return null;
    return announcements.find(a => a.isPinned) || announcements[0];
  }, [announcements]);

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
    if (firestore) {
        const nRef = doc(firestore, 'notifications', n.id);
        updateDocumentNonBlocking(nRef, { isRead: true });
    }
    setIsNotificationsOpen(false);
    router.push(n.href);
  };

  const handleViewAnnouncement = (ann: Announcement) => {
      if (!ann) return;
      if (firestore && user && !ann.viewedBy?.includes(user.uid)) {
          const annRef = doc(firestore, 'announcements', ann.id);
          updateDocumentNonBlocking(annRef, {
              viewedBy: arrayUnion(user.uid)
          });
      }
      setSelectedAnnouncement(ann);
  };

  // UNIFIED TICKER FEED
  const activeTickerAlert = useMemo(() => {
    if (isBriefing) {
        return {
            id: 'briefing',
            type: 'BRIEFING',
            label: 'DAILY DEBRIEF',
            icon: <Zap className="h-4 w-4 text-primary animate-pulse" />,
            title: greeting.toUpperCase(),
            content: `MISSIONS: ${activeTasksCount} | TRANSMISSIONS: ${unreadChatsCount} | ALERTS: ${unreadCount} | STATUS: OPTIMAL | TIME: ${currentTime}`,
            color: 'bg-slate-900 border-b border-primary/20',
            onClick: () => {}
        };
    }

    const items = [];
    if (latestAnnouncement) {
      items.push({
        id: latestAnnouncement.id,
        timestamp: new Date(latestAnnouncement.createdAt).getTime(),
        type: 'BROADCAST',
        label: 'BROADCAST',
        icon: <Megaphone className="h-4 w-4 animate-bounce" />,
        title: latestAnnouncement.title,
        content: latestAnnouncement.content,
        color: 'bg-primary/95',
        onClick: () => handleViewAnnouncement(latestAnnouncement)
      });
    }
    
    const newestUnread = unreadNotifications[0];
    if (newestUnread) {
      const titleLower = newestUnread.title.toLowerCase();
      const isUrgent = titleLower.includes('urgent') || titleLower.includes('denied') || titleLower.includes('rejected') || titleLower.includes('action');
      const isSuccess = titleLower.includes('success') || titleLower.includes('approved') || titleLower.includes('paid');

      items.push({
        id: newestUnread.id,
        timestamp: new Date(newestUnread.createdAt).getTime(),
        type: 'NOTIFICATION',
        label: 'TELEMETRY',
        icon: <Zap className="h-4 w-4 animate-pulse" />,
        title: newestUnread.title,
        content: newestUnread.description,
        color: isUrgent ? 'bg-rose-600' : isSuccess ? 'bg-emerald-600' : 'bg-slate-700',
        onClick: () => handleNotificationClick(newestUnread)
      });
    }
    
    return items.sort((a, b) => b.timestamp - a.timestamp)[0];
  }, [isBriefing, activeTasksCount, unreadChatsCount, unreadCount, greeting, latestAnnouncement, unreadNotifications, currentTime]);

  const markAllRead = () => {
    if (!firestore || !unreadNotifications.length) return;
    unreadNotifications.forEach(n => {
        updateDocumentNonBlocking(doc(firestore, 'notifications', n.id), { isRead: true });
    });
  };

  return (
    <header className={cn("flex flex-col shrink-0 bg-transparent transition-all", className)}>
        {activeTickerAlert && (
            <div 
                className={cn(
                    "h-10 text-white flex items-center overflow-hidden cursor-pointer hover:opacity-90 transition-all group z-50",
                    activeTickerAlert.color
                )}
                onClick={activeTickerAlert.onClick}
            >
                <div className="flex-shrink-0 bg-white/10 h-full flex items-center px-4 z-10 shadow-lg gap-2 backdrop-blur-md">
                    {activeTickerAlert.icon}
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">{activeTickerAlert.label}</span>
                </div>
                <div className="relative flex-1 overflow-hidden h-full flex items-center">
                    <p className="animate-marquee text-sm font-black uppercase tracking-tight">
                        <span className="mx-8">{activeTickerAlert.title} — {activeTickerAlert.content}</span>
                        <span className="mx-8 opacity-50">•</span>
                        <span className="mx-8">{activeTickerAlert.title} — {activeTickerAlert.content}</span>
                        <span className="mx-8 opacity-50">•</span>
                        <span className="mx-8">{activeTickerAlert.title} — {activeTickerAlert.content}</span>
                    </p>
                </div>
                <div className="flex-shrink-0 px-4 z-10 bg-gradient-to-l from-black/20 to-transparent h-full flex items-center">
                    <span className="text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                        Execute Node
                    </span>
                </div>
            </div>
        )}

        <div className="h-20 flex items-center justify-between px-8">
            <div className="flex flex-col">
                <h2 className="text-2xl font-bold font-headline tracking-tight text-foreground">{greeting}</h2>
                {userProfile && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Node: {userProfile.orgId}
                    </p>
                )}
            </div>
            
            <div className="flex items-center space-x-6">
                {isLoggedIn && (
                    <>
                        {userProfile && <UniversalSearch userProfile={userProfile} />}

                        <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                            <PopoverTrigger asChild>
                                <button className="relative text-gray-400 hover:text-primary transition-all interactive-element p-2 rounded-full hover:bg-primary/5 group">
                                    <Bell className={cn("w-6 h-6", unreadCount > 0 && "text-primary")} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-black text-white ring-2 ring-background">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-96 p-0 apple-glass border-none shadow-2xl overflow-hidden mt-2">
                                <div className="p-4 border-b border-white/5 bg-secondary/20 flex items-center justify-between">
                                    <h3 className="font-bold text-xs uppercase tracking-widest">Telemetry Alerts</h3>
                                    {unreadCount > 0 && (
                                        <button onClick={markAllRead} className="text-[9px] font-bold text-primary hover:underline uppercase tracking-tighter">
                                            Purge All
                                        </button>
                                    )}
                                </div>
                                <ScrollArea className="h-96">
                                    {!notifications || notifications.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                            <Bell className="h-10 w-10 mb-2" />
                                            <p className="text-xs font-bold uppercase tracking-widest">Zero Alerts</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-white/5">
                                            {notifications.map(n => (
                                                <div 
                                                    key={n.id} 
                                                    className={cn(
                                                        "p-4 transition-colors cursor-pointer group flex items-start gap-4",
                                                        n.isRead ? "opacity-60" : "bg-primary/5 hover:bg-primary/10"
                                                    )}
                                                    onClick={() => handleNotificationClick(n)}
                                                >
                                                    <div className="mt-1">
                                                        {n.isRead ? <CheckCircle2 className="h-4 w-4 text-muted-foreground" /> : <Circle className="h-4 w-4 text-primary fill-primary" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{n.title}</p>
                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.description}</p>
                                                        <p className="text-[9px] font-bold text-muted-foreground mt-2 uppercase tracking-tighter">
                                                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>

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
