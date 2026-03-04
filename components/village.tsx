"use client";

import type { Building, Season } from "@/lib/game-engine";

interface VillageProps {
  buildings: Building[];
  season: Season;
}

function BuildingSprite({ building, season }: { building: Building; season: Season }) {
  const hasSnow = season === "winter";
  const isDamaged = building.damaged;

  const damageOverlay = isDamaged ? (
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 animate-pulse">
      <div className="w-2 h-2 rounded-full bg-red-500" />
      <span className="text-[8px] font-bold text-red-400">!</span>
    </div>
  ) : null;

  switch (building.type) {
    case "hut":
      return (
        <div className="relative flex flex-col items-center">
          {damageOverlay}
          <div
            className="w-0 h-0 transition-colors duration-1000"
            style={{
              borderLeft: "20px solid transparent",
              borderRight: "20px solid transparent",
              borderBottom: hasSnow ? "16px solid #e8e8f0" : "16px solid #8b4513",
            }}
          />
          <div className={`w-8 h-6 border flex items-end justify-center sm:w-10 sm:h-8 ${isDamaged ? "bg-[#a08060] border-red-400/50" : "bg-[#d2a56c] border-[#a0784a]"}`}>
            <div className="w-2 h-3 bg-[#5a3a1a] sm:w-3 sm:h-4" />
          </div>
          <span className="text-[8px] text-foreground/60 mt-0.5 font-sans sm:text-[10px]">Hut</span>
        </div>
      );

    case "farm":
      return (
        <div className="relative flex flex-col items-center">
          {damageOverlay}
          <div
            className="w-0 h-0 transition-colors duration-1000"
            style={{
              borderLeft: "24px solid transparent",
              borderRight: "24px solid transparent",
              borderBottom: hasSnow ? "14px solid #e8e8f0" : "14px solid #2e7d32",
            }}
          />
          <div className={`w-10 h-7 border flex items-end justify-center gap-0.5 sm:w-12 sm:h-9 ${isDamaged ? "bg-[#8a2020] border-red-400/50" : "bg-[#c0392b] border-[#962d22]"}`}>
            <div className="w-2 h-3 bg-[#5a1a1a] sm:w-3 sm:h-4" />
            <div className="w-2 h-3 bg-[#5a1a1a] sm:w-3 sm:h-4" />
          </div>
          <div className="flex gap-[2px] mt-0.5">
            {[0, 1, 2, 3, 4].map((j) => (
              <div
                key={j}
                className="w-[3px] h-3 rounded-t-sm transition-colors duration-1000 sm:w-1 sm:h-4"
                style={{
                  background: isDamaged ? "#7a7a7a" : hasSnow ? "#c8d0d8" : season === "autumn" ? "#c8a040" : "#4caf50",
                }}
              />
            ))}
          </div>
          <span className="text-[8px] text-foreground/60 mt-0.5 font-sans sm:text-[10px]">Farm</span>
        </div>
      );

    case "lumbermill":
      return (
        <div className="relative flex flex-col items-center">
          {damageOverlay}
          <div
            className="w-0 h-0 transition-colors duration-1000"
            style={{
              borderLeft: "18px solid transparent",
              borderRight: "18px solid transparent",
              borderBottom: hasSnow ? "18px solid #e8e8f0" : "18px solid #5d4037",
            }}
          />
          <div className={`w-8 h-10 border flex flex-col items-center justify-end sm:w-10 sm:h-12 ${isDamaged ? "bg-[#4a3a30] border-red-400/50" : "bg-[#6d4c41] border-[#4e342e]"}`}>
            <div className="w-2 h-4 bg-[#3e2723] sm:w-3 sm:h-5" />
          </div>
          <div className="w-3 h-3 rounded-full border-2 border-[#78909c] -mt-1 bg-[#90a4ae] sm:w-4 sm:h-4" />
          <span className="text-[8px] text-foreground/60 mt-0.5 font-sans sm:text-[10px]">Mill</span>
        </div>
      );

    case "market":
      return (
        <div className="relative flex flex-col items-center">
          {damageOverlay}
          <div className="w-14 h-3 rounded-t-md bg-[#f9a825] border border-[#f57f17] flex sm:w-16 sm:h-4">
            <div className="flex-1 bg-[#ef6c00]" />
            <div className="flex-1 bg-[#f9a825]" />
            <div className="flex-1 bg-[#ef6c00]" />
            <div className="flex-1 bg-[#f9a825]" />
          </div>
          <div className={`w-14 h-6 border flex items-center justify-center gap-1 sm:w-16 sm:h-8 ${isDamaged ? "bg-[#a09080] border-red-400/50" : "bg-[#d7ccc8] border-[#a1887f]"}`}>
            <div className="w-2 h-2 rounded-full bg-[#ffd54f] sm:w-3 sm:h-3" />
            <div className="w-2 h-2 rounded-full bg-[#ffd54f] sm:w-3 sm:h-3" />
          </div>
          <div className="flex justify-between w-12 sm:w-14">
            <div className="w-1 h-3 bg-[#6d4c41] sm:h-4" />
            <div className="w-1 h-3 bg-[#6d4c41] sm:h-4" />
          </div>
          <span className="text-[8px] text-foreground/60 mt-0.5 font-sans sm:text-[10px]">Market</span>
        </div>
      );
  }
}

export function Village({ buildings, season }: VillageProps) {
  return (
    <div className="fixed bottom-[28%] left-0 w-full z-[5] pointer-events-none" aria-label="Village buildings">
      {buildings.map((b) => (
        <div
          key={b.id}
          className="absolute bottom-0"
          style={{ left: `${b.x}%`, transform: "translateX(-50%)" }}
        >
          <BuildingSprite building={b} season={season} />
        </div>
      ))}
    </div>
  );
}
