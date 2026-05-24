
'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { telemetryService } from '@/services/telemetry-service';
import { Button } from '@/components/ui/button';
import { Loader2, MonitorPlay, X, Wifi, ShieldAlert, SignalHigh } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LiveMonitorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    targetUserId: string;
    targetUserName: string;
}

export function LiveMonitorDialog({ open, onOpenChange, targetUserId, targetUserName }: LiveMonitorDialogProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    
    const [status, setStatus] = useState<'INITIALIZING' | 'SIGNALING' | 'CONNECTED' | 'DISCONNECTED' | 'FAILED'>('INITIALIZING');
    const [bitrate, setBitrate] = useState<string>('0');

    const initializeConnection = async () => {
        if (!firestore) return;
        setStatus('INITIALIZING');
        
        try {
            const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
            peerConnection.current = new RTCPeerConnection(configuration);

            peerConnection.current.onicecandidate = (event) => {
                if (event.candidate) {
                    telemetryService.sendIceCandidate(firestore, targetUserId, 'caller', event.candidate);
                }
            };

            peerConnection.current.ontrack = (event) => {
                if (videoRef.current) {
                    videoRef.current.srcObject = event.streams[0];
                    setStatus('CONNECTED');
                    toast({ title: "Signal Established", description: `Receiving live telemetry from ${targetUserName}.` });
                }
            };

            peerConnection.current.oniceconnectionstatechange = () => {
                if (peerConnection.current?.iceConnectionState === 'disconnected') {
                    setStatus('DISCONNECTED');
                }
            };

            // Listen for ICE Candidates from Callee
            const unsubscribeIce = telemetryService.onIceCandidate(firestore, targetUserId, 'callee', (candidate) => {
                peerConnection.current?.addIceCandidate(new RTCIceCandidate(candidate));
            });

            // Listen for Offer (Callee initiates offer in our flow for displayMedia permissions)
            const unsubscribeOffer = telemetryService.onSdp(firestore, targetUserId, 'offer', async (offer) => {
                if (status === 'INITIALIZING') setStatus('SIGNALING');
                await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peerConnection.current?.createAnswer();
                await peerConnection.current?.setLocalDescription(answer!);
                await telemetryService.sendSdp(firestore, targetUserId, answer!);
            });

            return () => {
                unsubscribeIce();
                unsubscribeOffer();
            };
        } catch (e: any) {
            setStatus('FAILED');
            toast({ variant: 'destructive', title: "Signal Failure", description: e.message });
        }
    };

    useEffect(() => {
        let cleanup: any;
        if (open) {
            initializeConnection().then(c => cleanup = c);
        } else {
            if (peerConnection.current) {
                peerConnection.current.close();
                peerConnection.current = null;
            }
        }
        return () => {
            if (cleanup) cleanup();
            if (peerConnection.current) peerConnection.current.close();
        };
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-4xl h-[85vh] apple-glass-darker border-none p-0 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-2.5 rounded-2xl",
                            status === 'CONNECTED' ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                        )}>
                            <MonitorPlay className={cn("h-6 w-6", status === 'SIGNALING' && "animate-pulse")} />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black font-headline tracking-tighter">Live Monitor: {targetUserName}</DialogTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={cn(
                                    "text-[8px] font-black uppercase tracking-widest px-2 py-0.5",
                                    status === 'CONNECTED' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" : 
                                    status === 'FAILED' ? "bg-rose-500/20 text-rose-400 border-rose-500/20" :
                                    "bg-amber-500/20 text-amber-400 border-amber-500/20 animate-pulse"
                                )}>
                                    {status}
                                </Badge>
                                {status === 'CONNECTED' && (
                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                        <Wifi className="h-2.5 w-2.5" /> Direct Link Secure
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-black/40 relative flex items-center justify-center min-h-0">
                    {status !== 'CONNECTED' && (
                        <div className="text-center space-y-4 z-10 p-12 max-w-md">
                            {status === 'FAILED' ? (
                                <>
                                    <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
                                    <p className="text-sm font-bold uppercase tracking-widest text-rose-400">Handshake Interrupted</p>
                                    <Button variant="outline" onClick={() => initializeConnection()} className="rounded-xl h-10">Retry Connection</Button>
                                </>
                            ) : (
                                <>
                                    <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
                                    <p className="text-sm font-bold uppercase tracking-widest text-primary">Awaiting Callee Authorization...</p>
                                    <p className="text-[10px] text-muted-foreground uppercase leading-relaxed">The target node must authorize the browser's screen capture request before the live feed can initialize.</p>
                                </>
                            )}
                        </div>
                    )}
                    
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className={cn("w-full h-full object-contain transition-opacity duration-1000", status === 'CONNECTED' ? "opacity-100" : "opacity-0")} 
                    />

                    {status === 'CONNECTED' && (
                        <div className="absolute top-4 right-4 flex items-center gap-3">
                            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white">Live Stream</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/5 bg-background/40 flex items-center justify-between flex-shrink-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">
                        Operational Telemetry Node: {targetUserId}
                    </p>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-9 text-[10px] font-black uppercase">
                        Terminate Feed
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
