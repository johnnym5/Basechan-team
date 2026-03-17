'use client';
import { useUser } from '@/firebase';

// This email should match the one in your firestore.rules
const SUPER_ADMIN_EMAIL = 'jegbase@gmail.com';

export function useSuperAdmin() {
  const { user } = useUser();
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;
  return { isSuperAdmin, superAdminEmail: SUPER_ADMIN_EMAIL };
}
