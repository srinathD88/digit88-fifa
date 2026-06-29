"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";

export function FirstPredictionCelebration({ onClose }: { onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Small confetti burst
    const duration = 1500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#ffffff", "#8b5cf6", "#d946ef"]
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#ffffff", "#8b5cf6", "#d946ef"]
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    const timer = setTimeout(() => {
      handleClose();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Allow exit animation to finish
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="glass-card max-w-sm w-full mx-4 p-8 rounded-2xl border border-primary/30 flex flex-col items-center text-center shadow-[0_0_40px_rgba(200,50,200,0.3)] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
            
            <div className="relative">
              <motion.div
                initial={{ y: -50, rotate: -180 }}
                animate={{ y: 0, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
                className="text-6xl mb-4 relative z-10"
              >
                ⚽
              </motion.div>
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="absolute -top-2 -right-2 bg-green-500 rounded-full text-white p-1 z-20 shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </motion.div>
            </div>

            <h2 className="text-2xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent relative z-10">
              First Prediction Submitted!
            </h2>
            
            <p className="text-muted-foreground mb-6 relative z-10 font-medium">
              Good luck! Follow the leaderboard and come back after today's matches.
            </p>

            <Button onClick={handleClose} className="w-full font-bold relative z-10" autoFocus>
              Continue
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
