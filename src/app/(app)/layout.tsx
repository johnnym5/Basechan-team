'use client';

import React from 'react';

/**
 * @deprecated This layout is no longer the primary shell.
 * It must render children to allow Next.js to build the routing tree successfully.
 */
export default function DeprecatedAppLayout({ children }: { children: React.ReactNode }) {
  return <React.Fragment>{children}</React.Fragment>;
}
