"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ClockPanel } from "./clock-panel";

function pad(n: number, d: number) {
  return String(n).padStart(d, "0");
}

export function Sim() {
  const [realTime, setRealTime] = useState({
    days: 0,
    hours: "00",
    minutes: "00",
    seconds: "00",
    ms: "00",
  });

  const [pseudoTime, setPseudoTime] = useState({
    days: 0,
    hours: "00",
    minutes: "00",
    seconds: "00",
    ms: "00",
  });

  const [speed, setSpeed] = useState(10);
  const pseudoElapsedRef = useRef(0);
  const lastTickRef = useRef(0);
  const speedRef = useRef(10);

  // Keep speedRef in sync
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const updateRealTime = useCallback(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - yearStart.getTime();

    const days = Math.floor(diff / 86400000);
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ms = now.getMilliseconds();

    setRealTime({
      days,
      hours: pad(hours, 2),
      minutes: pad(minutes, 2),
      seconds: pad(seconds, 2),
      ms: pad(Math.floor(ms / 10), 2),
    });
  }, []);

  const updatePseudoTime = useCallback((now: number) => {
    const delta = now - lastTickRef.current;
    lastTickRef.current = now;
    pseudoElapsedRef.current += delta * speedRef.current;

    const totalSec = Math.floor(pseudoElapsedRef.current / 1000);
    const ms = Math.floor((pseudoElapsedRef.current % 1000) / 10);
    const sec = totalSec % 60;
    const min = Math.floor(totalSec / 60) % 60;
    const hr = Math.floor(totalSec / 3600) % 24;
    const d = Math.floor(totalSec / 86400);

    setPseudoTime({
      days: d,
      hours: pad(hr, 2),
      minutes: pad(min, 2),
      seconds: pad(sec, 2),
      ms: pad(ms, 2),
    });
  }, []);

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
      {/* Decorative elements */}
      <div className="sun" aria-hidden="true" />
      <div className="cloud cloud-1" aria-hidden="true" />
      <div className="cloud cloud-2" aria-hidden="true" />
      <div className="cloud cloud-3" aria-hidden="true" />

      <h1 className="sim-title">Sim</h1>

      <div className="clocks-wrapper">
        <ClockPanel label="Real Time" time={realTime} className="realtime" />

        <ClockPanel label="Pseudo Time" time={pseudoTime} className="pesudotime">
          <div className="speed-control">
            <label htmlFor="speed-slider">Speed</label>
            <input
              type="range"
              id="speed-slider"
              min={1}
              max={100}
              value={speed}
              onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
            />
            <span className="speed-value">{speed}x</span>
          </div>
        </ClockPanel>
      </div>
    </>
  );
}
