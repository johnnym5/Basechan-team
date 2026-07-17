"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Sheet } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { sanitizeInput } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, { message: "Sheet name is required." }),
});

type FormData = z.infer<typeof formSchema>;

interface RenameSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: Sheet;
}

export function RenameSheetDialog({ open, onOpenChange, sheet }: RenameSheetDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });
  
  useEffect(() => {
    form.reset({
        name: sheet.name,
    })
  }, [sheet, form])


  async function onSubmit(values: FormData) {
    if (!firestore) return;
    
    setIsLoading(true);
    const sanitizedName = sanitizeInput(values.name);

    try {
        const sheetRef = doc(firestore, `workbooks/${sheet.workbookId}/sheets`, sheet.id);
        updateDocumentNonBlocking(sheetRef, {
            name: sanitizedName
        });

        toast({
            title: "Sheet Renamed",
            description: `Sheet has been renamed to "${sanitizedName}".`,
        });
        
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename Sheet</DialogTitle>
          <DialogDescription>
            Enter a new name for the sheet "{sheet.name}".
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>New Sheet Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Rename Sheet
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
