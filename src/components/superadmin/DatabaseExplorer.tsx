<<<<<<< HEAD
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, doc, getDoc, writeBatch, setDoc, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Database, FileJson, FileText, ChevronRight, Loader2, Save, Trash2, PlusCircle, ChevronLeft } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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

    useEffect(() => {
        const sortedCollections = Object.keys(collectionSchemaMap)
            .map(id => ({ id, name: collectionSchemaMap[id].title }))
            .sort((a, b) => a.name.localeCompare(b.name));
        setCollections(sortedCollections);
    }, []);

    const fetchDocuments = useCallback(async (collectionName: string) => {
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
        if (!selectedCollection) return;
        setIsLoadingDoc(true);
        setViewedDocument(null);
        setEditedDocument(null);
        setJsonStringValues({});
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
        if (!editedDocument || !selectedCollection || !viewedDocument) return;
        setIsSaving(true);
        try {
            const dataToWrite = { ...viewedDocument, ...editedDocument };
            const { id, ...payload } = dataToWrite;
            const docRef = doc(firestore, selectedCollection, id);
            await setDoc(docRef, payload, { merge: true });
            
            toast({ title: 'Success', description: `Document ${id} has been saved.` });
            
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

    const handleAddNewDocument = async () => {
        if (!selectedCollection || !viewedSchema) return;
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
        if (!selectedCollection || selectedDocIds.length === 0) return;
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


    const renderField = (key: string, value: any) => {
        const schema = viewedSchema?.properties?.[key];
        const isLocked = IMMUTABLE_FIELDS.includes(key);

        if (typeof value === 'object' && value !== null) {
            return (
                 <div key={key} className="grid grid-cols-3 items-start gap-2">
                    <Label htmlFor={key} className="text-right pt-2 truncate">{key}</Label>
                    <Textarea 
                        id={key}
                        value={jsonStringValues[key] ?? JSON.stringify(value, null, 2)}
                        disabled={isLocked}
                        onChange={(e) => {
                            setJsonStringValues(prev => ({...prev, [key]: e.target.value}));
                            try {
                                const parsed = JSON.parse(e.target.value);
                                handleFieldChange(key, parsed);
                            } catch (err) {
                               // Invalid JSON, do nothing to main state, user can continue typing
                            }
                        }}
                        className="col-span-2 font-mono text-xs bg-input"
                        rows={Object.keys(value).length > 5 ? 10 : 5}
                    />
                </div>
            )
        }
        
        if (schema?.type === 'boolean') {
            return (
                <div key={key} className="grid grid-cols-3 items-center gap-2">
                     <Label htmlFor={key} className="text-right">{key}</Label>
                     <div className="col-span-2 flex items-center">
                        <Switch 
                            id={key}
                            checked={!!value}
                            onCheckedChange={(checked) => handleFieldChange(key, checked)}
                            disabled={isLocked}
                        />
                     </div>
                </div>
            )
        }
        
        if (schema?.enum) {
             return (
                <div key={key} className="grid grid-cols-3 items-center gap-2">
                     <Label htmlFor={key} className="text-right">{key}</Label>
                     <Select value={value} onValueChange={(val) => handleFieldChange(key, val)} disabled={isLocked}>
                         <SelectTrigger className="col-span-2">
                             <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                            {schema.enum.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                         </SelectContent>
                     </Select>
                </div>
             )
        }

        return (
            <div key={key} className="grid grid-cols-3 items-center gap-2">
                <Label htmlFor={key} className="text-right truncate">{key}</Label>
                <Input 
                    id={key}
                    type={schema?.type === 'number' ? 'number' : 'text'}
                    value={value ?? ''}
                    onChange={(e) => handleFieldChange(key, schema?.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                    disabled={isLocked}
                    className="col-span-2"
                />
            </div>
        );
    }

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
                 <div className="p-4 border-b font-bold text-xs uppercase tracking-widest flex items-center gap-2 bg-background/80">
                    <Button variant="ghost" size="icon" className="md:hidden -ml-2 h-7 w-7" onClick={() => setMobileView('documents')}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <FileJson className="h-4 w-4 text-primary" /> Data Editor
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-4">
                        {isLoadingDoc ? (
                             <div className="flex flex-col items-center justify-center h-48 gap-4 opacity-40">
                                <Loader2 className="animate-spin text-primary h-8 w-8" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Retrieving Telemetry...</p>
                             </div>
                        ) : editedDocument && !editedDocument.error ? (
                            <div className="space-y-4">
                                 {Object.keys(editedDocument).map(key => renderField(key, editedDocument[key]))}
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
                <div className="p-4 border-t bg-background/80 flex-shrink-0">
                    <Button className="w-full h-11 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-primary/20" onClick={handleSave} disabled={isSaving || isLoadingDoc || !editedDocument || !!editedDocument.error}>
                        {isSaving ? <Loader2 className="mr-2 animate-spin h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                        Apply Mutation
                    </Button>
                </div>
            </div>
        </div>
    );
}
=======
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, doc, getDoc, writeBatch, setDoc, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Database, FileJson, FileText, ChevronRight, Loader2, Save, Trash2, PlusCircle, ChevronLeft } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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

    useEffect(() => {
        const sortedCollections = Object.keys(collectionSchemaMap)
            .map(id => ({ id, name: collectionSchemaMap[id].title }))
            .sort((a, b) => a.name.localeCompare(b.name));
        setCollections(sortedCollections);
    }, []);

    const fetchDocuments = useCallback(async (collectionName: string) => {
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
        if (!selectedCollection) return;
        setIsLoadingDoc(true);
        setViewedDocument(null);
        setEditedDocument(null);
        setJsonStringValues({});
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
        if (!editedDocument || !selectedCollection || !viewedDocument) return;
        setIsSaving(true);
        try {
            const dataToWrite = { ...viewedDocument, ...editedDocument };
            const { id, ...payload } = dataToWrite;
            const docRef = doc(firestore, selectedCollection, id);
            await setDoc(docRef, payload, { merge: true });
            
            toast({ title: 'Success', description: `Document ${id} has been saved.` });
            
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

    const handleAddNewDocument = async () => {
        if (!selectedCollection || !viewedSchema) return;
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
        if (!selectedCollection || selectedDocIds.length === 0) return;
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


    const renderField = (key: string, value: any) => {
        const schema = viewedSchema?.properties?.[key];
        const isLocked = IMMUTABLE_FIELDS.includes(key);

        if (typeof value === 'object' && value !== null) {
            return (
                 <div key={key} className="grid grid-cols-3 items-start gap-2">
                    <Label htmlFor={key} className="text-right pt-2 truncate">{key}</Label>
                    <Textarea 
                        id={key}
                        value={jsonStringValues[key] ?? JSON.stringify(value, null, 2)}
                        disabled={isLocked}
                        onChange={(e) => {
                            setJsonStringValues(prev => ({...prev, [key]: e.target.value}));
                            try {
                                const parsed = JSON.parse(e.target.value);
                                handleFieldChange(key, parsed);
                            } catch (err) {
                               // Invalid JSON, do nothing to main state, user can continue typing
                            }
                        }}
                        className="col-span-2 font-mono text-xs bg-input"
                        rows={Object.keys(value).length > 5 ? 10 : 5}
                    />
                </div>
            )
        }
        
        if (schema?.type === 'boolean') {
            return (
                <div key={key} className="grid grid-cols-3 items-center gap-2">
                     <Label htmlFor={key} className="text-right">{key}</Label>
                     <div className="col-span-2 flex items-center">
                        <Switch 
                            id={key}
                            checked={!!value}
                            onCheckedChange={(checked) => handleFieldChange(key, checked)}
                            disabled={isLocked}
                        />
                     </div>
                </div>
            )
        }
        
        if (schema?.enum) {
             return (
                <div key={key} className="grid grid-cols-3 items-center gap-2">
                     <Label htmlFor={key} className="text-right">{key}</Label>
                     <Select value={value} onValueChange={(val) => handleFieldChange(key, val)} disabled={isLocked}>
                         <SelectTrigger className="col-span-2">
                             <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                            {schema.enum.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                         </SelectContent>
                     </Select>
                </div>
             )
        }

        return (
            <div key={key} className="grid grid-cols-3 items-center gap-2">
                <Label htmlFor={key} className="text-right truncate">{key}</Label>
                <Input 
                    id={key}
                    type={schema?.type === 'number' ? 'number' : 'text'}
                    value={value ?? ''}
                    onChange={(e) => handleFieldChange(key, schema?.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                    disabled={isLocked}
                    className="col-span-2"
                />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 border rounded-lg h-[600px] overflow-hidden">
            <div className={cn("flex flex-col border-r", mobileView !== 'collections' && "hidden md:flex")}>
                 <div className="p-3 border-b font-semibold text-sm flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" /> Collections
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox id="select-all-collections" onCheckedChange={handleSelectAllCollections} checked={collections.length > 0 && selectedCollections.length === collections.length} />
                        <label htmlFor="select-all-collections" className="text-xs">All</label>
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    {collections.map(c => (
                        <div
                            key={c.id}
                            onClick={() => {setSelectedCollection(c.id); setMobileView('documents');}}
                            className={cn(
                                "flex items-center justify-between p-3 text-sm cursor-pointer hover:bg-accent border-b",
                                selectedCollection === c.id && "bg-accent"
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
                                <label htmlFor={`select-collection-${c.id}`} className="cursor-pointer">{c.name}</label>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                    ))}
                </ScrollArea>
            </div>

            <div className={cn("flex flex-col border-r", mobileView !== 'documents' && 'hidden md:flex')}>
                <div className="p-3 border-b font-semibold text-sm flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                         <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => setMobileView('collections')}>
                            <ChevronLeft />
                        </Button>
                        <FileText className="h-4 w-4 text-muted-foreground" /> Documents ({documents.length})
                    </div>
                     <div className="flex items-center gap-2">
                        <Checkbox id="select-all" onCheckedChange={handleSelectAll} checked={documents.length > 0 && selectedDocIds.length === documents.length} />
                        <label htmlFor="select-all" className="text-xs">All</label>
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    {isLoadingDocs ? (
                        <div className="p-3 space-y-2">
                            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                        </div>
                    ) : documents.length > 0 ? (
                        documents.map(d => (
                             <div
                                key={d.id}
                                onClick={() => {handleSelectDocument(d.id); setMobileView('editor')}}
                                className={cn(
                                    "p-3 text-sm cursor-pointer hover:bg-accent border-b flex items-center gap-3",
                                    editedDocument?.id === d.id && "bg-accent"
                                )}
                            >
                                <Checkbox checked={selectedDocIds.includes(d.id)} onCheckedChange={(checked) => handleSingleSelect(d.id, !!checked)} onClick={e => e.stopPropagation()} />
                                <div className="flex-1 truncate">
                                    <p className="font-medium">{getDisplayName(d)}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{d.id}</p>
                                </div>
                                 <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                            {selectedCollection ? "No documents in this collection." : "Select a collection to view documents."}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t flex gap-2">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive" className="flex-1" disabled={selectedDocIds.length === 0 || isDeleting}>
                                {isDeleting ? <Loader2 className="mr-2 animate-spin" /> : <Trash2 className="mr-2" />}
                                Delete ({selectedDocIds.length})
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the selected {selectedDocIds.length} document(s).
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive/90">
                                    Yes, delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="flex-1" disabled={!selectedCollection}>
                                <PlusCircle className="mr-2" /> Add New
                            </Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Add New Document</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Enter a unique ID for the new document or leave it blank to auto-generate one.
                                    The document will be created with a blank schema.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Input 
                                placeholder="Optional: Enter document ID" 
                                value={newDocId}
                                onChange={(e) => setNewDocId(e.target.value)}
                            />
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setNewDocId('')}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleAddNewDocument} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="animate-spin" /> : "Create & Edit"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <div className={cn("flex flex-col", mobileView !== 'editor' && "hidden md:flex")}>
                 <div className="p-3 border-b font-semibold text-sm flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => setMobileView('documents')}>
                        <ChevronLeft />
                    </Button>
                    <FileJson className="h-4 w-4 text-muted-foreground" /> Data Editor
                </div>
                <ScrollArea className="flex-1 bg-muted/30">
                    {isLoadingDoc ? (
                         <div className="p-4 flex justify-center items-center h-full">
                            <Loader2 className="animate-spin text-muted-foreground" />
                         </div>
                    ) : editedDocument && !editedDocument.error ? (
                        <div className="p-4 space-y-3">
                             {Object.keys(editedDocument).map(key => renderField(key, editedDocument[key]))}
                        </div>
                    ) : (
                         <div className="p-4 text-center text-xs text-muted-foreground h-full flex items-center justify-center">
                           {!isLoadingDoc && (editedDocument?.error || "Select a document to edit its data.")}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t">
                    <Button className="w-full" onClick={handleSave} disabled={isSaving || isLoadingDoc || !editedDocument || !!editedDocument.error}>
                        {isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}
>>>>>>> e46f2e1ad97486affb300b626ff5055ece21f529
