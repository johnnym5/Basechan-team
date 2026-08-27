'use client';

import { cn } from "@/lib/utils";
import {
  Building2,
  Shield,
  Users,
  MapPin,
  GitMerge,
  Mail,
  Wallet,
  Clock,
  Fingerprint,
  ChevronRight,
  Database
} from "lucide-react";

export type SettingsSection =
  | 'general'
  | 'security'
  | 'operations'
  | 'workflows'
  | 'finance'
  | 'communications'
  | 'system-lists';

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const SETTINGS_GROUPS = [
  {
    title: "Organization",
    items: [
      { id: 'general', label: 'Profile & Branding', icon: Building2, desc: 'Company identity & theme' },
    ]
  },
  {
    title: "Access & Security",
    items: [
      { id: 'security', label: 'Auth & Safety', icon: Shield, desc: '2FA & session policies' },
    ]
  },
  {
    title: "Operations & Logistics",
    items: [
      { id: 'operations', label: 'Facilities & Ops', icon: MapPin, desc: 'Geofencing, Time & Leave' },
      { id: 'workflows', label: 'Workflows & Approvals', icon: GitMerge, desc: 'Request delegation flow' },
    ]
  },
  {
    title: "Infrastructure",
    items: [
      { id: 'finance', label: 'Finance Settings', icon: Wallet, desc: 'Currency & tax settings' },
      { id: 'communications', label: 'Email & SMTP', icon: Mail, desc: 'System notifications' },
    ]
  },
  {
    title: "System Config",
    items: [
      { id: 'system-lists', label: 'Lists & Templates', icon: Database, desc: 'Dropdowns & categories' },
    ]
  }
];

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <div className="w-full flex flex-col bg-card/40 border border-white/5 backdrop-blur-xl rounded-[2rem] p-4 shadow-2xl overflow-hidden max-h-[80vh]">
      <div className="px-4 py-6 border-b border-white/5 mb-4">
        <h2 className="text-xl font-black font-headline tracking-tighter text-white">Console</h2>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">System Registry</p>
      </div>

      <nav className="flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-1 pb-6">
        {SETTINGS_GROUPS.map((group) => (
          <div key={group.title} className="space-y-3 px-2">
            <h3 className="px-2 text-[9px] font-black uppercase tracking-[0.3em] text-primary opacity-50">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = activeSection === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id as SettingsSection)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-300 group",
                      isActive
                        ? "bg-primary text-white shadow-xl shadow-primary/20"
                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-xl transition-colors shrink-0",
                        isActive ? "bg-white/20" : "bg-white/5 group-hover:bg-primary/10"
                      )}>
                        <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-primary")} />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-tight truncate">{item.label}</p>
                        <p className={cn(
                          "text-[8px] font-medium leading-none mt-1 opacity-50 truncate",
                          isActive ? "text-white" : "text-muted-foreground"
                        )}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    {isActive && <ChevronRight className="h-3 w-3 text-white animate-in slide-in-from-left-2" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
