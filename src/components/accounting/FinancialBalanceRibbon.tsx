"use client";

import React, { useMemo } from "react";
import { Landmark, TrendingUp, DollarSign, Wallet, ShieldCheck } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Account, UserProfile } from "@/lib/types";
import { useSystemConfig } from "@/hooks/useSystemConfig";

interface FinancialBalanceRibbonProps {
    userProfile: UserProfile;
}

export function FinancialBalanceRibbon({ userProfile }: FinancialBalanceRibbonProps) {
    const firestore = useFirestore();
    const { config: systemConfig } = useSystemConfig(userProfile.orgId);
    const currencySymbol = systemConfig?.currency_symbol || '$';

    const accountsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'accounts'),
            where('orgId', '==', userProfile.orgId),
            where('isActive', '==', true)
        );
    }, [firestore, userProfile.orgId]);

    const { data: accounts } = useCollection<Account>(accountsQuery);

    const totals = useMemo(() => {
        if (!accounts) return { assets: 0, liabilities: 0, equity: 0, netPosition: 0 };

        const assets = accounts.filter(a => a.type === 'ASSET').reduce((sum, a) => sum + a.balance, 0);
        const liabilities = accounts.filter(a => a.type === 'LIABILITY').reduce((sum, a) => sum + Math.abs(a.balance), 0);
        const equity = accounts.filter(a => a.type === 'EQUITY').reduce((sum, a) => sum + Math.abs(a.balance), 0);

        const revenue = accounts.filter(a => a.type === 'REVENUE').reduce((sum, a) => sum + Math.abs(a.balance), 0);
        const expenses = accounts.filter(a => a.type === 'EXPENSE').reduce((sum, a) => sum + a.balance, 0);
        const netPosition = revenue - expenses;

        return { assets, liabilities, equity, netPosition };
    }, [accounts]);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full mb-6">
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
                <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Total Assets</span>
                    <p className="text-xl md:text-2xl font-black font-mono tracking-tighter text-emerald-500 mt-1">
                        {currencySymbol}{totals.assets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                    <Landmark className="w-5 h-5" />
                </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
                <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Liabilities</span>
                    <p className="text-xl md:text-2xl font-black font-mono tracking-tighter text-rose-500 mt-1">
                        {currencySymbol}{totals.liabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
                    <Wallet className="w-5 h-5" />
                </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
                <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Total Equity</span>
                    <p className="text-xl md:text-2xl font-black font-mono tracking-tighter text-sky-500 mt-1">
                        {currencySymbol}{totals.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500 shrink-0">
                    <DollarSign className="w-5 h-5" />
                </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
                <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Net Operating Margin</span>
                    <p className="text-xl md:text-2xl font-black font-mono tracking-tighter text-primary mt-1">
                        {currencySymbol}{totals.netPosition.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                    <TrendingUp className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}
