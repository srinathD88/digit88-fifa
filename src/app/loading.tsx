import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="flex flex-col items-center gap-4 relative z-10 text-primary">
        <Loader2 className="h-12 w-12 animate-spin opacity-80" />
        <h2 className="text-xl font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent animate-pulse">Loading</h2>
      </div>
    </div>
  );
}
