import Image from "next/image";

export function ShamiriLogo({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-1 ${className ?? ""}`}>
      <Image
        src="/shamiri-logo.png"
        alt="Shamiri"
        width={120}
        height={40}
        className="h-auto w-auto"
        priority
      />
      <p className="text-[10px] text-muted-foreground">Tiered Care Model</p>
    </div>
  );
}
