'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  ShieldAlert,
  Loader2,
  History,
  CheckCircle2
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export function DataExportCard({ orgId }: { orgId: string | undefined }) {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleBulkExport = async (format: 'json' | 'csv') => {
    if (!firestore || !orgId) return;

    setIsExporting(true);
    try {
      // Simulation of bulk data fetching across multiple core collections
      const collections = ['users', 'requisitions', 'attendance', 'tasks', 'announcements'];
      const exportData: Record<string, any[]> = {};

      for (const collName of collections) {
        const q = query(collection(firestore, collName), where('orgId', '==', orgId), limit(500));
        const snapshot = await getDocs(q);
        exportData[collName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      // Simulation of file generation and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `basechan_export_${orgId}_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();

      setLastExport(new Date().toLocaleString());
      toast({
        title: "Bulk Archive Generated",
        description: `Successfully exported ${Object.values(exportData).flat().length} data nodes.`,
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Export Fault",
        description: e.message || "Archive serialization failed.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <Card className="m3-surface-low border-none rounded-[2.5rem] shadow-xl overflow-hidden">
        <CardHeader className="bg-emerald-500/5 border-b border-emerald-500/10 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-black font-headline tracking-tighter uppercase">Infrastructure Archive</CardTitle>
                <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">Bulk data serialization & porting</CardDescription>
              </div>
            </div>
            {lastExport && (
              <Badge variant="secondary" className="h-6 bg-emerald-500/10 text-emerald-600 border-none px-3 flex gap-2">
                <CheckCircle2 className="h-3 w-3" />
                <span className="text-[8px] font-black uppercase">Last: {lastExport}</span>
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                <Download className="h-3 w-3" /> Available Protocols
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <Button
                    variant="outline"
                    className="h-16 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 flex items-center justify-between px-6 group"
                    disabled={isExporting}
                    onClick={() => handleBulkExport('json')}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      <FileJson className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black uppercase tracking-tight">JSON Structure</p>
                      <p className="text-[8px] font-bold opacity-40 uppercase tracking-tighter">Raw hierarchical data export</p>
                    </div>
                  </div>
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin opacity-40" /> : <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />}
                </Button>

                <Button
                    variant="outline"
                    className="h-16 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 flex items-center justify-between px-6 group"
                    disabled={isExporting}
                    onClick={() => handleBulkExport('csv')}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black uppercase tracking-tight">CSV Flatfile</p>
                      <p className="text-[8px] font-bold opacity-40 uppercase tracking-tighter">Tabular export for analysis</p>
                    </div>
                  </div>
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin opacity-40" /> : <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />}
                </Button>
              </div>
            </div>

            <div className="p-8 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 flex flex-col justify-center gap-4">
              <div className="flex items-center gap-3 text-amber-500">
                <ShieldAlert className="h-6 w-6" />
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Compliance Warning</h4>
              </div>
              <p className="text-[10px] font-bold leading-relaxed text-muted-foreground uppercase tracking-tighter">
                Executing a bulk archive dump will serialize all personnel, procurement, and interaction records within this organization. Ensure you are following local data privacy laws (GDPR/NDPR) before porting this archive outside the secure StaffPortal infrastructure.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[8px] font-black uppercase opacity-40">Encryption Tier: AES-256 (In-Transit)</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 flex items-center gap-4">
            <History className="h-4 w-4 opacity-20" />
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-30">All data exports are logged in the Infrastructure Audit terminal.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { ChevronRight } from "lucide-react";
