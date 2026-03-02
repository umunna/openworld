"use client";

import { useState } from "react";
import type {
  Season,
  Weather,
  Resources,
  BuildingType,
  GameEvent,
} from "@/lib/game-engine";
import { getBuildingCost, canAfford, MILESTONES, BUILDING_DESCRIPTIONS } from "@/lib/game-engine";
import { useEffect, useRef } from "react";

interface HudProps {
  season: Season;
  weather: Weather;
  resources: Resources;
  speed: number;
  day: number;
  events: GameEvent[];
  completedMilestones: Set<string>;
  onSeasonChange: (s: Season) => void;
  onWeatherChange: (w: Weather) => void;
  onSpeedChange: (s: number) => void;
  onBuild: (type: BuildingType) => void;
}

const SEASONS: { key: Season; label: string; color: string }[] = [
  { key: "spring", label: "Spring", color: "bg-emerald-600 hover:bg-emerald-700" },
  { key: "summer", label: "Summer", color: "bg-amber-500 hover:bg-amber-600" },
  { key: "autumn", label: "Autumn", color: "bg-orange-600 hover:bg-orange-700" },
  { key: "winter", label: "Winter", color: "bg-sky-500 hover:bg-sky-600" },
];

const WEATHERS: { key: Weather; label: string; color: string }[] = [
  { key: "clear", label: "Clear", color: "bg-sky-400 hover:bg-sky-500" },
  { key: "rain", label: "Rain", color: "bg-blue-600 hover:bg-blue-700" },
  { key: "snow", label: "Snow", color: "bg-slate-300 hover:bg-slate-400 text-slate-800" },
  { key: "storm", label: "Storm", color: "bg-indigo-700 hover:bg-indigo-800" },
];

const BUILDINGS: { key: BuildingType; label: string }[] = [
  { key: "hut", label: "Hut" },
  { key: "farm", label: "Farm" },
  { key: "lumbermill", label: "Mill" },
  { key: "market", label: "Market" },
];

const EVENT_COLORS: Record<GameEvent["type"], string> = {
  story: "text-white/80",
  flavor: "text-white/60 italic",
  warning: "text-red-300",
  milestone: "text-amber-300 font-bold",
};

function ResourceBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-black/20 px-2.5 py-1.5 text-xs sm:text-sm">
      <span className={`font-bold ${color}`}>{label}</span>
      <span className="font-bold tabular-nums text-white">{value}</span>
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
  day,
  events,
  completedMilestones,
  onSeasonChange,
  onWeatherChange,
  onSpeedChange,
  onBuild,
}: HudProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const [showMilestones, setShowMilestones] = useState(false);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  // Find the next uncompleted milestone
  const nextMilestone = MILESTONES.find((m) => !completedMilestones.has(m.id));

  return (
    <>
      {/* Top-left: Current objective */}
      {nextMilestone && (
        <div className="fixed top-3 left-3 z-50 flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 py-2 backdrop-blur-md sm:top-4 sm:left-4 sm:px-4 sm:py-2.5">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80 sm:text-xs">
              Objective
            </span>
            <span className="text-xs font-bold text-white sm:text-sm">{nextMilestone.title}</span>
            <span className="text-[10px] text-white/50 sm:text-xs">{nextMilestone.description}</span>
          </div>
        </div>
      )}

      {/* Top-right: Milestone counter button */}
      <button
        onClick={() => setShowMilestones(!showMilestones)}
        className="fixed top-3 right-3 z-50 flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white backdrop-blur-md transition-all hover:bg-black/50 sm:top-4 sm:right-4 sm:px-4 sm:py-2.5"
      >
        <span className="text-xs font-bold tabular-nums text-amber-300 sm:text-sm">
          {completedMilestones.size}/{MILESTONES.length}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50 sm:text-xs">
          Milestones
        </span>
      </button>

      {/* Milestone panel */}
      {showMilestones && (
        <div className="fixed top-14 right-3 z-50 w-64 rounded-xl border border-white/15 bg-black/60 p-4 backdrop-blur-xl sm:top-16 sm:right-4 sm:w-72">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/60">
            Milestones
          </h3>
          <div className="flex flex-col gap-1.5">
            {MILESTONES.map((m) => {
              const done = completedMilestones.has(m.id);
              return (
                <div key={m.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs sm:text-sm ${done ? "bg-amber-400/10" : "bg-white/5"}`}>
                  <span className={`text-sm ${done ? "text-amber-400" : "text-white/20"}`}>
                    {done ? "x" : "o"}
                  </span>
                  <div className="flex flex-col">
                    <span className={`font-bold ${done ? "text-amber-300" : "text-white/50"}`}>{m.title}</span>
                    <span className={`text-[10px] ${done ? "text-white/50" : "text-white/30"}`}>{m.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom HUD */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-2 p-2 sm:p-3">
        {/* Event log */}
        {events.length > 0 && (
          <div
            ref={logRef}
            className="mx-auto flex max-h-20 w-full max-w-2xl flex-col gap-0.5 overflow-y-auto rounded-lg bg-black/30 px-3 py-2 backdrop-blur-md sm:max-h-24"
          >
            {events.slice(-12).map((e) => (
              <p key={e.id} className={`text-[11px] leading-tight sm:text-xs ${EVENT_COLORS[e.type]}`}>
                <span className="mr-1.5 text-white/30">Day {e.day}</span>
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
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <ResourceBadge label="Food" value={Math.floor(resources.food).toString()} color="text-green-400" />
                <ResourceBadge label="Wood" value={Math.floor(resources.wood).toString()} color="text-amber-600" />
                <ResourceBadge label="Gold" value={Math.floor(resources.gold).toString()} color="text-yellow-300" />
                <ResourceBadge label="Pop" value={resources.population.toString()} color="text-sky-300" />
              </div>
              <div className="flex items-center gap-2 text-white">
                <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold tabular-nums sm:text-sm">
                  Day {day}
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
                  >
                    {s.label}
                  </button>
                ))}
              </div>

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
                  >
                    {w.label}
                  </button>
                ))}
              </div>

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
                      className={`group relative flex flex-col items-center rounded-lg bg-white/10 px-2 py-1 text-white transition-all hover:bg-white/20 sm:px-2.5 ${
                        !affordable ? "cursor-not-allowed opacity-30" : ""
                      }`}
                      title={BUILDING_DESCRIPTIONS[b.key]}
                    >
                      <span className="text-[10px] font-bold sm:text-xs">{b.label}</span>
                      <CostTag type={b.key} />
                      {/* Tooltip */}
                      <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[10px] text-white/70 group-hover:block">
                        {BUILDING_DESCRIPTIONS[b.key]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="hidden h-6 w-px bg-white/20 sm:block" />

              {/* Speed */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50 sm:text-xs">
                  Speed
                </span>
                <input
                  type="range"
                  min={0}
                  max={50}
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
    </>
  );
}
