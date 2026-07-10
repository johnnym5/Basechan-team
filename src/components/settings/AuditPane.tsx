
'use client';

<<<<<<< HEAD
import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
=======
import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
import type { AuditLog, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow, format } from 'date-fns';
import { Shield, Clock, Search, ExternalLink, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { uiEmitter } from '@/lib/ui-emitter';

interface AuditPaneProps {
    currentUserProfile: UserProfile;
}

export function AuditPane({ currentUserProfile }: AuditPaneProps) {
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');
<<<<<<< HEAD

    const auditQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'audit_logs'),
            where('orgId', '==', currentUserProfile.orgId),
            orderBy('timestamp', 'desc'),
            limit(100)
        );
    }, [firestore, currentUserProfile.orgId]);

    const { data: logs, isLoading } = useCollection<AuditLog>(auditQuery);

=======
    const [logs, setLogs] = useState<AuditLog[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!firestore) return;
            setIsLoading(true);
            try {
                const q = query(
                    collection(firestore, 'audit_logs'),
                    where('orgId', '==', currentUserProfile.orgId),
                    orderBy('timestamp', 'desc'),
                    limit(100)
                );
                const snap = await getDocs(q);
                const results = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }) as AuditLog);
                setLogs(results);
            } catch (e) {
                console.error("Error fetching audit logs:", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLogs();
    }, [firestore, currentUserProfile.orgId]);

>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
    const filteredLogs = logs?.filter(log => 
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleNavigateToResource = (log: AuditLog) => {
        if (!log.resourceId || !log.resourceType) return;
        
        switch(log.resourceType) {
            case 'TASK':
                uiEmitter.emit('open-tasks-dialog', { taskId: log.resourceId });
                break;
            case 'REQUISITION':
                uiEmitter.emit('open-requisitions-dialog', { reqId: log.resourceId });
                break;
            case 'WORKBOOK':
                uiEmitter.emit('open-workbooks-dialog', { workbookId: log.resourceId });
                break;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold font-headline flex items-center gap-2">
                        < Shield className="h-5 w-5 text-primary" />
                        Organizational Audit Trail
                    </h3>
                    <p className="text-xs text-muted-foreground">Immutable record of high-priority system interactions.</p>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Filter by actor or event..." 
                        className="pl-10 h-10 rounded-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="border border-white/5 rounded-2xl overflow-hidden bg-background/40">
                <ScrollArea className="h-[500px]">
                    {isLoading ? (
                        <div className="p-4 space-y-4">
                            {Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="p-20 text-center text-muted-foreground">
                            <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="font-bold">No activity detected.</p>
                            <p className="text-xs">Security events will appear here as they occur.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredLogs.map(log => (
                                <div key={log.id} className="p-4 hover:bg-white/5 transition-colors group">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-xs">
                                                {log.userName.split(' ').map(n=>n[0]).join('')}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-sm">{log.userName}</span>
                                                    <Badge variant="outline" className="text-[9px] font-black tracking-widest uppercase py-0 px-1.5 border-primary/30 text-primary">
                                                        {log.action}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{log.details}</p>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                                    </div>
                                                    {log.resourceId && (
                                                        <button 
                                                            onClick={() => handleNavigateToResource(log)}
                                                            className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                            Inspect {log.resourceType}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-mono text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity">
                                            {format(new Date(log.timestamp), 'HH:mm:ss')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}
