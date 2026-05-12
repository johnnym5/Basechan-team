'use client';
import { UserNav } from "@/components/layout/UserNav";
import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
import type { UserProfile, Notification, Attendance, SystemConfig } from '@/lib/types';
import { Bell, Search as SearchIcon, CheckCircle2, Circle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { UniversalSearch } from '@/components/layout/UniversalSearch';
import { playNotificationSound, showBrowserNotification } from '@/lib/notifications';
import { useRouter } from 'next/navigation';

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
  const prevUnreadCount = useRef(0);

  useEffect(() => {
    const hour = new Date().getHours();
    let timeGreeting = 'Good Morning';
    if (hour >= 12 && hour < 17) timeGreeting = 'Good Afternoon';
    else if (hour >= 17) timeGreeting = 'Good Evening';
    
    // Determine the name to use, avoiding the generic 'Personnel' fallback if possible.
    const rawName = (userProfile?.fullName && userProfile.fullName !== 'Personnel')
        ? userProfile.fullName
        : user?.displayName
        ? user.displayName
        : user?.email
        ? user.email.split('@')[0].split(/[._-]/).join(' ')
        : 'Personnel';

    // Extract first name and capitalize for professional display
    const firstName = rawName.split(' ')[0];
    const formattedName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

    setGreeting(`${timeGreeting}, ${formattedName}`);
  }, [userProfile, user]);

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

  return (
    <header className={cn("h-20 flex items-center justify-between px-8 shrink-0 bg-transparent transition-all", className)}>
        <div className="flex flex-col">
            <h2 className="text-2xl font-bold font-headline tracking-tight text-foreground">{greeting}</h2>
            {userProfile && (
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-in fade-in duration-500">
                    Secured Node: {userProfile.orgId}
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
    </header>
  );
}
