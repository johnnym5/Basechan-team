'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CalendarCheck2, CalendarPlus, UserCircle } from "lucide-react";
import { useUser } from '@/firebase';

export default function StaffModuleLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();

    // Determine active tab based on path
    const getActiveTab = () => {
        if (pathname.includes('/attendance')) return 'attendance';
        if (pathname.includes('/leave')) return 'leave';
        if (pathname === '/staff') return 'directory';
        return 'profile';
    };

    const activeTab = getActiveTab();

    const handleTabChange = (value: string) => {
        if (value === 'directory') router.push('/staff');
        else if (value === 'attendance') router.push('/staff/attendance');
        else if (value === 'leave') router.push('/staff/leave');
        else if (value === 'profile') router.push(`/staff/${user?.uid}`);
    };

    return (
        <ModuleContainer
            title="Personnel Command"
            subtitle="Unified Staff Directory, Attendance, and Leave Management"
            noScroll={true}
        >
            <div className="flex flex-col h-full w-full gap-6">
                {/* Sub-Navigation */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="shrink-0">
                    <TabsList className="bg-secondary/20 rounded-2xl p-1 border border-white/5 w-fit">
                        <TabsTrigger value="directory" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-background transition-all">
                            <Users className="h-3.5 w-3.5" /> Directory
                        </TabsTrigger>
                        <TabsTrigger value="profile" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-background transition-all">
                            <UserCircle className="h-3.5 w-3.5" /> My Profile
                        </TabsTrigger>
                        <TabsTrigger value="attendance" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-background transition-all">
                            <CalendarCheck2 className="h-3.5 w-3.5" /> Attendance
                        </TabsTrigger>
                        <TabsTrigger value="leave" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-background transition-all">
                            <CalendarPlus className="h-3.5 w-3.5" /> Leave
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Content Area */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {children}
                </div>
            </div>
        </ModuleContainer>
    );
}
