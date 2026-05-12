'use client';

import type { Sheet } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, ListTodo, ArrowRight, BookCopy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SheetCardProps {
    sheet: Sheet;
    onSelect: (sheet: Sheet) => void;
    onRename: (sheet: Sheet) => void;
    onDelete: (sheet: Sheet) => void;
    onCreateTask: (sheet: Sheet) => void;
    canManage: boolean;
}

export function SheetCard({ sheet, onSelect, onRename, onDelete, onCreateTask, canManage }: SheetCardProps) {
    const recordCount = sheet.data?.length ?? 0;

    return (
        <Card className="group bg-card/50 hover:bg-card/90 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col justify-between">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-base font-semibold leading-tight line-clamp-1">{sheet.name}</CardTitle>
                 {canManage && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-2 opacity-50 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(sheet); }}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Rename</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateTask(sheet); }}>
                                <ListTodo className="mr-2 h-4 w-4" />
                                <span>Create Task</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(sheet); }} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </CardHeader>
            <CardContent className="py-2 flex-grow flex flex-col justify-center">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-4xl font-bold font-headline">{recordCount}</p>
                        <p className="text-xs text-muted-foreground tracking-widest">ASSET RECORDS</p>
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
                 <Button variant="outline" className="w-full" onClick={() => onSelect(sheet)}>
                    View Records <ArrowRight className="ml-2 h-4 w-4" />
                 </Button>
            </CardFooter>
        </Card>
    );
}
