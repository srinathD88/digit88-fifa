"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ExportSummaryProps {
  summaryText: string;
}

export function ExportSummaryButton({ summaryText }: ExportSummaryProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Button 
      onClick={handleCopy} 
      className="bg-accent hover:bg-accent/90 text-black font-bold shadow-[0_0_15px_rgba(250,200,50,0.4)]"
    >
      {copied ? "✓ Copied to Clipboard" : "📋 Copy Summary"}
    </Button>
  );
}
