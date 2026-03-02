"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type {
  Season,
  Weather,
  Resources,
  Building,
  BuildingType,
  GameEvent,
} from "@/lib/game-engine";
import {
  STARTING_RESOURCES,
  STARTING_BUILDINGS,
  MILESTONES,
  calculateDayTick,
  getBuildingCost,
  canAfford,
  subtractCost,
  generateDayEvents,
} from "@/lib/game-engine";
import { Sky } from "./sky";
import { WeatherCanvas } from "./weather-canvas";
import { Village } from "./village";
import { Hud } from "./hud";

type GamePhase = "intro" | "playing" | "victory";

export function Game() {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [season, setSeason] = useState<Season>("spring");
  const [weather, setWeather] = useState<Weather>("clear");
  const [speed, setSpeed] = useState(10);
  const [resources, setResources] = useState<Resources>(STARTING_RESOURCES);
  const [buildings, setBuildings] = useState<Building[]>(STARTING_BUILDINGS);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [day, setDay] = useState(0);
  const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(new Set());

  const lastTickRef = useRef(performance.now());
  const accumulatorRef = useRef(0);
  const rafRef = useRef(0);
  const idRef = useRef(0);
  const nextId = () => ++idRef.current;

  // Refs for latest state in rAF
  const stateRef = useRef({ resources, buildings, season, weather, speed, day });
  useEffect(() => {
    stateRef.current = { resources, buildings, season, weather, speed, day };
  }, [resources, buildings, season, weather, speed, day]);

  // Check milestones whenever resources/buildings/day change
  useEffect(() => {
    if (phase !== "playing") return;
    const newCompleted = new Set(completedMilestones);
    let changed = false;
    for (const ms of MILESTONES) {
      if (!newCompleted.has(ms.id) && ms.check(resources, buildings, day)) {
        newCompleted.add(ms.id);
        changed = true;
        setEvents((prev) => [
          ...prev.slice(-30),
          {
            id: `ms-${ms.id}`,
            text: `Milestone: ${ms.title} -- ${ms.description}`,
            day,
            type: "milestone",
          },
        ]);
        // Win condition
        if (ms.id === "pop-50") {
          setPhase("victory");
        }
      }
    }
    if (changed) setCompletedMilestones(newCompleted);
  }, [resources, buildings, day, phase, completedMilestones]);

  // Game loop -- ticks once per pseudo-day
  useEffect(() => {
    if (phase !== "playing") return;

    // 1 pseudo-day = 3000ms of real time at 1x speed
    // At 10x, 1 pseudo-day = 300ms real time
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

          // Tick resources once per day
          setResources((prev) => calculateDayTick(prev, s.buildings, s.season, s.weather));
          setDay(newDay);
          stateRef.current.day = newDay;

          // Generate events for this day
          const dayEvents = generateDayEvents(s.season, s.weather, s.resources, newDay);
          if (dayEvents.length > 0) {
            setEvents((prev) => [...prev.slice(-30), ...dayEvents]);
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    lastTickRef.current = performance.now();
    accumulatorRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  const handleBuild = useCallback((type: BuildingType) => {
    const cost = getBuildingCost(type);
    setResources((prev) => {
      if (!canAfford(prev, cost)) return prev;
      const x = 10 + Math.random() * 80;
      setBuildings((prevB) => [
        ...prevB,
        { type, id: `${type}-${nextId()}`, x },
      ]);
      const newRes = subtractCost(prev, cost);
      setEvents((prevE) => [
        ...prevE.slice(-30),
        {
          id: `build-${nextId()}`,
          text: `A new ${type} has been erected.`,
          day: stateRef.current.day,
          type: "story",
        },
      ]);
      return newRes;
    });
  }, []);

  const handleSeasonChange = useCallback((s: Season) => {
    setSeason(s);
    setEvents((prev) => [
      ...prev.slice(-30),
      {
        id: `season-${nextId()}`,
        text: `The Watcher shifts the world to ${s}.`,
        day: stateRef.current.day,
        type: "story",
      },
    ]);
  }, []);

  const handleWeatherChange = useCallback((w: Weather) => {
    setWeather(w);
    setEvents((prev) => [
      ...prev.slice(-30),
      {
        id: `weather-${nextId()}`,
        text: w === "clear"
          ? "The skies clear."
          : w === "rain"
            ? "Rain begins to fall."
            : w === "snow"
              ? "Snow drifts down from the heavens."
              : "A fierce storm descends!",
        day: stateRef.current.day,
        type: "story",
      },
    ]);
  }, []);

  const handleStart = () => {
    setPhase("playing");
    setEvents([{
      id: "start",
      text: "A lone hut stands in the meadow. Your village begins.",
      day: 0,
      type: "story",
    }]);
  };

  const handleRestart = () => {
    setPhase("intro");
    setResources(STARTING_RESOURCES);
    setBuildings(STARTING_BUILDINGS);
    setEvents([]);
    setDay(0);
    setCompletedMilestones(new Set());
    setSeason("spring");
    setWeather("clear");
    setSpeed(10);
    accumulatorRef.current = 0;
  };

  // Intro screen
  if (phase === "intro") {
    return (
      <main className="relative w-full h-screen overflow-hidden select-none">
        <Sky season="spring" weather="clear" />
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 max-w-lg rounded-2xl border border-white/20 bg-black/60 p-8 text-center backdrop-blur-xl sm:p-10">
            <h1 className="text-3xl font-bold tracking-wide text-white sm:text-4xl">
              The Watcher
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
              You are a god overlooking a small patch of earth. A single hut, three souls,
              and the turning of the seasons are yours to command.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/70 sm:text-base">
              Control the seasons and weather. Build farms, mills, and markets.
              Grow your village from 3 settlers to a thriving community of 50.
            </p>
            <div className="mt-6 space-y-2 text-left text-xs text-white/50 sm:text-sm">
              <p><span className="font-bold text-emerald-400">Spring</span> -- Best for food and population growth</p>
              <p><span className="font-bold text-amber-400">Summer</span> -- Strong food, decent gold</p>
              <p><span className="font-bold text-orange-400">Autumn</span> -- Wood and gold thrive, food slows</p>
              <p><span className="font-bold text-sky-300">Winter</span> -- No food growth, survival mode</p>
            </div>
            <button
              onClick={handleStart}
              className="mt-8 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-emerald-500 hover:scale-105 active:scale-95 sm:text-base"
            >
              Begin
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Victory screen
  if (phase === "victory") {
    return (
      <main className="relative w-full h-screen overflow-hidden select-none">
        <Sky season={season} weather="clear" />
        <Village buildings={buildings} season={season} />
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 max-w-lg rounded-2xl border border-amber-400/30 bg-black/60 p-8 text-center backdrop-blur-xl sm:p-10">
            <h1 className="text-3xl font-bold tracking-wide text-amber-300 sm:text-4xl">
              Victory
            </h1>
            <p className="mt-3 text-base leading-relaxed text-white/80 sm:text-lg">
              Your village has grown to 50 souls.
            </p>
            <p className="mt-1 text-sm text-white/60">
              Day {day} -- {buildings.length} buildings -- {completedMilestones.size}/{MILESTONES.length} milestones
            </p>
            <button
              onClick={handleRestart}
              className="mt-8 rounded-xl bg-amber-500 px-8 py-3 text-sm font-bold uppercase tracking-widest text-black transition-all hover:bg-amber-400 hover:scale-105 active:scale-95 sm:text-base"
            >
              Play Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative w-full h-screen overflow-hidden select-none">
      <Sky season={season} weather={weather} />
      <WeatherCanvas weather={weather} season={season} />
      <Village buildings={buildings} season={season} />
      <Hud
        season={season}
        weather={weather}
        resources={resources}
        speed={speed}
        day={day}
        events={events}
        completedMilestones={completedMilestones}
        onSeasonChange={handleSeasonChange}
        onWeatherChange={handleWeatherChange}
        onSpeedChange={setSpeed}
        onBuild={handleBuild}
      />
    </main>
  );
}
