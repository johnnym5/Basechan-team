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

  const SYSTEM_TEMPLATES: ReviewTemplate[] = [
    {
      id: 'monthly_sync',
      orgId: 'SYSTEM',
      templateName: 'Standard Monthly Sync',
      department: 'General',
      businessTargets: [
        'Attendance & Punctuality Standard',
        'Task Velocity & Completion Rate',
        'Lead Conversion & Follow-up',
        'Quality Assurance / Error Rate',
        'Platform Compliance'
      ],
      interpersonalSkills: [
        'Team Collaboration & Support',
        'Adaptability & Crisis Management',
        'Initiative & Problem Solving',
        'Receptiveness to Feedback',
        'Peer Recognition'
      ],
      createdBy: 'SYSTEM',
      createdAt: new Date().toISOString()
    },
    {
      id: 'probationary',
      orgId: 'SYSTEM',
      templateName: 'New Hire Probationary Review (30/60/90 Days)',
      department: 'Onboarding',
      businessTargets: [
        'Learning Curve & Tool Adoption',
        'Onboarding Speed (SLA)',
        'Initial Error Rates',
        'Platform Compliance'
      ],
      interpersonalSkills: [
        'Cultural Fit & Values Alignment',
        'Receptiveness to Feedback',
        'Team Collaboration & Support'
      ],
      createdBy: 'SYSTEM',
      createdAt: new Date().toISOString()
    },
    {
      id: 'pip',
      orgId: 'SYSTEM',
      templateName: 'Performance Improvement Plan (PIP)',
      department: 'Remedial',
      businessTargets: [
        'Attendance & Punctuality Standard',
        'Required Turnaround Times (SLAs)',
        'Task Velocity & Completion Rate',
        'Quality Assurance / Error Rate'
      ],
      interpersonalSkills: [
        'Receptiveness to Feedback',
        'Initiative & Problem Solving',
        'Professional Integrity'
      ],
      createdBy: 'SYSTEM',
      createdAt: new Date().toISOString()
    },
    {
      id: 'leadership',
      orgId: 'SYSTEM',
      templateName: 'Leadership & Management Evaluation',
      department: 'Management',
      businessTargets: [
        'Team Output & Performance',
        'Strategic Planning Execution',
        'Task Velocity & Completion Rate',
        'Operational Bottleneck Handling'
      ],
      interpersonalSkills: [
        'Team Collaboration & Support',
        'Initiative & Problem Solving',
        'Adaptability & Crisis Management'
      ],
      createdBy: 'SYSTEM',
      createdAt: new Date().toISOString()
    },
    {
      id: 'post_project',
      orgId: 'SYSTEM',
      templateName: 'Post-Project / Peak Season Debrief',
      department: 'Operations',
      businessTargets: [
        'Task Velocity & Completion Rate',
        'Lead Conversion & Follow-up',
        'Quality Assurance / Error Rate'
      ],
      interpersonalSkills: [
        'Adaptability & Crisis Management',
        'Team Collaboration & Support',
        'Peer Recognition'
      ],
      createdBy: 'SYSTEM',
      createdAt: new Date().toISOString()
    }
  ];

  const handleValueChange = (id: string) => {
    if (id === 'blank') {
        onTemplateSelected({
            id: 'blank',
            orgId: '',
            templateName: 'Blank Form',
            businessTargets: [],
            interpersonalSkills: [],
            createdBy: '',
            createdAt: ''
        } as any);
        return;
    }

    const template = [...SYSTEM_TEMPLATES, ...templates].find(t => t.id === id);
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
          <SelectContent className="apple-glass-darker border-none rounded-2xl max-h-[400px]">
            <SelectItem value="blank" className="font-bold text-xs uppercase p-3">-- Blank Review Form --</SelectItem>

            <div className="px-3 py-2 text-[8px] font-black text-primary uppercase tracking-[0.2em] opacity-40">System Presets</div>
            {SYSTEM_TEMPLATES.map(t => (
              <SelectItem key={t.id} value={t.id} className="font-bold text-xs uppercase p-3">
                {t.templateName}
              </SelectItem>
            ))}

            <div className="px-3 py-2 text-[8px] font-black text-primary uppercase tracking-[0.2em] opacity-40 border-t border-white/5 mt-2">Custom Templates</div>
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
