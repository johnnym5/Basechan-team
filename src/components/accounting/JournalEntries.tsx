'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "../ui/skeleton";
import type { JournalEntry, UserProfile } from "@/lib/types";
import type { Permissions } from "@/hooks/usePermissions";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { Button } from "../ui/button";
import { PlusCircle, CheckCircle2, Clock, Play } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "../ui/badge";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { NewJournalEntryDialog } from "./NewJournalEntryDialog";
import { accountingService } from "@/services/accounting-service";
import { useToast } from "@/hooks/use-toast";

interface JournalEntriesProps {
  userProfile: UserProfile;
  permissions: Permissions;
}

export function JournalEntries({ userProfile, permissions }: JournalEntriesProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { config: systemConfig } = useSystemConfig(userProfile.orgId);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isPosting, setIsPosting] = useState<string | null>(null);

  const journalQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(
      collection(firestore, 'journal_entries'),
      where('orgId', '==', userProfile.orgId),
      orderBy('date', 'desc'),
      limit(50)
    );
  }, [firestore, userProfile]);

  const { data: entries, isLoading } = useCollection<JournalEntry>(journalQuery);

  const currencySymbol = systemConfig?.currency_symbol || '$';

  const handlePostEntry = async (entry: JournalEntry) => {
    if (!firestore) return;
    setIsPosting(entry.id);
    try {
      await accountingService.postJournalEntry(firestore, entry);
      toast({ title: "Entry Posted", description: "Ledger updated successfully." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Posting Failed", description: e.message });
    } finally {
      setIsPosting(null);
    }
  };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>General Ledger</CardTitle>
            <CardDescription>Review and post financial journal entries.</CardDescription>
        </div>
        {permissions.canManageAccounting && (
            <Button onClick={() => setIsNewOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Entry
            </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell>
              </TableRow>
            ))}
            {!isLoading && entries?.length === 0 && (
              <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No journal entries found.
                  </TableCell>
              </TableRow>
            )}
            {!isLoading && entries?.map(entry => {
                const totalAmount = entry.lines.reduce((acc, line) => acc + line.debit, 0);
                return (
                    <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(entry.date), 'PP')}</TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground">{entry.reference}</TableCell>
                        <TableCell className="font-medium max-w-xs truncate">{entry.description}</TableCell>
                        <TableCell>
                            <Badge variant={entry.status === 'POSTED' ? 'default' : 'secondary'} className="gap-1 text-[10px]">
                                {entry.status === 'POSTED' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                {entry.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                            {currencySymbol}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                             {entry.status === 'DRAFT' && permissions.canManageAccounting && (
                                <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => handlePostEntry(entry)} disabled={isPosting === entry.id}>
                                    {isPosting === entry.id ? <Clock className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                                    POST
                                </Button>
                             )}
                        </TableCell>
                    </TableRow>
                )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <NewJournalEntryDialog 
        open={isNewOpen} 
        onOpenChange={setIsNewOpen} 
        userProfile={userProfile} 
    />
    </>
  );
}
