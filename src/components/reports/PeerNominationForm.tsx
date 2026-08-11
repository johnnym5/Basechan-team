"use client";

import React, { useState } from "react";
import { useUser, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { UserProfile } from "@/lib/types";

const NOMINATION_CATEGORIES = [
  { id: "team_player", icon: "🤝", title: "Team Player", desc: "Consistently supports colleagues, collaborates well across teams, and puts shared success ahead of individual credit." },
  { id: "resourceful", icon: "🧭", title: "Resourceful Colleague", desc: "Finds practical solutions under pressure, adapts quickly, and gets things done with the resources at hand." },
  { id: "mentor", icon: "🌱", title: "Mentor", desc: "Invests time in developing others, shares knowledge generously, and helps colleagues grow in their roles." },
  { id: "innovator", icon: "💡", title: "Innovator", desc: "Brings fresh ideas, challenges the status quo constructively, and drives improvement in how we work." },
  { id: "culture", icon: "🙌", title: "Positive Attitude / Culture Champion", desc: "Brings energy and positivity to the team, lifts morale, and helps create an inclusive, enjoyable place to work." },
  { id: "above_beyond", icon: "🚀", title: "Above & Beyond", desc: "Goes the extra mile, takes ownership beyond their role, and delivers exceptional results." }
];

interface StaffMember {
    id: string;
    name: string;
}

interface PeerNominationFormProps {
    staffList: StaffMember[];
    onSubmit: (payload: any) => void;
}

export function PeerNominationForm({ staffList, onSubmit }: PeerNominationFormProps) {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() =>
    authUser ? doc(firestore!, "users", authUser.uid) : null,
    [firestore, authUser]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const currentUser = userProfile ? { id: userProfile.id, name: userProfile.fullName } : null;

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [nominations, setNominations] = useState<Record<string, { nomineeId: string, reason: string }>>({});
  const [additionalNotes, setAdditionalNotes] = useState("");

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const updateNomination = (categoryId: string, field: 'nomineeId' | 'reason', value: string) => {
    setNominations(prev => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], [field]: value }
    }));
  };

  const handleSubmit = () => {
    const payload = {
      nominatorId: currentUser?.id,
      nominatorName: currentUser?.name,
      date: new Date().toISOString(),
      nominations: selectedCategoryIds.map(id => ({
        categoryId: id,
        nomineeId: nominations[id]?.nomineeId || "",
        reason: nominations[id]?.reason || ""
      })),
      additionalNotes
    };
    onSubmit(payload);
  };

  return (
    <Card className="max-w-4xl mx-auto border-border bg-card shadow-lg">
      <CardHeader className="border-b border-border bg-secondary/10 pb-6">
        <CardTitle className="text-2xl text-primary font-black uppercase tracking-tighter">Team Recognition Awards</CardTitle>
        <CardDescription className="text-base mt-2 space-y-2">
          <p className="font-medium">Do you know a colleague who consistently goes above and beyond?</p>
          <p className="text-sm opacity-80 italic">Use this form to nominate them. Nominations are anonymous to nominees, but your identity is recorded for HR follow-up.</p>
        </CardDescription>

        {/* Auto-filled Identity Box */}
        <div className="flex flex-col md:flex-row gap-4 mt-4 pt-4 border-t border-border/50">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Your Name</label>
            <input disabled value={currentUser?.name || "Loading..."} className="w-full h-9 px-3 rounded-md bg-muted/50 text-muted-foreground border border-border cursor-not-allowed text-xs font-bold" />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Today's Date</label>
            <input disabled value={new Date().toLocaleDateString()} className="w-full h-9 px-3 rounded-md bg-muted/50 text-muted-foreground border border-border cursor-not-allowed text-xs font-bold" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-8">
        {/* CHECKBOX GRID */}
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px]">1</span>
            Select Nomination Categories
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/5 p-4 rounded-xl border border-border">
            {NOMINATION_CATEGORIES.map(cat => (
              <div key={cat.id} className="flex items-center space-x-3 bg-background p-3 rounded-lg border border-border hover:border-primary/30 transition-all group">
                <Checkbox
                  id={cat.id}
                  checked={selectedCategoryIds.includes(cat.id)}
                  onCheckedChange={() => toggleCategory(cat.id)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <label htmlFor={cat.id} className="text-xs font-bold uppercase tracking-tight cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 group-hover:text-primary transition-colors">
                  <span className="mr-2 text-base">{cat.icon}</span> {cat.title}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* DYNAMIC FORM SECTIONS */}
        {selectedCategoryIds.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px]">2</span>
                Provide Specific Details
            </h3>

            {selectedCategoryIds.map(categoryId => {
              const category = NOMINATION_CATEGORIES.find(c => c.id === categoryId);
              return (
                <div key={categoryId} className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="border-b border-primary/10 pb-3">
                    <h4 className="font-black text-primary text-xs uppercase tracking-widest flex items-center gap-2">
                      <span className="text-xl">{category?.icon}</span> {category?.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">{category?.desc}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-70">Nominee Name</label>
                      <select
                        value={nominations[categoryId]?.nomineeId || ""}
                        onChange={(e) => updateNomination(categoryId, 'nomineeId', e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      >
                        <option value="">-- Select Colleague --</option>
                        {staffList.map(staff => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-70">Why does this person deserve this recognition?</label>
                      <Textarea
                        value={nominations[categoryId]?.reason || ""}
                        onChange={(e) => updateNomination(categoryId, 'reason', e.target.value)}
                        className="w-full min-h-[100px] p-4 text-xs font-medium rounded-xl border border-input bg-background resize-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Please give a specific example of their impact..."
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FOOTER */}
        <div className="space-y-2 border-t border-border pt-6">
          <label className="text-[10px] font-black uppercase tracking-widest opacity-70">Anything else you'd like to add?</label>
          <Textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            className="w-full min-h-[80px] p-4 text-xs font-medium rounded-xl border border-input bg-background resize-none"
            placeholder="Optional comments for HR..."
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={selectedCategoryIds.length === 0}
          className="w-full py-6 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Nominations
        </Button>
        <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-4 opacity-50">Thank you for taking the time to recognize your colleagues!</p>
      </CardContent>
    </Card>
  );
}
