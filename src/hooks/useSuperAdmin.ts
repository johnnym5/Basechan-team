'use client';

import { useUser } from '@/firebase';
import { useState, useEffect } from 'react';

// Master admin email reference for root recovery
const SUPER_ADMIN_EMAIL = 'jegbase@gmail.com';

export function useSuperAdmin() {
  const { user, isUserLoading: isLoading } = useUser();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checkingClaims, setCheckingClaims] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsSuperAdmin(false);
      setCheckingClaims(false);
      return;
    }

    user.getIdTokenResult(false)
      .then((tokenResult) => {
        const roleClaim = tokenResult.claims.role;
        // Verify via Cryptographic Auth Token Claim or Master Admin Email
        const isSuper = roleClaim === 'SUPERADMIN' || user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
        setIsSuperAdmin(isSuper);
      })
      .catch(() => {
        setIsSuperAdmin(user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
      })
      .finally(() => {
        setCheckingClaims(false);
      });
  }, [user]);

  return { isSuperAdmin, isLoading: isLoading || checkingClaims, superAdminEmail: SUPER_ADMIN_EMAIL };
}
