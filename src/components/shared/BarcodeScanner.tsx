'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BarcodeScanner({ onScan, open, onOpenChange }: BarcodeScannerProps) {
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // This is a simulation of a barcode scanner. 
    // In a production app, we would use 'html5-qrcode' or 'quagga' libraries.
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (open) {
            setIsStarting(true);
            setError(null);
            
            // Simulate camera initialization
            timer = setTimeout(() => {
                setIsStarting(false);
                // Simulate a successful scan after 3 seconds if not cancelled
                const autoScanTimer = setTimeout(() => {
                    const simulatedBarcode = "SN-" + Math.random().toString(36).substring(2, 10).toUpperCase();
                    onScan(simulatedBarcode);
                    onOpenChange(false);
                }, 3000);
                return () => clearTimeout(autoScanTimer);
            }, 1000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [open, onScan, onOpenChange]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md apple-glass-darker border-none p-0 overflow-hidden">
                <div className="relative aspect-square w-full bg-black flex items-center justify-center">
                    {isStarting ? (
                        <div className="text-center space-y-4">
                            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
                            <p className="text-white text-sm font-bold uppercase tracking-widest">Initializing Optics...</p>
                        </div>
                    ) : (
                        <>
                            {/* Scanning Viewfinder Overlay */}
                            <div className="absolute inset-10 border-2 border-white/20 rounded-3xl pointer-events-none">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                                
                                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary/50 animate-pulse shadow-[0_0_15px_hsl(var(--primary))]">
                                     <div className="h-full bg-primary w-full animate-[scan_2s_ease-in-out_infinite]" />
                                </div>
                            </div>
                            
                            <p className="absolute bottom-12 text-white/70 text-xs font-bold uppercase tracking-tighter text-center w-full px-12">
                                Align barcode within the viewfinder to capture asset telemetry.
                            </p>
                        </>
                    )}
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-4 right-4 text-white hover:bg-white/10"
                        onClick={() => onOpenChange(false)}
                    >
                        <X className="h-6 w-6" />
                    </Button>
                </div>
                <div className="p-6 bg-background">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <ScanLine className="h-5 w-5 text-primary" />
                        Asset Scanner
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">Point your camera at the physical tag on the asset.</p>
                </div>
            </DialogContent>
            
            <style jsx global>{`
                @keyframes scan {
                    0%, 100% { transform: translateY(-40px); opacity: 0.2; }
                    50% { transform: translateY(40px); opacity: 1; }
                }
            `}</style>
        </Dialog>
    );
}
