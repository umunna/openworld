"use client";

import { useRef, useEffect, useCallback } from "react";
import type { Weather, Season } from "@/lib/game-engine";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  rotation?: number;
  rotSpeed?: number;
}

interface WeatherCanvasProps {
  weather: Weather;
  season: Season;
}

export function WeatherCanvas({ weather, season }: WeatherCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const flashRef = useRef(0);

  const initParticles = useCallback(
    (w: number, h: number) => {
      const particles: Particle[] = [];

      if (weather === "rain" || weather === "storm") {
        const count = weather === "storm" ? 500 : 250;
        for (let i = 0; i < count; i++) {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: weather === "storm" ? -2 - Math.random() * 3 : -0.5,
            vy: 8 + Math.random() * 6,
            size: 1 + Math.random() * 1.5,
            opacity: 0.3 + Math.random() * 0.4,
          });
        }
      }

      if (weather === "snow") {
        const count = 200;
        for (let i = 0; i < count; i++) {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: Math.sin(Math.random() * Math.PI * 2) * 0.5,
            vy: 0.5 + Math.random() * 1.5,
            size: 2 + Math.random() * 4,
            opacity: 0.5 + Math.random() * 0.5,
          });
        }
      }

      // Autumn leaves regardless of weather
      if (season === "autumn") {
        const count = 40;
        for (let i = 0; i < count; i++) {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: 0.5 + Math.random() * 1.5,
            vy: 0.8 + Math.random() * 1.2,
            size: 4 + Math.random() * 6,
            opacity: 0.6 + Math.random() * 0.4,
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 3,
          });
        }
      }

      particlesRef.current = particles;
    },
    [weather, season],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener("resize", resize);

    const LEAF_COLORS = ["#c27830", "#a0522d", "#d2691e", "#b8860b", "#8b4513"];

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Lightning flash for storms
      if (weather === "storm" && flashRef.current > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashRef.current})`;
        ctx.fillRect(0, 0, w, h);
        flashRef.current -= 0.04;
      }
      if (weather === "storm" && Math.random() < 0.005) {
        flashRef.current = 0.6;
      }

      for (const p of particlesRef.current) {
        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.y > h) {
          p.y = -10;
          p.x = Math.random() * w;
        }
        if (p.x < -20) p.x = w + 10;
        if (p.x > w + 20) p.x = -10;

        // Draw rain
        if ((weather === "rain" || weather === "storm") && p.rotation === undefined) {
          ctx.strokeStyle = `rgba(174, 194, 224, ${p.opacity})`;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
          ctx.stroke();
        }

        // Draw snow
        if (weather === "snow" && p.rotation === undefined) {
          p.vx = Math.sin(p.y * 0.01) * 0.5; // gentle sway
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx.fill();
        }

        // Draw autumn leaves
        if (p.rotation !== undefined) {
          p.rotation += p.rotSpeed ?? 0;
          p.vx = Math.sin(p.y * 0.005) * 1.5; // float side to side
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = LEAF_COLORS[Math.floor(p.opacity * LEAF_COLORS.length) % LEAF_COLORS.length];
          ctx.globalAlpha = p.opacity;
          // Leaf shape
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [weather, season, initParticles]);

  // Nothing to render in clear weather with no autumn leaves
  if (weather === "clear" && season !== "autumn") return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-10 pointer-events-none"
      aria-hidden="true"
    />
  );
}
