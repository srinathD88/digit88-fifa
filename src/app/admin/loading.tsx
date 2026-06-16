import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center relative overflow-hidden py-32">
      <div className="flex flex-col items-center gap-4 text-accent">
        <Loader2 className="h-10 w-10 animate-spin opacity-80" />
        <p className="text-sm font-bold uppercase tracking-widest text-accent animate-pulse">Loading Admin Data...</p>
      </div>
    </div>
  );
}
