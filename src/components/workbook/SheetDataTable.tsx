<<<<<<< HEAD
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Sheet } from '@/lib/types';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Search, Download, Edit, Settings, ScanLine } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AddRowDialog } from './AddRowDialog';
import { EditRowDialog } from './EditRowDialog';
import { Checkbox } from '../ui/checkbox';
import { AddColumnDialog } from './AddColumnDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ManageHeadersDialog } from './ManageHeadersDialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import { SheetDataCard } from './SheetDataCard';


interface SheetDataTableProps {
  sheet: Sheet;
  permissions: {
    canEdit: boolean;
  };
}

export function SheetDataTable({ sheet, permissions }: SheetDataTableProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [data, setData] = useState<Record<string, any>[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isAddRowOpen, setIsAddRowOpen] = useState(false);
    const [rowToDelete, setRowToDelete] = useState<number | null>(null);
    const [rowToEdit, setRowToEdit] = useState<{ rowIndex: number; data: Record<string, any> } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [isManageHeadersOpen, setIsManageHeadersOpen] = useState(false);
    const isMobile = useMediaQuery("(max-width: 768px)");


    // Update local state if the sheet prop changes (e.g., user switches tabs)
    useEffect(() => {
        setData(sheet.data ? JSON.parse(JSON.stringify(sheet.data)) : []);
        setHeaders(sheet.headers ? [...sheet.headers] : []);
        setSelectedRows([]);
    }, [sheet]);
    
    const visibleHeaders = useMemo(() => {
      return headers.filter(h => !sheet.hiddenHeaders?.includes(h))
    }, [headers, sheet.hiddenHeaders]);

    const filteredData = useMemo(() => {
        if (!searchTerm) {
            return data.map((row, index) => ({ ...row, __originalIndex: index }));
        }
        return data
            .map((row, index) => ({ ...row, __originalIndex: index }))
            .filter(row =>
                headers.some(header =>
                    String(row[header] ?? '').toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
    }, [data, headers, searchTerm]);


    const saveChanges = (payload: { data?: Record<string, any>[]; headers?: string[], columnConfig?: any }, toastMessage: string) => {
        if (!firestore || Object.keys(payload).length === 0 || !permissions.canEdit) return;
        const sheetRef = doc(firestore, `workbooks/${sheet.workbookId}/sheets`, sheet.id);
        updateDocumentNonBlocking(sheetRef, payload);
        toast({ title: 'Saved', description: toastMessage });
    };
    
    const handleFieldChange = (rowIndex: number, field: string, value: any) => {
        const newData = [...data];
        newData[rowIndex][field] = value;
        setData(newData);
        saveChanges({ data: newData }, `Row ${rowIndex + 1} updated.`);
    }

    const handleSaveEdit = (rowIndex: number, updatedRowData: Record<string, any>) => {
        const newData = [...data];
        newData[rowIndex] = updatedRowData;
        setData(newData);
        saveChanges({ data: newData }, "Row updated successfully.");
    };

    const handleDeleteRow = () => {
        if (rowToDelete === null || !permissions.canEdit) return;
        const updatedData = data.filter((_, index) => index !== rowToDelete);
        setData(updatedData);
        saveChanges({ data: updatedData }, 'The row has been deleted.');
        setRowToDelete(null);
    };

    const handleDeleteSelectedRows = () => {
        if (selectedRows.length === 0 || !permissions.canEdit) return;
        const updatedData = data.filter((_, index) => !selectedRows.includes(index));
        setData(updatedData);
        saveChanges({ data: updatedData }, `${selectedRows.length} row(s) deleted.`);
        setSelectedRows([]);
    };

    const handleExport = () => {
        if (headers.length === 0) {
            toast({
                variant: "destructive",
                title: "Cannot Export",
                description: "This sheet has no columns to export.",
            });
            return;
        }

        const sheetData = [
            headers, // First row is headers
            ...data.map(row => headers.map(header => row[header] ?? '')) // Subsequent rows are data, handle null/undefined
        ];

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
        XLSX.writeFile(wb, `${sheet.workbookId}-${sheet.name}.xlsx`);
        toast({ title: 'Exporting...', description: `The sheet "${sheet.name}" is being downloaded.` });
    };
    
    const handleSelectRow = (rowIndex: number, checked: boolean) => {
        if (checked) {
            setSelectedRows(prev => [...prev, rowIndex]);
        } else {
            setSelectedRows(prev => prev.filter(idx => idx !== rowIndex));
        }
    };
    
    const handleSelectAll = (checked: boolean | 'indeterminate') => {
        setSelectedRows(checked === true ? filteredData.map((row) => row.__originalIndex) : []);
    };
    
    const hasBarcodeSupport = headers.some(h => ['barcode', 'sku', 'serial', 'id', 'tag'].some(k => h.toLowerCase().includes(k)));


    if (headers.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 space-y-4">
                 <p className="text-sm font-semibold">This sheet is empty.</p>
                 {permissions.canEdit && (
                    <AddColumnDialog open onOpenChange={() => {}} sheet={sheet}>
                        <Button variant="outline">
                            <Plus className="mr-2 h-4 w-4" />
                            Add First Column
                        </Button>
                    </AddColumnDialog>
                 )}
             </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 p-2 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-full sm:flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder={`Search ${sheet.name}...`}
                        className="pl-9 h-9 w-full rounded-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {permissions.canEdit && (
                        <Button variant="outline" size="sm" onClick={() => setIsManageHeadersOpen(true)} className="rounded-xl">
                            <Settings className="mr-2 h-4 w-4" />
                            Headers
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleExport} className="rounded-xl">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                    {permissions.canEdit && (
                        <AddRowDialog open={isAddRowOpen} onOpenChange={setIsAddRowOpen} sheet={sheet}>
                            <Button size="sm" className="rounded-xl">
                                {hasBarcodeSupport ? <ScanLine className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                                {hasBarcodeSupport ? 'Scan Asset' : 'New Row'}
                            </Button>
                        </AddRowDialog>
                    )}
                </div>
            </div>
             <div className="flex-shrink-0 px-2 pb-2 flex items-center justify-start gap-4">
                 {permissions.canEdit && (
                     <>
                         <div className="flex items-center space-x-2">
                             <Checkbox
                                 id="select-all-rows"
                                 checked={
                                     filteredData.length > 0 &&
                                     selectedRows.length === filteredData.length
                                         ? true
                                         : selectedRows.length > 0
                                         ? "indeterminate"
                                         : false
                                 }
                                 onCheckedChange={handleSelectAll}
                                 disabled={filteredData.length === 0}
                             />
                             <label
                                 htmlFor="select-all-rows"
                                 className="text-[10px] font-bold uppercase tracking-widest leading-none cursor-pointer text-muted-foreground"
                             >
                                 Select All
                             </label>
                         </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" disabled={selectedRows.length === 0} className="h-7 px-3 rounded-lg text-[10px] font-bold">
                                    <Trash2 className="mr-1.5 h-3 w-3" /> Delete ({selectedRows.length})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="apple-glass-darker border-none">
                                <AlertDialogHeader><AlertDialogTitle>Confirm Removal</AlertDialogTitle><AlertDialogDescription>This will delete {selectedRows.length} selected row(s). This is an absolute transaction and cannot be reverted.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Abort</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelectedRows} className="bg-destructive hover:bg-destructive/90">Delete Records</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                     </>
                 )}
            </div>
            
            <ScrollArea className="flex-grow bg-muted/20 rounded-2xl border border-white/5 overflow-hidden">
                {isMobile ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                        {filteredData.map((row) => (
                           <SheetDataCard
                                key={row.__originalIndex}
                                rowData={row}
                                rowIndex={row.__originalIndex}
                                headers={headers}
                                sheet={sheet}
                                isSelected={selectedRows.includes(row.__originalIndex)}
                                onSelect={handleSelectRow}
                                onEdit={(rowIndex, data) => setRowToEdit({ rowIndex, data })}
                                onDelete={(rowIndex) => setRowToDelete(rowIndex)}
                                onFieldChange={handleFieldChange}
                                permissions={permissions}
                           />
                        ))}
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-secondary/30">
                            <TableRow className="border-white/5">
                                {permissions.canEdit && (
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={
                                                filteredData.length > 0 && selectedRows.length === filteredData.length
                                                ? true
                                                : selectedRows.length > 0
                                                ? 'indeterminate'
                                                : false
                                            }
                                            onCheckedChange={handleSelectAll}
                                            disabled={filteredData.length === 0}
                                        />
                                    </TableHead>
                                )}
                                {visibleHeaders.map(header => (
                                    <TableHead key={header} className="text-[10px] font-bold uppercase tracking-widest">{header}</TableHead>
                                ))}
                                {permissions.canEdit && <TableHead className="w-20 text-right"></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={visibleHeaders.length + (permissions.canEdit ? 2 : 1)} className="h-48 text-center text-muted-foreground">
                                        {searchTerm ? "No results found for your query." : "Inventory grid is currently empty."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((row) => (
                                    <TableRow key={row.__originalIndex} onDoubleClick={() => setRowToEdit({ rowIndex: row.__originalIndex, data: row })} className="cursor-pointer hover:bg-primary/5 transition-colors border-white/5">
                                        {permissions.canEdit && (
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedRows.includes(row.__originalIndex)}
                                                    onCheckedChange={(checked) => handleSelectRow(row.__originalIndex, !!checked)}
                                                />
                                            </TableCell>
                                        )}
                                        {visibleHeaders.map(header => (
                                            <TableCell key={header} className="max-w-xs truncate text-sm">
                                                {String(row[header] ?? '')}
                                            </TableCell>
                                        ))}
                                        {permissions.canEdit && (
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setRowToEdit({ rowIndex: row.__originalIndex, data: row })}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
                <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {rowToEdit && (
                <EditRowDialog
                    open={!!rowToEdit}
                    onOpenChange={(isOpen) => !isOpen && setRowToEdit(null)}
                    sheet={sheet}
                    rowData={rowToEdit.data}
                    onSave={(updatedData) => handleSaveEdit(rowToEdit.rowIndex, updatedData)}
                    canEdit={permissions.canEdit}
                />
            )}
            
            {rowToDelete !== null && (
                 <AlertDialog open={rowToDelete !== null} onOpenChange={(isOpen) => !isOpen && setRowToDelete(null)}>
                    <AlertDialogContent className="apple-glass-darker border-none">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                            <AlertDialogDescription>This action will permanently delete this asset record from the workbook grid.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abort</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteRow} className="bg-destructive hover:bg-destructive/90">
                                Delete Row
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {permissions.canEdit && (
                <ManageHeadersDialog
                    open={isManageHeadersOpen}
                    onOpenChange={setIsManageHeadersOpen}
                    sheet={sheet}
                />
            )}
        </div>
    );
}
=======
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Sheet } from '@/lib/types';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Search, Download, Edit, Settings } from 'lucide-react';
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
import { AddRowDialog } from './AddRowDialog';
import { EditRowDialog } from './EditRowDialog';
import { Checkbox } from '../ui/checkbox';
import { AddColumnDialog } from './AddColumnDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ManageHeadersDialog } from './ManageHeadersDialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import { SheetDataCard } from './SheetDataCard';


interface SheetDataTableProps {
  sheet: Sheet;
  permissions: {
    canEdit: boolean;
  };
}

export function SheetDataTable({ sheet, permissions }: SheetDataTableProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [data, setData] = useState<Record<string, any>[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isAddRowOpen, setIsAddRowOpen] = useState(false);
    const [rowToDelete, setRowToDelete] = useState<number | null>(null);
    const [rowToEdit, setRowToEdit] = useState<{ rowIndex: number; data: Record<string, any> } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [isManageHeadersOpen, setIsManageHeadersOpen] = useState(false);
    const isMobile = useMediaQuery("(max-width: 768px)");


    // Update local state if the sheet prop changes (e.g., user switches tabs)
    useEffect(() => {
        setData(sheet.data ? JSON.parse(JSON.stringify(sheet.data)) : []);
        setHeaders(sheet.headers ? [...sheet.headers] : []);
        setSelectedRows([]);
    }, [sheet]);
    
    const visibleHeaders = useMemo(() => {
      return headers.filter(h => !sheet.hiddenHeaders?.includes(h))
    }, [headers, sheet.hiddenHeaders]);

    const filteredData = useMemo(() => {
        if (!searchTerm) {
            return data.map((row, index) => ({ ...row, __originalIndex: index }));
        }
        return data
            .map((row, index) => ({ ...row, __originalIndex: index }))
            .filter(row =>
                headers.some(header =>
                    String(row[header] ?? '').toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
    }, [data, headers, searchTerm]);


    const saveChanges = (payload: { data?: Record<string, any>[]; headers?: string[], columnConfig?: any }, toastMessage: string) => {
        if (!firestore || Object.keys(payload).length === 0 || !permissions.canEdit) return;
        const sheetRef = doc(firestore, `workbooks/${sheet.workbookId}/sheets`, sheet.id);
        updateDocumentNonBlocking(sheetRef, payload);
        toast({ title: 'Saved', description: toastMessage });
    };
    
    const handleFieldChange = (rowIndex: number, field: string, value: any) => {
        const newData = [...data];
        newData[rowIndex][field] = value;
        setData(newData);
        saveChanges({ data: newData }, `Row ${rowIndex + 1} updated.`);
    }

    const handleSaveEdit = (rowIndex: number, updatedRowData: Record<string, any>) => {
        const newData = [...data];
        newData[rowIndex] = updatedRowData;
        setData(newData);
        saveChanges({ data: newData }, "Row updated successfully.");
    };

    const handleDeleteRow = () => {
        if (rowToDelete === null || !permissions.canEdit) return;
        const updatedData = data.filter((_, index) => index !== rowToDelete);
        setData(updatedData);
        saveChanges({ data: updatedData }, 'The row has been deleted.');
        setRowToDelete(null);
    };

    const handleDeleteSelectedRows = () => {
        if (selectedRows.length === 0 || !permissions.canEdit) return;
        const updatedData = data.filter((_, index) => !selectedRows.includes(index));
        setData(updatedData);
        saveChanges({ data: updatedData }, `${selectedRows.length} row(s) deleted.`);
        setSelectedRows([]);
    };

    const handleExport = () => {
        if (headers.length === 0) {
            toast({
                variant: "destructive",
                title: "Cannot Export",
                description: "This sheet has no columns to export.",
            });
            return;
        }

        const sheetData = [
            headers, // First row is headers
            ...data.map(row => headers.map(header => row[header] ?? '')) // Subsequent rows are data, handle null/undefined
        ];

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
        XLSX.writeFile(wb, `${sheet.workbookId}-${sheet.name}.xlsx`);
        toast({ title: 'Exporting...', description: `The sheet "${sheet.name}" is being downloaded.` });
    };
    
    const handleSelectRow = (rowIndex: number, checked: boolean) => {
        if (checked) {
            setSelectedRows(prev => [...prev, rowIndex]);
        } else {
            setSelectedRows(prev => prev.filter(idx => idx !== rowIndex));
        }
    };
    
    const handleSelectAll = (checked: boolean | 'indeterminate') => {
        setSelectedRows(checked === true ? filteredData.map((row) => row.__originalIndex) : []);
    };


    if (headers.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 space-y-4">
                 <p className="text-sm font-semibold">This sheet is empty.</p>
                 {permissions.canEdit && (
                    <AddColumnDialog open onOpenChange={() => {}} sheet={sheet}>
                        <Button variant="outline">
                            <Plus className="mr-2 h-4 w-4" />
                            Add First Column
                        </Button>
                    </AddColumnDialog>
                 )}
             </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 p-2 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-full sm:flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder={`Search ${sheet.name}...`}
                        className="pl-9 h-9 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {permissions.canEdit && (
                        <Button variant="outline" size="sm" onClick={() => setIsManageHeadersOpen(true)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Manage Headers
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                    {permissions.canEdit && (
                        <AddRowDialog open={isAddRowOpen} onOpenChange={setIsAddRowOpen} sheet={sheet}>
                            <Button size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                New Asset
                            </Button>
                        </AddRowDialog>
                    )}
                </div>
            </div>
             <div className="flex-shrink-0 px-2 pb-2 flex items-center justify-start gap-2">
                 {permissions.canEdit && (
                     <>
                         <div className="flex items-center space-x-2">
                             <Checkbox
                                 id="select-all-rows"
                                 checked={
                                     filteredData.length > 0 &&
                                     selectedRows.length === filteredData.length
                                         ? true
                                         : selectedRows.length > 0
                                         ? "indeterminate"
                                         : false
                                 }
                                 onCheckedChange={handleSelectAll}
                                 disabled={filteredData.length === 0}
                             />
                             <label
                                 htmlFor="select-all-rows"
                                 className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                             >
                                 Select All
                             </label>
                         </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" disabled={selectedRows.length === 0}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedRows.length})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete {selectedRows.length} selected row(s).</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelectedRows} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                     </>
                 )}
            </div>
            
            <ScrollArea className="flex-grow bg-muted/20 rounded-md border">
                {isMobile ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                        {filteredData.map((row) => (
                           <SheetDataCard
                                key={row.__originalIndex}
                                rowData={row}
                                rowIndex={row.__originalIndex}
                                headers={headers}
                                sheet={sheet}
                                isSelected={selectedRows.includes(row.__originalIndex)}
                                onSelect={handleSelectRow}
                                onEdit={(rowIndex, data) => setRowToEdit({ rowIndex, data })}
                                onDelete={(rowIndex) => setRowToDelete(rowIndex)}
                                onFieldChange={handleFieldChange}
                                permissions={permissions}
                           />
                        ))}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {permissions.canEdit && (
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={
                                                filteredData.length > 0 && selectedRows.length === filteredData.length
                                                ? true
                                                : selectedRows.length > 0
                                                ? 'indeterminate'
                                                : false
                                            }
                                            onCheckedChange={handleSelectAll}
                                            disabled={filteredData.length === 0}
                                        />
                                    </TableHead>
                                )}
                                {visibleHeaders.map(header => (
                                    <TableHead key={header}>{header}</TableHead>
                                ))}
                                {permissions.canEdit && <TableHead className="w-20 text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={visibleHeaders.length + (permissions.canEdit ? 2 : 1)} className="h-24 text-center">
                                        {searchTerm ? "No rows match your search." : "No rows yet. Click 'New Asset' to start."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((row) => (
                                    <TableRow key={row.__originalIndex} onDoubleClick={() => setRowToEdit({ rowIndex: row.__originalIndex, data: row })} className="cursor-pointer">
                                        {permissions.canEdit && (
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedRows.includes(row.__originalIndex)}
                                                    onCheckedChange={(checked) => handleSelectRow(row.__originalIndex, !!checked)}
                                                />
                                            </TableCell>
                                        )}
                                        {visibleHeaders.map(header => (
                                            <TableCell key={header} className="max-w-xs truncate">
                                                {String(row[header] ?? '')}
                                            </TableCell>
                                        ))}
                                        {permissions.canEdit && (
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRowToEdit({ rowIndex: row.__originalIndex, data: row })}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
                <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {rowToEdit && (
                <EditRowDialog
                    open={!!rowToEdit}
                    onOpenChange={(isOpen) => !isOpen && setRowToEdit(null)}
                    sheet={sheet}
                    rowData={rowToEdit.data}
                    onSave={(updatedData) => handleSaveEdit(rowToEdit.rowIndex, updatedData)}
                    canEdit={permissions.canEdit}
                />
            )}
            
            {rowToDelete !== null && (
                 <AlertDialog open={rowToDelete !== null} onOpenChange={(isOpen) => !isOpen && setRowToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This action will permanently delete this row.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteRow} className="bg-destructive hover:bg-destructive/90">
                                Delete Row
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {permissions.canEdit && (
                <ManageHeadersDialog
                    open={isManageHeadersOpen}
                    onOpenChange={setIsManageHeadersOpen}
                    sheet={sheet}
                />
            )}
        </div>
    );
}
>>>>>>> e46f2e1ad97486affb300b626ff5055ece21f529
