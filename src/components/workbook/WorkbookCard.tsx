'use client';

import type { Workbook } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookCopy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface WorkbookCardProps {
    workbook: Workbook;
    sheetCount: number;
    recordCount: number;
    canManage: boolean;
    onSelect: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
}

export function WorkbookCard({
    workbook, 
    sheetCount,
    recordCount,
    canManage,
    onSelect,
    onContextMenu,
    onTouchStart,
    onTouchEnd
}: WorkbookCardProps) {

    return (
        <Card 
            className="group bg-card/50 hover:bg-card/90 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col justify-between cursor-pointer"
            onClick={onSelect}
            onContextMenu={canManage ? onContextMenu : undefined}
            onTouchStart={canManage ? onTouchStart : undefined}
            onTouchEnd={canManage ? onTouchEnd : undefined}
        >
            <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-base font-semibold leading-tight line-clamp-1">{workbook.title}</CardTitle>
            </CardHeader>
            <CardContent className="py-2 flex-grow flex flex-col justify-center">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-4xl font-bold font-headline">{recordCount}</p>
                        <p className="text-xs text-muted-foreground tracking-widest uppercase">{sheetCount} Sheet(s)</p>
                    </div>
                     <BookCopy className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>VERIFICATION</span>
                        <span>0 / {recordCount}</span>
                    </div>
                    <Progress value={0} className="h-1" />
                </div>
            </CardContent>
            <CardFooter>
                 <Button variant="outline" className="w-full">
                    View Workbook <ArrowRight className="ml-2 h-4 w-4" />
                 </Button>
            </CardFooter>
        </Card>
    );
}
