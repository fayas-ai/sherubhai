import { VehicleDef } from '../types/game';
import { RoadSegmentDef, SHERU_STATUE_ROUNDABOUT, getRoadBounds } from './roadNetwork';

export interface TrafficFootprint {
  halfW: number;
  halfL: number;
  radius: number;
}

/**
 * Exact 2D chassis half-extents for every Kerala traffic vehicle type
 * (matched to createDetailedVehicleModel in vehicleModels.ts).
 */
export function getTrafficVehicleDimensions(type: VehicleDef['type']): TrafficFootprint {
  switch (type) {
    case 'bus':
    case 'private_bus':
    case 'ksrtc_bus':
    case 'school_bus':
    case 'tourist_bus':
      return { halfW: 1.15, halfL: 2.9, radius: 3.12 };
    case 'mini_bus':
    case 'fire_engine':
    case 'goods_truck':
      return { halfW: 1.06, halfL: 2.45, radius: 2.67 };
    case 'ambulance':
    case 'delivery_van':
    case 'mini_truck':
      return { halfW: 0.98, halfL: 2.15, radius: 2.36 };
    case 'scooter':
    case 'motorcycle':
    case 'bicycle':
      return { halfW: 0.42, halfL: 0.95, radius: 1.04 };
    case 'auto':
      return { halfW: 0.72, halfL: 1.25, radius: 1.44 };
    default:
      // Cars, taxis, police_jeep, jeep, suv, hatchback, sports_car
      return { halfW: 0.95, halfL: 2.02, radius: 2.23 };
  }
}

export interface AiTurnSteeringResult {
  nextYaw: number;
  turnSpeedScale: number;
  absYawDiff: number;
}

/**
 * Computes smooth AI yaw steering and corner speed moderation so long buses and cars
 * slow cleanly into U-turns instead of swinging wide off paved asphalt onto grass.
 */
export function computeAiTurnSteering(
  currentYaw: number,
  dx: number,
  dz: number,
  dt: number,
): AiTurnSteeringResult {
  if (dx * dx + dz * dz < 1e-6) {
    return { nextYaw: currentYaw, turnSpeedScale: 1, absYawDiff: 0 };
  }
  const desiredYaw = Math.atan2(dx, dz);
  const yawDiff = Math.atan2(Math.sin(desiredYaw - currentYaw), Math.cos(desiredYaw - currentYaw));
  const absYawDiff = Math.abs(yawDiff);

  // Pivot briskly on sharp U-turns while keeping gentle steering on straightaways
  const maxTurnRate = absYawDiff > 0.6 ? 6.2 : 3.6;
  const maxStep = maxTurnRate * dt;
  const clampedDiff = Math.max(-maxStep, Math.min(maxStep, yawDiff));
  const nextYaw = currentYaw + clampedDiff;

  let turnSpeedScale = 1.0;
  if (absYawDiff > 1.05) {
    turnSpeedScale = 0.22;
  } else if (absYawDiff > 0.55) {
    turnSpeedScale = 0.42;
  } else if (absYawDiff > 0.22) {
    turnSpeedScale = Math.max(0.58, Math.cos(absYawDiff));
  }

  return { nextYaw, turnSpeedScale, absYawDiff };
}

/**
 * Returns the 4 world-space XZ corners of a vehicle's oriented bounding box.
 */
export function getVehicleWorldCorners(
  x: number,
  z: number,
  yaw: number,
  type: VehicleDef['type'],
): Array<{ x: number; z: number }> {
  const { halfW, halfL } = getTrafficVehicleDimensions(type);
  const fwdX = Math.sin(yaw);
  const fwdZ = Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);

  return [
    { x: x + fwdX * halfL + rightX * halfW, z: z + fwdZ * halfL + rightZ * halfW },
    { x: x + fwdX * halfL - rightX * halfW, z: z + fwdZ * halfL - rightZ * halfW },
    { x: x - fwdX * halfL + rightX * halfW, z: z - fwdZ * halfL + rightZ * halfW },
    { x: x - fwdX * halfL - rightX * halfW, z: z - fwdZ * halfL - rightZ * halfW },
  ];
}

/**
 * Keeps an AI vehicle's ENTIRE rotated chassis strictly inside its assigned paved road asphalt
 * (except within the Main Junction roundabout plaza where lanes curve around the Golden Statue).
 * Prevents buses and cars from ever swinging onto grass lawns or sidewalks!
 */
export function clampAiVehicleToRoad(
  x: number,
  z: number,
  yaw: number,
  type: VehicleDef['type'],
  road: RoadSegmentDef,
  curbMargin = 0.16,
): { x: number; z: number; clamped: boolean } {
  const distStatue = Math.hypot(x - SHERU_STATUE_ROUNDABOUT.x, z - SHERU_STATUE_ROUNDABOUT.z);
  const { halfW, halfL } = getTrafficVehicleDimensions(type);
  const absCos = Math.abs(Math.cos(yaw));
  const absSin = Math.abs(Math.sin(yaw));

  // Projected world-axis half extents of the rotated vehicle OBB
  const extX = halfW * absCos + halfL * absSin;
  const extZ = halfW * absSin + halfL * absCos;

  // Inside Main Junction Roundabout Plaza, keep inside circular plaza apron
  if (distStatue < SHERU_STATUE_ROUNDABOUT.plazaRadius - 1.2) {
    const maxR = SHERU_STATUE_ROUNDABOUT.plazaRadius - Math.max(halfW, 1.1);
    if (distStatue > maxR && distStatue > 0.001) {
      const s = maxR / distStatue;
      return {
        x: SHERU_STATUE_ROUNDABOUT.x + (x - SHERU_STATUE_ROUNDABOUT.x) * s,
        z: SHERU_STATUE_ROUNDABOUT.z + (z - SHERU_STATUE_ROUNDABOUT.z) * s,
        clamped: true,
      };
    }
    return { x, z, clamped: false };
  }

  const b = getRoadBounds(road);
  const halfSpanX = (b.maxX - b.minX) * 0.5;
  const halfSpanZ = (b.maxZ - b.minZ) * 0.5;

  const padX = Math.min(extX + curbMargin, Math.max(0.2, halfSpanX - 0.1));
  const padZ = Math.min(extZ + curbMargin, Math.max(0.2, halfSpanZ - 0.1));

  const cx = Math.max(b.minX + padX, Math.min(b.maxX - padX, x));
  const cz = Math.max(b.minZ + padZ, Math.min(b.maxZ - padZ, z));
  return {
    x: cx,
    z: cz,
    clamped: Math.abs(cx - x) > 1e-4 || Math.abs(cz - z) > 1e-4,
  };
}

export interface AiObstacleBrakeResult {
  shouldStop: boolean;
  speedScale: number;
}

/**
 * Forward & angled bumper radar for AI traffic vehicles against another vehicle or pedestrian.
 */
export function evaluateAiForwardBrake(
  aiX: number,
  aiZ: number,
  aiYaw: number,
  aiType: VehicleDef['type'],
  obsX: number,
  obsZ: number,
  obsHalfW: number,
  obsHalfL: number,
): AiObstacleBrakeResult {
  const my = getTrafficVehicleDimensions(aiType);
  const dx = obsX - aiX;
  const dz = obsZ - aiZ;
  const maxCheck = my.halfL + obsHalfL + 6.5;
  if (dx * dx + dz * dz > maxCheck * maxCheck) {
    return { shouldStop: false, speedScale: 1 };
  }

  const fwdX = Math.sin(aiYaw);
  const fwdZ = Math.cos(aiYaw);
  const rightX = Math.cos(aiYaw);
  const rightZ = -Math.sin(aiYaw);

  const fwd = dx * fwdX + dz * fwdZ;
  const lat = Math.abs(dx * rightX + dz * rightZ);

  const latLimit = my.halfW + obsHalfW + 0.42;
  const stopDist = my.halfL + obsHalfL + 1.85;
  const slowDist = stopDist + 4.4;

  if (fwd > 0.25 && fwd < slowDist && lat < latLimit) {
    if (fwd <= stopDist) {
      return { shouldStop: true, speedScale: 0 };
    }
    const t = (fwd - stopDist) / Math.max(0.1, slowDist - stopDist);
    return { shouldStop: false, speedScale: Math.max(0.12, Math.min(1, t * 0.78)) };
  }

  return { shouldStop: false, speedScale: 1 };
}

export interface AiBody2D {
  x: number;
  z: number;
  yaw: number;
  type: VehicleDef['type'];
}

export interface ObbOverlapResult {
  overlapped: boolean;
  pushX: number;
  pushZ: number;
  penetration: number;
}

/**
 * Exact 2D Oriented Bounding Box Separating Axis Theorem (SAT) overlap test between
 * two traffic vehicles. Returns zero false positives for opposing lanes 4.4m apart
 * while returning the exact minimum separation vector if any corners touch or intersect!
 */
export function computeVehicleObbOverlap(
  a: AiBody2D,
  b: AiBody2D,
  padding = 0.14,
): ObbOverlapResult {
  const dimA = getTrafficVehicleDimensions(a.type);
  const dimB = getTrafficVehicleDimensions(b.type);

  // Broad-phase circle reject
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const maxR = dimA.radius + dimB.radius + padding * 2;
  if (dx * dx + dz * dz >= maxR * maxR) {
    return { overlapped: false, pushX: 0, pushZ: 0, penetration: 0 };
  }

  const aHalfW = dimA.halfW + padding;
  const aHalfL = dimA.halfL + padding;
  const bHalfW = dimB.halfW + padding;
  const bHalfL = dimB.halfL + padding;

  const aFx = Math.sin(a.yaw);
  const aFz = Math.cos(a.yaw);
  const aRx = Math.cos(a.yaw);
  const aRz = -Math.sin(a.yaw);

  const bFx = Math.sin(b.yaw);
  const bFz = Math.cos(b.yaw);
  const bRx = Math.cos(b.yaw);
  const bRz = -Math.sin(b.yaw);

  // Test the 4 SAT candidate axes: A's right/forward and B's right/forward
  const axes: [number, number][] = [
    [aRx, aRz],
    [aFx, aFz],
    [bRx, bRz],
    [bFx, bFz],
  ];

  let minOverlap = Infinity;
  let bestAxisX = 1;
  let bestAxisZ = 0;

  for (let i = 0; i < 4; i++) {
    const ax = axes[i][0];
    const az = axes[i][1];

    const projA =
      aHalfW * Math.abs(aRx * ax + aRz * az) + aHalfL * Math.abs(aFx * ax + aFz * az);
    const projB =
      bHalfW * Math.abs(bRx * ax + bRz * az) + bHalfL * Math.abs(bFx * ax + bFz * az);
    const centerDist = Math.abs(dx * ax + dz * az);
    const overlap = projA + projB - centerDist;

    if (overlap <= 0) {
      return { overlapped: false, pushX: 0, pushZ: 0, penetration: 0 };
    }

    if (overlap < minOverlap) {
      minOverlap = overlap;
      // Ensure push points from A -> B
      const sign = dx * ax + dz * az >= 0 ? 1 : -1;
      bestAxisX = ax * sign;
      bestAxisZ = az * sign;
    }
  }

  return {
    overlapped: true,
    pushX: bestAxisX * minOverlap,
    pushZ: bestAxisZ * minOverlap,
    penetration: minOverlap,
  };
}

export interface RoadEgoTriggerInput {
  isDrivingGroundVehicle: boolean;
  aiType: VehicleDef['type'];
  aiIsAuto: boolean;
  aiIsBus: boolean;
  distPlayer: number;
  roadEgoCooldown: number;
}

/**
 * Determines whether an AI bus or auto should trigger the humorous Kerala "Don't honk at me!"
 * Road Ego banner. Only fires when Sheru Bhai is actively driving a ground vehicle on the road
 * (NEVER while walking on foot or flying!) and excludes school buses from Komban Private Bus ego.
 */
export function shouldTriggerRoadEgo(input: RoadEgoTriggerInput): 'bus' | 'auto' | null {
  if (!input.isDrivingGroundVehicle) return null;
  if (input.roadEgoCooldown > 0) return null;
  if (input.distPlayer >= 7.2) return null;

  if (input.aiIsAuto) return 'auto';
  if (input.aiIsBus && input.aiType !== 'school_bus') return 'bus';
  return null;
}
