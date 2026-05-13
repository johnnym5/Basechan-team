'use client';
import { useMemo, useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { SystemConfig } from '@/lib/types';

export function useSystemConfig(orgId: string | null | undefined) {
  const firestore = useFirestore();
  const [isCreating, setIsCreating] = useState(false);

  const configQuery = useMemoFirebase(() => {
    if (!firestore || !orgId) return null;
    return query(
      collection(firestore, 'system_configs'),
      where('orgId', '==', orgId),
      limit(1)
    );
  }, [firestore, orgId]);

  const { data: configData, isLoading: isCollectionLoading } = useCollection<SystemConfig>(configQuery);

  useEffect(() => {
    // Check if we are done loading, no config was found, we have an orgId, and we're not already trying to create one.
    if (!isCollectionLoading && (!configData || configData.length === 0) && orgId && !isCreating) {
      setIsCreating(true);
      
      const configCollection = collection(firestore!, "system_configs");
      const defaultConfig: Omit<SystemConfig, 'id'> = {
          orgId: orgId,
          finance_access: true,
          admin_tools: true,
          attendance_strict: false,
          chat_enabled: true,
          allow_self_edit: true,
          office_coordinates: null,
          work_hours: { start: '09:00', end: '17:00' },
          reporting_schedule: { required: true, deadline: '17:30' },
          currency_symbol: '$',
          branding_color: null,
      };
      
      // We don't need to wait for this, it can happen in the background.
      addDocumentNonBlocking(configCollection, defaultConfig).finally(() => {
          setIsCreating(false);
      });
    }
  }, [isCollectionLoading, configData, orgId, firestore, isCreating]);

  const config = useMemo(() => (configData && configData.length > 0 ? configData[0] : null), [configData]);
  
  const isLoading = isCollectionLoading || isCreating;
  
  return { config, isLoading };
}