"use client";

import { useState, useEffect } from "react";
import type { Season, Weather } from "@/lib/game-engine";

interface SkyProps {
  season: Season;
  weather: Weather;
}

const SKY_GRADIENTS: Record<Season, string> = {
  spring: "linear-gradient(180deg, #5da9e0 0%, #87ceeb 40%, #a8d8a8 68%, #228B22 70%, #1a6e1a 100%)",
  summer: "linear-gradient(180deg, #4a90d9 0%, #6db3f2 40%, #c8c878 68%, #8B7514 70%, #6b5a10 100%)",
  autumn: "linear-gradient(180deg, #c27830 0%, #d4945a 40%, #9e7a4a 68%, #5a3e1b 70%, #3d2a12 100%)",
  winter: "linear-gradient(180deg, #708ca8 0%, #b0c4de 40%, #d0d8e0 68%, #dcdcdc 70%, #c8c8c8 100%)",
};

const STORM_GRADIENTS: Record<Season, string> = {
  spring: "linear-gradient(180deg, #3a5a6e 0%, #4e7080 40%, #6a8a6a 68%, #1a5a1a 70%, #0f3f0f 100%)",
  summer: "linear-gradient(180deg, #3a5570 0%, #4a6a80 40%, #8a8a4a 68%, #5a4a10 70%, #3a3008 100%)",
  autumn: "linear-gradient(180deg, #6a3a18 0%, #7a4a2a 40%, #5a4028 68%, #3a2510 70%, #2a1808 100%)",
  winter: "linear-gradient(180deg, #3a4a58 0%, #5a6a78 40%, #7a8088 68%, #8a8a8a 70%, #6a6a6a 100%)",
};

const GRASS_COLORS: Record<Season, { base: string; tip: string }> = {
  spring: { base: "#006400", tip: "#32CD32" },
  summer: { base: "#4a6a10", tip: "#8aaa30" },
  autumn: { base: "#8b4513", tip: "#d2691e" },
  winter: { base: "#a0a8b0", tip: "#dce4ec" },
};

const CLOUD_COLORS: Record<Season, string> = {
  spring: "rgba(255, 255, 255, 0.7)",
  summer: "rgba(255, 255, 255, 0.6)",
  autumn: "rgba(200, 180, 160, 0.6)",
  winter: "rgba(180, 190, 210, 0.7)",
};

export function Sky({ season, weather }: SkyProps) {
  const isDark = weather === "storm" || weather === "rain";
  const gradient = isDark ? STORM_GRADIENTS[season] : SKY_GRADIENTS[season];
  const isWinter = season === "winter";
  const grassColor = GRASS_COLORS[season];
  const cloudColor = CLOUD_COLORS[season];

  // Generate grass blades client-side only to avoid hydration mismatch
  const [blades, setBlades] = useState<{ id: number; left: number; height: number; delay: string }[]>([]);

  useEffect(() => {
    const count = isWinter ? 300 : 600;
    setBlades(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        height: 30 + Math.random() * 80,
        delay: (Math.random() * 2).toFixed(2),
      }))
    );
  }, [isWinter]);

  return (
    <div
      className="fixed inset-0 z-0 transition-all duration-1000"
      style={{ background: gradient }}
    >
      {/* Sun or Moon */}
      {isWinter ? (
        <div
          className="absolute top-8 right-12 w-16 h-16 rounded-full transition-all duration-1000 sm:w-20 sm:h-20 sm:right-16"
          style={{
            background: "radial-gradient(circle, #e8e8f0 30%, #c0c8d8 70%, transparent 100%)",
            boxShadow: "0 0 40px 15px rgba(200, 210, 230, 0.3)",
            opacity: isDark ? 0.3 : 0.8,
          }}
          aria-hidden="true"
        />
      ) : (
        <div
          className="absolute top-8 right-12 w-16 h-16 rounded-full transition-all duration-1000 sm:w-20 sm:h-20 sm:right-16"
          style={{
            background: season === "autumn"
              ? "radial-gradient(circle, #f0c060 30%, #d09030 70%, transparent 100%)"
              : "radial-gradient(circle, #ffe066 30%, #ffb347 70%, transparent 100%)",
            boxShadow: season === "summer"
              ? "0 0 80px 30px rgba(255, 224, 102, 0.5)"
              : "0 0 60px 20px rgba(255, 224, 102, 0.35)",
            opacity: isDark ? 0.2 : 1,
          }}
          aria-hidden="true"
        />
      )}

      {/* Clouds */}
      {[
        { top: "60px", width: 160, height: 48, duration: "45s", delay: "0s" },
        { top: "120px", width: 120, height: 36, duration: "60s", delay: "10s", opacity: 0.5 },
        { top: "30px", width: 200, height: 54, duration: "55s", delay: "25s", opacity: 0.6 },
      ].map((cloud, i) => (
        <div
          key={i}
          className="absolute rounded-[50px] animate-drift"
          style={{
            top: cloud.top,
            left: "-200px",
            width: cloud.width,
            height: cloud.height,
            background: isDark ? "rgba(80, 90, 100, 0.6)" : cloudColor,
            opacity: cloud.opacity ?? 0.7,
            animationDuration: cloud.duration,
            animationDelay: cloud.delay,
          }}
          aria-hidden="true"
        />
      ))}

      {/* Grass blades container */}
      <div className="absolute bottom-0 left-0 w-full h-[30%] overflow-hidden" aria-hidden="true">
        {blades.map((blade) => (
          <div
            key={blade.id}
            className="absolute bottom-0 w-[2px] rounded-t-sm animate-sway"
            style={{
              left: `${blade.left}%`,
              height: blade.height,
              background: `linear-gradient(to top, ${grassColor.base}, ${grassColor.tip})`,
              animationDelay: `${blade.delay}s`,
              transformOrigin: "bottom center",
            }}
          />
        ))}
      </div>
    </div>
  );
}
