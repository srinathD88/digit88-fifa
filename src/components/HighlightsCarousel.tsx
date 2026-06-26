"use client";

import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function HighlightsCarousel({ highlights }: { highlights: any[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [bgColors, setBgColors] = useState<string[]>([]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    const gradients = [
      'bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950',
      'bg-gradient-to-br from-emerald-900 via-green-900 to-emerald-950',
      'bg-gradient-to-br from-orange-900 via-amber-900 to-orange-950',
      'bg-gradient-to-br from-rose-900 via-red-900 to-rose-950',
      'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-950',
      'bg-gradient-to-br from-cyan-900 via-teal-900 to-cyan-950',
      'bg-gradient-to-br from-yellow-900 via-amber-900 to-yellow-950',
      'bg-gradient-to-br from-fuchsia-900 via-pink-900 to-fuchsia-950',
      'bg-gradient-to-br from-sky-900 via-blue-900 to-sky-950',
      'bg-gradient-to-br from-violet-900 via-fuchsia-900 to-violet-950'
    ];
    setBgColors(highlights.map(() => gradients[Math.floor(Math.random() * gradients.length)]));
  }, [highlights]);

  const getEmoji = (type: string) => {
    switch (type) {
      case 'PLAYER': return '⭐';
      case 'TEAM': return '🏆';
      case 'VENUE': return '🏟';
      case 'MATCH': return '⚽';
      case 'RECAP': return '🌙';
      case 'DAILY': return '🌅';
      default: return '📊';
    }
  };

  const getGradient = (type: string, category: string, index: number) => {
    if (bgColors[index]) return bgColors[index];
    return 'bg-gradient-to-br from-slate-800 to-slate-900';
  };


  return (
    <div className="relative group">
      <div className="overflow-hidden rounded-xl" ref={emblaRef}>
        <div className="flex touch-pan-y -ml-4">
          {highlights.map((h, i) => {
            return (
              <div key={h.id || i} className="flex-[0_0_100%] min-w-0 pl-4 md:flex-[0_0_50%] lg:flex-[0_0_33.333%]">
                <Card 
                  className="relative h-full min-h-[220px] overflow-hidden flex flex-col justify-between hover:scale-[1.03] transition-transform duration-300 border-accent/20 shadow-[0_0_20px_rgba(0,0,0,0.5)] group/card"
                >
                  {/* Background Gradient & Overlay */}
                  <div 
                    className={`absolute inset-0 z-0 ${getGradient(h.type, h.category, i)} opacity-90 transition-transform duration-700 group-hover/card:scale-105`}
                  />
                  <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                  <CardHeader className="relative z-10 pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="text-xl drop-shadow-md">{getEmoji(h.type)}</span>
                      <span className="font-bold text-amber-300 uppercase tracking-wider drop-shadow-md">
                        {h.title}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10 mt-auto">
                    <p className="text-gray-100 font-medium text-lg leading-snug drop-shadow-lg">
                      {h.content}
                    </p>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={scrollPrev}
        className="absolute -left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black/80 text-white rounded-full opacity-100 transition-opacity backdrop-blur-sm border border-white/10 z-20 disabled:opacity-50"
        disabled={!canScrollPrev}
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute -right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black/80 text-white rounded-full opacity-100 transition-opacity backdrop-blur-sm border border-white/10 z-20 disabled:opacity-50"
        disabled={!canScrollNext}
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}
