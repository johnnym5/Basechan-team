"use client"

import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export type ConfigDocId = 'leave_types' | 'award_categories' | 'review_templates' | 'eod_tags' | 'asset_categories' | 'global_holidays';

/**
 * Hook to manage system-wide or organization-specific configuration lists.
 * If orgId is provided, the configuration is scoped to that organization.
 */
export function useSystemConfigs(configDocId: ConfigDocId, orgId?: string) {
  const firestore = useFirestore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine the document ID: either global (e.g. 'award_categories')
  // or per-org (e.g. 'orgId_award_categories')
  const finalDocId = orgId ? `${orgId}_${configDocId}` : configDocId;

  useEffect(() => {
    if (!firestore) return;

    const docRef = doc(firestore, 'system_configs', finalDocId);

    // Real-time listener
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setData(docSnap.data().items || []);
      } else {
        // Initialize doc if it doesn't exist
        setData([]);
      }
      setLoading(false);
    }, (error) => {
        console.error(`Error listening to system_configs/${finalDocId}:`, error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, finalDocId]);

  // Mutation to Add an Item
  const addItem = async (newItem: any) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'system_configs', finalDocId);
    try {
        await updateDoc(docRef, {
            items: arrayUnion({ ...newItem, id: crypto.randomUUID(), createdAt: new Date().toISOString() })
        });
    } catch (e: any) {
        if (e.code === 'not-found') {
            await setDoc(docRef, {
                items: [{ ...newItem, id: crypto.randomUUID(), createdAt: new Date().toISOString() }]
            });
        } else {
            throw e;
        }
    }
  };

  // Mutation to Delete an Item
  const removeItem = async (itemToRemove: any) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'system_configs', finalDocId);
    await updateDoc(docRef, {
      items: arrayRemove(itemToRemove)
    });
  };

  return { data, loading, addItem, removeItem };
}
