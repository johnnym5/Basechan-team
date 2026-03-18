'use client';
import { UserNav } from "@/components/layout/UserNav";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, orderBy, writeBatch, limit } from 'firebase/firestore';
import type { UserProfile, Notification, Attendance, SystemConfig, DailyReport } from '@/lib/types';
import { showBrowserNotification } from '@/lib/notifications';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Bell, CheckCheck } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { format, formatDistanceToNow } from 'date-fns';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';
import { UniversalSearch } from '@/components/layout/UniversalSearch';
import { uiEmitter } from '@/lib/ui-emitter';


export default function AppHeader({ 
  userProfile, 
  onMenuClick, 
  isLoggedIn,
  attendanceRecord,
  systemConfig
} : { 
  userProfile: UserProfile | null, 
  onMenuClick: () => void, 
  isLoggedIn: boolean,
  attendanceRecord: Attendance | null,
  systemConfig: SystemConfig | null
}) {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [shownNotificationIds, setShownNotificationIds] = useState<Set<string>>(new Set());
  const [greeting, setGreeting] = useState("Good Morning");
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [animateGreeting, setAnimateGreeting] = useState(false);
  const [todayForReport, setTodayForReport] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
        const now = new Date();
        setCurrentTime(format(now, 'h:mm:ss a'));
        setCurrentDate(format(now, 'EEEE, MMMM d'));
    }, 1000);

    const animationTimer = setInterval(() => {
        setAnimateGreeting(true);
        setTimeout(() => setAnimateGreeting(false), 1000); 
    }, 30000);

    return () => {
        clearInterval(timer);
        clearInterval(animationTimer);
    };
  }, []);

  useEffect(() => {
    // Set date on client side to avoid hydration mismatch
    setTodayForReport(format(new Date(), 'yyyy-MM-dd'));
  }, []);


  useEffect(() => {
    const updateGreeting = () => {
        const now = new Date();
        const hour = now.getHours();
        const isClockedInAndWorking = !!(attendanceRecord && !attendanceRecord.clockOut);
        let newGreeting = "";

        if (systemConfig?.work_hours?.start && systemConfig.work_hours.end) {
            const [startHour, startMinute] = systemConfig.work_hours.start.split(':').map(Number);
            const officeStartTime = new Date();
            officeStartTime.setHours(startHour, startMinute, 0, 0);

            const [endHour, endMinute] = systemConfig.work_hours.end.split(':').map(Number);
            const officeEndTime = new Date();
            officeEndTime.setHours(endHour, endMinute, 0, 0);

            const clockInReminderStart = new Date(officeStartTime.getTime() - 15 * 60000);
            const clockInGraceEnd = new Date(officeStartTime.getTime() + 15 * 60000);
            const clockOutReminderStart = new Date(officeEndTime.getTime() - 15 * 60000);

            if (isClockedInAndWorking) {
                if (now > officeEndTime) {
                    newGreeting = "Time to clock out!";
                } else if (now >= clockOutReminderStart) {
                    newGreeting = "Winding down?";
                }
            } else { // Not clocked in or already clocked out
                if (now >= clockInReminderStart && now <= clockInGraceEnd) {
                    newGreeting = "Time to clock in!";
                } else if (now > clockInGraceEnd && now < officeEndTime) {
                    newGreeting = "Running late...";
                }
            }
        }

        // Fallback to generic greeting if no specific message was set
        if (!newGreeting) {
            if (hour < 12) {
                newGreeting = "Good Morning";
            } else if (hour < 17) { // 5 PM
                newGreeting = "Good Afternoon";
            } else {
                newGreeting = "Good Evening";
            }
        }

        setGreeting(newGreeting);
    };

    updateGreeting();
    const intervalId = setInterval(updateGreeting, 60000); // Update every minute

    return () => clearInterval(intervalId);
  }, [attendanceRecord, systemConfig]);


  // --- Start of logic from Notifications ---
  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
    );
  }, [firestore, user]);

  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  
  const dailyReportQuery = useMemoFirebase(() => {
    if (!firestore || !user || !todayForReport) return null;
    return query(
        collection(firestore, 'daily_reports'),
        where('userId', '==', user.uid),
        where('reportDate', '==', todayForReport),
        limit(1)
    );
  }, [firestore, user, todayForReport]);

  const { data: dailyReportData } = useCollection<DailyReport>(dailyReportQuery);
  const hasSubmittedReportToday = (dailyReportData?.length ?? 0) > 0;

  useEffect(() => {
    if (typeof window === 'undefined' || !systemConfig?.work_hours?.end || !user) return;
    
    const checkReportReminder = () => {
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        const reportReminderKey = `report-reminder-sent-${todayStr}`;

        if (localStorage.getItem(reportReminderKey) || hasSubmittedReportToday) {
            return;
        }

        const [endHour, endMinute] = systemConfig.work_hours.end.split(':').map(Number);
        const officeEndTime = new Date();
        officeEndTime.setHours(endHour, endMinute, 0, 0);

        const reminderTime = new Date(officeEndTime.getTime() - 60 * 60000); // 1 hour before end of day

        if (now > reminderTime && now < officeEndTime) {
            showBrowserNotification(
                'End of Day Report',
                { body: "Don't forget to submit your daily report before you sign out." },
                'daily-report-reminder'
            );
            localStorage.setItem(reportReminderKey, 'true');
        }
    };
    
    // Check every 5 minutes
    const intervalId = setInterval(checkReportReminder, 300000);

    return () => clearInterval(intervalId);

  }, [systemConfig, user, hasSubmittedReportToday]);


  useEffect(() => {
    if (!notifications || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    
    const newUnreadNotifications = notifications.filter(
      n => !n.isRead && !shownNotificationIds.has(n.id)
    );
  
    if (newUnreadNotifications.length > 0) {
      const latestNotification = newUnreadNotifications[0];
      
      showBrowserNotification(
        latestNotification.title,
        {
          body: latestNotification.description,
          tag: latestNotification.id,
        },
        latestNotification.id
      );

      setShownNotificationIds(prev => {
        const newSet = new Set(prev);
        newUnreadNotifications.forEach(n => newSet.add(n.id));
        return newSet;
      });
    }
  }, [notifications, shownNotificationIds]);

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
        const notifRef = doc(firestore, 'notifications', notification.id);
        updateDocumentNonBlocking(notifRef, { isRead: true });
    }
    
    if (notification.href.startsWith('/chat')) {
        const urlParams = new URLSearchParams(notification.href.split('?')[1]);
        const chatId = urlParams.get('chatId');
        if (chatId) {
            uiEmitter.emit('open-chat-dialog', { chatId });
        } else {
            uiEmitter.emit('open-chat-dialog');
        }
    } else {
      router.push(notification.href);
    }
    setIsNotificationsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    if (!firestore || !notifications || unreadCount === 0) return;
    
    const batch = writeBatch(firestore);
    notifications.forEach(n => {
        if (!n.isRead) {
            const notifRef = doc(firestore, 'notifications', n.id);
            batch.update(notifRef, { isRead: true });
        }
    });
    batch.commit();
  };
  // --- End of logic from Notifications ---

  return (
    <header className="sticky top-0 z-40 glass-dark px-4 sm:px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden size-10 rounded-full flex items-center justify-center bg-slate-800/50 border border-slate-700" onClick={onMenuClick}>
            <span className="material-symbols-outlined text-xl">menu</span>
        </Button>
        {isLoggedIn && userProfile ? (
          <div className="flex items-center gap-3">
            <Avatar className="size-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 overflow-hidden">
                <AvatarImage src={userProfile.avatarUrl || user?.photoURL || ''} alt={userProfile.fullName} />
                <AvatarFallback>{userProfile.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
                <div className="flex items-baseline gap-2">
                    <h2 className={cn("text-base font-bold transition-all duration-300", animateGreeting && "text-primary scale-105")}>{greeting}</h2>
                    <span className="text-xs text-muted-foreground font-mono">{currentTime}</span>
                </div>
                <p className="text-sm text-muted-foreground">{userProfile.fullName} | {currentDate}</p>
            </div>
          </div>
        ) : null}
      </div>
      {isLoggedIn && userProfile && (
        <div className='flex items-center gap-2'>
            <UniversalSearch userProfile={userProfile} />
            <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-10 rounded-full flex items-center justify-center bg-slate-800/50 border border-slate-700 relative">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 size-2 bg-primary rounded-full border-2 border-background"></span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                    <div className="p-3 flex items-center justify-between border-b">
                        <h3 className="font-semibold text-sm">Notifications</h3>
                        <Button variant="link" size="sm" onClick={handleMarkAllAsRead} disabled={unreadCount === 0} className="text-xs h-auto p-0">
                            <CheckCheck className="mr-1 h-3 w-3" /> Mark all as read
                        </Button>
                    </div>
                    <ScrollArea className="h-96">
                        {!notifications || notifications.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground py-16">No new notifications</p>
                        ) : (
                            <div className="divide-y divide-border">
                                {notifications.map(n => (
                                    <div key={n.id} onClick={() => handleNotificationClick(n)} 
                                        className={cn("p-3 flex items-start gap-3 hover:bg-accent cursor-pointer", !n.isRead && "bg-primary/5 hover:bg-primary/10")}
                                    >
                                        {!n.isRead && <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0"></div>}
                                        <div className={cn("flex-1", n.isRead && "pl-5")}>
                                            <p className="text-sm font-semibold">{n.title}</p>
                                            <p className="text-sm text-muted-foreground">{n.description}</p>
                                            <p className="text-xs text-muted-foreground/70 mt-1">
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

            <div className="hidden md:block">
                <UserNav userProfile={userProfile} />
            </div>
        </div>
      )}
    </header>
  );
}
