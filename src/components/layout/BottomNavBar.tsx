'use client';

import { uiEmitter } from "@/lib/ui-emitter";
import { Plus } from 'lucide-react';

interface BottomNavBarProps {
    onFabClick: () => void;
}

export function BottomNavBar({ onFabClick }: BottomNavBarProps) {
  
  const navItems = [
    { label: "Home", icon: "home", action: () => { window.location.href = '/'; }, active: true},
    { label: "Tasks", icon: "format_list_bulleted", action: () => uiEmitter.emit('open-tasks-dialog') },
    { label: "Schedule", icon: "calendar_today", action: () => uiEmitter.emit('open-attendance-dialog') },
    { label: "Profile", icon: "person", action: () => uiEmitter.emit('open-profile-dialog') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 md:hidden">
      <div className="max-w-md mx-auto glass-dark rounded-full px-2 py-2 flex items-center justify-between shadow-2xl shadow-black/50 border border-white/10">
        <a className="flex-1 flex flex-col items-center gap-1 py-2 text-primary" href="#">
            <span className="material-symbols-outlined text-2xl fill-1">home</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </a>
        <button onClick={() => uiEmitter.emit('open-tasks-dialog')} className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-500">
            <span className="material-symbols-outlined text-2xl">format_list_bulleted</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Tasks</span>
        </button>

        <div className="px-2">
            <button onClick={onFabClick} className="size-12 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                <Plus className="h-6 w-6"/>
            </button>
        </div>

        <button onClick={() => uiEmitter.emit('open-attendance-dialog')} className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-500">
            <span className="material-symbols-outlined text-2xl">calendar_today</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Schedule</span>
        </button>
        <button onClick={() => uiEmitter.emit('open-profile-dialog')} className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-500">
            <span className="material-symbols-outlined text-2xl">person</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
        </button>
      </div>
    </nav>
  );
}
