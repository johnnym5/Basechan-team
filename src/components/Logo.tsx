<<<<<<< HEAD
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
=======
import Image from 'next/image';

export function Logo() {
  return (
    <div className="flex items-center">
      <Image
        src="/logo.png"
        alt="Basechan International"
        width={200}
        height={56}
        className="h-10 w-auto object-contain"
        priority
      />
    </div>
  );
}
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
