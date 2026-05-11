'use client';

import { Firestore, collection, doc, query, where, getDocs, writeBatch, increment } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { Account, JournalEntry, UserProfile, JournalEntryStatus, JournalEntryLine } from '@/lib/types';
import { sanitizeInput } from '@/lib/utils';

/**
 * Service to handle organization-wide financial accounting logic.
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
    return await addDocumentNonBlocking(accountsRef, newAccount);
  },

  /**
   * Creates a draft journal entry.
   */
  async createJournalEntry(db: Firestore, user: UserProfile, values: any) {
    const journalRef = collection(db, 'journal_entries');
    const newEntry: Omit<JournalEntry, 'id'> = {
      orgId: user.orgId,
      date: new Date(values.date).toISOString(),
      description: sanitizeInput(values.description),
      reference: sanitizeInput(values.reference || ""),
      status: 'DRAFT',
      createdBy: user.id,
      creatorName: user.fullName,
      createdAt: new Date().toISOString(),
      lines: values.lines,
    };
    return await addDocumentNonBlocking(journalRef, newEntry);
  },

  /**
   * Atomically posts a journal entry to the ledger and updates account balances.
   */
  async postJournalEntry(db: Firestore, entry: JournalEntry) {
    if (entry.status === 'POSTED') return;

    const batch = writeBatch(db);
    const entryRef = doc(db, 'journal_entries', entry.id);

    // 1. Update entry status to POSTED
    batch.update(entryRef, { status: 'POSTED' });

    // 2. Update balances for each account involved
    for (const line of entry.lines) {
      const accountRef = doc(db, 'accounts', line.accountId);
      
      // Net change for the account (Debits - Credits)
      const netChange = line.debit - line.credit;
      
      // Use increment to update balance in a single atomic operation
      batch.update(accountRef, { balance: increment(netChange) });
    }

    await batch.commit();
  }
};
