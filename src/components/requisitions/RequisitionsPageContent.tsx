'use client';
import { Button } from "@/components/ui/button";
import { ShieldAlert, PlusCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequisitionTable } from "@/components/requisitions/RequisitionTable";
import { useState, useEffect } from "react";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
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
       <div className="flex items-center justify-between flex-shrink-0">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Procurement & Requisitions</h1>
                <p className="text-muted-foreground">Manage financial requests, purchase orders, and external vendors.</p>
            </div>
            <Button onClick={() => setIsNewRequestOpen(true)}>
                <PlusCircle className="mr-2"/>
                New Requisition
            </Button>
        </div>
      {isProfileLoading ? (
        <Skeleton className="flex-1 w-full" />
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="w-full pb-2 whitespace-nowrap flex-shrink-0">
                    <TabsList>
                        {visibleTabs.map(tab => <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>)}
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                
                <div className="flex-1 mt-4 overflow-hidden border rounded-xl bg-card/30">
                    <ScrollArea className="h-full p-4">
                        {visibleTabs.map(tab => (
                            <TabsContent key={tab} value={tab} className="m-0">
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
