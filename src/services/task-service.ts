<<<<<<< HEAD
'use client';

import { Firestore, collection, doc, query, where, getDocs, arrayUnion, setDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import type { Task, UserProfile, ActivityEntry, TaskStatus, Notification, TaskPriority } from '@/lib/types';
import { sanitizeInput } from '@/lib/utils';
import { auditService } from './audit-service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export const taskService = {
  /**
   * Creates a new task and handles priority-based load balancing.
   */
  async createTask(
    db: Firestore, 
    currentUser: UserProfile, 
    assignee: UserProfile, 
    values: any, 
    attachmentUrl?: string
  ) {
    const tasksRef = collection(db, 'tasks');
    const now = new Date().toISOString();

    // 1. Priority Load Balancing Check
    if (values.priority === 'LEVEL_3' || values.priority === 'LEVEL_2') {
        const q = query(
            tasksRef,
            where('assignedTo', '==', assignee.id),
            where('status', 'in', ['QUEUED', 'ACTIVE', 'AWAITING_REVIEW'])
        );
        const existingTasksSnapshot = await getDocs(q);
        const existingTasks = existingTasksSnapshot.docs.map(doc => doc.data() as Task);

        if (values.priority === 'LEVEL_3' && existingTasks.some(t => t.priority === 'LEVEL_3')) {
            throw new Error(`${assignee.fullName} already has a High Priority (Level 3) task. Only one is allowed.`);
        }
        if (values.priority === 'LEVEL_2' && existingTasks.filter(t => t.priority === 'LEVEL_2').length >= 2) {
            throw new Error(`${assignee.fullName} already has two Medium Priority (Level 2) tasks. Only two are allowed.`);
        }
    }

    // 2. Pre-generate ID and Serial Number to avoid blocking
    const qOrg = query(tasksRef, where('orgId', '==', assignee.orgId));
    const orgTasksSnapshot = await getDocs(qOrg);
    const newSerialNo = `TSK-${String(orgTasksSnapshot.size + 1).padStart(5, '0')}`;
    const newTaskRef = doc(tasksRef);

    // 3. Construct Payload
    const initialActivity: ActivityEntry = {
        type: 'LOG',
        actorId: currentUser.id,
        actorName: currentUser.fullName,
        timestamp: now,
        text: `created the task and assigned it to ${assignee.fullName}.`,
        fromStatus: 'N/A',
        toStatus: 'QUEUED',
    };

    const newTask: Omit<Task, 'id'> = {
        serialNo: newSerialNo,
        orgId: assignee.orgId,
        title: sanitizeInput(values.title),
        description: sanitizeInput(values.description),
        assignedTo: assignee.id,
        assignedToName: assignee.fullName,
        priority: values.priority,
        estimatedHours: values.estimatedHours,
        status: 'QUEUED',
        dueDate: values.dueDate ? values.dueDate.toISOString() : null,
        createdBy: currentUser.id,
        activity: [initialActivity],
        createdAt: now,
        workbookId: values.workbookId || null,
        sheetId: values.sheetId || null,
        attachmentUrl: attachmentUrl || null,
        attachmentName: values.attachment ? values.attachment.name : null,
        sharedWith: [],
        subTasks: [],
        type: 'STANDARD',
    };

    // 4. Initiate Non-Blocking Write with Error Handling
    setDoc(newTaskRef, newTask).catch(async (error) => {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: newTaskRef.path,
                operation: 'create',
                requestResourceData: newTask,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        }
    });

    // 5. Audit & Notify (Non-blocking)
    auditService.logAction(db, currentUser, 'TASK_CREATE', `Assigned mission "${newTask.title}" to ${assignee.fullName}`, { id: newTaskRef.id, type: 'TASK' });
    
    if (currentUser.id !== assignee.id) {
        const notification: Omit<Notification, 'id'> = {
            orgId: currentUser.orgId,
            userId: assignee.id,
            title: 'New Task Assigned',
            description: `"${newTask.title}"`,
            href: `/tasks?taskId=${newTaskRef.id}`,
            isRead: false,
            createdAt: now,
        };
        addDocumentNonBlocking(collection(db, 'notifications'), notification);
    }

    return newTaskRef;
  },

  async updateTaskStatus(db: Firestore, task: Task, currentUser: UserProfile, newStatus: TaskStatus, comment?: string) {
    const taskRef = doc(db, 'tasks', task.id);
    const now = new Date().toISOString();
    let logText = `changed status to ${newStatus.replace('_', ' ')}.`;
    const updatePayload: any = { status: newStatus };

    const activityEntry: ActivityEntry = {
        type: 'LOG',
        actorId: currentUser.id,
        actorName: currentUser.fullName,
        timestamp: now,
        text: logText,
        fromStatus: task.status,
        toStatus: newStatus,
    };

    const activity = [activityEntry];
    if (comment) {
        activity.push({
            type: 'COMMENT',
            actorId: currentUser.id,
            actorName: currentUser.fullName,
            timestamp: now,
            text: sanitizeInput(comment),
        });
    }

    updatePayload.activity = arrayUnion(...activity);
    updateDocumentNonBlocking(taskRef, updatePayload);
    
    auditService.logAction(db, currentUser, 'TASK_STATUS_CHANGE', `Moved task "${task.title}" from ${task.status} to ${newStatus}`, { id: task.id, type: 'TASK' });
  }
};
=======
'use client';

import { Firestore, collection, doc, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import type { Task, UserProfile, ActivityEntry, TaskStatus, Notification, TaskPriority } from '@/lib/types';
import { sanitizeInput } from '@/lib/utils';

export const taskService = {
  /**
   * Creates a new task and handles priority-based load balancing.
   */
  async createTask(
    db: Firestore, 
    currentUser: UserProfile, 
    assignee: UserProfile, 
    values: any, 
    attachmentUrl?: string
  ) {
    const tasksRef = collection(db, 'tasks');
    const now = new Date().toISOString();

    // 1. Priority Load Balancing Check
    if (values.priority === 'LEVEL_3' || values.priority === 'LEVEL_2') {
        const q = query(
            tasksRef,
            where('assignedTo', '==', assignee.id),
            where('status', 'in', ['QUEUED', 'ACTIVE', 'AWAITING_REVIEW'])
        );
        const existingTasksSnapshot = await getDocs(q);
        const existingTasks = existingTasksSnapshot.docs.map(doc => doc.data() as Task);

        if (values.priority === 'LEVEL_3' && existingTasks.some(t => t.priority === 'LEVEL_3')) {
            throw new Error(`${assignee.fullName} already has a High Priority (Level 3) task. Only one is allowed.`);
        }
        if (values.priority === 'LEVEL_2' && existingTasks.filter(t => t.priority === 'LEVEL_2').length >= 2) {
            throw new Error(`${assignee.fullName} already has two Medium Priority (Level 2) tasks. Only two are allowed.`);
        }
    }

    // 2. Generate Serial Number
    const qOrg = query(tasksRef, where('orgId', '==', assignee.orgId));
    const orgTasksSnapshot = await getDocs(qOrg);
    const newSerialNo = `TSK-${String(orgTasksSnapshot.size + 1).padStart(5, '0')}`;

    // 3. Construct Payload
    const initialActivity: ActivityEntry = {
        type: 'LOG',
        actorId: currentUser.id,
        actorName: currentUser.fullName,
        timestamp: now,
        text: `created the task and assigned it to ${assignee.fullName}.`,
        fromStatus: 'N/A',
        toStatus: 'QUEUED',
    };

    const newTask: Omit<Task, 'id'> = {
        serialNo: newSerialNo,
        orgId: assignee.orgId,
        title: sanitizeInput(values.title),
        description: sanitizeInput(values.description),
        assignedTo: assignee.id,
        assignedToName: assignee.fullName,
        priority: values.priority,
        estimatedHours: values.estimatedHours,
        status: 'QUEUED',
        dueDate: values.dueDate ? values.dueDate.toISOString() : null,
        createdBy: currentUser.id,
        activity: [initialActivity],
        createdAt: now,
        workbookId: values.workbookId || null,
        sheetId: values.sheetId || null,
        attachmentUrl: attachmentUrl || null,
        attachmentName: values.attachment ? values.attachment.name : null,
        sharedWith: [],
        subTasks: [],
        type: 'STANDARD',
    };

    const taskDocRef = await addDocumentNonBlocking(tasksRef, newTask);

    // 4. Notify Assignee
    if (taskDocRef && currentUser.id !== assignee.id) {
        const notification: Omit<Notification, 'id'> = {
            orgId: currentUser.orgId,
            userId: assignee.id,
            title: 'New Task Assigned',
            description: `"${newTask.title}"`,
            href: `/tasks?taskId=${taskDocRef.id}`,
            isRead: false,
            createdAt: now,
        };
        addDocumentNonBlocking(collection(db, 'notifications'), notification);
    }

    return taskDocRef;
  },

  async updateTaskStatus(db: Firestore, task: Task, currentUser: UserProfile, newStatus: TaskStatus, comment?: string) {
    const taskRef = doc(db, 'tasks', task.id);
    const now = new Date().toISOString();
    let logText = `changed status to ${newStatus.replace('_', ' ')}.`;
    const updatePayload: any = { status: newStatus };

    const activityEntry: ActivityEntry = {
        type: 'LOG',
        actorId: currentUser.id,
        actorName: currentUser.fullName,
        timestamp: now,
        text: logText,
        fromStatus: task.status,
        toStatus: newStatus,
    };

    const activity = [activityEntry];
    if (comment) {
        activity.push({
            type: 'COMMENT',
            actorId: currentUser.id,
            actorName: currentUser.fullName,
            timestamp: now,
            text: sanitizeInput(comment),
        });
    }

    updatePayload.activity = arrayUnion(...activity);
    updateDocumentNonBlocking(taskRef, updatePayload);
  }
};
>>>>>>> e46f2e1ad97486affb300b626ff5055ece21f529
