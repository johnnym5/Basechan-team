'use client';

import { useUser } from '@/firebase';
import { useState, useEffect } from 'react';

// Master admin emails - all entries gain hidden super-admin access
const SUPER_ADMIN_EMAILS = [
  'jegbase@gmail.com',
  'johnmary.basechaninternational@gmail.com',
];

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
        // Verify via Cryptographic Auth Token Claim or Master Admin Emails
        const isSuper = roleClaim === 'SUPERADMIN' || SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === user.email?.toLowerCase());
        setIsSuperAdmin(isSuper);
      })
      .catch(() => {
        setIsSuperAdmin(SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === user.email?.toLowerCase()));
      })
      .finally(() => {
        setCheckingClaims(false);
      });
  }, [user]);

  return { isSuperAdmin, isLoading: isLoading || checkingClaims, superAdminEmails: SUPER_ADMIN_EMAILS, superAdminEmail: SUPER_ADMIN_EMAILS[0] };
}
