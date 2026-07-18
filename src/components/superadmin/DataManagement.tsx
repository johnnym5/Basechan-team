'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDatabase } from '@/firebase';
import { collection, getDocs, query, where, writeBatch, doc, getFirestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { ref, get, set, onValue } from 'firebase/database';
import { getApps, initializeApp } from 'firebase/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Loader2, Download, CloudCog, Trash2, PlusCircle, Server, ChevronDown, 
  DatabaseBackup, RefreshCcw, Skull, ArrowRightLeft, Play, Copy, Check, Terminal 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
import { BatchUserImport } from './BatchUserImport';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

const OLD_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCn0pLLYEpAHR6ehj6zWxVnoEzQgLCFVCs",
  authDomain: "basechanteam.firebaseapp.com",
  projectId: "basechanteam",
  storageBucket: "basechanteam.firebasestorage.app",
  messagingSenderId: "261796318440",
  appId: "1:261796318440:web:e62d9bda06dac94b264d5d",
  measurementId: "G-WLTB42P50C"
};

const MIGRATION_COLLECTIONS = [
    { id: 'organizations', name: 'Organizations' },
    { id: 'users', name: 'Users' },
    { id: 'departments', name: 'Departments' },
    { id: 'vendors', name: 'Vendors' },
    { id: 'purchase_orders', name: 'Purchase Orders' },
    { id: 'requisitions', name: 'Requisitions' },
    { id: 'tasks', name: 'Tasks' },
    { id: 'attendance', name: 'Attendance' },
    { id: 'rosters', name: 'Workforce Rosters' },
    { id: 'announcements', name: 'Announcements' },
    { id: 'workbooks', name: 'Workbooks' },
    { id: 'leave_requests', name: 'Leave Requests' },
    { id: 'daily_reports', name: 'Daily Reports' },
    { id: 'chats', name: 'Chats' },
    { id: 'journal_entries', name: 'Journal Entries' },
    { id: 'pulse_checks', name: 'Pulse Checks' },
    { id: 'activity_points', name: 'Activity Points' },
    { id: 'kudos', name: 'Kudos' },
    { id: 'system_configs', name: 'System Configs' },
    { id: 'feedback', name: 'Feedback' }
];

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
    const { isSuperAdmin } = useSuperAdmin();
    const { toast } = useToast();
    const [loading, setLoading] = useState<string | null>(null);

    // Live Migration state
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationProgress, setMigrationProgress] = useState(0);
    const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
    const [migrationCollections, setMigrationCollections] = useState<string[]>(
        MIGRATION_COLLECTIONS.map(c => c.id)
    );
    const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

    // Old authentication state for permission bypass
    const [oldEmail, setOldEmail] = useState('jegbase@gmail.com');
    const [oldPassword, setOldPassword] = useState('');
    const [isOldAuthed, setIsOldAuthed] = useState(false);
    const [isAuthenticatingOld, setIsAuthenticatingOld] = useState(false);

    const handleAuthenticateOld = async () => {
        setIsAuthenticatingOld(true);
        setMigrationLogs(prev => [...prev, `Authenticating on old project as ${oldEmail}...`]);
        try {
            const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
            const oldApp = getApps().find(app => app.name === 'old-project') 
                || initializeApp(OLD_FIREBASE_CONFIG, 'old-project');
            const oldAuth = getAuth(oldApp);
            
            await signInWithEmailAndPassword(oldAuth, oldEmail, oldPassword);
            setIsOldAuthed(true);
            setMigrationLogs(prev => [...prev, `Successfully authenticated on basechanteam as ${oldEmail}!`]);
            toast({ title: "Authentication Successful", description: `You are now authenticated on basechanteam.` });
        } catch (e: any) {
            console.error("Old authentication failed:", e);
            setMigrationLogs(prev => [...prev, `AUTHENTICATION ERROR: ${e.message}`]);
            toast({ variant: "destructive", title: "Authentication Failed", description: e.message });
        } finally {
            setIsAuthenticatingOld(false);
        }
    };

    const handleLiveMigration = async () => {
        if (!firestore) return;
        
        setIsMigrating(true);
        setMigrationProgress(0);
        setMigrationLogs(["Initiating cross-project live migration..."]);

        try {
            // Initialize OLD project app and firestore with matching localCache
            const oldApp = getApps().find(app => app.name === 'old-project') 
                || initializeApp(OLD_FIREBASE_CONFIG, 'old-project');
            
            let oldFirestore;
            try {
                oldFirestore = initializeFirestore(oldApp, {
                    localCache: memoryLocalCache(),
                });
            } catch {
                oldFirestore = getFirestore(oldApp);
            }
            
            setMigrationLogs(prev => [...prev, "Connected to old project (basechanteam) successfully."]);

            let step = 0;
            const totalSteps = migrationCollections.length;
            
            for (const collId of migrationCollections) {
                const collectionName = MIGRATION_COLLECTIONS.find(c => c.id === collId)?.name || collId;
                setMigrationLogs(prev => [...prev, `[${collectionName}] Reading documents from old Firestore...`]);
                
                // Get all docs from old Firestore
                const snap = await getDocs(collection(oldFirestore, collId));
                setMigrationLogs(prev => [...prev, `[${collectionName}] Found ${snap.size} documents.`]);

                if (snap.size > 0) {
                    let batch = writeBatch(firestore);
                    let count = 0;
                    let batchCount = 0;

                    for (const d of snap.docs) {
                        batch.set(doc(firestore, collId, d.id), d.data(), { merge: true });
                        count++;
                        
                        if (count % 500 === 0) {
                            await batch.commit();
                            batchCount++;
                            setMigrationLogs(prev => [...prev, `[${collectionName}] Committed batch #${batchCount} (${count} docs)...`]);
                            batch = writeBatch(firestore);
                        }
                    }

                    if (count % 500 !== 0) {
                        await batch.commit();
                        batchCount++;
                        setMigrationLogs(prev => [...prev, `[${collectionName}] Committed final batch #${batchCount} (${count} docs).`]);
                    }

                    setMigrationLogs(prev => [...prev, `[${collectionName}] Successfully copied all ${count} documents!`]);
                } else {
                    setMigrationLogs(prev => [...prev, `[${collectionName}] Collection is empty. Skipped.`]);
                }

                step++;
                setMigrationProgress((step / totalSteps) * 100);
            }

            setMigrationLogs(prev => [...prev, "SUCCESS: Firestore live migration complete!"]);
            toast({ title: "Migration Successful", description: "All selected collections migrated to basechan." });
        } catch (e: any) {
            console.error("Migration failed:", e);
            setMigrationLogs(prev => [...prev, `ERROR: ${e.message}`]);
            toast({ variant: "destructive", title: "Migration Failed", description: e.message });
        } finally {
            setIsMigrating(false);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedCmd(id);
        setTimeout(() => setCopiedCmd(null), 2000);
        toast({ title: "Command Copied", description: "Ready to paste in your terminal." });
    };

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
        if (!firestore || !isSuperAdmin) return;
        getDocs(collection(firestore, 'organizations')).then(snap => {
            setOrganizations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Organization)));
            setAreOrgsLoading(false);
        }).catch(e => {
            console.error("Failed to load orgs", e);
            setAreOrgsLoading(false);
        });
    }, [firestore, isSuperAdmin]);
    
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

    const handleNukeDatabase = async () => {
        if (!firestore) return;
        setLoading('nuke');
        try {
            await demoDataService.purgeAllData(firestore);
            toast({ title: 'NUKE COMPLETE', description: 'All organizational telemetry has been purged.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Nuke Failed', description: e.message });
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
            const targets = collectionsToProcess.length > 0 ? collectionsToProcess : COLLECTIONS.map(c => c.id);
            let totalDeleted = 0;

            for (const collId of targets) {
                if (collId === 'organizations' && targetOrg !== '__ALL__') continue;

                let q = query(collection(firestore, collId));
                if (targetOrg !== '__ALL__') {
                    q = query(q, where('orgId', '==', targetOrg));
                }
                const snap = await getDocs(q);
                if (snap.size > 0) {
                    const batch = writeBatch(firestore);
                    snap.docs.forEach(d => {
                        batch.delete(doc(firestore, collId, d.id));
                    });
                    await batch.commit();
                    totalDeleted += snap.size;
                }
            }

            toast({ title: 'Purge Complete', description: `Successfully deleted ${totalDeleted} records from scope.` });
        } catch (e: any) {
            console.error("Purge error:", e);
            toast({ variant: 'destructive', title: 'Purge Failed', description: e.message });
        } finally {
            setLoading(null);
        }
    };

    const anyLoading = !!loading || areOrgsLoading || isMigrating;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-primary/50 bg-primary/5 shadow-2xl">
                    <CardHeader>
                        <CardTitle className="text-primary flex items-center gap-2">
                            <PlusCircle className="h-5 w-5" /> Initialize Development
                        </CardTitle>
                        <CardDescription>Populate the database with sample organizational data for testing and demonstrations.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleSeedDemoData} disabled={anyLoading} className="w-full rounded-xl shadow-lg">
                            {loading === 'seed' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseBackup className="mr-2 h-4 w-4" />}
                            Seed Sample Data
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-rose-500/50 bg-rose-500/5 shadow-2xl">
                    <CardHeader>
                        <CardTitle className="text-rose-500 flex items-center gap-2">
                            <Skull className="h-5 w-5" /> Infrastructure Reset
                        </CardTitle>
                        <CardDescription>Absolutely purge all organizational telemetry to clear internal state conflicts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={anyLoading} className="w-full rounded-xl shadow-lg shadow-rose-500/20">
                                    {loading === 'nuke' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    NUKE DATABASE
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="apple-glass-darker border-none">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-2xl font-black text-rose-500 uppercase">Warning: Absolute Zero</AlertDialogTitle>
                                    <AlertDialogDescription className="font-bold text-xs uppercase tracking-widest leading-relaxed">
                                        This protocol will permanently destroy all Tasks, Requisitions, Attendance, and Workbooks. 
                                        This is the only guaranteed way to clear persistent aggregator conflicts (ca9). 
                                        Proceed with extreme caution.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Abort Protocol</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleNukeDatabase} className="bg-rose-600 hover:bg-rose-700">Confirm Nuke</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                </Card>
            </div>

            <BatchUserImport />

            <Card className="apple-glass border-none shadow-xl overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-primary" />
                        Cross-Project Live Migration (Old to New)
                    </CardTitle>
                    <CardDescription>
                        Safely migrate your entire Firestore database and Authentication accounts from the old project (<code className="font-mono text-[11px] text-primary">basechanteam</code>) to your new project (<code className="font-mono text-[11px] text-primary">basechan</code>).
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Left Side: Firestore Copy */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-2">Step 1: Migrate Firestore Database</h3>
                                <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
                                    Select the Firestore collections you want to copy. This will fetch records from <code className="font-mono bg-background/50 px-1 py-0.5 rounded">basechanteam</code> and merge them directly into <code className="font-mono bg-background/50 px-1 py-0.5 rounded">basechan</code>.
                                </p>
                            </div>

                            {!isOldAuthed ? (
                                <div className="space-y-3 border border-yellow-500/20 bg-yellow-500/5 p-4 rounded-2xl">
                                    <div className="flex items-center gap-1.5 text-yellow-500 font-bold text-xs uppercase tracking-wider">
                                        ⚠️ Connection Authentication Required
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                        Because the old database <code className="font-mono">basechanteam</code> has active security rules, you must authenticate with a valid admin account from that project (e.g. <code className="font-mono">jegbase@gmail.com</code>) to unlock read access.
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[9px] uppercase font-black opacity-60">Old Project Email</Label>
                                            <input 
                                                type="email" 
                                                value={oldEmail} 
                                                onChange={(e) => setOldEmail(e.target.value)}
                                                className="w-full h-8 bg-background/50 border border-white/10 rounded-lg px-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                                                disabled={isAuthenticatingOld}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] uppercase font-black opacity-60">Old Project Password</Label>
                                            <input 
                                                type="password" 
                                                value={oldPassword} 
                                                onChange={(e) => setOldPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full h-8 bg-background/50 border border-white/10 rounded-lg px-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                                                disabled={isAuthenticatingOld}
                                            />
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={handleAuthenticateOld} 
                                        disabled={isAuthenticatingOld || !oldPassword}
                                        className="w-full h-9 rounded-lg text-xs font-black uppercase tracking-wider bg-yellow-600 hover:bg-yellow-700 text-white"
                                    >
                                        {isAuthenticatingOld ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                                        Authenticate Connection
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2 max-h-48 overflow-y-auto border border-white/5 bg-background/20 rounded-xl p-3 custom-scrollbar">
                                        <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1.5 pb-1 border-b border-white/5 mb-1.5">
                                            <Check className="h-3 w-3" /> Authenticated on old project as {oldEmail}
                                        </div>
                                        {MIGRATION_COLLECTIONS.map(c => (
                                            <div key={c.id} className="flex items-center gap-3 py-1 text-xs">
                                                <Checkbox 
                                                    id={`mig-${c.id}`}
                                                    checked={migrationCollections.includes(c.id)} 
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setMigrationCollections(prev => [...prev, c.id]);
                                                        } else {
                                                            setMigrationCollections(prev => prev.filter(id => id !== c.id));
                                                        }
                                                    }}
                                                    disabled={isMigrating}
                                                    className="rounded border-primary/50" 
                                                />
                                                <Label htmlFor={`mig-${c.id}`} className="font-medium cursor-pointer">{c.name}</Label>
                                            </div>
                                        ))}
                                    </div>

                                    <Button 
                                        onClick={handleLiveMigration} 
                                        disabled={isMigrating || migrationCollections.length === 0}
                                        className="w-full h-12 rounded-xl font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20"
                                    >
                                        {isMigrating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                        Begin Live Firestore Migration
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Right Side: Auth Migration Guides */}
                        <div className="space-y-4 flex flex-col justify-between">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-1.5">
                                    <Terminal className="h-4 w-4" /> Step 2: Migrate Auth Accounts
                                </h3>
                                <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
                                    To preserve your users' original passwords, salts, and IDs, run these two official Firebase CLI commands in your local project terminal:
                                </p>
                            </div>

                            <div className="space-y-3 flex-1 flex flex-col justify-center">
                                {/* Command 1 */}
                                <div className="border border-white/5 rounded-xl bg-background/30 p-3 relative group overflow-hidden">
                                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider block mb-1">1. Export users from old project</span>
                                    <code className="text-[10px] font-mono text-primary block truncate pr-8">
                                        firebase auth:export users_backup.json --project basechanteam
                                    </code>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        onClick={() => copyToClipboard("firebase auth:export users_backup.json --project basechanteam", "export")}
                                        className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:text-primary hover:bg-white/5 rounded-lg"
                                    >
                                        {copiedCmd === 'export' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                    </Button>
                                </div>

                                {/* Command 2 */}
                                <div className="border border-white/5 rounded-xl bg-background/30 p-3 relative group overflow-hidden">
                                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider block mb-1">2. Import users to new project with password salt</span>
                                    <code className="text-[10px] font-mono text-primary block truncate pr-8">
                                        firebase auth:import users_backup.json --project basechan --hash-algo=SCRYPT --rounds=8 --mem-cost=14
                                    </code>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        onClick={() => copyToClipboard("firebase auth:import users_backup.json --project basechan --hash-algo=SCRYPT --rounds=8 --mem-cost=14", "import")}
                                        className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:text-primary hover:bg-white/5 rounded-lg"
                                    >
                                        {copiedCmd === 'import' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="border border-amber-500/10 bg-amber-500/5 rounded-xl p-3">
                                <p className="text-[9px] text-amber-500/80 font-bold uppercase tracking-wider leading-relaxed">
                                    IMPORTANT: Running these commands via the CLI ensures that existing user credentials and secure hashes are copied perfectly without triggering email reset cycles.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Progress / Migration Log */}
                    {(isMigrating || migrationLogs.length > 0) && (
                        <div className="flex flex-col border border-white/5 rounded-2xl bg-secondary/5 overflow-hidden mt-4">
                            <div className="p-3 border-b border-white/5 bg-background/40 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Firestore Migration Log</span>
                                <span className="text-[10px] font-black text-primary">{Math.round(migrationProgress)}%</span>
                            </div>
                            <Progress value={migrationProgress} className="h-1 rounded-none" />
                            <ScrollArea className="h-36 bg-background/10">
                                <div className="p-3 font-mono text-[9px] text-muted-foreground space-y-1">
                                    {migrationLogs.map((log, idx) => (
                                        <div key={idx} className={`leading-relaxed ${
                                            log.startsWith("SUCCESS") ? "text-emerald-400 font-bold" : ""
                                        } ${
                                            log.startsWith("ERROR") ? "text-rose-400 font-bold" : ""
                                        } ${
                                            log.startsWith("[") ? "text-white" : ""
                                        }`}>
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </CardContent>
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
                                    {loading === 'purge' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Purge Scope
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
