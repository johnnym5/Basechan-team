'use client';

import type { Task, UserProfile } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { Card, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { ListTodo, Users, Archive } from 'lucide-react';
import { TaskPriorityBadge } from './TaskPriorityBadge';

interface TaskCardProps {
    task: Task;
    userProfile: UserProfile;
    permissions: Permissions;
    onSelect: (task: Task) => void;
}

const getIconForTask = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('inventory')) return <Archive />;
    if (lowerTitle.includes('staff') || lowerTitle.includes('team')) return <Users />;
    return <ListTodo />;
}

const getStatusBadge = (status: Task['status']) => {
    switch(status) {
        case 'QUEUED':
            return <div className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-bold text-orange-500 uppercase">Pending</div>;
        case 'ACTIVE':
            return <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-500 uppercase">Active</div>;
        case 'AWAITING_REVIEW':
             return <div className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-bold text-yellow-500 uppercase">Review</div>;
        case 'ARCHIVED':
             return <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-500 uppercase">Done</div>;
        default:
            return <div className="px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-[10px] font-bold text-slate-500 uppercase">Scheduled</div>;

    }
}

export function TaskCard({ task, userProfile, permissions, onSelect }: TaskCardProps) {
    return (
      <>
        {/* Mobile View */}
        <div className="md:hidden glass p-4 rounded-xl flex items-center gap-4 group cursor-pointer border border-white/5 hover:border-primary/30 transition-colors" onClick={() => onSelect(task)}>
            <div className="size-12 rounded-full bg-slate-800/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary">
                    {task.title.toLowerCase().includes('inventory') ? 'inventory_2' : task.title.toLowerCase().includes('staff') ? 'groups' : 'task'}
                </span>
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-sm">{task.title}</h4>
                <p className="text-xs text-slate-500">Assigned to {task.assignedToName}</p>
            </div>
            {getStatusBadge(task.status)}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
             <Card 
                className="bg-card/50 backdrop-blur-xl hover:bg-card hover:shadow-md transition-all cursor-pointer"
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
        </div>
      </>
    )
}
