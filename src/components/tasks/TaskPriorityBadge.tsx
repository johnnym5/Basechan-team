'use client';
import { Badge } from "@/components/ui/badge";
import type { TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Zap, Target, CheckSquare } from "lucide-react";

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

const priorityStyles: Record<TaskPriority, string> = {
  LEVEL_1: "bg-sky-500/20 text-sky-400 border-sky-500/30 hover:bg-sky-500/30",
  LEVEL_2: "bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500/30",
  LEVEL_3: "bg-rose-500/20 text-rose-500 border-rose-500/30 hover:bg-rose-500/30",
};

const priorityIcons: Record<TaskPriority, React.ElementType> = {
    LEVEL_1: CheckSquare,
    LEVEL_2: Target,
    LEVEL_3: Zap,
};

const priorityLabels: Record<TaskPriority, string> = {
    LEVEL_1: "Low",
    LEVEL_2: "Medium",
    LEVEL_3: "High",
};


export function TaskPriorityBadge({ priority, className }: TaskPriorityBadgeProps) {
  if (!priority || !priorityIcons[priority]) {
    return null;
  }

  const Icon = priorityIcons[priority];
  const label = priorityLabels[priority];

  return (
    <Badge variant="outline" className={cn("font-medium text-xs gap-1.5", priorityStyles[priority], className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
