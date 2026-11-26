import { TimeOfDayPhase, WeatherCondition, WeatherHudState } from '../types/game';
import { RoadSegmentDef, getRoadBounds } from './roadNetwork';

export const WEATHER_SEQUENCE: readonly WeatherCondition[] = [
  'sunny',
  'rain',
  'monsoon',
  'mist',
] as const;

export const DEFAULT_WEATHER_CYCLE_SECONDS = 48;

export interface WeatherVisualConfig {
  condition: WeatherCondition;
  label: string;
  shortLabel: string;
  mlLabel: string;
  skyHex: number;
  fogColorHex: number;
  skyBlend: number;
  fogNear: number;
  fogFar: number;
  sunIntensityMult: number;
  hemiIntensityMult: number;
  rainDensity: number; // 0..1 fraction of rain particle budget active
  rainFallSpeed: number; // m/s downward
  rainWindDrift: number; // m/s horizontal slant
  rainStreakLen: number; // visual streak length in meters
  rainOpacity: number;
  rainColorHex: number;
  puddleFrequency: number; // 0..1 fraction of street puddles filled
  puddleWetness: number; // 0..1 reflective wet-surface intensity
  roadRoughness: number; // asphalt roughness (dry ~0.85, wet monsoon ~0.28)
  roadTintHex: number; // subtle darkening on drenched asphalt
  stormDarkness: number; // 0..1 extra storm overcast & sea chop multiplier
  temperatureC: number;
  windKmh: number;
}

export interface WeatherControllerState {
  condition: WeatherCondition;
  previousCondition: WeatherCondition;
  transitionId: number;
  elapsedInPhase: number;
  phaseDuration: number;
  intensity: number; // 0..1 smooth fade-in within active condition
}

export interface StreetPuddleSpec {
  id: string;
  roadId: string;
  x: number;
  z: number;
  radiusX: number;
  radiusZ: number;
  rotation: number;
  tier: 'primary' | 'monsoon';
  phase: number;
}

export interface ExcludeCircle {
  x: number;
  z: number;
  radius: number;
}

export function createInitialWeatherState(
  initialCondition: WeatherCondition = 'sunny',
  phaseDuration: number = DEFAULT_WEATHER_CYCLE_SECONDS,
): WeatherControllerState {
  return {
    condition: initialCondition,
    previousCondition: initialCondition,
    transitionId: 0,
    elapsedInPhase: 0,
    phaseDuration: Math.max(8, phaseDuration),
    intensity: 1,
  };
}

export function getNextWeatherCondition(current: WeatherCondition): WeatherCondition {
  const idx = WEATHER_SEQUENCE.indexOf(current);
  return WEATHER_SEQUENCE[(idx + 1) % WEATHER_SEQUENCE.length];
}

export function cycleWeatherCondition(
  state: WeatherControllerState,
  target?: WeatherCondition,
): WeatherControllerState {
  const nextCondition = target ?? getNextWeatherCondition(state.condition);
  if (nextCondition === state.condition) {
    return state;
  }
  return {
    ...state,
    previousCondition: state.condition,
    condition: nextCondition,
    transitionId: state.transitionId + 1,
    elapsedInPhase: 0,
    intensity: 0.45,
  };
}

export function stepWeatherCycle(
  state: WeatherControllerState,
  dt: number,
  autoAdvance: boolean = true,
): { state: WeatherControllerState; changed: boolean } {
  const safeDt = Math.max(0, Math.min(dt, 5));
  let nextElapsed = state.elapsedInPhase + (autoAdvance ? safeDt : 0);
  let nextCondition = state.condition;
  let prevCondition = state.previousCondition;
  let transitionId = state.transitionId;
  let changed = false;

  if (autoAdvance && nextElapsed >= state.phaseDuration) {
    const steps = Math.floor(nextElapsed / state.phaseDuration);
    nextElapsed = nextElapsed % state.phaseDuration;
    for (let i = 0; i < steps; i++) {
      prevCondition = nextCondition;
      nextCondition = getNextWeatherCondition(nextCondition);
      transitionId += 1;
      changed = true;
    }
  }

  // Smooth ~1.4s ramp-in when entering a new weather phase
  const ramp = Math.min(1, Math.max(0.45, nextElapsed / 1.4));
  const intensity = changed ? ramp : Math.min(1, state.intensity + safeDt * 0.9);

  return {
    state: {
      ...state,
      condition: nextCondition,
      previousCondition: prevCondition,
      transitionId,
      elapsedInPhase: nextElapsed,
      intensity: Math.max(ramp, intensity),
    },
    changed,
  };
}

export function getWeatherVisualConfig(
  condition: WeatherCondition,
  timePhase: TimeOfDayPhase,
): WeatherVisualConfig {
  const tempOffset = timePhase === 'night' ? -4 : timePhase === 'sunset' ? -2 : 0;

  if (condition === 'monsoon') {
    const skyHex =
      timePhase === 'night' ? 0x050910 : timePhase === 'sunset' ? 0x1e2530 : 0x222f3c;
    const fogColorHex =
      timePhase === 'night' ? 0x04070d : timePhase === 'sunset' ? 0x1a212b : 0x1c2835;
    return {
      condition: 'monsoon',
      label: 'Kerala Monsoon',
      shortLabel: 'Monsoon',
      mlLabel: 'ഇടവപ്പാതി പെരുമഴ',
      skyHex,
      fogColorHex,
      skyBlend: 0.96,
      fogNear: 8,
      fogFar: 64,
      sunIntensityMult: 0.28,
      hemiIntensityMult: 0.5,
      rainDensity: 1.0,
      rainFallSpeed: 40,
      rainWindDrift: 9.2,
      rainStreakLen: 1.75,
      rainOpacity: 0.86,
      rainColorHex: 0xdbeafe,
      puddleFrequency: 1.0,
      puddleWetness: 1.0,
      roadRoughness: 0.24,
      roadTintHex: 0xadb9c6,
      stormDarkness: 0.92,
      temperatureC: 23 + tempOffset,
      windKmh: 42,
    };
  }

  if (condition === 'rain') {
    const skyHex =
      timePhase === 'night' ? 0x0c131f : timePhase === 'sunset' ? 0x5c6370 : 0x627485;
    return {
      condition: 'rain',
      label: 'Tropical Shower',
      shortLabel: 'Rain',
      mlLabel: 'ചാറ്റൽ മഴ',
      skyHex,
      fogColorHex: skyHex,
      skyBlend: 0.68,
      fogNear: 34,
      fogFar: 118,
      sunIntensityMult: 0.6,
      hemiIntensityMult: 0.8,
      rainDensity: 0.45,
      rainFallSpeed: 23,
      rainWindDrift: 3.0,
      rainStreakLen: 0.9,
      rainOpacity: 0.44,
      rainColorHex: 0xbae6fd,
      puddleFrequency: 0.38,
      puddleWetness: 0.56,
      roadRoughness: 0.52,
      roadTintHex: 0xdce4ec,
      stormDarkness: 0.35,
      temperatureC: 25 + tempOffset,
      windKmh: 19,
    };
  }

  if (condition === 'mist') {
    const skyHex =
      timePhase === 'night' ? 0x1c2834 : timePhase === 'sunset' ? 0xc2b2a0 : 0xc9d7db;
    return {
      condition: 'mist',
      label: 'Backwater Mist',
      shortLabel: 'Mist',
      mlLabel: 'മൂടൽമഞ്ഞ്',
      skyHex,
      fogColorHex: skyHex,
      skyBlend: 0.82,
      fogNear: 15,
      fogFar: 86,
      sunIntensityMult: 0.72,
      hemiIntensityMult: 0.94,
      rainDensity: 0,
      rainFallSpeed: 0,
      rainWindDrift: 0,
      rainStreakLen: 0,
      rainOpacity: 0,
      rainColorHex: 0xbae6fd,
      puddleFrequency: 0.24,
      puddleWetness: 0.36,
      roadRoughness: 0.66,
      roadTintHex: 0xeaf0f4,
      stormDarkness: 0.15,
      temperatureC: 22 + tempOffset,
      windKmh: 9,
    };
  }

  return {
    condition: 'sunny',
    label:
      timePhase === 'night' ? 'Clear Night' : timePhase === 'sunset' ? 'Golden Dusk' : 'Tropical Sun',
    shortLabel: timePhase === 'night' ? 'Clear' : 'Sunny',
    mlLabel: timePhase === 'night' ? 'തെളിഞ്ഞ രാത്രി' : 'നല്ല വെയിൽ',
    skyHex: 0xc2dcf0,
    fogColorHex: 0xc2dcf0,
    skyBlend: 0,
    fogNear: 65,
    fogFar: 175,
    sunIntensityMult: 1,
    hemiIntensityMult: 1,
    rainDensity: 0,
    rainFallSpeed: 0,
    rainWindDrift: 0,
    rainStreakLen: 0,
    rainOpacity: 0,
    rainColorHex: 0xbae6fd,
    puddleFrequency: 0,
    puddleWetness: 0,
    roadRoughness: 0.85,
    roadTintHex: 0xffffff,
    stormDarkness: 0,
    temperatureC: 31 + tempOffset,
    windKmh: 12,
  };
}

/**
 * Computes effective scene fog near/far so Monsoon's dense dark storm fog and
 * Mist stay authentically atmospheric on Kerala streets, while Sunny preserves
 * long coastal and mountain vistas.
 */
export function getEffectiveFogRange(
  weatherCfg: WeatherVisualConfig,
  lodFogFarCap: number,
  isScenicVista: boolean,
): { fogNear: number; fogFar: number } {
  if (weatherCfg.condition === 'monsoon') {
    const baseFar = isScenicVista ? 105 : 68;
    const fogFar = Math.min(Math.max(weatherCfg.fogFar, baseFar), Math.max(68, lodFogFarCap));
    const fogNear = Math.min(weatherCfg.fogNear, fogFar * 0.2);
    return { fogNear, fogFar };
  }
  if (weatherCfg.condition === 'mist') {
    const fogFar = isScenicVista ? 160 : 128;
    const fogNear = Math.min(weatherCfg.fogNear, fogFar * 0.32);
    return { fogNear, fogFar };
  }
  if (weatherCfg.condition === 'rain') {
    const fogFar = isScenicVista ? 240 : 168;
    const fogNear = Math.min(weatherCfg.fogNear, fogFar * 0.38);
    return { fogNear, fogFar };
  }
  const scenicBoost = isScenicVista ? 430 : 320;
  const fogFar = Math.max(Math.min(weatherCfg.fogFar, lodFogFarCap), scenicBoost);
  const fogNear = Math.min(weatherCfg.fogNear, fogFar * 0.48);
  return { fogNear, fogFar };
}

function deterministicHash(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/**
 * Deterministically generates reflective street puddles strictly on paved Kerala roads.
 * - 'primary' tier (~38%) fills during light Rain, Monsoon, and lingering Mist.
 * - 'monsoon' tier (all 100%) fills during heavy Kerala Monsoon for frequent drenched streets!
 */
export function generateStreetPuddleSpecs(
  roads: readonly RoadSegmentDef[],
  excludeCircles: readonly ExcludeCircle[] = [],
): StreetPuddleSpec[] {
  const puddles: StreetPuddleSpec[] = [];

  const isExcluded = (x: number, z: number, r: number): boolean => {
    for (const c of excludeCircles) {
      if (Math.hypot(x - c.x, z - c.z) < c.radius + r) return true;
    }
    return false;
  };

  // Curated hero puddles right around Main Junction & Sheru Spawn (0, 22) so wet streets read immediately!
  const heroCoords: Array<{
    roadId: string;
    x: number;
    z: number;
    rx: number;
    rz: number;
    rot: number;
    tier: 'primary' | 'monsoon';
  }> = [
    { roadId: 'mainRoadNS', x: -2.6, z: 16.2, rx: 1.9, rz: 1.25, rot: 0.24, tier: 'primary' },
    { roadId: 'mainRoadNS', x: 2.6, z: 11.4, rx: 2.1, rz: 1.35, rot: -0.32, tier: 'monsoon' },
    { roadId: 'mainRoadNS', x: -2.1, z: 6.8, rx: 1.85, rz: 1.2, rot: 0.42, tier: 'monsoon' },
    { roadId: 'mainRoadNS', x: 2.4, z: 18.8, rx: 1.75, rz: 1.15, rot: -0.18, tier: 'monsoon' },
    { roadId: 'mainRoadNS', x: -2.4, z: 13.0, rx: 1.45, rz: 0.95, rot: -0.45, tier: 'monsoon' },
    { roadId: 'mainRoadNS', x: 2.9, z: 5.4, rx: 1.55, rz: 1.05, rot: 0.36, tier: 'monsoon' },
    { roadId: 'mainRoadNS', x: -2.5, z: 24.8, rx: 2.0, rz: 1.35, rot: 0.12, tier: 'primary' },
    { roadId: 'mainRoadEW', x: -12.8, z: -1.8, rx: 2.3, rz: 1.45, rot: 0.14, tier: 'primary' },
    { roadId: 'mainRoadEW', x: 13.2, z: -6.2, rx: 2.2, rz: 1.35, rot: -0.22, tier: 'monsoon' },
    { roadId: 'mainRoadEW', x: -18.5, z: -6.0, rx: 1.85, rz: 1.2, rot: -0.34, tier: 'monsoon' },
    { roadId: 'mainRoadEW', x: 18.8, z: -1.9, rx: 1.9, rz: 1.25, rot: 0.26, tier: 'monsoon' },
    { roadId: 'mainRoadEW', x: -25.0, z: -5.4, rx: 2.2, rz: 1.4, rot: 0.3, tier: 'monsoon' },
    { roadId: 'mainRoadEW', x: 25.5, z: -2.3, rx: 2.3, rz: 1.45, rot: -0.15, tier: 'primary' },
    { roadId: 'mainRoadNS', x: 2.3, z: -15.5, rx: 2.1, rz: 1.35, rot: 0.28, tier: 'monsoon' },
    { roadId: 'mainRoadNS', x: -2.4, z: -22.5, rx: 2.2, rz: 1.45, rot: -0.26, tier: 'primary' },
  ];

  const validRoadIds = new Set(roads.map((r) => r.id));
  heroCoords.forEach((h, idx) => {
    if (!validRoadIds.has(h.roadId)) return;
    if (isExcluded(h.x, h.z, Math.max(h.rx, h.rz))) return;
    puddles.push({
      id: `puddle_hero_${idx}`,
      roadId: h.roadId,
      x: h.x,
      z: h.z,
      radiusX: h.rx,
      radiusZ: h.rz,
      rotation: h.rot,
      tier: h.tier,
      phase: idx * 0.73,
    });
  });

  // Procedural deterministic street puddles distributed across every paved road segment
  let seed = 101;
  for (const road of roads) {
    const b = getRoadBounds(road);
    const spacing = 19; // Frequent puddles along every 19m of asphalt during Monsoon
    const count = Math.max(2, Math.floor((road.length - 14) / spacing));
    const maxLateral = Math.max(1.1, road.width * 0.5 - 2.35);

    for (let i = 0; i < count; i++) {
      seed += 1;
      const h1 = deterministicHash(seed * 1.13);
      const h2 = deterministicHash(seed * 2.41);
      const h3 = deterministicHash(seed * 3.77);
      const h4 = deterministicHash(seed * 5.19);

      const t = (i + 0.35 + h1 * 0.3) / count;
      const lateral = (h2 * 2 - 1) * maxLateral;
      const rx = 1.45 + h3 * 1.35; // 1.45m .. 2.8m
      const rz = 1.05 + h4 * 0.85; // 1.05m .. 1.9m
      const maxR = Math.max(rx, rz);

      let px = road.x;
      let pz = road.z;
      if (road.axis === 'ns') {
        px = road.x + lateral;
        pz = b.minZ + 7 + t * (road.length - 14);
      } else {
        px = b.minX + 7 + t * (road.length - 14);
        pz = road.z + lateral;
      }

      // Guarantee puddle sits safely within paved road width
      if (
        px - maxR < b.minX + 0.15 ||
        px + maxR > b.maxX - 0.15 ||
        pz - maxR < b.minZ + 0.15 ||
        pz + maxR > b.maxZ - 0.15
      ) {
        continue;
      }
      if (isExcluded(px, pz, maxR)) continue;

      // Avoid crowding an existing puddle too tightly
      let overlapsExisting = false;
      for (const existing of puddles) {
        const minGap = Math.max(existing.radiusX, existing.radiusZ) + maxR + 1.2;
        if (Math.hypot(px - existing.x, pz - existing.z) < minGap) {
          overlapsExisting = true;
          break;
        }
      }
      if (overlapsExisting) continue;

      // ~36% primary (Rain + Monsoon + Mist), ~64% monsoon-only (so Monsoon has ~2.8x more puddles!)
      const tier: 'primary' | 'monsoon' = i % 3 === 0 ? 'primary' : 'monsoon';
      puddles.push({
        id: `puddle_${road.id}_${i}`,
        roadId: road.id,
        x: Math.round(px * 100) / 100,
        z: Math.round(pz * 100) / 100,
        radiusX: Math.round(rx * 100) / 100,
        radiusZ: Math.round(rz * 100) / 100,
        rotation: (h1 - 0.5) * Math.PI,
        tier,
        phase: h3 * Math.PI * 2,
      });
    }
  }

  return puddles;
}

export function getPuddleVisibility(
  spec: StreetPuddleSpec,
  condition: WeatherCondition,
  intensity: number,
): number {
  const clamped = Math.max(0, Math.min(1, intensity));
  if (condition === 'sunny') return 0;
  if (condition === 'monsoon') {
    return spec.tier === 'primary' ? Math.max(0.65, clamped) : clamped;
  }
  if (condition === 'rain') {
    return spec.tier === 'primary' ? 0.72 * clamped : 0;
  }
  // Mist retains faint lingering damp patches on primary puddles
  return spec.tier === 'primary' ? 0.34 * clamped : 0;
}

export function getActivePuddleCount(
  specs: readonly StreetPuddleSpec[],
  condition: WeatherCondition,
): number {
  let count = 0;
  for (const s of specs) {
    if (getPuddleVisibility(s, condition, 1) > 0.05) count++;
  }
  return count;
}

export function isPointInActivePuddle(
  x: number,
  z: number,
  specs: readonly StreetPuddleSpec[],
  condition: WeatherCondition,
): boolean {
  if (condition === 'sunny') return false;
  for (const s of specs) {
    if (getPuddleVisibility(s, condition, 1) <= 0.05) continue;
    const dx = x - s.x;
    const dz = z - s.z;
    const r = Math.max(s.radiusX, s.radiusZ);
    if (dx * dx + dz * dz <= r * r) {
      return true;
    }
  }
  return false;
}

export function buildWeatherHudState(
  state: WeatherControllerState,
  timePhase: TimeOfDayPhase,
): WeatherHudState {
  const cfg = getWeatherVisualConfig(state.condition, timePhase);
  return {
    condition: state.condition,
    previousCondition: state.previousCondition,
    transitionId: state.transitionId,
    cycleProgress: Math.min(1, Math.max(0, state.elapsedInPhase / state.phaseDuration)),
    intensity: state.intensity,
    label: cfg.label,
    shortLabel: cfg.shortLabel,
    mlLabel: cfg.mlLabel,
    temperatureC: cfg.temperatureC,
    windKmh: cfg.windKmh,
    rainDensity: cfg.rainDensity,
    puddleFrequency: cfg.puddleFrequency,
  };
}
