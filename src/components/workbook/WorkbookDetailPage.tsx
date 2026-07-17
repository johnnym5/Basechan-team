
'use client';

import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, getDocs } from 'firebase/firestore';
import type { Workbook, Sheet, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, Plus, ArrowLeft, Search, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetDataTable } from '@/components/workbook/SheetDataTable';
import { useState, useMemo, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AddSheetDialog } from '@/components/workbook/AddSheetDialog';
import { RenameSheetDialog } from '@/components/workbook/RenameSheetDialog';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { SheetCard } from './SheetCard';
import { Input } from '../ui/input';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';


interface WorkbookPermissions {
    canView: boolean;
    canEdit: boolean;
    canManage: boolean;
}

const useWorkbookPermissions = (workbook: Workbook | null, userProfile: UserProfile | null): WorkbookPermissions => {
    return useMemo(() => {
        const defaultPerms = { canView: false, canEdit: false, canManage: false };
        if (!workbook || !userProfile) return defaultPerms;

        // Owner has all permissions
        if (workbook.createdBy === userProfile.id) {
            return { canView: true, canEdit: true, canManage: true };
        }

        // Check sharedWith array
        const userShare = workbook.sharedWith?.find(s => s.userId === userProfile.id);
        if (!userShare) return defaultPerms;

        return {
            canView: true,
            canEdit: userShare.role === 'EDITOR' || userShare.role === 'MANAGER',
            canManage: userShare.role === 'MANAGER'
        };

    }, [workbook, userProfile]);
};

interface WorkbookDetailPageProps {
    workbookId: string;
    onBack: () => void;
    initialSheetId: string | null;
}


export default function WorkbookDetailPage({ workbookId, onBack, initialSheetId }: WorkbookDetailPageProps) {
    const firestore = useFirestore();
    const { user: authUser } = useUser();
    const { toast } = useToast();

    const [selectedSheet, setSelectedSheet] = useState<Sheet | null>(null);
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
    const [sheetToRename, setSheetToRename] = useState<Sheet | null>(null);
    const [sheetToDelete, setSheetToDelete] = useState<Sheet | null>(null);
    const [sheetToMakeTask, setSheetToMakeTask] = useState<Sheet | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isExportingAll, setIsExportingAll] = useState(false);

    const userProfileRef = useMemoFirebase(() => 
        firestore && authUser ? doc(firestore, 'users', authUser.uid) : null,
    [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const workbookRef = useMemoFirebase(() => firestore && workbookId ? doc(firestore, 'workbooks', workbookId) : null, [firestore, workbookId]);
    const { data: workbook, isLoading: isWorkbookLoading } = useDoc<Workbook>(workbookRef);

    const sheetsQuery = useMemoFirebase(() => 
        firestore && workbookId ? query(collection(firestore, `workbooks/${workbookId}/sheets`)) : null, 
    [firestore, workbookId]);
    const { data: sheets, isLoading: areSheetsLoading } = useCollection<Sheet>(sheetsQuery);

    const baseWorkbookPermissions = useWorkbookPermissions(workbook, userProfile);
    const generalPermissions = usePermissions(userProfile);

    const workbookPermissions = useMemo(() => {
        return {
            ...baseWorkbookPermissions,
            canEdit: baseWorkbookPermissions.canEdit && generalPermissions.canCreateWorkbook,
            canManage: baseWorkbookPermissions.canManage && generalPermissions.canCreateWorkbook,
        };
    }, [baseWorkbookPermissions, generalPermissions.canCreateWorkbook]);

    const isLoading = isWorkbookLoading || areSheetsLoading || isProfileLoading;
    
    useEffect(() => {
        if (sheets && initialSheetId) {
            const sheet = sheets.find(s => s.id === initialSheetId);
            if (sheet) {
                setSelectedSheet(sheet);
            }
        }
    }, [sheets, initialSheetId]);

    const filteredSheets = useMemo(() => {
        if (!sheets) return [];
        if (!searchTerm) return sheets;
        return sheets.filter(sheet =>
            sheet.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sheets, searchTerm]);

    const handleExportFullWorkbook = async () => {
        if (!workbook || !sheets || !firestore) return;
        setIsExportingAll(true);
        try {
            const wb = XLSX.utils.book_new();
            
            for (const sheet of sheets) {
                if (sheet.headers.length > 0) {
                    const sheetData = [
                        sheet.headers,
                        ...sheet.data.map(row => sheet.headers.map(h => row[h] ?? ''))
                    ];
                    const ws = XLSX.utils.aoa_to_sheet(sheetData);
                    XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31)); // Excel limit
                }
            }
            
            XLSX.writeFile(wb, `${workbook.title}_Consolidated.xlsx`);
            toast({ title: 'Full Export Complete', description: `All ${sheets.length} data sheets have been archived.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Export Failed', description: e.message });
        } finally {
            setIsExportingAll(false);
        }
    };

    const handleDeleteSheet = () => {
        if (!sheetToDelete || !workbookPermissions.canEdit || !workbookId) return;
        const sheetRef = doc(firestore!, `workbooks/${workbookId}/sheets`, sheetToDelete.id);
        deleteDocumentNonBlocking(sheetRef);
        setSheetToDelete(null);
    }
    
    if (isLoading) {
        return (
            <div className="space-y-6 p-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <div>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-5 w-80 mt-1" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-56" />)}
                </div>
            </div>
        )
    }

    if (!workbook) {
        return <p className="p-6">Workbook not found.</p>;
    }
    
    if (!workbookPermissions.canView) {
      return (
           <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
              <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
              <p className="text-muted-foreground mt-2">You do not have permission to view this workbook.</p>
              <Button onClick={onBack} className="mt-6">Return to Workbooks</Button>
            </div>
      )
    }
    
    if (selectedSheet) {
        return (
            <div className="space-y-4 p-6 h-full flex flex-col">
                <div className="flex items-center gap-4 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedSheet(null)} className="-ml-2">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold font-headline tracking-tight">{selectedSheet.name}</h1>
                        <p className="text-sm text-muted-foreground">Part of "{workbook.title}" workbook</p>
                    </div>
                </div>
                <div className="flex-grow min-h-0">
                    <SheetDataTable sheet={selectedSheet} permissions={workbookPermissions} />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6 p-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                         <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold font-headline tracking-tight">{workbook.title}</h1>
                            <p className="text-muted-foreground">{workbook.description || 'Manage sheets for this workbook.'}</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={handleExportFullWorkbook} disabled={isExportingAll || sheets?.length === 0} className="rounded-xl">
                        {isExportingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                        Archive All Sheets
                    </Button>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search sheets..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {workbookPermissions.canEdit && (
                        <AddSheetDialog open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen} workbookId={workbookId}>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Add Sheet
                            </Button>
                        </AddSheetDialog>
                    )}
                </div>

                {filteredSheets.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredSheets.map(sheet => (
                            <SheetCard 
                                key={sheet.id}
                                sheet={sheet}
                                onSelect={setSelectedSheet}
                                onRename={setSheetToRename}
                                onDelete={setSheetToDelete}
                                onCreateTask={setSheetToMakeTask}
                                canManage={workbookPermissions.canManage}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed rounded-lg">
                        <p className="font-semibold">{searchTerm ? 'No sheets found' : 'This workbook is empty'}</p>
                        <p className="text-sm text-muted-foreground">{searchTerm ? 'Try a different search term.' : 'Click "Add Sheet" to get started.'}</p>
                    </div>
                )}
            </div>

            {sheetToRename && (
                <RenameSheetDialog
                    open={!!sheetToRename}
                    onOpenChange={(isOpen) => !isOpen && setSheetToRename(null)}
                    sheet={sheetToRename}
                />
            )}

            {sheetToMakeTask && userProfile && (
                <AssignTaskDialog
                    open={!!sheetToMakeTask}
                    onOpenChange={(isOpen) => !isOpen && setSheetToMakeTask(null)}
                    currentUserProfile={userProfile}
                    permissions={generalPermissions}
                    initialData={{
                        title: `From Workbook: ${sheetToMakeTask.name}`,
                        description: `Complete the tasks outlined in the workbook sheet "${sheetToMakeTask.name}".`,
                        workbookId: sheetToMakeTask.workbookId,
                        sheetId: sheetToMakeTask.id,
                    }}
                />
            )}

            {sheetToDelete && (
                <AlertDialog open={!!sheetToDelete} onOpenChange={(isOpen) => !isOpen && setSheetToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete sheet "{sheetToDelete.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. All data in this sheet will be permanently deleted.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSheet} className="bg-destructive hover:bg-destructive/90">
                                Delete Sheet
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
