'use client';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarIcon } from "lucide-react";
import type { UserProfile, Permissions, TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { format } from "date-fns";
import { useAssignTaskForm } from "@/hooks/forms/useAssignTaskForm";

interface CreateTaskFormProps {
  onSuccess?: () => void;
  currentUserProfile: UserProfile;
  permissions: Permissions;
}

export function CreateTaskForm({ onSuccess, currentUserProfile, permissions }: CreateTaskFormProps) {
  const {
    form,
    onSubmit,
    isBusy,
    users,
    areUsersLoading,
    workbooks,
    areWorkbooksLoading,
    sheets,
    areSheetsLoading,
  } = useAssignTaskForm({
      open: true,
      onOpenChange: (open) => {
          if (!open && onSuccess) onSuccess();
      },
      initialData: null,
      currentUserProfile,
      permissions
  });

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Task Name</FormLabel>
                    <FormControl><Input placeholder="Brief title..." {...field} value={field.value ?? ""} className="h-10 rounded-xl" /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Task Description</FormLabel>
                    <FormControl><Textarea placeholder="Details and instructions..." {...field} value={field.value ?? ""} className="rounded-xl min-h-[60px]" /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />

             <div className="grid grid-cols-2 gap-4">
                {permissions.canManageStaff && (
                  <FormField control={form.control} name="assignedTo" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Assign To</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger disabled={areUsersLoading} className="h-10 rounded-xl"><SelectValue placeholder="Member" /></SelectTrigger></FormControl>
                            <SelectContent className="apple-glass-darker border-none">
                                <SelectItem value="NONE">Assign to Self</SelectItem>
                                {users
                                    ?.filter(user => user.id && user.id.trim() !== "")
                                    .map(user => (
                                        <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>
                                    ))
                                }
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                  )} />
                )}
                <FormField control={form.control} name="priority" render={({ field }) => (
                     <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Priority" /></SelectTrigger></FormControl>
                            <SelectContent className="apple-glass-darker border-none">
                                <SelectItem value="LEVEL_1">Low</SelectItem>
                                <SelectItem value="LEVEL_2">Medium</SelectItem>
                                <SelectItem value="LEVEL_3">High</SelectItem>
                            </SelectContent>
                        </Select>
                     <FormMessage />
                     </FormItem>
                )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Due Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("w-full h-10 pl-3 text-left font-normal rounded-xl", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "MMM d") : <span>Set Date</span>}
                                            <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 apple-glass border-none" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField control={form.control} name="estimatedHours" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Est. Hours</FormLabel>
                        <FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ""} className="h-10 rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20" disabled={isBusy}>
                {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {permissions.canManageStaff ? 'Create Task' : 'Save Task'}
            </Button>
        </form>
    </Form>
  );
}
