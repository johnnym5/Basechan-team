import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import Link from 'next/link';

interface DashboardStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  href?: string;
  onClick?: () => void;
  color?: string;
}

export function DashboardStatCard({ title, value, icon: Icon, className, href, onClick, color }: DashboardStatCardProps) {
  const content = (
    <Card className={cn("h-full m3-surface-low m3-interactive group", className)}>
      <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
          <div className={cn("p-4 rounded-3xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3", color || "bg-primary/10")}>
              <Icon className="h-8 w-8 transition-colors group-hover:text-primary" />
          </div>
          <div className="space-y-1">
              <p className="text-4xl font-black font-headline tracking-tighter">{value}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">{title}</p>
          </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-all hover:-translate-y-1">
        {content}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className="block transition-all hover:-translate-y-1 cursor-pointer">
      {content}
    </div>
  )
}
