
'use client';

import { Firestore, collection, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { Database, ref, set, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import { updateDocumentNonBlocking } from '@/firebase';
import type { Chat, ChatMessage, UserProfile, Notification } from '@/lib/types';
import { sanitizeInput } from '@/lib/utils';
import { activityService } from './activity-service';

/**
 * Service to handle real-time communication, read receipts, and typing indicators.
 * Includes automated message purging logic (24h ephemeral policy).
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
        
        // Define messageData dynamically to avoid passing undefined values to Firestore
        const messageData: any = {
            chatId: chat.id,
            orgId: user.orgId,
            senderId: user.id,
            senderName: user.fullName,
            content: messageContent,
            timestamp: now,
        };

        // Only include the asset if it was explicitly provided to prevent "undefined" field error
        if (asset) {
            messageData.asset = asset;
        }

        const batch = writeBatch(db);
        
        // 1. Create the message document
        const newMessageRef = doc(messagesRef);
        batch.set(newMessageRef, messageData);
        
        // 2. Update or create the parent chat
        const chatRef = doc(db, 'chats', chat.id);
        
        // Check if this is a virtual chat (placeholder for DMs with no history)
        const isVirtual = chat.updatedAt === '1970-01-01T00:00:00.000Z';
        
        const lastMessageUpdate = {
            text: asset ? `[Shared ${asset.type}] ${asset.title}` : messageContent,
            senderId: user.id,
            senderName: user.fullName,
            timestamp: now,
        };

        if (isVirtual) {
            const newChatData: Omit<Chat, 'id'> = {
                orgId: chat.orgId,
                type: chat.type,
                participants: chat.participants,
                participantProfiles: chat.participantProfiles,
                lastMessage: lastMessageUpdate,
                readReceipts: {
                    [user.id]: now
                },
                updatedAt: now,
            };
            batch.set(chatRef, newChatData);
        } else {
            batch.update(chatRef, {
                lastMessage: lastMessageUpdate,
                [`readReceipts.${user.id}`]: now,
                updatedAt: now
            });
        }
        
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
    },

    /**
     * Purges messages older than 24 hours from the specific chat.
     * This is a self-cleaning mechanism triggered by client interaction.
     */
    async purgeOldMessages(db: Firestore, chatId: string) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, where('timestamp', '<', twentyFourHoursAgo));
        
        try {
            const snap = await getDocs(q);
            if (snap.empty) return;

            const batch = writeBatch(db);
            snap.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`[SYSTEM] Cleared ${snap.size} legacy transmissions from node ${chatId}.`);
        } catch (e) {
            // Silently fail if rules haven't propagated yet or connection is unstable
            console.warn("Purge sequence interrupted:", e);
        }
    }
};
