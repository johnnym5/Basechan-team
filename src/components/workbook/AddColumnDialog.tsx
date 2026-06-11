"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Sheet } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { sanitizeInput } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, { message: "Column name is required." }),
});

type FormData = z.infer<typeof formSchema>;

interface AddColumnDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: Sheet;
}

export function AddColumnDialog({ children, open, onOpenChange, sheet }: AddColumnDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(values: FormData) {
    if (!firestore) return;
    
    const sanitizedName = sanitizeInput(values.name);

    if (sheet.headers.includes(sanitizedName)) {
        form.setError("name", { type: "manual", message: "This column name already exists." });
        return;
    }

    setIsLoading(true);

    const newHeaders = [...sheet.headers, sanitizedName];
    const newColumnConfig = {
      ...(sheet.columnConfig || {}),
      [sanitizedName]: { type: 'text' }
    };
    const newData = sheet.data.map(row => ({
        ...row,
        [sanitizedName]: ""
    }));

    try {
        const sheetRef = doc(firestore, `workbooks/${sheet.workbookId}/sheets`, sheet.id);
        updateDocumentNonBlocking(sheetRef, {
            headers: newHeaders,
            data: newData,
            columnConfig: newColumnConfig,
        });

        toast({
            title: "Column Added",
            description: `Column "${sanitizedName}" has been added to the sheet.`,
        });

        form.reset();
        onOpenChange(false);
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

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        form.reset();
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Column</DialogTitle>
          <DialogDescription>
            Enter a name for the new column in your sheet.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Column Name</FormLabel>
                        <FormControl><Input placeholder="e.g., Customer Name" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Column
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
