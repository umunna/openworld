// ---- Types ----
export type Season = "spring" | "summer" | "autumn" | "winter";
export type Weather = "clear" | "rain" | "snow" | "storm";

export type BuildingType = "hut" | "farm" | "lumbermill" | "market";

export interface Building {
  type: BuildingType;
  id: string;
  x: number;
}

export interface Resources {
  food: number;
  wood: number;
  gold: number;
  population: number;
}

export interface GameEvent {
  id: string;
  text: string;
  day: number;
  type: "story" | "warning" | "milestone" | "flavor";
}

// ---- Milestones ----
export interface Milestone {
  id: string;
  title: string;
  description: string;
  check: (r: Resources, b: Building[], day: number) => boolean;
}

export const MILESTONES: Milestone[] = [
  {
    id: "first-farm",
    title: "Till the Earth",
    description: "Build your first Farm",
    check: (_, b) => b.some((x) => x.type === "farm"),
  },
  {
    id: "pop-5",
    title: "Growing Community",
    description: "Reach 5 population",
    check: (r) => r.population >= 5,
  },
  {
    id: "first-mill",
    title: "Saw & Timber",
    description: "Build a Lumber Mill",
    check: (_, b) => b.some((x) => x.type === "lumbermill"),
  },
  {
    id: "first-market",
    title: "Open for Trade",
    description: "Build a Market",
    check: (_, b) => b.some((x) => x.type === "market"),
  },
  {
    id: "pop-10",
    title: "Small Village",
    description: "Reach 10 population",
    check: (r) => r.population >= 10,
  },
  {
    id: "survive-winter",
    title: "Through the Frost",
    description: "Reach Day 30",
    check: (_, __, day) => day >= 30,
  },
  {
    id: "pop-20",
    title: "Thriving Settlement",
    description: "Reach 20 population",
    check: (r) => r.population >= 20,
  },
  {
    id: "gold-100",
    title: "Prosperous",
    description: "Accumulate 100 gold",
    check: (r) => r.gold >= 100,
  },
  {
    id: "buildings-10",
    title: "Master Builder",
    description: "Construct 10 buildings",
    check: (_, b) => b.length >= 10,
  },
  {
    id: "pop-50",
    title: "The Watcher's Triumph",
    description: "Reach 50 population -- you win!",
    check: (r) => r.population >= 50,
  },
];

// ---- Starting values ----
export const STARTING_RESOURCES: Resources = {
  food: 50,
  wood: 30,
  gold: 10,
  population: 3,
};

export const STARTING_BUILDINGS: Building[] = [
  { type: "hut", id: "hut-0", x: 45 },
];

// ---- Building costs ----
const BUILDING_COSTS: Record<BuildingType, Partial<Resources>> = {
  hut: { wood: 15 },
  farm: { wood: 10, gold: 5 },
  lumbermill: { gold: 15 },
  market: { wood: 20, gold: 20 },
};

export const BUILDING_DESCRIPTIONS: Record<BuildingType, string> = {
  hut: "Houses 4 villagers",
  farm: "Produces food each day",
  lumbermill: "Produces wood each day",
  market: "Generates gold through trade",
};

export function getBuildingCost(type: BuildingType): Partial<Resources> {
  return BUILDING_COSTS[type];
}

export function canAfford(resources: Resources, cost: Partial<Resources>): boolean {
  for (const key of Object.keys(cost) as (keyof Resources)[]) {
    if ((resources[key] ?? 0) < (cost[key] ?? 0)) return false;
  }
  return true;
}

export function subtractCost(resources: Resources, cost: Partial<Resources>): Resources {
  const next = { ...resources };
  for (const key of Object.keys(cost) as (keyof Resources)[]) {
    next[key] -= cost[key] ?? 0;
  }
  return next;
}

// ---- Season multipliers (per-tick base rates) ----
const SEASON_MULTIPLIERS: Record<Season, { foodRate: number; woodRate: number; goldRate: number; growthChance: number }> = {
  spring: { foodRate: 1.2, woodRate: 1.0, goldRate: 0.8, growthChance: 0.15 },
  summer: { foodRate: 1.5, woodRate: 0.8, goldRate: 1.0, growthChance: 0.10 },
  autumn: { foodRate: 0.8, woodRate: 1.3, goldRate: 1.2, growthChance: 0.05 },
  winter: { foodRate: 0.0, woodRate: 0.5, goldRate: 0.6, growthChance: 0.02 },
};

// ---- Weather modifiers ----
const WEATHER_MODIFIERS: Record<Weather, { food: number; wood: number; gold: number; popRisk: number }> = {
  clear: { food: 1.0, wood: 1.0, gold: 1.0, popRisk: 0 },
  rain: { food: 1.3, wood: 0.7, gold: 0.9, popRisk: 0 },
  snow: { food: 0.5, wood: 0.5, gold: 0.8, popRisk: 0.02 },
  storm: { food: 0.3, wood: 0.3, gold: 0.5, popRisk: 0.05 },
};

// ---- Resource tick (called once per pseudo-day) ----
export function calculateDayTick(
  resources: Resources,
  buildings: Building[],
  season: Season,
  weather: Weather,
): Resources {
  const sm = SEASON_MULTIPLIERS[season];
  const wm = WEATHER_MODIFIERS[weather];

  const farms = buildings.filter((b) => b.type === "farm").length;
  const mills = buildings.filter((b) => b.type === "lumbermill").length;
  const markets = buildings.filter((b) => b.type === "market").length;
  const huts = buildings.filter((b) => b.type === "hut").length;

  const foodGain = (farms * 3 + 1) * sm.foodRate * wm.food;
  const woodGain = (mills * 3 + 0.5) * sm.woodRate * wm.wood;
  const goldGain = (markets * 4 + 0.3) * sm.goldRate * wm.gold;

  const foodConsumed = resources.population * 0.8;

  const maxPop = huts * 4;
  let popGrowth = 0;
  if (resources.population < maxPop && resources.food > resources.population * 2) {
    if (Math.random() < sm.growthChance) popGrowth = 1;
  }

  let popLoss = 0;
  if (wm.popRisk > 0 && Math.random() < wm.popRisk && resources.population > 1) {
    popLoss = 1;
  }
  if (resources.food <= 0 && resources.population > 1 && Math.random() < 0.15) {
    popLoss += 1;
  }

  return {
    food: Math.max(0, Math.round((resources.food + foodGain - foodConsumed) * 10) / 10),
    wood: Math.max(0, Math.round((resources.wood + woodGain) * 10) / 10),
    gold: Math.max(0, Math.round((resources.gold + goldGain) * 10) / 10),
    population: Math.max(1, resources.population + popGrowth - popLoss),
  };
}

// ---- Day-based event generation ----
const FLAVOR_EVENTS: Record<Season, string[]> = {
  spring: [
    "Wildflowers bloom across the meadow.",
    "A warm breeze carries the scent of new growth.",
    "Birds return from the south.",
  ],
  summer: [
    "Crops ripen under the golden light.",
    "Villagers celebrate the longest day.",
    "Children play by the river.",
  ],
  autumn: [
    "Leaves turn amber and crimson.",
    "The harvest is gathered in.",
    "A chill creeps into the evenings.",
  ],
  winter: [
    "Frost coats the rooftops.",
    "Villagers huddle around the fire.",
    "The river freezes solid.",
  ],
};

export function generateDayEvents(
  season: Season,
  weather: Weather,
  resources: Resources,
  day: number,
): GameEvent[] {
  const events: GameEvent[] = [];

  // Warning events -- always fire
  if (resources.food <= 5 && resources.population > 1) {
    events.push({ id: `warn-${day}`, text: "Famine threatens! Food is dangerously low.", day, type: "warning" });
  }
  if (weather === "storm") {
    events.push({ id: `storm-${day}`, text: "The storm rages -- villagers are at risk!", day, type: "warning" });
  }
  if (resources.food <= 0 && resources.population > 1) {
    events.push({ id: `starve-${day}`, text: "People are starving! Build farms or change the season!", day, type: "warning" });
  }

  // Flavor event -- 30% chance per day
  if (Math.random() < 0.30) {
    const pool = FLAVOR_EVENTS[season];
    const text = pool[Math.floor(Math.random() * pool.length)];
    events.push({ id: `flav-${day}-${Math.random().toString(36).slice(2, 6)}`, text, day, type: "flavor" });
  }

  return events;
}
