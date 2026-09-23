'use client';

import { Firestore, collection } from 'firebase/firestore';
import { addDocumentNonBlocking, initializeFirebase } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Account, JournalEntry, UserProfile } from '@/lib/types';
import { sanitizeInput } from '@/lib/utils';
import { auditService } from './audit-service';

/**
 * Service to handle organization-wide financial accounting logic.
 * Enforces server-authoritative double-entry ledger execution.
 */
export const accountingService = {
  /**
   * Registers a new account in the Chart of Accounts.
   */
  async createAccount(db: Firestore, user: UserProfile, values: any) {
    const accountsRef = collection(db, 'accounts');
    const newAccount: Omit<Account, 'id'> = {
      orgId: user.orgId,
      name: sanitizeInput(values.name),
      code: sanitizeInput(values.code),
      type: values.type,
      category: sanitizeInput(values.category),
      balance: 0,
      isDebitNormal: values.isDebitNormal,
      description: sanitizeInput(values.description),
      isActive: true,
    };
    const docRef = await addDocumentNonBlocking(accountsRef, newAccount);
    if (docRef) {
      auditService.logAction(db, user, 'ACCOUNT_CREATE', `Registered new GL account: ${values.code} - ${values.name}`, { id: docRef.id, type: 'ACCOUNT' });
    }
    return docRef;
  },

  /**
   * Creates a draft journal entry via Server-Authoritative Cloud Function.
   */
  async createJournalEntry(db: Firestore, user: UserProfile, values: any) {
    const { functions } = initializeFirebase();
    const fnInstance = functions || getFunctions();
    const createFn = httpsCallable(fnInstance, 'createJournalEntry');

    const result = await createFn({
      orgId: user.orgId,
      date: values.date ? new Date(values.date).toISOString() : new Date().toISOString(),
      description: sanitizeInput(values.description),
      reference: sanitizeInput(values.reference || ''),
      lines: values.lines,
    });

    return (result.data as any)?.id ? { id: (result.data as any).id } : null;
  },

  /**
   * Atomically posts a journal entry to the ledger and updates account balances
   * via Server-Authoritative Double-Entry Transaction Cloud Function.
   */
  async postJournalEntry(db: Firestore, entry: JournalEntry, user: UserProfile) {
    if (entry.status === 'POSTED') return;

    const { functions } = initializeFirebase();
    const fnInstance = functions || getFunctions();
    const postFn = httpsCallable(fnInstance, 'postJournalEntry');

    await postFn({
      entryId: entry.id,
    });
  }
};
