
'use client';

import { Firestore, collection, doc, writeBatch } from 'firebase/firestore';
import { Database, ref, set, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import { updateDocumentNonBlocking } from '@/firebase';
import type { Chat, ChatMessage, UserProfile, Notification } from '@/lib/types';
import { sanitizeInput } from '@/lib/utils';
import { activityService } from './activity-service';

/**
 * Service to handle real-time communication, read receipts, and typing indicators.
 */
export const chatService = {
    /**
     * Sends a message and updates the chat metadata in a single transaction.
     */
    async sendMessage(db: Firestore, chat: Chat, user: UserProfile, content: string, asset?: ChatMessage['asset']) {
        const now = new Date().toISOString();
        const messagesRef = collection(db, 'chats', chat.id, 'messages');
        const notificationsRef = collection(db, 'notifications');

        const messageContent = sanitizeInput(content);
        
        const messageData: Omit<ChatMessage, 'id'> = {
            chatId: chat.id,
            orgId: user.orgId,
            senderId: user.id,
            senderName: user.fullName,
            content: messageContent,
            timestamp: now,
            asset: asset || undefined,
        };

        const batch = writeBatch(db);
        
        // 1. Create the message document
        const newMessageRef = doc(messagesRef);
        batch.set(newMessageRef, messageData);
        
        // 2. Update the parent chat with the last message preview
        const chatRef = doc(db, 'chats', chat.id);
        batch.update(chatRef, {
            lastMessage: {
                text: asset ? `[Shared ${asset.type}] ${asset.title}` : messageContent,
                senderId: user.id,
                senderName: user.fullName,
                timestamp: now,
            },
            [`readReceipts.${user.id}`]: now,
            updatedAt: now
        });
        
        // 3. Generate notifications for other participants
        chat.participants.forEach(participantId => {
            if (participantId !== user.id) {
                const notifRef = doc(notificationsRef);
                const notification: Omit<Notification, 'id'> = {
                    orgId: user.orgId,
                    userId: participantId,
                    title: `New message from ${user.fullName}`,
                    description: asset ? `Shared a ${asset.type.toLowerCase()}` : messageContent,
                    href: `/?panel=chat&chatId=${chat.id}`,
                    isRead: false,
                    createdAt: now,
                };
                batch.set(notifRef, notification);
            }
        });

        // Activity points: +1 for message sent
        activityService.logActivity(db, user, 1);

        return await batch.commit();
    },

    /**
     * Updates the user's typing status in RTDB.
     */
    async setTypingStatus(rtdb: Database, chatId: string, userId: string, isTyping: boolean) {
        const typingRef = ref(rtdb, `chats/${chatId}/typing/${userId}`);
        return set(typingRef, isTyping ? rtdbTimestamp() : null);
    },

    /**
     * Updates the user's last viewed timestamp for a specific chat.
     */
    async markAsRead(db: Firestore, chatId: string, userId: string) {
        const chatRef = doc(db, 'chats', chatId);
        return updateDocumentNonBlocking(chatRef, {
            [`readReceipts.${userId}`]: new Date().toISOString()
        });
    }
};
