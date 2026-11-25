import { GraphicsQuality } from '../types/game';

/**
 * 0 = Full composite 3D detail (near camera)
 * 1 = Simplified low-poly proxy (mid/far distance — slashes draw calls & triangles)
 * 2 = Culled beyond horizon fog fade
 */
export type LodTier = 0 | 1 | 2;

export interface LodDistances {
  /** Buildings switch from full composite facade to lightweight 2-mesh proxy */
  buildingMidDist: number;
  /** Buildings cull past horizon fog */
  buildingCullDist: number;
  /** Coconut palms switch from 19-part frond/coconut rig to 2-part low-poly proxy */
  palmMidDist: number;
  /** Coconut palms & perimeter mounds cull past horizon fog */
  palmCullDist: number;
  /** Small street props (physics props, lamps, benches, parking markings) hide shadows */
  propShadowDist: number;
  /** Small street props cull at far distance */
  propCullDist: number;
  /** Distant traffic / parked vehicles cull distance */
  vehicleCullDist: number;
  /** Distant traffic / vehicles stop spinning wheels & secondary animations */
  vehicleAnimDist: number;
  /** Crowd & non-boss NPC visibility cull distance */
  actorCullDist: number;
  /** Dynamic camera far clip plane matched to fog horizon */
  cameraFar: number;
  /** Max fog far distance cap for smooth distant fade-out before culling */
  fogFarCap: number;
  /** Directional shadow orthographic half-extent around player */
  shadowFrustumHalf: number;
  /** Hysteresis margin in meters to prevent LOD flickering near boundaries */
  hysteresis: number;
  /** Interval (seconds) between LOD sweeps */
  sweepIntervalSec: number;
}

export interface DynamicLodState {
  /** Dynamic scale multiplier in [0.52, 1.0] driven by live frame-rate governor */
  lodScale: number;
  /** Quality preset tier */
  quality: GraphicsQuality;
  /** Whether device is detected as compact/mobile */
  isMobile: boolean;
  /** Active scaled distances */
  distances: LodDistances;
}

export interface LodTelemetrySnapshot {
  quality: GraphicsQuality;
  lodScale: number;
  cameraFar: number;
  buildingsLod0: number;
  buildingsLod1: number;
  buildingsCulled: number;
  palmsLod0: number;
  palmsLod1: number;
  palmsCulled: number;
  propsVisible: number;
  propsCulled: number;
  actorsVisible: number;
  actorsCulled: number;
}

export const LOD_SCALE_STEPS: readonly number[] = [1.0, 0.84, 0.68, 0.54];

interface BaseLodPreset {
  buildingMidDist: number;
  buildingCullDist: number;
  palmMidDist: number;
  palmCullDist: number;
  propShadowDist: number;
  propCullDist: number;
  vehicleCullDist: number;
  vehicleAnimDist: number;
  actorCullDist: number;
  cameraFar: number;
  fogFarCap: number;
  shadowFrustumHalf: number;
  sweepIntervalSec: number;
}

const BASE_LOD_PRESETS: Record<GraphicsQuality, BaseLodPreset> = {
  low: {
    buildingMidDist: 56,
    buildingCullDist: 132,
    palmMidDist: 34,
    palmCullDist: 112,
    propShadowDist: 28,
    propCullDist: 64,
    vehicleCullDist: 96,
    vehicleAnimDist: 44,
    actorCullDist: 68,
    cameraFar: 280,
    fogFarCap: 195,
    shadowFrustumHalf: 28,
    sweepIntervalSec: 0.22,
  },
  medium: {
    buildingMidDist: 82,
    buildingCullDist: 176,
    palmMidDist: 52,
    palmCullDist: 152,
    propShadowDist: 42,
    propCullDist: 94,
    vehicleCullDist: 134,
    vehicleAnimDist: 66,
    actorCullDist: 98,
    cameraFar: 360,
    fogFarCap: 255,
    shadowFrustumHalf: 36,
    sweepIntervalSec: 0.18,
  },
  high: {
    buildingMidDist: 118,
    buildingCullDist: 235,
    palmMidDist: 78,
    palmCullDist: 205,
    propShadowDist: 58,
    propCullDist: 132,
    vehicleCullDist: 178,
    vehicleAnimDist: 92,
    actorCullDist: 138,
    cameraFar: 440,
    fogFarCap: 330,
    shadowFrustumHalf: 42,
    sweepIntervalSec: 0.15,
  },
};

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/**
 * Computes distance-based LOD thresholds scaled by hardware quality, mobile factor,
 * and live adaptive frame-rate scale (`lodScale`).
 * Guarantees culling thresholds stay safely beyond the active fog fade distance so
 * distant buildings and palms dissolve into atmospheric mist before culling.
 */
export function computeLodDistances(
  quality: GraphicsQuality,
  lodScale = 1.0,
  isMobile = false,
): LodDistances {
  const base = BASE_LOD_PRESETS[quality] ?? BASE_LOD_PRESETS.medium;
  const mobileTrim = isMobile && quality !== 'low' ? 0.88 : 1.0;
  const s = clamp(lodScale * mobileTrim, 0.5, 1.0);

  const fogFarCap = Math.round(clamp(base.fogFarCap * s, 115, 340));
  const buildingMidDist = Math.round(clamp(base.buildingMidDist * s, 36, 130));
  const buildingCullDist = Math.max(
    fogFarCap + 14,
    Math.round(clamp(base.buildingCullDist * s, 102, 360)),
  );
  const palmMidDist = Math.round(clamp(base.palmMidDist * s, 22, 90));
  const palmCullDist = Math.max(
    fogFarCap + 6,
    Math.round(clamp(base.palmCullDist * s, 94, 350)),
  );
  const propShadowDist = Math.round(clamp(base.propShadowDist * s, 18, 64));
  const propCullDist = Math.round(clamp(base.propCullDist * s, 44, 140));
  const vehicleAnimDist = Math.round(clamp(base.vehicleAnimDist * s, 28, 98));
  const vehicleCullDist = Math.max(
    propCullDist + 16,
    Math.round(clamp(base.vehicleCullDist * s, 72, 185)),
  );
  const actorCullDist = Math.round(clamp(base.actorCullDist * s, 48, 145));
  const cameraFar = Math.max(
    buildingCullDist + 36,
    Math.round(clamp(base.cameraFar * s, 240, 460)),
  );
  const shadowFrustumHalf = Math.round(clamp(base.shadowFrustumHalf * s, 22, 44));

  return {
    buildingMidDist,
    buildingCullDist,
    palmMidDist,
    palmCullDist,
    propShadowDist,
    propCullDist,
    vehicleCullDist,
    vehicleAnimDist,
    actorCullDist,
    cameraFar,
    fogFarCap,
    shadowFrustumHalf,
    hysteresis: 4.5,
    sweepIntervalSec: base.sweepIntervalSec,
  };
}

export function createDynamicLodState(
  quality: GraphicsQuality,
  isMobile: boolean,
  initialLodScale = 1.0,
): DynamicLodState {
  const safeScale = clamp(initialLodScale, LOD_SCALE_STEPS[LOD_SCALE_STEPS.length - 1], 1.0);
  return {
    lodScale: safeScale,
    quality,
    isMobile,
    distances: computeLodDistances(quality, safeScale, isMobile),
  };
}

export function updateDynamicLodScale(
  state: DynamicLodState,
  nextLodScale: number,
): DynamicLodState {
  const clamped = clamp(nextLodScale, LOD_SCALE_STEPS[LOD_SCALE_STEPS.length - 1], 1.0);
  if (Math.abs(clamped - state.lodScale) < 0.005) return state;
  return {
    ...state,
    lodScale: clamped,
    distances: computeLodDistances(state.quality, clamped, state.isMobile),
  };
}

/**
 * Classifies an entity's 3-tier LOD level using squared-distance comparisons and
 * symmetric hysteresis bands so objects never flicker back and forth across boundaries.
 */
export function classifyLodTierWithHysteresis(
  distSq: number,
  currentTier: LodTier,
  midDist: number,
  cullDist: number,
  hysteresis = 4.5,
): LodTier {
  const midUp = midDist + hysteresis;
  const midDown = Math.max(4, midDist - hysteresis);
  const cullUp = cullDist + hysteresis;
  const cullDown = Math.max(midUp + 4, cullDist - hysteresis);

  if (currentTier === 0) {
    if (distSq > cullUp * cullUp) return 2;
    if (distSq > midUp * midUp) return 1;
    return 0;
  }

  if (currentTier === 1) {
    if (distSq > cullUp * cullUp) return 2;
    if (distSq < midDown * midDown) return 0;
    return 1;
  }

  // currentTier === 2 (culled)
  if (distSq < midDown * midDown) return 0;
  if (distSq < cullDown * cullDown) return 1;
  return 2;
}

/**
 * Binary visibility classification with hysteresis for small street props / furniture.
 */
export function classifyVisibleWithHysteresis(
  distSq: number,
  currentlyVisible: boolean,
  cullDist: number,
  hysteresis = 4.0,
): boolean {
  if (currentlyVisible) {
    const hideDist = cullDist + hysteresis;
    return distSq <= hideDist * hideDist;
  }
  const showDist = Math.max(4, cullDist - hysteresis);
  return distSq <= showDist * showDist;
}
