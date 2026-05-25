'use client';
import { Button } from "@/components/ui/button";
import { ShieldAlert, PlusCircle, Banknote, Landmark, ReceiptText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequisitionTable } from "@/components/requisitions/RequisitionTable";
import { useState, useEffect, useMemo } from "react";
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import type { Requisition, UserProfile } from "@/lib/types";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { usePermissions, type Permissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { RequisitionDetailDialog } from "@/components/requisitions/RequisitionDetailDialog";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { NewRequisitionDialog } from "@/components/requisitions/NewRequisitionDialog";
import { VendorsTab } from "./VendorsTab";
import { PurchaseOrdersTab } from "./PurchaseOrdersTab";
import { Card, CardContent } from "../ui/card";
import { cn } from "@/lib/utils";


const getVisibleTabs = (permissions: Permissions, isStaff: boolean) => {
    const tabs = new Set<string>();

    if (isStaff) {
        tabs.add("My Requests");
    }

    if (permissions.canApproveHR || permissions.canApproveFinance || permissions.canApproveMD) {
        tabs.add("Inbox");
    }

    tabs.add("Purchase Orders");

    if (permissions.canManageStaff) { 
        tabs.add("All");
        tabs.add("Pending");
        tabs.add("Approved");
        tabs.add("Paid");
        tabs.add("Rejected");
        tabs.add("Vendors");
    } else { 
        tabs.add("Pending");
        tabs.add("Approved");
        tabs.add("Rejected");
    }
    
    const orderedTabs = ["My Requests", "Inbox", "Purchase Orders", "All", "Pending", "Approved", "Paid", "Rejected", "Vendors"];
    return orderedTabs.filter(tab => tabs.has(tab));
};


export function RequisitionsPageContent({ initialPayload }: { initialPayload?: { reqId?: string } }) {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const { isSuperAdmin } = useSuperAdmin();
  const [selectedRequest, setSelectedRequest] = useState<Requisition | null>(null);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => 
    firestore && authUser ? doc(firestore, "users", authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);
  const { config: systemConfig } = useSystemConfig(userProfile?.orgId);

  const allReqsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(collection(firestore, 'requisitions'), where('orgId', '==', userProfile.orgId));
  }, [firestore, userProfile]);
  const { data: allRequisitions } = useCollection<Requisition>(allReqsQuery);

  const fiscalStats = useMemo(() => {
    if (!allRequisitions) return { pending: 0, approved: 0 };
    return allRequisitions.reduce((acc, req) => {
        if (['PENDING_HR', 'PENDING_FINANCE', 'PENDING_MD'].includes(req.status)) {
            acc.pending += req.amount;
        } else if (req.status === 'APPROVED' || req.status === 'PAID') {
            acc.approved += req.amount;
        }
        return acc;
    }, { pending: 0, approved: 0 });
  }, [allRequisitions]);

  const reqIdToOpen = initialPayload?.reqId;
  const reqFromPayloadRef = useMemoFirebase(() => 
    firestore && reqIdToOpen ? doc(firestore, 'requisitions', reqIdToOpen) : null
  , [firestore, reqIdToOpen]);
  const { data: reqFromPayload } = useDoc<Requisition>(reqFromPayloadRef);

  useEffect(() => {
    if (reqFromPayload) {
      setSelectedRequest(reqFromPayload);
    }
  }, [reqFromPayload]);
  
  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedRequest(null);
    }
  }

  const isStaff = !permissions.canApproveHR && !permissions.canApproveFinance && !permissions.canApproveMD && !permissions.canManageStaff;
  const visibleTabs = getVisibleTabs(permissions, isStaff);
  
  const storageKey = 'requisitions-active-tab';
  const [activeTab, setActiveTab] = useState(() => {
      if (typeof window !== 'undefined') {
          const savedTab = localStorage.getItem(storageKey);
          if (savedTab && visibleTabs.includes(savedTab)) {
              return savedTab;
          }
      }
      return visibleTabs[0] || 'My Requests';
  });
  
  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
        setActiveTab(visibleTabs[0] || "My Requests");
    }
  }, [visibleTabs, activeTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, activeTab);
    }
  }, [activeTab]);


  if (!isProfileLoading && !permissions.canAccessRequisitions) {
    return (
         <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
            <p className="text-muted-foreground mt-2">The financial requisitions module is currently disabled for your account or organization.</p>
          </div>
    )
  }

  const currencySymbol = systemConfig?.currency_symbol || '$';

  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
       <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 flex-shrink-0">
            <div>
                <h1 className="text-3xl font-black font-headline tracking-tighter">Procurement Terminal</h1>
                <p className="text-muted-foreground uppercase tracking-widest text-[10px] font-bold">Manage financial requests and external vendors.</p>
            </div>
            <div className="flex items-center gap-3">
                 {permissions.canApproveHR && (
                     <div className="flex items-center gap-3 mr-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black uppercase tracking-widest text-amber-500">Pending Liability</span>
                            <span className="text-sm font-black font-mono">{currencySymbol}{fiscalStats.pending.toLocaleString()}</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Approved Impact</span>
                            <span className="text-sm font-black font-mono">{currencySymbol}{fiscalStats.approved.toLocaleString()}</span>
                        </div>
                     </div>
                 )}
                <Button onClick={() => setIsNewRequestOpen(true)} className="rounded-xl h-11 px-6 font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    New Request
                </Button>
            </div>
        </div>
      {isProfileLoading ? (
        <Skeleton className="flex-1 w-full" />
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="w-full pb-2 whitespace-nowrap flex-shrink-0">
                    <TabsList className="bg-secondary/20 rounded-2xl p-1">
                        {visibleTabs.map(tab => (
                            <TabsTrigger key={tab} value={tab} className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background">
                                {tab}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                
                <div className="flex-1 mt-4 overflow-hidden border border-white/5 rounded-3xl bg-background/20 backdrop-blur-sm">
                    <ScrollArea className="h-full p-6">
                        {visibleTabs.map(tab => (
                            <TabsContent key={tab} value={tab} className="m-0 focus-visible:ring-0 outline-none">
                                {tab === 'Vendors' ? (
                                    <VendorsTab userProfile={userProfile!} permissions={permissions} />
                                ) : tab === 'Purchase Orders' ? (
                                    <PurchaseOrdersTab userProfile={userProfile!} />
                                ) : (
                                    <RequisitionTable 
                                        filter={tab} 
                                        userProfile={userProfile} 
                                        isSuperAdmin={isSuperAdmin} 
                                        permissions={permissions} 
                                        onSelectRequest={setSelectedRequest}
                                    />
                                )}
                            </TabsContent>
                        ))}
                    </ScrollArea>
                </div>
            </Tabs>

          {selectedRequest && userProfile && (
                <RequisitionDetailDialog
                    requisition={selectedRequest}
                    isOpen={!!selectedRequest}
                    onOpenChange={handleDialogClose}
                    currentUserProfile={userProfile}
                    isSuperAdmin={isSuperAdmin}
                    permissions={permissions}
                    currencySymbol={currencySymbol}
                />
            )}
            
            <NewRequisitionDialog 
                open={isNewRequestOpen} 
                onOpenChange={setIsNewRequestOpen} 
                userProfile={userProfile} 
            />
        </div>
      )}
    </div>
  );
}