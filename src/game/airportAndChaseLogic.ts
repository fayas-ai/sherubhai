import { SnatcherAction, SnatcherChaseHudState, Vec2 } from '../types/game';
import { AIRPORT_RUNWAY } from './vehiclePhysics';

// ============================================================================
// 1. LIVE AMBIENT AIRPORT FLIGHTS & BOARDING / DEBOARDING PASSENGERS (KERUNNU / IRANGUNNU)
// ============================================================================

export type AmbientFlightPhase =
  | 'approaching'
  | 'landing_roll'
  | 'taxi_to_gate'
  | 'deboarding'
  | 'boarding'
  | 'taxi_to_runway'
  | 'takeoff_roll'
  | 'climb_and_cruise';

export interface AmbientAirportFlight {
  id: string;
  callsign: string;
  archetype: 'airplane_airliner' | 'airplane_jet';
  gateX: number;
  gateZ: number;
  stairX: number;
  stairZ: number;
  terminalDoorX: number;
  terminalDoorZ: number;
  phase: AmbientFlightPhase;
  phaseTimer: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  speed: number;
  boardingMode: 'none' | 'irangunnu' | 'kerunnu';
}

export function createInitialAmbientFlights(): AmbientAirportFlight[] {
  const rwZ = AIRPORT_RUNWAY.centerZ;
  const apronZ = AIRPORT_RUNWAY.apronZ;

  return [
    {
      // Flight 1 starts docked at Gate 1 right beside the Terminal so players immediately see passengers deboarding & boarding!
      id: 'cok_101',
      callsign: 'COK-101 Malabar Express',
      archetype: 'airplane_airliner',
      gateX: -24,
      gateZ: apronZ - 1,
      stairX: -24,
      stairZ: apronZ + 3.2,
      terminalDoorX: -28,
      terminalDoorZ: -118.4,
      phase: 'deboarding',
      phaseTimer: 0,
      x: -24,
      y: 0,
      z: apronZ - 1,
      yaw: Math.PI / 2,
      pitch: 0,
      roll: 0,
      speed: 0,
      boardingMode: 'irangunnu',
    },
    {
      // Flight 2 starts on active final approach gliding down from the western Kerala sky onto Runway 09!
      id: 'cok_204',
      callsign: 'COK-204 Cochin Royal Jet',
      archetype: 'airplane_jet',
      gateX: 18,
      gateZ: apronZ - 1,
      stairX: 18,
      stairZ: apronZ + 3.2,
      terminalDoorX: -18,
      terminalDoorZ: -118.4,
      phase: 'approaching',
      phaseTimer: 0,
      x: -145,
      y: 20,
      z: rwZ,
      yaw: Math.PI / 2,
      pitch: -0.09,
      roll: 0,
      speed: 26,
      boardingMode: 'none',
    },
  ];
}

function moveTowardPoint(
  x: number,
  z: number,
  tx: number,
  tz: number,
  speed: number,
  dt: number,
): { x: number; z: number; yaw: number; arrived: boolean } {
  const dx = tx - x;
  const dz = tz - z;
  const dist = Math.hypot(dx, dz);
  const step = speed * dt;
  if (dist <= Math.max(0.8, step)) {
    return { x: tx, z: tz, yaw: Math.atan2(dx, dz), arrived: true };
  }
  return {
    x: x + (dx / dist) * step,
    z: z + (dz / dist) * step,
    yaw: Math.atan2(dx, dz),
    arrived: false,
  };
}

export function stepAmbientFlight(
  flight: AmbientAirportFlight,
  dt: number,
): AmbientAirportFlight {
  const safeDt = Math.min(Math.max(dt, 0.001), 0.1);
  const next: AmbientAirportFlight = {
    ...flight,
    phaseTimer: flight.phaseTimer + safeDt,
  };
  const rwZ = AIRPORT_RUNWAY.centerZ;

  switch (next.phase) {
    case 'approaching': {
      next.boardingMode = 'none';
      next.speed = 26;
      next.x += next.speed * safeDt;
      next.z += (rwZ - next.z) * Math.min(1, safeDt * 2.5);
      next.yaw = Math.PI / 2;
      next.roll = 0;
      const distToTouchdown = Math.max(0, -68 - next.x);
      const targetY = Math.max(0, distToTouchdown * 0.26);
      next.y += (targetY - next.y) * Math.min(1, safeDt * 3.5);
      next.pitch = next.y > 0.6 ? -0.1 : -0.03;
      if (next.x >= -68) {
        next.y = 0;
        next.pitch = 0;
        next.phase = 'landing_roll';
        next.phaseTimer = 0;
      }
      break;
    }

    case 'landing_roll': {
      next.boardingMode = 'none';
      next.y = 0;
      next.pitch = 0;
      next.roll = 0;
      next.yaw = Math.PI / 2;
      next.speed = Math.max(7.5, next.speed - 6.8 * safeDt);
      next.x += next.speed * safeDt;
      if (next.x >= 52) {
        next.phase = 'taxi_to_gate';
        next.phaseTimer = 0;
      }
      break;
    }

    case 'taxi_to_gate': {
      next.boardingMode = 'none';
      next.y = 0;
      next.pitch = 0;
      next.roll = 0;
      next.speed = 10.5;
      // First turn south off Runway 27 via East Taxiway (x=54) onto Apron Z, then taxi cleanly to Gate!
      const onApron = Math.abs(next.z - next.gateZ) <= 1.2;
      const targetX = onApron ? next.gateX : 54;
      const targetZ = next.gateZ;
      const mv = moveTowardPoint(next.x, next.z, targetX, targetZ, next.speed, safeDt);
      next.x = mv.x;
      next.z = mv.z;
      next.yaw = mv.yaw;
      if (onApron && mv.arrived) {
        next.speed = 0;
        next.yaw = Math.PI / 2;
        next.phase = 'deboarding';
        next.phaseTimer = 0;
        next.boardingMode = 'irangunnu';
      }
      break;
    }

    case 'deboarding': {
      // Passengers visibly walk out of the aircraft down the stairs into the Terminal (Irangunnu!)
      next.speed = 0;
      next.y = 0;
      next.pitch = 0;
      next.roll = 0;
      next.yaw = Math.PI / 2;
      next.boardingMode = 'irangunnu';
      if (next.phaseTimer >= 8.5) {
        next.phase = 'boarding';
        next.phaseTimer = 0;
        next.boardingMode = 'kerunnu';
      }
      break;
    }

    case 'boarding': {
      // Passengers walk out from the Airport Terminal up the stairs into the aircraft (Kerunnu!)
      next.speed = 0;
      next.y = 0;
      next.pitch = 0;
      next.roll = 0;
      next.yaw = Math.PI / 2;
      next.boardingMode = 'kerunnu';
      if (next.phaseTimer >= 8.5) {
        next.phase = 'taxi_to_runway';
        next.phaseTimer = 0;
        next.boardingMode = 'none';
      }
      break;
    }

    case 'taxi_to_runway': {
      next.boardingMode = 'none';
      next.y = 0;
      next.pitch = 0;
      next.roll = 0;
      next.speed = 11;
      // Taxi west along Apron to West Taxiway (x=-54), then turn onto Runway 09 threshold (-78, rwZ)
      const nearWest = next.x <= -51;
      const targetX = nearWest ? -78 : -54;
      const targetZ = nearWest ? rwZ : next.gateZ;
      const mv = moveTowardPoint(next.x, next.z, targetX, targetZ, next.speed, safeDt);
      next.x = mv.x;
      next.z = mv.z;
      next.yaw = mv.yaw;
      if (nearWest && mv.arrived) {
        next.yaw = Math.PI / 2;
        next.speed = 8;
        next.phase = 'takeoff_roll';
        next.phaseTimer = 0;
      }
      break;
    }

    case 'takeoff_roll': {
      next.boardingMode = 'none';
      next.yaw = Math.PI / 2;
      next.roll = 0;
      next.speed = Math.min(34, next.speed + 9.5 * safeDt);
      next.x += next.speed * safeDt;
      next.z += (rwZ - next.z) * Math.min(1, safeDt * 4);
      if (next.x >= 18) {
        next.y = Math.max(0.4, (next.x - 18) * 0.24);
        next.pitch = 0.22;
      } else {
        next.y = 0;
        next.pitch = 0;
      }
      if (next.x >= 96) {
        next.phase = 'climb_and_cruise';
        next.phaseTimer = 0;
      }
      break;
    }

    case 'climb_and_cruise': {
      // Sweeping scenic flight loop over Kerala town sky before turning back for final approach on Runway 09!
      next.boardingMode = 'none';
      const loopDuration = 24;
      const t = Math.min(1, next.phaseTimer / loopDuration);
      const angle = t * Math.PI * 2;
      const prevX = next.x;
      const prevZ = next.z;
      // Wide oval scenic orbit above North & Central Kerala town (visible from streets & Airport!)
      next.x = Math.cos(angle) * 145;
      next.z = -105 + Math.sin(angle) * 78;
      next.y = 26 + Math.sin(t * Math.PI) * 16;
      const dx = next.x - prevX;
      const dz = next.z - prevZ;
      if (Math.hypot(dx, dz) > 0.05) {
        next.yaw = Math.atan2(dx, dz);
      }
      next.pitch = t < 0.35 ? 0.14 : t > 0.72 ? -0.1 : 0.02;
      next.roll = -0.24;
      next.speed = 32;
      if (next.phaseTimer >= loopDuration) {
        next.x = -148;
        next.y = 21;
        next.z = rwZ;
        next.yaw = Math.PI / 2;
        next.pitch = -0.09;
        next.roll = 0;
        next.speed = 26;
        next.phase = 'approaching';
        next.phaseTimer = 0;
      }
      break;
    }
  }

  return next;
}

// ============================================================================
// 2. POCKET-SNATCHER / PURSE-KIDNAPPER HERO CHASE STATE MACHINE
// ============================================================================

export type SnatcherPhase = 'idle' | 'fleeing' | 'stunned' | 'police_handover' | 'resolved';

export interface SnatcherSpot {
  district: string;
  victimX: number;
  victimZ: number;
  victimName: string;
  stolenItemName: string;
  escapeWaypoints: Vec2[];
}

export const SNATCHER_SPOTS: SnatcherSpot[] = [
  {
    district: 'Main Junction',
    victimX: -8.5,
    victimZ: 9.5,
    victimName: 'Meera Mole',
    stolenItemName: 'Golden Wedding Purse',
    escapeWaypoints: [
      { x: -11, z: -12 },
      { x: -24, z: -12 },
      { x: -24, z: -26 },
      { x: 14, z: -26 },
      { x: 14, z: 8 },
      { x: -10, z: 8 },
    ],
  },
  {
    district: 'Central Bazaar',
    victimX: 20,
    victimZ: -10,
    victimName: 'Anjali Chechi',
    stolenItemName: 'Silk Kasavu Handbag',
    escapeWaypoints: [
      { x: 26, z: -26 },
      { x: 42, z: -26 },
      { x: 42, z: 10 },
      { x: 18, z: 10 },
    ],
  },
  {
    district: 'Sweet Street',
    victimX: -12,
    victimZ: 42,
    victimName: 'Lakshmi Kutty',
    stolenItemName: 'Festival Bangle Pouch',
    escapeWaypoints: [
      { x: -28, z: 42 },
      { x: -28, z: 62 },
      { x: 14, z: 62 },
      { x: 14, z: 42 },
    ],
  },
];

export const SNATCHER_GUN_RANGE = 26;
export const SNATCHER_SLAP_RANGE = 7.2;
export const SNATCHER_POLICE_RANGE = 14;
export const SNATCHER_REWARD_GHOP = 500_000;
export const SNATCHER_REWARD_FAME = 100;

export interface SnatcherChaseState {
  id: string;
  spotIndex: number;
  district: string;
  victimName: string;
  stolenItemName: string;
  phase: SnatcherPhase;
  victimX: number;
  victimZ: number;
  snatcherX: number;
  snatcherZ: number;
  snatcherYaw: number;
  hp: number;
  maxHp: number;
  slowTimer: number;
  stunTimer: number;
  handoverTimer: number;
  policeX: number;
  policeZ: number;
  policeYaw: number;
  wpIndex: number;
  waypoints: Vec2[];
  lastHitBy: 'none' | 'gun' | 'slap';
  respawnCooldown: number;
}

export function createSnatcherChase(spotIndex = 0): SnatcherChaseState {
  const idx = ((spotIndex % SNATCHER_SPOTS.length) + SNATCHER_SPOTS.length) % SNATCHER_SPOTS.length;
  const spot = SNATCHER_SPOTS[idx];
  const startX = spot.victimX + 3.2;
  const startZ = spot.victimZ - 5.5;
  const firstWp = spot.escapeWaypoints[0];

  return {
    id: `chase_${idx}_${Date.now()}`,
    spotIndex: idx,
    district: spot.district,
    victimName: spot.victimName,
    stolenItemName: spot.stolenItemName,
    phase: 'fleeing',
    victimX: spot.victimX,
    victimZ: spot.victimZ,
    snatcherX: startX,
    snatcherZ: startZ,
    snatcherYaw: Math.atan2(firstWp.x - startX, firstWp.z - startZ),
    hp: 100,
    maxHp: 100,
    slowTimer: 0,
    stunTimer: 0,
    handoverTimer: 0,
    policeX: startX + 22,
    policeZ: startZ - 14,
    policeYaw: 0,
    wpIndex: 0,
    waypoints: spot.escapeWaypoints,
    lastHitBy: 'none',
    respawnCooldown: 0,
  };
}

export function stepSnatcherChase(
  state: SnatcherChaseState,
  playerX: number,
  playerZ: number,
  dt: number,
): { state: SnatcherChaseState; policeCompleted: boolean } {
  const safeDt = Math.min(Math.max(dt, 0.001), 0.1);
  const next: SnatcherChaseState = { ...state };
  let policeCompleted = false;

  if (next.phase === 'fleeing') {
    next.slowTimer = Math.max(0, next.slowTimer - safeDt);
    const wp = next.waypoints[next.wpIndex % next.waypoints.length];
    const distToPlayer = Math.hypot(next.snatcherX - playerX, next.snatcherZ - playerZ);

    // Rubber-band politely so player can always run behind & catch them in a fun cinematic chase!
    const baseSpeed = distToPlayer > 20 ? 3.2 : distToPlayer < 6 ? 6.4 : 5.4;
    const speed = next.slowTimer > 0 ? baseSpeed * 0.48 : baseSpeed;

    const dx = wp.x - next.snatcherX;
    const dz = wp.z - next.snatcherZ;
    const distWp = Math.hypot(dx, dz);
    if (distWp < 1.6) {
      next.wpIndex = (next.wpIndex + 1) % next.waypoints.length;
    } else {
      next.snatcherX += (dx / distWp) * speed * safeDt;
      next.snatcherZ += (dz / distWp) * speed * safeDt;
      next.snatcherYaw = Math.atan2(dx, dz);
    }
  } else if (next.phase === 'stunned') {
    next.stunTimer += safeDt;
    // Stay dizzy & caught until Sheru shares them to Kerala Police (or auto-recovers after 25s if ignored)
    if (next.stunTimer >= 25) {
      next.phase = 'fleeing';
      next.hp = 50;
      next.stunTimer = 0;
    }
  } else if (next.phase === 'police_handover') {
    next.handoverTimer += safeDt;
    // Kerala Police Patrol Jeep rushes right next to the caught snatcher!
    const targetX = next.snatcherX + 3.2;
    const targetZ = next.snatcherZ + 1.8;
    const mv = moveTowardPoint(next.policeX, next.policeZ, targetX, targetZ, 18, safeDt);
    next.policeX = mv.x;
    next.policeZ = mv.z;
    next.policeYaw = mv.yaw;
    if (next.handoverTimer >= 2.6 || mv.arrived && next.handoverTimer >= 1.5) {
      next.phase = 'resolved';
      next.respawnCooldown = 28;
      policeCompleted = true;
    }
  } else if (next.phase === 'resolved') {
    next.respawnCooldown = Math.max(0, next.respawnCooldown - safeDt);
  }

  return { state: next, policeCompleted };
}

export interface SnatcherActionResult {
  state: SnatcherChaseState;
  executed: boolean;
  hitOccurred: boolean;
  stunnedNow: boolean;
  handoverStarted: boolean;
  reason?: string;
  messageMl: string;
  messageEn: string;
  rewardGhop: number;
  rewardFame: number;
}

export function applySnatcherAction(
  state: SnatcherChaseState,
  action: SnatcherAction,
  playerX: number,
  playerZ: number,
): SnatcherActionResult {
  const dist = Math.hypot(state.snatcherX - playerX, state.snatcherZ - playerZ);

  if (state.phase === 'resolved' || state.phase === 'idle') {
    return {
      state,
      executed: false,
      hitOccurred: false,
      stunnedNow: false,
      handoverStarted: false,
      reason: 'No active pocket snatcher right now.',
      messageMl: 'ഇപ്പോൾ കള്ളന്മാർ ആരുമില്ല!',
      messageEn: 'Town is safe right now!',
      rewardGhop: 0,
      rewardFame: 0,
    };
  }

  if (action === 'gun') {
    if (state.phase !== 'fleeing') {
      return {
        state,
        executed: false,
        hitOccurred: false,
        stunnedNow: false,
        handoverStarted: false,
        reason: 'Pocket snatcher is already caught! Share to Police!',
        messageMl: 'കള്ളനെ പിടിച്ചു കഴിഞ്ഞു! ഇനി പോലീസിന് കൊടുക്കൂ!',
        messageEn: 'Already stunned! Press Share to Police!',
        rewardGhop: 0,
        rewardFame: 0,
      };
    }
    if (dist > SNATCHER_GUN_RANGE) {
      return {
        state,
        executed: false,
        hitOccurred: false,
        stunnedNow: false,
        handoverStarted: false,
        reason: `Run closer! (${Math.round(dist)}m away — Gun range ${SNATCHER_GUN_RANGE}m)`,
        messageMl: 'കുറച്ചുകൂടി അടുത്ത് ഓടി വെടിവയ്ക്കൂ!',
        messageEn: `Chase closer! Move within ${SNATCHER_GUN_RANGE}m to fire Stun Blaster!`,
        rewardGhop: 0,
        rewardFame: 0,
      };
    }
    const nextHp = Math.max(0, state.hp - 50);
    const stunnedNow = nextHp <= 0;
    const nextState: SnatcherChaseState = {
      ...state,
      hp: nextHp,
      slowTimer: 3.5,
      phase: stunnedNow ? 'stunned' : 'fleeing',
      stunTimer: 0,
      lastHitBy: 'gun',
    };
    return {
      state: nextState,
      executed: true,
      hitOccurred: true,
      stunnedNow,
      handoverStarted: false,
      messageMl: stunnedNow
        ? 'ഡിഷ്യൂം!! സ്റ്റൺ ഗൺ ഹിറ്റ്! കള്ളൻ വീണു — ഇനി പോലീസിന് കൈമാറൂ!'
        : 'ഡിഷ്യൂം! കള്ളന് സ്റ്റൺ ബ്ലാസ്റ്റർ കൊണ്ടു! ഒരു ഹിറ്റ് കൂടി!',
      messageEn: stunnedNow
        ? 'ZAP!! Pocket Snatcher stunned & caught! Hand over to Kerala Police!'
        : 'Direct Stun Blaster hit (-50%)! One more shot or Slap Hand to catch!',
      rewardGhop: 0,
      rewardFame: 0,
    };
  }

  if (action === 'slap') {
    if (state.phase !== 'fleeing') {
      return {
        state,
        executed: false,
        hitOccurred: false,
        stunnedNow: false,
        handoverStarted: false,
        reason: 'Already caught! Share the pocket snatcher to Police!',
        messageMl: 'കള്ളൻ വീണു കിടക്കുന്നു! പോലീസിന് കൊടുക്കൂ!',
        messageEn: 'Snatcher already stunned — Share to Police now!',
        rewardGhop: 0,
        rewardFame: 0,
      };
    }
    if (dist > SNATCHER_SLAP_RANGE) {
      return {
        state,
        executed: false,
        hitOccurred: false,
        stunnedNow: false,
        handoverStarted: false,
        reason: `Chase right behind to Slap Hand! (${Math.round(dist)}m away)`,
        messageMl: 'കള്ളന്റെ പിറകെ ഓടി അടുത്ത് എത്തി അടിക്കൂ!',
        messageEn: `Run right behind the snatcher (within ${Math.round(SNATCHER_SLAP_RANGE)}m) for Mass Slap Hand!`,
        rewardGhop: 0,
        rewardFame: 0,
      };
    }
    const nextState: SnatcherChaseState = {
      ...state,
      hp: 0,
      phase: 'stunned',
      stunTimer: 0,
      lastHitBy: 'slap',
    };
    return {
      state: nextState,
      executed: true,
      hitOccurred: true,
      stunnedNow: true,
      handoverStarted: false,
      messageMl: 'പടേ!! ഷേരു ഭായുടെ മാസ്സ് അടി! കള്ളൻ തലകറങ്ങി വീണു!',
      messageEn: 'PATTAAAAS!! Mass Comedy Slap Hand! Pocket Snatcher caught — Share to Police!',
      rewardGhop: 0,
      rewardFame: 0,
    };
  }

  // action === 'police'
  if (state.phase === 'police_handover') {
    return {
      state,
      executed: false,
      hitOccurred: false,
      stunnedNow: false,
      handoverStarted: false,
      reason: 'Kerala Police Patrol Jeep is already arresting the snatcher!',
      messageMl: 'കേരള പോലീസ് ജീപ്പ് കള്ളനെ അറസ്റ്റ് ചെയ്യുന്നു!',
      messageEn: 'Kerala Police Patrol is already arresting the snatcher!',
      rewardGhop: 0,
      rewardFame: 0,
    };
  }

  if (state.phase !== 'stunned') {
    return {
      state,
      executed: false,
      hitOccurred: false,
      stunnedNow: false,
      handoverStarted: false,
      reason: 'Catch the snatcher first with Gun or Slap Hand!',
      messageMl: 'ആദ്യം ഗൺ അല്ലെങ്കിൽ സ്ലാപ്പ് ഹാൻഡ് വെച്ച് കള്ളനെ പിടിക്കൂ!',
      messageEn: 'Stop the snatcher first using Gun or Slap Hand before handing over to Police!',
      rewardGhop: 0,
      rewardFame: 0,
    };
  }

  const nextState: SnatcherChaseState = {
    ...state,
    phase: 'police_handover',
    handoverTimer: 0,
    policeX: state.snatcherX + 18,
    policeZ: state.snatcherZ - 12,
  };
  return {
    state: nextState,
    executed: true,
    hitOccurred: false,
    stunnedNow: false,
    handoverStarted: true,
    messageMl: `കേരള പോലീസ് എത്തി! കള്ളനെ അറസ്റ്റ് ചെയ്തു — ${state.victimName}-യുടെ ${state.stolenItemName} തിരിച്ചു കൊടുത്തു!`,
    messageEn: `Handed over to Kerala Police! Returned ${state.victimName}'s ${state.stolenItemName}! (+500K GHOP & +100 Fame)`,
    rewardGhop: SNATCHER_REWARD_GHOP,
    rewardFame: SNATCHER_REWARD_FAME,
  };
}

export function buildSnatcherChaseHud(
  state: SnatcherChaseState | null,
  playerX: number,
  playerZ: number,
): SnatcherChaseHudState | null {
  if (!state || state.phase === 'idle' || state.phase === 'resolved') return null;
  const dist = Math.hypot(state.snatcherX - playerX, state.snatcherZ - playerZ);
  return {
    active: true,
    phase: state.phase,
    distanceMeters: Math.round(dist),
    hp: state.hp,
    maxHp: state.maxHp,
    canGun: state.phase === 'fleeing' && dist <= SNATCHER_GUN_RANGE,
    canSlap: state.phase === 'fleeing' && dist <= SNATCHER_SLAP_RANGE,
    canPolice: state.phase === 'stunned',
    snatcherX: state.snatcherX,
    snatcherZ: state.snatcherZ,
    victimX: state.victimX,
    victimZ: state.victimZ,
    district: state.district,
    victimName: state.victimName,
    stolenItemName: state.stolenItemName,
    statusText:
      state.phase === 'fleeing'
        ? dist <= SNATCHER_SLAP_RANGE
          ? 'CLOSE BEHIND! Press SLAP HAND [2] or GUN [1]!'
          : dist <= SNATCHER_GUN_RANGE
            ? 'IN GUN RANGE! Fire GUN [1] or sprint closer to SLAP [2]!'
            : `CHASE BEHIND! ${Math.round(dist)}m away in ${state.district}`
        : state.phase === 'stunned'
          ? 'POCKET SNATCHER CAUGHT! Press SHARE TO POLICE [3]!'
          : 'KERALA POLICE PATROL ARRESTING SNATCHER!',
    mlAlert:
      state.phase === 'fleeing'
        ? `അയ്യോ എന്റെ ${state.stolenItemName}! പിറകെ ഓടി പിടിക്കൂ ഷേരു ഭായ്!`
        : state.phase === 'stunned'
          ? 'കള്ളൻ പിടിയിലായി! കേരള പോലീസിന് കൈമാറൂ!'
          : 'കേരള പോലീസ് ജീപ്പ് എത്തി — ബാഗ് തിരിച്ചു കിട്ടി!',
  };
}
