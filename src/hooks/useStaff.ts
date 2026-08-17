'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { removeUndefined } from '@/lib/utils';

export function useStaffProfile(userId: string | undefined) {
  const firestore = useFirestore();

  return useQuery({
    queryKey: ['staff', userId],
    queryFn: async () => {
      if (!firestore || !userId) return null;
      const docRef = doc(firestore, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as UserProfile;
      }
      return null;
    },
    enabled: !!firestore && !!userId,
  });
}

export function useOrganizationStaff(orgId: string | undefined) {
  const firestore = useFirestore();

  return useQuery({
    queryKey: ['staff-list', orgId],
    queryFn: async () => {
      if (!firestore || !orgId) return [];
      const q = query(collection(firestore, 'users'), where('orgId', '==', orgId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
    },
    enabled: !!firestore && !!orgId,
  });
}

export function useUpdateStaffProfile() {
  const firestore = useFirestore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<UserProfile> }) => {
      if (!firestore) throw new Error('Firestore not initialized');
      const docRef = doc(firestore, 'users', userId);
      const cleanData = removeUndefined(data);
      await updateDoc(docRef, cleanData);
    },
    onMutate: async ({ userId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['staff', userId] });

      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData(['staff', userId]);

      // Optimistically update to the new value
      queryClient.setQueryData(['staff', userId], (old: any) => ({ ...old, ...data }));

      return { previousProfile };
    },
    onError: (err, { userId }, context) => {
      queryClient.setQueryData(['staff', userId], context?.previousProfile);
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message });
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['staff', userId] });
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      toast({ title: 'Profile Updated', description: 'Changes saved successfully.' });
    },
  });
}
