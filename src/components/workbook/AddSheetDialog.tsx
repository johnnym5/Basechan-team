"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Sheet } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { sanitizeInput } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, { message: "Sheet name is required." }),
});

type FormData = z.infer<typeof formSchema>;

interface AddSheetDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workbookId: string;
}

export function AddSheetDialog({ children, open, onOpenChange, workbookId }: AddSheetDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(values: FormData) {
    if (!firestore) return;
    
    setIsLoading(true);
    const sanitizedName = sanitizeInput(values.name);

    try {
        const newSheet: Omit<Sheet, 'id'> = {
            workbookId,
            name: sanitizedName,
            data: [],
            headers: [],
            createdAt: new Date().toISOString(),
        }

        await addDocumentNonBlocking(collection(firestore, `workbooks/${workbookId}/sheets`), newSheet);

        toast({
            title: "Sheet Added",
            description: `Sheet "${sanitizedName}" has been added to the workbook.`,
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
          <DialogTitle>Add New Sheet</DialogTitle>
          <DialogDescription>
            Enter a name for the new sheet in your workbook.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Sheet Name</FormLabel>
                        <FormControl><Input placeholder="e.g., Q1 Budget" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Sheet
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
