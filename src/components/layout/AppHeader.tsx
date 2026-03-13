'use client';
import { UserNav } from "@/components/layout/UserNav";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, orderBy, writeBatch } from 'firebase/firestore';
import type { UserProfile, Notification } from '@/lib/types';
import { UniversalSearch } from './UniversalSearch';
import { showBrowserNotification } from '@/lib/notifications';
import { Avatar, AvatarFallback } from '../ui/avatar';


export default function AppHeader({ userProfile, onMenuClick } : { userProfile: UserProfile | null, onMenuClick: () => void }) {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [shownNotificationIds, setShownNotificationIds] = useState<Set<string>>(new Set());

  // --- Start of logic from Notifications ---
  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: notifications } = useCollection<Notification>(notificationsQuery);

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
    router.push(notification.href);
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
        {userProfile ? (
          <div className="hidden sm:flex items-center gap-3">
            <Avatar className="size-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 overflow-hidden">
                <AvatarFallback>{userProfile.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-slate-400 font-medium">Good Morning</p>
              <h2 className="text-sm font-bold">{userProfile.fullName}</h2>
            </div>
          </div>
        ) : null}
      </div>
      <div className='flex items-center gap-2'>
        {userProfile && (
            <div className="hidden md:block">
                <UniversalSearch userProfile={userProfile} />
            </div>
        )}
        <Button variant="ghost" size="icon" className="size-10 rounded-full flex items-center justify-center bg-slate-800/50 border border-slate-700 relative md:hidden">
            <span className="material-symbols-outlined text-xl">search</span>
        </Button>
        <Button variant="ghost" size="icon" className="size-10 rounded-full flex items-center justify-center bg-slate-800/50 border border-slate-700 relative">
            <span className="material-symbols-outlined text-xl text-slate-300">notifications</span>
            {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 size-2 bg-primary rounded-full border-2 border-background"></span>}
        </Button>
        <div className="hidden md:block">
            <UserNav userProfile={userProfile} />
        </div>
      </div>
    </header>
  );
}
