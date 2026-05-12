'use client';
import { useUser } from '@/firebase';

// This email should match the one in your firestore.rules
const SUPER_ADMIN_EMAIL = 'jegbase@gmail.com';
const SUPER_ADMIN_UID = 'nMObbwaybEQP95OPKUyQ97iAm3u2';

export function useSuperAdmin() {
  const { user } = useUser();
  const userEmail = user?.email?.toLowerCase();
  const isSuperAdmin = userEmail === SUPER_ADMIN_EMAIL.toLowerCase() || user?.uid === SUPER_ADMIN_UID;
  
  return { isSuperAdmin, superAdminEmail: SUPER_ADMIN_EMAIL };
}
