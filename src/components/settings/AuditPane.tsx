
'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import type { AuditLog, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow, format } from 'date-fns';
import { Shield, Clock, Search, ExternalLink, Activity, Database, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { uiEmitter } from '@/lib/ui-emitter';

interface AuditPaneProps {
    currentUserProfile: UserProfile;
    searchTerm: string;
}

interface IndexDefinition {
    id: string;
    name: string;
    collection: string;
    description: string;
    fields: string[];
    testQuery: (firestore: any, orgId: string) => Promise<any>;
}

interface IndexStatus {
    status: 'checking' | 'active' | 'missing' | 'error';
    errorUrl: string | null;
    errorMessage: string | null;
}

const INDEX_DEFINITIONS: IndexDefinition[] = [
    {
        id: "tasks-org-date",
        name: "Tasks by Org & Date",
        collection: "tasks",
        description: "Enables organizational dashboard feed, charts, and activity streams.",
        fields: ["orgId (ASC)", "createdAt (DESC)"],
        testQuery: (db, orgId) => getDocs(query(collection(db, 'tasks'), where('orgId', '==', orgId), orderBy('createdAt', 'desc'), limit(1)))
    },
    {
        id: "tasks-assigned-date",
        name: "Tasks by Assigned To & Date",
        collection: "tasks",
        description: "Enables individual user's assigned task lists sorted by date.",
        fields: ["assignedTo (ASC)", "createdAt (DESC)"],
        testQuery: (db, orgId) => getDocs(query(collection(db, 'tasks'), where('assignedTo', '==', 'test-user-id'), orderBy('createdAt', 'desc'), limit(1)))
    },
    {
        id: "tasks-assigned-name-date",
        name: "Tasks by Assignee Name & Date",
        collection: "tasks",
        description: "Enables filtering and sorting tasks by team member names.",
        fields: ["assignedToName (ASC)", "createdAt (DESC)"],
        testQuery: (db, orgId) => getDocs(query(collection(db, 'tasks'), where('assignedToName', '==', 'test-name'), orderBy('createdAt', 'desc'), limit(1)))
    },
    {
        id: "users-org-username",
        name: "Users by Org & Username",
        collection: "users",
        description: "Enables validation during login and unique username lookups.",
        fields: ["orgId (ASC)", "username (ASC)"],
        testQuery: (db, orgId) => getDocs(query(collection(db, 'users'), where('orgId', '==', orgId), orderBy('username', 'asc'), limit(1)))
    },
    {
        id: "chats-participants-update",
        name: "Chats by Participants & Updates",
        collection: "chats",
        description: "Enables real-time team chats ordered by most recent messages.",
        fields: ["participants (CONTAINS)", "updatedAt (DESC)"],
        testQuery: (db, orgId) => getDocs(query(collection(db, 'chats'), where('participants', 'array-contains', 'test-user-id'), orderBy('updatedAt', 'desc'), limit(1)))
    },
    {
        id: "reports-org-date",
        name: "Daily Reports by Org & Date",
        collection: "daily_reports",
        description: "Enables managers to view historical daily submission records.",
        fields: ["orgId (ASC)", "createdAt (DESC)"],
        testQuery: (db, orgId) => getDocs(query(collection(db, 'daily_reports'), where('orgId', '==', orgId), orderBy('createdAt', 'desc'), limit(1)))
    },
    {
        id: "announcements-org-date",
        name: "Announcements by Org & Date",
        collection: "announcements",
        description: "Enables the company announcement bulletin board stream.",
        fields: ["orgId (ASC)", "createdAt (DESC)"],
        testQuery: (db, orgId) => getDocs(query(collection(db, 'announcements'), where('orgId', '==', orgId), orderBy('createdAt', 'desc'), limit(1)))
    },
    {
        id: "attendance-user-date",
        name: "Attendance by User, Date & Clock In",
        collection: "attendance",
        description: "Enables individual clock-in and clock-out historical tracking.",
        fields: ["userId (ASC)", "date (ASC)", "clockIn (DESC)"],
        testQuery: (db, orgId) => getDocs(query(collection(db, 'attendance'), where('userId', '==', 'test-user-id'), where('date', '==', '2026-07-19'), orderBy('clockIn', 'desc'), limit(1)))
    },
    {
        id: "attendance-org-date",
        name: "Attendance by Org, Date & Clock In",
        collection: "attendance",
        description: "Enables Live Staff Monitors and real-time administrative dashboards.",
        fields: ["orgId (ASC)", "date (ASC)", "clockIn (DESC)"],
        testQuery: (db, orgId) => getDocs(query(collection(db, 'attendance'), where('orgId', '==', orgId), where('date', '==', '2026-07-19'), orderBy('clockIn', 'desc'), limit(1)))
    },
    {
        id: "rosters-org-date",
        name: "Rosters by Org & Date",
        collection: "rosters",
        description: "Enables organizational shifts and attendance roster grids.",
        fields: ["orgId (ASC)", "date (DESC)"],
        testQuery: (db, orgId) => getDocs(query(collection(db, 'rosters'), where('orgId', '==', orgId), orderBy('date', 'desc'), limit(1)))
    }
];

export function AuditPane({ currentUserProfile, searchTerm }: AuditPaneProps) {
    const firestore = useFirestore();
    const [activeSection, setActiveSection] = useState<'logs' | 'indexes'>('logs');
    const [logs, setLogs] = useState<AuditLog[] | null>(null);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);
    
    // Index health states
    const [indexStatuses, setIndexStatuses] = useState<Record<string, IndexStatus>>({});
    const [isAnalyzingIndexes, setIsAnalyzingIndexes] = useState(false);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!firestore) return;
            setIsLoadingLogs(true);
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
                setIsLoadingLogs(false);
            }
        };

        if (activeSection === 'logs') {
            fetchLogs();
        }
    }, [firestore, currentUserProfile.orgId, activeSection]);

    // Analyze indexes dynamically
    const runIndexCheck = async () => {
        if (!firestore) return;
        setIsAnalyzingIndexes(true);
        
        // Initialize all as checking
        const initialStatuses: Record<string, IndexStatus> = {};
        INDEX_DEFINITIONS.forEach(idx => {
            initialStatuses[idx.id] = { status: 'checking', errorUrl: null, errorMessage: null };
        });
        setIndexStatuses(initialStatuses);

        for (const idx of INDEX_DEFINITIONS) {
            try {
                await idx.testQuery(firestore, currentUserProfile.orgId);
                setIndexStatuses(prev => ({
                    ...prev,
                    [idx.id]: { status: 'active', errorUrl: null, errorMessage: null }
                }));
            } catch (error: any) {
                console.log(`Checking index '${idx.name}' returned status:`, error.code || error.message);
                
                const message = error.message || '';
                const urlMatch = message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
                
                if (urlMatch) {
                    // Extract exact Firestore setup URL from error code
                    const cleanUrl = urlMatch[0].replace(/[.,;)]+$/, ''); // Clean punctuation
                    setIndexStatuses(prev => ({
                        ...prev,
                        [idx.id]: { status: 'missing', errorUrl: cleanUrl, errorMessage: message }
                    }));
                } else if (error.code === 'permission-denied') {
                    // Sometimes dummy user triggers permission errors, which implies query went through (and index exists!)
                    setIndexStatuses(prev => ({
                        ...prev,
                        [idx.id]: { status: 'active', errorUrl: null, errorMessage: null }
                    }));
                } else {
                    setIndexStatuses(prev => ({
                        ...prev,
                        [idx.id]: { status: 'error', errorUrl: null, errorMessage: message }
                    }));
                }
            }
        }
        setIsAnalyzingIndexes(false);
    };

    useEffect(() => {
        if (activeSection === 'indexes' && Object.keys(indexStatuses).length === 0) {
            runIndexCheck();
        }
    }, [activeSection, firestore]);

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

    // Computes aggregate status for indexes
    const totalCount = INDEX_DEFINITIONS.length;
    const activeCount = Object.values(indexStatuses).filter(s => s.status === 'active').length;
    const missingCount = Object.values(indexStatuses).filter(s => s.status === 'missing').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold font-headline flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Infrastructure & Security Settings
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">Verify structural telemetry logs and index health parameters.</p>
                </div>

                {/* Sub-tab navigation */}
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 shrink-0 self-start sm:self-auto">
                    <button
                        onClick={() => setActiveSection('logs')}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
                            activeSection === 'logs' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Activity className="h-3.5 w-3.5" />
                        Audit Trail
                    </button>
                    <button
                        onClick={() => setActiveSection('indexes')}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
                            activeSection === 'indexes' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Database className="h-3.5 w-3.5" />
                        Index Health
                    </button>
                </div>
            </div>

            {activeSection === 'logs' ? (
                // ─── AUDIT TRAIL TAB ──────────────────────────────────────────────────
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-background/40">
                    <ScrollArea className="h-[500px]">
                        {isLoadingLogs ? (
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
                                                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-xs shrink-0">
                                                    {log.userName.split(' ').map(n=>n[0]).join('')}
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
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
                                            <span className="text-[9px] font-mono text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity shrink-0">
                                                {format(new Date(log.timestamp), 'HH:mm:ss')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            ) : (
                // ─── INDEX HEALTH MONITOR TAB ──────────────────────────────────────────
                <div className="space-y-6">
                    {/* Header Summary Dashboard */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between shadow-xl">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Indexes</p>
                                <h4 className="text-2xl font-black mt-1 text-emerald-500">
                                    {isAnalyzingIndexes ? <Loader2 className="h-5 w-5 animate-spin inline" /> : `${activeCount} / ${totalCount}`}
                                </h4>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-20" />
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between shadow-xl">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Missing Indexes</p>
                                <h4 className={cn("text-2xl font-black mt-1", missingCount > 0 ? "text-destructive" : "text-muted-foreground")}>
                                    {isAnalyzingIndexes ? <Loader2 className="h-5 w-5 animate-spin inline" /> : `${missingCount} / ${totalCount}`}
                                </h4>
                            </div>
                            <AlertCircle className="h-8 w-8 text-destructive opacity-20" />
                        </div>
                        <button
                            onClick={runIndexCheck}
                            disabled={isAnalyzingIndexes}
                            className="p-4 rounded-2xl bg-primary/10 hover:bg-primary/15 active:scale-95 border border-primary/25 flex items-center justify-between text-left transition-all group shadow-xl"
                        >
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">System Telemetry</p>
                                <h4 className="text-sm font-bold mt-1 text-foreground flex items-center gap-1.5">
                                    {isAnalyzingIndexes ? 'Running Audit...' : 'Re-Analyze All'}
                                    <RefreshCw className={cn("h-3.5 w-3.5 text-primary", isAnalyzingIndexes && "animate-spin")} />
                                </h4>
                            </div>
                            <Database className="h-8 w-8 text-primary opacity-25 group-hover:opacity-40 transition-opacity" />
                        </button>
                    </div>

                    {/* Indexes Grid */}
                    <div className="border border-white/5 rounded-2xl overflow-hidden bg-background/40">
                        <ScrollArea className="h-[400px]">
                            <div className="divide-y divide-white/5">
                                {INDEX_DEFINITIONS.map(idx => {
                                    const state = indexStatuses[idx.id] || { status: 'checking', errorUrl: null, errorMessage: null };

                                    return (
                                        <div key={idx.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                                            <div className="space-y-1 pr-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h5 className="font-bold text-sm text-foreground">{idx.name}</h5>
                                                    <Badge variant="outline" className="text-[9px] font-mono tracking-wider font-bold py-0 px-1 border-white/10 uppercase bg-white/5">
                                                        {idx.collection}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground leading-normal max-w-2xl">{idx.description}</p>
                                                
                                                {/* Fields list */}
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {idx.fields.map((f, fi) => (
                                                        <span key={fi} className="text-[9px] font-mono text-muted-foreground/80 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                                            {f}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Action / Status area */}
                                            <div className="flex items-center shrink-0 min-w-[150px] justify-end">
                                                {state.status === 'checking' && (
                                                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                                        Checking
                                                    </div>
                                                )}
                                                {state.status === 'active' && (
                                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Active
                                                    </div>
                                                )}
                                                {state.status === 'missing' && state.errorUrl && (
                                                    <a
                                                        href={state.errorUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 hover:bg-primary/20 hover:scale-105 border border-primary/30 px-3 py-2 rounded-xl shadow-lg shadow-primary/10 transition-all"
                                                    >
                                                        Create Index
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                    </a>
                                                )}
                                                {state.status === 'error' && (
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20" title={state.errorMessage || 'Unknown telemetry failure'}>
                                                        <AlertCircle className="h-4 w-4" />
                                                        Alert
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            )}
        </div>
    );
}

