'use client';
import { useUser } from '@/firebase';
import { useState, useEffect } from 'react';

// This email should match the one in your firestore.rules
const SUPER_ADMIN_EMAIL = 'jegbase@gmail.com';
const GHOST_MODE_KEY = 'ghost_mode';

export function useSuperAdmin() {
  const { user } = useUser();
  const [isGhostMode, setIsGhostMode] = useState(false);

  useEffect(() => {
    // This effect runs only on the client side
    const ghostModeEnabled = localStorage.getItem(GHOST_MODE_KEY) === 'true';
    setIsGhostMode(ghostModeEnabled);
  }, []);

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL || isGhostMode;

  return { isSuperAdmin, superAdminEmail: SUPER_ADMIN_EMAIL };
}
