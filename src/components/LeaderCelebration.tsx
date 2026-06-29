"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";

export function LeaderCelebration({ onClose }: { onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Subtle golden confetti from top center
    const duration = 1500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 270, // Straight down
        spread: 60,
        origin: { x: 0.5, y: -0.1 }, // Top center
        colors: ["#f59e0b", "#fbbf24", "#d97706"], // Tailwind amber-500, amber-400, amber-600
        ticks: 200,
        gravity: 0.8,
        scalar: 0.8
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="glass-card max-w-sm w-full mx-4 p-8 rounded-2xl border border-amber-500/40 flex flex-col items-center text-center shadow-[0_0_50px_rgba(245,158,11,0.25)] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
            
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", bounce: 0.7, duration: 0.8 }}
              className="text-7xl mb-4 relative z-10 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]"
            >
              🏆
            </motion.div>

            <h2 className="text-2xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-400 relative z-10 uppercase tracking-wide">
              Congratulations!
            </h2>
            
            <p className="text-muted-foreground mb-4 relative z-10 font-medium">
              You're currently leading the FIFA Prediction League!
            </p>
            
            <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-lg mb-6 relative z-10 shadow-inner">
              <span className="text-amber-500 font-bold uppercase tracking-widest text-sm">Rank #1</span>
            </div>

            <Button onClick={handleClose} className="w-full font-bold relative z-10 bg-amber-500 hover:bg-amber-600 text-black" autoFocus>
              Let's Go!
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
