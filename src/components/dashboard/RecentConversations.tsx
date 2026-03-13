'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase";
import type { UserProfile, Chat } from "@/lib/types";
import { doc, collection, query, where, orderBy, limit } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import { uiEmitter } from "@/lib/ui-emitter";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Hash } from "lucide-react";


export function RecentConversations() {
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
        if (!otherParticipantId) return "Unknown Chat";
        return chat.participantProfiles[otherParticipantId]?.fullName || "Unknown User";
    }

    const getAvatarFallback = (chat: Chat) => {
        if (chat.type === 'CHANNEL') return '#';
        const title = getChatTitle(chat);
        return title.split(' ').map(n => n[0]).join('');
    }
    
    const handleChatClick = (chat: Chat) => {
        uiEmitter.emit('open-chat-dialog', { initialUserId: chat.participants.find(p => p !== userProfile?.id) });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Conversations</CardTitle>
                <Button variant="link" size="sm" className="text-primary" onClick={() => uiEmitter.emit('open-chat-dialog')}>View All</Button>
            </CardHeader>
            <CardContent>
                {isLoading && (
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                )}
                {!isLoading && (!chats || chats.length === 0) && (
                    <p className="text-sm text-center text-muted-foreground py-8">No recent conversations.</p>
                )}
                {!isLoading && chats && (
                    <div className="space-y-4">
                        {chats.map(chat => (
                            <div key={chat.id} className="flex items-center gap-3 cursor-pointer" onClick={() => handleChatClick(chat)}>
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback>
                                        {chat.type === 'CHANNEL' ? <Hash className="h-4 w-4"/> : getAvatarFallback(chat)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium truncate">{getChatTitle(chat)}</p>
                                    <p className="text-xs text-muted-foreground truncate">{chat.lastMessage?.text}</p>
                                </div>
                                {chat.lastMessage && (
                                    <p className="text-xs text-muted-foreground flex-shrink-0">
                                        {formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: true })}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
