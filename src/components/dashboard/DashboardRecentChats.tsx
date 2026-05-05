'use client';

import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase";
import type { UserProfile, Chat } from "@/lib/types";
import { doc, collection, query, where, orderBy, limit } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import { uiEmitter } from "@/lib/ui-emitter";
import { Avatar, AvatarFallback } from "../ui/avatar";

export function DashboardRecentChats() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() =>
        authUser ? doc(firestore, "users", authUser.uid) : null,
        [firestore, authUser]
    );
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const chatsQuery = useMemoFirebase(() => {
        if (!userProfile) return null;
        return query(
            collection(firestore, 'chats'),
            where('participants', 'array-contains', userProfile.id),
            orderBy('updatedAt', 'desc'),
            limit(4)
        );
    }, [firestore, userProfile]);

    const { data: chats, isLoading } = useCollection<Chat>(chatsQuery);

    const getChatTitle = (chat: Chat) => {
        if (chat.type === 'CHANNEL') return `# ${chat.name}`;
        const otherParticipantId = chat.participants.find(p => p !== userProfile?.id);
        if (!otherParticipantId) return "Unknown User";
        return chat.participantProfiles[otherParticipantId]?.fullName || "Unknown User";
    }

    return (
        <section className="card-bg rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-6">Recent Chats</h3>
            <div className="space-y-6">
                {isLoading ? (
                    Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
                ) : chats?.map(chat => (
                    <div key={chat.id} className="flex items-start space-x-3 cursor-pointer hover:bg-gray-800/50 p-2 -m-2 rounded-lg transition-colors" onClick={() => uiEmitter.emit('open-chat-dialog', { chatId: chat.id })}>
                        <Avatar className="w-10 h-10 border border-gray-700">
                            <AvatarFallback>{getChatTitle(chat).split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                                <span className="font-medium text-sm text-gray-200 truncate pr-2">{getChatTitle(chat)}</span>
                                {chat.lastMessage && (
                                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                        {formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: true })}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 truncate">{chat.lastMessage?.text || 'No messages yet'}</p>
                        </div>
                    </div>
                ))}
                {!isLoading && (!chats || chats.length === 0) && (
                    <p className="text-center text-xs text-gray-500 py-4">No recent conversations.</p>
                )}
            </div>
        </section>
    );
}