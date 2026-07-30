
'use client';

import { useState, useEffect } from 'react';
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { usePermissions } from "@/hooks/usePermissions";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequisitionsPageContent } from "@/components/requisitions/RequisitionsPageContent";
import { AccountingPageContent } from "@/components/accounting/AccountingPageContent";
import { BillingWorkstation } from "./BillingWorkstation";
import { ScrollArea } from "../ui/scroll-area";
import { Landmark, ReceiptText, FileSpreadsheet, BarChart3, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinanceHubProps {
    initialPayload?: { reqId?: string; tab?: string };
}

import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";

export function FinanceHub({ initialPayload }: FinanceHubProps) {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const [activeTab, setActiveTab] = useState(initialPayload?.tab || "procurement");

    const userProfileRef = useMemoFirebase(() => 
        firestore && authUser ? doc(firestore, "users", authUser.uid) : null
    , [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const { config: systemConfig } = useSystemConfig(userProfile?.orgId);
    const permissions = usePermissions(userProfile);

    useEffect(() => {
        if (initialPayload?.tab) {
            setActiveTab(initialPayload.tab);
        }
    }, [initialPayload]);

    if (isProfileLoading) {
        return <div className="p-8 space-y-6"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-full w-full rounded-[2rem]" /></div>;
    }

    return (
        <ModuleContainer
            title="Finance Command"
            subtitle="Integrated Fiscal Operations & Ledger Control"
            noScroll={true}
            actions={
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <Landmark className="h-5 w-5" />
                </div>
            }
        >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 h-full">
                <div className="flex-shrink-0 mb-8">
                    <TabsList className="bg-secondary/20 rounded-2xl p-1 w-fit border border-white/5">
                        <TabsTrigger value="procurement" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">
                            <ReceiptText className="h-3.5 w-3.5 mr-2" /> Procurement
                        </TabsTrigger>
                        {permissions.canManageAccounting && (
                            <TabsTrigger value="ledger" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">
                                <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> General Ledger
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="billing" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">
                            <BarChart3 className="h-3.5 w-3.5 mr-2" /> Billing & Invoices
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    <TabsContent value="procurement" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500 h-full">
                        <RequisitionsPageContent initialPayload={initialPayload?.reqId ? { reqId: initialPayload.reqId } : undefined} />
                    </TabsContent>

                    {permissions.canManageAccounting && (
                        <TabsContent value="ledger" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500 h-full">
                            <AccountingPageContent />
                        </TabsContent>
                    )}

                    <TabsContent value="billing" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500 h-full">
                        <BillingWorkstation userProfile={userProfile!} systemConfig={systemConfig!} />
                    </TabsContent>
                </div>
            </Tabs>
        </ModuleContainer>
    );
}
