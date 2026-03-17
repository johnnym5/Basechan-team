'use client';

import { uiEmitter } from "@/lib/ui-emitter";
import { Plus } from 'lucide-react';
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface BottomNavBarProps {
    onFabClick: () => void;
}

export function BottomNavBar({ onFabClick }: BottomNavBarProps) {
  const pathname = usePathname();

  const isHomePage = pathname === '/';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 md:hidden">
      <div className="max-w-md mx-auto glass-dark rounded-3xl px-2 py-2 flex items-center justify-between shadow-2xl shadow-black/50">
        <button onClick={() => uiEmitter.emit('open-requisitions-dialog')} className="flex-1 flex flex-col items-center gap-1 py-2 text-primary transition-transform duration-200 hover:scale-110">
            <span className="material-symbols-outlined text-2xl fill-1">home</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </button>
        <button onClick={() => uiEmitter.emit('open-attendance-dialog')} className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-500 transition-transform duration-200 hover:scale-110">
            <span className="material-symbols-outlined text-2xl">calendar_today</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Attendance</span>
        </button>

        <div className="px-2">
            <button onClick={onFabClick} className="size-12 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 transition-transform duration-200 hover:scale-110 active:scale-95">
                <Plus className="h-6 w-6"/>
            </button>
        </div>

        <button onClick={() => uiEmitter.emit('open-tasks-dialog')} className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-500 transition-transform duration-200 hover:scale-110">
            <span className="material-symbols-outlined text-2xl">format_list_bulleted</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Tasks</span>
        </button>
        <button onClick={() => uiEmitter.emit('open-workbooks-dialog')} className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-500 transition-transform duration-200 hover:scale-110">
             <span className="material-symbols-outlined text-2xl">auto_stories</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Workbooks</span>
        </button>
      </div>
    </nav>
  );
}
