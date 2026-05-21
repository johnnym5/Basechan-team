'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * @deprecated Redirecting to the primary dashboard at root.
 */
export default function DeprecatedOverviewPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
