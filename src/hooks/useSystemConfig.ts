
'use client';
import { useMemo, useEffect, useState } from 'react';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { SystemConfig } from '@/lib/types';

/**
 * Hook to retrieve and manage organizational system configuration.
 * 
 * To ensure reliability and prevent duplicate configurations or "Document already exists" errors,
 * this hook uses a deterministic ID (the orgId itself) for the configuration document.
 */
export function useSystemConfig(orgId: string | null | undefined) {
  const firestore = useFirestore();

  // Define a stable document reference using orgId as the document ID.
  const configRef = useMemoFirebase(() => {
    if (!firestore || !orgId) return null;
    return doc(firestore, 'system_configs', orgId);
  }, [firestore, orgId]);

  // Use useDoc for a direct, high-performance subscription to the configuration node.
  const { data: config, isLoading } = useDoc<SystemConfig>(configRef);

  useEffect(() => {
    // If a configuration node doesn't exist for this organization, initialize it with defaults.
    // We use setDocumentNonBlocking with merge: true to ensure this operation is idempotent.
    if (!isLoading && !config && orgId && firestore) {
      const defaultConfig: Omit<SystemConfig, 'id'> = {
        orgId: orgId,
        finance_access: true,
        admin_tools: true,
        attendance_strict: false,
        chat_enabled: true,
        allow_self_edit: true,
        require_screen_share: true,
        office_coordinates: null,
        work_hours: { start: '09:00', end: '17:00' },
        reporting_schedule: { required: true, deadline: '17:30' },
        currency_symbol: '$',
        branding_color: '#cab348', // Default to Org Gold
        accent_color: '#0d1e30', // Default to Org Navy
      };

      const targetRef = doc(firestore, 'system_configs', orgId);

      // Perform an idempotent write. This will trigger a data update in useDoc.
      setDocumentNonBlocking(targetRef, defaultConfig, { merge: true });
    }
  }, [isLoading, config, orgId, firestore]);

  // If orgId is not provided, we are implicitly in a loading state until it is.
  return { config, isLoading: isLoading || !orgId };
}
