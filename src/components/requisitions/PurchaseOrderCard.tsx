
'use client';

import React, { memo } from 'react';
import type { PurchaseOrder } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Store, Calendar, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PurchaseOrderCardProps {
    order: PurchaseOrder;
    currencySymbol: string;
}

const statusStyles: Record<PurchaseOrder['status'], string> = {
    DRAFT: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    SENT: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    DELIVERED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    CANCELLED: "bg-rose-500/20 text-rose-500 border-rose-500/30",
};

export const PurchaseOrderCard = memo(function PurchaseOrderCard({ order, currencySymbol }: PurchaseOrderCardProps) {
    return (
        <Card className="bg-card/50 backdrop-blur-xl hover:bg-card hover:shadow-lg transition-all border-primary/10">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono text-primary">{order.serialNo}</CardTitle>
                    <Badge variant="outline" className={cn("text-[10px] font-bold", statusStyles[order.status])}>
                        {order.status}
                    </Badge>
                </div>
                <p className="text-base font-semibold truncate mt-1">{order.title}</p>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Store className="h-3 w-3" />
                    <span className="truncate">{order.vendorName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(order.createdAt), 'PP')}</span>
                </div>
                <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Value</span>
                    <span className="text-lg font-bold font-headline">
                        {currencySymbol}{order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
});
