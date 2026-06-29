"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const LeaderCelebration = dynamic(
  () => import("./LeaderCelebration").then(mod => mod.LeaderCelebration),
  { ssr: false }
);

const FirstPredictionCelebration = dynamic(
  () => import("./FirstPredictionCelebration").then(mod => mod.FirstPredictionCelebration),
  { ssr: false }
);

interface CelebrationManagerProps {
  rank: number | string;
  predictionCount: number;
  points: number;
}

export function CelebrationManager({ rank, predictionCount, points }: CelebrationManagerProps) {
  const [activeCelebration, setActiveCelebration] = useState<"LEADER" | "FIRST_PREDICTION" | null>(null);

  useEffect(() => {
    // Priority 1: Leader Celebration
    const sessionKey = "hasSeenLeaderCelebration_session";
    if (rank === 1 && points > 1) {
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "true");
        setActiveCelebration("LEADER");
        return;
      }
    } else {
      // If the user's rank drops, remove the flag so they can celebrate again if they reclaim #1
      sessionStorage.removeItem(sessionKey);
    }

    // Priority 2: First Prediction Celebration
    if (predictionCount === 1) {
      const localKey = "hasSeenFirstPrediction";
      if (!localStorage.getItem(localKey)) {
        localStorage.setItem(localKey, "true");
        setActiveCelebration("FIRST_PREDICTION");
        return;
      }
    }
  }, [rank, predictionCount, points]);

  if (!activeCelebration) return null;

  return (
    <>
      {activeCelebration === "LEADER" && (
        <LeaderCelebration onClose={() => setActiveCelebration(null)} />
      )}
      {activeCelebration === "FIRST_PREDICTION" && (
        <FirstPredictionCelebration onClose={() => setActiveCelebration(null)} />
      )}
    </>
  );
}
