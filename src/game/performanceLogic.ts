import { GraphicsQuality } from '../types/game';
import { LOD_SCALE_STEPS } from './lodSystem';

export interface DeviceCapabilitiesInput {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  viewportWidth?: number;
  devicePixelRatio?: number;
  isTouch?: boolean;
  isSoftwareGl?: boolean;
  requestedQuality?: GraphicsQuality;
}

export interface PerformanceBudget {
  effectiveQuality: GraphicsQuality;
  dprCap: number;
  shadowsEnabled: boolean;
  shadowMapSize: 512 | 1024;
  maxAnimatedNpcs: number;
  maxAnimatedCrowd: number;
  crowdCullDist: number;
  trafficPerRoadCap: number;
  maxAnisotropy: number;
  adSyncInterval: number;
  initialLodScale: number;
}

export interface AdaptivePerfState {
  avgFrameMs: number;
  currentDpr: number;
  baseDpr: number;
  minDpr: number;
  shadowsEnabled: boolean;
  baseShadowsEnabled: boolean;
  lodScale: number;
  baseLodScale: number;
  lodStepIndex: number;
  baseLodStepIndex: number;
  lowFpsSeconds: number;
  highFpsSeconds: number;
  qualityStepDrops: number;
}

/**
 * Pure all-device capability & low-lag budget resolver:
 * Automatically scales pixel ratio, shadow map size, dynamic LOD bias, and animation culling
 * budgets cleanly across entry-level mobile phones (4GB RAM / small screens), tablets,
 * laptops, high-end desktops, and software-WebGL environments without altering scene content.
 */
export function detectDevicePerformanceBudget(
  caps: DeviceCapabilitiesInput,
): PerformanceBudget {
  const cores = caps.hardwareConcurrency ?? 4;
  const memGb = caps.deviceMemory ?? 4;
  const width = caps.viewportWidth ?? 1280;
  const nativeDpr = Math.max(1, caps.devicePixelRatio ?? 1);
  const isMobile = Boolean(caps.isTouch || width < 820);
  const isLowEndHardware = cores <= 4 || memGb <= 4;
  const requested = caps.requestedQuality ?? 'medium';

  if (caps.isSoftwareGl) {
    return {
      effectiveQuality: requested,
      dprCap: 1,
      shadowsEnabled: false,
      shadowMapSize: 512,
      maxAnimatedNpcs: 16,
      maxAnimatedCrowd: 28,
      crowdCullDist: 62,
      trafficPerRoadCap: requested === 'low' ? 2 : 3,
      maxAnisotropy: 4,
      adSyncInterval: 0.35,
      initialLodScale: 1.0,
    };
  }

  // Respect explicit user Low setting or automatically protect low-end mobile devices from fill-rate & draw-call lag
  if (requested === 'low' || (isMobile && isLowEndHardware && requested !== 'high')) {
    return {
      effectiveQuality: 'low',
      dprCap: Math.min(nativeDpr, 1.0),
      shadowsEnabled: false,
      shadowMapSize: 512,
      maxAnimatedNpcs: 12,
      maxAnimatedCrowd: 20,
      crowdCullDist: 46,
      trafficPerRoadCap: 2,
      maxAnisotropy: 2,
      adSyncInterval: 0.42,
      initialLodScale: isMobile && isLowEndHardware ? 0.84 : 1.0,
    };
  }

  if (requested === 'medium' || isMobile) {
    return {
      effectiveQuality: 'medium',
      dprCap: Math.min(nativeDpr, isMobile ? 1.15 : 1.35),
      shadowsEnabled: true,
      shadowMapSize: isMobile ? 512 : 1024,
      maxAnimatedNpcs: 18,
      maxAnimatedCrowd: 32,
      crowdCullDist: 64,
      trafficPerRoadCap: 3,
      maxAnisotropy: 4,
      adSyncInterval: 0.3,
      initialLodScale: isMobile ? 0.84 : 1.0,
    };
  }

  return {
    effectiveQuality: 'high',
    dprCap: Math.min(nativeDpr, 1.75),
    shadowsEnabled: true,
    shadowMapSize: 1024,
    maxAnimatedNpcs: 26,
    maxAnimatedCrowd: 48,
    crowdCullDist: 92,
    trafficPerRoadCap: 10,
    maxAnisotropy: 8,
    adSyncInterval: 0.24,
    initialLodScale: 1.0,
  };
}

function findClosestLodStepIndex(scale: number): number {
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < LOD_SCALE_STEPS.length; i++) {
    const diff = Math.abs(LOD_SCALE_STEPS[i] - scale);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function createAdaptivePerfState(
  baseDpr: number,
  shadowsEnabled: boolean,
  baseLodScale = 1.0,
): AdaptivePerfState {
  const safeBase = Math.max(0.75, Math.min(2.0, baseDpr));
  const baseLodStepIndex = findClosestLodStepIndex(baseLodScale);
  const resolvedLodScale = LOD_SCALE_STEPS[baseLodStepIndex];
  return {
    avgFrameMs: 16.67,
    currentDpr: safeBase,
    baseDpr: safeBase,
    minDpr: 0.75,
    shadowsEnabled,
    baseShadowsEnabled: shadowsEnabled,
    lodScale: resolvedLodScale,
    baseLodScale: resolvedLodScale,
    lodStepIndex: baseLodStepIndex,
    baseLodStepIndex,
    lowFpsSeconds: 0,
    highFpsSeconds: 0,
    qualityStepDrops: 0,
  };
}

/**
 * Dynamic frame-time governor (zero-lag safeguard):
 * Smoothly tightens 3D LOD detail scale & DPR (and shadows if still lagging) when sustained
 * frame time > 31ms (<32 FPS), and restores full detail automatically once frame time settles
 * < 19ms (>52 FPS).
 */
export function stepAdaptivePerformance(
  state: AdaptivePerfState,
  frameDtSec: number,
  isSoftwareGl: boolean,
): { state: AdaptivePerfState; changed: boolean } {
  if (isSoftwareGl) return { state, changed: false };

  const clampedDt = Math.max(0.004, Math.min(frameDtSec, 0.2));
  const frameMs = clampedDt * 1000;
  const avgFrameMs = state.avgFrameMs * 0.88 + frameMs * 0.12;

  let lowFpsSeconds = avgFrameMs > 31 ? state.lowFpsSeconds + clampedDt : 0;
  let highFpsSeconds = avgFrameMs < 19 ? state.highFpsSeconds + clampedDt : 0;
  let currentDpr = state.currentDpr;
  let shadowsEnabled = state.shadowsEnabled;
  let lodStepIndex = state.lodStepIndex;
  let lodScale = state.lodScale;
  let qualityStepDrops = state.qualityStepDrops;
  let changed = false;

  const maxLodStepIdx = LOD_SCALE_STEPS.length - 1;

  if (lowFpsSeconds >= 1.8) {
    lowFpsSeconds = 0;
    // Step down LOD distances first/together with DPR to cut both draw calls and pixel fill rate
    if (lodStepIndex < maxLodStepIdx) {
      lodStepIndex += 1;
      lodScale = LOD_SCALE_STEPS[lodStepIndex];
      changed = true;
    }
    if (currentDpr > state.minDpr + 0.02) {
      currentDpr = Math.max(state.minDpr, Number((currentDpr - 0.15).toFixed(2)));
      changed = true;
    } else if (shadowsEnabled) {
      shadowsEnabled = false;
      changed = true;
    }
    if (changed) {
      qualityStepDrops += 1;
    }
  } else if (highFpsSeconds >= 3.6 && qualityStepDrops > 0) {
    highFpsSeconds = 0;
    if (!shadowsEnabled && state.baseShadowsEnabled) {
      shadowsEnabled = true;
      changed = true;
    }
    if (currentDpr < state.baseDpr - 0.02) {
      currentDpr = Math.min(state.baseDpr, Number((currentDpr + 0.15).toFixed(2)));
      changed = true;
    }
    if (lodStepIndex > state.baseLodStepIndex) {
      lodStepIndex -= 1;
      lodScale = LOD_SCALE_STEPS[lodStepIndex];
      changed = true;
    }
    if (changed) {
      qualityStepDrops = Math.max(0, qualityStepDrops - 1);
    }
  }

  return {
    state: {
      ...state,
      avgFrameMs,
      currentDpr,
      shadowsEnabled,
      lodScale,
      lodStepIndex,
      lowFpsSeconds,
      highFpsSeconds,
      qualityStepDrops,
    },
    changed,
  };
}

