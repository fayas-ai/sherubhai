import { AABB } from '../types/game';
import { RESORT_POOL_BOUNDS, WORLD_RADIUS } from '../data/worldData';
import { isPointOnAnyRoad } from './roadNetwork';
import { isPointOnAirportTarmac, stepGroundVehiclePhysics } from './vehiclePhysics';
import { resolveCircleWorldCollision } from './gameLogic';
import { BEACH_ZONE, sampleRailwayElevation } from './railwayLogic';

export const OPEN_WORLD_GRAVITY = 24.5;

export type WorldSurfaceType = 'asphalt' | 'grass' | 'water' | 'ramp';

export interface WorldRamp {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  length: number;
  height: number;
  /** Direction of ascent (world yaw: forward unit vector is (sin(yaw), cos(yaw))) */
  yaw: number;
  accentColor: number;
}

/**
 * Four Kerala open-world stunt ramps placed strictly in verified clear plazas,
 * aprons, and turf strips (zero overlap with paved roads, buildings, or crowd routes).
 */
export const WORLD_RAMPS: WorldRamp[] = [
  {
    id: 'ramp_junction_se',
    name: 'Main Junction Stunt Ramp',
    x: 24,
    z: 6,
    width: 4.8,
    length: 8.4,
    height: 2.35,
    yaw: Math.PI / 2, // Ascends toward East (+X) along Main Junction East Plaza
    accentColor: 0xf59e0b,
  },
  {
    id: 'ramp_marine_beach',
    name: 'Marine Drive Beach Ramp',
    x: -24,
    z: 118,
    width: 5.2,
    length: 9.0,
    height: 2.65,
    yaw: Math.PI / 2, // Ascends toward East (+X)
    accentColor: 0x0ea5e9,
  },
  {
    id: 'ramp_west_turf',
    name: 'West Turf Arena Jump Ramp',
    x: -94,
    z: 52,
    width: 5.2,
    length: 9.0,
    height: 2.55,
    yaw: Math.PI, // Ascends toward North (-Z)
    accentColor: 0x22c55e,
  },
  {
    id: 'ramp_airport_apron',
    name: 'Kerala Airport Thrill Ramp',
    x: 42,
    z: -124,
    width: 5.6,
    length: 10.0,
    height: 2.95,
    yaw: -Math.PI / 2, // Ascends toward West (-X)
    accentColor: 0xef4444,
  },
];

export interface SurfaceSample {
  groundY: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  slope: number;
  grip: number;
  drag: number;
  surfaceType: WorldSurfaceType;
  rampId: string | null;
  rampDirX: number;
  rampDirZ: number;
}

/**
 * Samples the open-world physical ground height, slope normal, grip friction,
 * and surface type at any world (x, z) coordinate.
 */
export function sampleWorldSurface(x: number, z: number): SurfaceSample {
  for (let i = 0; i < WORLD_RAMPS.length; i++) {
    const r = WORLD_RAMPS[i];
    const dx = x - r.x;
    const dz = z - r.z;
    const fwdX = Math.sin(r.yaw);
    const fwdZ = Math.cos(r.yaw);
    const rightX = Math.cos(r.yaw);
    const rightZ = -Math.sin(r.yaw);

    const localForward = dx * fwdX + dz * fwdZ;
    const localRight = dx * rightX + dz * rightZ;
    const halfW = r.width * 0.5;
    const halfL = r.length * 0.5;

    if (
      Math.abs(localRight) <= halfW &&
      localForward >= -halfL &&
      localForward <= halfL
    ) {
      const t = (localForward + halfL) / r.length; // 0 at base, 1 at high lip
      const groundY = t * r.height;
      const slope = r.height / r.length;
      const invLen = 1 / Math.hypot(slope, 1);
      // Surface normal points upward and slightly backward against the ascent direction
      const normalX = -fwdX * slope * invLen;
      const normalY = invLen;
      const normalZ = -fwdZ * slope * invLen;
      return {
        groundY,
        normalX,
        normalY,
        normalZ,
        slope,
        grip: 0.96,
        drag: 0.35,
        surfaceType: 'ramp',
        rampId: r.id,
        rampDirX: fwdX,
        rampDirZ: fwdZ,
      };
    }
  }

  // Resort swimming pool water buoyancy & drag
  if (
    x >= RESORT_POOL_BOUNDS.minX &&
    x <= RESORT_POOL_BOUNDS.maxX &&
    z >= RESORT_POOL_BOUNDS.minZ &&
    z <= RESORT_POOL_BOUNDS.maxZ
  ) {
    return {
      groundY: -0.22,
      normalX: 0,
      normalY: 1,
      normalZ: 0,
      slope: 0,
      grip: 0.55,
      drag: 4.5,
      surfaceType: 'water',
      rampId: null,
      rampDirX: 0,
      rampDirZ: 0,
    };
  }

  // Walkable Railway Station Platforms & Elevated Foot-Overbridge Skybridges
  const railElev = sampleRailwayElevation(x, z);
  if (railElev > 0.01) {
    return {
      groundY: railElev,
      normalX: 0,
      normalY: 1,
      normalZ: 0,
      slope: 0,
      grip: 0.96,
      drag: 0.3,
      surfaceType: 'asphalt',
      rampId: null,
      rampDirX: 0,
      rampDirZ: 0,
    };
  }

  // Shallow Arabian Sea Shoreline Surf at Malabar Beach
  if (z >= BEACH_ZONE.shorelineZ && Math.abs(x) <= BEACH_ZONE.maxX + 10) {
    return {
      groundY: -0.18,
      normalX: 0,
      normalY: 1,
      normalZ: 0,
      slope: 0,
      grip: 0.62,
      drag: 3.6,
      surfaceType: 'water',
      rampId: null,
      rampDirX: 0,
      rampDirZ: 0,
    };
  }

  // Paved Kerala asphalt roads & airport tarmac
  if (isPointOnAnyRoad(x, z, 0) || isPointOnAirportTarmac(x, z)) {
    return {
      groundY: 0,
      normalX: 0,
      normalY: 1,
      normalZ: 0,
      slope: 0,
      grip: 1.0,
      drag: 0.28,
      surfaceType: 'asphalt',
      rampId: null,
      rampDirX: 0,
      rampDirZ: 0,
    };
  }

  // Golden Malabar Beach sand & coastal promenade
  if (z >= BEACH_ZONE.sandStartZ && Math.abs(x) <= BEACH_ZONE.maxX) {
    return {
      groundY: Math.abs(z - BEACH_ZONE.boardwalkZ) <= 3.6 && Math.abs(x) <= 46 ? 0.14 : 0.04,
      normalX: 0,
      normalY: 1,
      normalZ: 0,
      slope: 0,
      grip: 0.84,
      drag: 0.62,
      surfaceType: 'grass',
      rampId: null,
      rampDirX: 0,
      rampDirZ: 0,
    };
  }

  // Tropical grass / sandy shoulder
  return {
    groundY: 0,
    normalX: 0,
    normalY: 1,
    normalZ: 0,
    slope: 0,
    grip: 0.8,
    drag: 0.72,
    surfaceType: 'grass',
    rampId: null,
    rampDirX: 0,
    rampDirZ: 0,
  };
}

// ============================================================================
// 1. REAL MOMENTUM & SURFACE-GRIP CHARACTER PHYSICS
// ============================================================================

export interface CharacterPhysicsState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
}

export interface CharacterPhysicsInput {
  moveX: number; // world-space desired direction X (-1..1)
  moveZ: number; // world-space desired direction Z (-1..1)
  running: boolean;
}

export interface CharacterPhysicsResult extends CharacterPhysicsState {
  grounded: boolean;
  jumped: boolean;
  landed: boolean;
  landImpactSpeed: number;
  horizontalSpeed: number;
  surface: SurfaceSample;
}

export function stepCharacterPhysics(
  state: CharacterPhysicsState,
  input: CharacterPhysicsInput,
  colliders: AABB[],
  dt: number,
): CharacterPhysicsResult {
  const safeDt = Math.min(Math.max(dt, 0.001), 0.05);
  let { x, y, z, vx, vy, vz, yaw, coyoteTimer, jumpBufferTimer } = state;

  const prevSurface = sampleWorldSurface(x, z);
  const wasGrounded = y <= prevSurface.groundY + 0.08 && vy <= 0.6;

  // Desired horizontal velocity with surface-specific speed & momentum
  const inputMag = Math.min(1, Math.hypot(input.moveX, input.moveZ));
  const waterMult = prevSurface.surfaceType === 'water' ? 0.62 : 1.0;
  const maxSpeed = (input.running ? 13.4 : 7.8) * waterMult;
  const targetVx = inputMag > 0.04 ? (input.moveX / Math.max(1, inputMag)) * maxSpeed * inputMag : 0;
  const targetVz = inputMag > 0.04 ? (input.moveZ / Math.max(1, inputMag)) * maxSpeed * inputMag : 0;

  // Real Newtonian traction acceleration on ground vs reduced control in mid-air
  const accelRate = wasGrounded
    ? (inputMag > 0.04 ? 22.0 : 18.0) * prevSurface.grip
    : 5.5;
  const blend = 1 - Math.exp(-accelRate * safeDt);
  vx += (targetVx - vx) * blend;
  vz += (targetVz - vz) * blend;

  // Extra viscous water drag in Resort Pool
  if (prevSurface.surfaceType === 'water') {
    const waterDamp = Math.exp(-prevSurface.drag * 0.45 * safeDt);
    vx *= waterDamp;
    vz *= waterDamp;
  }

  if (Math.hypot(vx, vz) < 0.05 && inputMag <= 0.04) {
    vx = 0;
    vz = 0;
  }

  // Coyote time + buffered jump
  if (wasGrounded) {
    coyoteTimer = 0.11;
  } else {
    coyoteTimer = Math.max(0, coyoteTimer - safeDt);
  }
  jumpBufferTimer = Math.max(0, jumpBufferTimer - safeDt);

  let jumped = false;
  if (jumpBufferTimer > 0 && coyoteTimer > 0) {
    vy = prevSurface.surfaceType === 'water' ? 9.8 : 11.4;
    coyoteTimer = 0;
    jumpBufferTimer = 0;
    jumped = true;
  }

  // Advance horizontal position & resolve solid building colliders with wall sliding
  const nextX = x + vx * safeDt;
  const nextZ = z + vz * safeDt;
  const col = resolveCircleWorldCollision(nextX, nextZ, 0.8, colliders);
  if (col.collided) {
    // Project velocity along wall tangent (remove inward normal component)
    const pushX = col.x - nextX;
    const pushZ = col.z - nextZ;
    const pushLen = Math.hypot(pushX, pushZ);
    if (pushLen > 0.0001) {
      const nx = pushX / pushLen;
      const nz = pushZ / pushLen;
      const vn = vx * nx + vz * nz;
      if (vn < 0) {
        vx -= vn * nx;
        vz -= vn * nz;
      }
    }
  }
  x = col.x;
  z = col.z;

  const newSurface = sampleWorldSurface(x, z);

  // Ramp launch: if sprinting off the top lip of a ramp, carry real upward vertical momentum!
  if (
    wasGrounded &&
    !jumped &&
    prevSurface.surfaceType === 'ramp' &&
    newSurface.surfaceType !== 'ramp' &&
    prevSurface.groundY > 1.0
  ) {
    const upSpeed = vx * prevSurface.rampDirX + vz * prevSurface.rampDirZ;
    if (upSpeed > 2.0) {
      vy = Math.max(vy, upSpeed * prevSurface.slope * 1.12);
    }
  }

  // Gravity & vertical integration
  const wasAirborne = !wasGrounded || y > newSurface.groundY + 0.12;
  vy -= OPEN_WORLD_GRAVITY * safeDt;
  y += vy * safeDt;

  let landed = false;
  let landImpactSpeed = 0;
  let grounded = false;

  // Smoothly stick to ramp while climbing/descending unless jumping or launching off top lip
  if (
    wasGrounded &&
    !jumped &&
    newSurface.surfaceType === 'ramp' &&
    y <= newSurface.groundY + 0.45 &&
    vy <= 1.2
  ) {
    y = newSurface.groundY;
    vy = 0;
    grounded = true;
  } else if (y <= newSurface.groundY) {
    landImpactSpeed = Math.abs(vy);
    if (wasAirborne && vy < -3.2) {
      landed = true;
    }
    y = newSurface.groundY;
    vy = 0;
    grounded = true;
  }

  // Face movement direction smoothly
  const horizontalSpeed = Math.hypot(vx, vz);
  if (horizontalSpeed > 0.2) {
    const targetYaw = Math.atan2(vx, vz);
    const yawDiff = Math.atan2(Math.sin(targetYaw - yaw), Math.cos(targetYaw - yaw));
    yaw += yawDiff * (1 - Math.exp(-12 * safeDt));
  }

  return {
    x,
    y,
    z,
    vx,
    vy,
    vz,
    yaw,
    coyoteTimer,
    jumpBufferTimer,
    grounded,
    jumped,
    landed,
    landImpactSpeed,
    horizontalSpeed,
    surface: newSurface,
  };
}

// ============================================================================
// 2. REAL VEHICLE SUSPENSION, WEIGHT TRANSFER, DRIFT & AIRBORNE JUMP PHYSICS
// ============================================================================

export interface VehicleChassisState {
  x: number;
  y: number;
  z: number;
  vy: number;
  yaw: number;
  speed: number;
  lateralSpeed: number;
  steerAngle: number;
  steerInput: number;
  maxSpeed: number;
  pitch: number;
  roll: number;
  pitchVel: number;
  rollVel: number;
  suspY: number;
  suspVy: number;
  grounded: boolean;
}

export interface VehicleChassisInput {
  forward: number;
  strafe: number;
  boost: boolean;
  handbrake: boolean;
}

export interface VehicleChassisStepResult extends VehicleChassisState {
  drifting: boolean;
  launchedOffRamp: boolean;
  landedHard: boolean;
  landImpactSpeed: number;
  surface: SurfaceSample;
}

/**
 * Real open-world 3D vehicle physics:
 * - Responsive speed-sensitive steering + surface-dependent tire grip (asphalt vs grass vs water)
 * - Lateral tire slip / handbrake drift momentum
 * - Second-order spring-damper chassis suspension (acceleration squat, braking nose-dive, cornering body roll)
 * - Ramp climbing + real airborne parabolic jumps + landing spring rebound!
 */
export function stepVehicleChassisPhysics(
  state: VehicleChassisState,
  input: VehicleChassisInput,
  dt: number,
): VehicleChassisStepResult {
  const safeDt = Math.min(Math.max(dt, 0.001), 0.05);
  let {
    x,
    y,
    z,
    vy,
    yaw,
    speed,
    lateralSpeed,
    steerAngle,
    steerInput,
    maxSpeed,
    pitch,
    roll,
    pitchVel,
    rollVel,
    suspY,
    suspVy,
    grounded,
  } = state;

  const prevSpeed = speed;
  const prevSurface = sampleWorldSurface(x, z);
  const wasGrounded = grounded && y <= prevSurface.groundY + 0.14;

  if (wasGrounded) {
    // Surface-calibrated ground traction & speed cap
    const surfaceSpeedMult =
      prevSurface.surfaceType === 'water'
        ? 0.52
        : prevSurface.surfaceType === 'grass'
          ? 0.88
          : 1.0;

    const base = stepGroundVehiclePhysics(
      {
        speed,
        yaw,
        steerAngle,
        steerInput,
        maxSpeed: maxSpeed * surfaceSpeedMult,
      },
      input,
      safeDt,
    );

    const deltaYaw = Math.atan2(Math.sin(base.yaw - yaw), Math.cos(base.yaw - yaw));
    speed = base.speed;
    yaw = base.yaw;
    steerAngle = base.steerAngle;
    steerInput = base.steerInput;

    // Centrifugal lateral slip (tail swings out during fast cornering or handbrake!)
    const yawRate = deltaYaw / safeDt;
    const centrifugalForce = -speed * yawRate * (input.handbrake ? 0.58 : 0.24);
    lateralSpeed += centrifugalForce * safeDt;
    const lateralGrip = (input.handbrake ? 2.4 : 7.8) * prevSurface.grip;
    lateralSpeed *= Math.exp(-lateralGrip * safeDt);
    lateralSpeed = Math.max(-14, Math.min(14, lateralSpeed));
  } else {
    // Airborne ballistic trajectory: mild air drag, gentle mid-air steering damping
    speed *= Math.exp(-0.28 * safeDt);
    lateralSpeed *= Math.exp(-0.5 * safeDt);
    steerInput *= Math.exp(-4.5 * safeDt);
    steerAngle *= Math.exp(-6.0 * safeDt);
  }

  // World-space velocity combines forward heading + lateral drift slip
  const fwdX = Math.sin(yaw);
  const fwdZ = Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);

  const vx = fwdX * speed + rightX * lateralSpeed;
  const vz = fwdZ * speed + rightZ * lateralSpeed;

  x += vx * safeDt;
  z += vz * safeDt;

  const newSurface = sampleWorldSurface(x, z);

  // Detect launching off the high lip of a stunt ramp!
  let launchedOffRamp = false;
  if (
    wasGrounded &&
    prevSurface.surfaceType === 'ramp' &&
    newSurface.surfaceType !== 'ramp' &&
    prevSurface.groundY > 0.9
  ) {
    const alongRampSpeed = vx * prevSurface.rampDirX + vz * prevSurface.rampDirZ;
    if (alongRampSpeed > 5.0) {
      vy = Math.min(18.5, alongRampSpeed * prevSurface.slope * 1.18);
      launchedOffRamp = true;
      grounded = false;
    }
  }

  // Vertical gravity & ground/ramp contact
  let landedHard = false;
  let landImpactSpeed = 0;

  if (wasGrounded && !launchedOffRamp && newSurface.surfaceType === 'ramp' && y <= newSurface.groundY + 0.55) {
    // Tire contact follows ramp smoothly upward/downward
    y = newSurface.groundY;
    vy = 0;
    grounded = true;
  } else {
    vy -= OPEN_WORLD_GRAVITY * safeDt;
    y += vy * safeDt;
    if (y <= newSurface.groundY) {
      landImpactSpeed = Math.abs(vy);
      if (!wasGrounded && vy < -4.2) {
        landedHard = true;
        // Real spring suspension compression impulse on landing!
        suspVy -= Math.min(4.6, landImpactSpeed * 0.24);
      }
      y = newSurface.groundY;
      vy = 0;
      grounded = true;
    } else {
      grounded = false;
    }
  }

  // Second-order spring-damper chassis suspension & weight transfer
  const accelLongitudinal = (speed - prevSpeed) / safeDt;
  let targetPitch = 0;
  let targetRoll = 0;

  if (grounded) {
    // Slope pitch aligned with car heading
    let rampPitch = 0;
    if (newSurface.surfaceType === 'ramp') {
      const headingDot = fwdX * newSurface.rampDirX + fwdZ * newSurface.rampDirZ;
      rampPitch = Math.atan(newSurface.slope) * headingDot;
    }
    // Squat nose UP on hard accel, dive nose DOWN on hard braking!
    const weightTransferPitch = Math.max(-0.11, Math.min(0.11, accelLongitudinal * 0.0024));
    targetPitch = rampPitch + weightTransferPitch;

    // Roll outward in turns based on lateral g-force & steer speed
    const turnG = steerInput * Math.min(1, Math.abs(speed) / 22);
    targetRoll = Math.max(-0.14, Math.min(0.14, turnG * 0.11 + lateralSpeed * 0.012));
  } else {
    // In mid-air: nose pitches smoothly along vertical flight velocity
    const airRatio = vy / Math.max(10, Math.abs(speed));
    targetPitch = Math.max(-0.34, Math.min(0.36, Math.atan(airRatio) * 0.72));
    targetRoll = Math.max(-0.16, Math.min(0.16, steerInput * 0.08));
  }

  // Spring-damper integration (stiffness k, damping c)
  const kPitch = grounded ? 64 : 26;
  const cPitch = grounded ? 10.5 : 5.5;
  pitchVel += ((targetPitch - pitch) * kPitch - pitchVel * cPitch) * safeDt;
  pitch = Math.max(-0.48, Math.min(0.48, pitch + pitchVel * safeDt));

  const kRoll = grounded ? 68 : 22;
  const cRoll = grounded ? 11.0 : 5.0;
  rollVel += ((targetRoll - roll) * kRoll - rollVel * cRoll) * safeDt;
  roll = Math.max(-0.32, Math.min(0.32, roll + rollVel * safeDt));

  // Vertical suspension bounce spring
  const kSusp = 82;
  const cSusp = 11.5;
  suspVy += (-suspY * kSusp - suspVy * cSusp) * safeDt;
  suspY = Math.max(-0.28, Math.min(0.16, suspY + suspVy * safeDt));

  const drifting = grounded && (Math.abs(lateralSpeed) > 2.2 || (input.handbrake && Math.abs(speed) > 7));

  return {
    x,
    y,
    z,
    vy,
    yaw,
    speed,
    lateralSpeed,
    steerAngle,
    steerInput,
    maxSpeed,
    pitch,
    roll,
    pitchVel,
    rollVel,
    suspY,
    suspVy,
    grounded,
    drifting,
    launchedOffRamp,
    landedHard,
    landImpactSpeed,
    surface: newSurface,
  };
}

/**
 * Elastic momentum-conserving collision between two vehicles (player car vs parked/traffic vehicle).
 */
export function resolveVehiclePairCollision(
  ax: number,
  az: number,
  avx: number,
  avz: number,
  massA: number,
  bx: number,
  bz: number,
  bvx: number,
  bvz: number,
  massB: number,
  minDist = 3.1,
  restitution = 0.38,
): {
  collided: boolean;
  ax: number;
  az: number;
  avx: number;
  avz: number;
  bx: number;
  bz: number;
  bvx: number;
  bvz: number;
  impactSpeed: number;
} {
  const dx = bx - ax;
  const dz = bz - az;
  const dist = Math.hypot(dx, dz);
  if (dist >= minDist || dist < 0.0001) {
    return {
      collided: false,
      ax,
      az,
      avx,
      avz,
      bx,
      bz,
      bvx,
      bvz,
      impactSpeed: 0,
    };
  }

  const nx = dx / dist;
  const nz = dz / dist;
  const overlap = minDist - dist;
  const invA = 1 / Math.max(0.2, massA);
  const invB = 1 / Math.max(0.2, massB);
  const invSum = invA + invB;

  // Positional correction weighted by inverse mass
  ax -= nx * overlap * (invA / invSum);
  az -= nz * overlap * (invA / invSum);
  bx += nx * overlap * (invB / invSum);
  bz += nz * overlap * (invB / invSum);

  // Relative velocity along normal
  const rvx = bvx - avx;
  const rvz = bvz - avz;
  const velAlongNormal = rvx * nx + rvz * nz;

  if (velAlongNormal > 0) {
    return {
      collided: true,
      ax,
      az,
      avx,
      avz,
      bx,
      bz,
      bvx,
      bvz,
      impactSpeed: 0,
    };
  }

  const j = (-(1 + restitution) * velAlongNormal) / invSum;
  avx -= j * invA * nx;
  avz -= j * invA * nz;
  bvx += j * invB * nx;
  bvz += j * invB * nz;

  return {
    collided: true,
    ax,
    az,
    avx,
    avz,
    bx,
    bz,
    bvx,
    bvz,
    impactSpeed: Math.abs(velAlongNormal),
  };
}

// ============================================================================
// 3. REAL 3D RIGID-BODY INTERACTIVE OPEN-WORLD PROPS
// ============================================================================

export type PhysicsPropKind = 'football' | 'cone' | 'crate' | 'barrel';

export interface RigidBodyProp {
  id: string;
  kind: PhysicsPropKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  wx: number;
  wy: number;
  wz: number;
  radius: number;
  halfHeight: number;
  mass: number;
  restitution: number;
  friction: number;
  sleeping: boolean;
  spawnX: number;
  spawnZ: number;
}

export interface PhysicsDynamicActor {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  mass: number;
  kickBoost?: number; // extra upward pop for kicking footballs / hitting props
}

export interface PropImpactEvent {
  propId: string;
  kind: PhysicsPropKind;
  x: number;
  y: number;
  z: number;
  intensity: number;
  hitByActorId: string;
}

const PROP_SPECS: Record<
  PhysicsPropKind,
  { radius: number; halfHeight: number; mass: number; restitution: number; friction: number }
> = {
  football: { radius: 0.34, halfHeight: 0.34, mass: 0.55, restitution: 0.72, friction: 1.4 },
  cone: { radius: 0.32, halfHeight: 0.42, mass: 1.1, restitution: 0.42, friction: 4.2 },
  crate: { radius: 0.52, halfHeight: 0.48, mass: 3.4, restitution: 0.28, friction: 5.5 },
  barrel: { radius: 0.44, halfHeight: 0.55, mass: 4.8, restitution: 0.36, friction: 3.4 },
};

/**
 * Generates 32 deterministic interactive 3D physics props placed in lively Kerala
 * street clusters right around Main Junction, stunt ramps, turf, market, and beachfront.
 */
export function createOpenWorldProps(): RigidBodyProp[] {
  const placements: Array<{ id: string; kind: PhysicsPropKind; x: number; z: number }> = [
    // Right beside Main Junction & Sheru's starting crosswalk (instant physics playground!)
    { id: 'prop_ball_junction_1', kind: 'football', x: 6.4, z: 7.2 },
    { id: 'prop_ball_junction_2', kind: 'football', x: -6.4, z: 12.2 },
    { id: 'prop_cone_j1', kind: 'cone', x: 7.2, z: 13.4 },
    { id: 'prop_cone_j2', kind: 'cone', x: 7.2, z: 15.0 },
    { id: 'prop_cone_j3', kind: 'cone', x: 7.2, z: 16.6 },
    // Crate & barrel landing cluster right past Main Junction Stunt Ramp launch lip!
    { id: 'prop_crate_r1', kind: 'crate', x: 32.2, z: 5.2 },
    { id: 'prop_crate_r2', kind: 'crate', x: 33.4, z: 5.2 },
    { id: 'prop_crate_r3', kind: 'crate', x: 32.8, z: 6.4 },
    { id: 'prop_barrel_r1', kind: 'barrel', x: 32.2, z: 7.4 },
    { id: 'prop_barrel_r2', kind: 'barrel', x: 33.4, z: 7.4 },
    // Tea Shop & Supermart street-edge crates & cones
    { id: 'prop_crate_tea1', kind: 'crate', x: -9.8, z: -12.6 },
    { id: 'prop_crate_tea2', kind: 'crate', x: -9.8, z: -13.9 },
    { id: 'prop_barrel_mart1', kind: 'barrel', x: 9.8, z: -12.8 },
    { id: 'prop_cone_mart1', kind: 'cone', x: 9.2, z: -10.8 },
    { id: 'prop_cone_mart2', kind: 'cone', x: 10.6, z: -10.8 },
    // North Financial Square / Bank sidewalk cones & football
    { id: 'prop_cone_bank1', kind: 'cone', x: -7.5, z: -26.2 },
    { id: 'prop_cone_bank2', kind: 'cone', x: -9.0, z: -26.2 },
    { id: 'prop_ball_north', kind: 'football', x: 8.5, z: -24.5 },
    // South junction barrels & crates
    { id: 'prop_barrel_south1', kind: 'barrel', x: -8.2, z: 24.0 },
    { id: 'prop_barrel_south2', kind: 'barrel', x: -9.4, z: 24.8 },
    { id: 'prop_crate_south1', kind: 'crate', x: 8.5, z: 26.2 },
    // West Turf Arena footballs & cones
    { id: 'prop_ball_turf1', kind: 'football', x: -88.0, z: 48.0 },
    { id: 'prop_ball_turf2', kind: 'football', x: -90.2, z: 54.5 },
    { id: 'prop_cone_turf1', kind: 'cone', x: -88.5, z: 51.0 },
    { id: 'prop_cone_turf2', kind: 'cone', x: -88.5, z: 52.8 },
    // Marine Drive Beachfront balls, crates & barrels near Beach Stunt Ramp
    { id: 'prop_ball_beach1', kind: 'football', x: -16.5, z: 118.0 },
    { id: 'prop_crate_beach1', kind: 'crate', x: -14.8, z: 115.6 },
    { id: 'prop_barrel_beach1', kind: 'barrel', x: -14.8, z: 120.4 },
    // Kerala Airport Apron cones & drums near Airport Thrill Ramp
    { id: 'prop_cone_air1', kind: 'cone', x: 33.5, z: -121.0 },
    { id: 'prop_cone_air2', kind: 'cone', x: 33.5, z: -124.0 },
    { id: 'prop_cone_air3', kind: 'cone', x: 33.5, z: -127.0 },
    { id: 'prop_barrel_air1', kind: 'barrel', x: 32.0, z: -122.5 },
  ];

  return placements.map((p) => {
    const spec = PROP_SPECS[p.kind];
    const surf = sampleWorldSurface(p.x, p.z);
    return {
      id: p.id,
      kind: p.kind,
      x: p.x,
      y: surf.groundY + spec.halfHeight,
      z: p.z,
      vx: 0,
      vy: 0,
      vz: 0,
      rx: 0,
      ry: 0,
      rz: 0,
      wx: 0,
      wy: 0,
      wz: 0,
      radius: spec.radius,
      halfHeight: spec.halfHeight,
      mass: spec.mass,
      restitution: spec.restitution,
      friction: spec.friction,
      sleeping: true,
      spawnX: p.x,
      spawnZ: p.z,
    };
  });
}

/**
 * Steps all 3D rigid-body open-world props with real Newtonian gravity,
 * actor/vehicle impulse transfers, prop-to-prop elastic collisions,
 * building wall rebounds, ramp surfaces, rolling torque, and sleep optimization.
 */
export function stepRigidBodyProps(
  props: RigidBodyProp[],
  actors: PhysicsDynamicActor[],
  colliders: AABB[],
  dt: number,
): PropImpactEvent[] {
  const safeDt = Math.min(Math.max(dt, 0.001), 0.05);
  const impacts: PropImpactEvent[] = [];

  // 1. Actor (Sheru / Cars / Traffic) -> Prop impulse contacts
  for (let i = 0; i < props.length; i++) {
    const p = props[i];
    for (let aIdx = 0; aIdx < actors.length; aIdx++) {
      const a = actors[aIdx];
      // Vertical overlap guard (flying planes high above ground don't hit street props!)
      if (Math.abs(a.y + 0.8 - p.y) > 2.2) continue;

      const dx = p.x - a.x;
      const dz = p.z - a.z;
      const minDist = p.radius + a.radius;
      const distSq = dx * dx + dz * dz;
      if (distSq >= minDist * minDist) continue;

      const dist = Math.sqrt(distSq) || 0.001;
      const nx = dx / dist;
      const nz = dz / dist;
      const overlap = minDist - dist;

      // Push prop clear of actor
      p.x += nx * (overlap + 0.02);
      p.z += nz * (overlap + 0.02);

      // Impulse transfer based on actor velocity & mass ratio
      const relVx = a.vx - p.vx;
      const relVz = a.vz - p.vz;
      const approachSpeed = relVx * nx + relVz * nz;
      const actorSpeed = Math.hypot(a.vx, a.vz);
      const effectiveSpeed = Math.max(approachSpeed, actorSpeed * 0.72, 2.4);

      const massTransfer = (2 * a.mass) / (a.mass + p.mass);
      const impulseScale =
        p.kind === 'football'
          ? 1.25
          : p.kind === 'cone'
            ? 1.05
            : p.kind === 'crate'
              ? 0.82
              : 0.74;
      const pushVel = Math.min(28, effectiveSpeed * Math.min(1.6, massTransfer) * impulseScale);

      p.vx += nx * pushVel;
      p.vz += nz * pushVel;
      // Realistic upward pop on impact (footballs loft cleanly, cones/crates hop & tumble!)
      const upwardPop =
        (p.kind === 'football' ? 0.42 : p.kind === 'cone' ? 0.36 : 0.24) * pushVel +
        (a.kickBoost ?? 0);
      p.vy = Math.max(p.vy, Math.min(12.5, upwardPop));

      // 3D angular spin torque perpendicular to impulse direction
      p.wx += nz * (pushVel / Math.max(0.25, p.radius)) * 0.9;
      p.wz -= nx * (pushVel / Math.max(0.25, p.radius)) * 0.9;
      p.wy += (nx * a.vz - nz * a.vx) * 0.6;
      p.sleeping = false;

      if (pushVel > 2.6) {
        impacts.push({
          propId: p.id,
          kind: p.kind,
          x: p.x,
          y: p.y,
          z: p.z,
          intensity: Math.min(1, pushVel / 18),
          hitByActorId: a.id,
        });
      }
    }
  }

  // 2. Prop-to-Prop elastic momentum collisions (chain reactions!)
  for (let i = 0; i < props.length; i++) {
    const a = props[i];
    for (let j = i + 1; j < props.length; j++) {
      const b = props[j];
      if (a.sleeping && b.sleeping) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const minDist = a.radius + b.radius;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq >= minDist * minDist || distSq < 0.000001) continue;

      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;
      const overlap = minDist - dist;

      const invA = 1 / a.mass;
      const invB = 1 / b.mass;
      const invSum = invA + invB;

      a.x -= nx * overlap * (invA / invSum);
      a.y -= ny * overlap * (invA / invSum);
      a.z -= nz * overlap * (invA / invSum);
      b.x += nx * overlap * (invB / invSum);
      b.y += ny * overlap * (invB / invSum);
      b.z += nz * overlap * (invB / invSum);

      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const rvz = b.vz - a.vz;
      const vn = rvx * nx + rvy * ny + rvz * nz;
      if (vn < 0) {
        const e = Math.min(a.restitution, b.restitution);
        const impulse = (-(1 + e) * vn) / invSum;
        a.vx -= impulse * invA * nx;
        a.vy -= impulse * invA * ny;
        a.vz -= impulse * invA * nz;
        b.vx += impulse * invB * nx;
        b.vy += impulse * invB * ny;
        b.vz += impulse * invB * nz;

        // Transfer angular tumble to struck prop
        b.wx += nz * impulse * invB * 1.4;
        b.wz -= nx * impulse * invB * 1.4;
        a.sleeping = false;
        b.sleeping = false;
      }
    }
  }

  // 3. Integrate active props under gravity, surface friction, ramps & building walls
  for (let i = 0; i < props.length; i++) {
    const p = props[i];
    if (p.sleeping) continue;

    p.vy -= OPEN_WORLD_GRAVITY * safeDt;
    p.x += p.vx * safeDt;
    p.y += p.vy * safeDt;
    p.z += p.vz * safeDt;

    // Building wall & world boundary elastic bounce
    const col = resolveCircleWorldCollision(p.x, p.z, p.radius, colliders, WORLD_RADIUS - 3);
    if (col.collided) {
      const pushX = col.x - p.x;
      const pushZ = col.z - p.z;
      const pushLen = Math.hypot(pushX, pushZ);
      if (pushLen > 0.0001) {
        const nx = pushX / pushLen;
        const nz = pushZ / pushLen;
        const vn = p.vx * nx + p.vz * nz;
        if (vn < 0) {
          p.vx -= (1 + p.restitution) * vn * nx;
          p.vz -= (1 + p.restitution) * vn * nz;
          p.wy += (nx * p.vz - nz * p.vx) * 0.4;
        }
      }
      p.x = col.x;
      p.z = col.z;
    }

    // Ground & Ramp surface contact + restitution bounce + rolling torque
    const surf = sampleWorldSurface(p.x, p.z);
    const floorY = surf.groundY + p.halfHeight;

    if (p.y <= floorY) {
      p.y = floorY;
      if (p.vy < -1.15) {
        p.vy = -p.vy * p.restitution;
        // Bounce imparts slight random-free spin damping
        p.wx *= 0.86;
        p.wz *= 0.86;
      } else {
        p.vy = 0;
      }

      // Slope gravity acceleration when resting/rolling on a ramp!
      if (surf.surfaceType === 'ramp') {
        const slopeAccel = OPEN_WORLD_GRAVITY * surf.slope;
        p.vx -= surf.rampDirX * slopeAccel * safeDt;
        p.vz -= surf.rampDirZ * slopeAccel * safeDt;
      }

      // Surface rolling / sliding friction
      const dragRate =
        p.friction * (surf.surfaceType === 'water' ? 2.4 : surf.surfaceType === 'grass' ? 1.25 : 1.0);
      const decay = Math.exp(-dragRate * safeDt);
      p.vx *= decay;
      p.vz *= decay;

      if (p.kind === 'football') {
        // Pure rolling kinematics: omega = v / r
        p.wx = p.vz / p.radius;
        p.wz = -p.vx / p.radius;
        p.wy *= Math.exp(-3.5 * safeDt);
      } else {
        // Boxes/cones/barrels settle upright or tipped with angular damping
        const angDecay = Math.exp(-6.2 * safeDt);
        p.wx *= angDecay;
        p.wy *= angDecay;
        p.wz *= angDecay;
        // Gentle self-righting torque for heavy crates & low-speed cones so clusters stay tidy
        if (Math.hypot(p.vx, p.vz) < 0.8 && Math.abs(p.vy) < 0.2) {
          if (p.kind === 'crate' || p.kind === 'barrel') {
            const settle = 1 - Math.exp(-5 * safeDt);
            p.rx += (0 - p.rx) * settle;
            p.rz += (0 - p.rz) * settle;
          }
        }
      }
    } else {
      // Gentle air drag
      const airDamp = Math.exp(-0.22 * safeDt);
      p.vx *= airDamp;
      p.vz *= airDamp;
    }

    p.rx += p.wx * safeDt;
    p.ry += p.wy * safeDt;
    p.rz += p.wz * safeDt;

    // Sleep optimization when resting calmly on flat ground
    const linSpeedSq = p.vx * p.vx + p.vy * p.vy + p.vz * p.vz;
    const angSpeedSq = p.wx * p.wx + p.wy * p.wy + p.wz * p.wz;
    const onFlatFloor = surf.surfaceType !== 'ramp' && Math.abs(p.y - floorY) < 0.02;
    if (onFlatFloor && linSpeedSq < 0.008 && angSpeedSq < 0.015) {
      p.vx = 0;
      p.vy = 0;
      p.vz = 0;
      p.wx = 0;
      p.wy = 0;
      p.wz = 0;
      p.sleeping = true;
    }
  }

  return impacts;
}
