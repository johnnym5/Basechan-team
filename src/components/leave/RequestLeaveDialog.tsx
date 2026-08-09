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
import { format, isSameDay, eachDayOfInterval, isWithinInterval, addDays } from "date-fns";
import { isHoliday, calculateWorkingDays } from "@/lib/holidays";
import { usePermissions } from "@/hooks/usePermissions";
import { useOrganizationStaff } from "@/hooks/useStaff";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

const formSchema = z.object({
  targetUserId: z.string().optional(),
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
  const permissions = usePermissions(userProfile);
  const isAdmin = permissions.canManageStaff;

  const { data: staffList } = useOrganizationStaff(userProfile?.orgId || '');

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
    defaultValues: {
        targetUserId: userProfile?.id || '',
    }
  });

  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');

  const requestedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return calculateWorkingDays(startDate, endDate);
  }, [startDate, endDate]);

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
        const targetUser = isAdmin && values.targetUserId
            ? staffList?.find(s => s.id === values.targetUserId) || userProfile
            : userProfile;

        const newLeaveRequest: Omit<LeaveRequest, 'id'> = {
            orgId: userProfile.orgId,
            userId: targetUser.id,
            userName: targetUser.fullName,
            leaveType: values.leaveType,
            startDate: values.startDate.toISOString(),
            endDate: values.endDate.toISOString(),
            totalDays: requestedDays,
            reason: sanitizeInput(values.reason),
            status: 'PENDING',
            createdAt: new Date().toISOString(),
        };

        await addDocumentNonBlocking(collection(firestore, 'leave_requests'), newLeaveRequest);

        toast({ title: "Leave Request Submitted", description: isAdmin ? `Leave applied for ${targetUser.fullName}.` : "Your request has been sent for approval." });

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
      <DialogContent className="sm:max-w-md apple-glass-darker border-none animate-pop-in">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">Request Time Off</DialogTitle>
          <DialogDescription>
            {isAdmin ? "Apply for leave on behalf of a staff member." : "Dates can only be occupied by one staff member at a time to ensure operational coverage."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                 {isAdmin && (
                    <FormField
                        control={form.control}
                        name="targetUserId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Select Target Unit</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="rounded-xl h-12 bg-white/5 border-white/10">
                                        <SelectValue placeholder="Identify Personnel" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="apple-glass-darker border-none rounded-2xl">
                                    {staffList?.map(s => (
                                        <SelectItem key={s.id} value={s.id} className="p-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarFallback className="text-[8px]">{s.fullName.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-bold">{s.fullName}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                 )}

                 <FormField
                    control={form.control}
                    name="leaveType"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Leave Type</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select a type of leave" /></SelectTrigger></FormControl>
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
                                            <Button variant={"outline"} className={cn("rounded-xl pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 apple-glass" align="start">
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
                                            <Button variant={"outline"} className={cn("rounded-xl pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 apple-glass" align="start">
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

                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-600 flex gap-3">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="leading-relaxed">Occupied dates and public holidays are disabled. Our policy requires unique leave assignments to maintain service continuity.</p>
                        {requestedDays > 0 && (
                            <p className="font-black uppercase tracking-widest text-[11px]">
                                Calculated Duration: <span className="text-foreground">{requestedDays} Working Day{requestedDays !== 1 ? 's' : ''}</span>
                            </p>
                        )}
                    </div>
                </div>

                 <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Business Memo</FormLabel>
                        <FormControl><Textarea placeholder="Provide justification for your request..." className="rounded-xl min-h-[100px]" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full h-12 text-base rounded-xl font-bold interactive-element" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isAdmin ? "Authorize Leave Request" : "Confirm Request"}
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}