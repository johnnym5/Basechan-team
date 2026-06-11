'use client';
import { useUser } from '@/firebase';

// Master identity for infrastructure oversight
const SUPER_ADMIN_EMAIL = 'jegbase@gmail.com';
const SUPER_ADMIN_UID = 'nM0bBwaybEQP95OPKUyQ97iAm3u2';

export function useSuperAdmin() {
  const { user } = useUser();
  const userEmail = user?.email?.toLowerCase();
  
  // Verify identity via Email, corrected UID, or secret 'johnmary' alias
  const isSuperAdmin = 
    userEmail === SUPER_ADMIN_EMAIL.toLowerCase() || 
    user?.uid === SUPER_ADMIN_UID ||
    userEmail?.includes('johnmary') ||
    user?.displayName?.toLowerCase().includes('johnmary');
  
  return { isSuperAdmin, superAdminEmail: SUPER_ADMIN_EMAIL };
}
