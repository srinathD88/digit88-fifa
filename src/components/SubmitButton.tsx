"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function SubmitButton({ 
  children, 
  loadingText, 
  ...props 
}: React.ComponentProps<typeof Button> & { loadingText?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} {...props}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText || "Processing..."}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
