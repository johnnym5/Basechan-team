"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CalendarIcon, ShieldAlert } from "lucide-react";
import { useState, useMemo } from "react";
import { useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { LeaveRequest, LeaveType, UserProfile } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { sanitizeInput, cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { format, isSameDay, eachDayOfInterval, isWithinInterval } from "date-fns";
import { isHoliday } from "@/lib/holidays";

const formSchema = z.object({
  leaveType: z.enum(["ANNUAL", "SICK", "UNPAID", "MATERNITY", "PATERNITY"], { required_error: "Leave type is required."}),
  startDate: z.date({ required_error: "Start date is required."}),
  endDate: z.date({ required_error: "End date is required."}),
  reason: z.string().min(10, { message: "Reason must be at least 10 characters." }),
}).refine(data => data.endDate >= data.startDate, {
  message: "End date cannot be before start date.",
  path: ["endDate"],
});

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

  const approvedLeavesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(
        collection(firestore, 'leave_requests'),
        where('orgId', '==', userProfile.orgId),
        where('status', '==', 'APPROVED')
    );
  }, [firestore, userProfile]);

  const { data: approvedLeaves } = useCollection<LeaveRequest>(approvedLeavesQuery);

  const occupiedDates = useMemo(() => {
    const dates: Date[] = [];
    if (!approvedLeaves) return dates;
    approvedLeaves.forEach(req => {
        try {
            const interval = eachDayOfInterval({
                start: new Date(req.startDate),
                end: new Date(req.endDate)
            });
            dates.push(...interval);
        } catch (e) {}
    });
    return dates;
  }, [approvedLeaves]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const handleDialogClose = () => {
    form.reset();
    onOpenChange(false);
  }

  async function onSubmit(values: FormData) {
    if (!firestore || !userProfile) return;
    
    // Final check for overlap in case local state was out of sync
    const isRangeOccupied = occupiedDates.some(date => 
        isWithinInterval(date, { start: values.startDate, end: values.endDate })
    );

    if (isRangeOccupied) {
        toast({
            variant: "destructive",
            title: "Dates Occupied",
            description: "One or more dates in your selection are already occupied by another staff member."
        });
        return;
    }

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
          <DialogTitle>Request Exclusive Time Off</DialogTitle>
          <DialogDescription>
            Submit a leave request. Dates can only be occupied by one staff member at a time.
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

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Start Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => 
                                                date < new Date() || 
                                                isHoliday(date) || 
                                                occupiedDates.some(od => isSameDay(od, date))
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>End Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => 
                                                date < new Date() || 
                                                isHoliday(date) || 
                                                occupiedDates.some(od => isSameDay(od, date)) ||
                                                (form.getValues('startDate') && date < form.getValues('startDate'))
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-600 flex gap-2">
                    <ShieldAlert className="h-3 w-3 shrink-0 mt-0.5" />
                    <p>Occupied dates and public holidays are disabled for selection. Our policy requires unique leave assignments per day.</p>
                </div>

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
