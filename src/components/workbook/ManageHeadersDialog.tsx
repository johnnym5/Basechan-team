"use client";

import { useState } from 'react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Sheet } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Edit, Trash2, EyeOff, Eye, PlusCircle, Settings, MoreVertical } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AddColumnDialog } from './AddColumnDialog';
import { ConfigureColumnDialog } from './ConfigureColumnDialog';

interface ManageHeadersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: Sheet;
}

export function ManageHeadersDialog({ open, onOpenChange, sheet }: ManageHeadersDialogProps) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
    const [columnToConfigure, setColumnToConfigure] = useState<string | null>(null);
    const [columnToDelete, setColumnToDelete] = useState<string | null>(null);

    const visibleHeaders = sheet.headers.filter(h => !sheet.hiddenHeaders?.includes(h));
    const hiddenHeaders = sheet.hiddenHeaders || [];

    const handleHeaderUpdate = (payload: Partial<Sheet>, toastMessage: string) => {
        if (!firestore) return;
        const sheetRef = doc(firestore, `workbooks/${sheet.workbookId}/sheets`, sheet.id);
        updateDocumentNonBlocking(sheetRef, payload);
        toast({ title: 'Success', description: toastMessage });
        // The parent component will refetch data due to onSnapshot listener
    };

    const handleHideHeader = (header: string) => {
        const newHiddenHeaders = [...(sheet.hiddenHeaders || []), header];
        handleHeaderUpdate({ hiddenHeaders: newHiddenHeaders }, `Header "${header}" hidden.`);
    };

    const handleUnhideHeader = (header: string) => {
        const newHiddenHeaders = (sheet.hiddenHeaders || []).filter(h => h !== header);
        handleHeaderUpdate({ hiddenHeaders: newHiddenHeaders }, `Header "${header}" is now visible.`);
    };

    const handleDeleteColumn = () => {
        if (!columnToDelete) return;
        const newHeaders = sheet.headers.filter(h => h !== columnToDelete);
        const newHiddenHeaders = (sheet.hiddenHeaders || []).filter(h => h !== columnToDelete);
        const newColumnConfig = { ...sheet.columnConfig };
        delete newColumnConfig[columnToDelete];

        const newData = sheet.data.map(row => {
            const newRow = {...row};
            delete newRow[columnToDelete];
            return newRow;
        });
        
        handleHeaderUpdate({ 
            headers: newHeaders, 
            hiddenHeaders: newHiddenHeaders,
            columnConfig: newColumnConfig,
            data: newData
        }, `Column "${columnToDelete}" deleted.`);
        setColumnToDelete(null);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Manage Headers</DialogTitle>
                        <DialogDescription>Add, configure, and organize the columns for this sheet.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <AddColumnDialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen} sheet={sheet}>
                            <Button variant="outline" className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add New Header
                            </Button>
                        </AddColumnDialog>

                        <div>
                            <h4 className="text-sm font-semibold mb-2">Visible Headers ({visibleHeaders.length})</h4>
                            <ScrollArea className="h-48 border rounded-md">
                                <div className="p-2 space-y-1">
                                    {visibleHeaders.map(header => (
                                        <div key={header} className="flex items-center justify-between p-1 rounded-md hover:bg-secondary">
                                            <span className="text-sm truncate pr-2">{header}</span>
                                            <div className="flex items-center">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setColumnToConfigure(header)}><Settings className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleHideHeader(header)}><EyeOff className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setColumnToDelete(header)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                    {visibleHeaders.length === 0 && <p className="text-center text-xs text-muted-foreground p-4">No visible headers.</p>}
                                </div>
                            </ScrollArea>
                        </div>
                        
                        {hiddenHeaders.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold mb-2">Hidden Headers ({hiddenHeaders.length})</h4>
                                <ScrollArea className="h-32 border rounded-md">
                                    <div className="p-2 space-y-1">
                                        {hiddenHeaders.map(header => (
                                            <div key={header} className="flex items-center justify-between p-1 rounded-md hover:bg-secondary">
                                                <span className="text-sm truncate pr-2">{header}</span>
                                                <Button variant="ghost" size="sm" onClick={() => handleUnhideHeader(header)}><Eye className="mr-2 h-4 w-4" /> Unhide</Button>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {columnToConfigure && (
                <ConfigureColumnDialog
                    open={!!columnToConfigure}
                    onOpenChange={(isOpen) => !isOpen && setColumnToConfigure(null)}
                    sheet={sheet}
                    header={columnToConfigure}
                />
            )}

            {columnToDelete && (
                 <AlertDialog open={!!columnToDelete} onOpenChange={(isOpen) => !isOpen && setColumnToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Column "{columnToDelete}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. All data in this column will be permanently deleted from every row.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteColumn} className="bg-destructive hover:bg-destructive/90">
                                Delete Column
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    )
}
