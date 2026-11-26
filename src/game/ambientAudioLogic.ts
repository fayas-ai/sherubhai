import { TimeOfDayPhase, WeatherCondition } from '../types/game';

export type KeralaAmbientSoundId =
  | 'temple_bells'
  | 'tea_stall_chatter'
  | 'monsoon_rain'
  | 'coastal_waves'
  | 'night_crickets'
  | 'tropical_birds'
  | 'bazaar_distant_horn'
  | 'airport_jet_hum';

export interface AmbientContext {
  district: string;
  timePhase: TimeOfDayPhase;
  weather: WeatherCondition;
  indoors?: boolean;
  airborne?: boolean;
}

export interface AmbientWeightEntry {
  id: KeralaAmbientSoundId;
  weight: number;
}

export interface AmbientSchedulerState {
  cooldownSec: number;
  lastSoundId: KeralaAmbientSoundId | null;
  triggerCount: number;
}

export interface AmbientSchedulerStepResult {
  state: AmbientSchedulerState;
  triggeredSound: KeralaAmbientSoundId | null;
}

export type DistrictAmbientZone = 'bazaar' | 'grove' | 'coastal' | 'airport' | 'civic';

export function classifyDistrictAmbientZone(district: string): DistrictAmbientZone {
  const d = (district || '').toLowerCase();
  if (d.includes('airport')) return 'airport';
  if (
    d.includes('beach') ||
    d.includes('coastal') ||
    d.includes('harbour') ||
    d.includes('promenade') ||
    d.includes('lagoon')
  ) {
    return 'coastal';
  }
  if (
    d.includes('palm colony') ||
    d.includes('grove') ||
    d.includes('infopark') ||
    d.includes('turf')
  ) {
    return 'grove';
  }
  if (d.includes('hospital') || d.includes('financial')) {
    return 'civic';
  }
  // Main Junction, Sweet Street, Spice Avenue, Market Yard, Hotel Boulevard,
  // West Cinema Strip, Uptown Plaza, Highway Strip
  return 'bazaar';
}

/**
 * Returns the weighted pool of Kerala-inspired ambient sounds appropriate for the
 * player's current district, time of day, and weather condition.
 * Returns an empty pool indoors (hospital) or while flying airborne.
 */
export function getAmbientSoundPool(ctx: AmbientContext): AmbientWeightEntry[] {
  if (ctx.indoors || ctx.airborne) {
    return [];
  }

  const zone = classifyDistrictAmbientZone(ctx.district);
  const weights: Partial<Record<KeralaAmbientSoundId, number>> = {};

  const add = (id: KeralaAmbientSoundId, amount: number) => {
    if (amount <= 0) return;
    weights[id] = (weights[id] ?? 0) + amount;
  };

  const scale = (id: KeralaAmbientSoundId, factor: number) => {
    const cur = weights[id];
    if (cur !== undefined) {
      const next = cur * factor;
      if (next <= 0.01) {
        delete weights[id];
      } else {
        weights[id] = next;
      }
    }
  };

  // 1. District + Time-of-Day baseline soundscape
  if (zone === 'bazaar') {
    if (ctx.timePhase === 'day') {
      add('tea_stall_chatter', 3.4);
      add('bazaar_distant_horn', 1.8);
      add('temple_bells', 1.6);
      add('tropical_birds', 0.9);
    } else if (ctx.timePhase === 'sunset') {
      // Kerala Sandhya (evening) — warm temple bells & lively evening chaya kadakal
      add('temple_bells', 3.2);
      add('tea_stall_chatter', 2.8);
      add('bazaar_distant_horn', 1.1);
      add('tropical_birds', 0.5);
    } else {
      // Night — crickets take over, quiet late-night tea stall murmur
      add('night_crickets', 3.2);
      add('tea_stall_chatter', 0.65);
      add('temple_bells', 0.5);
    }
  } else if (zone === 'grove') {
    if (ctx.timePhase === 'day') {
      add('temple_bells', 2.6);
      add('tropical_birds', 2.8);
      add('tea_stall_chatter', 0.7);
    } else if (ctx.timePhase === 'sunset') {
      add('temple_bells', 3.8);
      add('tropical_birds', 1.6);
      add('night_crickets', 0.9);
    } else {
      add('night_crickets', 4.0);
      add('temple_bells', 0.6);
    }
  } else if (zone === 'coastal') {
    if (ctx.timePhase === 'day') {
      add('coastal_waves', 3.8);
      add('tropical_birds', 1.6);
      add('tea_stall_chatter', 0.9);
    } else if (ctx.timePhase === 'sunset') {
      add('coastal_waves', 3.6);
      add('temple_bells', 1.8);
      add('tropical_birds', 0.9);
      add('tea_stall_chatter', 0.8);
    } else {
      add('coastal_waves', 3.4);
      add('night_crickets', 2.4);
    }
  } else if (zone === 'airport') {
    if (ctx.timePhase === 'day') {
      add('airport_jet_hum', 3.6);
      add('bazaar_distant_horn', 0.9);
      add('tropical_birds', 0.6);
    } else if (ctx.timePhase === 'sunset') {
      add('airport_jet_hum', 3.4);
      add('temple_bells', 0.9);
    } else {
      add('airport_jet_hum', 2.8);
      add('night_crickets', 2.2);
    }
  } else {
    // Civic (Hospital Square, Financial Square)
    if (ctx.timePhase === 'day') {
      add('bazaar_distant_horn', 1.6);
      add('tea_stall_chatter', 1.4);
      add('temple_bells', 1.3);
      add('tropical_birds', 1.1);
    } else if (ctx.timePhase === 'sunset') {
      add('temple_bells', 2.4);
      add('tea_stall_chatter', 1.2);
      add('bazaar_distant_horn', 0.8);
    } else {
      add('night_crickets', 3.4);
      add('temple_bells', 0.5);
    }
  }

  // 2. Weather modifiers (Kerala Monsoon, Rain, and Backwater Mist)
  if (ctx.weather === 'monsoon') {
    add('monsoon_rain', 5.2);
    scale('tropical_birds', 0.15);
    scale('tea_stall_chatter', 0.45);
    scale('bazaar_distant_horn', 0.5);
    scale('night_crickets', 0.55);
  } else if (ctx.weather === 'rain') {
    add('monsoon_rain', 3.4);
    scale('tropical_birds', 0.45);
    scale('tea_stall_chatter', 0.75);
  } else if (ctx.weather === 'mist') {
    add('monsoon_rain', 0.9);
    if (weights.temple_bells !== undefined) {
      scale('temple_bells', 1.25);
    }
    if (weights.coastal_waves !== undefined) {
      scale('coastal_waves', 1.2);
    }
  }

  const orderedIds: KeralaAmbientSoundId[] = [
    'temple_bells',
    'tea_stall_chatter',
    'monsoon_rain',
    'coastal_waves',
    'night_crickets',
    'tropical_birds',
    'bazaar_distant_horn',
    'airport_jet_hum',
  ];

  const pool: AmbientWeightEntry[] = [];
  for (const id of orderedIds) {
    const w = weights[id];
    if (w !== undefined && w > 0.01) {
      pool.push({ id, weight: Math.round(w * 1000) / 1000 });
    }
  }
  return pool;
}

/**
 * Selects a weighted ambient sound from the current context pool, dampening
 * the immediately previous sound (0.25x) whenever alternatives exist to keep
 * the soundscape organic and varied.
 */
export function pickWeightedAmbientSound(
  ctx: AmbientContext,
  lastSoundId: KeralaAmbientSoundId | null,
  rng: () => number = Math.random,
): KeralaAmbientSoundId | null {
  const pool = getAmbientSoundPool(ctx);
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0].id;

  let total = 0;
  const adjusted: AmbientWeightEntry[] = pool.map((entry) => {
    const weight = entry.id === lastSoundId ? entry.weight * 0.25 : entry.weight;
    total += weight;
    return { id: entry.id, weight };
  });

  if (total <= 0) return pool[0].id;
  const clampedRng = Math.min(0.999999, Math.max(0, rng()));
  let cursor = clampedRng * total;
  for (const entry of adjusted) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.id;
  }
  return adjusted[adjusted.length - 1].id;
}

/**
 * Computes an organic interval (seconds) until the next ambient cue.
 * Rain and Monsoon play slightly more frequent atmospheric rain bursts.
 */
export function computeNextAmbientIntervalSec(
  ctx: AmbientContext,
  rng: () => number = Math.random,
): number {
  const r = Math.min(1, Math.max(0, rng()));
  if (ctx.weather === 'monsoon') {
    return 4.5 + r * 3.5; // 4.5..8.0s
  }
  if (ctx.weather === 'rain') {
    return 5.5 + r * 4.0; // 5.5..9.5s
  }
  return 6.8 + r * 6.7; // 6.8..13.5s
}

export function createInitialAmbientSchedulerState(
  initialDelaySec = 3.5,
): AmbientSchedulerState {
  return {
    cooldownSec: Math.max(0.5, initialDelaySec),
    lastSoundId: null,
    triggerCount: 0,
  };
}

/**
 * Advances the ambient audio scheduler by `dt` seconds.
 * When `active` is false (paused, modal, photo mode, muted) or the context pool
 * is empty (indoors/airborne), the timer pauses safely without triggering cues.
 */
export function stepAmbientScheduler(
  state: AmbientSchedulerState,
  dt: number,
  ctx: AmbientContext,
  active: boolean,
  rng: () => number = Math.random,
): AmbientSchedulerStepResult {
  if (!active || dt <= 0 || ctx.indoors || ctx.airborne) {
    return { state, triggeredSound: null };
  }

  const nextCooldown = state.cooldownSec - dt;
  if (nextCooldown > 0) {
    return {
      state: {
        ...state,
        cooldownSec: nextCooldown,
      },
      triggeredSound: null,
    };
  }

  const picked = pickWeightedAmbientSound(ctx, state.lastSoundId, rng);
  const resetInterval = computeNextAmbientIntervalSec(ctx, rng);
  if (!picked) {
    return {
      state: {
        ...state,
        cooldownSec: resetInterval,
      },
      triggeredSound: null,
    };
  }

  return {
    state: {
      cooldownSec: resetInterval,
      lastSoundId: picked,
      triggerCount: state.triggerCount + 1,
    },
    triggeredSound: picked,
  };
}
