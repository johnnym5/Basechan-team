'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Loader2, Users, CheckCircle2, AlertCircle, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { batchUserService, type ProvisioningResult } from '@/services/batch-user-service';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const DEFAULT_EMAILS = `effiong.basechaninternational@gmail.com
cletus.basechaninternational@gmail.com
peter.basechaninternational@gmail.com
feridu.basechaninternational@gmail.com
ituaje.basechaninternational@gmail.com
collins@basechaninternational.com
izunyon.basechaninternational@gmail.com
nwaiwu.basechaninternational@gmail.com
ossaibasechaninternational@gmail.com`;

export function BatchUserImport() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [emails, setEmails] = useState(DEFAULT_EMAILS);
    const [password, setPassword] = useState('00000000');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<ProvisioningResult[]>([]);

    const handleProvisioning = async () => {
        if (!firestore) return;
        
        const emailList = emails.split('\n')
            .map(e => e.trim())
            .filter(e => e.includes('@'));

        if (emailList.length === 0) {
            toast({ variant: 'destructive', title: 'Invalid List', description: 'Please provide at least one valid email address.' });
            return;
        }

        setIsProcessing(true);
        setResults([]);
        setProgress(0);

        let completed = 0;
        const newResults: ProvisioningResult[] = [];

        for (const email of emailList) {
            const result = await batchUserService.provisionUser(firestore, email, password);
            newResults.push(result);
            setResults([...newResults]);
            completed++;
            setProgress((completed / emailList.length) * 100);
        }

        setIsProcessing(false);
        toast({ 
            title: 'Provisioning Complete', 
            description: `Processed ${emailList.length} staff accounts.` 
        });
    };

    return (
        <Card className="apple-glass border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Batch Staff Provisioning
                </CardTitle>
                <CardDescription>Create multiple staff accounts and profiles simultaneously.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Staff Email List (One per line)</Label>
                            <Textarea 
                                value={emails}
                                onChange={(e) => setEmails(e.target.value)}
                                placeholder="email@example.com"
                                className="h-48 rounded-xl bg-background/50 border-white/5 font-mono text-[11px]"
                                disabled={isProcessing}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Default Access Key</Label>
                            <Input 
                                type="text"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-10 rounded-xl bg-background/50 border-white/5"
                                disabled={isProcessing}
                            />
                        </div>
                        <Button 
                            onClick={handleProvisioning} 
                            disabled={isProcessing || !emails.trim()}
                            className="w-full h-12 rounded-xl font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20"
                        >
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                            Execute Batch Provisioning
                        </Button>
                    </div>

                    <div className="flex flex-col border border-white/5 rounded-2xl bg-secondary/5 overflow-hidden">
                        <div className="p-3 border-b border-white/5 bg-background/40 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Provisioning Log</span>
                            <span className="text-[10px] font-black text-primary">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1 rounded-none" />
                        <ScrollArea className="flex-1 h-[240px]">
                            <div className="p-3 space-y-2">
                                {results.length === 0 && !isProcessing && (
                                    <div className="py-20 text-center opacity-30">
                                        <p className="text-[9px] font-black uppercase tracking-widest">Awaiting execution...</p>
                                    </div>
                                )}
                                {results.map((res, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-background/30 border border-white/5 animate-in fade-in">
                                        <div className="truncate pr-4">
                                            <p className="text-[10px] font-bold truncate">{res.email}</p>
                                            {res.error && <p className="text-[8px] text-destructive font-medium">{res.error}</p>}
                                        </div>
                                        {res.status === 'SUCCESS' ? (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        ) : (
                                            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
