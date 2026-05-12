<<<<<<< HEAD
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, CalendarIcon, ScanLine } from "lucide-react";
import { useState, useMemo } from "react";
import { useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { doc, arrayUnion } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Sheet } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { sanitizeInput, cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { format } from "date-fns";
import { BarcodeScanner } from "../shared/BarcodeScanner";

interface AddRowDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: Sheet;
}

export function AddRowDialog({ children, open, onOpenChange, sheet }: AddRowDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState<string | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const formSchema = useMemo(() => {
    const schemaShape: Record<string, z.ZodType<any, any>> = {};
    sheet.headers.forEach(header => {
        const config = sheet.columnConfig?.[header];
        switch (config?.type) {
            case 'number':
                let numSchema = z.coerce.number();
                if (config.min !== undefined && config.min !== null) {
                    numSchema = numSchema.min(config.min, `Value must be at least ${config.min}`);
                }
                if (config.max !== undefined && config.max !== null) {
                    numSchema = numSchema.max(config.max, `Value must be at most ${config.max}`);
                }
                schemaShape[header] = numSchema;
                break;
            case 'date':
                schemaShape[header] = z.date().optional();
                break;
            default:
                schemaShape[header] = z.string().optional();
        }
    });
    return z.object(schemaShape);
  }, [sheet.headers, sheet.columnConfig]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        form.reset();
    }
    onOpenChange(isOpen);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;
    
    setIsLoading(true);

    // Sanitize string inputs and format dates
    const newRow = Object.entries(values).reduce((acc, [key, value]) => {
        const config = sheet.columnConfig?.[key];
        if (config?.type === 'date' && value instanceof Date) {
            acc[key] = value.toISOString();
        } else if (typeof value === 'string') {
            acc[key] = sanitizeInput(value);
        } else {
            acc[key] = value;
        }
        return acc;
    }, {} as Record<string, any>);


    try {
        const sheetRef = doc(firestore, `workbooks/${sheet.workbookId}/sheets`, sheet.id);
        
        await updateDocumentNonBlocking(sheetRef, {
            data: arrayUnion(newRow)
        });

        toast({
            title: "Row Added",
            description: "A new row has been added to the sheet.",
        });

        handleOpenChange(false);
    } catch (error: any) {
        if (error.code !== 'permission-denied') {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: error.message || "An unexpected error occurred.",
            });
        }
    } finally {
        setIsLoading(false);
    }
  }
  
  const handleScanResult = (header: string, result: string) => {
    form.setValue(header as any, result);
    toast({ title: "Captured", description: `Barcode recorded into "${header}".` });
  };

  const renderFormControl = (header: string, field: any) => {
    const config = sheet.columnConfig?.[header];
    const isBarcodeField = ['barcode', 'sku', 'serial', 'id', 'tag'].some(k => header.toLowerCase().includes(k));

    switch(config?.type) {
        case 'number':
            return <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="rounded-xl" />;
        case 'select':
            return (
                <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select an option" /></SelectTrigger>
                    <SelectContent>
                        {config.selectOptions?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                </Select>
            );
        case 'date':
             return (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal rounded-xl", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 apple-glass">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                </Popover>
            );
        case 'text':
        default:
            return (
                <div className="relative">
                    <Input {...field} className={cn("rounded-xl", isBarcodeField && "pr-10")} />
                    {isBarcodeField && (
                        <button 
                            type="button"
                            onClick={() => setIsScanning(header)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:scale-110 active:scale-95 transition-all"
                        >
                            <ScanLine className="h-5 w-5" />
                        </button>
                    )}
                </div>
            );
    }
  }

  return (
    <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-md apple-glass-darker border-none rounded-3xl">
            <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogDescription>
                Populate the metadata for this asset entry. Use the scan icon for barcodes.
            </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    {sheet.headers.map(header => (
                        <FormField
                            key={header}
                            control={form.control}
                            name={header}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>{header}</FormLabel>
                                <FormControl>{renderFormControl(header, field)}</FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    ))}
                    <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl interactive-element mt-6" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Record
                    </Button>
                </form>
            </Form>
        </DialogContent>
        </Dialog>

        {isScanning && (
            <BarcodeScanner 
                open={!!isScanning} 
                onOpenChange={(isOpen) => !isOpen && setIsScanning(null)}
                onScan={(res) => handleScanResult(isScanning, res)}
            />
        )}
    </>
  );
}
=======
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, CalendarIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { doc, arrayUnion } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Sheet } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { sanitizeInput, cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { format } from "date-fns";

interface AddRowDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: Sheet;
}

export function AddRowDialog({ children, open, onOpenChange, sheet }: AddRowDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const formSchema = useMemo(() => {
    const schemaShape: Record<string, z.ZodType<any, any>> = {};
    sheet.headers.forEach(header => {
        const config = sheet.columnConfig?.[header];
        switch (config?.type) {
            case 'number':
                let numSchema = z.coerce.number();
                if (config.min !== undefined && config.min !== null) {
                    numSchema = numSchema.min(config.min, `Value must be at least ${config.min}`);
                }
                if (config.max !== undefined && config.max !== null) {
                    numSchema = numSchema.max(config.max, `Value must be at most ${config.max}`);
                }
                schemaShape[header] = numSchema;
                break;
            case 'date':
                schemaShape[header] = z.date().optional();
                break;
            default:
                schemaShape[header] = z.string().optional();
        }
    });
    return z.object(schemaShape);
  }, [sheet.headers, sheet.columnConfig]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        form.reset();
    }
    onOpenChange(isOpen);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;
    
    setIsLoading(true);

    // Sanitize string inputs and format dates
    const newRow = Object.entries(values).reduce((acc, [key, value]) => {
        const config = sheet.columnConfig?.[key];
        if (config?.type === 'date' && value instanceof Date) {
            acc[key] = value.toISOString();
        } else if (typeof value === 'string') {
            acc[key] = sanitizeInput(value);
        } else {
            acc[key] = value;
        }
        return acc;
    }, {} as Record<string, any>);


    try {
        const sheetRef = doc(firestore, `workbooks/${sheet.workbookId}/sheets`, sheet.id);
        
        await updateDocumentNonBlocking(sheetRef, {
            data: arrayUnion(newRow)
        });

        toast({
            title: "Row Added",
            description: "A new row has been added to the sheet.",
        });

        handleOpenChange(false);
    } catch (error: any) {
        if (error.code !== 'permission-denied') {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: error.message || "An unexpected error occurred.",
            });
        }
    } finally {
        setIsLoading(false);
    }
  }
  
  const renderFormControl = (header: string, field: any) => {
    const config = sheet.columnConfig?.[header];

    switch(config?.type) {
        case 'number':
            return <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />;
        case 'select':
            return (
                <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
                    <SelectContent>
                        {config.selectOptions?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                </Select>
            );
        case 'date':
             return (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                </Popover>
            );
        case 'text':
        default:
            return <Input {...field} />;
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Row</DialogTitle>
          <DialogDescription>
            Fill out the details for the new entry.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                {sheet.headers.map(header => (
                     <FormField
                        key={header}
                        control={form.control}
                        name={header}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{header}</FormLabel>
                            <FormControl>{renderFormControl(header, field)}</FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                ))}
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Row
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
>>>>>>> e46f2e1ad97486affb300b626ff5055ece21f529
