'use client';
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, Query, DocumentData } from "firebase/firestore";
import type { Requisition, UserProfile } from "@/lib/types";
import type { Permissions } from "@/hooks/usePermissions";
import { Skeleton } from '../ui/skeleton';
import { Inbox, Search } from 'lucide-react';
import { RequisitionCard } from './RequisitionCard';
import { useMemo, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from "../ui/input";


interface RequisitionTableProps {
    filter: string;
    userProfile: UserProfile | null;
    isSuperAdmin: boolean;
    permissions: Permissions;
    onSelectRequest: (req: Requisition) => void;
}

const getQueryForFilter = (
    reqsRef: Query, 
    baseClauses: any[], 
    filter: string, 
    permissions: Permissions,
    userId: string
): Query => {
    let filterClauses: any[] = [];
    const pendingStatuses = ['PENDING_HR', 'PENDING_FINANCE', 'PENDING_MD'];

    switch (filter) {
        case "My Requests":
            filterClauses = [where('createdBy', '==', userId)];
            break;
        case "Inbox":
            const inboxStatuses: string[] = [];
            if (permissions.canApproveHR) inboxStatuses.push('PENDING_HR');
            if (permissions.canApproveFinance) inboxStatuses.push('PENDING_FINANCE', 'APPROVED');
            if (permissions.canApproveMD) inboxStatuses.push('PENDING_MD');
            if (inboxStatuses.length > 0) {
              filterClauses = [where('status', 'in', [...new Set(inboxStatuses)])];
            } else {
              filterClauses = [where('status', '==', 'NO_RESULTS')]; 
            }
            break;
        case "Pending":
            filterClauses = [where('status', 'in', pendingStatuses)];
            break;
        case "Approved":
            filterClauses = [where('status', '==', 'APPROVED')];
            break;
        case "Paid":
            filterClauses = [where('status', '==', 'PAID')];
            break;
        case "Rejected":
            filterClauses = [where('status', '==', 'REJECTED')];
            break;
        case "All":
        default:
            break;
    }
    
    return query(reqsRef, ...baseClauses, ...filterClauses, orderBy('createdAt', 'desc'));
};

export function RequisitionTable({ filter, userProfile, isSuperAdmin, permissions, onSelectRequest }: RequisitionTableProps) {
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');

    const requisitionsQuery = useMemoFirebase((): Query<DocumentData> | null => {
        if (!firestore || !userProfile) return null;
        
        const reqsRef = collection(firestore, 'requisitions');
        const baseClauses = isSuperAdmin ? [] : [where('orgId', '==', userProfile.orgId)];
        
        return getQueryForFilter(reqsRef, baseClauses, filter, permissions, userProfile.id);
    }, [firestore, filter, userProfile, isSuperAdmin, permissions]);

    const { data: rawRequisitions, isLoading } = useCollection<Requisition>(requisitionsQuery);

    const filteredRequisitions = useMemo(() => {
        if (!rawRequisitions) return [];
        if (!searchTerm) return rawRequisitions;
        return rawRequisitions.filter(req => 
            req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.serialNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.amount.toString().includes(searchTerm)
        );
    }, [rawRequisitions, searchTerm]);

    const groupedRequisitions = useMemo(() => {
        if (filter === 'My Requests') return null;

        return filteredRequisitions.reduce((acc, req) => {
            (acc[req.creatorName] = acc[req.creatorName] || []).push(req);
            return acc;
        }, {} as Record<string, Requisition[]>);
    }, [filteredRequisitions, filter]);


    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full bg-secondary/50" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="relative max-w-sm ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search requisitions..." 
                    className="pl-9 h-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredRequisitions.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center gap-4 text-center text-muted-foreground">
                    <div className='rounded-full border-8 border-secondary p-4'>
                        <Inbox className="h-12 w-12 text-secondary-foreground"/>
                    </div>
                    <div className='space-y-1'>
                        <p className="font-semibold text-lg text-foreground">No matches</p>
                        <p className="text-sm">Try a different filter or search term.</p>
                    </div>
                </div>
            ) : !groupedRequisitions ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRequisitions.map(req => (
                        <RequisitionCard key={req.id} requisition={req} onSelect={onSelectRequest} />
                    ))}
                </div>
            ) : (
                <Accordion type="multiple" className="w-full space-y-4" defaultValue={Object.keys(groupedRequisitions)}>
                    {Object.entries(groupedRequisitions).map(([creatorName, userRequisitions]) => (
                         <AccordionItem key={creatorName} value={creatorName} className="border-none bg-secondary/30 rounded-lg overflow-hidden">
                            <AccordionTrigger className="p-4 hover:no-underline hover:bg-secondary/50 transition-colors">
                                 <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9 border-2 border-background">
                                        <AvatarFallback>{creatorName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-semibold text-left">{creatorName}</h3>
                                        <p className="text-sm text-muted-foreground text-left">{userRequisitions.length} pending items</p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-0 p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {userRequisitions.map(req => (
                                        <RequisitionCard key={req.id} requisition={req} onSelect={onSelectRequest} />
                                    ))}
                                </div>
                            </AccordionContent>
                         </AccordionItem>
                    ))}
                </Accordion>
            )}
        </div>
    );
}
