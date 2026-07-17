"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Workbook, UserProfile, Sheet } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from 'xlsx';
import { sanitizeInput } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface NewWorkbookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
}

interface ParsedSheet {
    name: string;
    data: Record<string, any>[];
    headers: string[];
}

export function NewWorkbookDialog({ open, onOpenChange, userProfile }: NewWorkbookDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("blank");
  const [file, setFile] = useState<File | null>(null);
  const [parsedSheets, setParsedSheets] = useState<ParsedSheet[] | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        form.setValue("title", selectedFile.name.replace(/\.[^/.]+$/, ""));
        
        const ext = selectedFile.name.split('.').pop()?.toLowerCase();
        
        if (ext === 'pdf') {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const pdfjsLib = await import('pdfjs-dist');
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
                    const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map((item: any) => item.str).join(' ');
                        fullText += pageText + '\n';
                    }
                    const rows = fullText.split('\n').filter(r => r.trim() !== '').map(text => ({ Content: text }));
                    setParsedSheets([{ name: 'Document Text', data: rows, headers: ['Content'] }]);
                } catch(err) {
                    console.error("Error parsing pdf:", err);
                    toast({ variant: "destructive", title: "Parse Error", description: "Could not read PDF."});
                    setFile(null); setParsedSheets(null); form.reset();
                }
            };
            reader.readAsArrayBuffer(selectedFile);
        } else if (ext === 'doc' || ext === 'docx') {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const mammoth = await import('mammoth');
                    const arrayBuffer = event.target?.result as ArrayBuffer;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    const rows = result.value.split('\n').filter(r => r.trim() !== '').map(text => ({ Content: text }));
                    setParsedSheets([{ name: 'Document Text', data: rows, headers: ['Content'] }]);
                } catch(err) {
                    console.error("Error parsing docx:", err);
                    toast({ variant: "destructive", title: "Parse Error", description: "Could not read Word document."});
                    setFile(null); setParsedSheets(null); form.reset();
                }
            };
            reader.readAsArrayBuffer(selectedFile);
        } else if (ext === 'txt') {
             const reader = new FileReader();
             reader.onload = (event) => {
                  const text = event.target?.result as string;
                  const rows = text.split('\n').filter(r => r.trim() !== '').map(t => ({ Content: t }));
                  setParsedSheets([{ name: 'Document Text', data: rows, headers: ['Content'] }]);
             };
             reader.readAsText(selectedFile);
        } else {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const workbook = XLSX.read(event.target?.result, { type: 'binary' });
                    const sheets: ParsedSheet[] = [];
                    workbook.SheetNames.forEach(sheetName => {
                        const ws = workbook.Sheets[sheetName];
                        const data: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);
                        
                        if (data.length === 0) {
                             sheets.push({ name: sheetName, data: [], headers: [] });
                             return;
                        }

                        const headers = Object.keys(data[0]);

                        // Sanitize the data to ensure no `undefined` values are present, replacing them with `null`.
                        const sanitizedData = data.map(row => {
                            const newRow: Record<string, any> = {};
                            headers.forEach(header => {
                                newRow[header] = row[header] !== undefined ? row[header] : null;
                            });
                            return newRow;
                        });

                        sheets.push({ name: sheetName, data: sanitizedData, headers });
                    });
                    setParsedSheets(sheets);
                } catch (err) {
                    console.error("Error parsing file:", err);
                    toast({
                        variant: "destructive",
                        title: "File Parse Error",
                        description: "Could not read the selected file. Please ensure it's a valid Excel or CSV file.",
                    })
                    setFile(null);
                    setParsedSheets(null);
                    form.reset();
                }
            };
            reader.readAsBinaryString(selectedFile);
        }
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        setFile(null);
        setParsedSheets(null);
        form.reset();
        setActiveTab('blank');
    }
    onOpenChange(isOpen);
  }


  async function onSubmit(values: FormData) {
    if (!firestore || !userProfile) {
        toast({ variant: "destructive", title: "Error", description: "Could not find user profile." });
        return;
    }
    
    if (activeTab === 'import' && !file) {
        toast({ variant: 'destructive', title: 'File required', description: 'Please select a file to import.' });
        return;
    }

    setIsLoading(true);

    try {
        const now = new Date().toISOString();
        const newWorkbook: Omit<Workbook, 'id'> = {
            orgId: userProfile.orgId,
            title: sanitizeInput(values.title),
            description: sanitizeInput(values.description),
            createdBy: userProfile.id,
            creatorName: userProfile.fullName,
            createdAt: now,
            visibleTo: [userProfile.id],
            sharedWith: [],
        };

        const workbookDocRef = await addDocumentNonBlocking(collection(firestore, 'workbooks'), newWorkbook);
        
        if (!workbookDocRef) {
            throw new Error("Failed to create workbook document.");
        }

        if (activeTab === 'import' && parsedSheets) {
            for (const sheet of parsedSheets) {
                const sheetData: Omit<Sheet, 'id'> = {
                    workbookId: workbookDocRef.id,
                    name: sheet.name,
                    data: sheet.data,
                    headers: sheet.headers,
                    createdAt: now,
                };
                addDocumentNonBlocking(collection(firestore, `workbooks/${workbookDocRef.id}/sheets`), sheetData);
            }
        } else if (activeTab === 'blank') {
            const defaultSheet: Omit<Sheet, 'id'> = {
                workbookId: workbookDocRef.id,
                name: 'Sheet1',
                data: [],
                headers: [],
                createdAt: now,
            };
            await addDocumentNonBlocking(collection(firestore, `workbooks/${workbookDocRef.id}/sheets`), defaultSheet);
        }


        toast({
            title: "Workbook Created",
            description: `"${values.title}" has been successfully created.`,
        });

        handleOpenChange(false);
    } catch (error: any) {
        if (error.code !== 'permission-denied') {
            toast({
                variant: "destructive",
                title: "Creation Failed",
                description: error.message || "An unexpected error occurred.",
            });
        }
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Workbook</DialogTitle>
          <DialogDescription>
            Create a blank workbook or import data from an Excel file.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="blank">Create Blank</TabsTrigger>
                        <TabsTrigger value="import">Import File</TabsTrigger>
                    </TabsList>
                    <div className="py-4 space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl><Input placeholder="e.g., Q4 Marketing Plan" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <TabsContent value="blank" className="m-0 p-0">
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl><Textarea placeholder="What is this workbook for?" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </TabsContent>
                        <TabsContent value="import" className="m-0 p-0 space-y-4">
                             <div className="space-y-4">
                                <FormLabel>Data File (Excel, CSV, Word, PDF, Text)</FormLabel>
                                <div className="flex items-center gap-4">
                                    <Input type="file" onChange={handleFileChange} accept=".xlsx, .xls, .csv, .doc, .docx, .pdf, .txt" />
                                </div>
                            </div>
                             {parsedSheets && (
                                <div className="text-sm text-muted-foreground p-2 border rounded-md">
                                    <p className="font-semibold">{parsedSheets.length} sheet(s) found:</p>
                                    <p className="truncate">{parsedSheets.map(s => s.name).join(', ')}</p>
                                </div>
                             )}
                        </TabsContent>
                    </div>
                </Tabs>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {activeTab === 'import' ? 'Import Workbook' : 'Create Workbook'}
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
