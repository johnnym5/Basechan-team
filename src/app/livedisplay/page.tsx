'use client';

import React, { Suspense } from "react";
import { LiveDisplays } from "@/components/LiveDisplays";
import { useSearchParams } from "next/navigation";

function LiveDisplayContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  return (
    <LiveDisplays initialPayload={id ? { displayId: id } : undefined} />
  );
}

export default function LiveDisplayPage() {
  return (
    <main className="flex-1 w-full h-full p-4 md:p-6 overflow-hidden bg-background">
      <Suspense fallback={<div className="h-full w-full flex items-center justify-center">Loading Live Matrix...</div>}>
        <LiveDisplayContent />
      </Suspense>
    </main>
  );
}
