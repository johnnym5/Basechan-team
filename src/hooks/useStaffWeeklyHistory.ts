'use client';

import { useQuery } from '@tanstack/react-query';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Attendance } from '@/lib/types';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export function useStaffWeeklyHistory(userId: string | undefined, orgId: string | undefined, referenceDate: Date) {
  const firestore = useFirestore();

  return useQuery({
    queryKey: ['staff-weekly-history', userId, orgId, format(referenceDate, 'yyyy-ww')],
    queryFn: async () => {
      if (!firestore || !userId || !orgId) return [];

      const start = format(startOfWeek(referenceDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const end = format(endOfWeek(referenceDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      const q = query(
        collection(firestore, 'attendance'),
        where('orgId', '==', orgId),
        where('userId', '==', userId),
        where('date', '>=', start),
        where('date', '<=', end)
      );

      const snap = await getDocs(q);
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Attendance));
      return logs.sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!firestore && !!userId && !!orgId,
  });
}
