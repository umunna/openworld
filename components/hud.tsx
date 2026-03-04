"use client";

import { useState, useEffect, useRef } from "react";
import type {
  Season, Weather, Resources, BuildingType, GameEvent,
  RivalVillage, Rations, DiplomacyAction,
} from "@/lib/game-engine";
import {
  getBuildingCost, canAfford, MILESTONES, BUILDING_DESCRIPTIONS,
  REPAIR_COST, FESTIVAL_COST,
} from "@/lib/game-engine";

interface HudProps {
  season: Season;
  weather: Weather;
  resources: Resources;
  speed: number;
  day: number;
  events: GameEvent[];
  completedMilestones: Set<string>;
  rivals: RivalVillage[];
  taxRate: number;
  rations: Rations;
  damagedCount: number;
  onSeasonChange: (s: Season) => void;
  onWeatherChange: (w: Weather) => void;
  onSpeedChange: (s: number) => void;
  onBuild: (type: BuildingType) => void;
  onTaxChange: (rate: number) => void;
  onRationsChange: (r: Rations) => void;
  onFestival: () => void;
  onRepair: () => void;
  onDiplomacy: (rivalId: string, action: DiplomacyAction) => void;
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
  diplomacy: "text-sky-300",
  war: "text-red-400 font-bold",
};

const STATUS_COLORS: Record<string, string> = {
  neutral: "bg-slate-500",
  allied: "bg-emerald-500",
  hostile: "bg-red-500",
  conquered: "bg-amber-500",
  tradepact: "bg-sky-500",
};

const RELATION_COLOR = (r: number) =>
  r >= 50 ? "bg-emerald-400" : r >= 0 ? "bg-amber-400" : r >= -40 ? "bg-orange-400" : "bg-red-500";

function ResourceBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-black/20 px-2 py-1 text-[10px] sm:px-2.5 sm:py-1.5 sm:text-xs">
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
  return <span className="text-[9px] opacity-50">{parts.join(" ")}</span>;
}

function MoraleBar({ morale }: { morale: number }) {
  const color = morale >= 60 ? "bg-emerald-400" : morale >= 30 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-black/20 px-2 py-1 sm:px-2.5 sm:py-1.5">
      <span className="text-[10px] font-bold text-pink-300 sm:text-xs">Morale</span>
      <div className="relative h-2 w-12 overflow-hidden rounded-full bg-white/10 sm:w-16">
        <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${color}`} style={{ width: `${morale}%` }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums text-white sm:text-xs">{morale}</span>
    </div>
  );
}

export function Hud({
  season, weather, resources, speed, day, events,
  completedMilestones, rivals, taxRate, rations, damagedCount,
  onSeasonChange, onWeatherChange, onSpeedChange, onBuild,
  onTaxChange, onRationsChange, onFestival, onRepair, onDiplomacy,
}: HudProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const [showPanel, setShowPanel] = useState<"none" | "milestones" | "decrees" | "diplomacy">("none");

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [events]);

  const nextMilestone = MILESTONES.find((m) => !completedMilestones.has(m.id));
  const visibleRivals = rivals.filter((r) => r.visible);
  const canFestival = resources.gold >= FESTIVAL_COST;
  const canRepair = damagedCount > 0 && resources.wood >= REPAIR_COST;

  const togglePanel = (p: "milestones" | "decrees" | "diplomacy") =>
    setShowPanel((prev) => (prev === p ? "none" : p));

  return (
    <>
      {/* Top-left: Objective */}
      {nextMilestone && (
        <div className="fixed top-3 left-3 z-50 rounded-xl border border-white/15 bg-black/40 px-3 py-2 backdrop-blur-md sm:top-4 sm:left-4 sm:px-4 sm:py-2.5">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-400/80 sm:text-[11px]">Objective</span>
          <p className="text-[11px] font-bold text-white sm:text-sm">{nextMilestone.title}</p>
          <p className="text-[9px] text-white/50 sm:text-[11px]">{nextMilestone.description}</p>
        </div>
      )}

      {/* Top-right: World map + panel toggles */}
      <div className="fixed top-3 right-3 z-50 flex flex-col items-end gap-2 sm:top-4 sm:right-4">
        {/* World map dots */}
        {visibleRivals.length > 0 && (
          <div className="relative flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/40 px-3 py-2 backdrop-blur-md">
            <div className="w-3 h-3 rounded-full bg-emerald-400 ring-1 ring-white/30" title="Your village" />
            {visibleRivals.map((r) => (
              <div
                key={r.id}
                className={`w-2.5 h-2.5 rounded-full ring-1 ring-white/20 ${STATUS_COLORS[r.status]}`}
                title={`${r.name} (${r.status})`}
              />
            ))}
          </div>
        )}

        {/* Panel toggle buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={() => togglePanel("milestones")}
            className={`rounded-lg border border-white/15 px-2.5 py-1.5 text-[10px] font-bold backdrop-blur-md transition-all sm:text-xs ${showPanel === "milestones" ? "bg-amber-500/30 text-amber-300" : "bg-black/40 text-white/70 hover:bg-black/50"}`}
          >
            {completedMilestones.size}/{MILESTONES.length} Goals
          </button>
          <button
            onClick={() => togglePanel("decrees")}
            className={`rounded-lg border border-white/15 px-2.5 py-1.5 text-[10px] font-bold backdrop-blur-md transition-all sm:text-xs ${showPanel === "decrees" ? "bg-purple-500/30 text-purple-300" : "bg-black/40 text-white/70 hover:bg-black/50"}`}
          >
            Decrees
          </button>
          {visibleRivals.length > 0 && (
            <button
              onClick={() => togglePanel("diplomacy")}
              className={`rounded-lg border border-white/15 px-2.5 py-1.5 text-[10px] font-bold backdrop-blur-md transition-all sm:text-xs ${showPanel === "diplomacy" ? "bg-sky-500/30 text-sky-300" : "bg-black/40 text-white/70 hover:bg-black/50"}`}
            >
              Diplomacy
            </button>
          )}
        </div>
      </div>

      {/* Milestones panel */}
      {showPanel === "milestones" && (
        <div className="fixed top-24 right-3 z-50 w-60 rounded-xl border border-white/15 bg-black/60 p-3 backdrop-blur-xl sm:right-4 sm:w-72 sm:p-4 max-h-[60vh] overflow-y-auto">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/60 sm:text-xs">Milestones</h3>
          <div className="flex flex-col gap-1">
            {MILESTONES.map((m) => {
              const done = completedMilestones.has(m.id);
              return (
                <div key={m.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[10px] sm:text-xs ${done ? "bg-amber-400/10" : "bg-white/5"}`}>
                  <span className={`text-xs ${done ? "text-amber-400" : "text-white/20"}`}>{done ? "x" : "o"}</span>
                  <div>
                    <span className={`font-bold ${done ? "text-amber-300" : "text-white/50"}`}>{m.title}</span>
                    <span className={`ml-1 ${done ? "text-white/50" : "text-white/30"}`}>-- {m.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Decrees panel */}
      {showPanel === "decrees" && (
        <div className="fixed top-24 right-3 z-50 w-64 rounded-xl border border-white/15 bg-black/60 p-3 backdrop-blur-xl sm:right-4 sm:w-72 sm:p-4">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-white/60 sm:text-xs">Decrees</h3>

          {/* Tax */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-white/70 sm:text-xs">Tax Rate</span>
              <span className="text-[10px] font-bold tabular-nums text-yellow-300 sm:text-xs">{taxRate}%</span>
            </div>
            <input
              type="range" min={0} max={30} step={5} value={taxRate}
              onChange={(e) => onTaxChange(parseInt(e.target.value, 10))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-yellow-400"
            />
            <p className="text-[9px] text-white/40 mt-0.5">More gold, less morale</p>
          </div>

          {/* Rations */}
          <div className="mb-3">
            <span className="text-[10px] font-semibold text-white/70 sm:text-xs">Rations</span>
            <div className="flex gap-1 mt-1">
              {(["full", "half", "none"] as Rations[]).map((r) => (
                <button
                  key={r}
                  onClick={() => onRationsChange(r)}
                  className={`flex-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase transition-all sm:text-xs ${rations === r ? "bg-white/20 text-white ring-1 ring-white/40" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-white/40 mt-0.5">Full = more food cost, better morale</p>
          </div>

          {/* Festival */}
          <button
            onClick={onFestival}
            disabled={!canFestival}
            className={`w-full rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all sm:text-xs ${canFestival ? "bg-purple-500/30 text-purple-200 hover:bg-purple-500/40" : "bg-white/5 text-white/30 cursor-not-allowed"}`}
          >
            Hold Festival ({FESTIVAL_COST}G = +25 Morale)
          </button>

          {/* Repair */}
          {damagedCount > 0 && (
            <button
              onClick={onRepair}
              disabled={!canRepair}
              className={`mt-2 w-full rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all sm:text-xs ${canRepair ? "bg-orange-500/30 text-orange-200 hover:bg-orange-500/40" : "bg-white/5 text-white/30 cursor-not-allowed"}`}
            >
              Repair ({damagedCount} damaged, {REPAIR_COST}W each)
            </button>
          )}
        </div>
      )}

      {/* Diplomacy panel */}
      {showPanel === "diplomacy" && visibleRivals.length > 0 && (
        <div className="fixed top-24 right-3 z-50 w-72 rounded-xl border border-white/15 bg-black/60 p-3 backdrop-blur-xl sm:right-4 sm:w-80 sm:p-4 max-h-[60vh] overflow-y-auto">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-white/60 sm:text-xs">Rival Villages</h3>
          <div className="flex flex-col gap-3">
            {visibleRivals.map((r) => (
              <div key={r.id} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                {/* Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white sm:text-sm">{r.name}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase text-white ${STATUS_COLORS[r.status]}`}>
                      {r.status}
                    </span>
                  </div>
                  <span className="text-[9px] text-white/40 capitalize">{r.personality}</span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 mb-1.5 text-[9px] text-white/60 sm:text-[10px]">
                  <span>Pop: {Math.floor(r.population)}</span>
                  <span>Str: {Math.floor(r.strength)}</span>
                  <span>Gold: {Math.floor(r.wealth)}</span>
                </div>

                {/* Relation bar */}
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[9px] text-white/50">Relation</span>
                  <div className="relative flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`absolute inset-y-0 rounded-full transition-all duration-500 ${RELATION_COLOR(r.relation)}`}
                      style={{
                        left: `${Math.max(0, (r.relation + 100) / 2)}%`,
                        width: "4px",
                      }}
                    />
                    {/* Center mark */}
                    <div className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
                  </div>
                  <span className="text-[9px] font-bold tabular-nums text-white/60 min-w-[28px] text-right">{Math.round(r.relation)}</span>
                </div>

                {/* Actions */}
                {r.status !== "conquered" && (
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => onDiplomacy(r.id, "trade")}
                      disabled={resources.gold < 10}
                      className="rounded bg-sky-500/20 px-2 py-1 text-[9px] font-bold text-sky-300 transition-all hover:bg-sky-500/30 disabled:opacity-30 disabled:cursor-not-allowed sm:text-[10px]"
                    >
                      Trade (10G)
                    </button>
                    {r.relation >= 50 && r.status !== "allied" && (
                      <button
                        onClick={() => onDiplomacy(r.id, "alliance")}
                        className="rounded bg-emerald-500/20 px-2 py-1 text-[9px] font-bold text-emerald-300 transition-all hover:bg-emerald-500/30 sm:text-[10px]"
                      >
                        Alliance
                      </button>
                    )}
                    <button
                      onClick={() => onDiplomacy(r.id, "tribute")}
                      disabled={resources.gold < 20}
                      className="rounded bg-amber-500/20 px-2 py-1 text-[9px] font-bold text-amber-300 transition-all hover:bg-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed sm:text-[10px]"
                    >
                      Tribute (20G)
                    </button>
                    {r.status !== "allied" && r.status !== "tradepact" && (
                      <button
                        onClick={() => onDiplomacy(r.id, "war")}
                        className="rounded bg-red-500/20 px-2 py-1 text-[9px] font-bold text-red-300 transition-all hover:bg-red-500/30 sm:text-[10px]"
                      >
                        Declare War
                      </button>
                    )}
                  </div>
                )}
                {r.status === "conquered" && (
                  <p className="text-[9px] italic text-amber-300/60">This village has been conquered.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom HUD */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-2 p-2 sm:p-3">
        {/* Event log */}
        {events.length > 0 && (
          <div
            ref={logRef}
            className="event-log mx-auto flex max-h-20 w-full max-w-2xl flex-col gap-0.5 overflow-y-auto rounded-lg bg-black/30 px-3 py-2 backdrop-blur-md sm:max-h-24"
          >
            {events.slice(-15).map((e) => (
              <p key={e.id} className={`text-[10px] leading-tight sm:text-[11px] ${EVENT_COLORS[e.type]}`}>
                <span className="mr-1.5 text-white/30">Day {e.day}</span>
                {e.text}
              </p>
            ))}
          </div>
        )}

        {/* Main bar */}
        <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/20 bg-black/40 px-3 py-2 backdrop-blur-xl sm:px-4 sm:py-2.5">
          <div className="flex flex-col gap-2">
            {/* Row 1: Resources */}
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                <ResourceBadge label="Food" value={Math.floor(resources.food).toString()} color="text-green-400" />
                <ResourceBadge label="Wood" value={Math.floor(resources.wood).toString()} color="text-amber-600" />
                <ResourceBadge label="Gold" value={Math.floor(resources.gold).toString()} color="text-yellow-300" />
                <ResourceBadge label="Pop" value={resources.population.toString()} color="text-sky-300" />
                <MoraleBar morale={resources.morale} />
              </div>
              <span className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold tabular-nums text-white sm:text-xs">
                Day {day}
              </span>
            </div>

            {/* Row 2: Controls */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Seasons */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                {SEASONS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => onSeasonChange(s.key)}
                    className={`rounded-md px-1.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white transition-all sm:px-2 sm:text-[10px] ${s.color} ${season === s.key ? "ring-2 ring-white/60 scale-105" : "opacity-60"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="hidden h-5 w-px bg-white/20 sm:block" />

              {/* Weather */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                {WEATHERS.map((w) => (
                  <button
                    key={w.key}
                    onClick={() => onWeatherChange(w.key)}
                    className={`rounded-md px-1.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white transition-all sm:px-2 sm:text-[10px] ${w.color} ${weather === w.key ? "ring-2 ring-white/60 scale-105" : "opacity-60"}`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>

              <div className="hidden h-5 w-px bg-white/20 sm:block" />

              {/* Build */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                {BUILDINGS.map((b) => {
                  const affordable = canAfford(resources, getBuildingCost(b.key));
                  return (
                    <button
                      key={b.key}
                      onClick={() => affordable && onBuild(b.key)}
                      disabled={!affordable}
                      className={`group relative flex flex-col items-center rounded-md bg-white/10 px-1.5 py-1 text-white transition-all hover:bg-white/20 sm:px-2 ${!affordable ? "cursor-not-allowed opacity-30" : ""}`}
                      title={BUILDING_DESCRIPTIONS[b.key]}
                    >
                      <span className="text-[9px] font-bold sm:text-[10px]">{b.label}</span>
                      <CostTag type={b.key} />
                    </button>
                  );
                })}
              </div>

              <div className="hidden h-5 w-px bg-white/20 sm:block" />

              {/* Speed */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-white/50 sm:text-[10px]">Spd</span>
                <input
                  type="range" min={0} max={50} value={speed}
                  onChange={(e) => onSpeedChange(parseInt(e.target.value, 10))}
                  className="h-1.5 w-14 cursor-pointer appearance-none rounded-full bg-white/20 accent-emerald-400 sm:w-20"
                />
                <span className="min-w-[24px] text-center text-[9px] font-bold tabular-nums text-white sm:text-[10px]">
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
