// ---- Types ----
export type Season = "spring" | "summer" | "autumn" | "winter";
export type Weather = "clear" | "rain" | "snow" | "storm";
export type BuildingType = "hut" | "farm" | "lumbermill" | "market";
export type Rations = "full" | "half" | "none";

export interface Building {
  type: BuildingType;
  id: string;
  x: number;
  damaged: boolean;
}

export interface Resources {
  food: number;
  wood: number;
  gold: number;
  population: number;
  morale: number;
}

export interface GameEvent {
  id: string;
  text: string;
  day: number;
  type: "story" | "warning" | "milestone" | "flavor" | "diplomacy" | "war";
}

// ---- Rival villages ----
export type RivalPersonality = "peaceful" | "aggressive" | "trader";
export type RivalStatus = "neutral" | "allied" | "hostile" | "conquered" | "tradepact";
export type DiplomacyAction = "trade" | "alliance" | "tribute" | "war";

export interface RivalVillage {
  id: string;
  name: string;
  personality: RivalPersonality;
  population: number;
  strength: number;
  wealth: number;
  relation: number; // -100 to +100
  status: RivalStatus;
  visible: boolean;
  spawnAt: number; // player pop threshold
}

export const RIVAL_TEMPLATES: RivalVillage[] = [
  { id: "thornfield", name: "Thornfield", personality: "peaceful", population: 8, strength: 5, wealth: 20, relation: 10, status: "neutral", visible: false, spawnAt: 15 },
  { id: "ironhold", name: "Ironhold", personality: "aggressive", population: 12, strength: 12, wealth: 15, relation: -10, status: "neutral", visible: false, spawnAt: 25 },
  { id: "goldmere", name: "Goldmere", personality: "trader", population: 10, strength: 6, wealth: 50, relation: 5, status: "neutral", visible: false, spawnAt: 40 },
];

// ---- Milestones ----
export interface Milestone {
  id: string;
  title: string;
  description: string;
  check: (r: Resources, b: Building[], day: number, rivals: RivalVillage[]) => boolean;
}

export const MILESTONES: Milestone[] = [
  { id: "first-farm", title: "Till the Earth", description: "Build your first Farm", check: (_, b) => b.some((x) => x.type === "farm") },
  { id: "pop-5", title: "Growing Community", description: "Reach 5 population", check: (r) => r.population >= 5 },
  { id: "first-mill", title: "Saw & Timber", description: "Build a Lumber Mill", check: (_, b) => b.some((x) => x.type === "lumbermill") },
  { id: "first-market", title: "Open for Trade", description: "Build a Market", check: (_, b) => b.some((x) => x.type === "market") },
  { id: "pop-10", title: "Small Village", description: "Reach 10 population", check: (r) => r.population >= 10 },
  { id: "first-contact", title: "First Contact", description: "A rival village appears", check: (_r, _b, _d, rivals) => rivals.some((rv) => rv.visible) },
  { id: "survive-30", title: "Through the Frost", description: "Reach Day 30", check: (_r, _b, day) => day >= 30 },
  { id: "pop-20", title: "Thriving Settlement", description: "Reach 20 population", check: (r) => r.population >= 20 },
  { id: "diplomat", title: "Diplomat", description: "Form a trade pact or alliance", check: (_r, _b, _d, rivals) => rivals.some((rv) => rv.status === "allied" || rv.status === "tradepact") },
  { id: "gold-100", title: "Prosperous", description: "Accumulate 100 gold", check: (r) => r.gold >= 100 },
  { id: "conqueror", title: "Conqueror", description: "Win your first war", check: (_r, _b, _d, rivals) => rivals.some((rv) => rv.status === "conquered") },
  { id: "buildings-10", title: "Master Builder", description: "Construct 10 buildings", check: (_, b) => b.length >= 10 },
  { id: "pop-50", title: "The Watcher's Triumph", description: "Reach 50 population", check: (r) => r.population >= 50 },
  { id: "empire", title: "Empire", description: "Conquer all rival villages", check: (_r, _b, _d, rivals) => rivals.filter((rv) => rv.visible).length > 0 && rivals.filter((rv) => rv.visible).every((rv) => rv.status === "conquered") },
];

// ---- Starting values ----
export const STARTING_RESOURCES: Resources = {
  food: 50, wood: 30, gold: 10, population: 3, morale: 60,
};

export const STARTING_BUILDINGS: Building[] = [
  { type: "hut", id: "hut-0", x: 45, damaged: false },
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

export const REPAIR_COST = 8; // wood per building

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

// ---- Multipliers ----
const SEASON_MULT: Record<Season, { food: number; wood: number; gold: number; growthChance: number; morale: number }> = {
  spring: { food: 1.2, wood: 1.0, gold: 0.8, growthChance: 0.15, morale: 1 },
  summer: { food: 1.5, wood: 0.8, gold: 1.0, growthChance: 0.10, morale: 2 },
  autumn: { food: 0.8, wood: 1.3, gold: 1.2, growthChance: 0.05, morale: 0 },
  winter: { food: 0.0, wood: 0.5, gold: 0.6, growthChance: 0.02, morale: -3 },
};

const WEATHER_MULT: Record<Weather, { food: number; wood: number; gold: number; morale: number; dmgChance: number; popRisk: number }> = {
  clear: { food: 1.0, wood: 1.0, gold: 1.0, morale: 2, dmgChance: 0, popRisk: 0 },
  rain:  { food: 1.3, wood: 0.7, gold: 0.7, morale: -1, dmgChance: 0, popRisk: 0 },
  snow:  { food: 0.5, wood: 0.5, gold: 1.0, morale: -3, dmgChance: 0.01, popRisk: 0.02 },
  storm: { food: 0.3, wood: 0.3, gold: 0.3, morale: -6, dmgChance: 0.04, popRisk: 0.05 },
};

// ---- Morale calculation ----
function clamp(min: number, max: number, v: number): number {
  return Math.min(max, Math.max(min, v));
}

function moralePerDay(
  res: Resources,
  buildings: Building[],
  season: Season,
  weather: Weather,
  taxRate: number,
  rations: Rations,
): number {
  const pop = res.population;
  const huts = buildings.filter((b) => b.type === "hut" && !b.damaged).length;
  const sm = SEASON_MULT[season];
  const wm = WEATHER_MULT[weather];

  // Food satisfaction
  const foodEffect = res.food > pop * 2 ? 3 : res.food > 0 ? 0 : -8;

  // Housing
  const housingEffect = pop <= huts * 4 ? 1 : -4;

  // Tax
  const taxEffect = -(taxRate * 0.3);

  // Rations
  const rationEffect = rations === "full" ? 2 : rations === "half" ? -1 : -5;

  return foodEffect + housingEffect + taxEffect + rationEffect + sm.morale + wm.morale;
}

// ---- Morale production modifier ----
function moraleMod(morale: number): number {
  if (morale >= 70) return 1.2;
  if (morale >= 40) return 1.0;
  if (morale >= 20) return 0.7;
  return 0.5;
}

// ---- Resource tick (once per pseudo-day) ----
export function calculateDayTick(
  resources: Resources,
  buildings: Building[],
  season: Season,
  weather: Weather,
  taxRate: number,
  rations: Rations,
): { resources: Resources; damagedIds: string[] } {
  const sm = SEASON_MULT[season];
  const wm = WEATHER_MULT[weather];
  const mm = moraleMod(resources.morale);

  const activeFarms = buildings.filter((b) => b.type === "farm" && !b.damaged).length;
  const activeMills = buildings.filter((b) => b.type === "lumbermill" && !b.damaged).length;
  const activeMarkets = buildings.filter((b) => b.type === "market" && !b.damaged).length;
  const activeHuts = buildings.filter((b) => b.type === "hut" && !b.damaged).length;

  const foodGain = (activeFarms * 3 + 1) * sm.food * wm.food * mm;
  const woodGain = (activeMills * 3 + 0.5) * sm.wood * wm.wood * mm;
  const taxGold = resources.population * (taxRate / 100) * 0.5;
  const goldGain = (activeMarkets * 4 + 0.3) * sm.gold * wm.gold * mm + taxGold;

  // Rations food cost
  const rationsMult = rations === "full" ? 1.0 : rations === "half" ? 0.5 : 0;
  const foodConsumed = resources.population * 0.8 * rationsMult;

  // Population
  const maxPop = activeHuts * 4;
  let popGrowth = 0;
  if (resources.morale >= 40 && resources.population < maxPop && resources.food > resources.population * 2) {
    const chance = sm.growthChance * (resources.morale >= 70 ? 1.5 : 1);
    if (Math.random() < chance) popGrowth = 1;
  }

  let popLoss = 0;
  if (wm.popRisk > 0 && Math.random() < wm.popRisk && resources.population > 1) popLoss = 1;
  if (resources.food <= 0 && rations !== "none" && resources.population > 1 && Math.random() < 0.15) popLoss += 1;
  if (resources.morale < 30 && resources.population > 1 && Math.random() < 0.08) popLoss += 1; // flee

  // Storm/snow damage
  const damagedIds: string[] = [];
  if (wm.dmgChance > 0) {
    const intact = buildings.filter((b) => !b.damaged);
    for (const b of intact) {
      if (Math.random() < wm.dmgChance) damagedIds.push(b.id);
    }
  }

  // Morale change
  const moraleDelta = moralePerDay(resources, buildings, season, weather, taxRate, rations);

  return {
    resources: {
      food: Math.max(0, Math.round((resources.food + foodGain - foodConsumed) * 10) / 10),
      wood: Math.max(0, Math.round((resources.wood + woodGain) * 10) / 10),
      gold: Math.max(0, Math.round((resources.gold + goldGain) * 10) / 10),
      population: Math.max(1, resources.population + popGrowth - popLoss),
      morale: clamp(0, 100, Math.round(resources.morale + moraleDelta)),
    },
    damagedIds,
  };
}

// ---- Rival AI tick (once per pseudo-day) ----
export function tickRivals(rivals: RivalVillage[], playerPop: number): { rivals: RivalVillage[]; events: GameEvent[]; day: number }[] {
  // This returns updated rivals. Events are generated in the game loop.
  return []; // placeholder -- actual logic is in tickRivalDay below
}

export function tickRivalDay(
  rival: RivalVillage,
  playerStrength: number,
  day: number,
): { rival: RivalVillage; event: GameEvent | null } {
  if (!rival.visible || rival.status === "conquered") return { rival, event: null };

  const r = { ...rival };

  // Growth
  r.population = Math.min(60, r.population + 0.3);
  r.strength += r.personality === "aggressive" ? 0.4 : 0.2;
  r.wealth += r.personality === "trader" ? 2 : 1;

  // Relation drift based on personality
  if (r.status === "neutral") {
    if (r.personality === "aggressive") r.relation = Math.max(-100, r.relation - 0.3);
    if (r.personality === "peaceful") r.relation = Math.min(100, r.relation + 0.1);
    if (r.personality === "trader") r.relation = Math.min(100, r.relation + 0.2);
  }

  // Aggressive rival may declare hostility
  let event: GameEvent | null = null;
  if (r.personality === "aggressive" && r.status === "neutral" && r.relation < -40 && r.strength > playerStrength * 0.7) {
    if (Math.random() < 0.03) {
      r.status = "hostile";
      r.relation = -60;
      event = { id: `rival-hostile-${r.id}-${day}`, text: `${r.name} grows hostile and threatens your village!`, day, type: "war" };
    }
  }

  // Peaceful rival may offer trade
  if (r.personality === "peaceful" && r.status === "neutral" && r.relation > 20 && Math.random() < 0.02) {
    event = { id: `rival-offer-${r.id}-${day}`, text: `${r.name} sends emissaries seeking friendship.`, day, type: "diplomacy" };
  }

  return { rival: r, event };
}

// ---- Player strength ----
export function getPlayerStrength(pop: number, buildings: Building[]): number {
  const huts = buildings.filter((b) => b.type === "hut" && !b.damaged).length;
  const markets = buildings.filter((b) => b.type === "market" && !b.damaged).length;
  return pop * 0.5 + huts * 2 + markets * 3;
}

// ---- Battle resolution ----
export interface BattleResult {
  won: boolean;
  playerPopLost: number;
  playerMoraleDelta: number;
  goldGained: number;
  popGained: number;
  message: string;
}

export function resolveBattle(
  playerStrength: number,
  playerGold: number,
  rival: RivalVillage,
): BattleResult {
  const warCost = 15;
  const pStr = playerStrength * (0.8 + Math.random() * 0.4); // +-20%
  const rStr = rival.strength * (0.8 + Math.random() * 0.4);

  if (pStr > rStr) {
    return {
      won: true,
      playerPopLost: Math.floor(Math.random() * 3) + 1,
      playerMoraleDelta: 15,
      goldGained: Math.floor(rival.wealth * 0.6),
      popGained: Math.floor(rival.population * 0.3),
      message: `Victory over ${rival.name}! Their lands are yours.`,
    };
  } else {
    return {
      won: false,
      playerPopLost: Math.floor(Math.random() * 4) + 2,
      playerMoraleDelta: -25,
      goldGained: -warCost,
      popGained: 0,
      message: `Defeat against ${rival.name}. Your forces retreat battered.`,
    };
  }
}

// ---- Diplomacy actions ----
export function diplomacyTrade(rival: RivalVillage, playerGold: number): { rival: RivalVillage; goldCost: number; foodGained: number } | null {
  if (playerGold < 10) return null;
  const r = { ...rival };
  r.relation = Math.min(100, r.relation + 20);
  if (r.relation > 30 && r.status === "neutral") r.status = "tradepact";
  return { rival: r, goldCost: 10, foodGained: 25 };
}

export function diplomacyAlliance(rival: RivalVillage): RivalVillage | null {
  if (rival.relation < 50 || rival.status === "hostile") return null;
  const r = { ...rival };
  r.status = "allied";
  r.relation = Math.min(100, r.relation + 30);
  return r;
}

export function diplomacyTribute(rival: RivalVillage, playerGold: number): { rival: RivalVillage; goldCost: number } | null {
  const cost = 20;
  if (playerGold < cost) return null;
  const r = { ...rival };
  r.relation = Math.min(100, r.relation + 30);
  if (r.status === "hostile" && r.relation > -10) r.status = "neutral";
  return { rival: r, goldCost: cost };
}

// ---- Festival ----
export const FESTIVAL_COST = 20;

// ---- Day events ----
const FLAVOR_EVENTS: Record<Season, string[]> = {
  spring: ["Wildflowers bloom across the meadow.", "A warm breeze carries the scent of new growth.", "Birds return from the south.", "Children find tadpoles in the pond."],
  summer: ["Crops ripen under the golden light.", "Villagers celebrate the longest day.", "Children play by the river.", "The air shimmers with heat."],
  autumn: ["Leaves turn amber and crimson.", "The harvest is gathered in.", "A chill creeps into the evenings.", "Geese fly south overhead."],
  winter: ["Frost coats the rooftops.", "Villagers huddle around the fire.", "The river freezes solid.", "A wolf howls in the distance."],
};

export function generateDayEvents(
  season: Season,
  weather: Weather,
  resources: Resources,
  day: number,
): GameEvent[] {
  const events: GameEvent[] = [];

  if (resources.food <= 5 && resources.population > 1) {
    events.push({ id: `warn-food-${day}`, text: "Famine threatens! Food is dangerously low.", day, type: "warning" });
  }
  if (resources.morale <= 20) {
    events.push({ id: `warn-morale-${day}`, text: "Morale is critical -- villagers may flee!", day, type: "warning" });
  }
  if (weather === "storm") {
    events.push({ id: `storm-${day}`, text: "The storm rages -- buildings may be damaged!", day, type: "warning" });
  }
  if (resources.food <= 0 && resources.population > 1) {
    events.push({ id: `starve-${day}`, text: "People are starving! Grow food or change rations!", day, type: "warning" });
  }

  // Flavor -- 25% per day, skip if warnings already present
  if (events.length === 0 && Math.random() < 0.25) {
    const pool = FLAVOR_EVENTS[season];
    const text = pool[Math.floor(Math.random() * pool.length)];
    events.push({ id: `flav-${day}-${Math.random().toString(36).slice(2, 6)}`, text, day, type: "flavor" });
  }

  return events;
}
