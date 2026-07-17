
'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { PurchaseOrder, UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Search, PackageOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PurchaseOrderCard } from './PurchaseOrderCard';
import { useSystemConfig } from '@/hooks/useSystemConfig';

interface PurchaseOrdersTabProps {
    userProfile: UserProfile;
}

export function PurchaseOrdersTab({ userProfile }: PurchaseOrdersTabProps) {
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');
    const { config: systemConfig } = useSystemConfig(userProfile.orgId);

    const poQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'purchase_orders'),
            where('orgId', '==', userProfile.orgId),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, userProfile.orgId]);

    const { data: orders, isLoading } = useCollection<PurchaseOrder>(poQuery);

    const filteredOrders = orders?.filter(o => 
        o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.serialNo.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const currencySymbol = systemConfig?.currency_symbol || '$';

    return (
        <div className="space-y-6">
            <div className="relative w-full sm:max-w-xs mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Filter by PO#, Title, or Vendor..." 
                    className="pl-10 h-10 rounded-full bg-card/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                </div>
            ) : filteredOrders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredOrders.map(order => (
                        <PurchaseOrderCard key={order.id} order={order} currencySymbol={currencySymbol} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-3xl">
                    <PackageOpen className="h-12 w-12 mb-4 opacity-20" />
                    <p className="font-semibold">No Purchase Orders Found</p>
                    <p className="text-sm">Approved requisitions with assigned vendors will appear here.</p>
                </div>
            )}
        </div>
    );
}
