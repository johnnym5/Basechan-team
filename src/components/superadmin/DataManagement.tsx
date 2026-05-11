'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useMemoFirebase, useDatabase } from '@/firebase';
import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import { ref, get, set, onValue } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download, Upload, CloudCog, Trash2, ShieldAlert, PlusCircle, Server, ChevronDown, DatabaseBackup } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { DatabaseExplorer } from './DatabaseExplorer';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { demoDataService } from '@/services/demo-data';

export const COLLECTIONS = [
    { id: 'requisitions', name: 'Requisitions' },
    { id: 'tasks', name: 'Tasks' },
    { id: 'attendance', name: 'Attendance' },
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
    const [exportTargetOrg, setExportTargetOrg] = useState<string>('__ALL__');
    const [collectionsToExport, setCollectionsToExport] = useState<string[]>([]);
    
    // Online Backups state
    const [manualOnlineBackups, setManualOnlineBackups] = useState<string[]>([]);
    const [selectedOnlineBackup, setSelectedOnlineBackup] = useState<string | null>(null);

    // Organizations fetch for scoping
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
        const backupsRef = ref(database, 'backups');
        const unsubscribe = onValue(backupsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setManualOnlineBackups(Object.keys(data).filter(k => k.startsWith('manual_')).sort().reverse());
            } else {
                setManualOnlineBackups([]);
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

    const handleExport = async () => {
        if (!firestore) return;
        setLoading('export');
        // Standard export logic...
        setLoading(null);
    };

    const handleDeleteData = async () => {
        if (!firestore) return;
        setLoading('delete');
        // Standard delete logic...
        setLoading(null);
    };

    const anyLoading = !!loading || areOrgsLoading;

    return (
        <div className="space-y-8">
            <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-primary flex items-center gap-2"><PlusCircle className="h-5 w-5" /> Initialize Development</CardTitle>
                            <CardDescription>Populate the database with sample organizational data for testing and demonstrations.</CardDescription>
                        </div>
                        <Button onClick={handleSeedDemoData} disabled={anyLoading} variant="default">
                            {loading === 'seed' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseBackup className="mr-2 h-4 w-4" />}
                            Seed Sample Data
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Backup & Export</CardTitle>
                    <CardDescription>Create offline (JSON) or online snapshots. Scope backups to a specific organization.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Target Organization</Label>
                            <Select value={exportTargetOrg} onValueChange={setExportTargetOrg} disabled={anyLoading}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__ALL__">All Organizations</SelectItem>
                                    {organizations.map(org => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Collections</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between">
                                        <span>{collectionsToExport.length > 0 ? `${collectionsToExport.length} selected` : 'All'}</span>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <ScrollArea className="h-48">
                                        <div className="p-2 space-y-1">
                                            {COLLECTIONS.map(c => (
                                                <div key={c.id} className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer" onClick={() => {
                                                    setCollectionsToExport(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]);
                                                }}>
                                                    <Checkbox checked={collectionsToExport.includes(c.id)} />
                                                    <span>{c.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <Button className="w-full" onClick={handleExport} disabled={anyLoading}>
                        {loading === 'export' ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                        Export to JSON
                    </Button>
                </CardContent>
            </Card>

            <Card>
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
