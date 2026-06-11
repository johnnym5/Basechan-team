import { Terminal } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Terminal className="h-8 w-8 text-primary" />
      <h1 className="text-2xl font-bold font-headline text-foreground">
        Basechan Staff
      </h1>
    </div>
  );
}
