'use client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Attendance, UserProfile } from '@/lib/types';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Skeleton } from '../ui/skeleton';
import { Clock, Timer } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceReportProps {
    userProfile: UserProfile;
}

export function AttendanceReport({ userProfile }: AttendanceReportProps) {
    const firestore = useFirestore();

    const attendanceQuery = useMemoFirebase(() => {
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
                "Active (Use)": parseFloat((totals.useTime / 3600).toFixed(2)),
                "Standby (Idle)": parseFloat((totals.standbyTime / 3600).toFixed(2)),
                avgClockIn: formattedTime,
            };
        });
    }, [attendanceRecords]);

    if (isLoading) {
        return (
            <Card className="h-full">
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
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl">Team Productivity & Punctuality</CardTitle>
                        <CardDescription>Comparison of Active vs Standby hours and average login times.</CardDescription>
                    </div>
                    <Timer className="h-5 w-5 text-primary opacity-50" />
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} unit="h" />
                        <Tooltip 
                            cursor={{fill: 'hsl(var(--secondary))'}}
                            contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            formatter={(value: number, name: string, props: any) => {
                                if (name === 'Active (Use)' || name === 'Standby (Idle)') return [`${value}h`, name];
                                return [value, name];
                            }}
                            labelFormatter={(label, payload) => {
                                const user = payload[0]?.payload;
                                return (
                                    <div className="font-bold border-b pb-1 mb-1">
                                        <p>{label}</p>
                                        <p className="text-[10px] font-normal text-muted-foreground uppercase flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> Avg. Login: {user?.avgClockIn}
                                        </p>
                                    </div>
                                );
                            }}
                        />
                        <Legend verticalAlign="top" align="right" height={36}/>
                        <Bar dataKey="Active (Use)" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} barSize={40} />
                        <Bar dataKey="Standby (Idle)" stackId="a" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
