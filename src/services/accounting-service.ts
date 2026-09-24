'use client';

import { Firestore, collection, doc, runTransaction } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase';
import type { Account, JournalEntry, UserProfile } from '@/lib/types';
import { sanitizeInput } from '@/lib/utils';
import { auditService } from './audit-service';

/**
 * Pure Client-Side Accounting Service (Zero Cloud Functions)
 * Enforces atomic double-entry ledger transactions directly in the browser via Firestore SDK.
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
   * Creates a draft journal entry directly in Firestore.
   */
  async createJournalEntry(db: Firestore, user: UserProfile, values: any) {
    const totalDebit = (values.lines || []).reduce((sum: number, l: any) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = (values.lines || []).reduce((sum: number, l: any) => sum + (Number(l.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(`Imbalanced Entry: Total Debits ($${totalDebit}) must equal Total Credits ($${totalCredit}).`);
    }

    const nowIso = new Date().toISOString();
    const newJournalRef = doc(collection(db, 'journal_entries'));

    const newEntry = {
      id: newJournalRef.id,
      orgId: user.orgId,
      date: values.date ? new Date(values.date).toISOString() : nowIso,
      description: sanitizeInput(values.description || ''),
      reference: sanitizeInput(values.reference || ''),
      status: 'DRAFT',
      createdBy: user.id,
      creatorName: user.fullName || 'Financial System',
      createdAt: nowIso,
      lines: (values.lines || []).map((line: any) => ({
        accountId: String(line.accountId),
        accountCode: String(line.accountCode || ''),
        accountName: String(line.accountName || ''),
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0),
        description: sanitizeInput(line.description || ''),
      })),
    };

    await addDocumentNonBlocking(collection(db, 'journal_entries'), newEntry);
    auditService.logAction(db, user, 'JOURNAL_DRAFT', `Created draft journal entry: ${values.reference || newJournalRef.id}`, { id: newJournalRef.id, type: 'JOURNAL' });

    return { id: newJournalRef.id };
  },

  /**
   * Atomically posts a journal entry to the ledger and updates account balances
   * via client-side atomic Firestore runTransaction.
   */
  async postJournalEntry(db: Firestore, entry: JournalEntry, user: UserProfile) {
    if (entry.status === 'POSTED') return;

    const entryRef = doc(db, 'journal_entries', entry.id);

    await runTransaction(db, async (transaction) => {
      const entrySnap = await transaction.get(entryRef);
      if (!entrySnap.exists()) {
        throw new Error('Journal entry not found.');
      }

      const entryData = entrySnap.data() as JournalEntry;
      if (entryData.status === 'POSTED') {
        throw new Error('Journal entry has already been posted.');
      }

      const lines = entryData.lines || [];
      let totalDebit = 0;
      let totalCredit = 0;

      for (const line of lines) {
        totalDebit += Number(line.debit || 0);
        totalCredit += Number(line.credit || 0);
      }

      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        throw new Error(`Unbalanced journal entry. Total Debits (${totalDebit}) must equal Total Credits (${totalCredit}).`);
      }

      // Read account snapshots for all referenced lines
      const accountSnaps = await Promise.all(
        lines.map(line => transaction.get(doc(db, 'accounts', line.accountId)))
      );

      // Verify all accounts exist
      accountSnaps.forEach((snap, idx) => {
        if (!snap.exists()) {
          throw new Error(`Account ${lines[idx].accountId} does not exist in Chart of Accounts.`);
        }
      });

      // Update balances for all accounts
      lines.forEach((line, idx) => {
        const snap = accountSnaps[idx];
        const currentBalance = Number(snap.data()?.balance || 0);
        const netChange = Number(line.debit || 0) - Number(line.credit || 0);
        transaction.update(snap.ref, {
          balance: currentBalance + netChange,
          updatedAt: new Date().toISOString()
        });
      });

      // Update journal entry status to POSTED
      transaction.update(entryRef, {
        status: 'POSTED',
        postedAt: new Date().toISOString(),
        postedBy: user.id
      });
    });

    auditService.logAction(db, user, 'JOURNAL_POST', `Posted journal entry ${entry.id} to General Ledger.`, { id: entry.id, type: 'JOURNAL' });
  }
};
