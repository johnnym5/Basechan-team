'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * @deprecated This route collisions with the root page. 
 * Redirecting to the primary dashboard.
 */
export default function DeprecatedAppPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
