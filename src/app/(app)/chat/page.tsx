'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatPageContent } from '@/components/chat/ChatPageContent';
import { useSearchParams } from 'next/navigation';

export default function ChatPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const chatId = searchParams.get('chatId') || undefined;

  const userProfileRef = useMemoFirebase(() =>
    firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile || null);

  if (isLoading) {
    return (
      <div className="flex-1 m-4 lg:m-6 h-[calc(100vh-8rem)]">
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    );
  }

  if (!userProfile) return null;

  return (
    <main className="flex-1 flex flex-col min-h-0 h-full">
      <ChatPageContent
        currentUserProfile={userProfile}
        permissions={permissions}
        initialChatId={chatId}
      />
    </main>
  );
}
