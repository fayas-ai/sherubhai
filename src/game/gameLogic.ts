import {
  AABB,
  ActiveDialogue,
  BankTransaction,
  BuildingDef,
  DialogueChoice,
  DialogueExchange,
  EmptyPlotDef,
  GameProgressState,
  GameSettings,
  InventoryItem,
  LevelCompletionNotice,
  NpcDef,
  NpcMemory,
  PlayableRole,
  RandomEventTemplate,
  SheruOutfit,
  ShopCategory,
  TimeOfDayPhase,
  VehicleDef,
} from '../types/game';
import {
  BOSS_DIALOGUES,
  NPC_LINES,
  SHERU_DIALOGUES,
  getShopPackPool,
} from '../data/dialogueData';
import { RANDOM_EVENTS } from '../data/eventsData';
import { LEVELS, getLevelById } from '../data/levelsData';
import {
  BUILDINGS,
  EMPTY_PLOTS,
  NPCS,
  PLAYER_SPAWN,
  WORLD_RADIUS,
} from '../data/worldData';

export const SAVE_STORAGE_KEY = 'sheru_bhai_ghop_world_save_v1';
export const SETTINGS_STORAGE_KEY = 'sheru_bhai_ghop_world_settings_v1';

export function createDefaultSettings(): GameSettings {
  return {
    musicVolume: 0.35,
    sfxVolume: 0.7,
    muted: false,
    graphicsQuality: 'medium',
    mouseSensitivity: 1.0,
    mobileSensitivity: 1.0,
    showTouchControls: false,
  };
}

export function createInitialProgress(): GameProgressState {
  const npcMemory: Record<string, NpcMemory> = {};
  for (const npc of NPCS) {
    npcMemory[npc.id] = {
      npcId: npc.id,
      relationship: npc.personality === 'friendly' ? 25 : npc.isBoss ? -20 : 0,
      timesMet: 0,
      lastLineIds: [],
      mood: npc.personality === 'angry' ? 'angry' : 'neutral',
      boughtTheirShop: false,
      builtRivalShop: false,
      partnered: false,
      defeatedChallenge: false,
      lastInteractionTurn: -99,
    };
  }

  return {
    version: 1,
    ghopSpentTotal: 0,
    ghopEarnedTotal: 0,
    reputation: 100,
    titleBadge: 'Town Newcomer Lion',
    legendaryOutfitUnlocked: false,
    sheruOutfit: 'black',
    playableRole: 'sheru',
    ownedVehicleIds: [
      'veh_sheru_supercar',
      'veh_kerala_auto',
      'veh_royal_bike',
      'veh_kerala_bus',
      'veh_ambulance_108',
    ],
    parkedVehicles: {},
    turnCounter: 0,
    currentLevelId: 1,
    highestUnlockedLevel: 1,
    completedLevels: [],
    ownedBusinesses: {},
    builtShops: {},
    inventory: [
      {
        id: 'item_unlimited_card',
        name: 'GHOP GHOP Unlimited Platinum Card',
        mlName: 'അൺലിമിറ്റഡ് GHOP കാർഡ്',
        category: 'key',
        description: 'Issued by GHOP GHOP International Bank. Balance: ∞.',
        quantity: 1,
        acquiredAt: Date.now(),
      },
      {
        id: 'item_gold_chains',
        name: 'Signature 24K Lion Gold Chains',
        mlName: 'സ്വർണ്ണമാല സെറ്റ്',
        category: 'item',
        description: 'Pure blinding billionaire aura.',
        quantity: 3,
        acquiredAt: Date.now(),
      },
    ],
    npcMemory,
    bankTransactions: [
      {
        id: 'tx_init_1',
        type: 'deposit',
        label: 'Opening Unlimited GHOP Royal Vault',
        amountGhop: 999999999999,
        timestamp: Date.now(),
      },
    ],
    bankAccountsCount: 1,
    bankInvestmentsTotal: 0,
    recentEventIds: [],
    collectedWorldIds: [],
    vehiclesDrivenIds: [],
    visitedBuildingIds: [],
    eventsResolvedCount: 0,
    itemsBoughtCount: 0,
    dailyStreak: 1,
    bestDailyStreak: 1,
    lastActiveDate: getLocalDateKey(),
    totalActiveDays: 1,
    lastPlayerPos: { ...PLAYER_SPAWN },
    timeOfDay: 0.28, // Bright golden Kerala morning
  };
}

export function formatGhop(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  if (abs >= 1_000_000_000) return `${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(1)}K`;
  return String(abs);
}

export function getTitleBadgeForProgress(state: GameProgressState): string {
  if (state.legendaryOutfitUnlocked || state.completedLevels.includes(100)) {
    return 'KING OF GHOP GHOP WORLD';
  }
  const ownedTotal =
    Object.keys(state.ownedBusinesses).length + Object.keys(state.builtShops).length;
  if (ownedTotal >= 10 || state.reputation >= 1200) return 'Grand Kerala Tycoon';
  if (ownedTotal >= 6 || state.reputation >= 700) return 'Empire Billionaire';
  if (ownedTotal >= 3 || state.reputation >= 400) return 'Town Business King';
  if (ownedTotal >= 1 || state.reputation >= 200) return 'Rising GHOP Mogul';
  return 'Town Newcomer Lion';
}

export function getTimeOfDayPhase(t: number): TimeOfDayPhase {
  const norm = ((t % 1) + 1) % 1;
  if (norm >= 0.65 && norm < 0.8) return 'sunset';
  if (norm >= 0.8 || norm < 0.14) return 'night';
  return 'day';
}

// --- HOSPITAL WALK-IN INTERIOR BOUNDS & COLLIDERS (PURE, TESTABLE) ---
export const HOSPITAL_INTERIOR_BOUNDS = {
  centerX: 64,
  centerZ: -46,
  minX: 56.55,
  maxX: 71.45,
  minZ: -51.45,
  maxZ: -40.25,
  doorX: 64,
  doorZ: -40,
  doorHalfWidth: 2.4,
  ceilingY: 5.4,
} as const;

export function isInsideHospitalInterior(x: number, z: number): boolean {
  return (
    x >= HOSPITAL_INTERIOR_BOUNDS.minX &&
    x <= HOSPITAL_INTERIOR_BOUNDS.maxX &&
    z >= HOSPITAL_INTERIOR_BOUNDS.minZ &&
    z <= HOSPITAL_INTERIOR_BOUNDS.maxZ
  );
}

export function getHospitalWallColliders(b: {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}): AABB[] {
  const halfW = b.width / 2;
  const halfD = b.depth / 2;
  const minX = b.x - halfW;
  const maxX = b.x + halfW;
  const minZ = b.z - halfD;
  const maxZ = b.z + halfD;
  const wallT = 0.55;
  const doorHalf = HOSPITAL_INTERIOR_BOUNDS.doorHalfWidth;

  return [
    // North back wall
    { id: `${b.id}_wall_n`, minX, maxX, minZ, maxZ: minZ + wallT, height: b.height },
    // West side wall
    { id: `${b.id}_wall_w`, minX, maxX: minX + wallT, minZ, maxZ, height: b.height },
    // East side wall
    { id: `${b.id}_wall_e`, minX: maxX - wallT, maxX, minZ, maxZ, height: b.height },
    // South front-left wall (leaves wide 4.8m emergency sliding doorway open!)
    {
      id: `${b.id}_wall_sl`,
      minX,
      maxX: b.x - doorHalf,
      minZ: maxZ - wallT,
      maxZ,
      height: b.height,
    },
    // South front-right wall
    {
      id: `${b.id}_wall_sr`,
      minX: b.x + doorHalf,
      maxX,
      minZ: maxZ - wallT,
      maxZ,
      height: b.height,
    },
    // Interior 108 Reception Desk counter (back-left)
    {
      id: `${b.id}_desk`,
      minX: b.x - 6.2,
      maxX: b.x - 2.4,
      minZ: b.z - 4.1,
      maxZ: b.z - 2.7,
      height: 1.3,
    },
    // Interior VIP Recovery Bed #1 (back-right)
    {
      id: `${b.id}_bed1`,
      minX: b.x + 3.1,
      maxX: b.x + 6.9,
      minZ: b.z - 3.5,
      maxZ: b.z - 1.7,
      height: 1.2,
    },
    // Interior VIP Recovery Bed #2 (front-right)
    {
      id: `${b.id}_bed2`,
      minX: b.x + 3.1,
      maxX: b.x + 6.9,
      minZ: b.z + 0.9,
      maxZ: b.z + 2.7,
      height: 1.2,
    },
  ];
}

// --- COLLISION MATH (PURE, TESTABLE) ---
export function getWorldColliders(builtPlotIds: string[] = []): AABB[] {
  const boxes: AABB[] = [];
  for (const b of BUILDINGS) {
    if (b.id === 'hospital') {
      boxes.push(...getHospitalWallColliders(b));
      continue;
    }
    const halfW = (b.rotationY % Math.PI === 0 ? b.width : b.depth) / 2;
    const halfD = (b.rotationY % Math.PI === 0 ? b.depth : b.width) / 2;
    boxes.push({
      id: b.id,
      minX: b.x - halfW,
      maxX: b.x + halfW,
      minZ: b.z - halfD,
      maxZ: b.z + halfD,
      height: b.height,
    });
  }
  for (const plotId of builtPlotIds) {
    const plot = EMPTY_PLOTS.find((p) => p.id === plotId);
    if (!plot) continue;
    const halfW = plot.width / 2;
    const halfD = plot.depth / 2;
    boxes.push({
      id: `built_${plot.id}`,
      minX: plot.x - halfW,
      maxX: plot.x + halfW,
      minZ: plot.z - halfD,
      maxZ: plot.z + halfD,
      height: 6,
    });
  }
  return boxes;
}

export function resolveCircleWorldCollision(
  x: number,
  z: number,
  radius: number,
  colliders: AABB[],
  worldRadius: number = WORLD_RADIUS - 3,
): { x: number; z: number; collided: boolean } {
  let nx = x;
  let nz = z;
  let collided = false;

  for (const box of colliders) {
    const closestX = Math.max(box.minX, Math.min(nx, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(nz, box.maxZ));
    const dx = nx - closestX;
    const dz = nz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      collided = true;
      if (distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const push = radius - dist;
        nx += (dx / dist) * push;
        nz += (dz / dist) * push;
      } else {
        // Center is inside box; push out via nearest edge
        const leftPen = Math.abs(nx - box.minX);
        const rightPen = Math.abs(box.maxX - nx);
        const topPen = Math.abs(nz - box.minZ);
        const bottomPen = Math.abs(box.maxZ - nz);
        const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
        if (minPen === leftPen) nx = box.minX - radius;
        else if (minPen === rightPen) nx = box.maxX + radius;
        else if (minPen === topPen) nz = box.minZ - radius;
        else nz = box.maxZ + radius;
      }
    }
  }

  // Natural outer town perimeter clamp
  const distFromCenter = Math.hypot(nx, nz);
  if (distFromCenter > worldRadius) {
    collided = true;
    const scale = worldRadius / distFromCenter;
    nx *= scale;
    nz *= scale;
  }

  return { x: nx, z: nz, collided };
}

// --- INVENTORY & BANK HELPERS ---
export function addInventoryItem(
  inventory: InventoryItem[],
  item: Omit<InventoryItem, 'quantity' | 'acquiredAt'>,
): InventoryItem[] {
  const existing = inventory.find((i) => i.id === item.id);
  if (existing) {
    return inventory.map((i) =>
      i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
    );
  }
  return [
    {
      ...item,
      quantity: 1,
      acquiredAt: Date.now(),
    },
    ...inventory,
  ];
}

export function performBankTransaction(
  state: GameProgressState,
  type: BankTransaction['type'],
  label: string,
  amountGhop: number,
  extra?: { openAccount?: boolean },
): { state: GameProgressState; completedLevel: LevelCompletionNotice | null } {
  const tx: BankTransaction = {
    id: `tx_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    type,
    label,
    amountGhop,
    timestamp: Date.now(),
  };

  let next: GameProgressState = {
    ...state,
    turnCounter: state.turnCounter + 1,
    ghopSpentTotal:
      type === 'withdraw' || type === 'investment' || type === 'purchase' || type === 'business'
        ? state.ghopSpentTotal + Math.abs(amountGhop)
        : state.ghopSpentTotal,
    ghopEarnedTotal:
      type === 'deposit' || type === 'reward'
        ? state.ghopEarnedTotal + Math.abs(amountGhop)
        : state.ghopEarnedTotal,
    bankAccountsCount: extra?.openAccount
      ? state.bankAccountsCount + 1
      : state.bankAccountsCount,
    bankInvestmentsTotal:
      type === 'investment'
        ? state.bankInvestmentsTotal + Math.abs(amountGhop)
        : state.bankInvestmentsTotal,
    reputation: state.reputation + (type === 'investment' ? 20 : 10),
    bankTransactions: [tx, ...state.bankTransactions].slice(0, 40),
  };

  next = { ...next, titleBadge: getTitleBadgeForProgress(next) };
  return evaluateLevelCompletion(next, { type: 'bank_action' });
}

// --- DIALOGUE BUILDER WITH MEMORY & NON-REPETITION ---
function pickNonRepeating<T extends { id: string }>(
  pool: T[],
  recentIds: string[],
  seed: number,
): T {
  const fresh = pool.filter((item) => !recentIds.includes(item.id));
  const candidates = fresh.length > 0 ? fresh : pool;
  return candidates[Math.abs(seed) % candidates.length];
}

export function buildNpcDialogue(
  npc: NpcDef,
  state: GameProgressState,
): ActiveDialogue {
  const mem = state.npcMemory[npc.id] ?? {
    npcId: npc.id,
    relationship: 0,
    timesMet: 0,
    lastLineIds: [],
    mood: 'neutral' as const,
    boughtTheirShop: false,
    builtRivalShop: false,
    partnered: false,
    defeatedChallenge: false,
    lastInteractionTurn: -99,
  };

  const homeBuilding = npc.homeBuildingId
    ? BUILDINGS.find((b) => b.id === npc.homeBuildingId)
    : undefined;

  // Special case: Bank Manager
  if (npc.id === 'npc_bank_manager') {
    const sheruLine = pickNonRepeating(
      SHERU_DIALOGUES,
      mem.lastLineIds,
      state.turnCounter + 3,
    );
    return {
      id: `dlg_${npc.id}_${state.turnCounter}`,
      sourceType: 'npc',
      title: `${npc.name} — ${npc.role}`,
      npcId: npc.id,
      buildingId: 'ghop_bank',
      exchanges: [
        {
          speaker: 'npc',
          speakerName: npc.name,
          mlText:
            mem.timesMet === 0
              ? 'സ്വാഗതം Sheru Bhai! താങ്കളുടെ അക്കൗണ്ടിൽ UNLIMITED GHOP ബാലൻസ് കണ്ട് എന്റെ കമ്പ്യൂട്ടർ ഹാങ്ങ് ആയി!'
              : 'വീണ്ടും സ്വാഗതം ബോസ്! ഇന്ന് എത്ര ബില്യൺ ട്രില്യൺ GHOP വേണം?',
          enSub:
            mem.timesMet === 0
              ? 'Welcome Sheru Bhai! Seeing UNLIMITED GHOP in your account crashed my computer!'
              : 'Welcome back boss! How many billion trillion GHOP do you need today?',
          mood: 'shocked',
        },
        {
          speaker: 'sheru',
          speakerName: 'Sheru Bhai',
          mlText: sheruLine.ml,
          enSub: sheruLine.en,
        },
      ],
      choices: [
        {
          id: 'open_bank_ui',
          label: 'Open GHOP GHOP Bank Dashboard',
          sublabel: 'Deposits, Withdrawals, Investments & New Accounts',
          badge: 'BANK',
          effect: {
            action: 'open_bank',
            relationshipDelta: 10,
            reputationDelta: 15,
            sheruReaction: 'flex',
            outcomeMl: 'GHOP GHOP അക്കൗണ്ട് ഡാഷ്ബോർഡ് തുറന്നു!',
            outcomeEn: 'Opened your Unlimited GHOP Account Dashboard!',
            npcReplyMl: 'വിഐപി കൗണ്ടർ റെഡി സാറേ!',
            npcReplyEn: 'VIP counter is ready, sir!',
          },
        },
        {
          id: 'bank_tip_manager',
          label: 'Tip Manager Menon 100,000 GHOP for Stress Relief',
          sublabel: 'Boost relationship +30 · Fame +20',
          costGhop: 100000,
          effect: {
            action: 'help',
            ghopDelta: -100000,
            relationshipDelta: 30,
            reputationDelta: 20,
            npcMood: 'happy',
            sheruReaction: 'celebrate',
            outcomeMl: 'മാനേജർ മേനോൻ സന്തോഷം കൊണ്ട് ചായ ഓർഡർ ചെയ്തു!',
            outcomeEn: 'Manager Menon happily ordered tea for the whole bank!',
            npcReplyMl: 'എന്റെ ജോലി ഇത്ര രസകരമായിരുന്നില്ല സാറേ!',
            npcReplyEn: 'Banking has never been this joyful, sir!',
          },
        },
        {
          id: 'bank_leave',
          label: 'Adjust Sunglasses & Walk Out Like a King',
          effect: {
            action: 'walk_away',
            reputationDelta: 5,
            sheruReaction: 'walk_away',
            outcomeMl: 'ബാങ്ക് ജീവനക്കാർ എഴുന്നേറ്റ് സല്യൂട്ട് അടിച്ചു!',
            outcomeEn: 'Every bank teller stood up and saluted!',
            npcReplyMl: 'വീണ്ടും വരൂ Sheru Bhai!',
            npcReplyEn: 'Come back anytime, Sheru Bhai!',
          },
        },
      ],
    };
  }

  // Boss confrontation
  if (npc.isBoss) {
    const bossPool = BOSS_DIALOGUES[npc.id] ?? BOSS_DIALOGUES.boss_kuttan;
    const bossLine = pickNonRepeating(bossPool, mem.lastLineIds, state.turnCounter + mem.timesMet);
    const sheruLine = pickNonRepeating(SHERU_DIALOGUES, mem.lastLineIds, state.turnCounter + 7);
    const alreadyOwned = homeBuilding ? Boolean(state.ownedBusinesses[homeBuilding.id]) : false;

    const choices: DialogueChoice[] = [
      {
        id: 'boss_duel_outbid',
        label: `Outbid ${npc.name} in a Billionaire Showdown!`,
        sublabel: 'Defeat boss in a comedy business battle · +60 Fame',
        badge: 'BOSS BATTLE',
        effect: {
          action: 'boss_win',
          ghopDelta: 500000,
          reputationDelta: 60,
          relationshipDelta: 20,
          npcMood: 'shocked',
          sheruReaction: 'celebrate',
          outcomeMl: `${npc.name} തോൽവി സമ്മതിച്ചു! Sheru Bhai-യുടെ മുന്നിൽ എല്ലാവരും ഫ്ലാറ്റ്!`,
          outcomeEn: `${npc.name} admitted defeat! Nobody can out-flex Sheru Bhai!`,
          npcReplyMl: bossPool[bossPool.length - 1].ml,
          npcReplyEn: bossPool[bossPool.length - 1].en,
        },
      },
    ];

    if (homeBuilding && homeBuilding.buyable && !alreadyOwned) {
      choices.push({
        id: 'boss_buy_hq',
        label: `Buy ${homeBuilding.name} Right Now!`,
        sublabel: `Cost: ${formatGhop(homeBuilding.purchasePrice)} GHOP · Take over boss HQ`,
        badge: 'BUY HQ',
        costGhop: homeBuilding.purchasePrice,
        effect: {
          action: 'buy_shop',
          buildingId: homeBuilding.id,
          ghopDelta: -homeBuilding.purchasePrice,
          reputationDelta: 80,
          relationshipDelta: -10,
          npcMood: 'shocked',
          sheruReaction: 'celebrate',
          outcomeMl: `${homeBuilding.name} ഇനി Sheru Empire സ്വന്തം!`,
          outcomeEn: `${homeBuilding.name} now officially belongs to Sheru Empire!`,
          npcReplyMl: 'എന്റെ സാമ്രാജ്യം ഒറ്റ ഒപ്പിൽ നീ വാങ്ങിയോ?!',
          npcReplyEn: 'You bought my entire HQ with a single signature?!',
        },
      });
    }

    choices.push(
      {
        id: 'boss_partner',
        label: 'Offer a 99% / 1% Boss Partnership',
        sublabel: 'Hilarious flex · +30 Fame',
        effect: {
          action: 'partner',
          reputationDelta: 30,
          relationshipDelta: 15,
          npcMood: 'nervous',
          sheruReaction: 'laugh',
          outcomeMl: '99% എനിക്ക്, 1% നിനക്ക്—അതാണ് Sheru Deal!',
          outcomeEn: '99% for Sheru, 1% for you—classic lion negotiation!',
          npcReplyMl: 'ഇതിലും ഭേദം കീഴടങ്ങലാണ് ബോസ്!',
          npcReplyEn: 'Might as well surrender gracefully, boss!',
        },
      },
      {
        id: 'boss_leave',
        label: 'Walk Away in Slow Motion',
        effect: {
          action: 'walk_away',
          reputationDelta: 10,
          sheruReaction: 'walk_away',
          outcomeMl: 'സിംഹത്തിന്റെ നടത്തം കണ്ട് ബോസ് നിശ്ശബ്ദനായി!',
          outcomeEn: 'Your slow-motion billionaire exit left the boss speechless!',
          npcReplyMl: 'നമുക്ക് വീണ്ടും കാണാം Sheru!',
          npcReplyEn: 'We will meet again, Sheru!',
        },
      },
    );

    return {
      id: `dlg_${npc.id}_${state.turnCounter}`,
      sourceType: 'boss',
      title: `${npc.name} · ${npc.bossTitle ?? 'TOWN BOSS'}`,
      npcId: npc.id,
      buildingId: homeBuilding?.id,
      exchanges: [
        {
          speaker: 'npc',
          speakerName: npc.name,
          mlText: alreadyOwned
            ? 'എന്റെ ബിസിനസ് വാങ്ങിയിട്ടും നീ വീണ്ടും വന്നോ ബോസ്?!'
            : bossLine.ml,
          enSub: alreadyOwned
            ? 'You already bought my flagship and came back for another round, boss?!'
            : bossLine.en,
          mood: alreadyOwned ? 'nervous' : 'angry',
        },
        {
          speaker: 'sheru',
          speakerName: 'Sheru Bhai',
          mlText: sheruLine.ml,
          enSub: sheruLine.en,
        },
      ],
      choices,
    };
  }

  // Shopkeeper with building
  if (homeBuilding && homeBuilding.buyable) {
    return buildShopDialogue(homeBuilding, npc, state, mem);
  }

  // Regular town NPC
  const pool = NPC_LINES[npc.personality] ?? NPC_LINES.friendly;
  const npcLine = pickNonRepeating(pool, mem.lastLineIds, state.turnCounter + mem.timesMet);
  const sheruLine = pickNonRepeating(SHERU_DIALOGUES, mem.lastLineIds, state.turnCounter + 11);

  return {
    id: `dlg_${npc.id}_${state.turnCounter}`,
    sourceType: 'npc',
    title: `${npc.name} — ${npc.role}`,
    npcId: npc.id,
    exchanges: [
      {
        speaker: 'npc',
        speakerName: npc.name,
        mlText:
          mem.timesMet > 0 && mem.relationship >= 30
            ? `ഓ Sheru Bhai! താങ്കളുടെ സാമ്രാജ്യം കണ്ട് ടൗൺ മുഴുവൻ ഫാൻസ് ആയി! ${npcLine.ml}`
            : npcLine.ml,
        enSub:
          mem.timesMet > 0 && mem.relationship >= 30
            ? `Oh Sheru Bhai! The whole town is cheering your empire! ${npcLine.en}`
            : npcLine.en,
        mood: mem.mood,
      },
      {
        speaker: 'sheru',
        speakerName: 'Sheru Bhai',
        mlText: sheruLine.ml,
        enSub: sheruLine.en,
      },
    ],
    choices: [
      {
        id: 'npc_gift_ghop',
        label: 'Bless Them with a 50,000 GHOP Bonus Gift',
        sublabel: 'Relationship +25 · Town Fame +25',
        costGhop: 50000,
        effect: {
          action: 'help',
          ghopDelta: -50000,
          relationshipDelta: 25,
          reputationDelta: 25,
          npcMood: 'celebrating',
          sheruReaction: 'celebrate',
          outcomeMl: `${npc.name} സന്തോഷം കൊണ്ട് തുള്ളിച്ചാടി!`,
          outcomeEn: `${npc.name} danced with pure joy!`,
          npcReplyMl: 'നന്ദി Sheru Bhai! താങ്കളാണ് ടൗണിന്റെ രാജാവ്!',
          npcReplyEn: 'Thank you Sheru Bhai! You are the true king of town!',
        },
      },
      {
        id: 'npc_challenge',
        label: 'Challenge Them to a Comedy Swag Contest',
        sublabel: 'Funny reaction · +20 Fame',
        effect: {
          action: 'challenge',
          relationshipDelta: 10,
          reputationDelta: 20,
          npcMood: 'happy',
          sheruReaction: 'laugh',
          outcomeMl: 'ചിരിയുടെ പൂരം—ചുറ്റുമുള്ളവർ കയ്യടിച്ചു!',
          outcomeEn: 'A comedy festival broke out—bystanders applauded!',
          npcReplyMl: 'സാറിനോട് മത്സരിക്കാൻ ആരുമില്ല!',
          npcReplyEn: 'Nobody can match your style, sir!',
        },
      },
      {
        id: 'npc_gossip',
        label: 'Ask for Secret Town Rumors & Tips',
        sublabel: 'Gain insider clue · +12 Fame',
        effect: {
          action: 'negotiate',
          relationshipDelta: 15,
          reputationDelta: 12,
          npcMood: 'happy',
          sheruReaction: 'flex',
          outcomeMl: 'രഹസ്യ വിവരം: പടിഞ്ഞാറൻ കാട്ടിൽ രഹസ്യ തുരങ്കവും, മാളിൽ ബില്യണയർ ബാബുവുമുണ്ട്!',
          outcomeEn: 'Insider tip: Check the Western Grove for the Secret Tunnel, and Uptown Plaza for Billionaire Babu!',
          npcReplyMl: 'ഇത് നമ്മൾ തമ്മിലുള്ള രഹസ്യം കേട്ടോ!',
          npcReplyEn: 'Keep this secret between us, boss!',
        },
      },
      {
        id: 'npc_leave',
        label: 'Tip Sunglasses & Walk On',
        effect: {
          action: 'walk_away',
          reputationDelta: 5,
          sheruReaction: 'walk_away',
          outcomeMl: 'Sheru അടുത്ത അഡ്വഞ്ചറിലേക്ക് നടന്നു!',
          outcomeEn: 'Sheru strolled off toward the next meme encounter!',
          npcReplyMl: 'പിന്നെ കാണാം ബോസ്!',
          npcReplyEn: 'See you around, boss!',
        },
      },
    ],
  };
}

export function buildShopDialogue(
  building: BuildingDef,
  ownerNpc: NpcDef | undefined,
  state: GameProgressState,
  mem?: NpcMemory,
): ActiveDialogue {
  const isOwned = Boolean(state.ownedBusinesses[building.id]);
  const ownedRec = state.ownedBusinesses[building.id];
  const oppositePlot = building.oppositePlotId
    ? EMPTY_PLOTS.find((p) => p.id === building.oppositePlotId)
    : undefined;
  const canBuildOpposite = Boolean(oppositePlot && !state.builtShops[oppositePlot.id]);
  const speakerName = ownerNpc?.name ?? `${building.name} Owner`;

  const packPool = getShopPackPool(building.category);
  const pack = pickNonRepeating(
    packPool,
    mem?.lastLineIds ?? [],
    state.turnCounter + (mem?.timesMet ?? 0),
  );

  const exchanges: DialogueExchange[] = isOwned
    ? [
        {
          speaker: 'npc',
          speakerName,
          mlText: `ബോസ്! താങ്കളുടെ "${ownedRec.customName}" (Lv.${ownedRec.level}) ഇന്ന് തകർത്ത് ഓടുകയാണ്!`,
          enSub: `Boss! Your "${ownedRec.customName}" (Lv.${ownedRec.level}) is booming with customers today!`,
          mood: 'happy',
        },
        {
          speaker: 'sheru',
          speakerName: 'Sheru Bhai',
          mlText: 'അതാണ് Sheru Brand! കസ്റ്റമേഴ്സ് എല്ലാം ഹാപ്പി അല്ലേ?',
          enSub: 'That is the Sheru Brand! Keep everyone smiling!',
        },
      ]
    : mem?.builtRivalShop
      ? [
          {
            speaker: 'npc',
            speakerName,
            mlText: 'അയ്യോ സാറേ! എന്റെ എതിർവശത്ത് കട തുറന്നതിൽ പിന്നെ എന്റെ കസ്റ്റമേഴ്സ് എല്ലാം അങ്ങോട്ട് പോയി!',
            enSub: 'Oh no sir! Since you built a rival shop right opposite me, all my customers went there!',
            mood: 'jealous',
          },
          {
            speaker: 'sheru',
            speakerName: 'Sheru Bhai',
            mlText: 'ഇപ്പോൾ എന്റെ കട വാങ്ങാൻ സമ്മതിക്കുമോ അതോ പാർട്ണർ ആകാമോ?',
            enSub: 'Ready to sell me your shop now or join my empire?',
          },
        ]
      : [
          {
            speaker: 'npc',
            speakerName,
            mlText: pack.shopkeeperMl,
            enSub: pack.shopkeeperEn,
            mood: ownerNpc?.personality === 'angry' ? 'angry' : 'neutral',
          },
          {
            speaker: 'sheru',
            speakerName: 'Sheru Bhai',
            mlText: pack.sheruMl,
            enSub: pack.sheruEn,
          },
          {
            speaker: 'npc',
            speakerName,
            mlText: pack.followupMl,
            enSub: pack.followupEn,
            mood: 'shocked',
          },
        ];

  const choices: DialogueChoice[] = [];

  // 1. Buy signature product
  if (building.products.length > 0) {
    const prod = building.products[state.turnCounter % building.products.length];
    choices.push({
      id: `buy_prod_${prod.id}`,
      label: `Buy ${prod.name}`,
      sublabel: `${formatGhop(prod.priceGhop)} GHOP · ${prod.mlName}`,
      badge: 'ITEM',
      costGhop: prod.priceGhop,
      effect: {
        action: 'buy_item',
        buildingId: building.id,
        ghopDelta: -prod.priceGhop,
        reputationDelta: 15,
        relationshipDelta: 12,
        itemReward: {
          id: prod.id,
          name: prod.name,
          mlName: prod.mlName,
          category: prod.category,
          description: prod.description,
        },
        npcMood: 'happy',
        sheruReaction: 'flex',
        outcomeMl: `${prod.mlName} വാങ്ങി! ${prod.funnyEffect}`,
        outcomeEn: `Purchased ${prod.name}! ${prod.funnyEffect}`,
        npcReplyMl: 'വലിയ പണക്കാരൻ തന്നെ! വീണ്ടും വരൂ!',
        npcReplyEn: 'A true high-roller! Come back soon!',
      },
    });
  }

  // 2. Buy entire shop (if not owned)
  if (!isOwned) {
    choices.push({
      id: `buy_shop_${building.id}`,
      label: `BUY ENTIRE SHOP (${building.name})`,
      sublabel: `${formatGhop(building.purchasePrice)} GHOP · Make it Sheru Empire property!`,
      badge: 'BUY SHOP',
      costGhop: building.purchasePrice,
      effect: {
        action: 'buy_shop',
        buildingId: building.id,
        ghopDelta: -building.purchasePrice,
        reputationDelta: 55,
        relationshipDelta: 15,
        npcMood: 'shocked',
        sheruReaction: 'celebrate',
        outcomeMl: `ബോർഡ് മാറി! ${building.name} ഇനി Sheru Empire സ്വന്തം!`,
        outcomeEn: `Signboard flipped to GOLD! ${building.name} is now Sheru Empire property!`,
        npcReplyMl: 'അയ്യോ! എന്നെ ഇവിടെ മാനേജർ ആയി നിർത്തണേ ബോസ്!',
        npcReplyEn: 'Whoa! Please keep me hired as your branch manager, boss!',
      },
    });
  } else {
    choices.push({
      id: `collect_rev_${building.id}`,
      label: `Collect Business Profit (+${formatGhop(ownedRec.revenueTickGhop)} GHOP)`,
      sublabel: 'Flex as the proud owner · +15 Fame',
      badge: 'OWNER',
      effect: {
        action: 'claim_reward',
        buildingId: building.id,
        ghopDelta: ownedRec.revenueTickGhop,
        reputationDelta: 15,
        relationshipDelta: 10,
        npcMood: 'celebrating',
        sheruReaction: 'celebrate',
        outcomeMl: `${ownedRec.customName} ലാഭം അക്കൗണ്ടിൽ ക്രെഡിറ്റ് ആയി!`,
        outcomeEn: `Collected profits from ${ownedRec.customName}!`,
        npcReplyMl: 'ഇന്ന് കച്ചവടം സൂപ്പർ ഹിറ്റ് ആണ് ബോസ്!',
        npcReplyEn: 'Sales are breaking records today, boss!',
      },
    });
  }

  // 3. Build another shop in front / opposite!
  if (canBuildOpposite && oppositePlot) {
    choices.push({
      id: `build_opp_${oppositePlot.id}`,
      label: `BUILD ANOTHER SHOP OPPOSITE (${oppositePlot.name})`,
      sublabel: `${formatGhop(oppositePlot.buildCost)} GHOP · Construct a rival Sheru Mega Shop!`,
      badge: 'BUILD',
      costGhop: oppositePlot.buildCost,
      effect: {
        action: 'build_opposite',
        buildingId: building.id,
        plotId: oppositePlot.id,
        ghopDelta: -oppositePlot.buildCost,
        reputationDelta: 70,
        relationshipDelta: -25,
        npcMood: 'jealous',
        sheruReaction: 'laugh',
        outcomeMl: `എതിർവശത്തെ പ്ലോട്ടിൽ Sheru Mega Store പണിതുയർത്തി!`,
        outcomeEn: `Constructed a gleaming rival Sheru Mega Store right across the street!`,
        npcReplyMl: 'അയ്യോ! എന്റെ കസ്റ്റമേഴ്സ് എല്ലാം അങ്ങോട്ട് ഓടുന്നു!',
        npcReplyEn: 'NOOO! Every single customer is running across the street!',
      },
    });
  }

  // 4. Negotiate / Partner
  choices.push({
    id: `negotiate_${building.id}`,
    label: isOwned ? 'Give Staff a Surprise Bonus (+25 Fame)' : 'Negotiate a Funny Partnership Deal',
    sublabel: isOwned ? 'Boost morale · 20,000 GHOP' : 'Outsmart the owner · Relationship +20',
    costGhop: isOwned ? 20000 : undefined,
    effect: {
      action: 'negotiate',
      buildingId: building.id,
      ghopDelta: isOwned ? -20000 : 25000,
      reputationDelta: 25,
      relationshipDelta: 20,
      npcMood: 'happy',
      sheruReaction: 'flex',
      outcomeMl: isOwned
        ? 'സ്റ്റാഫ് എല്ലാം "Sheru Bhai ജയ്" വിളിച്ചു!'
        : 'ചർച്ച വിജയം! ഉടമ Sheru-വിന്റെ ബിസിനസ് ബുദ്ധിയെ പ്രശംസിച്ചു!',
      outcomeEn: isOwned
        ? 'Your staff cheered loudly for Sheru Bhai!'
        : 'Negotiation mastery! The owner praised your lion business instincts!',
      npcReplyMl: 'താങ്കളോട് സംസാരിക്കാൻ തന്നെ ഒരു രസമാണ് സാറേ!',
      npcReplyEn: 'Negotiating with you is pure entertainment, sir!',
    },
  });

  // 5. Walk away dramatically
  choices.push({
    id: `leave_${building.id}`,
    label: 'Walk Away Dramatically',
    sublabel: 'Slow-motion sunglasses exit',
    effect: {
      action: 'walk_away',
      buildingId: building.id,
      reputationDelta: 5,
      sheruReaction: 'walk_away',
      outcomeMl: 'സൺഗ്ലാസ് തിളക്കി Sheru നടന്നു നീങ്ങി!',
      outcomeEn: 'Sheru flashed his shades and strutted away dramatically!',
      npcReplyMl: 'എന്തൊരു സ്റ്റൈൽ ആണോ എന്തോ!',
      npcReplyEn: 'What unbelievable swagger!',
    },
  });

  return {
    id: `dlg_shop_${building.id}_${state.turnCounter}`,
    sourceType: 'shop',
    title: `${building.name} · ${building.mlSign}`,
    npcId: ownerNpc?.id,
    buildingId: building.id,
    exchanges,
    choices,
  };
}

export function buildPlotDialogue(plot: EmptyPlotDef, state: GameProgressState): ActiveDialogue {
  const alreadyBuilt = state.builtShops[plot.id];
  if (alreadyBuilt) {
    return {
      id: `dlg_plot_${plot.id}_${state.turnCounter}`,
      sourceType: 'plot',
      title: `${alreadyBuilt.name} (Sheru Built Branch)`,
      plotId: plot.id,
      exchanges: [
        {
          speaker: 'narrator',
          speakerName: 'Sheru Construction Empire',
          mlText: `ഈ പ്ലോട്ടിൽ താങ്കൾ പണിത "${alreadyBuilt.name}" (Lv.${alreadyBuilt.level}) തിരക്കോടു തിരക്കാണ്!`,
          enSub: `Your custom-built "${alreadyBuilt.name}" (Lv.${alreadyBuilt.level}) is packed with excited townsfolk!`,
        },
      ],
      choices: [
        {
          id: 'plot_collect',
          label: 'Collect Branch Profits (+150,000 GHOP)',
          effect: {
            action: 'claim_reward',
            plotId: plot.id,
            ghopDelta: 150000,
            reputationDelta: 20,
            sheruReaction: 'celebrate',
            outcomeMl: 'പുതിയ ബ്രാഞ്ചിൽ നിന്ന് വൻ ലാഭം!',
            outcomeEn: 'Massive profit collected from your newly built shop!',
            npcReplyMl: 'കസ്റ്റമേഴ്സ് ക്യൂ നിൽക്കുന്നു ബോസ്!',
            npcReplyEn: 'Customers are lining up around the block, boss!',
          },
        },
        {
          id: 'plot_leave',
          label: 'Admire Architecture & Leave',
          effect: {
            action: 'walk_away',
            sheruReaction: 'flex',
            outcomeMl: 'സൂപ്പർ ബിൽഡിംഗ്!',
            outcomeEn: 'Architectural billionaire perfection!',
            npcReplyMl: 'വീണ്ടും വരൂ ബോസ്!',
            npcReplyEn: 'See you soon, boss!',
          },
        },
      ],
    };
  }

  return {
    id: `dlg_plot_${plot.id}_${state.turnCounter}`,
    sourceType: 'plot',
    title: `Empty Plot — ${plot.name}`,
    plotId: plot.id,
    exchanges: [
      {
        speaker: 'npc',
        speakerName: 'Engineer Joy',
        mlText: `ബോസ്! ഈ ഒഴിഞ്ഞ പ്ലോട്ട് (${plot.name}) പുതിയൊരു Sheru Mega Store പണിയാൻ സൂപ്പർ സ്ഥലമാണ്!`,
        enSub: `Boss! This empty plot (${plot.name}) is prime Kerala real estate for a brand new Sheru Mega Store!`,
      },
      {
        speaker: 'sheru',
        speakerName: 'Sheru Bhai',
        mlText: 'കൺസ്ട്രക്ഷൻ ഇപ്പോൾ തന്നെ തുടങ്ങൂ—ടൗൺ ഞെട്ടട്ടെ!',
        enSub: 'Start construction immediately—let the whole town be amazed!',
      },
    ],
    choices: [
      {
        id: `build_now_${plot.id}`,
        label: `Construct "Sheru ${plot.district} Mega Store"`,
        sublabel: `Cost: ${formatGhop(plot.buildCost)} GHOP · Instant 3D Building!`,
        badge: 'BUILD 3D',
        costGhop: plot.buildCost,
        effect: {
          action: 'build_opposite',
          plotId: plot.id,
          buildingId: plot.oppositeBuildingId,
          ghopDelta: -plot.buildCost,
          reputationDelta: 75,
          sheruReaction: 'celebrate',
          outcomeMl: `പുതിയ Sheru Mega Store നിമിഷങ്ങൾക്കുള്ളിൽ പണിതുയർത്തി!`,
          outcomeEn: `A gleaming new 3D Sheru Mega Store rose right out of the ground!`,
          npcReplyMl: 'ടൗൺ മുഴുവൻ കയ്യടിക്കുന്നു ബോസ്!',
          npcReplyEn: 'The entire neighborhood is cheering, boss!',
        },
      },
      {
        id: 'plot_later',
        label: 'Save This Plot for Later',
        effect: {
          action: 'walk_away',
          sheruReaction: 'walk_away',
          outcomeMl: 'പ്ലോട്ട് പിന്നീട് നോക്കാം!',
          outcomeEn: 'Keeping this plot reserved for the next empire wave!',
          npcReplyMl: 'റെഡിയാകുമ്പോൾ വിളിക്കൂ ബോസ്!',
          npcReplyEn: 'Call me whenever you want to build, boss!',
        },
      },
    ],
  };
}

// --- RANDOM EVENT DIRECTOR WITH COOLDOWN & HISTORY ---
export function pickRandomEvent(
  state: GameProgressState,
  district: string,
  rng: () => number = Math.random,
): RandomEventTemplate {
  const eligible = RANDOM_EVENTS.filter((evt) => {
    const last = state.recentEventIds.find((r) => r.id === evt.id);
    if (!last) return true;
    return state.turnCounter - last.turn >= evt.cooldownTurns;
  });

  const pool = eligible.length > 0 ? eligible : RANDOM_EVENTS;
  // Slightly prefer events matching current district
  const districtMatches = pool.filter((e) => e.districtHint === district);
  const chosenPool =
    districtMatches.length > 0 && rng() < 0.55 ? districtMatches : pool;
  return chosenPool[Math.floor(rng() * chosenPool.length) % chosenPool.length];
}

export function buildEventDialogue(event: RandomEventTemplate, turn: number): ActiveDialogue {
  return {
    id: `evt_dlg_${event.id}_${turn}`,
    sourceType: 'event',
    title: `STREET EVENT · ${event.title}`,
    eventId: event.id,
    exchanges: event.exchanges,
    choices: event.choices,
  };
}

// --- APPLY DIALOGUE CHOICE & CONSEQUENCES ---
export function applyDialogueChoice(
  state: GameProgressState,
  dialogue: ActiveDialogue,
  choice: DialogueChoice,
): {
  state: GameProgressState;
  resolvedDialogue: ActiveDialogue;
  builtPlotId?: string;
  boughtBuildingId?: string;
  openBankRequested?: boolean;
  completedLevel: LevelCompletionNotice | null;
} {
  const eff = choice.effect;
  let next: GameProgressState = {
    ...state,
    turnCounter: state.turnCounter + 1,
    reputation: Math.max(0, state.reputation + (eff.reputationDelta ?? 0)),
    ghopSpentTotal:
      eff.ghopDelta && eff.ghopDelta < 0
        ? state.ghopSpentTotal + Math.abs(eff.ghopDelta)
        : state.ghopSpentTotal,
    ghopEarnedTotal:
      eff.ghopDelta && eff.ghopDelta > 0
        ? state.ghopEarnedTotal + eff.ghopDelta
        : state.ghopEarnedTotal,
  };

  let builtPlotId: string | undefined;
  let boughtBuildingId: string | undefined;
  let unlockedNotice: string | undefined;

  // Record bank transaction when spending/earning significant GHOP
  if (eff.ghopDelta && eff.ghopDelta !== 0) {
    const tx: BankTransaction = {
      id: `tx_${Date.now()}_${next.turnCounter}`,
      type:
        eff.action === 'buy_shop' || eff.action === 'build_opposite'
          ? 'business'
          : eff.ghopDelta < 0
            ? 'purchase'
            : 'reward',
      label: choice.label,
      amountGhop: Math.abs(eff.ghopDelta),
      timestamp: Date.now(),
    };
    next = {
      ...next,
      bankTransactions: [tx, ...next.bankTransactions].slice(0, 40),
    };
  }

  // Add item reward if any
  if (eff.itemReward) {
    next = {
      ...next,
      inventory: addInventoryItem(next.inventory, eff.itemReward),
    };
    unlockedNotice = `Added to Bag: ${eff.itemReward.name}`;
  }

  if (eff.action === 'buy_item') {
    next = { ...next, itemsBoughtCount: next.itemsBoughtCount + 1 };
  }

  // Buy shop
  if (eff.action === 'buy_shop' && eff.buildingId) {
    const b = BUILDINGS.find((x) => x.id === eff.buildingId);
    if (b && !next.ownedBusinesses[b.id]) {
      boughtBuildingId = b.id;
      const deed: Omit<InventoryItem, 'quantity' | 'acquiredAt'> = {
        id: `deed_${b.id}`,
        name: `${b.name} Ownership Deed`,
        mlName: `${b.mlSign} ആധാരം`,
        category: 'deed',
        description: `Official GHOP Empire title deed for ${b.name}.`,
      };
      next = {
        ...next,
        ownedBusinesses: {
          ...next.ownedBusinesses,
          [b.id]: {
            buildingId: b.id,
            customName: `Sheru ${b.name}`,
            originalName: b.name,
            category: b.category,
            level: 1,
            priceMultiplier: 1.0,
            hiredManager: NPCS.find((n) => n.id === b.ownerNpcId)?.name,
            boughtAt: Date.now(),
            revenueTickGhop: Math.max(50000, Math.round(b.purchasePrice * 0.12)),
          },
        },
        inventory: addInventoryItem(next.inventory, deed),
      };
      unlockedNotice = `NEW BUSINESS OWNED: Sheru ${b.name}!`;
    }
  }

  // Build shop opposite on empty plot
  if (eff.action === 'build_opposite' && eff.plotId) {
    const plot = EMPTY_PLOTS.find((p) => p.id === eff.plotId);
    if (plot && !next.builtShops[plot.id]) {
      builtPlotId = plot.id;
      const shopName = `Sheru ${plot.district} Mega Store`;
      next = {
        ...next,
        builtShops: {
          ...next.builtShops,
          [plot.id]: {
            plotId: plot.id,
            name: shopName,
            category: 'mall',
            level: 1,
            builtAt: Date.now(),
            rivalBuildingId: eff.buildingId ?? plot.oppositeBuildingId,
            customersCount: 42,
          },
        },
      };
      unlockedNotice = `CONSTRUCTED IN 3D: ${shopName}!`;
    }
  }

  // Update NPC memory
  if (dialogue.npcId) {
    const prevMem = next.npcMemory[dialogue.npcId] ?? {
      npcId: dialogue.npcId,
      relationship: 0,
      timesMet: 0,
      lastLineIds: [],
      mood: 'neutral' as const,
      boughtTheirShop: false,
      builtRivalShop: false,
      partnered: false,
      defeatedChallenge: false,
      lastInteractionTurn: -99,
    };
    const updatedMem: NpcMemory = {
      ...prevMem,
      timesMet: prevMem.timesMet + 1,
      relationship: Math.max(
        -100,
        Math.min(100, prevMem.relationship + (eff.relationshipDelta ?? 5)),
      ),
      mood: eff.npcMood ?? prevMem.mood,
      boughtTheirShop: prevMem.boughtTheirShop || Boolean(boughtBuildingId),
      builtRivalShop: prevMem.builtRivalShop || Boolean(builtPlotId),
      partnered: prevMem.partnered || eff.action === 'partner',
      defeatedChallenge: prevMem.defeatedChallenge || eff.action === 'boss_win',
      lastInteractionTurn: next.turnCounter,
      lastLineIds: [...prevMem.lastLineIds.slice(-4), dialogue.id],
    };
    next = {
      ...next,
      npcMemory: {
        ...next.npcMemory,
        [dialogue.npcId]: updatedMem,
      },
    };
  }

  // Record random event history & cooldown
  if (dialogue.sourceType === 'event' && dialogue.eventId) {
    next = {
      ...next,
      eventsResolvedCount: next.eventsResolvedCount + 1,
      recentEventIds: [
        { id: dialogue.eventId, turn: next.turnCounter },
        ...next.recentEventIds.filter((r) => r.id !== dialogue.eventId),
      ].slice(0, 20),
    };
  }

  next = { ...next, titleBadge: getTitleBadgeForProgress(next) };

  // Check if active level objective was satisfied!
  const triggerAction =
    boughtBuildingId
      ? { type: 'buy_shop' as const, targetId: boughtBuildingId }
      : builtPlotId
        ? { type: 'build_plot' as const, targetId: builtPlotId }
        : eff.action === 'boss_win'
          ? { type: 'boss_duel' as const, targetId: dialogue.npcId }
          : eff.action === 'buy_item'
            ? { type: 'buy_item' as const, targetId: dialogue.buildingId }
            : dialogue.sourceType === 'event'
              ? { type: 'resolve_event' as const }
              : { type: 'talk_npc' as const, targetId: dialogue.npcId };

  const evalResult = evaluateLevelCompletion(next, triggerAction);
  next = evalResult.state;

  const resolvedDialogue: ActiveDialogue = {
    ...dialogue,
    resolved: {
      choiceLabel: choice.label,
      outcomeMl: eff.outcomeMl,
      outcomeEn: eff.outcomeEn,
      npcReplyMl: eff.npcReplyMl,
      npcReplyEn: eff.npcReplyEn,
      ghopDelta: eff.ghopDelta,
      reputationDelta: eff.reputationDelta,
      unlockedNotice,
    },
  };

  return {
    state: next,
    resolvedDialogue,
    builtPlotId,
    boughtBuildingId,
    openBankRequested: eff.action === 'open_bank',
    completedLevel: evalResult.completedLevel,
  };
}

// --- WORLD ACTION RECORDERS (COLLECTIBLES, VEHICLES, BUILDINGS) ---
export function recordCollectiblePickup(
  state: GameProgressState,
  collectibleId: string,
  name: string,
  mlName: string,
  description: string,
): { state: GameProgressState; completedLevel: LevelCompletionNotice | null } {
  if (state.collectedWorldIds.includes(collectibleId)) {
    return { state, completedLevel: null };
  }
  const next: GameProgressState = {
    ...state,
    turnCounter: state.turnCounter + 1,
    reputation: state.reputation + 30,
    collectedWorldIds: [...state.collectedWorldIds, collectibleId],
    inventory: addInventoryItem(state.inventory, {
      id: collectibleId,
      name,
      mlName,
      category: 'collectible',
      description,
    }),
  };
  return evaluateLevelCompletion(next, { type: 'collect_item', targetId: collectibleId });
}

export function recordVehicleDriven(
  state: GameProgressState,
  vehicleId: string,
): { state: GameProgressState; completedLevel: LevelCompletionNotice | null } {
  const already = state.vehiclesDrivenIds.includes(vehicleId);
  const next: GameProgressState = already
    ? state
    : {
        ...state,
        vehiclesDrivenIds: [...state.vehiclesDrivenIds, vehicleId],
        reputation: state.reputation + 15,
      };
  return evaluateLevelCompletion(next, { type: 'drive_vehicle', targetId: vehicleId });
}

export function recordBuildingVisited(
  state: GameProgressState,
  buildingId: string,
): { state: GameProgressState; completedLevel: LevelCompletionNotice | null } {
  const already = state.visitedBuildingIds.includes(buildingId);
  const next: GameProgressState = already
    ? state
    : {
        ...state,
        visitedBuildingIds: [...state.visitedBuildingIds, buildingId],
        reputation: state.reputation + 10,
      };
  return evaluateLevelCompletion(next, { type: 'explore_building', targetId: buildingId });
}

// --- BUSINESS EMPIRE MANAGEMENT ---
export function renameOwnedBusiness(
  state: GameProgressState,
  buildingId: string,
  newName: string,
): GameProgressState {
  const trimmed = newName.trim().slice(0, 32);
  if (!trimmed || !state.ownedBusinesses[buildingId]) return state;
  return {
    ...state,
    ownedBusinesses: {
      ...state.ownedBusinesses,
      [buildingId]: {
        ...state.ownedBusinesses[buildingId],
        customName: trimmed,
      },
    },
  };
}

export function upgradeOwnedBusiness(
  state: GameProgressState,
  buildingId: string,
): GameProgressState {
  const biz = state.ownedBusinesses[buildingId];
  if (!biz || biz.level >= 5) return state;
  const upgradeCost = biz.level * 500000;
  const nextLevel = biz.level + 1;
  const tx: BankTransaction = {
    id: `tx_upg_${Date.now()}`,
    type: 'business',
    label: `Upgrade ${biz.customName} to Lv.${nextLevel}`,
    amountGhop: upgradeCost,
    timestamp: Date.now(),
  };
  return {
    ...state,
    ghopSpentTotal: state.ghopSpentTotal + upgradeCost,
    reputation: state.reputation + 35,
    ownedBusinesses: {
      ...state.ownedBusinesses,
      [buildingId]: {
        ...biz,
        level: nextLevel,
        revenueTickGhop: Math.round(biz.revenueTickGhop * 1.6),
      },
    },
    bankTransactions: [tx, ...state.bankTransactions].slice(0, 40),
  };
}

// --- 100-LEVEL PROGRESSION EVALUATOR ---
export interface LevelTrigger {
  type:
    | 'explore_building'
    | 'talk_npc'
    | 'buy_item'
    | 'buy_shop'
    | 'build_plot'
    | 'bank_action'
    | 'drive_vehicle'
    | 'collect_item'
    | 'resolve_event'
    | 'boss_duel';
  targetId?: string;
}

export function isLevelObjectiveSatisfied(
  state: GameProgressState,
  levelId: number,
  trigger?: LevelTrigger,
): boolean {
  const lvl = getLevelById(levelId);
  const ownedTotal =
    Object.keys(state.ownedBusinesses).length + Object.keys(state.builtShops).length;

  switch (lvl.objectiveType) {
    case 'explore_building':
      return Boolean(
        (trigger?.type === 'explore_building' && trigger.targetId === lvl.targetId) ||
          (lvl.targetId && state.visitedBuildingIds.includes(lvl.targetId)),
      );
    case 'talk_npc':
      if (trigger?.type === 'talk_npc' && trigger.targetId === lvl.targetId) return true;
      if (trigger?.type === 'buy_item' || trigger?.type === 'buy_shop') {
        const b = BUILDINGS.find((x) => x.id === trigger.targetId);
        if (b && b.ownerNpcId === lvl.targetId) return true;
      }
      return false;
    case 'boss_duel':
      return Boolean(
        (trigger?.type === 'boss_duel' || trigger?.type === 'talk_npc') &&
          trigger.targetId === lvl.targetId,
      );
    case 'buy_item':
      if (trigger?.type === 'buy_item' || trigger?.type === 'buy_shop') {
        if (!lvl.targetId || trigger.targetId === lvl.targetId) return true;
      }
      return false;
    case 'buy_shop':
      return Boolean(
        (trigger?.type === 'buy_shop' && trigger.targetId === lvl.targetId) ||
          (lvl.targetId && state.ownedBusinesses[lvl.targetId]),
      );
    case 'build_plot':
      return Boolean(
        (trigger?.type === 'build_plot' &&
          (!lvl.targetId || trigger.targetId === lvl.targetId)) ||
          (lvl.targetId && state.builtShops[lvl.targetId]) ||
          (lvl.id === 19 && Object.keys(state.builtShops).length > 0),
      );
    case 'bank_action':
      return (
        trigger?.type === 'bank_action' ||
        state.bankTransactions.length - 1 >= (lvl.targetCount ?? 1)
      );
    case 'drive_vehicle':
      return Boolean(
        (trigger?.type === 'drive_vehicle' &&
          (!lvl.targetId || trigger.targetId === lvl.targetId)) ||
          (lvl.targetId && state.vehiclesDrivenIds.includes(lvl.targetId)),
      );
    case 'collect_item':
      return Boolean(
        (trigger?.type === 'collect_item' && trigger.targetId === lvl.targetId) ||
          (lvl.targetId && state.collectedWorldIds.includes(lvl.targetId)),
      );
    case 'resolve_event':
      return (
        trigger?.type === 'resolve_event' ||
        state.eventsResolvedCount >= (lvl.targetCount ?? 1)
      );
    case 'own_count':
      return ownedTotal >= (lvl.targetCount ?? 4);
    default:
      return false;
  }
}

export function evaluateLevelCompletion(
  state: GameProgressState,
  trigger?: LevelTrigger,
): { state: GameProgressState; completedLevel: LevelCompletionNotice | null } {
  const activeLvl = getLevelById(state.currentLevelId);
  if (!isLevelObjectiveSatisfied(state, activeLvl.id, trigger)) {
    return { state, completedLevel: null };
  }

  const alreadyCompleted = state.completedLevels.includes(activeLvl.id);
  const completedLevels = alreadyCompleted
    ? state.completedLevels
    : [...state.completedLevels, activeLvl.id].sort((a, b) => a - b);

  const nextLevelId = activeLvl.id < LEVELS.length ? activeLvl.id + 1 : null;
  const highestUnlockedLevel = Math.max(
    state.highestUnlockedLevel,
    nextLevelId ?? LEVELS.length,
  );
  const legendaryUnlocked = activeLvl.id === 100 || state.legendaryOutfitUnlocked;

  let nextInventory = state.inventory;
  if (!alreadyCompleted && activeLvl.rewardItem) {
    nextInventory = addInventoryItem(nextInventory, activeLvl.rewardItem);
  }

  const rewardTx: BankTransaction = {
    id: `tx_lvl_${activeLvl.id}_${Date.now()}`,
    type: 'reward',
    label: `Level ${activeLvl.id} Clear: ${activeLvl.title}`,
    amountGhop: activeLvl.rewardGhop,
    timestamp: Date.now(),
  };

  let next: GameProgressState = {
    ...state,
    completedLevels,
    highestUnlockedLevel,
    currentLevelId: nextLevelId ?? activeLvl.id,
    ghopEarnedTotal: state.ghopEarnedTotal + activeLvl.rewardGhop,
    reputation: state.reputation + activeLvl.rewardReputation,
    legendaryOutfitUnlocked: legendaryUnlocked,
    inventory: nextInventory,
    bankTransactions: [rewardTx, ...state.bankTransactions].slice(0, 40),
  };

  next = { ...next, titleBadge: getTitleBadgeForProgress(next) };

  return {
    state: next,
    completedLevel: {
      level: activeLvl,
      nextLevelId,
      legendaryUnlocked: activeLvl.id === 100,
    },
  };
}

// --- LOCALSTORAGE SAVE / LOAD ---
export function saveProgressToStorage(state: GameProgressState): boolean {
  try {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function normalizeLoadedProgress(
  parsed: Partial<GameProgressState> | null | undefined,
): GameProgressState | null {
  if (!parsed || typeof parsed.currentLevelId !== 'number') return null;
  const base = createInitialProgress();
  return {
    ...base,
    ...parsed,
    sheruOutfit: parsed.sheruOutfit ?? base.sheruOutfit,
    playableRole: parsed.playableRole ?? base.playableRole,
    ownedVehicleIds: Array.isArray(parsed.ownedVehicleIds)
      ? Array.from(new Set([...base.ownedVehicleIds, ...parsed.ownedVehicleIds]))
      : base.ownedVehicleIds,
    parkedVehicles: parsed.parkedVehicles ?? {},
    npcMemory: { ...base.npcMemory, ...(parsed.npcMemory ?? {}) },
    ownedBusinesses: parsed.ownedBusinesses ?? {},
    builtShops: parsed.builtShops ?? {},
    inventory: Array.isArray(parsed.inventory) ? parsed.inventory : base.inventory,
    completedLevels: Array.isArray(parsed.completedLevels) ? parsed.completedLevels : [],
    bankTransactions: Array.isArray(parsed.bankTransactions)
      ? parsed.bankTransactions
      : base.bankTransactions,
    recentEventIds: Array.isArray(parsed.recentEventIds) ? parsed.recentEventIds : [],
    collectedWorldIds: Array.isArray(parsed.collectedWorldIds) ? parsed.collectedWorldIds : [],
    vehiclesDrivenIds: Array.isArray(parsed.vehiclesDrivenIds) ? parsed.vehiclesDrivenIds : [],
    visitedBuildingIds: Array.isArray(parsed.visitedBuildingIds) ? parsed.visitedBuildingIds : [],
    dailyStreak:
      typeof parsed.dailyStreak === 'number' && parsed.dailyStreak >= 1
        ? Math.floor(parsed.dailyStreak)
        : 1,
    bestDailyStreak:
      typeof parsed.bestDailyStreak === 'number' && parsed.bestDailyStreak >= 1
        ? Math.max(Math.floor(parsed.bestDailyStreak), Math.floor(parsed.dailyStreak ?? 1))
        : Math.max(1, Math.floor(parsed.dailyStreak ?? 1)),
    lastActiveDate:
      typeof parsed.lastActiveDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.lastActiveDate)
        ? parsed.lastActiveDate
        : base.lastActiveDate,
    totalActiveDays:
      typeof parsed.totalActiveDays === 'number' && parsed.totalActiveDays >= 1
        ? Math.floor(parsed.totalActiveDays)
        : 1,
    lastPlayerPos: parsed.lastPlayerPos ?? base.lastPlayerPos,
  };
}

export function loadProgressFromStorage(): GameProgressState | null {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    return normalizeLoadedProgress(JSON.parse(raw) as Partial<GameProgressState>);
  } catch {
    return null;
  }
}

export function saveSettingsToStorage(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

export function loadSettingsFromStorage(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return createDefaultSettings();
    return { ...createDefaultSettings(), ...JSON.parse(raw) };
  } catch {
    return createDefaultSettings();
  }
}

export function setPlayerOutfit(
  state: GameProgressState,
  outfit: SheruOutfit,
): GameProgressState {
  return {
    ...state,
    sheruOutfit: outfit,
    playableRole: 'sheru',
    reputation: state.reputation + 5,
  };
}

export function setPlayableRole(
  state: GameProgressState,
  role: PlayableRole,
): GameProgressState {
  return {
    ...state,
    playableRole: role,
    reputation: state.reputation + 5,
  };
}

export function buyVehicle(
  state: GameProgressState,
  vehicle: VehicleDef,
): { state: GameProgressState; alreadyOwned: boolean } {
  if (state.ownedVehicleIds.includes(vehicle.id)) {
    return { state, alreadyOwned: true };
  }
  const price = vehicle.priceGhop ?? 500000;
  const tx: BankTransaction = {
    id: `tx_veh_${Date.now()}_${Math.floor(Math.random() * 999)}`,
    type: 'purchase',
    label: `Bought Vehicle: ${vehicle.name}`,
    amountGhop: -price,
    timestamp: Date.now(),
  };
  const invItem: InventoryItem = {
    id: `deed_${vehicle.id}`,
    name: `${vehicle.name} Key`,
    mlName: vehicle.mlName ?? vehicle.name,
    category: 'vehicle',
    description: vehicle.description ?? 'Parked in Sheru Bhai Garage.',
    quantity: 1,
    acquiredAt: Date.now(),
  };
  return {
    alreadyOwned: false,
    state: {
      ...state,
      ownedVehicleIds: [...state.ownedVehicleIds, vehicle.id],
      ghopSpentTotal: state.ghopSpentTotal + price,
      reputation: state.reputation + 20,
      inventory: [invItem, ...state.inventory],
      bankTransactions: [tx, ...state.bankTransactions].slice(0, 40),
    },
  };
}

export function recordVehicleParked(
  state: GameProgressState,
  vehicleId: string,
  x: number,
  z: number,
  yaw: number,
  bayName?: string,
): GameProgressState {
  return {
    ...state,
    parkedVehicles: {
      ...state.parkedVehicles,
      [vehicleId]: { vehicleId, x, z, yaw, bayName },
    },
  };
}

export function resolveHospitalTreatment(
  state: GameProgressState,
  cause: 'coconut_drop' | 'crossing_hit' | 'pedestrian_bump' | 'manual_call',
): { state: GameProgressState; mlDoctorLine: string; enDoctorLine: string } {
  const lines =
    cause === 'coconut_drop'
      ? {
          ml: 'ഡോക്ടർ: "അയ്യോ ഷേരു ഭായ്! തേങ്ങ വീണത് തലയ്ക്കല്ലേ? തേങ്ങയാണ് പൊട്ടിയത്! രണ്ട് പൊറോട്ടയും ബീഫും കഴിച്ചാൽ ഉഷാറാകും!"',
          en: 'Dr. Menon: "A coconut fell on your head, Sheru Bhai?! The coconut cracked, not you! Two Porotta & Beef and you are 100% fit!"',
        }
      : cause === 'pedestrian_bump'
        ? {
            ml: 'ഡോക്ടർ: "ആളുകൾക്ക് ഒന്നും പറ്റിയില്ല! 108 ആംബുലൻസ് സമയത്ത് എത്തിയതുകൊണ്ട് എല്ലാവരും സേഫ് ആയി. സൂക്ഷിച്ച് ഓടിക്കൂ!"',
            en: 'Dr. Menon: "Everyone is completely safe! Because 108 Ambulance arrived fast, nobody was hurt. Drive safely around crossings!"',
          }
        : {
            ml: 'ഡോക്ടർ: "റോഡ് ക്രോസ് ചെയ്യുമ്പോൾ ആരാടാ ഷേരു ഭായിക്ക് നേരെ വണ്ടി ഓടിച്ചത്? ഇപ്പോൾ 100% ഫിറ്റ് ആണ്!"',
            en: 'Dr. Menon: "Who dared bump Sheru Bhai on the crossing?! You are patched up and 100% VIP fit!"',
          };

  return {
    state: {
      ...state,
      reputation: state.reputation + 15,
      visitedBuildingIds: state.visitedBuildingIds.includes('hospital')
        ? state.visitedBuildingIds
        : [...state.visitedBuildingIds, 'hospital'],
    },
    mlDoctorLine: lines.ml,
    enDoctorLine: lines.en,
  };
}

export function getRoadEgoMessage(
  kind: 'auto' | 'bus',
  role: PlayableRole,
): { ml: string; en: string } {
  if (kind === 'bus') {
    if (role === 'bus_driver') {
      return {
        ml: 'കൊമ്പൻ ബസ് ഡ്രൈവർ: "ആഹാ സഹപ്രവർത്തകൻ! എന്നാലും ഈ റൂട്ടിൽ ഫസ്റ്റ് ഞാനാ! *ഹോൺ*"',
        en: 'Komban Bus Driver: "Fellow bus driver! Still, I own this timetable! *AIR HORN*"',
      };
    }
    return {
      ml: 'കൊമ്പൻ ബസ് ഡ്രൈവർ: "ഹോൺ അടിക്കല്ലേ ഷേരു ഭായ്! സൈഡ് തരൂല്ല, ഇത് പ്രൈവറ്റ് ബസ് റൂട്ടാ!"',
      en: 'Komban Bus Driver: "Don’t honk at me Sheru Bhai! Zero side given — Kerala Private Bus ego!"',
    };
  }
  if (role === 'auto_driver') {
    return {
      ml: 'ഓട്ടോ ഡ്രൈവർ: "അളിയാ ഓട്ടോ യൂണിയൻ പവർ! എന്നാലും മീറ്റർ ഞാൻ ഇടില്ല!"',
      en: 'Auto Driver: "Bro, Auto Union power! Still not turning on the meter!"',
    };
  }
  return {
    ml: 'ഓട്ടോ ഡ്രൈവർ: "സൂപ്പർകാർ ആണേലും ഓട്ടോയ്ക്ക് മുന്നിൽ കയറല്ലേ ചേട്ടാ! ഇത് എന്റെ ജംഗ്ഷനാ!"',
    en: 'Auto Driver: "Even with a supercar, don’t cut off a Kerala Auto! I rule this junction!"',
  };
}

export function getShopCategoryLabel(category: ShopCategory): string {
  const map: Record<ShopCategory, string> = {
    tea_shop: 'Tea Shop',
    grocery: 'Supermart',
    bakery: 'Bakery',
    barber: 'Hair Salon',
    restaurant: 'Restaurant',
    hotel: 'Luxury Hotel',
    mall: 'Mega Mall',
    bank: 'GHOP Bank',
    car_showroom: 'Car Showroom',
    market: 'Town Market',
    apartment: 'Apartments',
    villa: 'Luxury Villa',
    secret: 'Secret Location',
    home: 'Sheru Royal Home',
    hospital: '108 General Hospital',
    police_station: 'Police Station',
    fire_station: 'Fire & Rescue Station',
    resort: 'Pool & Resort',
  };
  return map[category] ?? 'Business';
}

export interface PalmTreePoint {
  x: number;
  z: number;
  h: number;
}

export interface PalmCollisionResult {
  hit: boolean;
  palmIndex: number;
  pushedX: number;
  pushedZ: number;
  impactDirX: number;
  impactDirZ: number;
}

export function checkPalmTreeCollision(
  actorX: number,
  actorZ: number,
  actorRadius: number,
  palms: readonly PalmTreePoint[],
  trunkRadius = 0.55,
): PalmCollisionResult {
  const minDist = actorRadius + trunkRadius;
  let pushedX = actorX;
  let pushedZ = actorZ;
  let hit = false;
  let palmIndex = -1;
  let impactDirX = 0;
  let impactDirZ = 1;

  for (let i = 0; i < palms.length; i++) {
    const p = palms[i];
    const dx = pushedX - p.x;
    const dz = pushedZ - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < minDist) {
      hit = true;
      palmIndex = i;
      const nx = dist > 0.0001 ? dx / dist : 1;
      const nz = dist > 0.0001 ? dz / dist : 0;
      pushedX = p.x + nx * minDist;
      pushedZ = p.z + nz * minDist;
      // Impact pushes the tree away from the actor (into the tree)
      impactDirX = -nx;
      impactDirZ = -nz;
    }
  }

  return { hit, palmIndex, pushedX, pushedZ, impactDirX, impactDirZ };
}

export function isSheruInCoconutDropRange(
  cocoX: number,
  cocoZ: number,
  sheruX: number,
  sheruZ: number,
  range = 3.8,
): boolean {
  return Math.hypot(cocoX - sheruX, cocoZ - sheruZ) <= range;
}

export interface PalmShakeState {
  tiltX: number;
  tiltZ: number;
  frondRustle: number;
  done: boolean;
}

export function computePalmShakeState(
  shakeTime: number,
  impactDirX: number,
  impactDirZ: number,
): PalmShakeState {
  if (shakeTime >= 1.35) {
    return { tiltX: 0, tiltZ: 0, frondRustle: 0, done: true };
  }
  const envelope = Math.exp(-3.4 * shakeTime);
  const wave = Math.sin(shakeTime * 26);
  const bend = envelope * wave * 0.16;
  const len = Math.hypot(impactDirX, impactDirZ) || 1;
  const dirX = impactDirX / len;
  const dirZ = impactDirZ / len;
  // Rotating around X tilts along Z; rotating around Z tilts along -X
  return {
    tiltX: dirZ * bend,
    tiltZ: -dirX * bend,
    frondRustle: envelope * Math.sin(shakeTime * 34) * 0.28,
    done: false,
  };
}

// --- DAILY ACTIVE PLAYER STREAK TRACKING (PURE, TESTABLE) ---
export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetweenDateKeys(prevKey: string, nextKey: string): number {
  const parse = (key: string): number | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
    if (!match) return null;
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  };
  const prevMs = parse(prevKey);
  const nextMs = parse(nextKey);
  if (prevMs === null || nextMs === null) return 0;
  return Math.round((nextMs - prevMs) / 86_400_000);
}

export interface DailyStreakUpdateResult {
  state: GameProgressState;
  status: 'same_day' | 'incremented' | 'reset';
  bonusFame: number;
}

export function updateDailyActiveStreak(
  state: GameProgressState,
  todayDate: Date = new Date(),
): DailyStreakUpdateResult {
  const todayKey = getLocalDateKey(todayDate);
  const currentStreak = Math.max(1, state.dailyStreak || 1);
  const currentBest = Math.max(currentStreak, state.bestDailyStreak || 1);
  const currentTotal = Math.max(1, state.totalActiveDays || 1);

  if (!state.lastActiveDate || !/^\d{4}-\d{2}-\d{2}$/.test(state.lastActiveDate)) {
    return {
      state: {
        ...state,
        dailyStreak: currentStreak,
        bestDailyStreak: currentBest,
        lastActiveDate: todayKey,
        totalActiveDays: currentTotal,
      },
      status: 'same_day',
      bonusFame: 0,
    };
  }

  const diff = daysBetweenDateKeys(state.lastActiveDate, todayKey);
  if (diff <= 0) {
    return {
      state: {
        ...state,
        dailyStreak: currentStreak,
        bestDailyStreak: currentBest,
        totalActiveDays: currentTotal,
      },
      status: 'same_day',
      bonusFame: 0,
    };
  }

  if (diff === 1) {
    const nextStreak = currentStreak + 1;
    const bonusFame = Math.min(250, nextStreak * 25);
    return {
      state: {
        ...state,
        dailyStreak: nextStreak,
        bestDailyStreak: Math.max(currentBest, nextStreak),
        lastActiveDate: todayKey,
        totalActiveDays: currentTotal + 1,
        reputation: state.reputation + bonusFame,
      },
      status: 'incremented',
      bonusFame,
    };
  }

  return {
    state: {
      ...state,
      dailyStreak: 1,
      bestDailyStreak: currentBest,
      lastActiveDate: todayKey,
      totalActiveDays: currentTotal + 1,
    },
    status: 'reset',
    bonusFame: 0,
  };
}

export interface DailyStreakTier {
  label: string;
  accentColor: string;
  nextMilestone: number;
}

export function getDailyStreakTier(streak: number): DailyStreakTier {
  const s = Math.max(1, Math.floor(streak));
  if (s >= 14) {
    return { label: 'GHOP ROYAL', accentColor: '#fbbf24', nextMilestone: 30 };
  }
  if (s >= 7) {
    return { label: 'TOWN LEGEND', accentColor: '#f97316', nextMilestone: 14 };
  }
  if (s >= 3) {
    return { label: 'STREAK PRO', accentColor: '#34d399', nextMilestone: 7 };
  }
  return { label: 'DAILY ACTIVE', accentColor: '#ffd166', nextMilestone: 3 };
}


