"use client";

import { useEffect, useRef } from "react";

export function Grass() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isMobile = window.innerWidth < 600;
    const bladeCount = isMobile ? 400 : 1000;

    for (let i = 0; i < bladeCount; i++) {
      const blade = document.createElement("div");
      blade.classList.add("blade");
      blade.style.left = `${Math.random() * 100}%`;
      blade.style.height = `${30 + Math.random() * 80}px`;
      blade.style.animationDelay = `${(Math.random() * 2).toFixed(2)}s`;
      container.appendChild(blade);
    }

    return () => {
      container.innerHTML = "";
    };
  }, []);

  return <div className="grass" ref={containerRef} aria-hidden="true" />;
}
