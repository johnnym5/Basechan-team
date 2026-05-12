'use client';
import { Firestore, doc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import type { Requisition, UserProfile, ActivityEntry, RequisitionStatus, PurchaseOrder, Notification } from '@/lib/types';
import { sanitizeInput } from '@/lib/utils';

export const PROCUREMENT_WORKFLOW: Record<RequisitionStatus, { next: RequisitionStatus; role: string }> = {
    'PENDING_HR': { next: 'PENDING_FINANCE', role: 'HR_MANAGER' },
    'PENDING_FINANCE': { next: 'PENDING_MD', role: 'FINANCE_MANAGER' },
    'PENDING_MD': { next: 'APPROVED', role: 'MANAGING_DIRECTOR' },
    'APPROVED': { next: 'PAID', role: 'FINANCE_MANAGER' },
    'PAID': { next: 'PAID', role: 'FINANCE_MANAGER' },
    'REJECTED': { next: 'REJECTED', role: 'STAFF' },
};

/**
 * Service to handle procurement lifecycle.
 */
export const procurementService = {
    async createRequisition(db: Firestore, user: UserProfile, values: any, attachmentUrl?: string) {
        const reqsCollection = collection(db, 'requisitions');
        const q = query(reqsCollection, where('orgId', '==', user.orgId));
        const orgReqsSnapshot = await getDocs(q);
        const newSerialNo = `REQ-${String(orgReqsSnapshot.size + 1).padStart(4, '0')}`;
        const now = new Date().toISOString();

        const initialActivity: ActivityEntry = {
            type: 'LOG',
            actorId: user.id,
            actorName: user.fullName,
            timestamp: now,
            text: `created the requisition and sent for HR approval.`,
            fromStatus: 'N/A',
            toStatus: 'PENDING_HR',
        };

        const newRequisition: Omit<Requisition, 'id'> = {
            serialNo: newSerialNo,
            orgId: user.orgId,
            createdBy: user.id,
            creatorName: user.fullName,
            title: sanitizeInput(values.title),
            amount: values.amount,
            vendorId: values.vendorId,
            vendorName: values.vendorName || 'Unknown Vendor',
            description: sanitizeInput(values.description),
            status: 'PENDING_HR',
            createdAt: now,
            activity: [initialActivity],
            attachmentUrl: attachmentUrl || null,
            attachmentName: values.attachment ? values.attachment.name : null,
        };

        return await addDocumentNonBlocking(reqsCollection, newRequisition);
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

// Maintain export for backward compatibility
export const advanceRequisition = procurementService.advanceRequisition.bind(procurementService);
