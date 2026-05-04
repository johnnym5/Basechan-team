
'use client';
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartOfAccounts } from "./ChartOfAccounts";
import { JournalEntries } from "./JournalEntries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Accounting Module</h1>
        <p className="text-muted-foreground">Manage your organization's Chart of Accounts, ledgers, and financial statements.</p>
      </div>
      
      {userProfile && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-2 w-full max-w-md">
                <TabsTrigger value="coa">Chart of Accounts</TabsTrigger>
                <TabsTrigger value="journal">General Ledger</TabsTrigger>
            </TabsList>
            
            <TabsContent value="coa">
                <ChartOfAccounts userProfile={userProfile} permissions={permissions} />
            </TabsContent>
            
            <TabsContent value="journal">
                <JournalEntries userProfile={userProfile} permissions={permissions} />
            </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
