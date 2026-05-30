import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import { SlideshowItem } from "../types";
import { localDb } from "../firebase";

interface SlideshowProps {
  slides: SlideshowItem[];
  onSelectChannel: (channelId: string) => void;
}

export default function Slideshow({ slides, onSelectChannel }: SlideshowProps) {
  const [current, setCurrent] = useState(0);

  // Auto scroll effect
  useEffect(() => {
    if (slides.length <= 1) return;
    
    // Get customized slide speed in seconds, default to 5 seconds
    const intervalSeconds = localDb.getGlobalConfig().slideshowIntervalSeconds || 5;
    const intervalMs = intervalSeconds * 1000;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [slides.length]);

  if (!slides || slides.length === 0) {
    return (
      <div id="slideshow_empty" className="w-full h-48 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800">
        <p className="text-slate-400 text-sm">Hakuna Slideshow zilizosetwa kwa sasa.</p>
      </div>
    );
  }

  const navigatePrev = () => {
    setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const navigateNext = () => {
    setCurrent((prev) => (prev + 1) % slides.length);
  };

  const activeSlide = slides[current];

  return (
    <div 
      id="homepage_slideshow" 
      onClick={() => {
        if (activeSlide.channelId) {
          onSelectChannel(activeSlide.channelId);
        }
      }}
      className={`relative w-full aspect-[16/9] rounded-2xl overflow-hidden group shadow-2xl border border-slate-900/40 ${activeSlide.channelId ? "cursor-pointer" : "cursor-default"}`}
    >
      
      {/* Slide Image Background */}
      <div className="absolute inset-0 transition-all duration-700 ease-out transform bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Crisp, intact main image where text is NEVER cut off */}
        <img
          id={`slideshow_img_${activeSlide.id}`}
          src={activeSlide.image}
          alt={activeSlide.title}
          className="w-full h-full object-cover select-none z-10 group-hover:scale-[1.01] transition-all duration-750"
        />
        {/* Subtle dark gradient vignette for elegant depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent pointer-events-none z-20" />
      </div>

      {/* Slide Navigation and Indicators overlay (No Text/Words as requested!) */}
      <div id="slideshow_content" className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
        
        {/* Minimal play icon action indicator */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-600/90 hover:bg-cyan-500 border border-cyan-400/20 shadow-lg select-none">
          <Play className="w-4 h-4 fill-white text-white ml-0.5" />
        </div>

        {/* Pagination Indicators - with pointer-events-auto to keep clickable */}
        <div className="flex gap-1.5 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          {slides.map((_, idx) => (
            <button
              key={idx}
              id={`slideshow_page_dot_${idx}`}
              onClick={() => setCurrent(idx)}
              className={`w-2 h-2 rounded-full transition-all cursor-pointer ${idx === current ? "bg-cyan-400 w-5" : "bg-slate-600/80"}`}
            />
          ))}
        </div>
      </div>

      {/* Manual Arrow Controls (Hidden on Mobile unless Hovered) */}
      <button
        id="slideshow_prev_arrow"
        onClick={(e) => { e.stopPropagation(); navigatePrev(); }}
        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/60 border border-slate-800 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hidden md:block hover:bg-slate-900 z-20"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <button
        id="slideshow_next_arrow"
        onClick={(e) => { e.stopPropagation(); navigateNext(); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/60 border border-slate-800 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hidden md:block hover:bg-slate-900 z-20"
      >
        <ArrowRight className="w-5 h-5" />
      </button>

    </div>
  );
}
