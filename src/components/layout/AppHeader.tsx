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
import { Bell, CheckCheck, Menu, BookCopy, ChevronDown, ChevronUp, ZapOff } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { UniversalSearch } from '@/components/layout/UniversalSearch';
import { uiEmitter } from '@/lib/ui-emitter';
import { mainNavItems } from '@/lib/nav-items';
import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';
import { ORG_NAME } from '@/lib/config';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { Badge } from '../ui/badge';

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
  const permissions = usePermissions(userProfile);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [shownNotificationIds, setShownNotificationIds] = useState<Set<string>>(new Set());
  const [greeting, setGreeting] = useState("Good Morning");
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [animateGreeting, setAnimateGreeting] = useState(false);
  const [todayForReport, setTodayForReport] = useState('');
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);

  const { isIdle } = useIdleTimer(attendanceRecord);

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
            } else {
                if (now >= clockInReminderStart && now <= clockInGraceEnd) {
                    newGreeting = "Time to clock in!";
                } else if (now > clockInGraceEnd && now < officeEndTime) {
                    newGreeting = "Running late...";
                }
            }
        }

        if (!newGreeting) {
            if (hour < 12) newGreeting = "Good Morning";
            else if (hour < 17) newGreeting = "Good Afternoon";
            else newGreeting = "Good Evening";
        }

        setGreeting(newGreeting);
    };

    updateGreeting();
    const intervalId = setInterval(updateGreeting, 60000);
    return () => clearInterval(intervalId);
  }, [attendanceRecord, systemConfig]);

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

        if (localStorage.getItem(reportReminderKey) || hasSubmittedReportToday) return;

        const [endHour, endMinute] = systemConfig.work_hours.end.split(':').map(Number);
        const officeEndTime = new Date();
        officeEndTime.setHours(endHour, endMinute, 0, 0);

        const reminderTime = new Date(officeEndTime.getTime() - 60 * 60000);

        if (now > reminderTime && now < officeEndTime) {
            showBrowserNotification(
                'End of Day Report',
                { body: "Don't forget to submit your daily report before you sign out." },
                'daily-report-reminder'
            );
            localStorage.setItem(reportReminderKey, 'true');
        }
    };
    
    const intervalId = setInterval(checkReportReminder, 300000);
    return () => clearInterval(intervalId);
  }, [systemConfig, user, hasSubmittedReportToday]);

  useEffect(() => {
    if (!notifications || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    
    const newUnreadNotifications = notifications.filter(
      n => !n.isRead && !shownNotificationIds.has(n.id)
    );
  
    if (newUnreadNotifications.length > 0) {
      const latestNotification = newUnreadNotifications[0];
      showBrowserNotification(latestNotification.title, { body: latestNotification.description, tag: latestNotification.id }, latestNotification.id);
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
        uiEmitter.emit('open-chat-dialog', { chatId: chatId || undefined });
    } else {
      router.push(notification.href);
    }
    setIsNotificationsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    if (!firestore || !notifications || unreadCount === 0) return;
    const batch = writeBatch(firestore);
    notifications.forEach(n => {
        if (!n.isRead) batch.update(doc(firestore, 'notifications', n.id), { isRead: true });
    });
    batch.commit();
  };

  const handleDialogClick = (dialog: string) => {
    switch(dialog) {
      case 'chat': uiEmitter.emit('open-chat-dialog'); break;
      case 'settings': uiEmitter.emit('open-settings-dialog'); break;
      case 'tasks': uiEmitter.emit('open-tasks-dialog'); break;
      case 'workbooks': uiEmitter.emit('open-workbooks-dialog'); break;
      case 'requisitions': uiEmitter.emit('open-requisitions-dialog'); break;
      case 'attendance': uiEmitter.emit('open-attendance-dialog'); break;
      case 'leave': uiEmitter.emit('open-leave-dialog'); break;
      case 'reports': uiEmitter.emit('open-reports-dialog'); break;
      case 'profile': uiEmitter.emit('open-profile-dialog'); break;
      case 'accounting': uiEmitter.emit('open-accounting-dialog'); break;
    }
  };

  return (
    <div className="sticky top-0 z-40 w-full group/header-container">
        {/* Reveal Handle */}
        {!isHeaderVisible && isLoggedIn && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-xs flex justify-center">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsHeaderVisible(true)}
                    className="h-6 w-32 bg-primary/10 hover:bg-primary/20 backdrop-blur-xl border border-t-0 border-primary/30 rounded-b-2xl flex items-center justify-center gap-2 group shadow-2xl shadow-primary/20 transition-all animate-fade-in-down pointer-events-auto"
                >
                    <div className="w-8 h-0.5 bg-primary/40 rounded-full group-hover:bg-primary transition-colors" />
                    <ChevronDown className="h-3 w-3 text-primary/50 group-hover:text-primary transition-colors" />
                </Button>
            </div>
        )}

        <header className={cn(
            "glass-dark border-b px-4 sm:px-6 flex items-center justify-between transition-all duration-500 ease-in-out origin-top relative",
            (isHeaderVisible || !isLoggedIn) ? "py-3 opacity-100 translate-y-0" : "h-0 py-0 opacity-0 -translate-y-full overflow-hidden"
        )}>
            <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-2">
                    <BookCopy className="h-6 w-6 text-primary" />
                    <h1 className="font-bold text-lg tracking-tight hidden lg:block">{ORG_NAME}</h1>
                </Link>

                {isLoggedIn && (
                    <nav className="hidden md:flex items-center gap-1">
                        {mainNavItems.map((item, idx) => {
                            if ('isSeparator' in item) return <div key={idx} className="w-px h-4 bg-border mx-2" />;
                            if ('permission' in item && userProfile && !permissions[item.permission as keyof typeof permissions]) return null;

                            return (
                                <Button
                                    key={item.label}
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary px-3"
                                    onClick={() => 'href' in item ? router.push(item.href) : handleDialogClick(item.dialog!)}
                                >
                                    {item.label}
                                </Button>
                            );
                        })}
                    </nav>
                )}

                <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
                    <Menu className="h-6 w-6" />
                </Button>
            </div>

            {isLoggedIn && userProfile && (
                <div className='flex items-center gap-3'>
                    <UniversalSearch userProfile={userProfile} />
                    
                    <div className="hidden sm:flex flex-col items-end mr-2 text-right">
                        <div className="flex items-center gap-2">
                            {isIdle && (
                                <Badge variant="outline" className="h-5 px-1.5 bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1 animate-pulse">
                                    <ZapOff className="h-3 w-3" /> STANDBY
                                </Badge>
                            )}
                            <h2 className={cn("text-sm font-bold transition-all duration-300", animateGreeting && "text-primary")}>{greeting}</h2>
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{currentTime} | {currentDate}</p>
                    </div>

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

                    <UserNav userProfile={userProfile} />
                </div>
            )}

            {/* Hide Handle */}
            {isHeaderVisible && isLoggedIn && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsHeaderVisible(false)}
                    className="absolute bottom-[-1.5rem] left-1/2 -translate-x-1/2 h-6 w-24 bg-background/80 backdrop-blur-md border border-t-0 rounded-b-2xl flex items-center justify-center hover:bg-destructive/10 group shadow-lg transition-all"
                >
                    <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-colors" />
                </Button>
            )}
        </header>
    </div>
  );
}