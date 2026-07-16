import { NextResponse } from 'next/server';
import { adminAuth, adminFirestore } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Check super admin privileges based on firestore.rules logic
        const isSuperAdmin = decodedToken.email === 'jegbase@gmail.com' || decodedToken.uid === 'nM0bBwaybEQP95OPKUyQ97iAm3u2';
        
        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Insufficient permissions. Only super admins can delete users.' }, { status: 403 });
        }

        const { targetUserId } = await request.json();
        if (!targetUserId) {
            return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
        }

        // Prevent deleting oneself just in case
        if (targetUserId === decodedToken.uid) {
            return NextResponse.json({ error: 'Cannot delete your own account via this endpoint.' }, { status: 400 });
        }

        // 1. Delete from Firebase Auth
        try {
            await adminAuth.deleteUser(targetUserId);
        } catch (authError: any) {
            // If user doesn't exist in auth, we might still want to clean up firestore, 
            // but log the error
            console.warn(`Auth user ${targetUserId} not found or could not be deleted: ${authError.message}`);
        }

        // 2. Delete from Firestore
        await adminFirestore.collection('users').doc(targetUserId).delete();

        return NextResponse.json({ success: true, message: `User ${targetUserId} successfully deleted.` }, { status: 200 });

    } catch (error: any) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
