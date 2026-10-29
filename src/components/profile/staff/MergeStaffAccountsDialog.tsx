'use client';

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, ArrowRight, CheckCircle2, GitMerge, Loader2, ShieldAlert, UserCheck, Users } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface MergeStaffAccountsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  staffList: UserProfile[];
  onMergeComplete?: () => void;
}

export function MergeStaffAccountsDialog({
  isOpen,
  onOpenChange,
  staffList,
  onMergeComplete
}: MergeStaffAccountsDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [primaryUserId, setPrimaryUserId] = useState<string>('');
  const [duplicateUserId, setDuplicateUserId] = useState<string>('');
  const [isMerging, setIsMerging] = useState(false);
  const [mergeLogs, setMergeLogs] = useState<string[]>([]);

  // Eligible users: all profiles in staff list
  const primaryCandidates = useMemo(() => {
    return staffList.filter(u => !u.mergedInto && !u.isMerged);
  }, [staffList]);

  const duplicateCandidates = useMemo(() => {
    return staffList.filter(u => u.id !== primaryUserId);
  }, [staffList, primaryUserId]);

  const primaryUser = useMemo(() => {
    return staffList.find(u => u.id === primaryUserId);
  }, [staffList, primaryUserId]);

  const duplicateUser = useMemo(() => {
    return staffList.find(u => u.id === duplicateUserId);
  }, [staffList, duplicateUserId]);

  const handleMerge = async () => {
    if (!firestore || !primaryUser || !duplicateUser) return;
    if (primaryUser.id === duplicateUser.id) {
      toast({
        variant: 'destructive',
        title: 'Invalid Selection',
        description: 'Primary and duplicate accounts cannot be the same user.'
      });
      return;
    }

    setIsMerging(true);
    setMergeLogs([`Initiating merge of ${duplicateUser.fullName} (${duplicateUser.email}) into ${primaryUser.fullName} (${primaryUser.email})...`]);

    try {
      const batch = writeBatch(firestore);

      // 1. Gather all attendance records belonging to the duplicate account
      setMergeLogs(prev => [...prev, 'Searching duplicate attendance records...']);
      const attendanceQuery = query(collection(firestore, 'attendance'), where('userId', '==', duplicateUser.id));
      const attendanceSnap = await getDocs(attendanceQuery);
      attendanceSnap.docs.forEach(docSnap => {
        batch.update(docSnap.ref, {
          userId: primaryUser.id,
          userName: primaryUser.fullName
        });
      });
      setMergeLogs(prev => [...prev, `Reassigning ${attendanceSnap.size} attendance records to primary account...`]);

      // 2. Gather all tasks assigned to the duplicate account
      setMergeLogs(prev => [...prev, 'Searching duplicate assigned tasks...']);
      const tasksQuery = query(collection(firestore, 'tasks'), where('assignedTo', '==', duplicateUser.id));
      const tasksSnap = await getDocs(tasksQuery);
      tasksSnap.docs.forEach(docSnap => {
        batch.update(docSnap.ref, {
          assignedTo: primaryUser.id,
          assignedToName: primaryUser.fullName
        });
      });
      setMergeLogs(prev => [...prev, `Reassigning ${tasksSnap.size} active tasks...`]);

      // 3. Gather daily reports
      const reportsQuery = query(collection(firestore, 'daily_reports'), where('userId', '==', duplicateUser.id));
      const reportsSnap = await getDocs(reportsQuery);
      reportsSnap.docs.forEach(docSnap => {
        batch.update(docSnap.ref, {
          userId: primaryUser.id,
          userName: primaryUser.fullName
        });
      });

      // 4. Gather daily debriefs
      const debriefsQuery = query(collection(firestore, 'daily_debriefs'), where('userId', '==', duplicateUser.id));
      const debriefsSnap = await getDocs(debriefsQuery);
      debriefsSnap.docs.forEach(docSnap => {
        batch.update(docSnap.ref, {
          userId: primaryUser.id,
          userName: primaryUser.fullName
        });
      });

      // 5. Move direct conversations and channel membership to the primary identity.
      // If both accounts already have a DM with the same person, combine messages
      // into one conversation so the merged account only appears once in chat.
      const chatsQuery = query(collection(firestore, 'chats'), where('orgId', '==', primaryUser.orgId));
      const chatsSnap = await getDocs(chatsQuery);
      const orgChats = chatsSnap.docs.map(chatDoc => ({ ref: chatDoc.ref, id: chatDoc.id, data: chatDoc.data() as any }));
      const duplicateChats = orgChats.filter(chat => chat.data.participants?.includes(duplicateUser.id));
      let chatBatch = writeBatch(firestore);
      let chatOperationCount = 0;
      const commitChatBatch = async () => {
        if (chatOperationCount === 0) return;
        await chatBatch.commit();
        chatBatch = writeBatch(firestore);
        chatOperationCount = 0;
      };
      const queueChatWrites = async (writes: Array<(currentBatch: ReturnType<typeof writeBatch>) => void>) => {
        if (chatOperationCount + writes.length > 400) await commitChatBatch();
        writes.forEach(write => write(chatBatch));
        chatOperationCount += writes.length;
      };

      for (const sourceChat of duplicateChats) {
        const sourceParticipants: string[] = sourceChat.data.participants || [];
        const otherParticipants = sourceParticipants.filter(id => id !== duplicateUser.id && id !== primaryUser.id);
        const isDirect = sourceChat.data.type === 'DIRECT';
        const matchingTarget = isDirect && otherParticipants.length === 1
          ? orgChats.find(chat =>
              chat.id !== sourceChat.id &&
              chat.data.type === 'DIRECT' &&
              chat.data.participants?.includes(primaryUser.id) &&
              chat.data.participants?.includes(otherParticipants[0]) &&
              !chat.data.participants?.includes(duplicateUser.id)
            )
          : undefined;

        if (matchingTarget) {
          const messagesSnap = await getDocs(collection(firestore, 'chats', sourceChat.id, 'messages'));
          for (const messageDoc of messagesSnap.docs) {
            const messageData = messageDoc.data();
            await queueChatWrites([currentBatch => {
              currentBatch.set(doc(firestore, 'chats', matchingTarget.id, 'messages', messageDoc.id), {
                ...messageData,
                chatId: matchingTarget.id,
                ...(messageData.senderId === duplicateUser.id
                  ? { senderId: primaryUser.id, senderName: primaryUser.fullName }
                  : {})
              });
            }, currentBatch => currentBatch.delete(messageDoc.ref)]);
          }

          const sourceUpdatedAt = sourceChat.data.updatedAt || '';
          const targetUpdatedAt = matchingTarget.data.updatedAt || '';
          const latestChat = sourceUpdatedAt > targetUpdatedAt ? sourceChat.data : matchingTarget.data;
          const participants = Array.from(new Set([
            ...(matchingTarget.data.participants || []),
            ...otherParticipants,
            primaryUser.id
          ]));
          const participantProfiles = {
            ...(matchingTarget.data.participantProfiles || {}),
            [primaryUser.id]: { fullName: primaryUser.fullName }
          };
          const readReceipts = { ...(matchingTarget.data.readReceipts || {}) };
          if (readReceipts[duplicateUser.id]) {
            readReceipts[primaryUser.id] = [readReceipts[primaryUser.id], readReceipts[duplicateUser.id]].filter(Boolean).sort().pop();
          }
          delete participantProfiles[duplicateUser.id];
          delete readReceipts[duplicateUser.id];
          const lastMessage = latestChat.lastMessage
            ? {
                ...latestChat.lastMessage,
                ...(latestChat.lastMessage.senderId === duplicateUser.id
                  ? { senderId: primaryUser.id, senderName: primaryUser.fullName }
                  : {})
              }
            : undefined;

          await queueChatWrites([currentBatch => currentBatch.update(matchingTarget.ref, {
            participants,
            participantProfiles,
            readReceipts,
            ...(lastMessage ? { lastMessage } : {}),
            updatedAt: latestChat.updatedAt || new Date().toISOString()
          })]);
          await queueChatWrites([currentBatch => currentBatch.delete(sourceChat.ref)]);
        } else {
          const participants = Array.from(new Set(sourceParticipants.map(id => id === duplicateUser.id ? primaryUser.id : id)));
          const participantProfiles = { ...(sourceChat.data.participantProfiles || {}) };
          delete participantProfiles[duplicateUser.id];
          participantProfiles[primaryUser.id] = { fullName: primaryUser.fullName };
          const readReceipts = { ...(sourceChat.data.readReceipts || {}) };
          if (readReceipts[duplicateUser.id]) {
            readReceipts[primaryUser.id] = [readReceipts[primaryUser.id], readReceipts[duplicateUser.id]].filter(Boolean).sort().pop();
          }
          delete readReceipts[duplicateUser.id];
          const lastMessage = sourceChat.data.lastMessage
            ? {
                ...sourceChat.data.lastMessage,
                ...(sourceChat.data.lastMessage.senderId === duplicateUser.id
                  ? { senderId: primaryUser.id, senderName: primaryUser.fullName }
                  : {})
              }
            : undefined;

          await queueChatWrites([currentBatch => currentBatch.update(sourceChat.ref, {
            participants,
            participantProfiles,
            readReceipts,
            ...(lastMessage ? { lastMessage } : {})
          })]);

          const messagesSnap = await getDocs(collection(firestore, 'chats', sourceChat.id, 'messages'));
          for (const messageDoc of messagesSnap.docs) {
            if (messageDoc.data().senderId !== duplicateUser.id) continue;
            await queueChatWrites([currentBatch => currentBatch.update(messageDoc.ref, {
              senderId: primaryUser.id,
              senderName: primaryUser.fullName
            })]);
          }
        }
      }
      await commitChatBatch();

      // 6. Update Primary User Profile (preserve all emails and UIDs)
      const linkedUids = new Set(primaryUser.linkedUids || []);
      linkedUids.add(duplicateUser.id);
      if (duplicateUser.linkedUids) {
        duplicateUser.linkedUids.forEach(uid => linkedUids.add(uid));
      }

      const linkedEmails = new Set(primaryUser.linkedEmails || []);
      if (duplicateUser.email) linkedEmails.add(duplicateUser.email.toLowerCase());
      if (duplicateUser.linkedEmails) {
        duplicateUser.linkedEmails.forEach(em => linkedEmails.add(em.toLowerCase()));
      }

      const primaryRef = doc(firestore, 'users', primaryUser.id);
      batch.update(primaryRef, {
        linkedUids: Array.from(linkedUids),
        linkedEmails: Array.from(linkedEmails)
      });

      // 7. Update Duplicate User Profile to redirect and archive
      const duplicateRef = doc(firestore, 'users', duplicateUser.id);
      batch.update(duplicateRef, {
        mergedInto: primaryUser.id,
        isMerged: true,
        isArchived: true,
        archivedAt: new Date().toISOString(),
        status: 'OFFLINE'
      });

      // Commit entire atomic batch
      await batch.commit();

      setMergeLogs(prev => [
        ...prev,
        'Successfully committed all updates to Firestore!',
        'Both login credentials will now automatically authenticate into the Primary profile.'
      ]);

      toast({
        title: 'Accounts Merged Successfully',
        description: `${duplicateUser.fullName} has been consolidated into ${primaryUser.fullName}.`
      });

      setTimeout(() => {
        setIsMerging(false);
        setPrimaryUserId('');
        setDuplicateUserId('');
        setMergeLogs([]);
        onOpenChange(false);
        if (onMergeComplete) onMergeComplete();
      }, 1500);

    } catch (error: any) {
      console.error('[MERGE] Error merging staff profiles:', error);
      setMergeLogs(prev => [...prev, `Error: ${error.message}`]);
      setIsMerging(false);
      toast({
        variant: 'destructive',
        title: 'Merge Failed',
        description: error.message || 'An error occurred during account consolidation.'
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950/95 border-white/10 backdrop-blur-2xl text-foreground rounded-2xl shadow-2xl p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <GitMerge className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Merge Duplicate Personnel Accounts
                <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 bg-amber-500/10">
                  ADMIN UTILITY
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Consolidate two staff logins into one primary identity. All historical attendance, active tasks, and reports are safely reassigned.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Explanation Alert */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
            <p className="leading-relaxed">
              When a user signs in with either email or Google authentication, the system will recognize them as the <strong className="text-white">Primary Account</strong>. The secondary duplicate account is archived.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Primary Account */}
            <div className="space-y-2 p-4 rounded-xl bg-zinc-900/60 border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" />
                  1. Main Account (Keep)
                </span>
                <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                  TARGET
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                The master identity that keeps their official name, role, and department.
              </p>
              
              <Select value={primaryUserId} onValueChange={setPrimaryUserId} disabled={isMerging}>
                <SelectTrigger className="w-full bg-black/40 border-white/10 rounded-xl h-11 text-xs font-semibold text-white">
                  <SelectValue placeholder="Select primary profile..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-white/10 text-white max-h-56">
                  {primaryCandidates.map(u => (
                    <SelectItem key={u.id} value={u.id} className="text-xs focus:bg-white/10 focus:text-white">
                      <div className="flex flex-col">
                        <span className="font-bold">{u.fullName}</span>
                        <span className="text-[10px] text-muted-foreground">{u.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {primaryUser && (
                <div className="mt-3 p-2.5 rounded-lg bg-black/30 border border-white/5 text-[11px] space-y-1">
                  <div className="font-semibold text-white">{primaryUser.fullName}</div>
                  <div className="text-muted-foreground font-mono text-[10px] truncate">{primaryUser.email}</div>
                  <div className="text-[10px] text-zinc-400">{primaryUser.position || 'Staff'} • {primaryUser.role}</div>
                </div>
              )}
            </div>

            {/* 2. Duplicate Account */}
            <div className="space-y-2 p-4 rounded-xl bg-zinc-900/60 border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  2. Duplicate Account (Merge)
                </span>
                <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 bg-amber-500/10">
                  TO MERGE
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                The secondary login to merge into the main account and archive.
              </p>

              <Select value={duplicateUserId} onValueChange={setDuplicateUserId} disabled={isMerging || !primaryUserId}>
                <SelectTrigger className="w-full bg-black/40 border-white/10 rounded-xl h-11 text-xs font-semibold text-white">
                  <SelectValue placeholder={!primaryUserId ? "Select primary account first..." : "Select duplicate to merge..."} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-white/10 text-white max-h-56">
                  {duplicateCandidates.map(u => (
                    <SelectItem key={u.id} value={u.id} className="text-xs focus:bg-white/10 focus:text-white">
                      <div className="flex flex-col">
                        <span className="font-bold">{u.fullName}</span>
                        <span className="text-[10px] text-muted-foreground">{u.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {duplicateUser && (
                <div className="mt-3 p-2.5 rounded-lg bg-black/30 border border-white/5 text-[11px] space-y-1">
                  <div className="font-semibold text-white">{duplicateUser.fullName}</div>
                  <div className="text-muted-foreground font-mono text-[10px] truncate">{duplicateUser.email}</div>
                  <div className="text-[10px] text-zinc-400">{duplicateUser.position || 'Staff'} • {duplicateUser.role}</div>
                </div>
              )}
            </div>
          </div>

          {/* Transfer Summary Preview */}
          {primaryUser && duplicateUser && (
            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 flex items-center justify-between">
              <div className="text-xs">
                <span className="font-mono text-zinc-400">{duplicateUser.email}</span>
                <span className="mx-2 text-zinc-600">→</span>
                <span className="font-bold text-emerald-400">{primaryUser.email}</span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                Ready to Merge
              </Badge>
            </div>
          )}

          {/* Merge Activity Logs */}
          {mergeLogs.length > 0 && (
            <div className="p-3 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] space-y-1 max-h-28 overflow-y-auto">
              {mergeLogs.map((log, idx) => (
                <div key={idx} className="text-zinc-400 flex items-center gap-1.5">
                  <ArrowRight className="h-2.5 w-2.5 text-primary shrink-0" />
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isMerging}
            className="rounded-xl h-11 text-xs text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            disabled={isMerging || !primaryUserId || !duplicateUserId}
            className="rounded-xl h-11 px-6 font-black uppercase text-[10px] tracking-widest bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20"
          >
            {isMerging ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Merging Accounts...
              </>
            ) : (
              <>
                <GitMerge className="mr-2 h-4 w-4" />
                Confirm & Merge Staff
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
