// ---- Types ----
export type Season = "spring" | "summer" | "autumn" | "winter";
export type Weather = "clear" | "rain" | "snow" | "storm";

export type BuildingType = "hut" | "farm" | "lumbermill" | "market";

export interface Building {
  type: BuildingType;
  id: string;
  x: number; // percent position on ground
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
  timestamp: number; // pseudo-time ms
}

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

// ---- Season multipliers (per-second base rates) ----
const SEASON_MULTIPLIERS: Record<Season, { foodRate: number; woodRate: number; goldRate: number; growthChance: number }> = {
  spring: { foodRate: 1.2, woodRate: 1.0, goldRate: 0.8, growthChance: 0.03 },
  summer: { foodRate: 1.5, woodRate: 0.8, goldRate: 1.0, growthChance: 0.02 },
  autumn: { foodRate: 0.8, woodRate: 1.3, goldRate: 1.2, growthChance: 0.01 },
  winter: { foodRate: 0.0, woodRate: 0.5, goldRate: 0.6, growthChance: 0.005 },
};

// ---- Weather modifiers (multiply on top of season) ----
const WEATHER_MODIFIERS: Record<Weather, { food: number; wood: number; gold: number; popRisk: number }> = {
  clear: { food: 1.0, wood: 1.0, gold: 1.0, popRisk: 0 },
  rain: { food: 1.3, wood: 0.7, gold: 0.9, popRisk: 0 },
  snow: { food: 0.5, wood: 0.5, gold: 0.8, popRisk: 0.005 },
  storm: { food: 0.3, wood: 0.3, gold: 0.5, popRisk: 0.02 },
};

// ---- Resource tick ----
export function calculateTick(
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

  // Base production per building per tick
  const foodGain = (farms * 2 + 0.5) * sm.foodRate * wm.food;
  const woodGain = (mills * 2 + 0.3) * sm.woodRate * wm.wood;
  const goldGain = (markets * 3 + 0.2) * sm.goldRate * wm.gold;

  // Population consumes food
  const foodConsumed = resources.population * 0.3;

  // Population growth chance (needs huts and food)
  const maxPop = huts * 4;
  let popGrowth = 0;
  if (resources.population < maxPop && resources.food > 10) {
    if (Math.random() < sm.growthChance) popGrowth = 1;
  }

  // Population loss risk from harsh weather
  let popLoss = 0;
  if (wm.popRisk > 0 && Math.random() < wm.popRisk && resources.population > 1) {
    popLoss = 1;
  }

  // Starvation
  if (resources.food <= 0 && resources.population > 1 && Math.random() < 0.05) {
    popLoss += 1;
  }

  return {
    food: Math.max(0, resources.food + foodGain - foodConsumed),
    wood: Math.max(0, resources.wood + woodGain),
    gold: Math.max(0, resources.gold + goldGain),
    population: Math.max(1, resources.population + popGrowth - popLoss),
  };
}

// ---- Event generation ----
const SEASON_EVENTS: Record<Season, string[]> = {
  spring: [
    "Wildflowers bloom across the meadow.",
    "A warm breeze carries the scent of new growth.",
    "Seedlings sprout in the fields.",
    "Birds return from the south.",
  ],
  summer: [
    "The sun blazes overhead.",
    "Crops ripen under the golden light.",
    "A heat wave bakes the land.",
    "Villagers celebrate the longest day.",
  ],
  autumn: [
    "Leaves turn amber and crimson.",
    "The harvest is gathered in.",
    "Geese fly south overhead.",
    "A chill creeps into the evenings.",
  ],
  winter: [
    "Frost coats the rooftops.",
    "Villagers huddle around the fire.",
    "The river freezes solid.",
    "A blanket of silence covers the land.",
  ],
};

const WEATHER_EVENTS: Record<Weather, string[]> = {
  clear: ["Clear skies stretch to the horizon."],
  rain: ["Rain patters against the rooftops.", "Puddles form along the paths."],
  snow: ["Snowflakes drift down gently.", "The world turns white."],
  storm: [
    "Thunder cracks across the sky!",
    "Lightning illuminates the village!",
    "A violent gust tears through the trees!",
  ],
};

export function generateEvent(
  season: Season,
  weather: Weather,
  resources: Resources,
  pseudoMs: number,
): GameEvent | null {
  // 8% chance per tick to fire an event
  if (Math.random() > 0.08) return null;

  let pool: string[] = [];

  // Resource-based events
  if (resources.food <= 5 && resources.population > 1) {
    pool.push("Famine threatens the village!");
  }
  if (resources.population >= 10) {
    pool.push("The village is thriving!");
  }
  if (weather === "storm" && Math.random() < 0.3) {
    pool.push("A building was damaged by the storm!");
  }

  // Season + weather flavor
  pool = pool.concat(SEASON_EVENTS[season]);
  if (Math.random() < 0.4) {
    pool = pool.concat(WEATHER_EVENTS[weather]);
  }

  const text = pool[Math.floor(Math.random() * pool.length)];
  return { id: `evt-${Date.now()}-${Math.random()}`, text, timestamp: pseudoMs };
}
