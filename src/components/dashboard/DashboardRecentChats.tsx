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
        <section className="card-bg rounded-2xl p-6 shadow-lg animate-slide-up-fade" style={{ animationDelay: '200ms' }}>
            <h3 className="text-lg font-bold font-headline tracking-tight mb-6">Recent Chats</h3>
            <div className="space-y-6">
                {isLoading ? (
                    Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
                ) : chats?.map((chat, idx) => (
                    <div 
                        key={chat.id} 
                        className="flex items-start space-x-3 cursor-pointer hover:bg-primary/5 p-2 -m-2 rounded-xl transition-all interactive-element group" 
                        onClick={() => uiEmitter.emit('open-chat-dialog', { chatId: chat.id })}
                        style={{ animationDelay: `${250 + (idx * 50)}ms` }}
                    >
                        <Avatar className="w-10 h-10 border shadow-sm group-hover:border-primary/50 transition-colors">
                            <AvatarFallback className="font-bold text-xs bg-secondary">{getChatTitle(chat).split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                                <span className="font-bold text-sm text-foreground truncate pr-2 group-hover:text-primary transition-colors">{getChatTitle(chat)}</span>
                                {chat.lastMessage && (
                                    <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-widest">
                                        {formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: true })}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate italic">"{chat.lastMessage?.text || 'No messages yet'}"</p>
                        </div>
                    </div>
                ))}
                {!isLoading && (!chats || chats.length === 0) && (
                    <p className="text-center text-xs text-muted-foreground py-4 italic">No recent conversations.</p>
                )}
            </div>
        </section>
    );
}