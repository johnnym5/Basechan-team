
'use client';
import { Firestore, doc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import type { Requisition, UserProfile, ActivityEntry, RequisitionStatus, PurchaseOrder, Notification } from '@/lib/types';

export const PROCUREMENT_WORKFLOW: Record<RequisitionStatus, { next: RequisitionStatus; role: string }> = {
    'PENDING_HR': { next: 'PENDING_FINANCE', role: 'HR_MANAGER' },
    'PENDING_FINANCE': { next: 'PENDING_MD', role: 'FINANCE_MANAGER' },
    'PENDING_MD': { next: 'APPROVED', role: 'MANAGING_DIRECTOR' },
    'APPROVED': { next: 'PAID', role: 'FINANCE_MANAGER' },
    'PAID': { next: 'PAID', role: 'FINANCE_MANAGER' },
    'REJECTED': { next: 'REJECTED', role: 'STAFF' },
};

/**
 * Advances a requisition through the approval stages.
 * Automatically generates a Purchase Order when MD approves.
 */
export async function advanceRequisition(
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
    
    // We don't await this to keep the UI snappy
    updateDocumentNonBlocking(reqRef, {
        status: nextStatus,
        activity: arrayUnion(activityEntry)
    });

    // Side Effect: Auto-generate Purchase Order if MD approves
    if (nextStatus === 'APPROVED' && requisition.vendorId) {
        await generatePurchaseOrderFromRequisition(db, requisition, actor);
    }

    // Internal Notification
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
}

async function generatePurchaseOrderFromRequisition(db: Firestore, requisition: Requisition, actor: UserProfile) {
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
        items: [
            {
                description: requisition.description,
                quantity: 1,
                unitPrice: requisition.amount,
                total: requisition.amount
            }
        ],
        createdAt: new Date().toISOString(),
        createdBy: actor.id
    };

    await addDocumentNonBlocking(poRef, newPO);
}
