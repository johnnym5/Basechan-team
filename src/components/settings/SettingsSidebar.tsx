'use client';

import { cn } from "@/lib/utils";
import {
  Building2,
  ShieldCheck,
  Bell,
  GitBranch,
  Share2,
  Database,
  ChevronRight,
  Terminal
} from "lucide-react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

export type SettingsSection =
  | 'general'
  | 'security'
  | 'notifications'
  | 'workflows'
  | 'integrations'
  | 'data'
  | 'master-console';

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const navItems = [
  { id: 'general', label: 'General', icon: Building2, desc: 'Company profile & localization' },
  { id: 'security', label: 'Security', icon: ShieldCheck, desc: 'Auth & infrastructure safety' },
  { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'System alerts & webhooks' },
  { id: 'workflows', label: 'Workflows', icon: GitBranch, desc: 'Approvals & delegations' },
  { id: 'integrations', label: 'Integrations', icon: Share2, desc: 'Third-party connections' },
  { id: 'data', label: 'Data & Compliance', icon: Database, desc: 'Retention & exports' },
  { id: 'master-console', label: 'Master Console', icon: Terminal, desc: 'Super Admin infrastructure tools', superAdminOnly: true },
] as const;

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  const { isSuperAdmin } = useSuperAdmin();

  return (
    <div className="w-full flex flex-col h-full">
      <div className="px-6 py-8">
        <h2 className="text-2xl font-black font-headline tracking-tighter text-foreground">Admin Console</h2>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">Enterprise Configuration</p>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          if (item.superAdminOnly && !isSuperAdmin) return null;

          const isActive = activeSection === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id as SettingsSection)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group",
                isActive
                  ? "bg-primary shadow-xl shadow-primary/20 text-white"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-2 rounded-xl transition-colors",
                  isActive ? "bg-white/20" : "bg-white/5 group-hover:bg-primary/10"
                )}>
                  <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-primary")} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black uppercase tracking-tight">{item.label}</p>
                  <p className={cn(
                    "text-[9px] font-medium leading-none mt-1 opacity-60",
                    isActive ? "text-white" : "text-muted-foreground"
                  )}>
                    {item.desc}
                  </p>
                </div>
              </div>
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform duration-300",
                isActive ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
              )} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}
