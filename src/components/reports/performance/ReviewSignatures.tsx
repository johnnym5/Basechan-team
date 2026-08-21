"use client"

import React, { useState } from 'react';
import { CheckSquare, Lock, ShieldCheck, User } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import type { UserProfile, PerformanceReview } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ReviewSignaturesProps {
  reviewId: string;
  signatures: PerformanceReview['signatures'];
  currentUser: UserProfile;
}

export function ReviewSignatures({ reviewId, signatures, currentUser }: ReviewSignaturesProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSigning, setIsSigning] = useState(false);

  const handleSignOff = async (type: 'manager' | 'employee') => {
    if (!firestore) return;
    if (!confirm("Authorize Digital Signature? This will lock your acknowledgment on this record.")) return;

    setIsSigning(true);
    try {
      const reviewRef = doc(firestore, 'performance_reviews', reviewId);
      await updateDoc(reviewRef, {
        [`signatures.${type}`]: {
          signedBy: currentUser.id,
          name: currentUser.fullName,
          signedAt: new Date().toISOString()
        }
      });
      toast({ title: "Signature Authorized", description: "Your digital consent has been recorded." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Signature Failed", description: error.message });
    } finally {
      setIsSigning(false);
    }
  };

  const renderSignBlock = (type: 'manager' | 'employee', title: string) => {
    const signature = signatures?.[type];

    // Logic:
    // Manager signs if role is not STAFF
    // Employee signs if they are the userId of the review
    const isAllowedToSign = type === 'manager'
        ? !['STAFF'].includes(currentUser.role)
        : currentUser.id === signatures?.[type]?.signedBy || true; // Needs actual context from parent

    return (
      <div className="flex-1 bg-secondary/10 border border-white/5 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            {type === 'manager' ? <ShieldCheck className="w-16 h-16" /> : <User className="w-16 h-16" />}
        </div>

        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{title}</h4>

        {signature?.signedAt ? (
          <div className="flex items-start gap-4 bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl animate-in zoom-in-95 duration-500">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500 shrink-0">
                <Lock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-emerald-400 uppercase tracking-tight">Digitally Authorized</p>
              <p className="text-xs font-bold text-white mt-1 uppercase tracking-tight truncate">{signature.name}</p>
              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                {format(new Date(signature.signedAt), 'PPP p')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center">
              <Button
                variant="outline"
                onClick={() => handleSignOff(type)}
                disabled={isSigning}
                className="w-full h-16 rounded-xl border-2 border-dashed border-white/10 hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary group/btn flex flex-col gap-1 items-center justify-center py-2"
              >
                <CheckSquare className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Sign to Acknowledge</span>
              </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
      <div className="flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white font-headline">Verification & Consent</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderSignBlock('manager', "Reviewer Authorization")}
        {renderSignBlock('employee', "Personnel Acknowledgment")}
      </div>
    </div>
  );
}
