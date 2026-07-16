'use client';

import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { Firestore, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { UserProfile, UserPosition, UserRole } from '@/lib/types';
import { ORG_ID } from '@/lib/config';
import { getRoleFromPosition } from '@/lib/roles-and-departments';

export interface ProvisioningResult {
    email: string;
    status: 'SUCCESS' | 'FAILED';
    error?: string;
}

/**
 * Service to handle bulk creation of staff accounts.
 * Uses a secondary app instance to avoid logging out the current admin.
 */
export const batchUserService = {
    async provisionUser(
        db: Firestore, 
        email: string, 
        password: string,
        departmentName: string = "Operations & Production",
        position: UserPosition = "Staff"
    ): Promise<ProvisioningResult> {
        const tempAppName = `batch-provision-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        let secondaryApp;

        try {
            secondaryApp = initializeApp(firebaseConfig, tempAppName);
            const secondaryAuth = getAuth(secondaryApp);

            // 1. Create Auth Account
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const uid = userCredential.user.uid;

            // 2. Create Firestore Profile
            const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
            const fullName = email.split('@')[0]
                .split('.')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            const profile: Omit<UserProfile, 'id'> = {
                orgId: ORG_ID,
                email: email.toLowerCase(),
                username: username.toLowerCase(),
                fullName,
                role: getRoleFromPosition(position),
                position,
                departmentName,
                joinedDate: new Date().toISOString(),
                password,
                status: 'OFFLINE',
            };

            await setDoc(doc(db, 'users', uid), profile);

            return { email, status: 'SUCCESS' };
        } catch (error: any) {
            console.error(`Provisioning failed for ${email}:`, error);
            return { 
                email, 
                status: 'FAILED', 
                error: error.code === 'auth/email-already-in-use' ? 'Email already registered' : error.message 
            };
        } finally {
            if (secondaryApp) {
                await deleteApp(secondaryApp);
            }
        }
    }
};
