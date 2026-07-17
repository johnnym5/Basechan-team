"use client";

import { useEffect, useState, useRef } from 'react';
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { UserProfile } from '@/lib/types';
import { TeamPane } from './TeamPane';
import { SystemPane } from './SystemPane';
import { AuditPane } from './AuditPane';
import { MaintenancePane } from './MaintenancePane';
import { ErrorLogViewer } from '../superadmin/ErrorLogViewer';
import { usePermissions } from '@/hooks/usePermissions';
import {
  ShieldAlert, Shield, Users, Cog, Hammer, Lock, Zap, Search,
  ChevronLeft, X,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { cn } from '@/lib/utils';
import { uiEmitter } from '@/lib/ui-emitter';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Input } from '../ui/input';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null;
}

type TabId = 'team' | 'system' | 'maintenance' | 'audit' | 'superadmin';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

export function SettingsDialog({ open, onOpenChange, userProfile }: SettingsDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  const permissions = usePermissions(userProfile);
  const { isSuperAdmin } = useSuperAdmin();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const scrollRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<TabId>('team');

  // Reset scroll position when tab changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // Trap body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Debounce search term to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(inputValue);
    }, 300); // 300ms delay

    return () => {
      clearTimeout(timer);
    };
  }, [inputValue]);

  if (!userProfile) return null;

  const hasAccess = permissions.canViewTeam || userProfile.role === 'ORG_ADMIN' || isSuperAdmin;

  const navItems: NavItem[] = [
    { id: 'team', label: 'Team', icon: <Users className="h-4 w-4" /> },
    ...(permissions.canManageCompany ? [{ id: 'system' as TabId, label: 'Config', icon: <Zap className="h-4 w-4" /> }] : []),
    { id: 'maintenance', label: 'Radar', icon: <Hammer className="h-4 w-4" /> },
    ...(permissions.canViewAudit ? [{ id: 'audit' as TabId, label: 'Audit', icon: <Lock className="h-4 w-4" /> }] : []),
    ...(isSuperAdmin ? [{ id: 'superadmin' as TabId, label: 'Root', icon: <Shield className="h-4 w-4" /> }] : []),
  ];

  const handleOpenSuperAdmin = () => {
    onOpenChange(false);
    uiEmitter.emit('open-superadmin-dialog');
  };

  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
  };

  if (!open) return null;

  // ─── Access Denied ──────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[400] bg-black/40 backdrop-blur-sm animate-in fade-in-0" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] w-full max-w-sm bg-background/95 backdrop-blur-xl rounded-2xl border p-8 shadow-2xl text-center animate-in zoom-in-95 fade-in-0">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-destructive/10">
                <ShieldAlert className="w-10 h-10 text-destructive" />
              </div>
              <DialogPrimitive.Title className="text-2xl font-black font-headline tracking-tighter">Access Denied</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60">You do not have permission to access organization settings.</DialogPrimitive.Description>
              <Button onClick={() => onOpenChange(false)} className="w-full mt-4">Close</Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  // ─── Full Management Console ─────────────────────────────────────────────────
  // Use a raw Portal+Overlay+Content so we fully control the layout with NO
  // wrapper divs fighting our flex/scroll structure.
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Dim overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:duration-300 data-[state=open]:duration-500" />

        {/* Panel — full screen left-side slide-in on desktop, bottom sheet on mobile */}
        <DialogPrimitive.Content
          className={cn(
            "fixed z-[500] bg-background/98 backdrop-blur-xl shadow-2xl flex flex-col h-full min-h-0 overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:duration-300 data-[state=open]:duration-500",
            isMobile
              ? "inset-x-0 bottom-0 h-[92vh] rounded-t-[2.5rem] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
              : "inset-y-0 left-0 w-full h-full data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
          )}
        >
          {/* ── Mobile drag handle ── */}
          {isMobile && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted/40 rounded-full z-50" />
          )}

          {/* ── Close button ── */}
          <DialogPrimitive.Close
            className={cn(
              "absolute z-[60] rounded-full transition-all hover:scale-110 active:scale-95 shadow-2xl focus:outline-none focus:ring-2 focus:ring-ring",
              isMobile
                ? "right-4 top-5 p-2 bg-secondary text-muted-foreground"
                : "left-2 top-1/2 -translate-y-1/2 -translate-x-1/2 p-3 bg-primary text-primary-foreground border-4 border-background h-14 w-14 flex items-center justify-center"
            )}
          >
            {isMobile ? <X className="h-5 w-5" /> : <ChevronLeft className="h-6 w-6" />}
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          {/* ── Root layout: header + nav + scrollable content ── */}
          <div
            className={cn(
              "flex flex-col h-full w-full overflow-hidden",
              !isMobile && "pl-[5.5rem] lg:pl-[7.5rem] max-w-[1600px] mx-auto"
            )}
          >
            {/* ── Header ── */}
            <div className="flex-none px-6 md:px-10 pt-6 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary flex-none">
                  <Cog className="h-6 w-6" />
                </div>
                <div>
                  <DialogPrimitive.Title className="text-2xl md:text-3xl font-black font-headline tracking-tighter uppercase leading-none">
                    Management Console
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60 mt-0.5">
                    Organizational Root &amp; Infrastructure Control
                  </DialogPrimitive.Description>
                </div>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search settings..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="pl-10 pr-10 w-full bg-secondary/20 border-transparent focus-visible:ring-primary"
                />
                {inputValue && (
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setInputValue('')}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* ── Tab Nav bar ── */}
            <div className="flex-none px-6 md:px-10 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-white/5">
              <nav className="flex gap-1 w-max min-w-full pb-0" aria-label="Console sections">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={cn(
                      "flex items-center gap-2 px-5 py-3 text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-b-2 -mb-px",
                      activeTab === item.id
                        ? "text-primary border-primary"
                        : "text-muted-foreground border-transparent hover:text-foreground hover:border-white/20"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* ── Scrollable content area ── */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto overscroll-contain px-6 md:px-10 py-8 pb-24"
              style={{ scrollbarGutter: 'stable' }}
            >
              <div className="max-w-[1200px] mx-auto">
                {activeTab === 'team' && (
                  <TeamPane currentUserProfile={userProfile} permissions={permissions} searchTerm={searchTerm} />
                )}
                {activeTab === 'system' && permissions.canManageCompany && (
                  <SystemPane currentUserProfile={userProfile} searchTerm={searchTerm} />
                )}
                {activeTab === 'maintenance' && (
                  <MaintenancePane currentUserProfile={userProfile} searchTerm={searchTerm} />
                )}
                {activeTab === 'audit' && permissions.canViewAudit && (
                  <div className="space-y-8">
                    <AuditPane currentUserProfile={userProfile} searchTerm={searchTerm} />
                    <ErrorLogViewer />
                  </div>
                )}
                {activeTab === 'superadmin' && isSuperAdmin && (
                  <div className="flex flex-col items-center justify-center py-32 text-center p-8 border-2 border-dashed rounded-[3rem] bg-secondary/10 opacity-60">
                    <Shield className="w-16 h-16 text-primary mb-4" />
                    <h2 className="text-xl font-bold uppercase tracking-widest">Super Admin Clearance</h2>
                    <p className="text-xs mt-2 max-w-sm font-bold opacity-70">
                      Access the Master Terminal for global telemetry and disaster recovery operations.
                    </p>
                    <Button
                      onClick={handleOpenSuperAdmin}
                      className="mt-8 h-12 px-10 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                    >
                      Initialize Master Terminal
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
