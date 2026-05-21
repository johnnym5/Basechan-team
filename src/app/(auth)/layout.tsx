'use client';

import React from 'react';

/**
 * @deprecated Authentication is now handled via dialogs.
 * Rendering children prevents build-time errors during static generation.
 */
export default function DeprecatedAuthLayout({ children }: { children: React.ReactNode }) {
  return <React.Fragment>{children}</React.Fragment>;
}
