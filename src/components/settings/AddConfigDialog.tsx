"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, ShieldCheck, Loader2 } from "lucide-react"
import { useSystemConfigs, type ConfigDocId } from "@/hooks/useSystemConfigs"
import { useToast } from "@/hooks/use-toast"

interface AddConfigDialogProps {
  configId: ConfigDocId;
  label: string;
  orgId?: string;
}

export function AddConfigDialog({ configId, label, orgId }: AddConfigDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [emoji, setEmoji] = useState("⭐")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addItem } = useSystemConfigs(configId, orgId)
  const { toast } = useToast()

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      await addItem({
        name: name.trim(),
        description: description.trim(),
        emoji: configId === 'award_categories' ? emoji : undefined,
        isActive: true
      })
      toast({ title: "Configuration Deployed", description: `${label} has been added to system definitions.` })
      setName("")
      setDescription("")
      setEmoji("⭐")
      setOpen(false)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Deployment Failed", description: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 px-4 rounded-xl border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
          <Plus className="w-3.5 h-3.5 mr-2" /> Add {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="apple-glass-darker border-none rounded-[2rem] p-8 max-w-md shadow-3xl">
        <DialogHeader className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <Plus className="w-6 h-6" />
            </div>
            <div>
                <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase text-white">Deploy Definition</DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">Add new {label.toLowerCase()} to the system matrix.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleAdd} className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
                <Label className="text-[10px] font-black uppercase opacity-40 px-1">Identity Name</Label>
                <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-black/20 border-white/5 rounded-xl h-12 font-bold uppercase tracking-tight"
                placeholder={`e.g. ${label} Alpha`}
                required
                />
            </div>
            {configId === 'award_categories' && (
                <div className="w-20 space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-40 px-1 text-center block">Icon</Label>
                    <Input
                        value={emoji}
                        onChange={(e) => setEmoji(e.target.value)}
                        className="bg-black/20 border-white/5 rounded-xl h-12 text-center text-xl"
                    />
                </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase opacity-40 px-1">Description / Context</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-black/20 border-white/5 rounded-xl h-12 text-sm font-medium"
              placeholder="Provide tactical context for this entry..."
            />
          </div>

          <DialogFooter className="mt-8 flex gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest opacity-40 flex-1">Cancel</Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="h-12 px-8 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 flex-1"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Deploy Definition
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
