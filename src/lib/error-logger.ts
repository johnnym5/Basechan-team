
'use client';

import { collection, Firestore } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { ErrorLog, UserProfile } from './types';

export function logErrorToFirestore(
  firestore: Firestore | null,
  error: Error & { digest?: string },
  errorInfo?: { componentStack?: string | null },
  userProfile?: UserProfile | null
) {
  if (!firestore) {
    console.warn("Telemetry unavailable: Firestore instance not provided.");
    console.error("Original Error:", error);
    return;
  }

  try {
    const errorLog: Omit<ErrorLog, 'id'> = {
      errorMessage: error.message || "Unknown error",
      stackTrace: error.stack || error.digest || 'No stack trace available',
      componentStack: errorInfo?.componentStack || 'No component stack available',
      timestamp: new Date().toISOString(),
      path: typeof window !== 'undefined' ? window.location.pathname : 'N/A',
      userId: userProfile?.id || 'anonymous',
      userName: userProfile?.fullName || 'Anonymous User',
      orgId: userProfile?.orgId || 'unknown',
    };

    // This is a fire-and-forget operation
    addDocumentNonBlocking(collection(firestore, 'error_logs'), errorLog);
  } catch (loggingError) {
    // Prevent recursive error loops by only logging to console if the telemetry itself fails
    console.warn("--- TELEMETRY FAILURE ---");
    console.warn("Original Error:", error);
    console.warn("Logging Error:", loggingError);
    console.warn("-------------------------");
  }
}
