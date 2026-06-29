"use client";

import { toggleTeamEliminationAction } from "@/actions/admin";
import { useOptimistic, useTransition } from "react";

interface Props {
  teamId: string;
  isEliminated: boolean;
}

export function TeamStatusDropdown({ teamId, isEliminated }: Props) {
  const [isPending, startTransition] = useTransition();
  const [optimisticEliminated, setOptimisticEliminated] = useOptimistic(
    isEliminated,
    (state, newValue: boolean) => newValue
  );

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value === "true";
    startTransition(async () => {
      setOptimisticEliminated(newValue);
      const formData = new FormData();
      formData.append("teamId", teamId);
      formData.append("isEliminated", newValue ? "true" : "false");
      await toggleTeamEliminationAction(formData);
    });
  };

  return (
    <select 
      value={optimisticEliminated ? "true" : "false"}
      onChange={handleChange}
      disabled={isPending}
      className={`h-8 text-xs font-bold rounded px-2 cursor-pointer outline-none transition-colors ${optimisticEliminated ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'}`}
    >
      <option value="false" className="bg-background text-foreground">Active</option>
      <option value="true" className="bg-background text-foreground">Eliminated</option>
    </select>
  );
}
