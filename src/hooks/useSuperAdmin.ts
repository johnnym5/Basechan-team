'use client';
import { useUser } from '@/firebase';

// Master identity for infrastructure oversight
const SUPER_ADMIN_EMAIL = 'jegbase@gmail.com';
const SUPER_ADMIN_UID = 'nM0bBwaybEQP95OPKUyQ97iAm3u2'; // Corrected UID (0 vs O)

export function useSuperAdmin() {
  const { user } = useUser();
  const userEmail = user?.email?.toLowerCase();
  
  // Verify identity via Email or corrected UID
  const isSuperAdmin = userEmail === SUPER_ADMIN_EMAIL.toLowerCase() || user?.uid === SUPER_ADMIN_UID;
  
  return { isSuperAdmin, superAdminEmail: SUPER_ADMIN_EMAIL };
}
