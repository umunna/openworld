# The Watcher -- Architecture & Review

> Last updated with a full audit of every file in the project.

---

## File Map (14 files)

```
/
  app/
    globals.css           -- Tailwind directives + keyframe animations (sway, drift, scrollbar)
    layout.tsx            -- Root layout: Inter font, metadata, viewport
    page.tsx              -- Entry point: renders <Game />
  components/
    game.tsx              -- Main orchestrator: state, rAF game loop, event wiring
    hud.tsx               -- Bottom HUD: resources, season/weather/build controls, speed, event log
    sky.tsx               -- Season-aware background: gradients, sun/moon, clouds, grass blades
    village.tsx           -- Building sprites on the grass line (hut, farm, mill, market)
    weather-canvas.tsx    -- Full-screen <canvas> particle system (rain, snow, storm, leaves)
  lib/
    game-engine.ts        -- Pure functions: types, resource ticks, costs, multipliers, events
  next.config.mjs         -- Empty Next.js config
  package.json            -- Next 16, React 19, Tailwind 3
  postcss.config.mjs      -- Standard Tailwind + Autoprefixer
  tailwind.config.ts      -- Content paths, Inter font-family
  tsconfig.json           -- Standard Next.js TS config with @/* alias
```

---

## Data Flow

```
page.tsx
  -> Game (client component, owns ALL state)
       |
       |-- season, weather, speed, resources, buildings, events, pseudoMs
       |
       |-- requestAnimationFrame loop:
       |     1. Calculates pseudoDelta = realDelta * speed
       |     2. Accumulates pseudo-ms, fires resource tick per pseudo-second
       |     3. Calls calculateTick() from game-engine (pure function)
       |     4. Calls generateEvent() for flavor text
       |
       |-- Renders:
       |     <Sky season weather />
       |     <WeatherCanvas weather season />
       |     <Village buildings season />
       |     <Hud season weather resources speed pseudoDays events callbacks />
```

All state is in `game.tsx`. Child components are pure renderers that receive props.

---

## Known Issues & Improvement Areas

### 1. STALE STATE IN rAF LOOP (HIGH)

**File:** `game.tsx` lines 40-44, 48-86

**Problem:** The game loop runs inside a `useEffect([], [])` (mount-only) and uses a `stateRef` to read latest state. This works but has a subtle race:
- `setResources()` uses a functional updater `(prev) => ...` which is correct.
- BUT inside that updater, `setBuildings()` is called -- this is a **nested setState call inside another setState updater**. React batches these, but it is an anti-pattern. If two builds happen in the same frame, the second `setBuildings` call could overwrite the first.

**Fix:** Move building placement out of the `setResources` updater. Use a separate handler that first checks affordability from a ref, then calls `setResources` and `setBuildings` sequentially.

---

### 2. PSEUDO-TIME AS STATE + REF SYNC (MEDIUM)

**File:** `game.tsx` lines 33, 42

**Problem:** `pseudoMs` is React state AND is read from `stateRef.current.pseudoMs` inside the rAF loop. Every frame calls `setPseudoMs(newPseudoMs)` which triggers a re-render on every animation frame. At 60fps this is 60 re-renders/second.

**Fix:** Keep `pseudoMs` only in a ref. Derive the displayed `pseudoDays` in a second `useState` that updates once per pseudo-day (every 86400 pseudo-seconds) instead of every frame. Or use a separate `requestAnimationFrame`-driven display ticker that reads from the ref.

---

### 3. GRASS BLADE COUNT (MEDIUM)

**File:** `sky.tsx` lines 53-64

**Problem:** 600 DOM elements (or 300 in winter) for grass blades. Each is an absolutely positioned `<div>` with a CSS animation. On low-end mobile devices this could cause jank. The `useEffect` regenerates all blades when `isWinter` changes, which is correct but causes a flash of empty grass during the transition.

**Fix options:**
- Render grass blades on a `<canvas>` like the weather particles, eliminating 600 DOM nodes.
- Or keep DOM blades but reduce count further on mobile by checking `window.innerWidth` in the effect.
- For the transition flash: cross-fade two blade sets instead of replacing in-place.

---

### 4. NO BUILDING LIMIT OR PLACEMENT VALIDATION (LOW-MEDIUM)

**File:** `game.tsx` line 95 and `village.tsx`

**Problem:** Buildings are placed at `10 + Math.random() * 80` percent -- they can overlap each other. There is no cap on total buildings. With enough resources a player can spam 50+ markets and the landscape becomes unreadable.

**Fix:** Add a max-building-count per type (e.g., huts: 10, farms: 8, mills: 5, markets: 3). Add minimum distance checking between `x` positions. Show a "No space!" event if placement fails.

---

### 5. EVENT LOG NOT USING CSS CLASS (LOW)

**File:** `hud.tsx` line 78, `globals.css` lines 37-45

**Problem:** `globals.css` defines an `.event-log` scrollbar style, but the event log `<div>` in `hud.tsx` does not apply that class. The custom scrollbar styles are dead CSS.

**Fix:** Add `className="... event-log"` to the event log wrapper in `hud.tsx`.

---

### 6. HUD SVG ICON PATHS NEVER RENDERED (LOW)

**File:** `hud.tsx` lines 29-32

**Problem:** Each season in the `SEASONS` array has an `icon` property containing an SVG path string, but it is never used in the render. The buttons only show text labels.

**Fix:** Either render the SVG paths as inline `<svg>` icons next to the labels, or remove the unused `icon` fields to reduce dead code.

---

### 7. `text-foreground` WITHOUT CSS VARIABLE (LOW)

**File:** `village.tsx` -- multiple lines use `text-foreground/60`

**Problem:** The Tailwind class `text-foreground` requires a `--foreground` CSS variable defined in `globals.css` or the Tailwind config. This project has neither. The class silently fails and the text inherits whatever color is available (likely black), which accidentally works but is fragile.

**Fix:** Add `--foreground` to globals.css or replace with explicit `text-neutral-800/60`.

---

### 8. WEATHER + SEASON INDEPENDENCE (DESIGN CONSIDERATION)

**Current behavior:** The god can set any weather in any season (snow in summer, storms in spring, etc.). This is by design ("full control, mini god").

**Consideration:** There are no consequences or bonuses for thematic combos. Rain in spring could boost crop growth extra. Snow in summer could cause a plague event. This would add strategic depth.

---

### 9. NO SAVE/LOAD (FUTURE)

**Current:** All game state is ephemeral -- refreshing the page resets everything. For a god game this is expected in an MVP, but longer sessions would benefit from persistence.

**Options:** `localStorage` for quick saves, or a database integration (Supabase/Neon) for persistent worlds.

---

### 10. POPULATION LOGIC (BALANCE)

**File:** `game-engine.ts` lines 107-121

**Observations:**
- Population can only grow by 1 per tick (resource tick = 1 pseudo-second). At speed 1x, reaching 20 pop takes a long time even in ideal conditions.
- `growthChance` in winter is 0.005 (0.5%) per tick -- this is fine but slow.
- Starvation kills at 5% chance per tick when food = 0. At speed 100x, 100 ticks fire per second, so starvation is essentially guaranteed in 1 real second. This might feel sudden to the player.
- `maxPop = huts * 4`: the starting hut supports 4 people. Building more huts is critical early.

**Balance suggestion:** Show a warning event when food drops below 10. Add a "famine grace period" of 3-5 pseudo-seconds before starvation begins.

---

## Architecture Quality

| Area | Status | Notes |
|------|--------|-------|
| Separation of concerns | Good | Engine is pure, components are renderers, game.tsx orchestrates |
| Type safety | Good | All types exported from game-engine, props are typed |
| Responsiveness | Good | sm: breakpoints throughout HUD and village sprites |
| Performance | Fair | 600 DOM grass blades + 60fps setState are the two bottlenecks |
| Accessibility | Fair | aria-hidden on decorative elements, but HUD buttons lack aria-labels |
| Code reuse | Good | BuildingSprite switch, ResourceBadge, CostTag are extracted |
| State management | Fair | Works but the nested-setState and per-frame re-render need addressing |

---

## Quick Priority List

1. Fix nested setState in `game.tsx` handleBuild
2. Throttle `pseudoMs` re-renders (use ref + derived state)
3. Add `event-log` class to HUD scroll container
4. Add `--foreground` CSS variable or replace `text-foreground`
5. Remove or render the unused SVG icon paths in HUD
6. Add building placement limits and overlap prevention
7. Consider canvas-based grass for mobile performance
