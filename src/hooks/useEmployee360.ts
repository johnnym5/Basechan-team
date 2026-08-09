'use client';

import { useQuery } from '@tanstack/react-query';
import { useFirestore } from '@/firebase';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import type { UserProfile, Attendance, Task } from '@/lib/types';

export interface Employee360Data {
  profile: UserProfile | null;
  attendance: Attendance[];
  tasks: Task[];
}

/**
 * useEmployee360
 * Performs concurrent fetching across identity, status, and performance collections.
 */
export function useEmployee360(userId: string | undefined, orgId: string | undefined) {
  const firestore = useFirestore();

  return useQuery({
    queryKey: ['employee360', userId, orgId],
    queryFn: async (): Promise<Employee360Data> => {
      if (!firestore || !userId || !orgId) {
        return { profile: null, attendance: [], tasks: [] };
      }

      // 1. Identity & Permissions (Base Profile)
      console.log(`[DEBUG] Fetching profile from collection: 'users', ID: ${userId}`);
      const profileRef = doc(firestore, 'users', userId);

      // 2. Operational Feeds (Recent Activity)
      const attendanceQuery = query(
        collection(firestore, 'attendance'),
        where('userId', '==', userId),
        where('orgId', '==', orgId),
        orderBy('clockIn', 'desc'),
        limit(15)
      );

      const tasksQuery = query(
        collection(firestore, 'tasks'),
        where('assignedTo', '==', userId),
        where('orgId', '==', orgId),
        orderBy('createdAt', 'desc'),
        limit(15)
      );

      try {
        // Perform all fetches simultaneously for optimal performance
        const [profileSnap, attendanceSnap, tasksSnap] = await Promise.all([
            getDoc(profileRef),
            getDocs(attendanceQuery),
            getDocs(tasksQuery)
        ]);

        if (!profileSnap.exists()) {
            console.warn(`[DEBUG] DOCUMENT DOES NOT EXIST in 'users' collection for ID: ${userId}`);
        } else {
            console.log(`[DEBUG] Successfully retrieved profile for: ${userId}`);
        }

        return {
            profile: profileSnap.exists() ? { id: profileSnap.id, ...profileSnap.data() } as UserProfile : null,
            attendance: attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)),
            tasks: tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)),
        };
      } catch (error: any) {
        console.error(`[DEBUG] Firestore fetch failed for user ${userId}:`, error.code, error.message);
        throw error;
      }
    },
    enabled: !!firestore && !!userId && !!orgId,
    staleTime: 1000 * 60 * 2, // 2 minutes stale time
  });
}
