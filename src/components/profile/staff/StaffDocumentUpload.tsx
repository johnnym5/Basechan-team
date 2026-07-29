'use client';

import { useState } from 'react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { CloudUpload, FilePlus, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface StaffDocumentUploadProps {
  userId: string;
  orgId: string;
}

export function StaffDocumentUpload({ userId, orgId }: StaffDocumentUploadProps) {
  const { uploadFile, isUploading, uploadProgress } = useFileUpload();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore) return;

    setIsSuccess(false);

    try {
      const filePath = `organizations/${orgId}/staff_docs/${userId}/${Date.now()}_${file.name}`;
      const downloadUrl = await uploadFile(file, filePath);

      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        documents: arrayUnion({
          name: file.name,
          url: downloadUrl,
          type: file.type,
          uploadedAt: new Date().toISOString()
        })
      });

      setIsSuccess(true);
      toast({ title: 'Document Uploaded', description: `${file.name} has been archived.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message });
    }
  };

  return (
    <div className="bg-primary/5 border border-dashed border-primary/20 rounded-[2rem] p-8 text-center space-y-4 relative group hover:bg-primary/10 transition-all">
      <div className="flex flex-col items-center gap-3">
        <div className={cn(
          "p-4 rounded-3xl transition-all duration-500",
          isSuccess ? "bg-emerald-500/20 text-emerald-500" : "bg-primary/20 text-primary group-hover:scale-110"
        )}>
          {isUploading ? <Loader2 className="h-8 w-8 animate-spin" /> :
           isSuccess ? <CheckCircle2 className="h-8 w-8" /> :
           <CloudUpload className="h-8 w-8" />}
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-widest">{isSuccess ? 'Archive Updated' : 'Upload HR Document'}</h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">CV, Contract, or Identity Verification</p>
        </div>
      </div>

      <div className="max-w-xs mx-auto relative">
        <Input
          type="file"
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <Button variant="outline" className="w-full rounded-xl border-primary/20 font-black uppercase text-[9px] tracking-widest">
           {isUploading ? 'Transferring Node...' : 'Select Personnel File'}
        </Button>
      </div>

      {isUploading && (
        <div className="space-y-2 pt-4">
           <Progress value={uploadProgress} className="h-1.5" />
           <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">{Math.round(uploadProgress)}% COMPLETED</p>
        </div>
      )}
    </div>
  );
}
