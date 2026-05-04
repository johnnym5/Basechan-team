'use client';

import React, { memo } from 'react';
import type { Task, UserProfile } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { Card, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useContextMenu } from '@/hooks/useContextMenu';
import { ContextMenu, type ContextMenuItem } from '../shared/ContextMenu';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { Pencil, Trash2, Eye } from 'lucide-react';

interface TaskCardProps {
    task: Task;
    userProfile: UserProfile;
    permissions: Permissions;
    onSelect: (task: Task) => void;
}

export const TaskCard = memo(function TaskCard({ task, onSelect, permissions }: TaskCardProps) {
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
                className="bg-card/50 backdrop-blur-xl hover:bg-card hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
                onClick={() => onSelect(task)}
                onContextMenu={handleContextMenu}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <TaskPriorityBadge priority={task.priority} />
                        <Badge variant="secondary" className="text-[10px] uppercase">{task.assignedToName}</Badge>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground leading-tight line-clamp-2">{task.title}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-1">{task.serialNo}</p>
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
