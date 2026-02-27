"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ClockPanel, type TimeValues } from "./clock-panel";
import { Grass } from "./grass";

const INITIAL_TIME: TimeValues = {
  days: "0",
  hours: "00",
  minutes: "00",
  seconds: "00",
  ms: "00",
};

function pad(n: number, d: number): string {
  return String(n).padStart(d, "0");
}

export function Sim() {
  const [realTime, setRealTime] = useState<TimeValues>(INITIAL_TIME);
  const [pseudoTime, setPseudoTime] = useState<TimeValues>(INITIAL_TIME);
  const [speed, setSpeed] = useState(10);

  const pseudoElapsedRef = useRef(0);
  const lastTickRef = useRef(0);
  const speedRef = useRef(10);

  // Keep speedRef in sync with state
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Real time: days since Jan 1 of current year, plus H:M:S:Ms
  const updateRealTime = useCallback(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - yearStart.getTime();

    setRealTime({
      days: String(Math.floor(diff / 86400000)),
      hours: pad(now.getHours(), 2),
      minutes: pad(now.getMinutes(), 2),
      seconds: pad(now.getSeconds(), 2),
      ms: pad(Math.floor(now.getMilliseconds() / 10), 2),
    });
  }, []);

  // Pseudo time: accumulates elapsed time multiplied by speed
  const updatePseudoTime = useCallback((now: number) => {
    const delta = now - lastTickRef.current;
    lastTickRef.current = now;
    pseudoElapsedRef.current += delta * speedRef.current;

    const totalSec = Math.floor(pseudoElapsedRef.current / 1000);
    const ms = Math.floor((pseudoElapsedRef.current % 1000) / 10);

    setPseudoTime({
      days: String(Math.floor(totalSec / 86400)),
      hours: pad(Math.floor(totalSec / 3600) % 24, 2),
      minutes: pad(Math.floor(totalSec / 60) % 60, 2),
      seconds: pad(totalSec % 60, 2),
      ms: pad(ms, 2),
    });
  }, []);

  // Animation loop using requestAnimationFrame
  useEffect(() => {
    lastTickRef.current = performance.now();

    let rafId: number;
    function tick(now: number) {
      updateRealTime();
      updatePseudoTime(now);
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [updateRealTime, updatePseudoTime]);

  return (
    <>
      {/* Sun */}
      <div
        className="pointer-events-none fixed right-6 top-6 z-0 h-14 w-14 rounded-full sm:right-10 sm:top-8 sm:h-16 sm:w-16 md:right-16 md:top-10 md:h-20 md:w-20"
        style={{
          background:
            "radial-gradient(circle, #ffe066 30%, #ffb347 70%, transparent 100%)",
          boxShadow: "0 0 60px 20px rgba(255, 224, 102, 0.4)",
        }}
        aria-hidden="true"
      />

      {/* Clouds */}
      <div
        className="pointer-events-none fixed left-0 top-12 z-0 h-8 w-24 rounded-[50px] bg-white/70 sm:top-14 sm:h-10 sm:w-32 md:top-16 md:h-12 md:w-40"
        style={{ animation: "drift 45s linear infinite" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed left-0 top-24 z-0 h-6 w-20 rounded-[50px] bg-white/50 sm:top-28 sm:h-8 sm:w-24 md:top-32 md:h-9 md:w-28"
        style={{ animation: "drift 60s linear infinite 10s" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed left-0 top-6 z-0 h-7 w-28 rounded-[50px] bg-white/60 sm:top-7 sm:h-10 sm:w-40 md:top-8 md:h-14 md:w-48"
        style={{ animation: "drift 55s linear infinite 25s" }}
        aria-hidden="true"
      />

      {/* Title */}
      <h1
        className="z-[2] mt-6 text-2xl font-bold uppercase tracking-[0.15em] text-green-950 sm:mt-8 sm:text-3xl md:mt-10 md:text-4xl"
        style={{ textShadow: "0 2px 8px rgba(255,255,255,0.3)" }}
      >
        {"Sim"}
      </h1>

      {/* Clock panels */}
      <div className="z-[2] mt-6 flex flex-col items-center gap-4 px-4 sm:mt-8 sm:gap-6 md:flex-row">
        {/* Real Time */}
        <ClockPanel label="Real Time" time={realTime} variant="realtime" />

        {/* Pseudo Time */}
        <ClockPanel label="Pseudo Time" time={pseudoTime} variant="pseudotime">
          <div className="mt-1 flex items-center gap-2.5">
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-green-950/60 sm:text-[0.7rem]">
              {"Speed"}
            </span>
            <input
              type="range"
              min={1}
              max={100}
              value={speed}
              onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
              className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-green-900/20 accent-green-700 sm:w-24"
              aria-label="Speed multiplier"
            />
            <span className="min-w-[28px] text-center text-xs font-bold text-green-950 sm:text-sm">
              {speed}{"x"}
            </span>
          </div>
        </ClockPanel>
      </div>

      {/* Grass */}
      <Grass />
    </>
  );
}
