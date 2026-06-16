"use client";

import { useEffect, useState } from "react";

export function FootballBackground() {
  return (
    <>
      {/* Layer 1: Static SVG Background Pattern */}
      <div className="fixed inset-0 -z-30 pointer-events-none">
        <img
          src="/patterns/football-doodle.svg"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Layer 2: Slow Radial Gradients */}
      <div 
        className="fixed inset-0 -z-20 pointer-events-none animate-pulse-slow"
        style={{
          background: `
            radial-gradient(circle at top, rgba(16,185,129,0.06), transparent 40%),
            radial-gradient(circle at bottom right, rgba(59,130,246,0.04), transparent 35%),
            radial-gradient(circle at center, rgba(255,215,0,0.04), transparent 60%)
          `
        }}
      />
      
      {/* Layer 3: High Performance Floating Elements (translateY only) */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* Floating Football */}
        <div className="absolute top-[20%] left-[10%] text-6xl opacity-[0.06] animate-[float_15s_ease-in-out_infinite]">
          ⚽
        </div>
        
        {/* Floating Trophy */}
        <div className="absolute bottom-[20%] right-[15%] text-7xl opacity-[0.05] animate-[float_18s_ease-in-out_infinite_2s]">
          🏆
        </div>
      </div>
    </>
  );
}
