import { https } from "firebase-functions/v1";
import { getFirestore, FieldValue, Transaction } from "firebase-admin/firestore";

/**
 * Server-Authoritative Accounting Functions
 */

export const createJournalEntry = https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new https.HttpsError("unauthenticated", "Authentication required.");
  }

  const { orgId, description, reference, lines, date } = data || {};
  if (!orgId || !description || !Array.isArray(lines) || lines.length === 0) {
    throw new https.HttpsError("invalid-argument", "Missing required journal entry fields.");
  }

  const db = getFirestore();
  const callerUid = context.auth.uid;

  // Fetch caller profile for validation & orgId match
  const userSnap = await db.collection("users").doc(callerUid).get();
  if (!userSnap.exists) {
    throw new https.HttpsError("not-found", "User profile not found.");
  }

  const userData = userSnap.data()!;
  const allowedRoles = ["SUPERADMIN", "ORG_ADMIN", "FINANCE_MANAGER", "ACCOUNTANT", "MANAGING_DIRECTOR"];

  // Custom claims or profile role check
  const role = context.auth.token.role || userData.role;
  if (!allowedRoles.includes(role)) {
    throw new https.HttpsError("permission-denied", "Insufficient permissions to create journal entries.");
  }

  const now = new Date().toISOString();
  const journalRef = db.collection("journal_entries").doc();

  const newEntry = {
    id: journalRef.id,
    orgId: userData.orgId || orgId,
    date: date || now,
    description: String(description).trim(),
    reference: String(reference || "").trim(),
    status: "DRAFT",
    createdBy: callerUid,
    creatorName: userData.fullName || "Financial System",
    createdAt: now,
    lines: lines.map((line: any) => ({
      accountId: String(line.accountId),
      accountCode: String(line.accountCode || ""),
      accountName: String(line.accountName || ""),
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
      description: String(line.description || "").trim(),
    })),
  };

  await journalRef.set(newEntry);

  // Log to immutable server audit log
  await db.collection("audit_logs").add({
    orgId: userData.orgId,
    actorId: callerUid,
    actorName: userData.fullName,
    action: "JOURNAL_DRAFT",
    details: `Created draft journal entry: ${reference || journalRef.id}`,
    targetId: journalRef.id,
    targetType: "JOURNAL",
    timestamp: now,
  });

  return { success: true, id: journalRef.id };
});

export const postJournalEntry = https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new https.HttpsError("unauthenticated", "Authentication required.");
  }

  const { entryId } = data || {};
  if (!entryId) {
    throw new https.HttpsError("invalid-argument", "Journal Entry ID is required.");
  }

  const db = getFirestore();
  const callerUid = context.auth.uid;

  const userSnap = await db.collection("users").doc(callerUid).get();
  if (!userSnap.exists) {
    throw new https.HttpsError("not-found", "User profile not found.");
  }

  const userData = userSnap.data()!;
  const allowedRoles = ["SUPERADMIN", "ORG_ADMIN", "FINANCE_MANAGER", "ACCOUNTANT", "MANAGING_DIRECTOR"];
  const role = context.auth.token.role || userData.role;

  if (!allowedRoles.includes(role)) {
    throw new https.HttpsError("permission-denied", "Insufficient permissions to post journal entries.");
  }

  const entryRef = db.collection("journal_entries").doc(entryId);

  // Server-Authoritative Atomic Double-Entry Ledger Transaction
  await db.runTransaction(async (transaction: Transaction) => {
    const entrySnap = await transaction.get(entryRef);
    if (!entrySnap.exists) {
      throw new https.HttpsError("not-found", "Journal entry not found.");
    }

    const entry = entrySnap.data()!;
    if (entry.status === "POSTED") {
      throw new https.HttpsError("failed-precondition", "Journal entry has already been posted.");
    }

    const lines = entry.lines || [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      totalDebit += Number(line.debit || 0);
      totalCredit += Number(line.credit || 0);
    }

    // MANDATORY DOUBLE-ENTRY RULE: Total Debits MUST equal Total Credits
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new https.HttpsError(
        "invalid-argument",
        `Unbalanced journal entry. Total Debits (${totalDebit}) must equal Total Credits (${totalCredit}).`
      );
    }

    // 1. Mark entry as POSTED
    transaction.update(entryRef, {
      status: "POSTED",
      postedAt: new Date().toISOString(),
      postedBy: callerUid,
    });

    // 2. Atomically update balances for all accounts
    for (const line of lines) {
      if (!line.accountId) continue;
      const accountRef = db.collection("accounts").doc(line.accountId);
      const netChange = Number(line.debit || 0) - Number(line.credit || 0);
      transaction.update(accountRef, {
        balance: FieldValue.increment(netChange),
        updatedAt: new Date().toISOString(),
      });
    }
  });

  const now = new Date().toISOString();
  await db.collection("audit_logs").add({
    orgId: userData.orgId,
    actorId: callerUid,
    actorName: userData.fullName,
    action: "JOURNAL_POST",
    details: `Posted journal entry ${entryId} to General Ledger.`,
    targetId: entryId,
    targetType: "JOURNAL",
    timestamp: now,
  });

  return { success: true, message: "Journal entry successfully posted to ledger." };
});
