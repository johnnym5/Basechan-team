'use client';

import React, { memo } from 'react';
import type { Task, UserProfile, Permissions } from '@/lib/types';
import { Card, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useContextMenu } from '@/hooks/useContextMenu';
import { ContextMenu, type ContextMenuItem } from '../shared/ContextMenu';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { Pencil, Trash2, Eye, ArrowRight } from 'lucide-react';

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
                className={cn(
                    "group border border-border/60 bg-muted/30 hover:bg-muted/50 rounded-xl shadow-sm transition-all cursor-pointer m3-interactive"
                )}
                onClick={() => onSelect(task)}
                onContextMenu={handleContextMenu}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <TaskPriorityBadge priority={task.priority} />
                        <div className="flex items-center gap-2">
                            {task.isTransferred && (
                                <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[8px] font-black uppercase tracking-widest">
                                    Transferred
                                </Badge>
                            )}
                            <Badge variant="secondary" className="text-[0.625rem] uppercase">{task.assignedToName}</Badge>
                        </div>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground leading-tight line-clamp-2">{task.title}</p>
                      <p className="text-[0.625rem] font-mono text-muted-foreground mt-1">{task.serialNo}</p>
                    </div>

                    {/* Chain of Custody Audit Trail */}
                    {task.transferHistory && task.transferHistory.length > 0 && (
                        <div className="text-[9px] text-muted-foreground bg-black/10 p-2 rounded-lg border border-white/5 space-y-1">
                            <span className="font-black uppercase tracking-widest opacity-40 block">Chain of Custody</span>
                            <div className="flex flex-wrap items-center gap-1">
                                {task.transferHistory.map((record, index) => (
                                    <React.Fragment key={index}>
                                        <span className="font-bold text-primary/70">{record.fromName.split(' ')[0]}</span>
                                        <ArrowRight className="h-2 w-2 opacity-30" />
                                        {task.transferHistory && index === task.transferHistory.length - 1 && (
                                            <span className="font-bold text-foreground">{record.toName.split(' ')[0]}</span>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            <ContextMenu isOpen={isOpen} anchorPoint={anchorPoint} items={menuItems} onClose={closeMenu} />
        </>
    )
}, (prev, next) => {
    return prev.task.id === next.task.id && 
           prev.task.status === next.task.status && 
           prev.task.priority === next.task.priority &&
           prev.task.title === next.task.title &&
           prev.task.isTransferred === next.task.isTransferred &&
           JSON.stringify(prev.task.transferHistory) === JSON.stringify(next.task.transferHistory);
});
