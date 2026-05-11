'use client';

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import type { Account, UserProfile } from "@/lib/types";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Landmark, TrendingUp, PieChart, Calculator } from "lucide-react";

interface FinancialStatementsProps {
    userProfile: UserProfile;
}

export function FinancialStatements({ userProfile }: FinancialStatementsProps) {
    const firestore = useFirestore();
    const { config: systemConfig } = useSystemConfig(userProfile.orgId);
    const currencySymbol = systemConfig?.currency_symbol || '$';

    const accountsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'accounts'),
            where('orgId', '==', userProfile.orgId),
            where('isActive', '==', true),
            orderBy('code', 'asc')
        );
    }, [firestore, userProfile.orgId]);

    const { data: accounts, isLoading } = useCollection<Account>(accountsQuery);

    const statements = useMemo(() => {
        if (!accounts) return null;

        const balanceSheet = {
            assets: accounts.filter(a => a.type === 'ASSET'),
            liabilities: accounts.filter(a => a.type === 'LIABILITY'),
            equity: accounts.filter(a => a.type === 'EQUITY'),
        };

        const incomeStatement = {
            revenue: accounts.filter(a => a.type === 'REVENUE'),
            expenses: accounts.filter(a => a.type === 'EXPENSE'),
        };

        const totalAssets = balanceSheet.assets.reduce((sum, a) => sum + a.balance, 0);
        const totalLiabilities = balanceSheet.liabilities.reduce((sum, a) => sum + Math.abs(a.balance), 0);
        const totalEquity = balanceSheet.equity.reduce((sum, a) => sum + Math.abs(a.balance), 0);

        const totalRevenue = incomeStatement.revenue.reduce((sum, a) => sum + Math.abs(a.balance), 0);
        const totalExpenses = incomeStatement.expenses.reduce((sum, a) => sum + a.balance, 0);
        const netIncome = totalRevenue - totalExpenses;

        return {
            balanceSheet: { ...balanceSheet, totalAssets, totalLiabilities, totalEquity },
            incomeStatement: { ...incomeStatement, totalRevenue, totalExpenses, netIncome },
        };
    }, [accounts]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!statements) return null;

    return (
        <div className="space-y-8 animate-slide-up-fade">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Balance Sheet */}
                <Card className="apple-glass border-none shadow-xl">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Landmark className="h-5 w-5 text-primary" />
                                    Balance Sheet
                                </CardTitle>
                                <CardDescription>Consolidated Asset, Liability, and Equity snapshot.</CardDescription>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AS AT TODAY</span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="space-y-2">
                            <h4 className="text-xs font-black uppercase tracking-widest text-primary/80">Assets</h4>
                            <div className="space-y-1">
                                {statements.balanceSheet.assets.map(a => (
                                    <div key={a.id} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                                        <span className="text-muted-foreground">{a.name}</span>
                                        <span className="font-mono font-bold">{currencySymbol}{a.balance.toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between font-black pt-2 text-primary border-t-2 border-primary/20">
                                    <span>TOTAL ASSETS</span>
                                    <span className="font-mono">{currencySymbol}{statements.balanceSheet.totalAssets.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-xs font-black uppercase tracking-widest text-rose-500/80">Liabilities & Equity</h4>
                            <div className="space-y-1">
                                {[...statements.balanceSheet.liabilities, ...statements.balanceSheet.equity].map(a => (
                                    <div key={a.id} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                                        <span className="text-muted-foreground">{a.name}</span>
                                        <span className="font-mono font-bold">{currencySymbol}{Math.abs(a.balance).toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between font-black pt-2 text-rose-500 border-t-2 border-rose-500/20">
                                    <span>TOTAL LIABILITIES & EQUITY</span>
                                    <span className="font-mono">{currencySymbol}{(statements.balanceSheet.totalLiabilities + statements.balanceSheet.totalEquity).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Income Statement */}
                <Card className="apple-glass border-none shadow-xl">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                                    Income Statement
                                </CardTitle>
                                <CardDescription>Performance summary of Revenue and Expenses.</CardDescription>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">CURRENT CYCLE</span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                         <div className="space-y-2">
                            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500/80">Operating Revenue</h4>
                            <div className="space-y-1">
                                {statements.incomeStatement.revenue.map(a => (
                                    <div key={a.id} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                                        <span className="text-muted-foreground">{a.name}</span>
                                        <span className="font-mono font-bold text-emerald-400">{currencySymbol}{Math.abs(a.balance).toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between font-black pt-2 text-emerald-500 border-t-2 border-emerald-500/20">
                                    <span>TOTAL REVENUE</span>
                                    <span className="font-mono">{currencySymbol}{statements.incomeStatement.totalRevenue.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-xs font-black uppercase tracking-widest text-rose-500/80">Operating Expenses</h4>
                            <div className="space-y-1">
                                {statements.incomeStatement.expenses.map(a => (
                                    <div key={a.id} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                                        <span className="text-muted-foreground">{a.name}</span>
                                        <span className="font-mono font-bold text-rose-400">{currencySymbol}{a.balance.toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between font-black pt-2 text-rose-500 border-t-2 border-rose-500/20">
                                    <span>TOTAL EXPENSES</span>
                                    <span className="font-mono">{currencySymbol}{statements.incomeStatement.totalExpenses.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t-4 border-double border-white/10">
                             <div className={cn(
                                 "flex justify-between items-center p-4 rounded-2xl",
                                 statements.incomeStatement.netIncome >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"
                             )}>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-xl",
                                        statements.incomeStatement.netIncome >= 0 ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                                    )}>
                                        <Calculator className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Net Bottom Line</p>
                                        <p className="text-xl font-black font-headline">NET INCOME</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={cn(
                                        "text-3xl font-black font-mono tracking-tighter",
                                        statements.incomeStatement.netIncome >= 0 ? "text-emerald-500" : "text-rose-500"
                                    )}>
                                        {currencySymbol}{statements.incomeStatement.netIncome.toLocaleString()}
                                    </p>
                                </div>
                             </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
