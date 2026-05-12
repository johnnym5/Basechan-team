<<<<<<< HEAD
'use client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Attendance, UserProfile } from '@/lib/types';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '../ui/skeleton';
import { Clock, Timer, Activity, MapPin, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useSystemConfig } from '@/hooks/useSystemConfig';

interface AttendanceReportProps {
    userProfile: UserProfile;
}

export function AttendanceReport({ userProfile }: AttendanceReportProps) {
    const firestore = useFirestore();
    const { config: systemConfig } = useSystemConfig(userProfile.orgId);

    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'attendance'),
            where('orgId', '==', userProfile.orgId),
            where('status', '==', 'APPROVED')
        )
    }, [firestore, userProfile.orgId]);

    const { data: attendanceRecords, isLoading } = useCollection<Attendance>(attendanceQuery);

    const reportData = useMemo(() => {
        if (!attendanceRecords) return [];

        const userTotals = attendanceRecords.reduce((acc, record) => {
            if (!acc[record.userName]) {
                acc[record.userName] = {
                    useTime: 0,
                    standbyTime: 0,
                    clockIns: [] as number[],
                };
            }
            acc[record.userName].useTime += (record.duration || 0);
            acc[record.userName].standbyTime += (record.idleTime || 0);
            
            const clockInDate = new Date(record.clockIn);
            const minutesSinceMidnight = clockInDate.getHours() * 60 + clockInDate.getMinutes();
            acc[record.userName].clockIns.push(minutesSinceMidnight);
            
            return acc;
        }, {} as Record<string, { useTime: number; standbyTime: number; clockIns: number[] }>);

        return Object.entries(userTotals).map(([userName, totals]) => {
            const avgClockInMinutes = totals.clockIns.reduce((a, b) => a + b, 0) / totals.clockIns.length;
            const hours = Math.floor(avgClockInMinutes / 60);
            const minutes = Math.round(avgClockInMinutes % 60);
            const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

            return {
                name: userName.split(' ')[0],
                fullName: userName,
                "Active (Use)": parseFloat((totals.useTime / 3600).toFixed(2)),
                "Standby (Idle)": parseFloat((totals.standbyTime / 3600).toFixed(2)),
                avgClockIn: formattedTime,
            };
        }).sort((a, b) => b["Active (Use)"] - a["Active (Use)"]);
    }, [attendanceRecords]);

    const locationStats = useMemo(() => {
        if (!attendanceRecords) return [];
        const office = attendanceRecords.filter(r => r.location === 'OFFICE').length;
        const remote = attendanceRecords.filter(r => r.location === 'REMOTE').length;
        
        return [
            { name: 'Office', value: office, color: 'hsl(var(--primary))' },
            { name: 'Remote', value: remote, color: '#334155' }
        ];
    }, [attendanceRecords]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="xl:col-span-2 border-white/5 bg-card/30">
                    <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                    <CardContent><Skeleton className="h-72 w-full" /></CardContent>
                </Card>
                <Card className="xl:col-span-1 border-white/5 bg-card/30">
                    <CardHeader><Skeleton className="h-8 w-full" /></CardHeader>
                    <CardContent><Skeleton className="h-72 w-full" /></CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2 flex flex-col border-white/5 bg-card/30 backdrop-blur-xl">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Activity className="h-5 w-5 text-emerald-500" />
                                Team Punctuality & Load
                            </CardTitle>
                            <CardDescription>Comparison of effective duty hours versus idle standby time.</CardDescription>
                        </div>
                        <Timer className="h-5 w-5 text-primary opacity-50" />
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-[350px] pt-6">
                    {reportData.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Clock className="h-10 w-10 opacity-20 mb-4" />
                            <p className="font-bold">No Data</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={reportData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} />
                                <YAxis axisLine={false} tickLine={false} unit="h" tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                                <Bar dataKey="Active (Use)" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} barSize={32} />
                                <Bar dataKey="Standby (Idle)" stackId="a" fill="#334155" radius={[6, 6, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            <Card className="xl:col-span-1 flex flex-col border-white/5 bg-card/30 backdrop-blur-xl">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Spatial Compliance
                    </CardTitle>
                    <CardDescription>Office vs. Remote distribution.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center justify-center">
                    <div className="h-64 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={locationStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {locationStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                     contentStyle={{ backgroundColor: 'hsl(var(--card))', border: 'none', borderRadius: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 w-full mt-6">
                        {locationStats.map(stat => (
                            <div key={stat.name} className="flex flex-col p-3 rounded-xl bg-background/50 border border-white/5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.name}</span>
                                <span className="text-2xl font-black font-headline">{stat.value}</span>
                            </div>
                        ))}
                    </div>

                    {systemConfig?.attendance_strict && (
                        <div className="mt-8 w-full p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <ShieldCheck className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Geofence Status</p>
                                <p className="text-xs font-bold text-foreground">STRICT MODE ACTIVE</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
=======

'use client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Attendance, UserProfile } from '@/lib/types';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Skeleton } from '../ui/skeleton';
import { Clock, Timer, Activity } from 'lucide-react';

interface AttendanceReportProps {
    userProfile: UserProfile;
}

export function AttendanceReport({ userProfile }: AttendanceReportProps) {
    const firestore = useFirestore();

    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'attendance'),
            where('orgId', '==', userProfile.orgId),
            where('status', '==', 'APPROVED')
        )
    }, [firestore, userProfile.orgId]);

    const { data: attendanceRecords, isLoading } = useCollection<Attendance>(attendanceQuery);

    const reportData = useMemo(() => {
        if (!attendanceRecords) return [];

        const userTotals = attendanceRecords.reduce((acc, record) => {
            if (!acc[record.userName]) {
                acc[record.userName] = {
                    useTime: 0,
                    standbyTime: 0,
                    clockIns: [] as number[],
                };
            }
            // duration is total seconds minus idleTime
            acc[record.userName].useTime += (record.duration || 0);
            acc[record.userName].standbyTime += (record.idleTime || 0);
            
            const clockInDate = new Date(record.clockIn);
            const minutesSinceMidnight = clockInDate.getHours() * 60 + clockInDate.getMinutes();
            acc[record.userName].clockIns.push(minutesSinceMidnight);
            
            return acc;
        }, {} as Record<string, { useTime: number; standbyTime: number; clockIns: number[] }>);

        return Object.entries(userTotals).map(([userName, totals]) => {
            const avgClockInMinutes = totals.clockIns.reduce((a, b) => a + b, 0) / totals.clockIns.length;
            const hours = Math.floor(avgClockInMinutes / 60);
            const minutes = Math.round(avgClockInMinutes % 60);
            const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

            return {
                name: userName.split(' ')[0],
                fullName: userName,
                "Active (Use)": parseFloat((totals.useTime / 3600).toFixed(2)),
                "Standby (Idle)": parseFloat((totals.standbyTime / 3600).toFixed(2)),
                avgClockIn: formattedTime,
            };
        }).sort((a, b) => b["Active (Use)"] - a["Active (Use)"]);
    }, [attendanceRecords]);

    if (isLoading) {
        return (
            <Card className="h-full border-white/5 bg-card/30 backdrop-blur-xl">
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-1/3 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-72 w-full mt-4" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col border-white/5 bg-card/30 backdrop-blur-xl">
            <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                             <Activity className="h-5 w-5 text-emerald-500" />
                             Team Punctuality & Load
                        </CardTitle>
                        <CardDescription>Comparison of effective duty hours versus idle standby time across the organization.</CardDescription>
                    </div>
                    <Timer className="h-5 w-5 text-primary opacity-50" />
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[350px] pt-6">
                {reportData.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <Clock className="h-10 w-10 opacity-20 mb-4" />
                        <p className="font-bold">No Attendance Data</p>
                        <p className="text-xs">Approved attendance records will appear here.</p>
                     </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                unit="h" 
                                tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}}
                            />
                            <Tooltip 
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                contentStyle={{ 
                                    backgroundColor: 'hsl(var(--card))', 
                                    borderColor: 'rgba(255,255,255,0.1)', 
                                    borderRadius: '12px',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                                }}
                                itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}
                                formatter={(value: number, name: string) => {
                                    return [`${value} Hours`, name];
                                }}
                                labelFormatter={(label, payload) => {
                                    const user = payload[0]?.payload;
                                    return (
                                        <div className="flex flex-col border-b border-white/5 pb-2 mb-2">
                                            <span className="text-xs">{user?.fullName}</span>
                                            <span className="text-[9px] font-bold text-primary flex items-center gap-1 mt-1">
                                                <Clock className="h-3 w-3" /> AVG LOGIN: {user?.avgClockIn}
                                            </span>
                                        </div>
                                    );
                                }}
                            />
                            <Legend 
                                verticalAlign="top" 
                                align="right" 
                                iconType="circle"
                                wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}
                            />
                            <Bar dataKey="Active (Use)" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} barSize={32} />
                            <Bar dataKey="Standby (Idle)" stackId="a" fill="#334155" radius={[6, 6, 0, 0]} barSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
>>>>>>> e46f2e1ad97486affb300b626ff5055ece21f529
