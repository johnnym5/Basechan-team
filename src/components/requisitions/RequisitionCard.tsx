'use client';

import type { Requisition } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '@/lib/utils';
import { Banknote } from 'lucide-react';
import { RequisitionStatusBadge } from './RequisitionStatusBadge';
import { useSystemConfig } from '@/hooks/useSystemConfig';

interface RequisitionCardProps {
    requisition: Requisition;
    onSelect: (req: Requisition) => void;
}

export function RequisitionCard({ requisition, onSelect }: RequisitionCardProps) {
    const { config: systemConfig } = useSystemConfig(requisition.orgId);
    const currencySymbol = systemConfig?.currency_symbol || '$';

    return (
        <Card 
            className="bg-card/50 backdrop-blur-xl hover:bg-card hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
            onClick={() => onSelect(requisition)}
        >
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                     <CardTitle className="text-base font-semibold leading-none tracking-tight">{requisition.title}</CardTitle>
                     <RequisitionStatusBadge status={requisition.status} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-end">
                    <div>
                         <p className="text-sm font-mono text-muted-foreground">{requisition.serialNo}</p>
                         <p className="text-xs text-muted-foreground">By {requisition.creatorName}</p>
                    </div>
                    <p className="flex items-center text-lg font-bold font-headline text-primary">
                        <Banknote className="h-5 w-5 mr-2" />
                        {currencySymbol}{requisition.amount.toFixed(2)}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
