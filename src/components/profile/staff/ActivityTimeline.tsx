'use client';

import { useMemo } from 'react';
import type { Attendance, Task } from '@/lib/types';
import { format, parseISO, isAfter } from 'date-fns';
import {
  Clock,
  CheckCircle2,
  Timer,
  LogOut,
  Coffee,
  Play,
  PlusCircle,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  type: 'ATTENDANCE' | 'TASK' | 'COMMENT';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  icon: React.ReactNode;
  colorClass: string;
}

interface ActivityTimelineProps {
  attendance: Attendance[];
  tasks: Task[];
}

export function ActivityTimeline({ attendance, tasks }: ActivityTimelineProps) {
  const events = useMemo(() => {
    const list: TimelineEvent[] = [];

    // 1. Map Attendance Logs
    attendance.forEach(log => {
      // Clock In
      list.push({
        id: `${log.id}-in`,
        type: 'ATTENDANCE',
        title: 'Clocked In',
        description: `Operational session started from ${log.location?.toLowerCase() || 'office'}.`,
        timestamp: log.clockIn,
        icon: <Play className="h-3.5 w-3.5" />,
        colorClass: 'bg-emerald-500',
      });

      // Clock Out
      if (log.clockOut) {
        list.push({
          id: `${log.id}-out`,
          type: 'ATTENDANCE',
          title: 'Clocked Out',
          description: `Duty cycle ended. Total worked: ${Math.floor((log.duration || 0) / 3600)}h ${Math.floor(((log.duration || 0) % 3600) / 60)}m.`,
          timestamp: log.clockOut,
          icon: <LogOut className="h-3.5 w-3.5" />,
          colorClass: 'bg-rose-500',
        });
      }

      // Breaks
      log.breaks?.forEach((br, idx) => {
        list.push({
          id: `${log.id}-break-start-${idx}`,
          type: 'ATTENDANCE',
          title: 'Break Started',
          description: 'Unit moved to standby/resting state.',
          timestamp: br.start,
          icon: <Coffee className="h-3.5 w-3.5" />,
          colorClass: 'bg-amber-500',
        });
        if (br.end) {
          list.push({
            id: `${log.id}-break-end-${idx}`,
            type: 'ATTENDANCE',
            title: 'Break Ended',
            description: 'Unit resumed operational duties.',
            timestamp: br.end,
            icon: <Play className="h-3.5 w-3.5" />,
            colorClass: 'bg-emerald-500',
          });
        }
      });
    });

    // 2. Map Task Logs
    tasks.forEach(task => {
      // Task Creation/Assignment
      list.push({
        id: `${task.id}-created`,
        type: 'TASK',
        title: 'Task Assigned',
        description: `Mission "${task.title}" added to queue.`,
        timestamp: task.createdAt,
        status: task.status,
        icon: <PlusCircle className="h-3.5 w-3.5" />,
        colorClass: 'bg-primary',
      });

      // Task Completion or Status Changes from Activity feed
      task.activity?.forEach((act, idx) => {
        if (act.type === 'LOG' && act.toStatus === 'AWAITING_REVIEW') {
           list.push({
            id: `${task.id}-review-${idx}`,
            type: 'TASK',
            title: 'Mission Pending Review',
            description: `Unit submitted "${task.title}" for review.`,
            timestamp: act.timestamp,
            icon: <Timer className="h-3.5 w-3.5" />,
            colorClass: 'bg-amber-500',
          });
        }
        if (act.type === 'COMMENT') {
           list.push({
            id: `${task.id}-comment-${idx}`,
            type: 'COMMENT',
            title: 'Task Intel',
            description: act.text,
            timestamp: act.timestamp,
            icon: <MessageSquare className="h-3.5 w-3.5" />,
            colorClass: 'bg-blue-500',
          });
        }
      });

      if (task.status === 'ARCHIVED') {
         list.push({
            id: `${task.id}-archived`,
            type: 'TASK',
            title: 'Mission Completed',
            description: `"${task.title}" has been successfully archived.`,
            timestamp: task.activity?.[task.activity.length - 1]?.timestamp || task.createdAt,
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            colorClass: 'bg-emerald-500',
          });
      }
    });

    // Sort by timestamp descending
    return list.sort((a, b) => isAfter(parseISO(b.timestamp), parseISO(a.timestamp)) ? 1 : -1);
  }, [attendance, tasks]);

  if (events.length === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-white/5 rounded-[2rem] bg-secondary/5">
         <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-4 opacity-20" />
         <p className="text-xs font-bold opacity-30 uppercase tracking-[0.2em]">Zero Operational History Found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5">
      {events.map((event) => (
        <div key={event.id} className="relative pl-10 group">
          {/* Timeline Dot */}
          <div className={cn(
            "absolute left-2 top-1.5 h-4 w-4 rounded-full ring-4 ring-background z-10 flex items-center justify-center text-white",
            event.colorClass
          )}>
            {event.icon}
          </div>

          <Card className="m3-surface-low border-none rounded-2xl group-hover:bg-white/5 transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <p className="font-black text-xs tracking-tight uppercase">{event.title}</p>
                <time className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">
                  {format(parseISO(event.timestamp), 'MMM d, HH:mm')}
                </time>
              </div>
              <p className="text-sm font-medium leading-relaxed opacity-70">
                {event.description}
              </p>
              {event.status && (
                <Badge variant="outline" className="text-[7px] font-black uppercase opacity-40">
                  Status: {event.status}
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
