"use client"

import React, { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { PerformanceReview, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    FileText,
    Clock,
    ShieldCheck,
    ChevronRight,
    ArrowRight,
    Search,
    Filter,
    Target,
    Users
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ReviewSignatures } from './ReviewSignatures';

interface PerformanceReviewListProps {
    userProfile: UserProfile;
    isAdmin: boolean;
}

export function PerformanceReviewList({ userProfile, isAdmin }: PerformanceReviewListProps) {
  const firestore = useFirestore();
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);

  // 1. Fetch Reviews
  // Admins see all for organization, Staff only see their own
  const reviewsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const base = collection(firestore, 'performance_reviews');
    if (isAdmin) {
        return query(base, where('orgId', '==', userProfile.orgId), orderBy('createdAt', 'desc'));
    }
    return query(base, where('orgId', '==', userProfile.orgId), where('userId', '==', userProfile.id), orderBy('createdAt', 'desc'));
  }, [firestore, userProfile, isAdmin]);

  const { data: reviews, isLoading } = useCollection<PerformanceReview>(reviewsQuery);

  return (
    <div className="space-y-6">

      {/* 1. FILTER HEADER */}
      <div className="flex items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <FileText className="w-4 h-4" />
              </div>
              <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-white">Review Archives</h3>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Verified performance records</p>
              </div>
          </div>
      </div>

      {/* 2. LIST FEED */}
      <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="bg-white/5 border-white/5 h-24 animate-pulse rounded-2xl" />
              ))
          ) : reviews?.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-[2.5rem] opacity-20">
                  <FileText className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No performance reviews archived.</p>
              </div>
          ) : (
              reviews?.map(review => (
                  <div
                    key={review.id}
                    onClick={() => setSelectedReview(review)}
                    className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/30 transition-all cursor-pointer group flex items-center justify-between"
                  >
                      <div className="flex items-center gap-5">
                          <div className="h-12 w-12 rounded-xl bg-secondary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                              <ShieldCheck className="w-6 h-6" />
                          </div>
                          <div>
                              <p className="text-sm font-black text-white uppercase tracking-tight">{review.userName}</p>
                              <div className="flex items-center gap-3 mt-1">
                                  <Badge variant="outline" className="text-[7px] font-black uppercase border-none bg-primary/20 text-primary">{review.cycle}</Badge>
                                  <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-40 flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" /> {format(new Date(review.createdAt), 'MMM dd, yyyy')}
                                  </span>
                              </div>
                          </div>
                      </div>

                      <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end">
                              <span className={cn(
                                  "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                  review.signatures.employee && review.signatures.manager ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                              )}>
                                  {review.signatures.employee && review.signatures.manager ? "Fully Authorized" : "Pending Sign-off"}
                              </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* 3. DETAIL VIEWER DIALOG */}
      {selectedReview && (
          <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto apple-glass-darker border-none rounded-[2.5rem] p-0 custom-scrollbar shadow-3xl">
                  <DialogHeader className="p-8 border-b border-white/5 bg-white/5">
                      <div className="flex justify-between items-start">
                          <div>
                              <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase text-white">
                                  {selectedReview.cycle} Performance Review
                              </DialogTitle>
                              <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">
                                  Personnel: {selectedReview.userName} • Reviewer: {selectedReview.reviewerName}
                              </DialogDescription>
                          </div>
                          <Badge className="bg-primary/20 text-primary border-none font-black text-xs px-4 py-1 rounded-full uppercase tracking-widest">
                            {format(new Date(selectedReview.createdAt), 'MMM yyyy')}
                          </Badge>
                      </div>
                  </DialogHeader>

                  <div className="p-8 space-y-8 pb-20">

                      {/* QUANTITATIVE SECTION */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                  <Target className="w-4 h-4" /> Operational Targets
                              </h4>
                              <div className="space-y-2">
                                  {selectedReview.businessTargets.map((t, i) => (
                                      <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                                          <span className="text-xs font-bold text-slate-300 uppercase tracking-tight">{t.metricName}</span>
                                          <div className="flex gap-1">
                                              {[1, 2, 3, 4].map(s => (
                                                  <div key={s} className={cn(
                                                      "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black border",
                                                      t.score === s ? "bg-primary border-primary text-white" : "bg-black/20 border-white/5 opacity-20"
                                                  )}>
                                                      {s}
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          <div className="space-y-4">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                  <Users className="w-4 h-4" /> Professional Integrity
                              </h4>
                              <div className="space-y-2">
                                  {selectedReview.interpersonalSkills.map((s, i) => (
                                      <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                                          <span className="text-xs font-bold text-slate-300 uppercase tracking-tight">{s.skillName}</span>
                                          <div className="flex gap-1">
                                              {[1, 2, 3, 4].map(score => (
                                                  <div key={score} className={cn(
                                                      "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black border",
                                                      s.score === score ? "bg-emerald-500 border-emerald-500 text-white" : "bg-black/20 border-white/5 opacity-20"
                                                  )}>
                                                      {score}
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>

                      {/* QUALITATIVE SECTION */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                          <div className="space-y-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-primary/60">Success Areas</p>
                              <div className="p-6 rounded-2xl bg-black/30 border border-white/5 text-sm italic opacity-90 leading-relaxed">
                                  "{selectedReview.qualitative.successAreas}"
                              </div>
                          </div>
                          <div className="space-y-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-rose-500/60">Areas for Improvement</p>
                              <div className="p-6 rounded-2xl bg-black/30 border border-white/5 text-sm opacity-90 leading-relaxed">
                                  "{selectedReview.qualitative.areasForImprovement}"
                              </div>
                          </div>
                          <div className="md:col-span-2 space-y-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60">Agreed Action Plan</p>
                              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 text-sm font-bold leading-relaxed">
                                  {selectedReview.qualitative.agreedActionPlan}
                              </div>
                          </div>
                      </div>

                      {/* SIGNATURES BLOCK */}
                      <ReviewSignatures
                        reviewId={selectedReview.id}
                        signatures={selectedReview.signatures}
                        currentUser={userProfile}
                      />

                  </div>
              </DialogContent>
          </Dialog>
      )}
    </div>
  );
}
