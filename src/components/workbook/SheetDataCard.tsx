'use client';

import type { Sheet } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMemo } from 'react';

interface SheetDataCardProps {
    rowData: Record<string, any>;
    rowIndex: number;
    headers: string[];
    sheet: Sheet;
    isSelected: boolean;
    onSelect: (rowIndex: number, checked: boolean) => void;
    onEdit: (rowIndex: number, data: Record<string, any>) => void;
    onDelete: (rowIndex: number) => void;
    onFieldChange: (rowIndex: number, field: string, value: any) => void;
    permissions: { canEdit: boolean };
}

// Heuristic to find a suitable title/identifier from the row data
const getCardTitles = (rowData: Record<string, any>, headers: string[]): { title: string; subtitle: string } => {
    let title: any = 'Untitled Row';
    let subtitle: any = `Row ${rowData.__originalIndex + 1}`;
    
    const lowerCaseHeaders = headers.map(h => h.toLowerCase());

    const titleKeywords = ['name', 'title', 'item', 'product', 'asset'];
    const subtitleKeywords = ['s/n', 'serial', 'id', 'code'];

    // Find title
    for (const keyword of titleKeywords) {
        const index = lowerCaseHeaders.findIndex(h => h.includes(keyword));
        if (index !== -1 && rowData[headers[index]] != null) {
            title = rowData[headers[index]];
            break;
        }
    }
    
    // Find subtitle
    for (const keyword of subtitleKeywords) {
        const index = lowerCaseHeaders.findIndex(h => h.includes(keyword));
        if (index !== -1 && rowData[headers[index]] != null) {
            subtitle = rowData[headers[index]];
            break;
        }
    }
    
    // Fallback if title is still default
    if (title === 'Untitled Row' && headers.length > 0 && rowData[headers[0]] != null) {
        title = rowData[headers[0]];
    }

    return { title: String(title), subtitle: String(subtitle) };
};


export function SheetDataCard({
    rowData,
    rowIndex,
    headers,
    sheet,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    onFieldChange,
    permissions
}: SheetDataCardProps) {

    const { title, subtitle } = getCardTitles(rowData, headers);
    
    const keyFields = useMemo(() => {
        const priorityKeywords = ['location', 'assignee', 'department'];
        const selectFields = Object.keys(sheet.columnConfig || {}).filter(h => sheet.columnConfig![h].type === 'select');
        
        return headers
            .filter(h => {
                const lowerH = h.toLowerCase();
                // Exclude title/subtitle fields and select fields which are rendered separately
                return !title.includes(String(rowData[h] ?? '')) && !subtitle.includes(String(rowData[h] ?? '')) && !selectFields.includes(h);
            })
            .sort((a, b) => {
                const aIsPrio = priorityKeywords.some(k => a.toLowerCase().includes(k));
                const bIsPrio = priorityKeywords.some(k => b.toLowerCase().includes(k));
                if (aIsPrio && !bIsPrio) return -1;
                if (!aIsPrio && bIsPrio) return 1;
                return 0;
            })
            .slice(0, 2); // Show max 2 key-value pairs

    }, [headers, rowData, title, subtitle, sheet.columnConfig]);
    
    const selectFields = useMemo(() => {
        return Object.keys(sheet.columnConfig || {}).filter(h => sheet.columnConfig![h].type === 'select');
    }, [sheet.columnConfig]);
    
    return (
        <Card 
            className="group bg-card/50 hover:bg-card/90 transition-all flex flex-col justify-between cursor-pointer"
            onClick={() => onEdit(rowIndex, rowData)}
        >
            <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                    {permissions.canEdit && (
                        <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={isSelected} onCheckedChange={(checked) => onSelect(rowIndex, !!checked)} />
                        </div>
                    )}
                    <div>
                        <p className="font-semibold text-foreground line-clamp-1">{title}</p>
                        <p className="text-sm text-muted-foreground">{subtitle}</p>
                    </div>
                </div>
                 {permissions.canEdit && (
                    <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-2 opacity-50 group-hover:opacity-100">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(rowIndex, rowData)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Edit Full Row</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDelete(rowIndex)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete Row</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {keyFields.map(header => (
                        <div key={header}>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">{header}</p>
                            <p className="font-semibold text-sm line-clamp-1">{rowData[header] || 'N/A'}</p>
                        </div>
                    ))}
                </div>
                 <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    {selectFields.map(header => {
                        const config = sheet.columnConfig![header];
                        return (
                        <div key={header}>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{header}</p>
                            <Select
                                value={rowData[header]}
                                onValueChange={(value) => onFieldChange(rowIndex, header, value)}
                                disabled={!permissions.canEdit}
                            >
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {config.selectOptions?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )})}
                 </div>
            </CardContent>
        </Card>
    );
}
