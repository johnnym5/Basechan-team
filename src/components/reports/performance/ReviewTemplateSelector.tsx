"use client"

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { FileText, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReviewTemplate } from '@/lib/types';

interface ReviewTemplateSelectorProps {
  orgId: string;
  onTemplateSelected: (template: ReviewTemplate) => void;
}

export function ReviewTemplateSelector({ orgId, onTemplateSelected }: ReviewTemplateSelectorProps) {
  const firestore = useFirestore();
  const [templates, setTemplates] = useState<ReviewTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!firestore || !orgId) return;
      setIsLoading(true);
      try {
        const q = query(collection(firestore, 'review_templates'), where('orgId', '==', orgId));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReviewTemplate));
        setTemplates(fetched);
      } catch (e) {
        console.error("Failed to fetch templates:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplates();
  }, [firestore, orgId]);

  const handleValueChange = (id: string) => {
    const template = templates.find(t => t.id === id);
    if (template) onTemplateSelected(template);
  };

  return (
    <div className="bg-secondary/20 p-4 rounded-2xl border border-white/5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex-1 w-full">
        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center">
          <FileText className="w-3.5 h-3.5 mr-2 text-primary" /> Load Assessment Matrix
        </label>
        <Select onValueChange={handleValueChange}>
          <SelectTrigger className="w-full bg-black/20 border-white/10 rounded-xl h-12 text-xs font-bold uppercase tracking-tight">
            <SelectValue placeholder={isLoading ? "Syncing Templates..." : "Select Template / Blank Form"} />
          </SelectTrigger>
          <SelectContent className="apple-glass-darker border-none rounded-2xl">
            <SelectItem value="blank" className="font-bold text-xs uppercase p-3">-- Blank Review Form --</SelectItem>
            {templates.map(t => (
              <SelectItem key={t.id} value={t.id} className="font-bold text-xs uppercase p-3">
                {t.templateName} {t.department ? `(${t.department})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0 self-center mt-6 sm:mt-0" />}
    </div>
  );
}
