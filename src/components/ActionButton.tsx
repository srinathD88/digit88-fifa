"use client";

import { Button, ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

interface ActionButtonProps extends ButtonProps {
  action: () => Promise<any>;
  loadingText?: string;
  successText?: string;
}

export function ActionButton({ 
  children, 
  action, 
  loadingText = "Saving...", 
  successText = "✓ Saved", 
  onClick, 
  className,
  ...props 
}: ActionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) onClick(e as any);
    if (e.defaultPrevented) return;

    startTransition(async () => {
      try {
        await action();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } catch (error) {
        console.error("Action failed:", error);
      }
    });
  };

  return (
    <Button onClick={handleClick} disabled={isPending || props.disabled} className={className} {...props}>
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : showSuccess ? (
        <span className="flex items-center gap-2 font-medium">{successText}</span>
      ) : (
        children
      )}
    </Button>
  );
}
