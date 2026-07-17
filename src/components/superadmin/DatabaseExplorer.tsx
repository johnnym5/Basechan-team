'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, doc, getDoc, writeBatch, setDoc, query, deleteDoc, deleteField } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Database, FileJson, FileText, ChevronRight, Loader2, Save, Trash2, PlusCircle, ChevronLeft, Copy, Unlock, Lock, Edit2, RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import backendConfig from '../../../docs/backend.json';

const getDisplayName = (doc: any): string => {
    return doc.title || doc.name || doc.fullName || doc.serialNo || 'Untitled Document';
}

const IMMUTABLE_FIELDS = ['id', 'orgId', 'createdBy', 'createdAt', 'serialNo', 'email', 'userId', 'chatId', 'workbookId', 'ownerId', 'requesterId'];

// Maps collection names to their entity definitions in backend.json
const collectionSchemaMap: Record<string, any> = {};
backendConfig.firestore.structure.forEach(item => {
    const collectionName = item.path.split('/')[1];
    if (collectionName) {
        const entityName = item.definition.entityName;
        collectionSchemaMap[collectionName] = backendConfig.entities[entityName as keyof typeof backendConfig.entities];
    }
});


export function DatabaseExplorer() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [collections, setCollections] = useState<{id: string, name: string}[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    
    const [documents, setDocuments] = useState<any[]>([]);
    const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    
    const [viewedDocument, setViewedDocument] = useState<any | null>(null);
    const [editedDocument, setEditedDocument] = useState<any | null>(null);
    const [viewedSchema, setViewedSchema] = useState<any | null>(null);
    const [jsonStringValues, setJsonStringValues] = useState<Record<string, string>>({});


    const [isLoadingDoc, setIsLoadingDoc] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAddDocOpen, setIsAddDocOpen] = useState(false);
    const [newDocId, setNewDocId] = useState('');
    const [mobileView, setMobileView] = useState<'collections' | 'documents' | 'editor'>('collections');

    // Advanced DB Manager states
    const [deletedFields, setDeletedFields] = useState<string[]>([]);
    const [unlockSystemFields, setUnlockSystemFields] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] = useState('string');
    const [cloneDocId, setCloneDocId] = useState('');
    const [deleteOriginalAfterClone, setDeleteOriginalAfterClone] = useState(false);

    useEffect(() => {
        const sortedCollections = Object.keys(collectionSchemaMap)
            .map(id => ({ id, name: collectionSchemaMap[id].title }))
            .sort((a, b) => a.name.localeCompare(b.name));
        setCollections(sortedCollections);
    }, []);

    const fetchDocuments = useCallback(async (collectionName: string) => {
        if (!firestore) return;
        setIsLoadingDocs(true);
        setDocuments([]);
        setViewedDocument(null);
        setEditedDocument(null);
        setSelectedDocIds([]);
        try {
            const querySnapshot = await getDocs(query(collection(firestore, collectionName)));
            const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setDocuments(docs);
        } catch (error) {
            console.error("Error fetching documents:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch documents.' });
        } finally {
            setIsLoadingDocs(false);
        }
    }, [firestore, toast]);
    
    useEffect(() => {
        if (selectedCollection) {
            fetchDocuments(selectedCollection);
            setViewedSchema(collectionSchemaMap[selectedCollection] || null);
        } else {
            setViewedSchema(null);
            setMobileView('collections');
        }
    }, [selectedCollection, fetchDocuments]);

    const handleSelectDocument = useCallback(async (docId: string) => {
        if (!selectedCollection || !firestore) return;
        setIsLoadingDoc(true);
        setViewedDocument(null);
        setEditedDocument(null);
        setJsonStringValues({});
        setDeletedFields([]);
        try {
            const docRef = doc(firestore, selectedCollection, docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const docData = { id: docSnap.id, ...docSnap.data() };
                setViewedDocument(docData);
                setEditedDocument(JSON.parse(JSON.stringify(docData))); // Deep copy for editing
            } else {
                 setEditedDocument({ error: "Document not found." });
            }
        } catch (error) {
            console.error("Error fetching document:", error);
            setEditedDocument({ error: "Failed to fetch document." });
        } finally {
            setIsLoadingDoc(false);
        }
    }, [selectedCollection, firestore]);
    
    const handleFieldChange = (key: string, value: any) => {
        setEditedDocument((prev: any) => ({ ...prev, [key]: value }));
    };
    
    const handleSave = async () => {
        if (!editedDocument || !selectedCollection || !viewedDocument || !firestore) return;
        setIsSaving(true);
        try {
            const dataToWrite = { ...viewedDocument, ...editedDocument };
            
            // Mark deleted fields to be deleted in Firestore
            deletedFields.forEach(field => {
                dataToWrite[field] = deleteField();
            });

            const { id, ...payload } = dataToWrite;
            const docRef = doc(firestore, selectedCollection, id);
            await setDoc(docRef, payload, { merge: true });
            
            toast({ title: 'Success', description: `Document ${id} has been saved.` });
            setDeletedFields([]);
            
            await fetchDocuments(selectedCollection);
            // After saving, re-select the document to see the fresh data
            await handleSelectDocument(id);

        } catch (e: any) {
            console.error("Save error:", e);
            toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteField = (key: string) => {
        setDeletedFields(prev => [...prev, key]);
        toast({ title: 'Field Marked for Deletion', description: `Field "${key}" will be deleted when you Apply Mutation.` });
    };

    const handleRenameField = (oldKey: string, newKey: string) => {
        if (!editedDocument) return;
        if (editedDocument[newKey] !== undefined && !deletedFields.includes(newKey)) {
            toast({ variant: 'destructive', title: 'Rename Failed', description: 'Target field name already exists.' });
            return;
        }

        const value = editedDocument[oldKey];
        setEditedDocument((prev: any) => {
            const { [oldKey]: _, ...rest } = prev;
            return { ...rest, [newKey]: value };
        });

        // Mark the old field name for deletion in Firestore
        setDeletedFields(prev => [...prev, oldKey]);
        // Remove the new field name from deleted fields list if it was deleted previously
        setDeletedFields(prev => prev.filter(f => f !== newKey));

        toast({ title: 'Field Renamed', description: `"${oldKey}" renamed to "${newKey}". Apply Mutation to persist.` });
    };

    const handleAddField = () => {
        if (!newFieldName.trim() || !editedDocument) return;
        const key = newFieldName.trim();
        
        if (editedDocument[key] !== undefined && !deletedFields.includes(key)) {
            toast({ variant: 'destructive', title: 'Creation Failed', description: 'Field already exists.' });
            return;
        }

        let initialValue: any = "";
        switch (newFieldType) {
            case 'number': initialValue = 0; break;
            case 'boolean': initialValue = false; break;
            case 'array': initialValue = []; break;
            case 'object': initialValue = {}; break;
            default: initialValue = "";
        }

        setEditedDocument((prev: any) => ({
            ...prev,
            [key]: initialValue
        }));

        // Remove from deleted fields list if it was previously marked for deletion
        setDeletedFields(prev => prev.filter(f => f !== key));

        setNewFieldName('');
        setNewFieldType('string');
        toast({ title: 'Field Added', description: `"${key}" added to document state. Apply Mutation to persist.` });
    };

    const handleCloneDocument = async () => {
        if (!viewedDocument || !selectedCollection || !firestore || !cloneDocId.trim()) return;
        const targetId = cloneDocId.trim();
        const sourceId = viewedDocument.id;
        
        setIsSaving(true);
        try {
            const targetRef = doc(firestore, selectedCollection, targetId);
            const targetSnap = await getDoc(targetRef);
            if (targetSnap.exists()) {
                toast({ variant: 'destructive', title: 'Clone Failed', description: 'Target Document ID already exists.' });
                return;
            }

            // Copy all fields except the structural 'id' helper
            const dataToCopy = { ...viewedDocument };
            delete dataToCopy.id;

            await setDoc(targetRef, dataToCopy);

            if (deleteOriginalAfterClone) {
                const sourceRef = doc(firestore, selectedCollection, sourceId);
                await deleteDoc(sourceRef);
                toast({ title: 'Rename Complete', description: `Document ${sourceId} has been renamed to ${targetId}.` });
            } else {
                toast({ title: 'Clone Complete', description: `Document ${sourceId} has been cloned to ${targetId}.` });
            }

            setCloneDocId('');
            setDeleteOriginalAfterClone(false);
            
            // Refresh and select the new node
            await fetchDocuments(selectedCollection);
            await handleSelectDocument(targetId);
            setMobileView('editor');

        } catch (e: any) {
            console.error("Clone error:", e);
            toast({ variant: 'destructive', title: 'Clone Failed', description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddNewDocument = async () => {
        if (!selectedCollection || !viewedSchema || !firestore) return;
        setIsSaving(true);
        try {
            let newDocRef;
            if (newDocId) {
                newDocRef = doc(firestore, selectedCollection, newDocId);
            } else {
                newDocRef = doc(collection(firestore, selectedCollection));
            }

            const blankData: Record<string, any> = {};
            for (const key in viewedSchema.properties) {
                const prop = viewedSchema.properties[key];
                if (IMMUTABLE_FIELDS.includes(key)) continue;

                switch(prop.type) {
                    case 'string': blankData[key] = ''; break;
                    case 'number': blankData[key] = 0; break;
                    case 'boolean': blankData[key] = false; break;
                    case 'array': blankData[key] = []; break;
                    case 'object': blankData[key] = {}; break;
                    default: blankData[key] = null;
                }
            }

            await setDoc(newDocRef, blankData);
            toast({ title: 'Success', description: 'New document created.' });
            
            setIsAddDocOpen(false);
            setNewDocId('');
            await fetchDocuments(selectedCollection);
            await handleSelectDocument(newDocRef.id);
            setMobileView('editor');

        } catch (e: any) {
             toast({ variant: 'destructive', title: 'Creation Failed', description: e.message });
        } finally {
            setIsSaving(false);
        }
    }

     const handleDeleteSelected = async () => {
        if (!selectedCollection || selectedDocIds.length === 0 || !firestore) return;
        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            selectedDocIds.forEach(id => {
                const docRef = doc(firestore, selectedCollection, id);
                batch.delete(docRef);
            });
            await batch.commit();

            toast({
                title: 'Success',
                description: `${selectedDocIds.length} document(s) have been deleted.`
            });

            setViewedDocument(null);
            setEditedDocument(null);
            setSelectedDocIds([]);
            fetchDocuments(selectedCollection);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleSelectAll = (checked: boolean | string) => {
        if (typeof checked === 'boolean') {
            setSelectedDocIds(checked ? documents.map(d => d.id) : []);
        }
    };

    const handleSingleSelect = (docId: string, checked: boolean) => {
        if (checked) {
            setSelectedDocIds(prev => [...prev, docId]);
        } else {
            setSelectedDocIds(prev => prev.filter(id => id !== docId));
        }
    };
    
     const handleSelectAllCollections = (checked: boolean | string) => {
        if (typeof checked === 'boolean') {
            setSelectedCollections(checked ? collections.map(c => c.id) : []);
        }
    };


    const renderFieldInput = (key: string, value: any) => {
        const schema = viewedSchema?.properties?.[key];
        const isLocked = IMMUTABLE_FIELDS.includes(key) && !unlockSystemFields;
        const isDeleted = deletedFields.includes(key);

        if (typeof value === 'object' && value !== null) {
            return (
                <Textarea 
                    id={key}
                    value={jsonStringValues[key] ?? JSON.stringify(value, null, 2)}
                    disabled={isLocked || isDeleted}
                    onChange={(e) => {
                        setJsonStringValues(prev => ({...prev, [key]: e.target.value}));
                        try {
                            const parsed = JSON.parse(e.target.value);
                            handleFieldChange(key, parsed);
                        } catch (err) {
                           // Invalid JSON, user is typing
                        }
                    }}
                    className="font-mono text-xs bg-background/30 border-white/5"
                    rows={Object.keys(value).length > 5 ? 8 : 4}
                />
            )
        }
        
        if (schema?.type === 'boolean' || typeof value === 'boolean') {
            return (
                <div className="flex items-center">
                    <Switch 
                        id={key}
                        checked={!!value}
                        onCheckedChange={(checked) => handleFieldChange(key, checked)}
                        disabled={isLocked || isDeleted}
                    />
                </div>
            )
        }
        
        if (schema?.enum) {
             return (
                <Select value={value} onValueChange={(val) => handleFieldChange(key, val)} disabled={isLocked || isDeleted}>
                    <SelectTrigger className="w-full bg-background/30 border-white/5 h-10">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="apple-glass border-none">
                       {schema.enum.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                    </SelectContent>
                </Select>
             )
        }

        return (
            <Input 
                id={key}
                type={schema?.type === 'number' || typeof value === 'number' ? 'number' : 'text'}
                value={value ?? ''}
                onChange={(e) => handleFieldChange(key, schema?.type === 'number' || typeof value === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                disabled={isLocked || isDeleted}
                className="bg-background/30 border-white/5 h-10 text-xs"
            />
        );
    };

    const renderFieldRow = (key: string, value: any) => {
        const schema = viewedSchema?.properties?.[key];
        const isLocked = IMMUTABLE_FIELDS.includes(key) && !unlockSystemFields;
        const isDeleted = deletedFields.includes(key);

        const fieldType = schema?.type || (typeof value === 'object' && value !== null ? (Array.isArray(value) ? 'array' : 'object') : typeof value);

        return (
            <div 
                key={key} 
                className={cn(
                    "flex flex-col gap-1.5 p-3 rounded-xl border transition-all",
                    isDeleted 
                        ? "bg-rose-950/10 border-rose-500/20 opacity-60 line-through decoration-rose-500/50" 
                        : "bg-white/[0.01] border-white/5 hover:bg-white/[0.03]"
                )}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-primary font-mono">{key}</span>
                        {fieldType && (
                            <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded-full text-muted-foreground uppercase tracking-wider font-bold">
                                {fieldType}
                            </span>
                        )}
                        {isLocked && (
                            <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                                System
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                        {isDeleted ? (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 rounded-md hover:bg-emerald-500/20 hover:text-emerald-500 text-emerald-400"
                                onClick={() => setDeletedFields(prev => prev.filter(f => f !== key))}
                                title="Undo Deletion"
                            >
                                <RefreshCw className="h-3 w-3" />
                            </Button>
                        ) : (
                            <>
                                {!isLocked && (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground">
                                                <Edit2 className="h-3 w-3" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-3 apple-glass border-none space-y-3 shadow-2xl">
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-primary">Rename Field Key</Label>
                                                <p className="text-[9px] text-muted-foreground">Changes the attribute identifier name</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Input 
                                                    placeholder="New name..." 
                                                    defaultValue={key}
                                                    id={`rename-input-${key}`}
                                                    className="h-8 text-xs bg-background/50 border-white/5"
                                                />
                                                <Button size="sm" className="h-8 rounded-lg text-xs" onClick={() => {
                                                    const input = document.getElementById(`rename-input-${key}`) as HTMLInputElement;
                                                    if (input && input.value.trim() && input.value.trim() !== key) {
                                                        handleRenameField(key, input.value.trim());
                                                    }
                                                }}>
                                                    Rename
                                                </Button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                )}
                                
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 rounded-md hover:bg-rose-500/20 hover:text-rose-500 text-muted-foreground disabled:opacity-30"
                                    onClick={() => handleDeleteField(key)}
                                    disabled={isLocked}
                                    title="Delete Field"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                <div className="mt-1">
                    {renderFieldInput(key, value)}
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 border rounded-2xl h-[650px] overflow-hidden bg-background/50 shadow-inner">
            <div className={cn("flex flex-col border-r bg-secondary/5", mobileView !== 'collections' && "hidden md:flex")}>
                 <div className="p-4 border-b font-bold text-xs uppercase tracking-widest flex items-center justify-between bg-background/80">
                     <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-primary" /> Collections
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox id="select-all-collections" onCheckedChange={handleSelectAllCollections} checked={collections.length > 0 && selectedCollections.length === collections.length} />
                        <label htmlFor="select-all-collections" className="text-[10px] font-black">All</label>
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <div className="divide-y divide-white/5">
                        {collections.map(c => (
                            <div
                                key={c.id}
                                onClick={() => {setSelectedCollection(c.id); setMobileView('documents');}}
                                className={cn(
                                    "flex items-center justify-between p-4 text-sm cursor-pointer hover:bg-primary/5 transition-colors",
                                    selectedCollection === c.id && "bg-primary/10 text-primary border-r-2 border-primary"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Checkbox 
                                        id={`select-collection-${c.id}`}
                                        checked={selectedCollections.includes(c.id)} 
                                        onCheckedChange={(checked) => {
                                            setSelectedCollections(prev => 
                                                checked ? [...prev, c.id] : prev.filter(id => id !== c.id)
                                            )
                                        }} 
                                        onClick={e => e.stopPropagation()} 
                                    />
                                    <label htmlFor={`select-collection-${c.id}`} className="cursor-pointer font-medium">{c.name}</label>
                                </div>
                                <ChevronRight className="h-4 w-4 opacity-50" />
                            </div>
                        ))}
                    </div>
                    <ScrollBar />
                </ScrollArea>
            </div>

            <div className={cn("flex flex-col border-r bg-secondary/5", mobileView !== 'documents' && 'hidden md:flex')}>
                <div className="p-4 border-b font-bold text-xs uppercase tracking-widest flex items-center gap-2 justify-between bg-background/80">
                    <div className="flex items-center gap-2">
                         <Button variant="ghost" size="icon" className="md:hidden -ml-2 h-7 w-7" onClick={() => setMobileView('collections')}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <FileText className="h-4 w-4 text-primary" /> Documents ({documents.length})
                    </div>
                     <div className="flex items-center gap-2">
                        <Checkbox id="select-all" onCheckedChange={handleSelectAll} checked={documents.length > 0 && selectedDocIds.length === documents.length} />
                        <label htmlFor="select-all" className="text-[10px] font-black">All</label>
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <div className="divide-y divide-white/5">
                        {isLoadingDocs ? (
                            <div className="p-4 space-y-3">
                                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                            </div>
                        ) : documents.length > 0 ? (
                            documents.map(d => (
                                <div
                                    key={d.id}
                                    onClick={() => {handleSelectDocument(d.id); setMobileView('editor')}}
                                    className={cn(
                                        "p-4 text-sm cursor-pointer hover:bg-primary/5 transition-colors flex items-center gap-3",
                                        editedDocument?.id === d.id && "bg-primary/10 text-primary border-r-2 border-primary"
                                    )}
                                >
                                    <Checkbox checked={selectedDocIds.includes(d.id)} onCheckedChange={(checked) => handleSingleSelect(d.id, !!checked)} onClick={e => e.stopPropagation()} />
                                    <div className="flex-1 truncate">
                                        <p className="font-bold text-xs truncate">{getDisplayName(d)}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono truncate">{d.id}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 opacity-50 ml-auto" />
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-xs text-muted-foreground uppercase tracking-widest opacity-40">
                                {selectedCollection ? "Collection Empty" : "Select Scope"}
                            </div>
                        )}
                    </div>
                    <ScrollBar />
                </ScrollArea>
                <div className="p-4 border-t flex gap-2 bg-background/80 flex-shrink-0">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive" size="sm" className="flex-1 h-9 rounded-xl font-bold uppercase text-[10px] tracking-widest" disabled={selectedDocIds.length === 0 || isDeleting}>
                                {isDeleting ? <Loader2 className="mr-2 animate-spin h-3 w-3" /> : <Trash2 className="mr-2 h-3 w-3" />}
                                Terminate ({selectedDocIds.length})
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="apple-glass-darker border-none">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl font-black text-rose-500 uppercase">Confirm Termination</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This operation will permanently remove {selectedDocIds.length} document(s) from the infrastructure. This action is irreversible.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Abort</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteSelected} className="bg-rose-600 hover:bg-rose-700">
                                    Execute
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1 h-9 rounded-xl font-bold uppercase text-[10px] tracking-widest" disabled={!selectedCollection}>
                                <PlusCircle className="mr-2 h-3 w-3" /> Add Doc
                            </Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent className="apple-glass-darker border-none">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl font-bold">New Node Entry</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Assign a specific ID for the new document or leave blank for auto-generation.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                                <Input 
                                    placeholder="Unique Identifier..." 
                                    value={newDocId}
                                    onChange={(e) => setNewDocId(e.target.value)}
                                    className="h-12 rounded-xl bg-background/50"
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setNewDocId('')}>Abort</AlertDialogCancel>
                                <AlertDialogAction onClick={handleAddNewDocument} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 animate-spin h-4 w-4" /> : "Deploy Entry"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <div className={cn("flex flex-col bg-background/30", mobileView !== 'editor' && "hidden md:flex")}>
                 <div className="p-4 border-b font-bold text-xs uppercase tracking-widest flex items-center justify-between bg-background/80">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="md:hidden -ml-2 h-7 w-7" onClick={() => setMobileView('documents')}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <FileJson className="h-4 w-4 text-primary" /> Data Editor
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="unlock-system" className="text-[10px] text-muted-foreground flex items-center gap-1 cursor-pointer">
                            {unlockSystemFields ? <Unlock className="h-3 w-3 text-amber-500" /> : <Lock className="h-3 w-3" />}
                            Force Unlock
                        </Label>
                        <Switch 
                            id="unlock-system" 
                            checked={unlockSystemFields} 
                            onCheckedChange={setUnlockSystemFields}
                        />
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-4">
                        {isLoadingDoc ? (
                             <div className="flex flex-col items-center justify-center h-48 gap-4 opacity-40">
                                <Loader2 className="animate-spin text-primary h-8 w-8" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Retrieving Telemetry...</p>
                             </div>
                        ) : editedDocument && !editedDocument.error ? (
                            <div className="space-y-3">
                                 {Object.keys(editedDocument).map(key => renderFieldRow(key, editedDocument[key]))}
                            </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center h-96 gap-4 opacity-30 p-12 text-center">
                                <FileJson className="h-12 w-12" />
                                <p className="text-[10px] font-black uppercase tracking-widest">
                                   {!isLoadingDoc && (editedDocument?.error || "Select Document to View Telemetry")}
                                </p>
                            </div>
                        )}
                    </div>
                    <ScrollBar />
                </ScrollArea>
                <div className="p-4 border-t bg-background/80 flex flex-col gap-3 flex-shrink-0">
                    {editedDocument && !editedDocument.error && (
                        <div className="flex gap-2">
                            {/* Add Custom Field Popover */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="flex-1 h-9 rounded-xl font-bold uppercase text-[10px] tracking-widest border-white/5 bg-white/[0.02]">
                                        <PlusCircle className="mr-2 h-3.5 w-3.5 text-primary" /> Add Attribute
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-4 apple-glass border-none space-y-4 shadow-2xl">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">New Custom Attribute</Label>
                                        <p className="text-[10px] text-muted-foreground">Define a new typed key-value entry</p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <Label htmlFor="new-field-name" className="text-[9px] uppercase font-black text-muted-foreground">Identifier Name</Label>
                                            <Input 
                                                id="new-field-name"
                                                placeholder="e.g. trackingNumber" 
                                                value={newFieldName}
                                                onChange={(e) => setNewFieldName(e.target.value)}
                                                className="h-9 text-xs bg-background/50 border-white/5 rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="new-field-type" className="text-[9px] uppercase font-black text-muted-foreground">Value Type</Label>
                                            <Select value={newFieldType} onValueChange={setNewFieldType}>
                                                <SelectTrigger id="new-field-type" className="h-9 text-xs bg-background/50 border-white/5 rounded-lg">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="apple-glass border-none">
                                                    <SelectItem value="string">String</SelectItem>
                                                    <SelectItem value="number">Number</SelectItem>
                                                    <SelectItem value="boolean">Boolean</SelectItem>
                                                    <SelectItem value="array">Array (Blank)</SelectItem>
                                                    <SelectItem value="object">Object (Blank)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button className="w-full h-9 rounded-lg text-xs font-bold" onClick={handleAddField} disabled={!newFieldName.trim()}>
                                            Create Attribute
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Clone / Rename Popover */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="flex-1 h-9 rounded-xl font-bold uppercase text-[10px] tracking-widest border-white/5 bg-white/[0.02]">
                                        <Copy className="mr-2 h-3.5 w-3.5 text-primary" /> Duplicate Node
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-4 apple-glass border-none space-y-4 shadow-2xl">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Duplicate / Rename Document</Label>
                                        <p className="text-[10px] text-muted-foreground">Creates a copy of this document with a new ID</p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <Label htmlFor="clone-doc-id" className="text-[9px] uppercase font-black text-muted-foreground">New Target Document ID</Label>
                                            <Input 
                                                id="clone-doc-id"
                                                placeholder="e.g. custom_doc_id" 
                                                value={cloneDocId}
                                                onChange={(e) => setCloneDocId(e.target.value)}
                                                className="h-9 text-xs bg-background/50 border-white/5 rounded-lg"
                                            />
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox 
                                                id="delete-original-clone" 
                                                checked={deleteOriginalAfterClone}
                                                onCheckedChange={(checked) => setDeleteOriginalAfterClone(!!checked)}
                                            />
                                            <Label htmlFor="delete-original-clone" className="text-[10px] text-muted-foreground font-medium cursor-pointer">
                                                Purge original node (Rename operation)
                                            </Label>
                                        </div>
                                        <Button className="w-full h-9 rounded-lg text-xs font-bold" onClick={handleCloneDocument} disabled={!cloneDocId.trim() || isSaving}>
                                            {isSaving ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-2" /> : "Deploy Copy"}
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                    <Button className="w-full h-11 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-primary/20" onClick={handleSave} disabled={isSaving || isLoadingDoc || !editedDocument || !!editedDocument.error}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Apply Mutation
                    </Button>
                </div>
            </div>
        </div>
    );
}