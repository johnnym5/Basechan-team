'use client';
import { UserNav } from "@/components/layout/UserNav";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { UserProfile, Notification, Attendance, SystemConfig } from '@/lib/types';
import { Bell, Search as SearchIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { UniversalSearch } from '@/components/layout/UniversalSearch';

export default function AppHeader({ 
  userProfile, 
  isLoggedIn,
} : { 
  userProfile: UserProfile | null, 
  onMenuClick: () => void, 
  isLoggedIn: boolean,
  attendanceRecord: Attendance | null,
  systemConfig: SystemConfig | null
}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

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
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  return (
    <header className="h-20 flex items-center justify-between px-8 bg-transparent shrink-0">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        
        <div className="flex items-center space-x-6">
            {isLoggedIn && userProfile && (
                <>
                    <div className="relative">
                        <UniversalSearch userProfile={userProfile} />
                    </div>

                    <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                        <PopoverTrigger asChild>
                            <button className="relative text-gray-400 hover:text-white transition-colors">
                                <Bell className="w-6 h-6" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#0f1014]"></span>
                                )}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80 p-0 card-bg border-gray-800">
                             <div className="p-3 border-b border-gray-800">
                                <h3 className="font-semibold text-sm">Notifications</h3>
                            </div>
                            <ScrollArea className="h-80">
                                {!notifications || notifications.length === 0 ? (
                                    <p className="text-center text-xs text-gray-500 py-10">No notifications</p>
                                ) : (
                                    <div className="divide-y divide-gray-800">
                                        {notifications.map(n => (
                                            <div key={n.id} className="p-3 text-xs hover:bg-gray-800/50 cursor-pointer">
                                                <p className="font-medium text-gray-200">{n.title}</p>
                                                <p className="text-gray-400 mt-1 line-clamp-2">{n.description}</p>
                                                <p className="text-[10px] text-gray-500 mt-2">
                                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                                </p>
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