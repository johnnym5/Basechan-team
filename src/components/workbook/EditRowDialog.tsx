"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, CalendarIcon, CheckCircle2, XCircle } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import type { Sheet } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { sanitizeInput, cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManageHeadersDialog } from "./ManageHeadersDialog";

interface EditRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: Sheet;
  rowData: Record<string, any>;
  onSave: (updatedData: Record<string, any>) => void;
  canEdit: boolean;
}

const ChecklistItem = ({ label, isChecked }: { label: string, isChecked: boolean }) => (
    <div className="flex items-center justify-between text-sm">
        <span className="truncate" title={label}>{label}</span>
        {isChecked ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" /> : <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />}
    </div>
);

export function EditRowDialog({ open, onOpenChange, sheet, rowData, onSave, canEdit }: EditRowDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

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
                schemaShape[header] = z.any().optional(); // Accept string or date
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
  
  const watchedData = form.watch();

  const { requiredFields, importantFields } = useMemo(() => {
    const REQUIRED_KEYWORDS = ['category', 'description', 'serial', 'location', 'condition'];
    const IMPORTANT_KEYWORDS = ['id', 'lga', 'assignee', 'manufacturer', 'model', 'engine', 'chassis'];
    
    const req: string[] = [];
    const imp: string[] = [];
    
    if (sheet && sheet.headers) {
      sheet.headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (REQUIRED_KEYWORDS.some(keyword => lowerHeader.includes(keyword))) {
          req.push(header);
        } else if (IMPORTANT_KEYWORDS.some(keyword => lowerHeader.includes(keyword))) {
          imp.push(header);
        }
      });
    }

    return { requiredFields: req, importantFields: imp };
  }, [sheet]);


  useEffect(() => {
    if (rowData) {
        const initialValues: Record<string, any> = {};
        for(const header of sheet.headers) {
            const config = sheet.columnConfig?.[header];
            if (config?.type === 'date' && rowData[header]) {
                try {
                    initialValues[header] = new Date(rowData[header]);
                } catch(e) {
                    initialValues[header] = rowData[header];
                }
            } else {
                initialValues[header] = rowData[header] ?? '';
            }
        }
        form.reset(initialValues);
    }
  }, [rowData, sheet, form]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        form.reset();
    }
    onOpenChange(isOpen);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    const updatedRow = Object.entries(values).reduce((acc, [key, value]) => {
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

    onSave(updatedRow);
    setIsLoading(false);
    handleOpenChange(false);
  }

  const renderFormControl = (header: string, field: any) => {
    const config = sheet.columnConfig?.[header];
    switch(config?.type) {
        case 'number':
            return <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={!canEdit} />;
        case 'select':
            return (
                <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
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
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={!canEdit}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                </Popover>
            );
        case 'text':
        default:
            return <Input {...field} disabled={!canEdit} />;
    }
  }
  
  const visibleHeaders = sheet.headers.filter(h => !sheet.hiddenHeaders?.includes(h));

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>View Asset Details</DialogTitle>
          <DialogDescription>
            Viewing asset details.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid md:grid-cols-3 gap-6 py-4">
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
                        {visibleHeaders.map(header => (
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
                    </div>

                    <div className="md:col-span-1">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg">Sheet Header Checklist</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {requiredFields.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-2 text-sm">Required Fields</h4>
                                        <div className="space-y-2">
                                            {requiredFields.map(field => (
                                                <ChecklistItem 
                                                    key={field} 
                                                    label={field} 
                                                    isChecked={!!watchedData[field]}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {importantFields.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-2 text-sm">Important Fields</h4>
                                        <div className="space-y-2">
                                            {importantFields.map(field => (
                                                <ChecklistItem 
                                                    key={field} 
                                                    label={field} 
                                                    isChecked={!!watchedData[field]}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                 {requiredFields.length === 0 && importantFields.length === 0 && (
                                     <p className="text-sm text-muted-foreground text-center py-4">No specific checklist fields identified for this sheet.</p>
                                 )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
                 <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Close</Button>
                    {canEdit && (
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    )}
                </div>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
}
