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
}

export function TaskCard({ task, userProfile, permissions, onSelect }: TaskCardProps) {
    return (
        <Card 
            className="bg-card/50 backdrop-blur-xl hover:bg-card hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
            onClick={() => onSelect(task)}
        >
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <TaskPriorityBadge priority={task.priority} />
                    <Badge variant="secondary">{task.assignedToName}</Badge>
                </div>
                <p className="font-semibold text-foreground leading-snug">{task.title}</p>
            </CardContent>
        </Card>
    )
}
