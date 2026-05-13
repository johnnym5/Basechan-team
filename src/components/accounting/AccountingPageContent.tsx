'use client';
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartOfAccounts } from "./ChartOfAccounts";
import { JournalEntries } from "./JournalEntries";
import { FinancialStatements } from "./FinancialStatements";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { ScrollArea } from "../ui/scroll-area";

export function AccountingPageContent() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState("coa");

  const userProfileRef = useMemoFirebase(() => 
    firestore && authUser ? doc(firestore, "users", authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const permissions = usePermissions(userProfile);

  if (isProfileLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-8 flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Accounting Module</h1>
        <p className="text-muted-foreground">Manage your organization's Chart of Accounts, ledgers, and financial statements.</p>
      </div>
      
      {userProfile && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-3 w-full max-w-xl flex-shrink-0">
                <TabsTrigger value="coa">Chart of Accounts</TabsTrigger>
                <TabsTrigger value="journal">General Ledger</TabsTrigger>
                <TabsTrigger value="statements">Financial Statements</TabsTrigger>
            </TabsList>
            
            <ScrollArea className="flex-1 mt-6 rounded-md border bg-card/30">
                <TabsContent value="coa" className="m-0 p-4">
                    <ChartOfAccounts userProfile={userProfile} permissions={permissions} />
                </TabsContent>
                
                <TabsContent value="journal" className="m-0 p-4">
                    <JournalEntries userProfile={userProfile} permissions={permissions} />
                </TabsContent>

                <TabsContent value="statements" className="m-0 p-4">
                    <FinancialStatements userProfile={userProfile} />
                </TabsContent>
            </ScrollArea>
        </Tabs>
      )}
    </div>
  );
}