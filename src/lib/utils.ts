import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const STAGE_LABELS: Record<string, string> = {
  GROUP:         "Group Stage",
  ROUND_OF_32:   "Round of 32",
  ROUND_OF_16:   "Round of 16",
  QUARTER_FINAL: "Quarter-finals",
  SEMI_FINAL:    "Semi-finals",
  THIRD_PLACE:   "Third Place Play-off",
  FINAL:         "Final",
};

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

export const STAGE_OPTIONS = [
  { value: "GROUP",         label: "Group Stage" },
  { value: "ROUND_OF_32",   label: "Round of 32" },
  { value: "ROUND_OF_16",   label: "Round of 16" },
  { value: "QUARTER_FINAL", label: "Quarter-finals" },
  { value: "SEMI_FINAL",    label: "Semi-finals" },
  { value: "THIRD_PLACE",   label: "Third Place Play-off" },
  { value: "FINAL",         label: "Final" },
];
