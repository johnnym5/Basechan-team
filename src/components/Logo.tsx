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
