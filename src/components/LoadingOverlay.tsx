import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "Loading..." }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <p className="text-white font-medium text-lg tracking-wide animate-pulse">{message}</p>
    </div>
  );
}
