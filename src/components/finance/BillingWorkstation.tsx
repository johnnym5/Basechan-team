
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Printer, Plus, Trash2, Loader2, FileSpreadsheet, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, SystemConfig } from "@/lib/types";
import { exportService } from "@/services/export-service";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface BillingWorkstationProps {
    userProfile: UserProfile;
    systemConfig: SystemConfig;
}

interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
}

export function BillingWorkstation({ userProfile, systemConfig }: BillingWorkstationProps) {
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState<'word' | 'excel' | null>(null);
    
    // Invoice State
    const [clientName, setClientName] = useState('');
    const [invoiceNo, setInvoiceNo] = useState(`INV-${Date.now().toString().slice(-6)}`);
    const [items, setItems] = useState<InvoiceItem[]>([
        { id: '1', description: 'Professional Services', quantity: 1, unitPrice: 0 }
    ]);

    const addItem = () => {
        setItems([...items, { id: Math.random().toString(), description: '', quantity: 1, unitPrice: 0 }]);
    };

    const removeItem = (id: string) => {
        if (items.length === 1) return;
        setItems(items.filter(i => i.id !== id));
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const handleExport = async (type: 'word' | 'excel') => {
        if (!clientName) {
            toast({ variant: 'destructive', title: "Identity Required", description: "Please provide a Client / Entity name for the document." });
            return;
        }

        setIsExporting(type);
        try {
            const documentData = {
                title: "TAX INVOICE",
                serialNo: invoiceNo,
                date: format(new Date(), 'PPP'),
                clientName,
                items,
                total,
                currency: systemConfig.currency_symbol || '$',
                config: systemConfig.document_template || {
                    header_text: "OPERATIONAL RECEIPT",
                    footer_text: "Thank you for your business. Terms apply.",
                    company_address: "Basechan International Headquarters",
                    terms_conditions: "Payment due within 30 days of issuance."
                }
            };

            if (type === 'excel') {
                exportService.toExcel(documentData);
            } else {
                exportService.toWord(documentData);
            }

            toast({ title: "Transmission Complete", description: `${type.toUpperCase()} file has been generated.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Export Failed", description: e.message });
        } finally {
            setIsExporting(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Editor Pane */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="apple-glass border-none shadow-xl">
                        <CardHeader className="bg-white/5 border-b border-white/5">
                            <CardTitle className="text-xl">Invoice Generator</CardTitle>
                            <CardDescription>Construct custom receipts and billing documents for export.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Client Identity</Label>
                                    <Input 
                                        placeholder="Enter customer or vendor name..." 
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        className="h-12 rounded-xl bg-background/50 border-white/5"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Document Ref #</Label>
                                    <Input 
                                        value={invoiceNo}
                                        onChange={(e) => setInvoiceNo(e.target.value)}
                                        className="h-12 rounded-xl bg-background/50 border-white/5 font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Line Items</Label>
                                    <Button variant="ghost" size="sm" onClick={addItem} className="h-8 rounded-lg text-primary bg-primary/10">
                                        <Plus className="h-3 w-3 mr-1" /> Add Line
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {items.map((item) => (
                                        <div key={item.id} className="grid grid-cols-12 gap-3 items-center animate-in slide-in-from-left-2 duration-300">
                                            <div className="col-span-6">
                                                <Input 
                                                    placeholder="Description..." 
                                                    value={item.description}
                                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                    className="h-11 rounded-xl bg-background/40"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <Input 
                                                    type="number"
                                                    placeholder="Qty"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                    className="h-11 rounded-xl bg-background/40 text-center"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <Input 
                                                    type="number"
                                                    placeholder="Price"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                    className="h-11 rounded-xl bg-background/40"
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => removeItem(item.id)}
                                                    className="h-11 w-full text-destructive hover:bg-destructive/10 rounded-xl"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-8 border-t border-white/5 flex flex-col items-end gap-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Aggregate</span>
                                <span className="text-4xl font-black font-headline tracking-tighter text-primary">
                                    {systemConfig.currency_symbol || '$'}{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions Pane */}
                <div className="lg:col-span-4 space-y-6">
                    <section className="apple-glass rounded-[2rem] p-6 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Download className="h-5 w-5" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest">Deploy Export</h3>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button 
                                onClick={() => handleExport('word')} 
                                disabled={!!isExporting}
                                className="h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-500/20"
                            >
                                {isExporting === 'word' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5 mr-3" />}
                                Export to Word (.docx)
                            </Button>
                            <Button 
                                onClick={() => handleExport('excel')} 
                                disabled={!!isExporting}
                                className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20"
                            >
                                {isExporting === 'excel' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5 mr-3" />}
                                Export to Excel (.xlsx)
                            </Button>
                        </div>
                    </section>

                    <section className="p-6 rounded-[2rem] bg-primary/5 border border-primary/20 space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <Settings2 className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Template Control</span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-muted-foreground uppercase font-bold">
                            Document headers, company branding, and legal terms are managed via the Management Console under 'System Config'.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
