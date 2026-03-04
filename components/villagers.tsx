"use client";

import { useState, useEffect, useRef } from "react";
import type { Season, Weather, Building } from "@/lib/game-engine";

interface VillagersProps {
  population: number;
  season: Season;
  weather: Weather;
  buildings: Building[];
}

interface Villager {
  id: number;
  x: number;
  targetX: number;
  speed: number;
}

// Season-based colors: head, body, legs
const SEASON_PALETTE: Record<Season, { head: string; body: string; legs: string }> = {
  spring: { head: "#f4c587", body: "#4caf50", legs: "#5d4037" },
  summer: { head: "#f4c587", body: "#fdd835", legs: "#5d4037" },
  autumn: { head: "#f4c587", body: "#8d6e63", legs: "#4e342e" },
  winter: { head: "#f4c587", body: "#64b5f6", legs: "#37474f" },
};

const MAX_VISIBLE = 30;

export function Villagers({ population, season, weather, buildings }: VillagersProps) {
  const [villagers, setVillagers] = useState<Villager[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = Math.min(population, MAX_VISIBLE);
  const isStorm = weather === "storm";
  const isSlow = weather === "rain" || weather === "snow";

  // Initialize / resize villager array
  useEffect(() => {
    setVillagers((prev) => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        // Add new villagers
        const added: Villager[] = [];
        for (let i = prev.length; i < count; i++) {
          const x = 10 + Math.random() * 80;
          added.push({ id: i, x, targetX: 10 + Math.random() * 80, speed: 0.3 + Math.random() * 0.4 });
        }
        return [...prev, ...added];
      }
      // Remove excess
      return prev.slice(0, count);
    });
  }, [count]);

  // Movement tick
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const tickMs = isStorm ? 2000 : isSlow ? 800 : 500;

    intervalRef.current = setInterval(() => {
      setVillagers((prev) =>
        prev.map((v) => {
          const dx = v.targetX - v.x;
          const step = isStorm ? 0 : isSlow ? v.speed * 0.4 : v.speed;

          let newX = v.x;
          let newTarget = v.targetX;

          if (Math.abs(dx) < 1) {
            // Pick new target -- prefer building locations
            if (buildings.length > 0 && Math.random() < 0.6) {
              const b = buildings[Math.floor(Math.random() * buildings.length)];
              newTarget = b.x + (Math.random() - 0.5) * 6;
            } else {
              newTarget = 10 + Math.random() * 80;
            }
          } else {
            newX = v.x + Math.sign(dx) * Math.min(step, Math.abs(dx));
          }

          return { ...v, x: newX, targetX: newTarget };
        })
      );
    }, tickMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isStorm, isSlow, buildings]);

  const palette = SEASON_PALETTE[season];

  return (
    <div className="fixed bottom-[28%] left-0 w-full z-[6] pointer-events-none" aria-hidden="true">
      {villagers.map((v) => (
        <div
          key={v.id}
          className="absolute bottom-0"
          style={{
            left: `${v.x}%`,
            transform: "translateX(-50%)",
            transition: isStorm ? "none" : `left ${isSlow ? "1.2s" : "0.5s"} linear`,
          }}
        >
          {/* Stick figure villager */}
          <div className="flex flex-col items-center">
            {/* Head */}
            <div
              className="rounded-full"
              style={{ width: 6, height: 6, background: palette.head }}
            />
            {/* Body */}
            <div
              className="rounded-sm"
              style={{ width: 4, height: 8, background: palette.body, marginTop: -1 }}
            />
            {/* Legs */}
            <div className="flex gap-[1px]" style={{ marginTop: -1 }}>
              <div style={{ width: 2, height: 5, background: palette.legs, borderRadius: "0 0 1px 1px" }} />
              <div style={{ width: 2, height: 5, background: palette.legs, borderRadius: "0 0 1px 1px" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
