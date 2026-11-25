import { NpcTag, PurseChaseHudState } from '../types/game';
import { WORLD_RADIUS } from '../data/worldData';

export type PurseChaseAction = 'gun' | 'slap' | 'police';

export type ChaseVisualState = 'idle' | 'panicked_chase' | 'caught_dropped';

export type NpcPanicState = 'calm' | 'panicked' | 'cowering';

export interface PocketKidnapperPanicStep {
  panicState: NpcPanicState;
  x: number;
  z: number;
  yaw: number;
  speed: number;
}

export interface DroppedItemState {
  dropped: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotZ: number;
  landedYaw: number;
  bounces: number;
  grounded: boolean;
  justBounced: boolean;
  impactSquash: number;
}

export interface PanickedChasePose {
  torsoPitch: number;
  bodyBobY: number;
  bodyTiltZ: number;
  headYaw: number;
  legSwing: number;
  leftArmX: number;
  leftArmZ: number;
  rightArmX: number;
  rightArmZ: number;
  panicPulse: number;
  showPanicAlert: boolean;
}

export interface PurseChaseState {
  active: boolean;
  id: string;
  npcTag: NpcTag;
  phase: 'idle' | 'chasing' | 'caught';
  visualState: ChaseVisualState;
  victimName: string;
  victimX: number;
  victimZ: number;
  thiefX: number;
  thiefZ: number;
  thiefYaw: number;
  fleeDirX: number;
  fleeDirZ: number;
  thiefHp: number; // 0..100
  elapsed: number;
  stunTimer: number;
  droppedItem: DroppedItemState;
}

export interface PurseChaseActionResult {
  state: PurseChaseState;
  success: boolean;
  caughtNow: boolean;
  completed: boolean;
  rewardFame: number;
  rewardGhop: number;
  messageMl: string;
  messageEn: string;
}

export const CHASE_GUN_RANGE = 26;
export const CHASE_SLAP_RANGE = 7.5;
export const CHASE_POLICE_RANGE = 14;
export const CHASE_TACKLE_RANGE = 2.05;

const DROPPED_PURSE_REST_Y = 0.14;

const VICTIM_NAMES = [
  'Meera Nair',
  'Anjali Menon',
  'Lakshmi Varma',
  'Devika Pillai',
  'Sreelakshmi K.',
];

export function createIdleDroppedItem(): DroppedItemState {
  return {
    dropped: false,
    x: 0,
    y: DROPPED_PURSE_REST_Y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    rotX: 0,
    rotZ: 0,
    landedYaw: 0,
    bounces: 0,
    grounded: false,
    justBounced: false,
    impactSquash: 0,
  };
}

export function spawnDroppedPurse(
  thiefX: number,
  thiefZ: number,
  thiefYaw: number,
): DroppedItemState {
  // Toss the stolen purse upward & slightly forward-right out of the caught thief's hand
  const fwdX = Math.sin(thiefYaw);
  const fwdZ = Math.cos(thiefYaw);
  const rightX = Math.cos(thiefYaw);
  const rightZ = -Math.sin(thiefYaw);
  return {
    dropped: true,
    x: thiefX + rightX * 0.42 + fwdX * 0.22,
    y: 1.32,
    z: thiefZ + rightZ * 0.42 + fwdZ * 0.22,
    vx: rightX * 1.95 + fwdX * 1.45,
    vy: 4.5,
    vz: rightZ * 1.95 + fwdZ * 1.45,
    rotX: 0.35,
    rotZ: -0.28,
    landedYaw: thiefYaw + 0.65,
    bounces: 0,
    grounded: false,
    justBounced: false,
    impactSquash: 0,
  };
}

/**
 * Pure deterministic parabolic bounce physics for the dropped stolen handbag.
 * Launches upward out of the pocket kidnapper's hand when caught, tumbles through the air,
 * bounces twice on the road surface with impact squash & dust triggers, and settles naturally on the ground.
 */
export function stepDroppedItemPhysics(
  item: DroppedItemState,
  dt: number,
): DroppedItemState {
  if (!item.dropped) return item;
  const safeDt = Math.max(0, Math.min(dt, 0.1));
  const nextSquash = Math.max(0, item.impactSquash - safeDt * 4.8);
  if (item.grounded) {
    if (item.justBounced || item.impactSquash > 0) {
      return { ...item, justBounced: false, impactSquash: nextSquash };
    }
    return item;
  }

  const gravity = -15.8;
  let vx = item.vx;
  let vy = item.vy + gravity * safeDt;
  let vz = item.vz;
  let x = item.x + vx * safeDt;
  let y = item.y + vy * safeDt;
  let z = item.z + vz * safeDt;
  let rotX = item.rotX + 6.8 * safeDt;
  let rotZ = item.rotZ - 5.1 * safeDt;
  let landedYaw = item.landedYaw + 3.6 * safeDt;
  let bounces = item.bounces;
  let grounded = false;
  let justBounced = false;
  let impactSquash = nextSquash;

  if (y <= DROPPED_PURSE_REST_Y) {
    y = DROPPED_PURSE_REST_Y;
    justBounced = true;
    impactSquash = 1.0;
    if (Math.abs(vy) > 1.15 && bounces < 2) {
      vy = Math.abs(vy) * 0.46;
      vx *= 0.56;
      vz *= 0.56;
      bounces += 1;
    } else {
      vy = 0;
      vx = 0;
      vz = 0;
      rotX = Math.PI * 0.48; // Rest naturally tipped on its side on the street
      rotZ = 0.22;
      grounded = true;
    }
  }

  return {
    dropped: true,
    x,
    y,
    z,
    vx,
    vy,
    vz,
    rotX,
    rotZ,
    landedYaw,
    bounces,
    grounded,
    justBounced,
    impactSquash,
  };
}

/**
 * Pure procedural animation pose for pocket-kidnapper NPCs:
 * - 'chasing': panicked hunched sprint, frantic arm flailing, rapid stride, over-the-shoulder head glances!
 * - 'caught' (stunTimer < 0.42s): dramatic recoil shock + right arm flinging the purse out of their hand!
 * - 'caught' (stunTimer >= 0.42s): hands thrown up in dizzy surrender, knees slumped, wobbling torso!
 */
export function computePanickedChasePose(
  elapsed: number,
  phase: 'chasing' | 'caught',
  clutchingPurse: boolean = true,
  stunTimer: number = 1.0,
): PanickedChasePose {
  if (phase === 'caught') {
    if (stunTimer < 0.42) {
      // Dramatic recoil stumble & arm-fling drop animation right as the purse pops out of hand!
      const t = Math.max(0, stunTimer) / 0.42;
      const shockArc = Math.sin(t * Math.PI);
      return {
        torsoPitch: -0.44 * shockArc - 0.14 * t,
        bodyBobY: 0.18 * shockArc - 0.1 * t,
        bodyTiltZ: 0.24 * shockArc,
        headYaw: -0.45 * shockArc,
        legSwing: 0.38 * shockArc + 0.14 * t,
        leftArmX: -2.45 - 0.35 * shockArc,
        leftArmZ: 0.55 + 0.28 * shockArc,
        rightArmX: -2.95 * shockArc - 2.65 * (1 - shockArc),
        rightArmZ: -0.82 * shockArc - 0.42 * (1 - shockArc),
        panicPulse: 0,
        showPanicAlert: false,
      };
    }
    return {
      torsoPitch: -0.14,
      bodyBobY: -0.1,
      bodyTiltZ: Math.sin(elapsed * 9.2) * 0.18,
      headYaw: Math.sin(elapsed * 5.5) * 0.35,
      legSwing: 0.14,
      leftArmX: -2.65,
      leftArmZ: 0.42,
      rightArmX: -2.65,
      rightArmZ: -0.42,
      panicPulse: 0,
      showPanicAlert: false,
    };
  }

  const sprintPhase = elapsed * 17.5;
  const legSwing = Math.sin(sprintPhase) * 0.98;
  const armFlail = Math.sin(sprintPhase * 1.15);
  return {
    torsoPitch: 0.36 + Math.abs(Math.sin(sprintPhase)) * 0.09,
    bodyBobY: Math.abs(Math.sin(sprintPhase)) * 0.14,
    bodyTiltZ: Math.sin(sprintPhase * 0.5) * 0.13,
    // Frantically glancing back over left & right shoulders at Sheru!
    headYaw: Math.sin(elapsed * 5.8) * 0.72,
    legSwing,
    // Left arm flails high in wild panic!
    leftArmX: -2.1 + armFlail * 0.75,
    leftArmZ: 0.52 + Math.abs(armFlail) * 0.36,
    // Right arm clutches stolen purse tight (or also flails overhead for accomplice NPCs)
    rightArmX: clutchingPurse ? -0.92 + Math.sin(sprintPhase) * 0.24 : -2.1 - armFlail * 0.75,
    rightArmZ: clutchingPurse ? -0.18 : -0.52 - Math.abs(armFlail) * 0.36,
    panicPulse: 0.88 + Math.abs(Math.sin(elapsed * 10.5)) * 0.35,
    showPanicAlert: true,
  };
}

/**
 * Pure panicked-state steering & state machine for tagged 'pocket_kidnapper' town NPCs.
 * - Activates 'panicked' immediately when a purse chase begins, driving them away from the player.
 * - Transitions to 'cowering' when the lead thief is caught, and returns to 'calm' once chase ends.
 */
export function stepPocketKidnapperNpcPanic(
  npcX: number,
  npcZ: number,
  npcYaw: number,
  playerX: number,
  playerZ: number,
  chaseActive: boolean,
  chasePhase: PurseChaseState['phase'],
  elapsed: number,
  dt: number,
  phaseOffset: number = 0,
  worldRadius: number = WORLD_RADIUS,
): PocketKidnapperPanicStep {
  if (!chaseActive) {
    return { panicState: 'calm', x: npcX, z: npcZ, yaw: npcYaw, speed: 0 };
  }
  if (chasePhase === 'caught') {
    const facePlayerYaw = Math.atan2(playerX - npcX, playerZ - npcZ);
    return { panicState: 'cowering', x: npcX, z: npcZ, yaw: facePlayerYaw, speed: 0 };
  }

  const safeDt = Math.max(0, Math.min(dt, 0.25));
  const awayX = npcX - playerX;
  const awayZ = npcZ - playerZ;
  const distToPlayer = Math.hypot(awayX, awayZ) || 1;
  let dirX = awayX / distToPlayer;
  let dirZ = awayZ / distToPlayer;

  const distCenter = Math.hypot(npcX, npcZ);
  if (distCenter > worldRadius - 22) {
    // Steer tangentially inward along town perimeter so panicked NPCs never leave the map
    const toCenterX = -npcX / (distCenter || 1);
    const toCenterZ = -npcZ / (distCenter || 1);
    dirX = dirX * 0.38 + toCenterX * 0.62;
    dirZ = dirZ * 0.38 + toCenterZ * 0.62;
    const dl = Math.hypot(dirX, dirZ) || 1;
    dirX /= dl;
    dirZ /= dl;
  }

  // Panicked evasive side-weave as they bolt away from the player
  const weave = Math.sin((elapsed + phaseOffset) * 3.4) * 0.22;
  const perpX = -dirZ;
  const perpZ = dirX;
  let finalX = dirX + perpX * weave;
  let finalZ = dirZ + perpZ * weave;
  const fl = Math.hypot(finalX, finalZ) || 1;
  finalX /= fl;
  finalZ /= fl;

  const speed = distToPlayer < 16 ? 6.4 : distToPlayer < 30 ? 5.2 : 3.4;
  return {
    panicState: 'panicked',
    x: npcX + finalX * speed * safeDt,
    z: npcZ + finalZ * speed * safeDt,
    yaw: Math.atan2(finalX, finalZ),
    speed,
  };
}

export function shouldPhysicalTackleCatch(
  state: PurseChaseState,
  playerX: number,
  playerZ: number,
): boolean {
  if (!state.active || state.phase !== 'chasing') return false;
  return Math.hypot(state.thiefX - playerX, state.thiefZ - playerZ) <= CHASE_TACKLE_RANGE;
}

export function createInitialChaseState(): PurseChaseState {
  return {
    active: false,
    id: '',
    npcTag: 'pocket_kidnapper',
    phase: 'idle',
    visualState: 'idle',
    victimName: VICTIM_NAMES[0],
    victimX: 0,
    victimZ: 0,
    thiefX: 0,
    thiefZ: 0,
    thiefYaw: 0,
    fleeDirX: 0,
    fleeDirZ: -1,
    thiefHp: 100,
    elapsed: 0,
    stunTimer: 0,
    droppedItem: createIdleDroppedItem(),
  };
}

export function startPurseChase(
  playerX: number,
  playerZ: number,
  playerYaw: number,
  seed: number = 0,
): PurseChaseState {
  // Spawn the shouting Kerala girl bystander ~7.5m in front-left of Sheru, and the pocket kidnapper sprinting ~13.5m ahead!
  const fwdX = Math.sin(playerYaw);
  const fwdZ = Math.cos(playerYaw);
  const rightX = Math.cos(playerYaw);
  const rightZ = -Math.sin(playerYaw);

  const clampR = WORLD_RADIUS - 18;
  const clampCoord = (x: number, z: number) => {
    const r = Math.hypot(x, z);
    if (r <= clampR) return { x, z };
    return { x: (x / r) * clampR, z: (z / r) * clampR };
  };

  const victimPos = clampCoord(
    playerX + fwdX * 7.5 - rightX * 3.5,
    playerZ + fwdZ * 7.5 - rightZ * 3.5,
  );
  const thiefPos = clampCoord(
    playerX + fwdX * 13.5 + rightX * 1.2,
    playerZ + fwdZ * 13.5 + rightZ * 1.2,
  );

  let dirX = thiefPos.x - playerX;
  let dirZ = thiefPos.z - playerZ;
  const len = Math.hypot(dirX, dirZ) || 1;
  dirX /= len;
  dirZ /= len;

  return {
    active: true,
    id: `chase_${Math.abs(seed)}_${Date.now()}`,
    npcTag: 'pocket_kidnapper',
    phase: 'chasing',
    visualState: 'panicked_chase',
    victimName: VICTIM_NAMES[Math.abs(seed) % VICTIM_NAMES.length],
    victimX: victimPos.x,
    victimZ: victimPos.z,
    thiefX: thiefPos.x,
    thiefZ: thiefPos.z,
    thiefYaw: Math.atan2(dirX, dirZ),
    fleeDirX: dirX,
    fleeDirZ: dirZ,
    thiefHp: 100,
    elapsed: 0,
    stunTimer: 0,
    droppedItem: createIdleDroppedItem(),
  };
}

export function stepPurseChase(
  state: PurseChaseState,
  playerX: number,
  playerZ: number,
  dt: number,
): { state: PurseChaseState; expired: boolean } {
  if (!state.active) return { state, expired: false };

  const safeDt = Math.max(0, Math.min(dt, 0.25));
  const nextElapsed = state.elapsed + safeDt;
  const nextDropped = stepDroppedItemPhysics(state.droppedItem, safeDt);

  // Auto-expire gracefully if completely ignored for 95 seconds
  if (state.phase === 'chasing' && nextElapsed > 95) {
    return { state: createInitialChaseState(), expired: true };
  }

  if (state.phase === 'caught') {
    return {
      state: {
        ...state,
        visualState: 'caught_dropped',
        elapsed: nextElapsed,
        stunTimer: state.stunTimer + safeDt,
        droppedItem: nextDropped,
      },
      expired: false,
    };
  }

  // Panicked pocket kidnapper runs frantically away from Sheru at a catchable pace!
  // When Sheru closes in (< 14m), panic evasion locks strongly directly away from the player!
  let dx = state.thiefX - playerX;
  let dz = state.thiefZ - playerZ;
  const distToPlayer = Math.hypot(dx, dz) || 1;
  dx /= distToPlayer;
  dz /= distToPlayer;

  const awayWeight = distToPlayer < 12 ? 0.78 : distToPlayer < 22 ? 0.56 : 0.42;
  const inertiaWeight = 1 - awayWeight;
  const distFromCenter = Math.hypot(state.thiefX, state.thiefZ);
  let targetDirX = state.fleeDirX * inertiaWeight + dx * awayWeight;
  let targetDirZ = state.fleeDirZ * inertiaWeight + dz * awayWeight;
  if (distFromCenter > 95) {
    const toCenterX = -state.thiefX / distFromCenter;
    const toCenterZ = -state.thiefZ / distFromCenter;
    targetDirX = targetDirX * 0.4 + toCenterX * 0.6;
    targetDirZ = targetDirZ * 0.4 + toCenterZ * 0.6;
  }
  // Panicked zig-zag weave as they sprint away!
  const weave = Math.sin(nextElapsed * 3.1) * (distToPlayer < 12 ? 0.28 : 0.22);
  const perpX = -targetDirZ;
  const perpZ = targetDirX;
  let dirX = targetDirX + perpX * weave;
  let dirZ = targetDirZ + perpZ * weave;
  const dLen = Math.hypot(dirX, dirZ) || 1;
  dirX /= dLen;
  dirZ /= dLen;

  const runSpeed = distToPlayer > 28 ? 3.2 : distToPlayer > 14 ? 5.4 : 6.4;
  const nextX = state.thiefX + dirX * runSpeed * safeDt;
  const nextZ = state.thiefZ + dirZ * runSpeed * safeDt;

  return {
    state: {
      ...state,
      visualState: 'panicked_chase',
      thiefX: nextX,
      thiefZ: nextZ,
      fleeDirX: dirX,
      fleeDirZ: dirZ,
      thiefYaw: Math.atan2(dirX, dirZ),
      elapsed: nextElapsed,
      droppedItem: nextDropped,
    },
    expired: false,
  };
}

export function applyPurseChaseAction(
  state: PurseChaseState,
  action: PurseChaseAction,
  playerX: number,
  playerZ: number,
): PurseChaseActionResult {
  if (!state.active) {
    return {
      state,
      success: false,
      caughtNow: false,
      completed: false,
      rewardFame: 0,
      rewardGhop: 0,
      messageMl: 'ഇപ്പോൾ കള്ളൻ ആരുമില്ല!',
      messageEn: 'No active pickpocket chase right now!',
    };
  }

  const dist = Math.hypot(state.thiefX - playerX, state.thiefZ - playerZ);

  if (action === 'gun') {
    if (state.phase === 'caught') {
      return {
        state,
        success: true,
        caughtNow: false,
        completed: false,
        rewardFame: 0,
        rewardGhop: 0,
        messageMl: 'കള്ളൻ ഓൾറെഡി ഫ്ലാറ്റ്! ഇനി പോലീസിൽ ഏൽപ്പിക്കൂ!',
        messageEn: 'Pickpocket already dropped the purse! Press Hand to Police to finish arrest!',
      };
    }
    if (dist > CHASE_GUN_RANGE) {
      return {
        state,
        success: false,
        caughtNow: false,
        completed: false,
        rewardFame: 0,
        rewardGhop: 0,
        messageMl: `കുറച്ചുകൂടി അടുത്തേക്ക് ഓടൂ (${Math.round(dist)}m)!`,
        messageEn: `Run closer to shoot! Thief is ${Math.round(dist)}m away (Gun range: ${CHASE_GUN_RANGE}m).`,
      };
    }

    const nextHp = Math.max(0, state.thiefHp - 55);
    const caughtNow = nextHp === 0;
    const droppedItem = caughtNow
      ? spawnDroppedPurse(state.thiefX, state.thiefZ, state.thiefYaw)
      : state.droppedItem;

    return {
      state: {
        ...state,
        thiefHp: nextHp,
        phase: caughtNow ? 'caught' : 'chasing',
        visualState: caughtNow ? 'caught_dropped' : 'panicked_chase',
        droppedItem,
      },
      success: true,
      caughtNow,
      completed: false,
      rewardFame: caughtNow ? 35 : 10,
      rewardGhop: 0,
      messageMl: caughtNow
        ? 'ബൂം! കള്ളൻ സ്റ്റൺ ആയി, മോഷ്ടിച്ച ബാഗ് താഴെ വീണു! ഇനി പോലീസിൽ ഏൽപ്പിക്കൂ!'
        : 'ഹെഡ്‌ഷോട്ട് സ്റ്റൺ! കള്ളൻ പേടിച്ചോടുന്നു—ഒരു വെടി കൂടെ അല്ലെങ്കിൽ സ്ലാപ് കൊടുക്കൂ!',
      messageEn: caughtNow
        ? 'ZAP! Pickpocket stunned & dropped the stolen purse! Press Hand to Police!'
        : 'Direct Stun Gun hit! Thief panicking—shoot again or Slap Hand to catch!',
    };
  }

  if (action === 'slap') {
    if (dist > CHASE_SLAP_RANGE) {
      return {
        state,
        success: false,
        caughtNow: false,
        completed: false,
        rewardFame: 0,
        rewardGhop: 0,
        messageMl: `അടുത്തേക്ക് ഓടി സ്ലാപ് കൊടുക്കൂ (${Math.round(dist)}m)!`,
        messageEn: `Run closer to Slap Hand! Thief is ${Math.round(dist)}m away (Slap range: ${CHASE_SLAP_RANGE}m).`,
      };
    }

    const wasCaught = state.phase === 'caught';
    const droppedItem = !wasCaught
      ? spawnDroppedPurse(state.thiefX, state.thiefZ, state.thiefYaw)
      : state.droppedItem;

    return {
      state: {
        ...state,
        thiefHp: 0,
        phase: 'caught',
        visualState: 'caught_dropped',
        droppedItem,
      },
      success: true,
      caughtNow: !wasCaught,
      completed: false,
      rewardFame: wasCaught ? 5 : 45,
      rewardGhop: 0,
      messageMl: wasCaught
        ? 'ഒരു ബോണസ് മാസ്സ് അടി കൂടി! ഇനി പോലീസിൽ കൊടുക്കൂ!'
        : 'പട്ടാസ് മാസ്സ് സ്ലാപ്! കള്ളൻ ബാഗ് താഴെയിട്ട് തല കറങ്ങി വീണു! ഇനി പോലീസിൽ ഏൽപ്പിക്കൂ!',
      messageEn: wasCaught
        ? 'Bonus Sheru Mass Slap! Now press Hand to Police to lock them up!'
        : 'MASS SLAP HAND! Pickpocket dropped the stolen purse & spun dizzy! Hand to Police!',
    };
  }

  // action === 'police' (Share / Hand Pickpocket to Kerala Police!)
  if (state.phase !== 'caught' && dist > CHASE_POLICE_RANGE) {
    return {
      state,
      success: false,
      caughtNow: false,
      completed: false,
      rewardFame: 0,
      rewardGhop: 0,
      messageMl: 'ആദ്യം ഗൺ അല്ലെങ്കിൽ സ്ലാപ് അടിച്ചു കള്ളനെ പിടിക്കൂ!',
      messageEn: 'Catch the thief with Gun or Slap Hand (or get within 14m) before calling Police!',
    };
  }

  return {
    state: createInitialChaseState(),
    success: true,
    caughtNow: false,
    completed: true,
    rewardFame: 150,
    rewardGhop: 250000,
    messageMl: `ഷെരു ഭായ് മാസ്സ്! കള്ളനെ കേരള പോലീസിൽ ഏൽപ്പിച്ചു, ${state.victimName}-യുടെ ബാഗ് തിരികെ നൽകി!`,
    messageEn: `Sheru Bhai Hero! Handed the pickpocket to Kerala Police & returned ${state.victimName}'s purse! (+150 Fame, +250K GHOP)`,
  };
}

export function buildPurseChaseHudState(
  state: PurseChaseState,
  playerX: number,
  playerZ: number,
): PurseChaseHudState | null {
  if (!state.active) return null;
  const dist = Math.hypot(state.thiefX - playerX, state.thiefZ - playerZ);
  return {
    active: true,
    phase: state.phase === 'caught' ? 'caught' : 'chasing',
    visualState: state.phase === 'caught' ? 'caught_dropped' : 'panicked_chase',
    itemDropped: state.droppedItem.dropped,
    victimName: state.victimName,
    thiefX: state.thiefX,
    thiefZ: state.thiefZ,
    distance: Math.round(dist),
    thiefHp: state.thiefHp,
    canGun: dist <= CHASE_GUN_RANGE,
    canSlap: dist <= CHASE_SLAP_RANGE,
    canHandToPolice: state.phase === 'caught' || dist <= CHASE_POLICE_RANGE,
  };
}
