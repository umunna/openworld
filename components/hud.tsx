"use client";

import type {
  Season,
  Weather,
  Resources,
  BuildingType,
  GameEvent,
} from "@/lib/game-engine";
import { getBuildingCost, canAfford } from "@/lib/game-engine";
import { useEffect, useRef } from "react";

interface HudProps {
  season: Season;
  weather: Weather;
  resources: Resources;
  speed: number;
  pseudoDays: number;
  events: GameEvent[];
  onSeasonChange: (s: Season) => void;
  onWeatherChange: (w: Weather) => void;
  onSpeedChange: (s: number) => void;
  onBuild: (type: BuildingType) => void;
}

const SEASONS: { key: Season; label: string; color: string; icon: string }[] = [
  { key: "spring", label: "Spring", color: "bg-emerald-600 hover:bg-emerald-700", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" },
  { key: "summer", label: "Summer", color: "bg-amber-500 hover:bg-amber-600", icon: "M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" },
  { key: "autumn", label: "Autumn", color: "bg-orange-600 hover:bg-orange-700", icon: "M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.71c.29.26.6.5.94.7L5.71 25h2.09l1.89-5.38C10.96 20.47 12.42 21 14 21c2.49 0 4.63-1.46 5.65-3.58C22.47 16.18 25 13.05 25 8H17z" },
  { key: "winter", label: "Winter", color: "bg-sky-500 hover:bg-sky-600", icon: "M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22z" },
];

const WEATHERS: { key: Weather; label: string; color: string }[] = [
  { key: "clear", label: "Clear", color: "bg-sky-400 hover:bg-sky-500" },
  { key: "rain", label: "Rain", color: "bg-blue-600 hover:bg-blue-700" },
  { key: "snow", label: "Snow", color: "bg-slate-300 hover:bg-slate-400 text-slate-800" },
  { key: "storm", label: "Storm", color: "bg-violet-700 hover:bg-violet-800" },
];

const BUILDINGS: { key: BuildingType; label: string }[] = [
  { key: "hut", label: "Hut" },
  { key: "farm", label: "Farm" },
  { key: "lumbermill", label: "Mill" },
  { key: "market", label: "Market" },
];

function ResourceBadge({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-black/20 px-2.5 py-1.5 text-xs sm:text-sm">
      <span className="opacity-70">{icon}</span>
      <span className="font-bold tabular-nums">{value}</span>
      <span className="hidden opacity-50 sm:inline">{label}</span>
    </div>
  );
}

function CostTag({ type }: { type: BuildingType }) {
  const cost = getBuildingCost(type);
  const parts: string[] = [];
  if (cost.wood) parts.push(`${cost.wood}W`);
  if (cost.gold) parts.push(`${cost.gold}G`);
  return <span className="text-[10px] opacity-50">{parts.join(" ")}</span>;
}

export function Hud({
  season,
  weather,
  resources,
  speed,
  pseudoDays,
  events,
  onSeasonChange,
  onWeatherChange,
  onSpeedChange,
  onBuild,
}: HudProps) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-2 p-2 sm:p-3">
      {/* Event log */}
      {events.length > 0 && (
        <div
          ref={logRef}
          className="mx-auto flex max-h-20 w-full max-w-2xl flex-col gap-0.5 overflow-y-auto rounded-lg bg-black/30 px-3 py-2 backdrop-blur-md sm:max-h-24"
        >
          {events.slice(-15).map((e) => (
            <p key={e.id} className="text-[11px] leading-tight text-white/80 sm:text-xs">
              <span className="mr-1 opacity-40">Day {Math.floor(e.timestamp / 86400000)}</span>
              {e.text}
            </p>
          ))}
        </div>
      )}

      {/* Main HUD bar */}
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-white/20 bg-black/40 px-3 py-2.5 backdrop-blur-xl sm:px-5 sm:py-3">
        <div className="flex flex-col gap-2.5 sm:gap-3">

          {/* Row 1: Resources + Day counter */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-white sm:gap-2">
              <ResourceBadge icon="F" label="Food" value={Math.floor(resources.food).toString()} />
              <ResourceBadge icon="W" label="Wood" value={Math.floor(resources.wood).toString()} />
              <ResourceBadge icon="G" label="Gold" value={Math.floor(resources.gold).toString()} />
              <ResourceBadge icon="P" label="Pop" value={resources.population.toString()} />
            </div>
            <div className="flex items-center gap-2 text-white">
              <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold tabular-nums sm:text-sm">
                Day {pseudoDays}
              </span>
            </div>
          </div>

          {/* Row 2: Season + Weather + Build + Speed */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">

            {/* Seasons */}
            <div className="flex items-center gap-1">
              {SEASONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => onSeasonChange(s.key)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition-all sm:px-2.5 sm:text-xs ${
                    s.color
                  } ${season === s.key ? "ring-2 ring-white/60 scale-105" : "opacity-60"}`}
                  title={s.label}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="hidden h-6 w-px bg-white/20 sm:block" />

            {/* Weather */}
            <div className="flex items-center gap-1">
              {WEATHERS.map((w) => (
                <button
                  key={w.key}
                  onClick={() => onWeatherChange(w.key)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition-all sm:px-2.5 sm:text-xs ${
                    w.color
                  } ${weather === w.key ? "ring-2 ring-white/60 scale-105" : "opacity-60"}`}
                  title={w.label}
                >
                  {w.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="hidden h-6 w-px bg-white/20 sm:block" />

            {/* Build */}
            <div className="flex items-center gap-1">
              {BUILDINGS.map((b) => {
                const affordable = canAfford(resources, getBuildingCost(b.key));
                return (
                  <button
                    key={b.key}
                    onClick={() => affordable && onBuild(b.key)}
                    disabled={!affordable}
                    className={`flex flex-col items-center rounded-lg bg-white/10 px-2 py-1 text-white transition-all hover:bg-white/20 sm:px-2.5 ${
                      !affordable ? "cursor-not-allowed opacity-30" : ""
                    }`}
                    title={`Build ${b.label}`}
                  >
                    <span className="text-[10px] font-bold sm:text-xs">{b.label}</span>
                    <CostTag type={b.key} />
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="hidden h-6 w-px bg-white/20 sm:block" />

            {/* Speed */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50 sm:text-xs">
                Speed
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={speed}
                onChange={(e) => onSpeedChange(parseInt(e.target.value, 10))}
                className="h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-white/20 accent-emerald-400 sm:w-24"
              />
              <span className="min-w-[28px] text-center text-[10px] font-bold tabular-nums text-white sm:text-xs">
                {speed === 0 ? "II" : `${speed}x`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
