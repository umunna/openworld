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
  calculateTick,
  getBuildingCost,
  canAfford,
  subtractCost,
  generateEvent,
} from "@/lib/game-engine";
import { Sky } from "./sky";
import { WeatherCanvas } from "./weather-canvas";
import { Village } from "./village";
import { Hud } from "./hud";

export function Game() {
  const [season, setSeason] = useState<Season>("spring");
  const [weather, setWeather] = useState<Weather>("clear");
  const [speed, setSpeed] = useState(10);
  const [resources, setResources] = useState<Resources>(STARTING_RESOURCES);
  const [buildings, setBuildings] = useState<Building[]>(STARTING_BUILDINGS);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [pseudoMs, setPseudoMs] = useState(0);

  const lastTickRef = useRef(performance.now());
  const accumulatorRef = useRef(0);
  const rafRef = useRef(0);
  const idRef = useRef(0);
  const nextId = () => ++idRef.current;

  // Refs to always have latest state in rAF loop without re-creating it
  const stateRef = useRef({ resources, buildings, season, weather, speed, pseudoMs });
  useEffect(() => {
    stateRef.current = { resources, buildings, season, weather, speed, pseudoMs };
  }, [resources, buildings, season, weather, speed, pseudoMs]);

  // Game loop
  useEffect(() => {
    const TICK_INTERVAL = 1000; // 1 resource tick per pseudo-second

    const loop = (now: number) => {
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      const s = stateRef.current;

      if (s.speed > 0) {
        const pseudoDelta = delta * s.speed;
        const newPseudoMs = s.pseudoMs + pseudoDelta;
        setPseudoMs(newPseudoMs);

        accumulatorRef.current += pseudoDelta;

        // Process resource ticks
        if (accumulatorRef.current >= TICK_INTERVAL) {
          const ticks = Math.floor(accumulatorRef.current / TICK_INTERVAL);
          accumulatorRef.current -= ticks * TICK_INTERVAL;

          setResources((prev) => {
            let r = prev;
            for (let i = 0; i < Math.min(ticks, 10); i++) {
              r = calculateTick(r, s.buildings, s.season, s.weather);
            }
            return r;
          });

          // Events (check once per batch)
          const evt = generateEvent(s.season, s.weather, s.resources, newPseudoMs);
          if (evt) {
            setEvents((prev) => [...prev.slice(-50), evt]);
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleBuild = useCallback((type: BuildingType) => {
    const cost = getBuildingCost(type);
    setResources((prev) => {
      if (!canAfford(prev, cost)) return prev;
      // Place building at a random position, avoiding edges
      const x = 10 + Math.random() * 80;
      setBuildings((prevB) => [
        ...prevB,
        { type, id: `${type}-${nextId()}`, x },
      ]);

      const newRes = subtractCost(prev, cost);
      setEvents((prevE) => [
        ...prevE.slice(-50),
        {
          id: `build-${nextId()}`,
          text: `A new ${type} has been erected.`,
          timestamp: stateRef.current.pseudoMs,
        },
      ]);
      return newRes;
    });
  }, []);

  const handleSeasonChange = useCallback((s: Season) => {
    setSeason(s);
    setEvents((prev) => [
      ...prev.slice(-50),
      {
        id: `season-${nextId()}`,
        text: `The Watcher shifts the world to ${s}.`,
        timestamp: stateRef.current.pseudoMs,
      },
    ]);
  }, []);

  const handleWeatherChange = useCallback((w: Weather) => {
    setWeather(w);
    setEvents((prev) => [
      ...prev.slice(-50),
      {
        id: `weather-${nextId()}`,
        text: w === "clear"
          ? "The skies clear."
          : w === "rain"
            ? "Rain begins to fall."
            : w === "snow"
              ? "Snow drifts down from the heavens."
              : "A fierce storm descends!",
        timestamp: stateRef.current.pseudoMs,
      },
    ]);
  }, []);

  const pseudoDays = Math.floor(pseudoMs / 86400000);

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
        pseudoDays={pseudoDays}
        events={events}
        onSeasonChange={handleSeasonChange}
        onWeatherChange={handleWeatherChange}
        onSpeedChange={setSpeed}
        onBuild={handleBuild}
      />
    </main>
  );
}
