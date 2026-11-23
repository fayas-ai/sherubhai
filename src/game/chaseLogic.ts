import { PurseChaseHudState } from '../types/game';
import { WORLD_RADIUS } from '../data/worldData';

export type PurseChaseAction = 'gun' | 'slap' | 'police';

export interface PurseChaseState {
  active: boolean;
  id: string;
  phase: 'idle' | 'chasing' | 'caught';
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

const VICTIM_NAMES = [
  'Meera Nair',
  'Anjali Menon',
  'Lakshmi Varma',
  'Devika Pillai',
  'Sreelakshmi K.',
];

export function createInitialChaseState(): PurseChaseState {
  return {
    active: false,
    id: '',
    phase: 'idle',
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
  };
}

export function startPurseChase(
  playerX: number,
  playerZ: number,
  playerYaw: number,
  seed: number = 0,
): PurseChaseState {
  // Spawn the shouting Kerala girl bystander ~7m in front-left of Sheru, and the pickpocket already sprinting ~12m ahead!
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

  // Pick a clear flee direction roughly away from Sheru (bending inward if near town edge)
  let dirX = thiefPos.x - playerX;
  let dirZ = thiefPos.z - playerZ;
  const len = Math.hypot(dirX, dirZ) || 1;
  dirX /= len;
  dirZ /= len;

  return {
    active: true,
    id: `chase_${Math.abs(seed)}_${Date.now()}`,
    phase: 'chasing',
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

  // Auto-expire gracefully if completely ignored for 95 seconds
  if (state.phase === 'chasing' && nextElapsed > 95) {
    return { state: createInitialChaseState(), expired: true };
  }

  if (state.phase === 'caught') {
    return {
      state: {
        ...state,
        elapsed: nextElapsed,
        stunTimer: state.stunTimer + safeDt,
      },
      expired: false,
    };
  }

  // Thief runs away from Sheru at a fun catchable pace (slower than Sheru's sprint so player can always catch up!)
  let dx = state.thiefX - playerX;
  let dz = state.thiefZ - playerZ;
  const distToPlayer = Math.hypot(dx, dz) || 1;
  dx /= distToPlayer;
  dz /= distToPlayer;

  // Keep thief circulating smoothly inside the lively town area instead of fleeing off the edge
  const distFromCenter = Math.hypot(state.thiefX, state.thiefZ);
  let targetDirX = state.fleeDirX * 0.65 + dx * 0.35;
  let targetDirZ = state.fleeDirZ * 0.65 + dz * 0.35;
  if (distFromCenter > 95) {
    // Curve gently back toward Main Junction
    const toCenterX = -state.thiefX / distFromCenter;
    const toCenterZ = -state.thiefZ / distFromCenter;
    targetDirX = targetDirX * 0.4 + toCenterX * 0.6;
    targetDirZ = targetDirZ * 0.4 + toCenterZ * 0.6;
  }
  // Add playful zig-zag dodge weave
  const weave = Math.sin(nextElapsed * 2.1) * 0.18;
  const perpX = -targetDirZ;
  const perpZ = targetDirX;
  let dirX = targetDirX + perpX * weave;
  let dirZ = targetDirZ + perpZ * weave;
  const dLen = Math.hypot(dirX, dirZ) || 1;
  dirX /= dLen;
  dirZ /= dLen;

  // Rubber-band slightly: slower when far ahead so player never loses them, brisk when close for exciting chase!
  const runSpeed = distToPlayer > 28 ? 3.2 : distToPlayer > 14 ? 5.2 : 6.1;
  const nextX = state.thiefX + dirX * runSpeed * safeDt;
  const nextZ = state.thiefZ + dirZ * runSpeed * safeDt;

  return {
    state: {
      ...state,
      thiefX: nextX,
      thiefZ: nextZ,
      fleeDirX: dirX,
      fleeDirZ: dirZ,
      thiefYaw: Math.atan2(dirX, dirZ),
      elapsed: nextElapsed,
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
        messageEn: 'Pickpocket is already stunned! Press Hand to Police to finish arrest!',
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
    return {
      state: {
        ...state,
        thiefHp: nextHp,
        phase: caughtNow ? 'caught' : 'chasing',
      },
      success: true,
      caughtNow,
      completed: false,
      rewardFame: caughtNow ? 35 : 10,
      rewardGhop: 0,
      messageMl: caughtNow
        ? 'ബൂം! GHOP സ്റ്റൺ ഗൺ അടിച്ച് കള്ളൻ വീണു! ഇനി പോലീസിൽ ഏൽപ്പിക്കൂ!'
        : 'ഹെഡ്‌ഷോട്ട് സ്റ്റൺ! ഒരു വെടി കൂടെ അല്ലെങ്കിൽ സ്ലാപ് കൊടുക്കൂ!',
      messageEn: caughtNow
        ? 'ZAP! Golden Stun Gun knocked the pickpocket down! Hand over to Police!'
        : 'Direct Stun Gun hit! Thief slowed—hit again or Slap Hand to catch!',
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
    return {
      state: {
        ...state,
        thiefHp: 0,
        phase: 'caught',
      },
      success: true,
      caughtNow: !wasCaught,
      completed: false,
      rewardFame: wasCaught ? 5 : 45,
      rewardGhop: 0,
      messageMl: wasCaught
        ? 'ഒരു ബോണസ് മാസ്സ് അടി കൂടി! ഇനി പോലീസിൽ കൊടുക്കൂ!'
        : 'പട്ടാസ് മാസ്സ് സ്ലാപ്! കള്ളൻ തല കറങ്ങി വീണു! ഇനി പോലീസിൽ ഏൽപ്പിക്കൂ!',
      messageEn: wasCaught
        ? 'Bonus Sheru Mass Slap! Now press Hand to Police to lock them up!'
        : 'MASS SLAP HAND! Pickpocket spun out dizzy! Press Hand to Police!',
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
