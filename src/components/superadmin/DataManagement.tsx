'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDatabase } from '@/firebase';
import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import { ref, get, set, onValue } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download, CloudCog, Trash2, PlusCircle, Server, ChevronDown, DatabaseBackup, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Organization } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DatabaseExplorer } from './DatabaseExplorer';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { demoDataService } from '@/services/demo-data';

export const COLLECTIONS = [
    { id: 'requisitions', name: 'Requisitions' },
    { id: 'tasks', name: 'Tasks' },
    { id: 'attendance', name: 'Attendance' },
    { id: 'rosters', name: 'Workforce Rosters' },
    { id: 'announcements', name: 'Announcements' },
    { id: 'workbooks', name: 'Workbooks' },
    { id: 'feedback', name: 'Feedback' },
    { id: 'chats', name: 'Chats' },
    { id: 'vendors', name: 'Vendors' },
    { id: 'users', name: 'Users' },
    { id: 'system_configs', name: 'System Configs' },
    { id: 'organizations', name: 'Organizations' },
];

export function DataManagement() {
    const firestore = useFirestore();
    const database = useDatabase();
    const { toast } = useToast();
    const [loading, setLoading] = useState<string | null>(null);

    // Export state
    const [targetOrg, setTargetOrg] = useState<string>('__ALL__');
    const [collectionsToProcess, setCollectionsToProcess] = useState<string[]>([]);
    
    // Online Backups state
    const [cloudBackups, setCloudBackups] = useState<string[]>([]);
    const [selectedBackup, setSelectedBackup] = useState<string | null>(null);

    // Organizations fetch
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [areOrgsLoading, setAreOrgsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        getDocs(collection(firestore, 'organizations')).then(snap => {
            setOrganizations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Organization)));
            setAreOrgsLoading(false);
        });
    }, [firestore]);
    
    useEffect(() => {
        if (!database) return;
        const backupsRef = ref(database, 'snapshots');
        const unsubscribe = onValue(backupsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setCloudBackups(Object.keys(data).sort().reverse());
            } else {
                setCloudBackups([]);
            }
        });
        return () => unsubscribe();
    }, [database]);

    const handleSeedDemoData = async () => {
        if (!firestore) return;
        setLoading('seed');
        try {
            await demoDataService.seed(firestore);
            toast({ title: 'System Seeded', description: 'Sample tasks, requisitions, and vendors have been created.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Seed Failed', description: e.message });
        } finally {
            setLoading(null);
        }
    };

    const fetchDataset = async () => {
        if (!firestore) return null;
        const dataset: Record<string, any[]> = {};
        const targets = collectionsToProcess.length > 0 ? collectionsToProcess : COLLECTIONS.map(c => c.id);

        for (const collId of targets) {
            let q = query(collection(firestore, collId));
            if (targetOrg !== '__ALL__' && collId !== 'organizations') {
                q = query(q, where('orgId', '==', targetOrg));
            }
            const snap = await getDocs(q);
            dataset[collId] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        return dataset;
    };

    const handleJSONExport = async () => {
        setLoading('export');
        try {
            const dataset = await fetchDataset();
            if (!dataset) return;
            const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `StaffPortal_Backup_${new Date().toISOString()}.json`;
            a.click();
            toast({ title: 'Export Complete', description: 'Database snapshot saved to disk.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Export Failed', description: e.message });
        } finally {
            setLoading(null);
        }
    };

    const handleCloudSnapshot = async () => {
        if (!database) return;
        setLoading('snapshot');
        try {
            const dataset = await fetchDataset();
            if (!dataset) return;
            const timestamp = new Date().toISOString().replace(/\./g, '_');
            const snapshotRef = ref(database, `snapshots/${timestamp}`);
            await set(snapshotRef, {
                metadata: { timestamp, targetOrg, collections: collectionsToProcess },
                data: dataset
            });
            toast({ title: 'Cloud Snapshot Created', description: `Database state archived to Realtime Database.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Snapshot Failed', description: e.message });
        } finally {
            setLoading(null);
        }
    };

    const handleRestoreSnapshot = async () => {
        if (!database || !firestore || !selectedBackup) return;
        setLoading('restore');
        try {
            const snap = await get(ref(database, `snapshots/${selectedBackup}`));
            const archive = snap.val();
            if (!archive?.data) throw new Error("Snapshot data corrupted or missing.");

            const batch = writeBatch(firestore);
            for (const [collId, docs] of Object.entries(archive.data)) {
                const collectionRef = collection(firestore, collId);
                (docs as any[]).forEach(d => {
                    const { id, ...data } = d;
                    batch.set(doc(collectionRef, id), data, { merge: true });
                });
            }
            await batch.commit();
            toast({ title: 'Restoration Successful', description: 'Firestore has been synced with cloud snapshot.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Restoration Failed', description: e.message });
        } finally {
            setLoading(null);
        }
    };

    const handlePurgeData = async () => {
        if (!firestore) return;
        setLoading('purge');
        try {
            const dataset = await fetchDataset();
            if (!dataset) return;

            for (const [collId, docs] of Object.entries(dataset)) {
                const batch = writeBatch(firestore);
                (docs as any[]).forEach(d => {
                    batch.delete(doc(firestore, collId, d.id));
                });
                await batch.commit();
            }
            toast({ title: 'Data Purged', description: 'Selected organization telemetry has been wiped.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Purge Failed', description: e.message });
        } finally {
            setLoading(null);
        }
    };

    const anyLoading = !!loading || areOrgsLoading;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <Card className="border-primary/50 bg-primary/5 shadow-2xl">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-primary flex items-center gap-2">
                                <PlusCircle className="h-5 w-5" /> Initialize Development
                            </CardTitle>
                            <CardDescription>Populate the database with sample organizational data for testing and demonstrations.</CardDescription>
                        </div>
                        <Button onClick={handleSeedDemoData} disabled={anyLoading} variant="default" className="rounded-xl shadow-lg">
                            {loading === 'seed' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseBackup className="mr-2 h-4 w-4" />}
                            Seed Sample Data
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <Card className="apple-glass border-none shadow-xl overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <CloudCog className="h-5 w-5 text-primary" />
                        Disaster Recovery & Portability
                    </CardTitle>
                    <CardDescription>Archive organizational telemetry to the cloud or local storage.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scope Target</Label>
                            <Select value={targetOrg} onValueChange={setTargetOrg} disabled={anyLoading}>
                                <SelectTrigger className="h-12 rounded-xl bg-background/50 border-white/5"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__ALL__">Global Infrastructure</SelectItem>
                                    {organizations.map(org => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Component Filter</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full h-12 justify-between rounded-xl bg-background/50 border-white/5">
                                        <span>{collectionsToProcess.length > 0 ? `${collectionsToProcess.length} selected` : 'All Sub-Systems'}</span>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 apple-glass-darker border-none">
                                    <ScrollArea className="h-64">
                                        <div className="p-3 space-y-1">
                                            {COLLECTIONS.map(c => (
                                                <div key={c.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-white/5 cursor-pointer transition-colors" onClick={() => {
                                                    setCollectionsToProcess(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]);
                                                }}>
                                                    <Checkbox checked={collectionsToProcess.includes(c.id)} className="rounded-md border-primary/50" />
                                                    <span className="font-medium">{c.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                         <Button variant="outline" className="h-12 rounded-xl border-white/10 hover:bg-white/5" onClick={handleJSONExport} disabled={anyLoading}>
                            {loading === 'export' ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                            Local JSON
                        </Button>
                        <Button variant="outline" className="h-12 rounded-xl border-white/10 hover:bg-white/5" onClick={handleCloudSnapshot} disabled={anyLoading}>
                            {loading === 'snapshot' ? <Loader2 className="mr-2 animate-spin" /> : <Server className="mr-2" />}
                            Cloud Snapshot
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="h-12 rounded-xl shadow-lg shadow-destructive/20" disabled={anyLoading}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Purge Scope
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="apple-glass-darker border-none">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-2xl font-black text-rose-500">ABSOLUTE PURGE</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently destroy all records within the selected scope ({targetOrg}). This action is irreversible.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Abort</AlertDialogCancel>
                                    <AlertDialogAction onClick={handlePurgeData} className="bg-rose-600 hover:bg-rose-700">Confirm Destruction</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>

                    <Separator className="bg-white/5" />

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Point-in-Time Recovery (PITR)</Label>
                        <div className="flex gap-4">
                            <Select value={selectedBackup || ""} onValueChange={setSelectedBackup} disabled={anyLoading}>
                                <SelectTrigger className="flex-1 h-12 rounded-xl bg-background/50 border-white/5">
                                    <SelectValue placeholder="Select cloud archive..." />
                                </SelectTrigger>
                                <SelectContent className="apple-glass border-none">
                                    {cloudBackups.map(ts => (
                                        <SelectItem key={ts} value={ts}>{ts.replace(/_/g, '.')}</SelectItem>
                                    ))}
                                    {cloudBackups.length === 0 && <SelectItem value="none" disabled>No cloud backups found</SelectItem>}
                                </SelectContent>
                            </Select>
                            <Button variant="default" className="h-12 px-8 rounded-xl shadow-lg" onClick={handleRestoreSnapshot} disabled={anyLoading || !selectedBackup}>
                                {loading === 'restore' ? <Loader2 className="mr-2 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                Restore State
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="apple-glass border-none shadow-xl">
                <CardHeader>
                    <CardTitle>Database Explorer</CardTitle>
                    <CardDescription>Live, read-write view of Firestore documents.</CardDescription>
                </CardHeader>
                <CardContent>
                    <DatabaseExplorer />
                </CardContent>
            </Card>
        </div>
    );
}