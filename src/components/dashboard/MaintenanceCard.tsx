'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Workbook, Sheet, UserProfile } from '@/lib/types';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Hammer, AlertTriangle, CheckCircle2, Loader2, ChevronRight, Settings2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { uiEmitter } from '@/lib/ui-emitter';
import { isBefore, addDays, parseISO } from 'date-fns';
import { ORG_ID } from '@/lib/config';

interface MaintenanceCardProps {
    userProfile: UserProfile | null;
}

interface MaintenanceAlert {
    assetName: string;
    workbookId: string;
    sheetId: string;
    date: string;
    status: 'OVERDUE' | 'UPCOMING';
}

export function MaintenanceCard({ userProfile }: MaintenanceCardProps) {
    const firestore = useFirestore();
    const orgId = userProfile?.orgId || ORG_ID;
    const [alerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const workbooksQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'workbooks'),
            where('orgId', '==', orgId)
        );
    }, [firestore, orgId]);

    const { data: workbooks } = useCollection<Workbook>(workbooksQuery);

    useEffect(() => {
        const scanForMaintenance = async () => {
            if (!firestore || !workbooks) return;
            setIsLoading(true);
            const foundAlerts: MaintenanceAlert[] = [];
            const now = new Date();
            const threshold = addDays(now, 7);

            try {
                // Focus on workbooks likely to contain asset/maintenance data
                const relevantWorkbooks = workbooks.filter(wb => 
                    ['maintenance', 'equipment', 'asset', 'vehicle', 'inventory'].some(k => wb.title.toLowerCase().includes(k))
                );

                for (const wb of relevantWorkbooks) {
                    const sheetsSnap = await getDocs(collection(firestore, `workbooks/${wb.id}/sheets`));
                    
                    sheetsSnap.forEach(doc => {
                        const sheet = doc.data() as Sheet;
                        const dateHeaders = sheet.headers.filter(h => 
                            ['maintenance', 'service', 'expiry', 'next'].some(k => h.toLowerCase().includes(k))
                        );

                        if (dateHeaders.length > 0) {
                            sheet.data.forEach(row => {
                                dateHeaders.forEach(header => {
                                    const dateVal = row[header];
                                    if (dateVal) {
                                        try {
                                            const mDate = parseISO(dateVal);
                                            if (isBefore(mDate, now)) {
                                                foundAlerts.push({
                                                    assetName: row['Name'] || row['Item'] || row['Asset ID'] || 'Unknown Asset',
                                                    workbookId: wb.id,
                                                    sheetId: doc.id,
                                                    date: dateVal,
                                                    status: 'OVERDUE'
                                                });
                                            } else if (isBefore(mDate, threshold)) {
                                                foundAlerts.push({
                                                    assetName: row['Name'] || row['Item'] || row['Asset ID'] || 'Unknown Asset',
                                                    workbookId: wb.id,
                                                    sheetId: doc.id,
                                                    date: dateVal,
                                                    status: 'UPCOMING'
                                                });
                                            }
                                        } catch (e) {}
                                    }
                                });
                            });
                        }
                    });
                }
                setMaintenanceAlerts(foundAlerts.slice(0, 3)); // Compacted view: max 3 alerts
            } catch (error) {
                console.error("Maintenance scan failed:", error);
            } finally {
                setIsLoading(false);
            }
        };

        scanForMaintenance();
    }, [firestore, workbooks]);

    const handleJumpToSheet = (alert: MaintenanceAlert) => {
        uiEmitter.emit('open-workbooks-dialog', { workbookId: alert.workbookId, sheetId: alert.sheetId });
    };

    if (isLoading) {
        return (
            <section className="card-bg rounded-2xl p-4 shadow-lg animate-slide-up-fade">
                <Skeleton className="h-6 w-1/2 mb-4" />
                <div className="space-y-3">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                </div>
            </section>
        );
    }

    return (
        <section className="card-bg rounded-2xl p-4 shadow-lg animate-slide-up-fade" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold font-headline flex items-center gap-2">
                    <Hammer className="h-4 w-4 text-primary" />
                    Maintenance Radar
                </h3>
                {alerts.length > 0 && (
                    <span className="text-[8px] font-black bg-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded-full animate-pulse uppercase tracking-tighter">
                        {alerts.length} Critical
                    </span>
                )}
            </div>

            <div className="space-y-2">
                {alerts.length === 0 ? (
                    <div className="py-6 flex flex-col items-center justify-center text-center opacity-50">
                        <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-1.5" />
                        <p className="font-bold text-xs">All Systems Operational</p>
                    </div>
                ) : (
                    alerts.map((alert, idx) => (
                        <div 
                            key={idx}
                            onClick={() => handleJumpToSheet(alert)}
                            className={cn(
                                "flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-background/50 hover:bg-white/5 transition-all cursor-pointer interactive-element group",
                                alert.status === 'OVERDUE' ? "border-rose-500/20 bg-rose-500/5" : "border-amber-500/20 bg-amber-500/5"
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className={cn(
                                    "p-1.5 rounded-lg",
                                    alert.status === 'OVERDUE' ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                                )}>
                                    <Settings2 className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-xs truncate">{alert.assetName}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
                                        <AlertTriangle className="h-2.5 w-2.5" />
                                        <span className="text-[8px] font-black uppercase tracking-widest">
                                            {alert.status} — {new Date(alert.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                        </div>
                    ))
                )}
            </div>
            
            <div className="mt-3 pt-2.5 border-t border-white/5">
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center">
                    Radar active: {workbooks?.length || 0} organizational units
                </p>
            </div>
        </section>
    );
}