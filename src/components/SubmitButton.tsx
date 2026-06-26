"use client";

import { useFormStatus } from "react-dom";
import { Button, ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface SubmitButtonProps extends ButtonProps {
  loadingText?: string;
  successText?: string;
}

export function SubmitButton({ 
  children, 
  loadingText = "Saving...", 
  successText = "✓ Saved", 
  className,
  ...props 
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const [showSuccess, setShowSuccess] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      setShowSuccess(false);
    } else if (wasPending.current) {
      // Transitioned from pending to not pending
      wasPending.current = false;
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [pending]);

  return (
    <Button type="submit" disabled={pending || props.disabled} className={className} {...props}>
      {pending ? (
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
