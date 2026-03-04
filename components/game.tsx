"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type {
  Season, Weather, Resources, Building, BuildingType, GameEvent,
  RivalVillage, Rations, DiplomacyAction,
} from "@/lib/game-engine";
import {
  STARTING_RESOURCES, STARTING_BUILDINGS, MILESTONES, RIVAL_TEMPLATES,
  FESTIVAL_COST, REPAIR_COST,
  calculateDayTick, getBuildingCost, canAfford, subtractCost,
  generateDayEvents, tickRivalDay, getPlayerStrength,
  resolveBattle, diplomacyTrade, diplomacyAlliance, diplomacyTribute,
} from "@/lib/game-engine";
import { Sky } from "./sky";
import { WeatherCanvas } from "./weather-canvas";
import { Village } from "./village";
import { Villagers } from "./villagers";
import { Hud } from "./hud";

type GamePhase = "intro" | "playing" | "victory";
type VictoryType = "population" | "empire";

export function Game() {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [victoryType, setVictoryType] = useState<VictoryType>("population");
  const [season, setSeason] = useState<Season>("spring");
  const [weather, setWeather] = useState<Weather>("clear");
  const [speed, setSpeed] = useState(10);
  const [resources, setResources] = useState<Resources>(STARTING_RESOURCES);
  const [buildings, setBuildings] = useState<Building[]>(STARTING_BUILDINGS);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [day, setDay] = useState(0);
  const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(new Set());
  const [rivals, setRivals] = useState<RivalVillage[]>(RIVAL_TEMPLATES.map((r) => ({ ...r })));
  const [taxRate, setTaxRate] = useState(0);
  const [rations, setRations] = useState<Rations>("full");

  const lastTickRef = useRef(performance.now());
  const accumulatorRef = useRef(0);
  const rafRef = useRef(0);
  const idRef = useRef(0);
  const nextId = () => ++idRef.current;

  // State refs for rAF loop
  const stateRef = useRef({ resources, buildings, season, weather, speed, day, rivals, taxRate, rations });
  useEffect(() => {
    stateRef.current = { resources, buildings, season, weather, speed, day, rivals, taxRate, rations };
  }, [resources, buildings, season, weather, speed, day, rivals, taxRate, rations]);

  const damagedCount = buildings.filter((b) => b.damaged).length;

  // ---- Milestone checking ----
  useEffect(() => {
    if (phase !== "playing") return;
    const newCompleted = new Set(completedMilestones);
    let changed = false;
    for (const ms of MILESTONES) {
      if (!newCompleted.has(ms.id) && ms.check(resources, buildings, day, rivals)) {
        newCompleted.add(ms.id);
        changed = true;
        setEvents((prev) => [
          ...prev.slice(-40),
          { id: `ms-${ms.id}`, text: `Milestone: ${ms.title} -- ${ms.description}`, day, type: "milestone" },
        ]);
        if (ms.id === "pop-50") {
          setVictoryType("population");
          setPhase("victory");
        }
        if (ms.id === "empire") {
          setVictoryType("empire");
          setPhase("victory");
        }
      }
    }
    if (changed) setCompletedMilestones(newCompleted);
  }, [resources, buildings, day, phase, completedMilestones, rivals]);

  // ---- Game loop ----
  useEffect(() => {
    if (phase !== "playing") return;
    const DAY_MS = 3000;

    const loop = (now: number) => {
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      const s = stateRef.current;

      if (s.speed > 0) {
        accumulatorRef.current += delta * s.speed;

        while (accumulatorRef.current >= DAY_MS) {
          accumulatorRef.current -= DAY_MS;
          const newDay = s.day + 1;

          // Resource tick
          const tickResult = calculateDayTick(s.resources, s.buildings, s.season, s.weather, s.taxRate, s.rations);
          setResources(tickResult.resources);

          // Building damage from storms
          if (tickResult.damagedIds.length > 0) {
            setBuildings((prev) =>
              prev.map((b) => tickResult.damagedIds.includes(b.id) ? { ...b, damaged: true } : b)
            );
            setEvents((prev) => [
              ...prev.slice(-40),
              ...tickResult.damagedIds.map((id) => ({
                id: `dmg-${id}-${newDay}`,
                text: `A building was damaged by the weather!`,
                day: newDay,
                type: "warning" as const,
              })),
            ]);
          }

          // Rival spawning
          setRivals((prev) => {
            let changed = false;
            const next = prev.map((r) => {
              if (!r.visible && tickResult.resources.population >= r.spawnAt) {
                changed = true;
                return { ...r, visible: true };
              }
              return r;
            });
            if (changed) {
              const justSpawned = next.filter((r) => r.visible && !prev.find((p) => p.id === r.id && p.visible));
              for (const sp of justSpawned) {
                setEvents((prev2) => [
                  ...prev2.slice(-40),
                  { id: `spawn-${sp.id}-${newDay}`, text: `A rival village "${sp.name}" has been discovered! They are ${sp.personality}.`, day: newDay, type: "diplomacy" },
                ]);
              }
            }
            return next;
          });

          // Rival AI tick
          setRivals((prev) => {
            const pStr = getPlayerStrength(tickResult.resources.population, s.buildings);
            const newRivals: RivalVillage[] = [];
            const rivalEvents: GameEvent[] = [];
            for (const r of prev) {
              const { rival: updated, event } = tickRivalDay(r, pStr, newDay);
              newRivals.push(updated);
              if (event) rivalEvents.push(event);
            }
            if (rivalEvents.length > 0) {
              setEvents((prev2) => [...prev2.slice(-40), ...rivalEvents]);
            }
            return newRivals;
          });

          // Day events
          const dayEvents = generateDayEvents(s.season, s.weather, tickResult.resources, newDay);
          if (dayEvents.length > 0) {
            setEvents((prev) => [...prev.slice(-40), ...dayEvents]);
          }

          setDay(newDay);
          stateRef.current.day = newDay;
          stateRef.current.resources = tickResult.resources;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    lastTickRef.current = performance.now();
    accumulatorRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  // ---- Callbacks ----
  const handleBuild = useCallback((type: BuildingType) => {
    const cost = getBuildingCost(type);
    setResources((prev) => {
      if (!canAfford(prev, cost)) return prev;
      const x = 10 + Math.random() * 80;
      setBuildings((prevB) => [
        ...prevB,
        { type, id: `${type}-${nextId()}`, x, damaged: false },
      ]);
      setEvents((prevE) => [
        ...prevE.slice(-40),
        { id: `build-${nextId()}`, text: `A new ${type} has been built.`, day: stateRef.current.day, type: "story" },
      ]);
      return subtractCost(prev, cost);
    });
  }, []);

  const handleSeasonChange = useCallback((s: Season) => {
    setSeason(s);
    setEvents((prev) => [
      ...prev.slice(-40),
      { id: `season-${nextId()}`, text: `The Watcher shifts the world to ${s}.`, day: stateRef.current.day, type: "story" },
    ]);
  }, []);

  const handleWeatherChange = useCallback((w: Weather) => {
    setWeather(w);
    const msgs: Record<Weather, string> = {
      clear: "The skies clear.", rain: "Rain begins to fall.",
      snow: "Snow drifts down from the heavens.", storm: "A fierce storm descends!",
    };
    setEvents((prev) => [
      ...prev.slice(-40),
      { id: `weather-${nextId()}`, text: msgs[w], day: stateRef.current.day, type: "story" },
    ]);
  }, []);

  const handleFestival = useCallback(() => {
    setResources((prev) => {
      if (prev.gold < FESTIVAL_COST) return prev;
      setEvents((prevE) => [
        ...prevE.slice(-40),
        { id: `fest-${nextId()}`, text: "A grand festival lifts the spirits of the village!", day: stateRef.current.day, type: "story" },
      ]);
      return { ...prev, gold: prev.gold - FESTIVAL_COST, morale: Math.min(100, prev.morale + 25) };
    });
  }, []);

  const handleRepair = useCallback(() => {
    setBuildings((prev) => {
      const firstDamaged = prev.find((b) => b.damaged);
      if (!firstDamaged) return prev;
      setResources((prevR) => {
        if (prevR.wood < REPAIR_COST) return prevR;
        setEvents((prevE) => [
          ...prevE.slice(-40),
          { id: `repair-${nextId()}`, text: `A ${firstDamaged.type} has been repaired.`, day: stateRef.current.day, type: "story" },
        ]);
        return { ...prevR, wood: prevR.wood - REPAIR_COST };
      });
      return prev.map((b) => (b.id === firstDamaged.id ? { ...b, damaged: false } : b));
    });
  }, []);

  const handleDiplomacy = useCallback((rivalId: string, action: DiplomacyAction) => {
    setRivals((prev) => {
      const idx = prev.findIndex((r) => r.id === rivalId);
      if (idx === -1) return prev;
      const rival = prev[idx];
      const next = [...prev];

      if (action === "trade") {
        const result = diplomacyTrade(rival, stateRef.current.resources.gold);
        if (!result) return prev;
        next[idx] = result.rival;
        setResources((prevR) => ({
          ...prevR,
          gold: prevR.gold - result.goldCost,
          food: prevR.food + result.foodGained,
        }));
        setEvents((prevE) => [
          ...prevE.slice(-40),
          { id: `trade-${nextId()}`, text: `You traded 10 gold for 25 food with ${rival.name}. Relations improve.`, day: stateRef.current.day, type: "diplomacy" },
        ]);
      } else if (action === "alliance") {
        const result = diplomacyAlliance(rival);
        if (!result) return prev;
        next[idx] = result;
        setEvents((prevE) => [
          ...prevE.slice(-40),
          { id: `ally-${nextId()}`, text: `${rival.name} accepts your alliance! You stand united.`, day: stateRef.current.day, type: "diplomacy" },
        ]);
      } else if (action === "tribute") {
        const result = diplomacyTribute(rival, stateRef.current.resources.gold);
        if (!result) return prev;
        next[idx] = result.rival;
        setResources((prevR) => ({ ...prevR, gold: prevR.gold - result.goldCost }));
        setEvents((prevE) => [
          ...prevE.slice(-40),
          { id: `tribute-${nextId()}`, text: `You sent 20 gold as tribute to ${rival.name}. They are appeased.`, day: stateRef.current.day, type: "diplomacy" },
        ]);
      } else if (action === "war") {
        const pStr = getPlayerStrength(stateRef.current.resources.population, stateRef.current.buildings);
        const result = resolveBattle(pStr, stateRef.current.resources.gold, rival);
        if (result.won) {
          next[idx] = { ...rival, status: "conquered", visible: true };
          setResources((prevR) => ({
            ...prevR,
            gold: prevR.gold + result.goldGained,
            population: prevR.population + result.popGained - result.playerPopLost,
            morale: Math.min(100, Math.max(0, prevR.morale + result.playerMoraleDelta)),
          }));
        } else {
          next[idx] = { ...rival, relation: Math.max(-100, rival.relation - 20), status: "hostile" };
          setResources((prevR) => ({
            ...prevR,
            gold: Math.max(0, prevR.gold + result.goldGained),
            population: Math.max(1, prevR.population - result.playerPopLost),
            morale: Math.max(0, prevR.morale + result.playerMoraleDelta),
          }));
        }
        setEvents((prevE) => [
          ...prevE.slice(-40),
          { id: `war-${nextId()}`, text: result.message, day: stateRef.current.day, type: "war" },
        ]);
      }

      return next;
    });
  }, []);

  const handleStart = () => {
    setPhase("playing");
    setEvents([{ id: "start", text: "A lone hut stands in the meadow. Your village begins.", day: 0, type: "story" }]);
  };

  const handleRestart = () => {
    setPhase("intro");
    setResources(STARTING_RESOURCES);
    setBuildings(STARTING_BUILDINGS);
    setEvents([]);
    setDay(0);
    setCompletedMilestones(new Set());
    setRivals(RIVAL_TEMPLATES.map((r) => ({ ...r })));
    setSeason("spring");
    setWeather("clear");
    setSpeed(10);
    setTaxRate(0);
    setRations("full");
    accumulatorRef.current = 0;
  };

  // ---- Intro screen ----
  if (phase === "intro") {
    return (
      <main className="relative w-full h-screen overflow-hidden select-none">
        <Sky season="spring" weather="clear" />
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 max-w-lg rounded-2xl border border-white/20 bg-black/60 p-6 text-center backdrop-blur-xl sm:p-10">
            <h1 className="text-3xl font-bold tracking-wide text-white sm:text-4xl font-sans">
              The Watcher
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
              You are a god overlooking a small patch of earth. A single hut, three souls,
              and the turning of the seasons are yours to command.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/70 sm:text-base">
              Build, govern, and expand. Set taxes, manage rations, hold festivals.
              As you grow, rival villages will emerge -- trade with them, ally, or conquer.
            </p>
            <div className="mt-5 space-y-1.5 text-left text-xs text-white/50 sm:text-sm">
              <p><span className="font-bold text-emerald-400">Spring</span> -- Best for food and growth</p>
              <p><span className="font-bold text-amber-400">Summer</span> -- Strong food, decent gold</p>
              <p><span className="font-bold text-orange-400">Autumn</span> -- Wood and gold thrive</p>
              <p><span className="font-bold text-sky-300">Winter</span> -- Survival mode, no crops</p>
            </div>
            <div className="mt-3 space-y-1 text-left text-xs text-white/40">
              <p><span className="font-semibold text-white/60">Win</span>: Reach 50 population, or conquer all rivals</p>
              <p><span className="font-semibold text-white/60">Beware</span>: Storms damage buildings, low morale causes desertion</p>
            </div>
            <button
              onClick={handleStart}
              className="mt-7 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-emerald-500 hover:scale-105 active:scale-95 sm:text-base"
            >
              Begin
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ---- Victory screen ----
  if (phase === "victory") {
    return (
      <main className="relative w-full h-screen overflow-hidden select-none">
        <Sky season={season} weather="clear" />
        <Village buildings={buildings} season={season} />
        <Villagers population={resources.population} season={season} weather="clear" buildings={buildings} />
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 max-w-lg rounded-2xl border border-amber-400/30 bg-black/60 p-6 text-center backdrop-blur-xl sm:p-10">
            <h1 className="text-3xl font-bold tracking-wide text-amber-300 sm:text-4xl font-sans">
              {victoryType === "empire" ? "Empire Forged" : "Victory"}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-white/80 sm:text-lg">
              {victoryType === "empire"
                ? "You have conquered all rival villages. An empire rises under your watch."
                : "Your village has grown to 50 souls under your guidance."}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-3 text-sm text-white/60">
              <span>Day {day}</span>
              <span>{buildings.length} buildings</span>
              <span>{completedMilestones.size}/{MILESTONES.length} milestones</span>
              <span>Morale {resources.morale}</span>
            </div>
            <button
              onClick={handleRestart}
              className="mt-7 rounded-xl bg-amber-500 px-8 py-3 text-sm font-bold uppercase tracking-widest text-black transition-all hover:bg-amber-400 hover:scale-105 active:scale-95 sm:text-base"
            >
              Play Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ---- Playing ----
  return (
    <main className="relative w-full h-screen overflow-hidden select-none">
      <Sky season={season} weather={weather} />
      <WeatherCanvas weather={weather} season={season} />
      <Village buildings={buildings} season={season} />
      <Villagers population={resources.population} season={season} weather={weather} buildings={buildings} />
      <Hud
        season={season}
        weather={weather}
        resources={resources}
        speed={speed}
        day={day}
        events={events}
        completedMilestones={completedMilestones}
        rivals={rivals}
        taxRate={taxRate}
        rations={rations}
        damagedCount={damagedCount}
        onSeasonChange={handleSeasonChange}
        onWeatherChange={handleWeatherChange}
        onSpeedChange={setSpeed}
        onBuild={handleBuild}
        onTaxChange={setTaxRate}
        onRationsChange={setRations}
        onFestival={handleFestival}
        onRepair={handleRepair}
        onDiplomacy={handleDiplomacy}
      />
    </main>
  );
}
