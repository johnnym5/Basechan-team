'use client';

import type { Task, UserProfile } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { Card, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { ListTodo, Users, Archive } from 'lucide-react';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { Checkbox } from '../ui/checkbox';

interface TaskCardProps {
    task: Task;
    userProfile: UserProfile;
    permissions: Permissions;
    onSelect: (task: Task) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    onTouchStart?: (e: React.TouchEvent) => void;
    onTouchEnd?: () => void;
}

export function TaskCard({ task, onSelect, onContextMenu, onTouchStart, onTouchEnd }: TaskCardProps) {
    return (
        <Card 
            className="bg-card/50 backdrop-blur-xl hover:bg-card hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
            onClick={() => onSelect(task)}
            onContextMenu={onContextMenu}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <TaskPriorityBadge priority={task.priority} />
                    <Badge variant="secondary">{task.assignedToName}</Badge>
                </div>
                <div>
                  <p className="font-semibold text-foreground leading-snug">{task.title}</p>
                  <p className="text-xs font-mono text-muted-foreground">{task.serialNo}</p>
                </div>
            </CardContent>
        </Card>
    )
}
