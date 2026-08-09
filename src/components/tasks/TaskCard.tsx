'use client';

import React, { memo } from 'react';
import type { Task, UserProfile, Permissions } from '@/lib/types';
import { Card, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useContextMenu } from '@/hooks/useContextMenu';
import { ContextMenu, type ContextMenuItem } from '../shared/ContextMenu';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { Pencil, Trash2, Eye } from 'lucide-react';
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface TaskCardProps {
    task: Task;
    userProfile: UserProfile;
    permissions: Permissions;
    onSelect: (task: Task) => void;
}

export const TaskCard = memo(function TaskCard({ task, onSelect, permissions }: TaskCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { currentStatus: task.status }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 1,
    };

    const { isOpen, anchorPoint, handleContextMenu, handleTouchStart, handleTouchEnd, closeMenu } = useContextMenu();

    const menuItems: ContextMenuItem[] = [
        { label: 'View Details', icon: <Eye className="h-4 w-4" />, action: () => onSelect(task) },
        ...(permissions.canManageStaff ? [
            { label: 'Edit Task', icon: <Pencil className="h-4 w-4" />, action: () => onSelect(task) },
            { label: 'Delete Task', icon: <Trash2 className="h-4 w-4" />, action: () => onSelect(task), className: 'text-destructive' }
        ] : [])
    ];

    return (
        <>
            <Card 
                ref={setNodeRef}
                style={style}
                {...listeners}
                {...attributes}
                className={cn(
                    "group border border-border/60 bg-muted/30 hover:bg-muted/50 rounded-xl shadow-sm transition-all cursor-grab active:cursor-grabbing m3-interactive",
                    isDragging && "shadow-xl border-primary/50"
                )}
                onClick={() => onSelect(task)}
                onContextMenu={handleContextMenu}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <TaskPriorityBadge priority={task.priority} />
                        <Badge variant="secondary" className="text-[0.625rem] uppercase">{task.assignedToName}</Badge>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground leading-tight line-clamp-2">{task.title}</p>
                      <p className="text-[0.625rem] font-mono text-muted-foreground mt-1">{task.serialNo}</p>
                    </div>
                </CardContent>
            </Card>
            <ContextMenu isOpen={isOpen} anchorPoint={anchorPoint} items={menuItems} onClose={closeMenu} />
        </>
    )
}, (prev, next) => {
    return prev.task.id === next.task.id && 
           prev.task.status === next.task.status && 
           prev.task.priority === next.task.priority &&
           prev.task.title === next.task.title;
});
