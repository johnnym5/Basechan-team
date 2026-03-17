"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { LeaveRequest, LeaveType, UserProfile } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { sanitizeInput } from "@/lib/utils";

const formSchema = z.object({
  leaveType: z.enum(["ANNUAL", "SICK", "UNPAID", "MATERNITY", "PATERNITY"], { required_error: "Leave type is required."}),
  startDate: z.date({ required_error: "Start date is required."}),
  endDate: z.date({ required_error: "End date is required."}),
  reason: z.string().min(10, { message: "Reason must be at least 10 characters." }),
}).refine(data => data.endDate >= data.startDate, {
  message: "End date cannot be before start date.",
  path: ["endDate"],
});

const DateDropdowns = ({ value, onChange }: { value?: Date, onChange: (date?: Date) => void }) => {
    const selectedDate = value;
    const day = selectedDate ? selectedDate.getDate() : undefined;
    const month = selectedDate ? selectedDate.getMonth() : undefined;
    const year = selectedDate ? selectedDate.getFullYear() : undefined;

    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);
    const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
    const daysInMonth = (year !== undefined && month !== undefined) ? new Date(year, month + 1, 0).getDate() : 31;
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handleDateChange = (part: 'day' | 'month' | 'year', valueStr: string) => {
        const value = parseInt(valueStr, 10);
        if (isNaN(value)) {
            onChange(undefined);
            return;
        }

        const d = selectedDate || new Date();
        const newYear = part === 'year' ? value : d.getFullYear();
        const newMonth = part === 'month' ? value : d.getMonth();
        let newDay = part === 'day' ? value : d.getDate();

        const daysInNewMonth = new Date(newYear, newMonth + 1, 0).getDate();
        if (newDay > daysInNewMonth) {
            newDay = daysInNewMonth;
        }

        onChange(new Date(newYear, newMonth, newDay));
    };

    return (
        <div className="grid grid-cols-3 gap-2">
            <Select value={day?.toString()} onValueChange={(val) => handleDateChange('day', val)}>
                <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                <SelectContent>{days.map(d => <SelectItem key={d} value={d.toString()}>{d}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={month?.toString()} onValueChange={(val) => handleDateChange('month', val)}>
                <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={year?.toString()} onValueChange={(val) => handleDateChange('year', val)}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>
        </div>
    );
};


type FormData = z.infer<typeof formSchema>;

const LEAVE_TYPES: LeaveType[] = ["ANNUAL", "SICK", "UNPAID", "MATERNITY", "PATERNITY"];

interface RequestLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null;
}

export function RequestLeaveDialog({ open, onOpenChange, userProfile }: RequestLeaveDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const handleDialogClose = () => {
    form.reset();
    onOpenChange(false);
  }

  async function onSubmit(values: FormData) {
    if (!firestore || !userProfile) return;
    setIsLoading(true);

    try {
        const newLeaveRequest: Omit<LeaveRequest, 'id'> = {
            orgId: userProfile.orgId,
            userId: userProfile.id,
            userName: userProfile.fullName,
            leaveType: values.leaveType,
            startDate: values.startDate.toISOString(),
            endDate: values.endDate.toISOString(),
            reason: sanitizeInput(values.reason),
            status: 'PENDING',
            createdAt: new Date().toISOString(),
        };

        await addDocumentNonBlocking(collection(firestore, 'leave_requests'), newLeaveRequest);

        toast({ title: "Leave Request Submitted", description: "Your request has been sent for approval." });

        handleDialogClose();
    } catch (error: any) {
        if (error.code !== 'permission-denied') {
            toast({ variant: "destructive", title: "Submission Failed", description: error.message });
        }
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
          <DialogDescription>
            Submit a leave request for HR approval.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                 <FormField
                    control={form.control}
                    name="leaveType"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Leave Type</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a type of leave" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {LEAVE_TYPES.map(type => <SelectItem key={type} value={type} className="capitalize">{type.toLowerCase()}</SelectItem>)}
                            </SelectContent>
                         </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                            <DateDropdowns value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                 )} />
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                     <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                            <DateDropdowns value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                 )} />
                 <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Reason</FormLabel>
                        <FormControl><Textarea placeholder="Provide a brief reason for your leave..." {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Request
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
