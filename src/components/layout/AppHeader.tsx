'use client';
import { UserNav } from "@/components/layout/UserNav";
import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useDoc, useMemoFirebase, useCollection, updateDocumentNonBlocking, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, doc, arrayUnion } from 'firebase/firestore';
import type { UserProfile, Notification, Attendance, SystemConfig, Announcement } from '@/lib/types';
import { Bell, Search as SearchIcon, CheckCircle2, Circle, Megaphone } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
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
  const prevUnreadCount = useRef(0);

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
      } else {
        timeGreeting = 'Good Morning';
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

  // Notifications Query
  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(20)
    );
  }, [firestore, user]);

  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  const unreadNotifications = notifications?.filter(n => !n.isRead) || [];
  const unreadCount = unreadNotifications.length;

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
    // Prefer pinned, otherwise most recent
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

  const markAllRead = () => {
    if (!firestore || !unreadNotifications.length) return;
    unreadNotifications.forEach(n => {
        updateDocumentNonBlocking(doc(firestore, 'notifications', n.id), { isRead: true });
    });
  };

  const handleViewAnnouncement = () => {
      if (!latestAnnouncement) return;
      if (firestore && user && !latestAnnouncement.viewedBy?.includes(user.uid)) {
          const annRef = doc(firestore, 'announcements', latestAnnouncement.id);
          updateDocumentNonBlocking(annRef, {
              viewedBy: arrayUnion(user.uid)
          });
      }
      setSelectedAnnouncement(latestAnnouncement);
  };

  return (
    <header className={cn("flex flex-col shrink-0 bg-transparent transition-all", className)}>
        {/* HIGH VISIBILITY TICKER */}
        {latestAnnouncement && (
            <div 
                className="h-10 bg-primary/95 text-white flex items-center overflow-hidden cursor-pointer hover:bg-primary transition-colors group"
                onClick={handleViewAnnouncement}
            >
                <div className="flex-shrink-0 bg-primary-foreground/10 h-full flex items-center px-4 z-10 shadow-lg gap-2">
                    <Megaphone className="h-4 w-4 animate-bounce" />
                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Broadcast</span>
                </div>
                <div className="relative flex-1 overflow-hidden h-full flex items-center">
                    <p className="animate-marquee text-sm font-black uppercase tracking-tight">
                        <span className="mx-8">{latestAnnouncement.title} — {latestAnnouncement.content}</span>
                        <span className="mx-8 opacity-50">•</span>
                        <span className="mx-8">{latestAnnouncement.title} — {latestAnnouncement.content}</span>
                        <span className="mx-8 opacity-50">•</span>
                        <span className="mx-8">{latestAnnouncement.title} — {latestAnnouncement.content}</span>
                    </p>
                </div>
                <div className="flex-shrink-0 px-4 z-10 bg-gradient-to-l from-primary to-transparent h-full flex items-center">
                    <span className="text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">Click to expand</span>
                </div>
            </div>
        )}

        <div className="h-20 flex items-center justify-between px-8">
            <div className="flex flex-col">
                <h2 className="text-2xl font-bold font-headline tracking-tight text-foreground">{greeting}</h2>
                {userProfile && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-in fade-in duration-500">
                        Organisation: {userProfile.orgId}
                    </p>
                )}
            </div>
            
            <div className="flex items-center space-x-6">
                {isLoggedIn && (
                    <>
                        {userProfile && (
                            <div className="relative animate-in fade-in zoom-in-95 duration-300">
                                <UniversalSearch userProfile={userProfile} />
                            </div>
                        )}

                        <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                            <PopoverTrigger asChild>
                                <button className="relative text-gray-400 hover:text-primary transition-all interactive-element p-2 rounded-full hover:bg-primary/5">
                                    <Bell className="w-6 h-6" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-black text-white ring-2 ring-background animate-pop-in">
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
                                            Purge All Alerts
                                        </button>
                                    )}
                                </div>
                                <ScrollArea className="h-96">
                                    {!notifications || notifications.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                            <Bell className="h-10 w-10 mb-2" />
                                            <p className="text-xs font-bold uppercase tracking-widest">Zero Alerts Detected</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-white/5">
                                            {notifications.map(n => (
                                                <div 
                                                    key={n.id} 
                                                    className={cn(
                                                        "p-4 transition-colors cursor-pointer group flex items-start gap-4",
                                                        n.isRead ? "opacity-60 grayscale-[50%]" : "bg-primary/5 hover:bg-primary/10"
                                                    )}
                                                    onClick={() => handleNotificationClick(n)}
                                                >
                                                    <div className="mt-1">
                                                        {n.isRead ? <CheckCircle2 className="h-4 w-4 text-muted-foreground" /> : <Circle className="h-4 w-4 text-primary fill-primary" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{n.title}</p>
                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{n.description}</p>
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
