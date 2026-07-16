import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    let credential;

    if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        credential = cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
            privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
    } else {
        credential = applicationDefault();
    }

    initializeApp({
        credential,
    });
}

export const adminAuth = getAuth();
export const adminFirestore = getFirestore();

