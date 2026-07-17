'use client';
import { Badge } from "@/components/ui/badge";
import type { RequisitionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RequisitionStatusBadgeProps {
  status: RequisitionStatus;
  className?: string;
}

const statusStyles: Record<RequisitionStatus, string> = {
  PENDING_HR: "bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30",
  PENDING_FINANCE: "bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30",
  PENDING_MD: "bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30",
  APPROVED: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30",
  PAID: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30",
  REJECTED: "bg-rose-500/20 text-rose-500 border border-rose-500/30 hover:bg-rose-500/30",
};

export function RequisitionStatusBadge({ status, className }: RequisitionStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("font-medium", statusStyles[status], className)}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
