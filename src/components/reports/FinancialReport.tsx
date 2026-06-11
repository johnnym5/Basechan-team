'use client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Requisition, UserProfile } from '@/lib/types';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { Skeleton } from '../ui/skeleton';

interface FinancialReportProps {
    userProfile: UserProfile;
}

export function FinancialReport({ userProfile }: FinancialReportProps) {
    const firestore = useFirestore();
    const { config: systemConfig } = useSystemConfig(userProfile.orgId);

    const requisitionsQuery = useMemoFirebase(() => {
        return query(
            collection(firestore, 'requisitions'),
            where('orgId', '==', userProfile.orgId),
            where('status', 'in', ['APPROVED', 'PAID'])
        )
    }, [firestore, userProfile.orgId]);

    const { data: requisitions, isLoading } = useCollection<Requisition>(requisitionsQuery);

    const monthlyData = useMemo(() => {
        if (!requisitions) return [];

        const monthlyTotals = requisitions.reduce((acc, req) => {
            const month = format(new Date(req.createdAt), 'MMM yyyy');
            acc[month] = (acc[month] || 0) + req.amount;
            return acc;
        }, {} as Record<string, number>);

        const sortedMonths = Object.keys(monthlyTotals).sort((a, b) => {
            const dateA = new Date(a);
            const dateB = new Date(b);
            return dateA.getTime() - dateB.getTime();
        }).slice(-12); // Last 12 months

        return sortedMonths.map(month => ({
            month: month.split(' ')[0], // 'Jan', 'Feb' etc
            total: monthlyTotals[month]
        }));
    }, [requisitions]);

    const currencySymbol = systemConfig?.currency_symbol || '$';

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-72 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
                <CardDescription>Monthly expenditure on approved and paid requisitions over the last 12 months.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" tickLine={false} axisLine={false} />
                            <YAxis 
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${currencySymbol}${value}`}
                            />
                            <Tooltip 
                                cursor={{fill: 'hsl(var(--secondary))'}}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    borderColor: 'hsl(var(--border))',
                                }}
                                formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Total']}
                            />
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
