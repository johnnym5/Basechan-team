
'use client';

import { Firestore, collection, getDocs, query, where, addDoc, writeBatch, doc } from 'firebase/firestore';
import { ORG_ID } from '@/lib/config';

/**
 * Service to seed and purge organizational data.
 */
export const demoDataService = {
  /**
   * Wipes all data within the primary organizational collections.
   */
  async purgeAllData(db: Firestore) {
    const collectionsToPurge = [
        'tasks', 
        'requisitions', 
        'attendance', 
        'rosters', 
        'announcements', 
        'workbooks', 
        'feedback', 
        'chats', 
        'vendors',
        'audit_logs',
        'error_logs',
        'pulse_checks',
        'activity_points'
    ];

    for (const collName of collectionsToPurge) {
        const snap = await getDocs(collection(db, collName));
        if (!snap.empty) {
            const batch = writeBatch(db);
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
    }
    
    console.log("[SYSTEM] Database Nuke Complete. Infrastructure is clear.");
  },

  async seed(db: Firestore) {
    const tasksRef = collection(db, 'tasks');
    const vendorsRef = collection(db, 'vendors');
    const reqsRef = collection(db, 'requisitions');

    // 1. Get first user to assign data to
    const usersSnap = await getDocs(query(collection(db, 'users'), where('orgId', '==', ORG_ID)));
    if (usersSnap.empty) throw new Error("No users found to assign demo data to.");
    const firstUser = { id: usersSnap.docs[0].id, ...usersSnap.docs[0].data() } as any;

    const now = new Date().toISOString();

    // 2. Seed Vendors
    const vendors = [
        { name: 'NexGen Cloud Solutions', category: 'IT', email: 'sales@nexgen.io', phone: '+1-555-0101', contactPerson: 'Alex Rivera' },
        { name: 'Office Depot Prime', category: 'Supplies', email: 'orders@odprime.com', phone: '+1-555-0102', contactPerson: 'Sarah Jenkins' },
        { name: 'Swift Logistics Int', category: 'Logistics', email: 'dispatch@swift.com', phone: '+1-555-0103', contactPerson: 'Mike Chen' }
    ];

    for (const v of vendors) {
        await addDoc(vendorsRef, { ...v, orgId: ORG_ID, rating: 4.8, isActive: true, createdAt: now });
    }

    // 3. Seed Tasks
    const tasks = [
        { title: 'Finalize Q3 Security Audit', priority: 'LEVEL_3', status: 'ACTIVE', description: 'Review firewall logs and access control lists.' },
        { title: 'Update Staff Handbook', priority: 'LEVEL_2', status: 'QUEUED', description: 'Incorporate new remote work policies.' },
        { title: 'Onboard New Software Engineer', priority: 'LEVEL_2', status: 'ACTIVE', description: 'Setup workstation and provision cloud access.' },
        { title: 'Restock Pantry Items', priority: 'LEVEL_1', status: 'QUEUED', description: 'Coffee, snacks, and cleaning supplies.' },
        { title: 'Website DNS Migration', priority: 'LEVEL_3', status: 'AWAITING_REVIEW', description: 'Point main domain to new edge servers.' }
    ];

    for (const [idx, t] of tasks.entries()) {
        await addDoc(tasksRef, {
            ...t,
            serialNo: `TSK-${String(idx + 1).padStart(5, '0')}`,
            orgId: ORG_ID,
            assignedTo: firstUser.id,
            assignedToName: firstUser.fullName,
            createdBy: firstUser.id,
            createdAt: now,
            activity: [{ type: 'LOG', actorId: firstUser.id, actorName: firstUser.fullName, timestamp: now, text: 'created task' }],
            subTasks: [{ id: '1', text: 'Define scope', completed: true }, { id: '2', text: 'Execute plan', completed: false }]
        });
    }

    // 4. Seed Requisitions
    const reqs = [
        { title: 'Laptop Upgrade - Engineering', amount: 4500, status: 'PENDING_HR', description: 'Replace aging dev machines.' },
        { title: 'Annual AWS Commitment', amount: 12000, status: 'APPROVED', description: 'Reserved instances for 2024.' }
    ];

    for (const [idx, r] of reqs.entries()) {
        await addDoc(reqsRef, {
            ...r,
            serialNo: `REQ-${String(idx + 1).padStart(4, '0')}`,
            orgId: ORG_ID,
            createdBy: firstUser.id,
            creatorName: firstUser.fullName,
            createdAt: now,
            vendorName: 'NexGen Cloud Solutions',
            activity: [{ type: 'LOG', actorId: firstUser.id, actorName: firstUser.fullName, timestamp: now, text: 'created requisition' }]
        });
    }
  }
};
