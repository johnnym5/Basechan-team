'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { telemetryService } from '@/services/telemetry-service';
import { Button } from '@/components/ui/button';
import { Loader2, MonitorPlay, X, Wifi, ShieldAlert, SignalHigh, Play, Pause, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
    const [isPaused, setIsPaused] = useState(false);

    const initializeConnection = async () => {
        if (!firestore) return;
        setStatus('INITIALIZING');
        setIsPaused(false);
        
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
            handleStop();
        }
        return () => {
            if (cleanup) cleanup();
            handleStop();
        };
    }, [open]);

    const handleTogglePause = () => {
        if (!videoRef.current) return;
        if (isPaused) {
            videoRef.current.play();
        } else {
            videoRef.current.pause();
        }
        setIsPaused(!isPaused);
    };

    const handleStop = () => {
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setStatus('DISCONNECTED');
        if (open) onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-5xl h-[85vh] apple-glass-darker border-none p-0 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/5 flex items-center justify-between flex-shrink-0 bg-background/40 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-2.5 rounded-2xl transition-all duration-500",
                            status === 'CONNECTED' ? "bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-primary/10 text-primary"
                        )}>
                            <MonitorPlay className={cn("h-6 w-6", status === 'SIGNALING' && "animate-pulse")} />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black font-headline tracking-tighter uppercase">Live Telemetry: {targetUserName}</DialogTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={cn(
                                    "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border-none",
                                    status === 'CONNECTED' ? "bg-emerald-500 text-white" : 
                                    status === 'FAILED' ? "bg-rose-500 text-white" :
                                    status === 'DISCONNECTED' ? "bg-muted text-muted-foreground" :
                                    "bg-amber-500 text-black animate-pulse"
                                )}>
                                    {status}
                                </Badge>
                                {status === 'CONNECTED' && (
                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                                        <SignalHigh className="h-3 w-3" /> P2P Link Established
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {status === 'CONNECTED' && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/5">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={handleTogglePause} 
                                className={cn("h-10 w-10 rounded-xl", isPaused ? "text-emerald-500 bg-emerald-500/10" : "text-amber-500 bg-amber-500/10")}
                            >
                                {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={handleStop} 
                                className="h-10 w-10 rounded-xl text-rose-500 bg-rose-500/10 hover:bg-rose-500 hover:text-white"
                            >
                                <Square className="h-5 w-5" />
                            </Button>
                        </div>
                    )}

                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl hover:bg-white/5">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex-1 bg-black relative flex items-center justify-center min-h-0 shadow-inner">
                    {(status !== 'CONNECTED' || status === 'DISCONNECTED') && (
                        <div className="text-center space-y-6 z-10 p-12 max-w-md animate-in fade-in zoom-in-95 duration-700">
                            {status === 'FAILED' || status === 'DISCONNECTED' ? (
                                <>
                                    <div className="p-5 rounded-full bg-rose-500/10 w-fit mx-auto border border-rose-500/20">
                                        <ShieldAlert className="h-12 w-12 text-rose-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold uppercase tracking-widest text-rose-400">Signal Terminated</p>
                                        <p className="text-[10px] text-muted-foreground uppercase leading-relaxed">The telemetry link has been severed or the node has concluded its cycle.</p>
                                    </div>
                                    <Button variant="outline" onClick={() => initializeConnection()} className="rounded-xl h-12 px-8 font-black uppercase tracking-widest border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-500">Reconnect Signal</Button>
                                </>
                            ) : (
                                <>
                                    <div className="relative">
                                        <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto opacity-20" />
                                        <MonitorPlay className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold uppercase tracking-widest text-primary">Negotiating Node Handshake...</p>
                                        <p className="text-[10px] text-muted-foreground uppercase leading-relaxed font-medium">The target node must be approved and active for the stream to initialize. Authorization was granted at clock-in.</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className={cn("w-full h-full object-contain transition-opacity duration-1000 bg-black", status === 'CONNECTED' ? "opacity-100" : "opacity-0")} 
                    />

                    {status === 'CONNECTED' && (
                        <div className="absolute top-6 right-6 flex flex-col items-end gap-3">
                            <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3 shadow-2xl">
                                <div className={cn("h-2 w-2 rounded-full", isPaused ? "bg-amber-500" : "bg-emerald-500 animate-ping")} />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">
                                    {isPaused ? 'Feed Paused' : 'Live Transmission Active'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/5 bg-background/60 backdrop-blur-xl flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">
                        <Wifi className="h-3 w-3" />
                        Node ID: {targetUserId}
                    </div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                        Encrypted Tactical Stream via WebRTC • Permission Locked to Attendance Record
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
