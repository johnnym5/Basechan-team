'use client';

import { FinanceHub } from "@/components/finance/FinanceHub";
import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";

export default function FinancePage() {
  return (
    <ModuleContainer noScroll={true} className="border-none bg-transparent shadow-none">
      <FinanceHub />
    </ModuleContainer>
  );
}
