export function Logo({ className = "h-8" }: { className?: string }) {
  return <img src="/logo.png" alt="CodeCave Inc." className={`w-auto ${className}`} width={411} height={115} />;
}
