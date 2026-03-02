# The Watcher -- Architecture & Review

> Last updated after gameplay overhaul: intro screen, milestones, day-based ticking, victory condition.

---

## File Map (14 files)

```
/
  app/
    globals.css           -- Tailwind directives + keyframe animations (sway, drift, scrollbar)
    layout.tsx            -- Root layout: Inter font, metadata, viewport
    page.tsx              -- Entry point: renders <Game />
  components/
    game.tsx              -- Main orchestrator: intro/playing/victory phases, day-based rAF loop, milestone checks
    hud.tsx               -- Bottom HUD: resources, controls, event log, milestone tracker + objective display
    sky.tsx               -- Season-aware background: gradients, sun/moon, clouds, grass blades
    village.tsx           -- Building sprites on the grass line (hut, farm, mill, market)
    weather-canvas.tsx    -- Full-screen <canvas> particle system (rain, snow, storm, leaves)
  lib/
    game-engine.ts        -- Types, milestones, resource ticks (per-day), costs, multipliers, day events
  next.config.mjs         -- Empty Next.js config
  package.json            -- Next 16, React 19, Tailwind 3
  postcss.config.mjs      -- Standard Tailwind + Autoprefixer
  tailwind.config.ts      -- Content paths, Inter font-family
  tsconfig.json           -- Standard Next.js TS config with @/* alias
```

---

## Game Design

**Storyline: "The Watcher"**
You are a god overseeing a patch of earth. One hut, three settlers. Control seasons, weather, and construction to grow the village to 50 population.

**Three phases:**
1. **Intro** -- Story overlay explaining controls and goal. Click "Begin" to start.
2. **Playing** -- Real-time god game. Days tick based on pseudo-time speed.
3. **Victory** -- Reached 50 population. Shows stats. "Play Again" restarts.

**10 Milestones (progressive goals):**
1. Till the Earth (build first farm)
2. Growing Community (5 pop)
3. Saw & Timber (build lumber mill)
4. Open for Trade (build market)
5. Small Village (10 pop)
6. Through the Frost (reach day 30)
7. Thriving Settlement (20 pop)
8. Prosperous (100 gold)
9. Master Builder (10 buildings)
10. The Watcher's Triumph (50 pop -- win!)

**Current objective** always shown top-left. Milestone panel toggleable top-right.

---

## Data Flow

```
page.tsx
  -> Game (client component, owns ALL state)
       |
       |-- phase: "intro" | "playing" | "victory"
       |-- season, weather, speed, resources, buildings, events, day
       |-- completedMilestones: Set<string>
       |
       |-- rAF loop (only runs in "playing" phase):
       |     1. Accumulates realDelta * speed
       |     2. Every 3000ms of pseudo-time = 1 day
       |     3. Calls calculateDayTick() once per day (not per frame)
       |     4. Calls generateDayEvents() once per day
       |     5. Day counter increments
       |
       |-- useEffect checks milestones on resources/buildings/day changes
       |     -> Fires milestone events into log
       |     -> Triggers victory phase on "pop-50"
       |
       |-- Renders per phase:
       |     intro:   <Sky /> + overlay with story + "Begin" button
       |     playing: <Sky /> + <WeatherCanvas /> + <Village /> + <Hud />
       |     victory: <Sky /> + <Village /> + overlay with stats + "Play Again"
```

---

## Key Changes from Previous Version

| Before | After |
|--------|-------|
| Resources ticked per pseudo-second (60x per real second at speed 10) | Resources tick once per pseudo-day (every 3s real at 1x, 300ms at 10x) |
| Events fired 8% chance per tick (spam) | Events fire once per day, meaningful categories |
| No intro, no goals, no direction | Intro screen, 10 milestones, victory condition |
| All events showed "Day 0" | Day counter increments properly, events tagged by day |
| Event log was single color | 4 event types: story (white), flavor (gray italic), warning (red), milestone (gold bold) |
| Speed went to 100x (insane tick rate) | Speed capped at 50x |
| No way to understand buildings | Tooltips on build buttons explain what each does |
| `generateEvent` used `Date.now()` for IDs | Uses `day` + random suffix for unique, readable IDs |
| `pseudoMs` state updated every frame (60 re-renders/s) | Only `day` is state; no per-frame state updates |

---

## Remaining Issues

### 1. NESTED setState IN handleBuild (MEDIUM)

**File:** `game.tsx` handleBuild callback

`setResources()` functional updater calls `setBuildings()` inside it. React batches these but it's an anti-pattern. Rapid builds could lose a building.

**Fix:** Check affordability from a ref, then call `setResources` and `setBuildings` separately.

---

### 2. GRASS BLADE DOM COUNT (MEDIUM)

**File:** `sky.tsx`

600 animated DOM nodes for grass. Works on desktop, could cause jank on low-end mobile.

**Fix:** Render grass on a canvas, or reduce to 200 on mobile with a width check.

---

### 3. BUILDING OVERLAP (LOW-MEDIUM)

**File:** `game.tsx` handleBuild, `village.tsx`

Buildings placed at random X positions with no overlap check. 20+ buildings become unreadable.

**Fix:** Add min-distance checking between X positions. Cap building count per type.

---

### 4. `text-foreground` WITHOUT CSS VARIABLE (LOW)

**File:** `village.tsx`

Uses `text-foreground/60` but no `--foreground` variable is defined.

**Fix:** Replace with `text-neutral-800/60` or add the CSS variable.

---

### 5. EVENT LOG SCROLLBAR CLASS (LOW)

**File:** `hud.tsx`, `globals.css`

`globals.css` defines `.event-log` scrollbar styles but the HUD div doesn't use that class.

**Fix:** Add `event-log` to the log wrapper className.

---

### 6. NO SAVE/LOAD (FUTURE)

All state is ephemeral. Refresh = reset. Fine for MVP.

**Options:** localStorage for quick saves, or database integration for persistent worlds.

---

### 7. SEASON/WEATHER COMBOS (FUTURE DEPTH)

Rain in spring could give a crop bonus. Snow in summer could trigger a plague. Currently no special combo logic exists.

---

## Architecture Quality

| Area | Status | Notes |
|------|--------|-------|
| Game direction | Good | Intro, 10 milestones, win condition, clear objectives |
| Event pacing | Good | Day-based, categorized, no spam |
| Separation of concerns | Good | Engine is pure, components are renderers |
| Type safety | Good | All types exported from game-engine |
| Responsiveness | Good | sm: breakpoints throughout |
| Performance | Fair | 600 DOM grass blades is the main bottleneck |
| Accessibility | Fair | aria-hidden on decoratives, but buttons lack aria-labels |
| State management | Fair | Works but nested setState in handleBuild is fragile |

---

## Priority List

1. Fix nested setState in handleBuild
2. Add `event-log` class to HUD log wrapper
3. Replace `text-foreground` with explicit color
4. Add building placement limits
5. Consider canvas grass for mobile
6. Add season/weather combo bonuses
7. Add save/load system
