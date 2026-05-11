'use client';

import { Firestore, collection, doc, query, where, getDocs, writeBatch, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { Chat, ChatMessage, UserProfile, Notification } from '@/lib/types';
import { sanitizeInput } from '@/lib/utils';

/**
 * Service to handle real-time communication and read receipts.
 */
export const chatService = {
    /**
     * Sends a message and updates the chat metadata in a single transaction.
     */
    async sendMessage(db: Firestore, chat: Chat, user: UserProfile, content: string) {
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
        };

        const batch = writeBatch(db);
        
        // 1. Create the message document
        const newMessageRef = doc(messagesRef);
        batch.set(newMessageRef, messageData);
        
        // 2. Update the parent chat with the last message preview
        const chatRef = doc(db, 'chats', chat.id);
        batch.update(chatRef, {
            lastMessage: {
                text: messageContent,
                senderId: user.id,
                senderName: user.fullName,
                timestamp: now,
            },
            [`readReceipts.${user.id}`]: now, // Automatically mark as read by sender
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
                    description: messageContent,
                    href: `/?panel=chat&chatId=${chat.id}`,
                    isRead: false,
                    createdAt: now,
                };
                batch.set(notifRef, notification);
            }
        });

        return await batch.commit();
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
