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
    <Card className={cn("h-full hover:bg-card/70 bg-card/50 backdrop-blur-xl", className)}>
      <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
          <div className={cn("p-2 rounded-lg", color)}>
              <Icon className="h-6 w-6" />
          </div>
          <p className="text-3xl font-bold font-headline">{value}</p>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
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
