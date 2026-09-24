'use client';
import { Firestore, doc, arrayUnion, collection, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import type { Requisition, UserProfile, ActivityEntry, RequisitionStatus, PurchaseOrder, Notification } from '@/lib/types';
import { sanitizeInput } from '@/lib/utils';
import { activityService } from './activity-service';

export const PROCUREMENT_WORKFLOW: Record<RequisitionStatus, { next: RequisitionStatus; role: string }> = {
    'PENDING_HR': { next: 'PENDING_FINANCE', role: 'HR_MANAGER' },
    'PENDING_FINANCE': { next: 'PENDING_MD', role: 'FINANCE_MANAGER' },
    'PENDING_MD': { next: 'APPROVED', role: 'MANAGING_DIRECTOR' },
    'APPROVED': { next: 'PAID', role: 'FINANCE_MANAGER' },
    'PAID': { next: 'PAID', role: 'FINANCE_MANAGER' },
    'REJECTED': { next: 'REJECTED', role: 'STAFF' },
};

/**
 * Pure Client-Side Procurement Service (Zero Cloud Functions)
 */
export const procurementService = {
    async createRequisition(db: Firestore, user: UserProfile, values: any, attachmentUrl?: string) {
        const idempotencyKey = values.idempotencyKey || `REQ_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const idempotencyRef = doc(db, 'idempotency_keys', String(idempotencyKey));

        const result = await runTransaction(db, async (transaction) => {
            const keySnap = await transaction.get(idempotencyRef);
            if (keySnap.exists()) {
                return { requisitionId: keySnap.data().requisitionId };
            }

            const reqsQuery = query(collection(db, 'requisitions'), where('orgId', '==', user.orgId));
            const reqsSnap = await getDocs(reqsQuery);
            const serialNo = `REQ-${String(reqsSnap.size + 1).padStart(4, '0')}`;

            const now = new Date().toISOString();
            const reqRef = doc(collection(db, 'requisitions'));

            const initialActivity: ActivityEntry = {
                type: 'LOG',
                actorId: user.id,
                actorName: user.fullName || 'Staff Member',
                timestamp: now,
                text: 'created the requisition and sent for HR approval.',
                fromStatus: 'N/A',
                toStatus: 'PENDING_HR',
            };

            const newRequisition = {
                id: reqRef.id,
                serialNo,
                orgId: user.orgId,
                createdBy: user.id,
                creatorName: user.fullName || 'Staff Member',
                title: sanitizeInput(values.title),
                amount: Number(values.amount),
                vendorId: values.vendorId || null,
                vendorName: values.vendorName || 'Unknown Vendor',
                description: sanitizeInput(values.description || ''),
                status: 'PENDING_HR',
                createdAt: now,
                activity: [initialActivity],
                attachmentUrl: attachmentUrl || null,
                attachmentName: values.attachment ? values.attachment.name : null,
            };

            transaction.set(reqRef, newRequisition);
            transaction.set(idempotencyRef, {
                idempotencyKey,
                requisitionId: reqRef.id,
                createdAt: now,
                createdBy: user.id,
            });

            return { requisitionId: reqRef.id };
        });

        activityService.logActivity(db, user, 3);

        return result?.requisitionId ? doc(db, 'requisitions', result.requisitionId) : null;
    },

    async advanceRequisition(
        db: Firestore,
        requisition: Requisition,
        actor: UserProfile,
        action: 'APPROVE' | 'REJECT' | 'PAID',
        comment?: string
    ) {
        let nextStatus: RequisitionStatus;
        let logText = '';

        if (action === 'REJECT') {
            nextStatus = 'REJECTED';
            logText = `rejected the requisition. ${comment ? 'Reason: ' + comment : ''}`;
        } else if (action === 'PAID') {
            nextStatus = 'PAID';
            logText = `confirmed payment and marked as complete. ${comment || ''}`;
        } else {
            const stage = PROCUREMENT_WORKFLOW[requisition.status];
            nextStatus = stage.next;
            logText = `approved the requisition, advancing it to ${nextStatus.replace(/_/g, ' ')}.`;
        }

        const activityEntry: ActivityEntry = {
            type: 'LOG',
            actorId: actor.id,
            actorName: actor.fullName,
            timestamp: new Date().toISOString(),
            text: logText,
            fromStatus: requisition.status,
            toStatus: nextStatus,
        };

        const reqRef = doc(db, 'requisitions', requisition.id);
        updateDocumentNonBlocking(reqRef, {
            status: nextStatus,
            activity: arrayUnion(activityEntry)
        });

        activityService.logActivity(db, actor, 3);

        if (nextStatus === 'APPROVED' && requisition.vendorId) {
            await this.generatePurchaseOrder(db, requisition, actor);
        }

        if (actor.id !== requisition.createdBy) {
            const notification: Omit<Notification, 'id'> = {
                orgId: requisition.orgId,
                userId: requisition.createdBy,
                title: `Requisition ${nextStatus.replace(/_/g, ' ')}`,
                description: `"${requisition.title}" has been updated.`,
                href: `/requisitions?reqId=${requisition.id}`,
                isRead: false,
                createdAt: new Date().toISOString(),
            };
            addDocumentNonBlocking(collection(db, 'notifications'), notification);
        }
    },

    async generatePurchaseOrder(db: Firestore, requisition: Requisition, actor: UserProfile) {
        const poRef = collection(db, 'purchase_orders');
        const q = query(poRef, where('orgId', '==', requisition.orgId));
        const snap = await getDocs(q);
        const serialNo = `PO-${String(snap.size + 1).padStart(5, '0')}`;

        const newPO: Omit<PurchaseOrder, 'id'> = {
            serialNo,
            orgId: requisition.orgId,
            vendorId: requisition.vendorId!,
            vendorName: requisition.vendorName || 'Unknown Vendor',
            requisitionId: requisition.id,
            title: requisition.title,
            totalAmount: requisition.amount,
            status: 'DRAFT',
            items: [{ description: requisition.description, quantity: 1, unitPrice: requisition.amount, total: requisition.amount }],
            createdAt: new Date().toISOString(),
            createdBy: actor.id
        };

        return await addDocumentNonBlocking(poRef, newPO);
    }
};

export const advanceRequisition = procurementService.advanceRequisition.bind(procurementService);
