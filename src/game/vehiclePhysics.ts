import { VehicleArchetype } from '../types/game';

export const AIRPORT_RUNWAY = {
  centerX: 0,
  centerZ: -146,
  length: 196,
  width: 22,
  minX: -98,
  maxX: 98,
  minZ: -157,
  maxZ: -135,
  apronZ: -126,
  terminalX: 0,
  terminalZ: -112,
  takeoffStartX: -72,
  takeoffStartZ: -146,
  takeoffYaw: Math.PI / 2, // Facing East (+X) straight down Runway 09 -> 27
} as const;

export function isAircraftType(type: VehicleArchetype): boolean {
  return (
    type === 'airplane_jet' ||
    type === 'airplane_airliner' ||
    type === 'airplane_prop'
  );
}

export function isPointOnRunway(x: number, z: number, margin = 4): boolean {
  return (
    x >= AIRPORT_RUNWAY.minX - margin &&
    x <= AIRPORT_RUNWAY.maxX + margin &&
    z >= AIRPORT_RUNWAY.minZ - margin &&
    z <= AIRPORT_RUNWAY.maxZ + margin
  );
}

/**
 * Full safe landing surface at Kerala International Airport:
 * Runway 09/27 + shoulders + connected concrete Apron & Taxiways.
 */
export function isPointOnAirportTarmac(x: number, z: number): boolean {
  if (isPointOnRunway(x, z, 6)) return true;
  // Connected Concrete Apron & Taxiways north of Terminal
  return x >= -54 && x <= 54 && z >= -137 && z <= -118;
}

/**
 * Evaluates whether a manual aeroplane touchdown is a safe Airport landing
 * or an off-runway crash blast (e.g. landing on town roads or streets).
 */
export function evaluateAirplaneLanding(
  x: number,
  z: number,
  peakAltitude: number,
  wasAutoLand: boolean,
): 'safe_runway' | 'crash_blast' {
  if (wasAutoLand) return 'safe_runway';
  if (isPointOnAirportTarmac(x, z)) return 'safe_runway';
  if (peakAltitude < 2.2) return 'safe_runway';
  return 'crash_blast';
}

/**
 * Mobile Flight Cursor Control:
 * - Cursor pushed UP (touchMoveY < -0.22): Full throttle + Climb / Fly UP!
 * - Cursor pulled DOWN (touchMoveY > 0.22): Descend / Land DOWN!
 * - Cursor LEFT / RIGHT (touchMoveX): Smooth banked turning!
 */
export function mapMobileFlightCursor(
  touchMoveX: number,
  touchMoveY: number,
  isAirborne: boolean,
): { throttle: number; turn: number; climb: boolean; descend: boolean } {
  const turn = Math.max(-1, Math.min(1, touchMoveX));
  if (touchMoveY < -0.22) {
    return {
      throttle: Math.min(1, Math.max(0.65, -touchMoveY)),
      turn,
      climb: true,
      descend: false,
    };
  }
  if (touchMoveY > 0.22) {
    return {
      throttle: isAirborne ? -0.35 : -Math.min(1, touchMoveY),
      turn,
      climb: false,
      descend: true,
    };
  }
  return {
    throttle: 0,
    turn,
    climb: false,
    descend: false,
  };
}

export interface GroundVehiclePhysicsState {
  speed: number;
  yaw: number;
  steerAngle: number;
  steerInput: number;
  maxSpeed: number;
}

export interface GroundVehicleInput {
  forward: number; // -1..1 (W / S)
  strafe: number; // -1..1 (A = -1, D = +1)
  boost: boolean; // Shift
  handbrake: boolean; // Space
}

/**
 * Arcade-friendly Easy Driving physics:
 * - Speed-sensitive smooth steering (nimble at low speed, rock-steady at 180 km/h—never twitchy!)
 * - Smooth analog-feel steering ramp even on digital WASD keys
 * - Smart ABS braking: pressing S while moving forward brakes crisply before smoothly reversing
 * - Gentle speed decay when coasting so cars feel planted and effortless to park
 */
export function stepGroundVehiclePhysics(
  state: GroundVehiclePhysicsState,
  input: GroundVehicleInput,
  dt: number,
): GroundVehiclePhysicsState {
  const safeDt = Math.min(Math.max(dt, 0.001), 0.05);
  let { speed, yaw, steerAngle, steerInput } = state;
  const maxSpeed = state.maxSpeed;
  const forward = Math.max(-1, Math.min(1, input.forward));
  const strafe = Math.max(-1, Math.min(1, input.strafe));

  // Smooth steering ramp-in & instant auto-center when keys are released
  const steerLerpRate = Math.abs(strafe) > 0.05 ? 9.5 : 13.0;
  steerInput = steerInput + (strafe - steerInput) * (1 - Math.exp(-steerLerpRate * safeDt));

  // Smart acceleration & ABS braking
  if (input.handbrake) {
    speed *= Math.exp(-9.5 * safeDt);
    if (Math.abs(speed) < 0.25) speed = 0;
  } else if (forward > 0.05) {
    if (speed < -0.5) {
      // Braking from reverse to stop
      speed += 44 * safeDt;
    } else {
      const accel = input.boost ? 34 : 25;
      speed += forward * accel * safeDt;
    }
  } else if (forward < -0.05) {
    if (speed > 0.8) {
      // Crisp, smooth ABS braking while moving forward (much easier than sluggish reverse!)
      speed = Math.max(0, speed - 48 * safeDt);
    } else {
      // Smooth, easy reverse speed
      speed += forward * 16 * safeDt;
    }
  } else {
    // Gentle coasting deceleration
    speed *= Math.exp(-3.4 * safeDt);
    if (Math.abs(speed) < 0.15) speed = 0;
  }

  speed = Math.max(-maxSpeed * 0.38, Math.min(maxSpeed, speed));

  // Speed-sensitive steering: nimble in tight Kerala streets, rock-steady at 180 km/h!
  const absSpeed = Math.abs(speed);
  const speedRatio = Math.min(1, absSpeed / Math.max(12, maxSpeed));
  const maxSteerVisual = 0.44 * (1 - speedRatio * 0.35);
  steerAngle = steerAngle + (-steerInput * maxSteerVisual - steerAngle) * (1 - Math.exp(-12 * safeDt));

  if (absSpeed > 0.25) {
    const turnDir = speed >= 0 ? 1 : -1;
    // Smooth low-speed ramp so creeping starts turn gently; tapers cleanly at highway speed
    const lowSpeedRamp = Math.min(1, absSpeed / 4.2);
    const highSpeedStability = 1 - speedRatio * 0.52; // 1.0 -> 0.48 at max speed
    const turnRate = (input.handbrake ? 2.35 : 1.95) * lowSpeedRamp * highSpeedStability;
    yaw -= steerInput * turnRate * safeDt * turnDir;
  }

  return {
    speed,
    yaw,
    steerAngle,
    steerInput,
    maxSpeed,
  };
}

export interface AirplanePhysicsState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number; // radians (+nose up)
  roll: number; // radians (+left bank)
  speed: number;
  maxSpeed: number;
  steerInput: number;
}

export interface AirplaneInput {
  throttle: number; // -1..1 (W = +1, S = -1)
  turn: number; // -1..1 (A = -1, D = +1)
  climb: boolean; // Space
  descend: boolean; // Shift / C
  autoLand?: boolean;
}

export interface AirplaneStepResult extends AirplanePhysicsState {
  flightState: 'ground' | 'takeoff_ready' | 'airborne';
  touchedDown: boolean;
}

export const AIRPLANE_TAKEOFF_SPEED = 14; // 56 km/h — effortless takeoff well before end of 196m runway!
export const AIRPLANE_AUTO_LIFTOFF_SPEED = 20; // 80 km/h — smooth auto-liftoff if holding W!
export const AIRPLANE_MAX_ALTITUDE = 68;

/**
 * Super-easy arcade Airplane physics:
 * - On ground/runway: accelerates smoothly straight down the runway with gentle taxi steering
 * - Pressing Space above 64 km/h (or holding W above 96 km/h) lifts off smoothly into the sky!
 * - In flight: stall-proof minimum cruise speed, smooth auto-leveling wings when A/D released,
 *   Space = Climb, Shift = Descend, smooth butter touchdown on ground/runway (never crashes!)
 */
export function stepAirplanePhysics(
  state: AirplanePhysicsState,
  input: AirplaneInput,
  dt: number,
  worldFlyRadius: number = 275,
): AirplaneStepResult {
  const safeDt = Math.min(Math.max(dt, 0.001), 0.05);
  let { x, y, z, yaw, pitch, roll, speed, steerInput } = state;
  const maxSpeed = state.maxSpeed;
  const wasAirborne = y > 0.35;

  const turnIn = Math.max(-1, Math.min(1, input.turn));
  const throttleIn = Math.max(-1, Math.min(1, input.throttle));
  steerInput = steerInput + (turnIn - steerInput) * (1 - Math.exp(-8 * safeDt));

  if (input.autoLand) {
    // Effortless 1-button Auto-Land glide right onto Kerala Airport Runway 09 -> 27
    const targetX = AIRPORT_RUNWAY.centerX;
    const targetZ = AIRPORT_RUNWAY.centerZ;
    const dx = targetX - x;
    const dz = targetZ - z;
    const dist = Math.hypot(dx, dz);

    if (dist > 14 && y > 0.5) {
      const desiredYaw = Math.atan2(dx, dz);
      const yawErr = Math.atan2(Math.sin(desiredYaw - yaw), Math.cos(desiredYaw - yaw));
      yaw += Math.max(-1.6 * safeDt, Math.min(1.6 * safeDt, yawErr * 2.2 * safeDt));
      roll = roll + (Math.max(-0.32, Math.min(0.32, -yawErr * 0.7)) - roll) * (1 - Math.exp(-6 * safeDt));
    } else {
      // Align gently along East-West runway heading
      const eastErr = Math.atan2(Math.sin(Math.PI / 2 - yaw), Math.cos(Math.PI / 2 - yaw));
      const westErr = Math.atan2(Math.sin(-Math.PI / 2 - yaw), Math.cos(-Math.PI / 2 - yaw));
      const bestErr = Math.abs(eastErr) < Math.abs(westErr) ? eastErr : westErr;
      yaw += Math.max(-1.8 * safeDt, Math.min(1.8 * safeDt, bestErr * 3 * safeDt));
      roll *= Math.exp(-7 * safeDt);
    }

    const desiredAlt = dist > 55 ? Math.min(y, 18) : Math.max(0, (dist - 12) * 0.25);
    if (y > desiredAlt + 0.1) {
      y = Math.max(0, y - Math.max(6.5, (y - desiredAlt) * 0.85) * safeDt);
      pitch = pitch + (-0.1 - pitch) * (1 - Math.exp(-6 * safeDt));
    } else {
      y = Math.max(0, y - 5 * safeDt);
      pitch *= Math.exp(-7 * safeDt);
    }

    const targetSpd = y > 0.2 ? Math.max(17, Math.min(26, dist * 0.45)) : 0;
    speed += (targetSpd - speed) * (1 - Math.exp(-(y > 0.2 ? 2.5 : 3.2) * safeDt));
    if (y <= 0.05 && speed < 0.4) speed = 0;

    x += Math.sin(yaw) * speed * safeDt;
    z += Math.cos(yaw) * speed * safeDt;

    return {
      x,
      y,
      z,
      yaw,
      pitch: y <= 0.15 ? 0 : pitch,
      roll: y <= 0.15 ? 0 : roll,
      speed,
      maxSpeed,
      steerInput: 0,
      flightState: y > 0.35 ? 'airborne' : 'ground',
      touchedDown: wasAirborne && y <= 0.15,
    };
  }

  // Throttle & airspeed management
  if (y > 0.35) {
    // AIRBORNE: Easy arcade flight with stall-proof cruise!
    const minCruise = input.descend || throttleIn < -0.1 ? 12 : 18;
    if (throttleIn > 0.05) {
      speed += throttleIn * 22 * safeDt;
    } else if (throttleIn < -0.05) {
      speed += throttleIn * 18 * safeDt;
    } else {
      // Hold smooth comfortable cruise speed automatically!
      const cruiseTarget = Math.max(22, Math.min(maxSpeed * 0.72, speed));
      speed += (cruiseTarget - speed) * (1 - Math.exp(-1.5 * safeDt));
    }
    speed = Math.max(minCruise, Math.min(maxSpeed, speed));

    // Gentle, effortless banked turn + auto-level wings
    yaw -= steerInput * 1.15 * safeDt;
    const targetRoll = -steerInput * 0.42;
    roll = roll + (targetRoll - roll) * (1 - Math.exp(-6.5 * safeDt));

    // Climb (Space) / Descend (Shift) / Auto-level altitude hold!
    let targetPitch = 0;
    if (input.climb) {
      y = Math.min(AIRPLANE_MAX_ALTITUDE, y + 14.5 * safeDt);
      targetPitch = 0.24;
    } else if (input.descend) {
      y = Math.max(0, y - 14.5 * safeDt);
      targetPitch = -0.18;
    } else if (throttleIn < -0.5 && speed <= 14.5) {
      // Holding S slows down and glides gently down for effortless landing
      y = Math.max(0, y - 6.5 * safeDt);
      targetPitch = -0.1;
    }
    pitch = pitch + (targetPitch - pitch) * (1 - Math.exp(-6.5 * safeDt));
  } else {
    // ON GROUND / RUNWAY TAXI & TAKEOFF
    y = 0;
    if (throttleIn > 0.05) {
      speed += throttleIn * 34 * safeDt;
    } else if (throttleIn < -0.05) {
      if (speed > 0.8) {
        speed = Math.max(0, speed - 30 * safeDt);
      } else {
        speed += throttleIn * 8 * safeDt;
      }
    } else {
      speed *= Math.exp(-2.2 * safeDt);
      if (Math.abs(speed) < 0.2) speed = 0;
    }
    speed = Math.max(-8, Math.min(maxSpeed, speed));

    // Easy runway steering (calm & stable at takeoff speed so you stay straight on the runway!)
    if (Math.abs(speed) > 0.3) {
      const turnDir = speed >= 0 ? 1 : -1;
      const groundSteerStability = Math.max(0.45, 1 - Math.abs(speed) / (maxSpeed * 1.1));
      yaw -= steerInput * 1.35 * groundSteerStability * safeDt * turnDir;
    }

    // Subtle runway centerline alignment assist while accelerating straight with no turn input
    if (isPointOnRunway(x, z, 2) && Math.abs(turnIn) < 0.05 && speed > 5) {
      const eastErr = Math.atan2(Math.sin(Math.PI / 2 - yaw), Math.cos(Math.PI / 2 - yaw));
      const westErr = Math.atan2(Math.sin(-Math.PI / 2 - yaw), Math.cos(-Math.PI / 2 - yaw));
      const nearestErr = Math.abs(eastErr) < Math.abs(westErr) ? eastErr : westErr;
      if (Math.abs(nearestErr) < 0.28) {
        yaw += nearestErr * (1 - Math.exp(-3.5 * safeDt));
      }
    }

    roll *= Math.exp(-9 * safeDt);

    // Takeoff! Either press Space at >= 64 km/h OR keep holding W past 96 km/h for effortless liftoff!
    const wantsTakeoff =
      (input.climb && speed >= AIRPLANE_TAKEOFF_SPEED) ||
      (throttleIn > 0.5 && speed >= AIRPLANE_AUTO_LIFTOFF_SPEED && !input.descend);
    if (wantsTakeoff) {
      y = 0.65 + 11 * safeDt;
      pitch = 0.22;
    } else {
      pitch *= Math.exp(-9 * safeDt);
    }
  }

  // Advance horizontal position
  x += Math.sin(yaw) * speed * safeDt;
  z += Math.cos(yaw) * speed * safeDt;

  // Soft sky perimeter turn-back so player never flies endlessly off the map
  const distFromCenter = Math.hypot(x, z);
  if (distFromCenter > worldFlyRadius) {
    const scale = worldFlyRadius / distFromCenter;
    x *= scale;
    z *= scale;
    const toCenterYaw = Math.atan2(-x, -z);
    const err = Math.atan2(Math.sin(toCenterYaw - yaw), Math.cos(toCenterYaw - yaw));
    yaw += err * (1 - Math.exp(-2.8 * safeDt));
  }

  const touchedDown = wasAirborne && y <= 0.15;
  if (touchedDown) {
    y = 0;
    pitch = 0;
    roll = 0;
  }

  const flightState: AirplaneStepResult['flightState'] =
    y > 0.35
      ? 'airborne'
      : speed >= AIRPLANE_TAKEOFF_SPEED
        ? 'takeoff_ready'
        : 'ground';

  return {
    x,
    y,
    z,
    yaw,
    pitch,
    roll,
    speed,
    maxSpeed,
    steerInput,
    flightState,
    touchedDown,
  };
}
