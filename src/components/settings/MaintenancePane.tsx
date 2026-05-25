'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Workbook, Sheet, UserProfile } from '@/lib/types';
import { Hammer, AlertTriangle, CheckCircle2, ChevronRight, Settings2, Info, Search, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { uiEmitter } from '@/lib/ui-emitter';
import { isBefore, addDays, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface MaintenanceAlert {
    assetName: string;
    workbookId: string;
    sheetId: string;
    date: string;
    status: 'OVERDUE' | 'UPCOMING';
    workbookTitle: string;
    sheetName: string;
}

export function MaintenancePane({ currentUserProfile }: { currentUserProfile: UserProfile }) {
    const firestore = useFirestore();
    const [alerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const workbooksQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'workbooks'),
            where('orgId', '==', currentUserProfile.orgId)
        );
    }, [firestore, currentUserProfile.orgId]);

    const { data: workbooks } = useCollection<Workbook>(workbooksQuery);

    useEffect(() => {
        const scanForMaintenance = async () => {
            if (!firestore || !workbooks) return;
            setIsLoading(true);
            const foundAlerts: MaintenanceAlert[] = [];
            const now = new Date();
            const threshold = addDays(now, 14); // 2 week window for settings view

            try {
                for (const wb of workbooks) {
                    const sheetsSnap = await getDocs(collection(firestore, `workbooks/${wb.id}/sheets`));
                    
                    for (const docSnap of sheetsSnap.docs) {
                        const sheet = docSnap.data() as Sheet;
                        const dateHeaders = sheet.headers.filter(h => 
                            ['maintenance', 'service', 'expiry', 'next', 'due'].some(k => h.toLowerCase().includes(k))
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
                                                    sheetId: docSnap.id,
                                                    date: dateVal,
                                                    status: 'OVERDUE',
                                                    workbookTitle: wb.title,
                                                    sheetName: sheet.name
                                                });
                                            } else if (isBefore(mDate, threshold)) {
                                                foundAlerts.push({
                                                    assetName: row['Name'] || row['Item'] || row['Asset ID'] || 'Unknown Asset',
                                                    workbookId: wb.id,
                                                    sheetId: docSnap.id,
                                                    date: dateVal,
                                                    status: 'UPCOMING',
                                                    workbookTitle: wb.title,
                                                    sheetName: sheet.name
                                                });
                                            }
                                        } catch (e) {}
                                    }
                                });
                            });
                        }
                    }
                }
                setMaintenanceAlerts(foundAlerts);
            } catch (error) {
                console.error("Maintenance scan failed:", error);
            } finally {
                setIsLoading(false);
            }
        };

        scanForMaintenance();
    }, [firestore, workbooks]);

    const filteredAlerts = alerts.filter(a => 
        a.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.workbookTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleJumpToSheet = (alert: MaintenanceAlert) => {
        uiEmitter.emit('close-all-dialogs');
        setTimeout(() => {
            uiEmitter.emit('open-workbooks-dialog', { workbookId: alert.workbookId, sheetId: alert.sheetId });
        }, 100);
    };

    const handleDispatchTask = (e: React.MouseEvent, alert: MaintenanceAlert) => {
        e.stopPropagation();
        uiEmitter.emit('open-assign-task-dialog', {
            title: `Mission: ${alert.assetName} Service`,
            description: `Automatic maintenance mission for ${alert.assetName}. Logged in ${alert.workbookTitle} - ${alert.sheetName}. Flagged date: ${new Date(alert.date).toLocaleDateString()}.`,
            priority: alert.status === 'OVERDUE' ? 'LEVEL_3' : 'LEVEL_2',
            workbookId: alert.workbookId,
            sheetId: alert.sheetId,
            dueDate: new Date(alert.date)
        });
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-32 w-full rounded-2xl" />
                    <Skeleton className="h-32 w-full rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold font-headline flex items-center gap-2">
                        <Hammer className="h-6 w-6 text-primary" />
                        Maintenance Radar
                    </h3>
                    <p className="text-sm text-muted-foreground">Automated scanning of all organizational data units for service dates and asset expiry.</p>
                </div>
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Filter alerts..." 
                        className="pl-10 h-10 rounded-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3 text-primary">
                <Info className="h-5 w-5 shrink-0" />
                <p className="text-xs leading-relaxed uppercase tracking-tight font-bold">
                    The radar scans every row in your workbooks for columns containing 'Maintenance', 'Service', or 'Expiry'. Overdue items are flagged in rose; upcoming items in amber.
                </p>
            </div>

            {filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-40 border-2 border-dashed rounded-[2rem]">
                    <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
                    <h4 className="text-lg font-bold font-headline uppercase tracking-widest">All Systems Operational</h4>
                    <p className="text-sm max-w-xs mt-1">No pending maintenance or service requirements detected in the current data infrastructure.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAlerts.map((alert, idx) => (
                        <Card 
                            key={idx}
                            onClick={() => handleJumpToSheet(alert)}
                            className={cn(
                                "group bg-card/50 hover:bg-card border-none shadow-sm transition-all cursor-pointer overflow-hidden",
                                alert.status === 'OVERDUE' ? "ring-1 ring-rose-500/20" : "ring-1 ring-amber-500/20"
                            )}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className={cn(
                                        "p-2 rounded-xl",
                                        alert.status === 'OVERDUE' ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                                    )}>
                                        <Settings2 className="h-5 w-5" />
                                    </div>
                                    <Badge className={cn(
                                        "text-[9px] font-black tracking-widest uppercase",
                                        alert.status === 'OVERDUE' ? "bg-rose-500 text-white" : "bg-amber-500 text-black"
                                    )}>
                                        {alert.status}
                                    </Badge>
                                </div>
                                <CardTitle className="text-lg mt-3">{alert.assetName}</CardTitle>
                                <CardDescription className="text-xs font-mono">{alert.workbookTitle} — {alert.sheetName}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        <span className="text-[10px] font-bold uppercase">{new Date(alert.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                        <ChevronRight className="h-4 w-4" />
                                    </div>
                                </div>
                                <Button 
                                    className="w-full h-10 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2"
                                    onClick={(e) => handleDispatchTask(e, alert)}
                                >
                                    <PlusCircle className="h-3.5 w-3.5" /> Dispatch Mission
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}