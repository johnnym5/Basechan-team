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
    <div className="flex flex-col h-full gap-8">
      {userProfile && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="bg-secondary/20 rounded-2xl p-1 w-fit border border-white/5 flex-shrink-0">
                <TabsTrigger value="coa" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">COA</TabsTrigger>
                <TabsTrigger value="journal" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">Journal</TabsTrigger>
                <TabsTrigger value="statements" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">Statements</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 min-h-0 mt-8">
                <TabsContent value="coa" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                    <ChartOfAccounts userProfile={userProfile} permissions={permissions} />
                </TabsContent>
                
                <TabsContent value="journal" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                    <JournalEntries userProfile={userProfile} permissions={permissions} />
                </TabsContent>

                <TabsContent value="statements" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                    <FinancialStatements userProfile={userProfile} />
                </TabsContent>
            </div>
        </Tabs>
      )}
    </div>
  );
}
