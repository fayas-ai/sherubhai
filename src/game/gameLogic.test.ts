import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AIRPORT_RUNWAY,
  evaluateAirplaneHazard,
  evaluateAirplaneLanding,
  isAircraftType,
  isPointOnAirportTarmac,
  isPointOnRunway,
  mapMobileFlightCursor,
  stepAirplanePhysics,
  stepGroundVehiclePhysics,
} from './vehiclePhysics';
import {
  AUX_PAVED_ROADS,
  SHERU_STATUE_ROUNDABOUT,
  TOWN_CROWD_ROUTES,
  TOWN_PALM_TREES,
  TOWN_ROADS,
  TOWN_TRAFFIC_ROUTES,
  computeRoadAutopilotTarget,
  computeSirenYieldBehavior,
  constrainVehicleToDrivableRoads,
  detectCurrentRoadName,
  doesBoxOverlapAnyRoad,
  isPointOnAnyRoad,
  isPointOnDrivablePavement,
  snapPointToNearestRoad,
} from './roadNetwork';
import {
  buildWeatherHudState,
  createInitialWeatherState,
  cycleWeatherCondition,
  generateStreetPuddleSpecs,
  getActivePuddleCount,
  getEffectiveFogRange,
  getWeatherVisualConfig,
  isPointInActivePuddle,
  stepWeatherCycle,
} from './weatherLogic';
import {
  classifyDistrictAmbientZone,
  computeNextAmbientIntervalSec,
  createInitialAmbientSchedulerState,
  getAmbientSoundPool,
  pickWeightedAmbientSound,
  stepAmbientScheduler,
} from './ambientAudioLogic';
import {
  CHASE_GUN_RANGE,
  CHASE_SLAP_RANGE,
  CHASE_TACKLE_RANGE,
  applyPurseChaseAction,
  buildPurseChaseHudState,
  computePanickedChasePose,
  shouldPhysicalTackleCatch,
  spawnDroppedPurse,
  startPurseChase,
  stepDroppedItemPhysics,
  stepPocketKidnapperNpcPanic,
  stepPurseChase,
} from './chaseLogic';
import {
  createAdaptivePerfState,
  detectDevicePerformanceBudget,
  stepAdaptivePerformance,
} from './performanceLogic';
import {
  LOD_SCALE_STEPS,
  classifyLodTierWithHysteresis,
  classifyVisibleWithHysteresis,
  computeLodDistances,
  createDynamicLodState,
  updateDynamicLodScale,
} from './lodSystem';
import {
  MINIMAP_PREF_STORAGE_KEY,
  formatCompactObjective,
  getInitialMinimapVisibility,
  readMinimapPreference,
  toggleHudMenu,
  toggleMinimapVisibility,
  writeMinimapPreference,
} from './hudPreferences';
import {
  canTogglePhotoMode,
  createInitialPhotoModeState,
  exitPhotoModeState,
  formatSnapshotFilename,
  recordSnapshotTaken,
  togglePhotoModeControls,
  togglePhotoModeState,
} from './photoMode';
import {
  WORLD_RAMPS,
  createOpenWorldProps,
  distanceToOBB,
  distanceToVehicleHull,
  findSafeVehicleExitPoint,
  getVehicleSolidOBBs,
  resolveCharacterSolidBodies,
  resolveVehiclePairCollision,
  sampleWorldSurface,
  stepCharacterPhysics,
  stepRigidBodyProps,
  stepVehicleChassisPhysics,
} from './openWorldPhysics';
import {
  BEACH_BENCHES,
  BEACH_ZONE,
  BRIDGE_DECK_Y,
  PLATFORM_CENTER_OFFSET,
  RAILWAY_STATIONS,
  TRAIN_DEFS,
  alightFromTrain,
  boardStoppedTrain,
  canVehicleAccessBeach,
  createInitialRailwayState,
  fastForwardNextTrainAtPlatform,
  findPlayerPlatformContext,
  isPointOnBeachZone,
  sampleMountainElevation,
  sampleRailwayElevation,
  sampleTrackPoint,
  stationLocalToWorld,
  stepRailwaySimulation,
} from './railwayLogic';
import {
  HOSPITAL_INTERIOR_BOUNDS,
  applyDialogueChoice,
  buildNpcDialogue,
  buyVehicle,
  checkPalmTreeCollision,
  computePalmShakeState,
  createInitialProgress,
  daysBetweenDateKeys,
  getDailyStreakTier,
  getLocalDateKey,
  getRoadEgoMessage,
  getWorldColliders,
  isInsideHospitalInterior,
  isSheruInCoconutDropRange,
  normalizeLoadedProgress,
  performBankTransaction,
  pickRandomEvent,
  recordBuildingVisited,
  recordCollectiblePickup,
  recordVehicleDriven,
  recordVehicleParked,
  renameOwnedBusiness,
  resolveCircleWorldCollision,
  resolveHospitalTreatment,
  setPlayableRole,
  setPlayerOutfit,
  updateDailyActiveStreak,
  upgradeOwnedBusiness,
} from './gameLogic';
import { LEVELS } from '../data/levelsData';
import {
  BOSS_DIALOGUES,
  LEVEL_COMPLETION_LINES,
  NPC_LINES,
  SHERU_DIALOGUES,
  SHOPKEEPER_PACKS,
} from '../data/dialogueData';
import { RANDOM_EVENTS } from '../data/eventsData';
import { AUTO_DESTINATIONS, VEHICLE_CATALOG } from '../data/vehiclesData';
import {
  AD_BOARDS,
  AUTO_STANDS,
  BUILDINGS,
  BUS_STOPS,
  EMPTY_PLOTS,
  NPCS,
  PARKING_BAYS,
  PLAYER_SPAWN,
  RESORT_POOL_BOUNDS,
  VEHICLES,
  WORLD_COLLECTIBLES,
  WORLD_RADIUS,
  getDistrictAt,
} from '../data/worldData';
import { AD_SLOTS, buildAdSlotSrcDoc } from '../components/AdSlot';
import {
  assignPooled3DAdSurfaces,
  buildTown3DAdSurfaces,
  isSurfaceOccludedByBuildings,
} from './ad3dPool';

test('100-level campaign contains exactly 100 unique playable levels across 10 chapters', () => {
  assert.equal(LEVELS.length, 100);
  const ids = new Set(LEVELS.map((l) => l.id));
  assert.equal(ids.size, 100);
  assert.equal(LEVELS[0].id, 1);
  assert.equal(LEVELS[0].chapter, 1);
  assert.equal(LEVELS[99].id, 100);
  assert.equal(LEVELS[99].chapter, 10);
  assert.match(LEVELS[99].title, /KING OF GHOP GHOP WORLD/);
});

test('dialogue bundle meets rich Malayalam/Manglish content targets', () => {
  assert.ok(SHERU_DIALOGUES.length >= 100);
  assert.ok(LEVEL_COMPLETION_LINES.length >= 30);
  assert.ok(RANDOM_EVENTS.length >= 20);
  const shopLinesCount = Object.values(SHOPKEEPER_PACKS).reduce(
    (acc, list) => acc + list.length * 2,
    0,
  );
  assert.ok(shopLinesCount >= 100, `Expected >=100 shop lines, got ${shopLinesCount}`);
  const bossLinesCount = Object.values(BOSS_DIALOGUES).reduce(
    (acc, list) => acc + list.length,
    0,
  );
  assert.ok(bossLinesCount >= 30);
  const npcLinesCount = Object.values(NPC_LINES).reduce(
    (acc, list) => acc + list.length,
    0,
  );
  assert.ok(npcLinesCount >= 40);
});

test('player spawn is clear of all building colliders and collision pushes player out cleanly', () => {
  const colliders = getWorldColliders();
  const spawnCheck = resolveCircleWorldCollision(
    PLAYER_SPAWN.x,
    PLAYER_SPAWN.z,
    0.85,
    colliders,
  );
  assert.equal(spawnCheck.collided, false);
  assert.equal(spawnCheck.x, PLAYER_SPAWN.x);
  assert.equal(spawnCheck.z, PLAYER_SPAWN.z);

  // Pushing into the Tea Shop center should eject outside the AABB
  const teaShop = BUILDINGS.find((b) => b.id === 'tea_shop')!;
  const pushed = resolveCircleWorldCollision(teaShop.x, teaShop.z, 0.85, colliders);
  assert.equal(pushed.collided, true);

  // Outer world boundary clamps player inside playable radius
  const edge = resolveCircleWorldCollision(WORLD_RADIUS + 50, 0, 0.85, colliders);
  assert.equal(edge.collided, true);
  assert.ok(Math.hypot(edge.x, edge.z) <= WORLD_RADIUS);
});

test('Level 1 completes on talking to Shaji Pappan Jr. and unlocks Level 2', () => {
  const initial = createInitialProgress();
  const shaji = NPCS.find((n) => n.id === 'npc_local_friend')!;
  const dlg = buildNpcDialogue(shaji, initial);
  const res = applyDialogueChoice(initial, dlg, dlg.choices[0]);

  assert.ok(res.completedLevel);
  assert.equal(res.completedLevel.level.id, 1);
  assert.equal(res.state.currentLevelId, 2);
  assert.equal(res.state.highestUnlockedLevel, 2);
  assert.ok(res.state.completedLevels.includes(1));
});

test('buying a shop updates business empire, adds deed, allows rename & upgrade, and updates NPC memory', () => {
  let state = createInitialProgress();
  state = { ...state, currentLevelId: 11, highestUnlockedLevel: 11 };

  const kuttan = NPCS.find((n) => n.id === 'npc_tea_owner')!;
  const dlg = buildNpcDialogue(kuttan, state);
  const buyShopChoice = dlg.choices.find((c) => c.effect.action === 'buy_shop');
  assert.ok(buyShopChoice, 'Buy entire shop choice should exist');

  const res = applyDialogueChoice(state, dlg, buyShopChoice);
  assert.equal(res.boughtBuildingId, 'tea_shop');
  assert.ok(res.state.ownedBusinesses['tea_shop']);
  assert.equal(res.state.npcMemory['npc_tea_owner'].boughtTheirShop, true);
  assert.ok(res.completedLevel && res.completedLevel.level.id === 11);

  const renamed = renameOwnedBusiness(res.state, 'tea_shop', 'Sheru Royal Tea Palace');
  assert.equal(renamed.ownedBusinesses['tea_shop'].customName, 'Sheru Royal Tea Palace');

  const upgraded = upgradeOwnedBusiness(renamed, 'tea_shop');
  assert.equal(upgraded.ownedBusinesses['tea_shop'].level, 2);
  assert.ok(
    upgraded.ownedBusinesses['tea_shop'].revenueTickGhop >
      renamed.ownedBusinesses['tea_shop'].revenueTickGhop,
  );
});

test('building a competing shop opposite creates a builtShop collider and marks rival NPC jealous', () => {
  const state = createInitialProgress();
  const kuttan = NPCS.find((n) => n.id === 'npc_tea_owner')!;
  const dlg = buildNpcDialogue(kuttan, state);
  const buildChoice = dlg.choices.find((c) => c.effect.action === 'build_opposite');
  assert.ok(buildChoice, 'Build another shop opposite choice should exist');

  const res = applyDialogueChoice(state, dlg, buildChoice);
  assert.equal(res.builtPlotId, 'plot_tea_opposite');
  assert.ok(res.state.builtShops['plot_tea_opposite']);
  assert.equal(res.state.npcMemory['npc_tea_owner'].builtRivalShop, true);

  const collidersWithBuilt = getWorldColliders(Object.keys(res.state.builtShops));
  assert.ok(collidersWithBuilt.some((c) => c.id === 'built_plot_tea_opposite'));
});

test('random street event cooldown prevents immediate repetition', () => {
  let state = createInitialProgress();
  const first = pickRandomEvent(state, 'Main Junction', () => 0);
  state = {
    ...state,
    turnCounter: 1,
    recentEventIds: [{ id: first.id, turn: 1 }],
  };
  const second = pickRandomEvent(state, 'Main Junction', () => 0);
  assert.notEqual(second.id, first.id);
});

test('bank transaction, collectible pickup, vehicle driving, and Level 100 coronation all work', () => {
  let state = createInitialProgress();
  state = { ...state, currentLevelId: 23, highestUnlockedLevel: 23 };
  const bankRes = performBankTransaction(state, 'investment', 'Luxury Mall Bond', 5000000);
  assert.ok(bankRes.completedLevel && bankRes.completedLevel.level.id === 23);

  state = { ...bankRes.state, currentLevelId: 7, highestUnlockedLevel: 24 };
  const colRes = recordCollectiblePickup(
    state,
    'col_missing_goat',
    'Runaway Market Goat',
    'ഓടിപ്പോയ ആട്',
    'Caught goat',
  );
  assert.ok(colRes.completedLevel && colRes.completedLevel.level.id === 7);

  state = { ...colRes.state, currentLevelId: 33, highestUnlockedLevel: 33 };
  const vehRes = recordVehicleDriven(state, 'veh_sheru_supercar');
  assert.ok(vehRes.completedLevel && vehRes.completedLevel.level.id === 33);

  state = { ...vehRes.state, currentLevelId: 100, highestUnlockedLevel: 100 };
  const crownRes = recordBuildingVisited(state, 'ghop_bank');
  assert.ok(crownRes.completedLevel && crownRes.completedLevel.level.id === 100);
  assert.equal(crownRes.state.legendaryOutfitUnlocked, true);
  assert.equal(crownRes.state.titleBadge, 'KING OF GHOP GHOP WORLD');
});

test('31 compact original vehicles & aeroplanes catalog has unique IDs, max speed <= 180 km/h, and sirens on emergency vehicles', () => {
  assert.equal(VEHICLE_CATALOG.length, 31);
  const ids = new Set(VEHICLE_CATALOG.map((v) => v.id));
  assert.equal(ids.size, 31);
  const aircraft = VEHICLE_CATALOG.filter((v) => v.category === 'aircraft' && v.isAircraft);
  assert.equal(aircraft.length, 3, 'Expected 3 flyable aeroplanes in VEHICLE_CATALOG');

  for (const v of VEHICLE_CATALOG) {
    const kmh = v.maxKmh ?? Math.round(v.maxSpeed * 4);
    assert.ok(kmh > 0 && kmh <= 180, `${v.id} speed ${kmh} exceeds 180 km/h`);
  }

  const ambulance = VEHICLE_CATALOG.find((v) => v.type === 'ambulance');
  const police = VEHICLE_CATALOG.find((v) => v.type === 'police_jeep');
  const fire = VEHICLE_CATALOG.find((v) => v.type === 'fire_engine');
  assert.ok(ambulance?.hasSiren, 'Ambulance must have siren');
  assert.ok(police?.hasSiren, 'Police jeep must have siren');
  assert.ok(fire?.hasSiren, 'Fire engine must have siren');
  assert.ok(AUTO_DESTINATIONS.length >= 6);
});

test('wardrobe outfit switch, playable role switch, vehicle buying, parking, hospital treatment, and road ego work', () => {
  let state = createInitialProgress();
  state = setPlayerOutfit(state, 'white');
  assert.equal(state.sheruOutfit, 'white');
  assert.equal(state.playableRole, 'sheru');

  state = setPlayableRole(state, 'auto_driver');
  assert.equal(state.playableRole, 'auto_driver');

  const normalized = normalizeLoadedProgress({
    currentLevelId: 1,
    sheruOutfit: 'black',
    playableRole: 'bus_driver',
  });
  assert.ok(normalized);
  assert.equal(normalized.sheruOutfit, 'black');
  assert.equal(normalized.playableRole, 'bus_driver');

  const unowned = VEHICLE_CATALOG.find((v) => !state.ownedVehicleIds.includes(v.id))!;
  const bought = buyVehicle(state, unowned);
  assert.equal(bought.alreadyOwned, false);
  assert.ok(bought.state.ownedVehicleIds.includes(unowned.id));

  const parked = recordVehicleParked(bought.state, unowned.id, 12, 16, 1.57, 'Hospital Bay');
  assert.equal(parked.parkedVehicles[unowned.id].bayName, 'Hospital Bay');

  const hosp = resolveHospitalTreatment(parked, 'coconut_drop');
  assert.ok(hosp.state.visitedBuildingIds.includes('hospital'));
  assert.match(hosp.enDoctorLine, /coconut/i);

  const egoBus = getRoadEgoMessage('bus', 'sheru');
  const egoAuto = getRoadEgoMessage('auto', 'auto_driver');
  assert.ok(egoBus.ml.length > 5 && egoAuto.ml.length > 5);
});

test('new Kerala town landmarks (Home, Hospital, Police, Fire, Resort) and stands exist cleanly', () => {
  const required = ['sheru_home', 'hospital', 'police_station', 'fire_station', 'pool_resort'];
  for (const id of required) {
    assert.ok(
      BUILDINGS.some((b) => b.id === id),
      `Missing required building: ${id}`,
    );
  }
  assert.ok(BUS_STOPS.length >= 2);
  assert.ok(AUTO_STANDS.length >= 2);
  assert.ok(PARKING_BAYS.length >= 3);
});

test('coconut palm collision pushes actor off trunk, computes damped 3D spring shake, and checks drop range', () => {
  const palms = [
    { x: -8.5, z: 9.5, h: 8.6 },
    { x: 8.5, z: 9.5, h: 8.8 },
  ];

  // Clear distance -> no collision
  const miss = checkPalmTreeCollision(0, 10, 0.85, palms, 0.55);
  assert.equal(miss.hit, false);
  assert.equal(miss.palmIndex, -1);

  // Colliding into right palm trunk from the left (-X side)
  const hit = checkPalmTreeCollision(7.8, 9.5, 0.85, palms, 0.55);
  assert.equal(hit.hit, true);
  assert.equal(hit.palmIndex, 1);
  assert.ok(Math.hypot(hit.pushedX - 8.5, hit.pushedZ - 9.5) >= 1.39);
  // Impact vector pushes into the tree (+X)
  assert.ok(hit.impactDirX > 0.9);

  // Damped spring shake tilts actively near t=0.06s and settles to rest at t>=1.35s
  const midShake = computePalmShakeState(0.06, hit.impactDirX, hit.impactDirZ);
  assert.equal(midShake.done, false);
  assert.ok(Math.abs(midShake.tiltZ) > 0.05);
  assert.ok(Math.abs(midShake.frondRustle) > 0.05);

  const settled = computePalmShakeState(1.4, hit.impactDirX, hit.impactDirZ);
  assert.equal(settled.done, true);
  assert.equal(settled.tiltX, 0);
  assert.equal(settled.tiltZ, 0);

  // Drop range detection for 'coconut_drop' emergency trigger
  assert.equal(isSheruInCoconutDropRange(8.5, 9.5, 7.1, 9.5, 3.8), true);
  assert.equal(isSheruInCoconutDropRange(8.5, 9.5, 2.0, 9.5, 3.8), false);
});

test('Kerala General Hospital has hollow walk-in doorway colliders, solid perimeter walls, and accurate interior bounds', () => {
  const colliders = getWorldColliders();
  assert.ok(!colliders.some((c) => c.id === 'hospital'), 'Hospital must not be a single solid box');
  assert.ok(colliders.some((c) => c.id === 'hospital_wall_n'));
  assert.ok(colliders.some((c) => c.id === 'hospital_wall_sl'));
  assert.ok(colliders.some((c) => c.id === 'hospital_wall_sr'));

  // Walking straight through the wide 4.8m sliding doorway at (64, -40) must NOT collide!
  const throughDoor = resolveCircleWorldCollision(
    HOSPITAL_INTERIOR_BOUNDS.doorX,
    HOSPITAL_INTERIOR_BOUNDS.doorZ,
    0.85,
    colliders,
  );
  assert.equal(throughDoor.collided, false);

  // Standing in the bright central Hospital lobby at (64, -43) must NOT collide and registers as interior
  const inLobby = resolveCircleWorldCollision(64, -43, 0.85, colliders);
  assert.equal(inLobby.collided, false);
  assert.equal(isInsideHospitalInterior(64, -43), true);
  assert.equal(isInsideHospitalInterior(64, -36), false);

  // Trying to walk through the solid North back wall (64, -52) or West wall (56, -46) MUST block!
  const hitNorth = resolveCircleWorldCollision(64, -51.6, 0.85, colliders);
  assert.equal(hitNorth.collided, true);
  const hitWest = resolveCircleWorldCollision(56.4, -46, 0.85, colliders);
  assert.equal(hitWest.collided, true);
});

test('ad slot configs & ads-only friendly iframe HTML match exact 320x50 banner and 300x250 board scripts without label text', () => {
  assert.equal(AD_SLOTS.banner_320x50.width, 320);
  assert.equal(AD_SLOTS.banner_320x50.height, 50);
  assert.equal(AD_SLOTS.banner_320x50.key, '413a7c933ff446f282700a00aeaf2f13');

  assert.equal(AD_SLOTS.board_300x250.width, 300);
  assert.equal(AD_SLOTS.board_300x250.height, 250);
  assert.equal(AD_SLOTS.board_300x250.key, 'b4371a85a2736f642613c332799aeb7b');

  const bannerHtml = buildAdSlotSrcDoc('banner_320x50');
  assert.match(bannerHtml, /413a7c933ff446f282700a00aeaf2f13/);
  assert.match(bannerHtml, /'height' : 50/);
  assert.match(bannerHtml, /'width' : 320/);
  assert.match(bannerHtml, /https:\/\/bauval\.org\/22\/413a7c933ff446f282700a00aeaf2f13/);
  assert.doesNotMatch(bannerHtml, /HOME BANNER|SPONSOR BANNER/i);

  const boardHtml = buildAdSlotSrcDoc('board_300x250');
  assert.match(boardHtml, /b4371a85a2736f642613c332799aeb7b/);
  assert.match(boardHtml, /'height' : 250/);
  assert.match(boardHtml, /'width' : 300/);
  assert.match(boardHtml, /https:\/\/bauval\.org\/22\/b4371a85a2736f642613c332799aeb7b/);
  assert.doesNotMatch(boardHtml, /HOME ADS BOARD|KERALA ADS BOARD/i);
});

test('expanded Kerala town has radius >= 160, 14 outer landmarks, 8 300x250 Ad Boards, and outer districts', () => {
  assert.ok(WORLD_RADIUS >= 160, `Expected expanded WORLD_RADIUS >= 160, got ${WORLD_RADIUS}`);

  const extendedIds = [
    'malabar_cinema',
    'kochi_electronics',
    'backwater_cafe',
    'spice_hypermarket',
    'palm_apartments',
    'coastal_showroom',
    'technopark_tower',
    'ayurveda_spa',
    'grand_convention',
    'stadium_arena',
    'gold_palace_west',
    'harbour_fish_market',
    'marine_drive_plaza',
    'kovalam_lighthouse_cafe',
  ];
  const colliders = getWorldColliders();
  for (const id of extendedIds) {
    assert.ok(
      BUILDINGS.some((b) => b.id === id),
      `Missing extended building: ${id}`,
    );
    assert.ok(
      colliders.some((c) => c.id === id),
      `Missing collider for extended building: ${id}`,
    );
  }

  assert.ok(AD_BOARDS.length >= 8, `Expected >=8 300x250 Ad Boards, got ${AD_BOARDS.length}`);
  assert.equal(getDistrictAt(-90, 0), 'West Cinema Strip');
  assert.equal(getDistrictAt(90, 0), 'East Promenade');
  assert.equal(getDistrictAt(0, 82), 'South Coastal Blvd');
  assert.equal(getDistrictAt(0, -85), 'North InfoPark Strip');
  assert.equal(getDistrictAt(-120, 0), 'Far West Turf Blvd');
  assert.equal(getDistrictAt(120, 0), 'East Harbourfront');
  assert.equal(getDistrictAt(0, 115), 'Marine Drive Beach');
});

test('Daily Active Player streak increments on consecutive days, stays idempotent same-day, and resets after missed days while preserving best streak', () => {
  assert.equal(daysBetweenDateKeys('2026-11-20', '2026-11-21'), 1);
  assert.equal(daysBetweenDateKeys('2026-11-20', '2026-11-23'), 3);

  const day1 = new Date(2026, 10, 20, 10, 0, 0);
  const day2 = new Date(2026, 10, 21, 14, 0, 0);
  const day3 = new Date(2026, 10, 22, 9, 0, 0);
  const day6 = new Date(2026, 10, 25, 11, 0, 0);

  let state = {
    ...createInitialProgress(),
    dailyStreak: 1,
    bestDailyStreak: 1,
    lastActiveDate: getLocalDateKey(day1),
    totalActiveDays: 1,
  };

  // Same-day visit does not double-increment
  const sameDay = updateDailyActiveStreak(state, day1);
  assert.equal(sameDay.status, 'same_day');
  assert.equal(sameDay.state.dailyStreak, 1);
  assert.equal(sameDay.bonusFame, 0);

  // Consecutive day 2 increments streak & awards Fame bonus
  const inc2 = updateDailyActiveStreak(sameDay.state, day2);
  assert.equal(inc2.status, 'incremented');
  assert.equal(inc2.state.dailyStreak, 2);
  assert.equal(inc2.state.bestDailyStreak, 2);
  assert.equal(inc2.state.totalActiveDays, 2);
  assert.equal(inc2.bonusFame, 50);

  // Consecutive day 3 hits STREAK PRO tier
  const inc3 = updateDailyActiveStreak(inc2.state, day3);
  assert.equal(inc3.state.dailyStreak, 3);
  assert.equal(getDailyStreakTier(inc3.state.dailyStreak).label, 'STREAK PRO');
  assert.equal(getDailyStreakTier(7).label, 'TOWN LEGEND');
  assert.equal(getDailyStreakTier(14).label, 'GHOP ROYAL');

  // Missed days reset streak to 1 while keeping bestDailyStreak = 3
  const missed = updateDailyActiveStreak(inc3.state, day6);
  assert.equal(missed.status, 'reset');
  assert.equal(missed.state.dailyStreak, 1);
  assert.equal(missed.state.bestDailyStreak, 3);
  assert.equal(missed.state.totalActiveDays, 4);
});

test('3D CSS3D Adsterra pool maps every 300x250 board & 320x50 shop/home wall banner with occlusion & sticky slots', () => {
  const surfaces = buildTown3DAdSurfaces(BUILDINGS, AD_BOARDS);
  const boardSurfaces = surfaces.filter((s) => s.variant === 'board_300x250');
  const bannerSurfaces = surfaces.filter((s) => s.variant === 'banner_320x50');

  assert.equal(boardSurfaces.length, AD_BOARDS.length * 2, 'Each 3D board has front + back 300x250 faces');
  assert.ok(bannerSurfaces.length >= 45, `Expected >=45 shop/home 320x50 wall banners, got ${bannerSurfaces.length}`);
  assert.ok(
    bannerSurfaces.some((s) => s.id === 'sheru_home_front_banner'),
    'Sheru Home front 320x50 banner must be registered',
  );
  assert.ok(
    bannerSurfaces.some((s) => s.id.startsWith('spice_hypermarket_wall_')),
    'Shop wall 320x50 banners must be registered',
  );

  // Standing in front of Main Junction looking North (-Z) should select visible 3D banners & boards
  const colliders = getWorldColliders();
  const visibleBoards = assignPooled3DAdSurfaces(0, 18, 0, -1, surfaces, 'board_300x250', 3, 54, colliders, [
    null,
    null,
    null,
  ]);
  assert.ok(visibleBoards.some((b) => b !== null), 'Expected at least 1 visible 3D Ad Board near Main Junction');

  // Building between camera and distant surface properly occludes it
  const blocked = isSurfaceOccludedByBuildings(0, 12, -16, -32, 'ghop_bank', colliders);
  assert.equal(blocked, true, 'Tea Shop at (-16,-16) should occlude ray passing through it');
});

test('Kerala International Airport, Easy Ground Driving physics, and Easy Aeroplane Flight physics work cleanly', () => {
  // Airport landmark, runway bounds & district detection
  const terminal = BUILDINGS.find((b) => b.id === 'airport_terminal');
  assert.ok(terminal, 'airport_terminal landmark must exist');
  assert.equal(getDistrictAt(0, AIRPORT_RUNWAY.centerZ), 'Kerala International Airport');
  assert.equal(isPointOnRunway(0, AIRPORT_RUNWAY.centerZ), true);
  assert.equal(isPointOnRunway(0, 0), false);
  assert.equal(isAircraftType('airplane_jet'), true);
  assert.equal(isAircraftType('lambo_sport'), false);

  // Easy Ground Driving: calmer steering at 180 km/h than at city speed + crisp ABS braking
  const lowSpeedTurn = stepGroundVehiclePhysics(
    { speed: 10, yaw: 0, steerAngle: 0, steerInput: 1, maxSpeed: 45 },
    { forward: 1, strafe: 1, boost: false, handbrake: false },
    0.05,
  );
  const highSpeedTurn = stepGroundVehiclePhysics(
    { speed: 45, yaw: 0, steerAngle: 0, steerInput: 1, maxSpeed: 45 },
    { forward: 1, strafe: 1, boost: false, handbrake: false },
    0.05,
  );
  assert.ok(
    Math.abs(highSpeedTurn.yaw) < Math.abs(lowSpeedTurn.yaw),
    'High-speed steering should be calmer and steadier than low-speed city steering',
  );

  const absBrake = stepGroundVehiclePhysics(
    { speed: 20, yaw: 0, steerAngle: 0, steerInput: 0, maxSpeed: 45 },
    { forward: -1, strafe: 0, boost: false, handbrake: false },
    0.05,
  );
  assert.ok(absBrake.speed < 18, 'Pressing S while moving forward applies crisp ABS braking');

  // Easy Airplane Flight: smooth runway takeoff, climb, auto-level wings & auto-land touchdown
  let plane: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    roll: number;
    speed: number;
    maxSpeed: number;
    steerInput: number;
  } = {
    x: AIRPORT_RUNWAY.takeoffStartX,
    y: 0,
    z: AIRPORT_RUNWAY.takeoffStartZ,
    yaw: AIRPORT_RUNWAY.takeoffYaw,
    pitch: 0,
    roll: 0,
    speed: 0,
    maxSpeed: 45,
    steerInput: 0,
  };
  for (let i = 0; i < 40; i++) {
    const step = stepAirplanePhysics(
      plane,
      { throttle: 1, turn: 0, climb: i > 22, descend: false },
      0.05,
    );
    plane = step;
  }
  assert.ok(plane.y > 5, `Expected airplane to take off smoothly above 5m, got y=${plane.y}`);
  assert.ok(plane.x > AIRPORT_RUNWAY.takeoffStartX + 10, 'Airplane should advance down runway');

  // Auto-level wings when turning stops
  const banked = stepAirplanePhysics(
    plane,
    { throttle: 0.5, turn: 1, climb: false, descend: false },
    0.05,
  );
  assert.ok(Math.abs(banked.roll) > 0.01, 'Turning in air should bank wings smoothly');
  let leveled = banked;
  for (let i = 0; i < 30; i++) {
    leveled = stepAirplanePhysics(
      leveled,
      { throttle: 0, turn: 0, climb: false, descend: false },
      0.05,
    );
  }
  assert.ok(Math.abs(leveled.roll) < 0.02, 'Wings should auto-level cleanly when turn keys released');

  // Auto-Land descends smoothly to ground without crashing
  let landing = { ...leveled, y: 12 };
  let landed = false;
  for (let i = 0; i < 80; i++) {
    const step = stepAirplanePhysics(
      landing,
      { throttle: 0, turn: 0, climb: false, descend: false, autoLand: true },
      0.05,
    );
    landing = step;
    if (step.touchedDown || step.y === 0) {
      landed = true;
      break;
    }
  }
  assert.equal(landed, true, 'Auto-land should smoothly touch down to y=0');
  assert.equal(landing.roll, 0);
});

test('Zero stores, shops, plots, ad boards, stands, or palm trees overlap any paved road; manual off-runway landing blasts; mobile cursor UP=fly / DOWN=land', () => {
  // 1. Every building, empty plot, ad board, bus stop, auto stand, and coconut palm must be 100% clear of TOWN_ROADS
  assert.ok(TOWN_ROADS.length >= 11, 'Expected full Kerala town road network');

  for (const b of BUILDINGS) {
    const overlap = doesBoxOverlapAnyRoad(b.x, b.z, b.width, b.depth, b.rotationY, 0.2);
    assert.equal(
      overlap,
      null,
      `Building "${b.id}" at (${b.x}, ${b.z}) w=${b.width} d=${b.depth} overlaps paved road "${overlap}"`,
    );
  }

  for (const p of EMPTY_PLOTS) {
    const overlap = doesBoxOverlapAnyRoad(p.x, p.z, p.width, p.depth, p.rotationY, 0.2);
    assert.equal(
      overlap,
      null,
      `Empty plot "${p.id}" at (${p.x}, ${p.z}) overlaps paved road "${overlap}"`,
    );
  }

  for (const board of AD_BOARDS) {
    const overlap = doesBoxOverlapAnyRoad(board.x, board.z, 2.6, 1.4, board.rotationY, 0.15);
    assert.equal(
      overlap,
      null,
      `Ad board "${board.id}" at (${board.x}, ${board.z}) overlaps paved road "${overlap}"`,
    );
  }

  for (const stop of BUS_STOPS) {
    const overlap = doesBoxOverlapAnyRoad(stop.x, stop.z, 3.6, 2.0, stop.rotationY, 0.1);
    assert.equal(
      overlap,
      null,
      `Bus stop "${stop.id}" at (${stop.x}, ${stop.z}) overlaps paved road "${overlap}"`,
    );
  }

  for (const stand of AUTO_STANDS) {
    const overlap = doesBoxOverlapAnyRoad(stand.x, stand.z, 3.2, 2.0, stand.rotationY, 0.1);
    assert.equal(
      overlap,
      null,
      `Auto stand "${stand.id}" at (${stand.x}, ${stand.z}) overlaps paved road "${overlap}"`,
    );
  }

  // Resort swimming pool bounds must also be 100% clear of all paved roads!
  const poolW = RESORT_POOL_BOUNDS.maxX - RESORT_POOL_BOUNDS.minX;
  const poolD = RESORT_POOL_BOUNDS.maxZ - RESORT_POOL_BOUNDS.minZ;
  const poolOverlap = doesBoxOverlapAnyRoad(
    RESORT_POOL_BOUNDS.centerX,
    RESORT_POOL_BOUNDS.centerZ,
    poolW,
    poolD,
    0,
    0.2,
  );
  assert.equal(poolOverlap, null, `RESORT_POOL_BOUNDS overlaps road "${poolOverlap}"`);

  for (let i = 0; i < TOWN_PALM_TREES.length; i++) {
    const [px, pz] = TOWN_PALM_TREES[i];
    assert.equal(
      isPointOnAnyRoad(px, pz, 0.85),
      false,
      `Coconut palm #${i} at (${px}, ${pz}) sits on a paved road!`,
    );
  }

  // 2. Manual off-runway landing triggers 'crash_blast', while Runway 09/27 / Apron / Auto-Land are safe
  assert.equal(isPointOnAirportTarmac(0, AIRPORT_RUNWAY.centerZ), true);
  assert.equal(isPointOnAirportTarmac(0, 0), false);
  assert.equal(evaluateAirplaneLanding(0, AIRPORT_RUNWAY.centerZ, 16, false), 'safe_runway');
  assert.equal(evaluateAirplaneLanding(0, 0, 16, true), 'safe_runway');
  assert.equal(evaluateAirplaneLanding(0, 0, 0.5, false), 'safe_runway');
  assert.equal(evaluateAirplaneLanding(0, 0, 14, false), 'crash_blast');
  assert.equal(evaluateAirplaneLanding(20, -4, 6.5, false), 'crash_blast');

  // 3. Mobile flight cursor: UP (negative Y) flies/climbs up, DOWN (positive Y) descends/lands
  const cursorUp = mapMobileFlightCursor(0, -0.8, true);
  assert.equal(cursorUp.climb, true, 'Pushing flight cursor UP must climb/fly');
  assert.equal(cursorUp.descend, false);
  assert.ok(cursorUp.throttle >= 0.65, 'Pushing flight cursor UP must apply strong forward throttle');

  const cursorDown = mapMobileFlightCursor(0, 0.8, true);
  assert.equal(cursorDown.climb, false);
  assert.equal(cursorDown.descend, true, 'Pulling flight cursor DOWN must descend/land');

  const cursorRight = mapMobileFlightCursor(0.9, -0.5, true);
  assert.equal(cursorRight.climb, true);
  assert.ok(cursorRight.turn > 0.5, 'Pushing flight cursor RIGHT must bank right (+turn)');

  // 4. Hospital treatment handles 'airplane_crash' cause cleanly
  const state = createInitialProgress();
  const crashTreated = resolveHospitalTreatment(state, 'airplane_crash');
  assert.ok(crashTreated.state.reputation >= state.reputation + 15);
  assert.match(crashTreated.enDoctorLine, /Runway 09\/27/i);
});

test('Airport & south roads are completely open, Golden Statue sits at Main Junction, townspeople span all districts, and traffic covers all 11 road routes', () => {
  // 1. Airport Terminal & Kovalam Lighthouse Cafe must sit strictly OFF Main Junction Avenue (x ∈ [-5.5, 5.5])
  const terminal = BUILDINGS.find((b) => b.id === 'airport_terminal')!;
  const lighthouse = BUILDINGS.find((b) => b.id === 'kovalam_lighthouse_cafe')!;
  assert.ok(
    Math.abs(terminal.x) - terminal.width / 2 > 6,
    `airport_terminal must be clear of Main Junction Avenue centerline, got x=${terminal.x} w=${terminal.width}`,
  );
  assert.ok(
    Math.abs(lighthouse.x) - lighthouse.width / 2 > 6,
    `kovalam_lighthouse_cafe must be clear of Main Junction Avenue centerline, got x=${lighthouse.x} w=${lighthouse.width}`,
  );

  // 2. Golden Statue pedestal collider exists at Main Junction (0, -4) and keeps ±3.2m traffic lanes clear
  const colliders = getWorldColliders();
  const statueCol = colliders.find((c) => c.id === 'junction_golden_statue');
  assert.ok(statueCol, 'Golden Statue collider must exist at Main Junction');
  assert.equal(resolveCircleWorldCollision(3.2, -4, 0.8, colliders).collided, false);
  assert.equal(resolveCircleWorldCollision(-3.2, -4, 0.8, colliders).collided, false);

  // 3. Walking townspeople cover the entire town (>= 40 routes across >= 10 districts), 100% clear of roads & buildings
  assert.ok(
    TOWN_CROWD_ROUTES.length >= 40,
    `Expected >= 40 walking townspeople routes, got ${TOWN_CROWD_ROUTES.length}`,
  );
  const crowdDistricts = new Set(TOWN_CROWD_ROUTES.map((r) => r.district));
  assert.ok(
    crowdDistricts.size >= 10,
    `Expected townspeople across >= 10 districts, got ${crowdDistricts.size}`,
  );
  for (const r of TOWN_CROWD_ROUTES) {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const sx = r.ax + (r.bx - r.ax) * t;
      const sz = r.az + (r.bz - r.az) * t;
      assert.equal(
        isPointOnAnyRoad(sx, sz, 0.45),
        false,
        `Town crowd route "${r.id}" sample (${sx}, ${sz}) steps onto a paved road!`,
      );
      const col = resolveCircleWorldCollision(sx, sz, 0.4, colliders);
      assert.equal(
        col.collided,
        false,
        `Town crowd route "${r.id}" sample (${sx}, ${sz}) collides with a building/obstacle!`,
      );
    }
  }

  // 4. Road traffic covers EVERY single road route in TOWN_ROADS (11/11) with >= 30 vehicles
  assert.ok(
    TOWN_TRAFFIC_ROUTES.length >= 30,
    `Expected >= 30 road traffic vehicles, got ${TOWN_TRAFFIC_ROUTES.length}`,
  );
  const coveredRoadIds = new Set(TOWN_TRAFFIC_ROUTES.map((r) => r.roadId));
  for (const road of TOWN_ROADS) {
    assert.ok(
      coveredRoadIds.has(road.id),
      `Road route "${road.id}" (${road.name}) has no live traffic vehicles assigned!`,
    );
  }
});

test('Dynamic weather cycling advances Sunny -> Rain -> Monsoon -> Mist -> Sunny, enforces heavy rain + darker Monsoon fog, and generates frequent Kerala street puddles', () => {
  const hexLuminance = (hex: number) => {
    const r = (hex >> 16) & 0xff;
    const g = (hex >> 8) & 0xff;
    const b = hex & 0xff;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  let w = createInitialWeatherState('sunny', 20);
  assert.equal(w.condition, 'sunny');
  assert.equal(w.transitionId, 0);

  // Advancing 10s (in two 5s steps) keeps Sunny and updates cycleProgress to 0.5
  let step = stepWeatherCycle(w, 5, true);
  assert.equal(step.changed, false);
  step = stepWeatherCycle(step.state, 5, true);
  assert.equal(step.changed, false);
  assert.equal(step.state.condition, 'sunny');
  assert.equal(buildWeatherHudState(step.state, 'day').cycleProgress, 0.5);

  // Crossing the 20s phase boundary triggers dynamic shift to Rain & bumps transitionId
  step = stepWeatherCycle(step.state, 5, true);
  assert.equal(step.changed, false);
  const toRain = stepWeatherCycle(step.state, 5, true);
  assert.equal(toRain.changed, true);
  assert.equal(toRain.state.condition, 'rain');
  assert.equal(toRain.state.previousCondition, 'sunny');
  assert.equal(toRain.state.transitionId, 1);

  // Manual cycle advances Rain -> Monsoon -> Mist -> Sunny
  const toMonsoon = cycleWeatherCondition(toRain.state);
  assert.equal(toMonsoon.condition, 'monsoon');
  assert.equal(toMonsoon.transitionId, 2);

  const toMist = cycleWeatherCondition(toMonsoon);
  assert.equal(toMist.condition, 'mist');
  assert.equal(toMist.transitionId, 3);

  const backSunny = cycleWeatherCondition(toMist);
  assert.equal(backSunny.condition, 'sunny');
  assert.equal(backSunny.transitionId, 4);

  // Monsoon features heavier rain, darker fog, stronger wind, wet glossy streets, and denser fog range
  const sunnyCfg = getWeatherVisualConfig('sunny', 'day');
  const rainCfg = getWeatherVisualConfig('rain', 'day');
  const monsoonCfg = getWeatherVisualConfig('monsoon', 'day');
  const mistCfg = getWeatherVisualConfig('mist', 'day');

  assert.equal(sunnyCfg.rainDensity, 0);
  assert.ok(rainCfg.rainDensity > 0 && rainCfg.rainDensity < monsoonCfg.rainDensity);
  assert.equal(monsoonCfg.rainDensity, 1);
  assert.ok(monsoonCfg.rainFallSpeed > rainCfg.rainFallSpeed);
  assert.ok(monsoonCfg.rainWindDrift > rainCfg.rainWindDrift);
  assert.ok(monsoonCfg.rainOpacity > rainCfg.rainOpacity);
  assert.ok(monsoonCfg.windKmh > rainCfg.windKmh);
  assert.ok(monsoonCfg.sunIntensityMult < rainCfg.sunIntensityMult && rainCfg.sunIntensityMult < sunnyCfg.sunIntensityMult);
  assert.ok(monsoonCfg.roadRoughness < rainCfg.roadRoughness && rainCfg.roadRoughness < sunnyCfg.roadRoughness);

  // Darker & denser fog in Monsoon than Rain, Mist, and Sunny
  assert.ok(hexLuminance(monsoonCfg.fogColorHex) < hexLuminance(rainCfg.fogColorHex));
  assert.ok(hexLuminance(monsoonCfg.fogColorHex) < hexLuminance(mistCfg.fogColorHex));
  assert.ok(monsoonCfg.fogFar < mistCfg.fogFar && mistCfg.fogFar < rainCfg.fogFar && rainCfg.fogFar < sunnyCfg.fogFar);

  const monsoonEffFog = getEffectiveFogRange(monsoonCfg, 220, false);
  const rainEffFog = getEffectiveFogRange(rainCfg, 220, false);
  const sunnyEffFog = getEffectiveFogRange(sunnyCfg, 220, false);
  assert.ok(monsoonEffFog.fogFar < rainEffFog.fogFar && rainEffFog.fogFar < sunnyEffFog.fogFar);

  const monsoonHud = buildWeatherHudState(toMonsoon, 'day');
  assert.equal(monsoonHud.condition, 'monsoon');
  assert.equal(monsoonHud.label, 'Kerala Monsoon');
  assert.equal(monsoonHud.shortLabel, 'Monsoon');
  assert.equal(monsoonHud.puddleFrequency, 1);

  const mistHud = buildWeatherHudState(toMist, 'day');
  assert.equal(mistHud.condition, 'mist');
  assert.equal(mistHud.label, 'Backwater Mist');
  assert.equal(mistHud.transitionId, 3);

  // Street Puddles: strictly on paved Kerala roads, clear of Golden Sheru Statue, much more frequent in Monsoon!
  const allPavedRoads = [...TOWN_ROADS, ...AUX_PAVED_ROADS];
  const puddles = generateStreetPuddleSpecs(allPavedRoads, [
    {
      x: SHERU_STATUE_ROUNDABOUT.x,
      z: SHERU_STATUE_ROUNDABOUT.z,
      radius: SHERU_STATUE_ROUNDABOUT.pedestalRadius + 1.4,
    },
  ]);
  assert.ok(puddles.length >= 60, `Expected frequent Kerala street puddles (>= 60), got ${puddles.length}`);

  const sunnyPuddles = getActivePuddleCount(puddles, 'sunny');
  const rainPuddles = getActivePuddleCount(puddles, 'rain');
  const monsoonPuddles = getActivePuddleCount(puddles, 'monsoon');
  const mistPuddles = getActivePuddleCount(puddles, 'mist');
  assert.equal(sunnyPuddles, 0);
  assert.ok(rainPuddles >= 20, `Expected Rain to show primary puddles, got ${rainPuddles}`);
  assert.ok(
    monsoonPuddles >= rainPuddles * 2,
    `Expected Monsoon (${monsoonPuddles}) to have >= 2x more frequent puddles than Rain (${rainPuddles})`,
  );
  assert.equal(monsoonPuddles, puddles.length);
  assert.ok(mistPuddles > 0 && mistPuddles <= rainPuddles);

  for (const p of puddles) {
    assert.ok(
      isPointOnDrivablePavement(p.x, p.z, 0.2),
      `Puddle ${p.id} at (${p.x}, ${p.z}) must lie on paved Kerala streets`,
    );
    const statueDist = Math.hypot(p.x - SHERU_STATUE_ROUNDABOUT.x, p.z - SHERU_STATUE_ROUNDABOUT.z);
    assert.ok(
      statueDist >= SHERU_STATUE_ROUNDABOUT.pedestalRadius + 1.4,
      `Puddle ${p.id} overlaps Sheru Statue pedestal`,
    );
  }

  // Splash hit-testing works on active Monsoon puddles and returns false in Sunny
  const sampleMonsoonOnly = puddles.find((p) => p.tier === 'monsoon')!;
  assert.ok(sampleMonsoonOnly, 'Expected monsoon-tier street puddles');
  assert.equal(isPointInActivePuddle(sampleMonsoonOnly.x, sampleMonsoonOnly.z, puddles, 'sunny'), false);
  assert.equal(isPointInActivePuddle(sampleMonsoonOnly.x, sampleMonsoonOnly.z, puddles, 'rain'), false);
  assert.equal(isPointInActivePuddle(sampleMonsoonOnly.x, sampleMonsoonOnly.z, puddles, 'monsoon'), true);
});

test('Kerala Pickpocket Chase spawns thief & girl victim, runs within town bounds, and resolves via Gun, Slap Hand, and Hand to Police', () => {
  // 1. Spawn pickpocket & girl victim ahead of Sheru
  let chase = startPurseChase(0, 10, 0, 2);
  assert.equal(chase.active, true);
  assert.equal(chase.phase, 'chasing');
  assert.equal(chase.thiefHp, 100);
  const initialDist = Math.hypot(chase.thiefX - 0, chase.thiefZ - 10);
  assert.ok(initialDist >= 10 && initialDist <= 18, `Expected thief 10..18m ahead, got ${initialDist}`);

  // 2. Step chase physics — thief runs away while staying cleanly inside town bounds
  const prevX = chase.thiefX;
  const prevZ = chase.thiefZ;
  for (let i = 0; i < 12; i++) {
    const stepped = stepPurseChase(chase, 0, 10, 0.2);
    assert.equal(stepped.expired, false);
    chase = stepped.state;
  }
  const movedDist = Math.hypot(chase.thiefX - prevX, chase.thiefZ - prevZ);
  assert.ok(movedDist > 4, `Expected thief to sprint away, moved only ${movedDist.toFixed(2)}m`);
  assert.ok(Math.hypot(chase.thiefX, chase.thiefZ) < 120, 'Thief must stay within town bounds');

  // 3. Gun action: out of range fails gracefully; within CHASE_GUN_RANGE deals 55 damage (2 shots = caught!)
  const farGun = applyPurseChaseAction(chase, 'gun', chase.thiefX + CHASE_GUN_RANGE + 10, chase.thiefZ);
  assert.equal(farGun.success, false);
  assert.equal(farGun.state.thiefHp, 100);

  const gunShot1 = applyPurseChaseAction(chase, 'gun', chase.thiefX - 10, chase.thiefZ);
  assert.equal(gunShot1.success, true);
  assert.equal(gunShot1.caughtNow, false);
  assert.equal(gunShot1.state.thiefHp, 45);
  assert.equal(gunShot1.state.phase, 'chasing');

  const gunShot2 = applyPurseChaseAction(gunShot1.state, 'gun', chase.thiefX - 10, chase.thiefZ);
  assert.equal(gunShot2.success, true);
  assert.equal(gunShot2.caughtNow, true);
  assert.equal(gunShot2.state.thiefHp, 0);
  assert.equal(gunShot2.state.phase, 'caught');

  // 4. Slap Hand action: requires close range <= CHASE_SLAP_RANGE and 1-hit knocks out thief
  const freshChase = startPurseChase(5, 5, 0, 3);
  const farSlap = applyPurseChaseAction(freshChase, 'slap', freshChase.thiefX + CHASE_SLAP_RANGE + 4, freshChase.thiefZ);
  assert.equal(farSlap.success, false);

  const closeSlap = applyPurseChaseAction(freshChase, 'slap', freshChase.thiefX - 3, freshChase.thiefZ);
  assert.equal(closeSlap.success, true);
  assert.equal(closeSlap.caughtNow, true);
  assert.equal(closeSlap.state.phase, 'caught');
  assert.equal(closeSlap.state.thiefHp, 0);

  const caughtHud = buildPurseChaseHudState(closeSlap.state, freshChase.thiefX - 3, freshChase.thiefZ);
  assert.ok(caughtHud);
  assert.equal(caughtHud.phase, 'caught');
  assert.equal(caughtHud.canHandToPolice, true);

  // 5. Hand to Police completes arrest, awards +150 Fame & +250,000 GHOP, and resets chase to idle
  const arrest = applyPurseChaseAction(closeSlap.state, 'police', freshChase.thiefX - 3, freshChase.thiefZ);
  assert.equal(arrest.success, true);
  assert.equal(arrest.completed, true);
  assert.equal(arrest.rewardFame, 150);
  assert.equal(arrest.rewardGhop, 250000);
  assert.equal(arrest.state.active, false);
  assert.equal(buildPurseChaseHudState(arrest.state, 0, 0), null);
});

test('Pocket-kidnapper tagged NPCs, panicked chase visual poses, and dropped stolen purse bounce physics work accurately', () => {
  // 1. Town world includes explicitly tagged 'pocket_kidnapper' NPCs
  const taggedNpcs = NPCS.filter((n) => n.tag === 'pocket_kidnapper');
  assert.ok(
    taggedNpcs.length >= 2,
    `Expected >= 2 NPCs tagged 'pocket_kidnapper', found ${taggedNpcs.length}`,
  );

  // 2. Panicked chase pose leans forward, shows panic alert & flails arms vs caught surrender pose
  const panicPose = computePanickedChasePose(0.5, 'chasing', true);
  assert.equal(panicPose.showPanicAlert, true);
  assert.ok(panicPose.torsoPitch > 0.25, 'Panicked fleeing pose must lean forward');
  assert.ok(panicPose.panicPulse > 0.8, 'Panic alert badge must pulse actively');

  const caughtPose = computePanickedChasePose(0.5, 'caught', false);
  assert.equal(caughtPose.showPanicAlert, false);
  assert.ok(caughtPose.leftArmX < -2.2 && caughtPose.rightArmX < -2.2, 'Caught pose raises both hands');

  // 3. Catching the thief triggers visualState 'caught_dropped' and spawns the flying dropped purse
  let chase = startPurseChase(0, 10, 0, 7);
  assert.equal(chase.npcTag, 'pocket_kidnapper');
  assert.equal(chase.visualState, 'panicked_chase');
  assert.equal(chase.droppedItem.dropped, false);

  const caught = applyPurseChaseAction(chase, 'slap', chase.thiefX - 2, chase.thiefZ);
  assert.equal(caught.caughtNow, true);
  assert.equal(caught.state.visualState, 'caught_dropped');
  assert.equal(caught.state.droppedItem.dropped, true);
  assert.equal(caught.state.droppedItem.grounded, false);
  assert.ok(caught.state.droppedItem.vy > 3, 'Dropped purse must launch upward out of hand');

  const caughtHud = buildPurseChaseHudState(caught.state, chase.thiefX - 2, chase.thiefZ);
  assert.ok(caughtHud);
  assert.equal(caughtHud.visualState, 'caught_dropped');
  assert.equal(caughtHud.itemDropped, true);

  // 4. Stepping dropped item physics simulates parabolic arc, ground bounce, and settled rest state
  let item = spawnDroppedPurse(0, 0, 0);
  let sawBounce = false;
  let peakY = item.y;
  for (let i = 0; i < 45; i++) {
    item = stepDroppedItemPhysics(item, 0.05);
    if (item.y > peakY) peakY = item.y;
    if (item.bounces >= 1) sawBounce = true;
  }
  assert.ok(peakY > 1.7, `Expected purse to arc upward past 1.7m, peak was ${peakY.toFixed(2)}m`);
  assert.equal(sawBounce, true, 'Expected dropped purse to visibly bounce on the road');
  assert.equal(item.grounded, true, 'Expected dropped purse to settle cleanly on the road');
  assert.ok(Math.hypot(item.x, item.z) > 0.6, 'Dropped purse should land beside the thief');
});

test('All-device performance budget & adaptive frame-time governor scale cleanly for mobile, desktop, and software WebGL', () => {
  // Low-end 4GB mobile phone auto-protects against lag
  const lowMobile = detectDevicePerformanceBudget({
    hardwareConcurrency: 4,
    deviceMemory: 4,
    viewportWidth: 390,
    devicePixelRatio: 3,
    isTouch: true,
    isSoftwareGl: false,
    requestedQuality: 'medium',
  });
  assert.equal(lowMobile.effectiveQuality, 'low');
  assert.equal(lowMobile.dprCap, 1);
  assert.equal(lowMobile.shadowsEnabled, false);
  assert.ok(lowMobile.trafficPerRoadCap >= 2);

  // High-end desktop gets crisp 1024px shadows & capped HiDPI DPR
  const highDesktop = detectDevicePerformanceBudget({
    hardwareConcurrency: 12,
    deviceMemory: 16,
    viewportWidth: 1440,
    devicePixelRatio: 2,
    isTouch: false,
    isSoftwareGl: false,
    requestedQuality: 'high',
  });
  assert.equal(highDesktop.effectiveQuality, 'high');
  assert.equal(highDesktop.shadowsEnabled, true);
  assert.equal(highDesktop.shadowMapSize, 1024);
  assert.equal(highDesktop.dprCap, 1.75);

  // Software WebGL stays deterministic and never mutates under adaptive governor
  const softBudget = detectDevicePerformanceBudget({ isSoftwareGl: true, requestedQuality: 'medium' });
  assert.equal(softBudget.dprCap, 1);
  assert.equal(softBudget.shadowsEnabled, false);

  let perf = createAdaptivePerfState(1.35, true);
  const softStep = stepAdaptivePerformance(perf, 0.1, true);
  assert.equal(softStep.changed, false);

  // Sustained slow hardware frames (~20 FPS = 50ms) automatically step down DPR to eliminate lag
  let droppedOnce = false;
  for (let i = 0; i < 60; i++) {
    const step = stepAdaptivePerformance(perf, 0.05, false);
    perf = step.state;
    if (step.changed) droppedOnce = true;
  }
  assert.equal(droppedOnce, true, 'Governor must step down DPR when FPS stays below 32');
  assert.ok(perf.currentDpr < perf.baseDpr);

  // Sustained smooth hardware frames (~60 FPS = 16ms) automatically restore resolution
  const dprAfterDrop = perf.currentDpr;
  for (let i = 0; i < 320; i++) {
    perf = stepAdaptivePerformance(perf, 0.016, false).state;
  }
  assert.ok(perf.currentDpr > dprAfterDrop, 'Governor must restore DPR once smooth FPS returns');
});

test('Minimap corner toggle defaults responsively, toggles cleanly, and persists player preference', () => {
  // Responsive defaults when no preference is stored
  assert.equal(getInitialMinimapVisibility(1440, null), true);
  assert.equal(getInitialMinimapVisibility(640, null), true);
  assert.equal(getInitialMinimapVisibility(390, null), false);

  // Explicit stored preferences override viewport defaults
  assert.equal(getInitialMinimapVisibility(1440, 'false'), false);
  assert.equal(getInitialMinimapVisibility(390, 'true'), true);
  assert.equal(getInitialMinimapVisibility(390, 'invalid'), false);

  // Toggle helper flips state cleanly
  assert.equal(toggleMinimapVisibility(true), false);
  assert.equal(toggleMinimapVisibility(false), true);

  // Safe storage round-trip
  const mem = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
  };
  assert.equal(readMinimapPreference(mockStorage, 1440), true);
  writeMinimapPreference(false, mockStorage);
  assert.equal(mem.get(MINIMAP_PREF_STORAGE_KEY), 'false');
  assert.equal(readMinimapPreference(mockStorage, 1440), false);
  writeMinimapPreference(true, mockStorage);
  assert.equal(readMinimapPreference(mockStorage, 390), true);
});

test('Real open-world physics: stunt ramps are road/building-clear, character momentum & water drag work, vehicle suspension/drift/jumps & elastic impulses work, and 3D rigid-body props bounce & chain-collide', () => {
  const colliders = getWorldColliders();

  // 1. Every stunt ramp is clear of paved roads, building colliders, and player spawn, with accurate slope elevation
  assert.equal(WORLD_RAMPS.length, 4);
  for (const r of WORLD_RAMPS) {
    assert.equal(
      doesBoxOverlapAnyRoad(r.x, r.z, r.width, r.length, r.yaw, 0.2),
      null,
      `Ramp "${r.id}" must not overlap any paved road`,
    );
    assert.equal(
      resolveCircleWorldCollision(r.x, r.z, Math.min(r.width, r.length) * 0.45, colliders).collided,
      false,
      `Ramp "${r.id}" must not overlap any building collider`,
    );
    const rFootprint = Math.hypot(r.width, r.length) * 0.5;
    for (const plot of EMPTY_PLOTS) {
      assert.ok(
        Math.hypot(plot.x - r.x, plot.z - r.z) >= rFootprint + Math.hypot(plot.width, plot.depth) * 0.48,
        `Ramp "${r.id}" must not overlap empty plot "${plot.id}"`,
      );
    }
    for (const [px, pz] of TOWN_PALM_TREES) {
      assert.ok(
        Math.hypot(px - r.x, pz - r.z) >= rFootprint + 1.5,
        `Ramp "${r.id}" must not overlap coconut palm at (${px}, ${pz})`,
      );
    }
    const mid = sampleWorldSurface(r.x, r.z);
    assert.equal(mid.surfaceType, 'ramp');
    assert.equal(mid.rampId, r.id);
    assert.ok(Math.abs(mid.groundY - r.height * 0.5) < 0.05);
    assert.ok(mid.normalY > 0.8 && mid.normalY < 1.0);
  }

  // Surface classification: asphalt vs grass vs water
  assert.equal(sampleWorldSurface(0, 10).surfaceType, 'asphalt');
  assert.equal(sampleWorldSurface(RESORT_POOL_BOUNDS.centerX, RESORT_POOL_BOUNDS.centerZ).surfaceType, 'water');
  assert.equal(sampleWorldSurface(20, 20).surfaceType, 'grass');

  // 2. Character momentum physics: smooth acceleration, ramp climb, and slower top speed in water
  let char = {
    x: 0,
    y: 0,
    z: 10,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: Math.PI,
    coyoteTimer: 0.1,
    jumpBufferTimer: 0,
  };
  const firstStep = stepCharacterPhysics(char, { moveX: 0, moveZ: -1, running: true }, colliders, 0.05);
  assert.ok(firstStep.horizontalSpeed > 2 && firstStep.horizontalSpeed < 13.4, 'Character accelerates with inertia rather than teleporting to top speed');
  let waterChar = { ...char, x: RESORT_POOL_BOUNDS.minX + 1.0, z: RESORT_POOL_BOUNDS.centerZ };
  for (let i = 0; i < 10; i++) {
    waterChar = stepCharacterPhysics(waterChar, { moveX: 1, moveZ: 0, running: true }, colliders, 0.05);
  }
  assert.equal(sampleWorldSurface(waterChar.x, waterChar.z).surfaceType, 'water');
  assert.ok(Math.hypot(waterChar.vx, waterChar.vz) < 9.5, 'Resort Pool water drag slows running speed');

  // 3. Vehicle chassis physics: acceleration squat, braking nose-dive, drift slip, and airborne ramp jump!
  const jRamp = WORLD_RAMPS[0]; // at (24, 6), yaw = PI/2 (ascends East +X)
  let car = {
    x: jRamp.x - jRamp.length * 0.5 - 8,
    y: 0,
    z: jRamp.z,
    vy: 0,
    yaw: jRamp.yaw,
    speed: 22,
    lateralSpeed: 0,
    steerAngle: 0,
    steerInput: 0,
    maxSpeed: 42,
    pitch: 0,
    roll: 0,
    pitchVel: 0,
    rollVel: 0,
    suspY: 0,
    suspVy: 0,
    grounded: true,
  };

  // Hard acceleration pitches nose up (squat); hard braking dives nose down
  let accelCar = { ...car, x: 0, z: 10, speed: 5 };
  for (let i = 0; i < 6; i++) {
    accelCar = stepVehicleChassisPhysics(accelCar, { forward: 1, strafe: 0, boost: true, handbrake: false }, 0.04);
  }
  assert.ok(accelCar.pitch > 0.01, `Expected acceleration squat pitch > 0, got ${accelCar.pitch}`);

  let brakeCar = { ...car, x: 0, z: 10, speed: 30 };
  for (let i = 0; i < 6; i++) {
    brakeCar = stepVehicleChassisPhysics(brakeCar, { forward: -1, strafe: 0, boost: false, handbrake: false }, 0.04);
  }
  assert.ok(brakeCar.pitch < -0.01, `Expected braking nose-dive pitch < 0, got ${brakeCar.pitch}`);

  // Fast cornering with handbrake triggers real lateral drift & body roll
  let driftCar = { ...car, x: 0, z: 10, speed: 26 };
  let sawDrift = false;
  for (let i = 0; i < 10; i++) {
    const res = stepVehicleChassisPhysics(driftCar, { forward: 1, strafe: 1, boost: false, handbrake: true }, 0.04);
    driftCar = res;
    if (res.drifting) sawDrift = true;
  }
  assert.equal(sawDrift, true, 'Handbrake turn at speed must trigger lateral drift slip');
  assert.ok(Math.abs(driftCar.roll) > 0.01, 'Cornering must induce chassis body roll');

  // Driving fast straight up Main Junction Stunt Ramp launches airborne and lands with spring compression!
  let launched = false;
  let peakY = 0;
  let landedHard = false;
  for (let i = 0; i < 80; i++) {
    const res = stepVehicleChassisPhysics(car, { forward: 1, strafe: 0, boost: true, handbrake: false }, 0.04);
    car = res;
    if (res.launchedOffRamp) launched = true;
    if (res.y > peakY) peakY = res.y;
    if (res.landedHard) landedHard = true;
  }
  assert.equal(launched, true, 'Vehicle speeding off stunt ramp lip must launch airborne');
  assert.ok(peakY > jRamp.height + 0.4, `Expected vehicle to arc above ramp peak ${jRamp.height}m, reached ${peakY.toFixed(2)}m`);
  assert.equal(landedHard, true, 'Landing from stunt jump must trigger spring suspension compression');

  // 4. Vehicle-to-vehicle elastic momentum collision
  const pair = resolveVehiclePairCollision(0, 0, 20, 0, 12, 2.2, 0, 0, 0, 12, 3.0, 0.4);
  assert.equal(pair.collided, true);
  assert.ok(pair.avx < 15 && pair.bvx > 5, 'Rear-ending a stationary vehicle transfers forward momentum cleanly');

  // 5. 32 interactive 3D rigid-body street props: clear of buildings, kick/bounce/chain-collide & settle to sleep
  const props = createOpenWorldProps();
  assert.equal(props.length, 32);
  for (const p of props) {
    assert.equal(
      resolveCircleWorldCollision(p.x, p.z, p.radius, colliders).collided,
      false,
      `Physics prop "${p.id}" spawned inside a building collider!`,
    );
  }

  // Kick the Main Junction football -> wakes up, launches with upward arc & spin, bounces, and rolls to sleep
  const ball = props[0];
  const startX = ball.x;
  const startZ = ball.z;
  const impacts = stepRigidBodyProps(
    props,
    [{ id: 'player', x: ball.x - 0.6, y: 0, z: ball.z, vx: 11, vz: 0, radius: 0.9, mass: 5.5, kickBoost: 2.5 }],
    colliders,
    0.05,
  );
  assert.ok(impacts.length >= 1, 'Running into football must register a physical impact event');
  assert.equal(ball.sleeping, false);
  assert.ok(ball.vx > 5 && ball.vy > 2, 'Kicked football must launch forward and upward');

  for (let i = 0; i < 160; i++) {
    stepRigidBodyProps(props, [], colliders, 0.05);
  }
  assert.ok(Math.hypot(ball.x - startX, ball.z - startZ) > 3.5, 'Kicked football must travel & roll realistically');
  assert.equal(ball.sleeping, true, 'Ball should settle cleanly to sleep once kinetic energy dissipates');

  // Prop-to-prop chain reaction (bowling crate 1 into adjacent crate 2)
  const crateA = props.find((p) => p.id === 'prop_crate_r1')!;
  const crateB = props.find((p) => p.id === 'prop_crate_r2')!;
  const crateBStartX = crateB.x;
  crateA.vx = 14;
  crateA.sleeping = false;
  for (let i = 0; i < 20; i++) {
    stepRigidBodyProps(props, [], colliders, 0.04);
  }
  assert.ok(crateB.x > crateBStartX + 0.3, 'Fast moving crate must transfer momentum into adjacent crate');
});

test('compact HUD menu toggle and single-line objective truncation keep playing screen uncluttered', () => {
  assert.equal(toggleHudMenu(false), true);
  assert.equal(toggleHudMenu(true), false);

  assert.equal(
    formatCompactObjective('Talk to Kuttan Nair at Kuttan Chaya Kada', 45),
    'Talk to Kuttan Nair at Kuttan Chaya Kada',
  );
  const clipped = formatCompactObjective(
    'Visit Kuttan Nair at Kuttan Chaya Kada near the main Kerala junction',
    38,
  );
  assert.ok(clipped.length <= 38, `Expected <= 38 chars, got ${clipped.length}`);
  assert.ok(clipped.endsWith('…'));
});

test('Dynamic detail scaling (LOD) tightens distances on low-end mobile, prevents boundary flicker via hysteresis, and adapts to FPS', () => {
  // 1. Mobile low profile vs. desktop high profile
  const mobileLow = computeLodDistances('low', 0.84, true);
  const desktopHigh = computeLodDistances('high', 1.0, false);
  assert.ok(mobileLow.buildingMidDist < desktopHigh.buildingMidDist);
  assert.ok(mobileLow.palmMidDist < desktopHigh.palmMidDist);
  assert.ok(mobileLow.propCullDist < desktopHigh.propCullDist);
  assert.ok(mobileLow.cameraFar < desktopHigh.cameraFar);
  assert.ok(mobileLow.shadowFrustumHalf < desktopHigh.shadowFrustumHalf);

  // 2. Fog-horizon safety invariant across every tier and scale step (zero sudden pop-out in clear air!)
  for (const quality of ['low', 'medium', 'high'] as const) {
    for (const scale of LOD_SCALE_STEPS) {
      const d = computeLodDistances(quality, scale, quality === 'low');
      assert.ok(
        d.buildingCullDist > d.fogFarCap,
        `${quality}@${scale}: buildingCullDist (${d.buildingCullDist}) must exceed fogFarCap (${d.fogFarCap})`,
      );
      assert.ok(
        d.palmCullDist > d.fogFarCap,
        `${quality}@${scale}: palmCullDist (${d.palmCullDist}) must exceed fogFarCap (${d.fogFarCap})`,
      );
      assert.ok(
        d.cameraFar > d.buildingCullDist,
        `${quality}@${scale}: cameraFar (${d.cameraFar}) must exceed buildingCullDist (${d.buildingCullDist})`,
      );
    }
  }

  // 3. Hysteresis prevents flickering near LOD thresholds
  let tier: 0 | 1 | 2 = 0;
  // Slightly past midDist (50 + 2 = 52) stays at LOD0 until crossing midDist + hysteresis (54.5)
  tier = classifyLodTierWithHysteresis(52 * 52, tier, 50, 120, 4.5);
  assert.equal(tier, 0);
  // Past 54.5 transitions to LOD1
  tier = classifyLodTierWithHysteresis(56 * 56, tier, 50, 120, 4.5);
  assert.equal(tier, 1);
  // Stepping slightly back to 48 stays at LOD1 (inside hysteresis band [45.5, 54.5])
  tier = classifyLodTierWithHysteresis(48 * 48, tier, 50, 120, 4.5);
  assert.equal(tier, 1);
  // Stepping clearly closer (44 < 45.5) upgrades back to LOD0
  tier = classifyLodTierWithHysteresis(44 * 44, tier, 50, 120, 4.5);
  assert.equal(tier, 0);
  // Moving past cullDist + hysteresis transitions directly to LOD2
  tier = classifyLodTierWithHysteresis(126 * 126, tier, 50, 120, 4.5);
  assert.equal(tier, 2);

  // Binary prop visibility hysteresis
  assert.equal(classifyVisibleWithHysteresis(62 * 62, true, 60, 4), true);
  assert.equal(classifyVisibleWithHysteresis(65 * 65, true, 60, 4), false);
  assert.equal(classifyVisibleWithHysteresis(58 * 58, false, 60, 4), false);
  assert.equal(classifyVisibleWithHysteresis(55 * 55, false, 60, 4), true);

  // 4. Live FPS-driven dynamic LOD scale drops during lag and recovers when smooth
  let perf = createAdaptivePerfState(1.15, true, 1.0);
  let lod = createDynamicLodState('medium', true, perf.lodScale);
  const initialPalmMid = lod.distances.palmMidDist;

  for (let i = 0; i < 60; i++) {
    perf = stepAdaptivePerformance(perf, 0.05, false).state;
  }
  assert.ok(perf.lodScale < 1.0, `Expected lodScale < 1.0 after lag, got ${perf.lodScale}`);
  lod = updateDynamicLodScale(lod, perf.lodScale);
  assert.ok(
    lod.distances.palmMidDist < initialPalmMid,
    'Tightened lodScale must reduce palm LOD transition distance',
  );

  const tightenedScale = perf.lodScale;
  for (let i = 0; i < 320; i++) {
    perf = stepAdaptivePerformance(perf, 0.016, false).state;
  }
  assert.ok(perf.lodScale > tightenedScale, 'Smooth FPS must restore dynamic lodScale');
});

test('Pocket kidnapper NPC panic state activates on purse chase, flees away from player, and drops purse with recoil & ground bounces on catch', () => {
  // 1. Tagged pocket_kidnapper NPC stays calm when no chase is active
  const calm = stepPocketKidnapperNpcPanic(10, -10, 0, 0, 0, false, 'idle', 1.0, 0.1, 0);
  assert.equal(calm.panicState, 'calm');
  assert.equal(calm.speed, 0);

  // 2. When purse chase starts, pocket_kidnapper NPC enters 'panicked' state & sprints AWAY from player
  let nx = 8;
  let nz = -6;
  let nyaw = 0;
  const startDist = Math.hypot(nx - 0, nz - 0);
  for (let i = 0; i < 15; i++) {
    const step = stepPocketKidnapperNpcPanic(nx, nz, nyaw, 0, 0, true, 'chasing', i * 0.1, 0.1, 0);
    assert.equal(step.panicState, 'panicked');
    assert.ok(step.speed > 5, `Expected panicked sprint speed > 5 m/s, got ${step.speed}`);
    nx = step.x;
    nz = step.z;
    nyaw = step.yaw;
  }
  const endDist = Math.hypot(nx - 0, nz - 0);
  assert.ok(
    endDist > startDist + 6,
    `Expected panicked pocket kidnapper to flee away from player (${startDist.toFixed(1)}m -> ${endDist.toFixed(1)}m)`,
  );

  // 3. When lead thief is caught, accomplices switch to 'cowering'
  const cower = stepPocketKidnapperNpcPanic(nx, nz, nyaw, 0, 0, true, 'caught', 2.0, 0.1, 0);
  assert.equal(cower.panicState, 'cowering');

  // 4. Physical tackle catch activates within CHASE_TACKLE_RANGE and triggers catch recoil + purse drop bounce
  const chase = startPurseChase(0, 10, 0, 9);
  assert.equal(shouldPhysicalTackleCatch(chase, chase.thiefX, chase.thiefZ + CHASE_TACKLE_RANGE + 2), false);
  assert.equal(shouldPhysicalTackleCatch(chase, chase.thiefX, chase.thiefZ + 1.2), true);

  const recoilPose = computePanickedChasePose(1.0, 'caught', false, 0.18);
  const surrenderPose = computePanickedChasePose(1.0, 'caught', false, 0.8);
  assert.ok(
    recoilPose.torsoPitch < surrenderPose.torsoPitch - 0.15,
    'Initial catch recoil must lean further back than settled surrender pose',
  );
  assert.ok(
    recoilPose.rightArmZ < surrenderPose.rightArmZ - 0.2,
    'Catch recoil must fling right arm outward as purse drops',
  );

  // 5. Dropped purse fires justBounced + impactSquash on ground impact and freezes landedYaw once grounded
  let item = spawnDroppedPurse(0, 0, 0.5);
  let sawJustBounced = false;
  let sawSquash = false;
  for (let i = 0; i < 60; i++) {
    item = stepDroppedItemPhysics(item, 0.04);
    if (item.justBounced) sawJustBounced = true;
    if (item.impactSquash > 0.5) sawSquash = true;
  }
  assert.equal(sawJustBounced, true, 'Dropped purse must emit justBounced on road contact');
  assert.equal(sawSquash, true, 'Dropped purse must trigger cartoon squash on bounce');
  assert.equal(item.grounded, true, 'Dropped purse must settle on the ground');
  const settledYaw = item.landedYaw;
  const afterRest = stepDroppedItemPhysics(item, 0.1);
  assert.equal(afterRest.landedYaw, settledYaw, 'Grounded purse must rest still instead of spinning');
});

test('Double-track Kerala Railway (4 named stations, 4 numbered/named trains, opposite PF1/PFB travel, walkable foot-overbridge, station passengers, strict station-stop exit, and Malabar Beach ground-vehicle rule)', () => {
  // 1. 4 distinct named stations & 4 distinct numbered/named trains (2 on Track A / PF 1, 2 on Track B / PF B)
  assert.equal(RAILWAY_STATIONS.length, 4);
  assert.equal(new Set(RAILWAY_STATIONS.map((s) => s.name)).size, 4);
  assert.equal(new Set(RAILWAY_STATIONS.map((s) => s.code)).size, 4);

  assert.equal(TRAIN_DEFS.length, 4);
  assert.equal(new Set(TRAIN_DEFS.map((t) => t.number)).size, 4);
  assert.equal(new Set(TRAIN_DEFS.map((t) => t.name)).size, 4);
  assert.equal(TRAIN_DEFS.filter((t) => t.track === 'A' && t.platform === '1').length, 2);
  assert.equal(TRAIN_DEFS.filter((t) => t.track === 'B' && t.platform === 'B').length, 2);

  // 2. Track A (PF 1, Left->Right) and Track B (PF B, Right->Left) run in strictly opposite directions at every station
  for (const st of RAILWAY_STATIONS) {
    const sampleA = sampleTrackPoint('A', st.stopDistA);
    const sampleB = sampleTrackPoint('B', st.stopDistB);
    const dot = sampleA.tx * sampleB.tx + sampleA.tz * sampleB.tz;
    assert.ok(dot < -0.99, `Track A & Track B at ${st.name} must run strictly opposite, dot=${dot}`);
  }

  // 3. Walkable Foot-Overbridge & raised platforms exist at every station
  for (const st of RAILWAY_STATIONS) {
    const pf1 = stationLocalToWorld(st, -6, -PLATFORM_CENTER_OFFSET);
    const pfB = stationLocalToWorld(st, -6, +PLATFORM_CENTER_OFFSET);
    const bridgeMid = stationLocalToWorld(st, 0, 0);
    assert.ok(sampleRailwayElevation(pf1.x, pf1.z) >= 0.5, `PF1 at ${st.name} must be raised`);
    assert.ok(sampleRailwayElevation(pfB.x, pfB.z) >= 0.5, `PFB at ${st.name} must be raised`);
    assert.ok(
      sampleRailwayElevation(bridgeMid.x, bridgeMid.z) >= BRIDGE_DECK_Y - 0.05,
      `Foot-overbridge at ${st.name} must span above both tracks at y=${BRIDGE_DECK_Y}`,
    );
  }

  // 4. Waiting -> Boarding -> Alighting passengers across all 4 stations & strict stop-at-station alighting rule
  let sim = createInitialRailwayState();
  assert.equal(sim.passengers.length, 40, 'Expected 40 live passengers across all 4 stations');

  const mlb = RAILWAY_STATIONS[0];
  const pf1Pos = stationLocalToWorld(mlb, -4, -PLATFORM_CENTER_OFFSET);
  sim = fastForwardNextTrainAtPlatform(sim, mlb.id, '1');

  // Step until the incoming train stops smoothly at Malabar Beach Halt Platform 1
  let sawStopped = false;
  let sawPassengerBoardingOrAlighting = false;
  for (let i = 0; i < 80; i++) {
    sim = stepRailwaySimulation(sim, 0.1, 0);
    if (sim.passengers.some((p) => p.phase === 'boarding' || p.phase === 'alighting' || p.phase === 'boarded')) {
      sawPassengerBoardingOrAlighting = true;
    }
    const ctx = findPlayerPlatformContext(sim, pf1Pos.x, pf1Pos.z);
    if (ctx?.stoppedTrain) {
      sawStopped = true;
      // Board as Passenger (Window Seat)
      const boardRes = boardStoppedTrain(sim, ctx.stoppedTrain.id, 'passenger');
      assert.equal(boardRes.success, true);
      assert.equal(boardRes.state.riderMode, 'passenger');
      sim = boardRes.state;
      break;
    }
  }
  assert.equal(sawStopped, true, 'Approaching train must come to a full stop at Malabar Beach Halt');
  assert.equal(
    sawPassengerBoardingOrAlighting,
    true,
    'Station passengers must visibly board/alight when a train stops',
  );

  // While stopped at station, alighting is allowed; once train departs & moves, alighting is strictly blocked!
  for (let i = 0; i < 120; i++) {
    sim = stepRailwaySimulation(sim, 0.1, 0);
    const activeTrain = sim.trains.find((t) => t.id === sim.ridingTrainId);
    if (activeTrain && activeTrain.phase === 'moving' && activeTrain.speed > 5) {
      const midRouteExit = alightFromTrain(sim);
      assert.equal(
        midRouteExit.success,
        false,
        'Passenger MUST NOT be allowed to get off while train is moving between stations',
      );
      break;
    }
  }

  // Fast-forward/advance until train stops at next station -> alighting succeeds cleanly!
  let exitedAtNextStation = false;
  for (let i = 0; i < 360; i++) {
    sim = stepRailwaySimulation(sim, 0.1, 0);
    const activeTrain = sim.trains.find((t) => t.id === sim.ridingTrainId);
    if (activeTrain && activeTrain.phase === 'stopped') {
      const stopExit = alightFromTrain(sim);
      assert.equal(stopExit.success, true, 'Passenger MUST be able to get off once train stops at a station');
      assert.equal(stopExit.state.riderMode, 'none');
      exitedAtNextStation = true;
      break;
    }
  }
  assert.equal(exitedAtNextStation, true, 'Train must stop at the next station so passenger can alight');

  // 5. Malabar Beach benches & ground-vehicle-only beach access rule (no aeroplanes on beach)
  assert.equal(BEACH_BENCHES.length, 6);
  for (const b of BEACH_BENCHES) {
    assert.equal(isPointOnBeachZone(b.x, b.z), true);
  }
  assert.equal(canVehicleAccessBeach('lambo_sport'), true);
  assert.equal(canVehicleAccessBeach('auto'), true);
  assert.equal(canVehicleAccessBeach('ksrtc_bus'), true);
  assert.equal(canVehicleAccessBeach('airplane_jet'), false);
  assert.equal(canVehicleAccessBeach('airplane_airliner'), false);
  assert.equal(canVehicleAccessBeach('airplane_prop'), false);
});

test('Real physics upgrades: airplane blasts on Western Ghats mountain & off-airport landing/taxi, trains emergency-stop for humans/cars/objects on tracks, ground vehicles stay strictly on paved roads, autopilot orbits Sheru statue, and traffic pulls over for sirens', () => {
  // 1. Real Aeroplane Crash Physics (Mountain BHOOOOM + Off-Airport Landing & Normal Taxi BHOOOOM)
  // Sample the center of the tall Northern Sahyadri Western Ghats summit (-20, -290)
  const peakElev = sampleMountainElevation(-20, -290);
  assert.ok(peakElev > 70, `Expected tall Western Ghats mountain peak > 70m, got ${peakElev}`);
  assert.equal(
    evaluateAirplaneHazard(-20, peakElev - 10, -290, 22, false, false, false),
    'mountain_blast',
    'Flying straight into Western Ghats mountain must trigger mountain_blast',
  );
  // High above the peak stays safe
  assert.equal(
    evaluateAirplaneHazard(-20, peakElev + 25, -290, 22, false, false, false),
    'safe',
    'Flying cleanly above Western Ghats peak must stay safe',
  );
  // Landing outside airport -> off_airport_blast
  assert.equal(
    evaluateAirplaneHazard(0, 0.2, 20, 14, false, true, false),
    'off_airport_blast',
    'Landing outside airport tarmac must blast',
  );
  // Normally driving/taxiing outside airport tarmac (even without ever flying!) -> off_airport_blast
  assert.equal(
    evaluateAirplaneHazard(0, 0.1, -60, 8, false, false, false),
    'off_airport_blast',
    'Normally taxiing/driving aeroplane outside airport tarmac must blast',
  );
  // On Airport Runway 09/27 tarmac -> safe
  assert.equal(
    evaluateAirplaneHazard(AIRPORT_RUNWAY.centerX, 0, AIRPORT_RUNWAY.centerZ, 18, false, true, false),
    'safe',
    'Landing/taxiing on Kerala Airport Runway 09/27 must stay safe',
  );

  // 2. Train Emergency Stop for ANY Human, Car, or Object on the Railway Track
  let sim = createInitialRailwayState();
  const train0 = sim.trains[0];
  const aheadPoint = sampleTrackPoint(train0.track, train0.distance + 14);

  // Place a human right on the rails 14m ahead -> train MUST brake to full stop with obstacleBlocked=true!
  let blockedSim = sim;
  for (let i = 0; i < 40; i++) {
    blockedSim = stepRailwaySimulation(blockedSim, 0.1, 0, [
      { x: aheadPoint.x, y: 0, z: aheadPoint.z, radius: 1.0, label: 'Sheru Bhai' },
    ]);
  }
  const stoppedTrain = blockedSim.trains[0];
  assert.equal(stoppedTrain.obstacleBlocked, true, 'Train must flag obstacleBlocked when human is on track');
  assert.equal(stoppedTrain.blockedByLabel, 'Sheru Bhai');
  assert.equal(stoppedTrain.speed, 0, 'Train must come to a full 0 m/s emergency stop before hitting obstacle');

  // Person safely up on the 4.9m Foot-Overbridge MUST NOT stop the train!
  const bridgeSim = stepRailwaySimulation(sim, 0.2, 0, [
    { x: aheadPoint.x, y: BRIDGE_DECK_Y, z: aheadPoint.z, radius: 1.0, label: 'Bridge Walker' },
  ]);
  assert.equal(
    bridgeSim.trains[0].obstacleBlocked,
    false,
    'Person walking high on the 4.9m Foot-Overbridge must NOT stop the train',
  );

  // 3. Road-Only Ground Vehicle Containment ("no vehicles off paved roads!")
  assert.equal(isPointOnDrivablePavement(0, 14, 0), true, 'Main Junction Avenue must be drivable');
  assert.equal(isPointOnDrivablePavement(-46, 150, 0), true, 'Malabar Beach West Access Road must be drivable');
  assert.equal(isPointOnDrivablePavement(20, 165.5, 0), true, 'Malabar Beachfront Parking Blvd must be drivable');
  assert.equal(isPointOnDrivablePavement(35, 180, 0), false, 'Malabar Beach sand must NOT be drivable');
  assert.equal(isPointOnDrivablePavement(-42, -55, 0), false, 'Open grass lawn must NOT be drivable');

  const offRoadTry = constrainVehicleToDrivableRoads(0, 165.5, 0, 178);
  assert.equal(offRoadTry.hitCurb, true, 'Trying to drive off Beach Parking onto beach sand must hit curb');
  assert.ok(offRoadTry.z < 173, 'Vehicle must remain on paved parking boulevard, not beach sand');

  const snapped = snapPointToNearestRoad(30, 182);
  assert.equal(isPointOnDrivablePavement(snapped.x, snapped.z, 0.5), true);

  // 4. Auto-Drive Sheru Statue Roundabout Avoidance (NEVER hits Golden Statue at (0, -4))
  let ax = 0;
  let az = 16;
  let ayaw = Math.PI; // Facing North (-Z) straight toward Sheru's Statue!
  let minStatueDist = Infinity;
  for (let i = 0; i < 120; i++) {
    const ap = computeRoadAutopilotTarget(ax, az, 0, -45);
    const desired = Math.atan2(ap.targetX - ax, ap.targetZ - az);
    const err = Math.atan2(Math.sin(desired - ayaw), Math.cos(desired - ayaw));
    ayaw += Math.max(-0.22, Math.min(0.22, err));
    ax += Math.sin(ayaw) * 0.6;
    az += Math.cos(ayaw) * 0.6;
    const dStatue = Math.hypot(ax - SHERU_STATUE_ROUNDABOUT.x, az - SHERU_STATUE_ROUNDABOUT.z);
    if (dStatue < minStatueDist) minStatueDist = dStatue;
  }
  assert.ok(
    minStatueDist > SHERU_STATUE_ROUNDABOUT.pedestalRadius + 1.0,
    `Autopilot must orbit cleanly around Golden Sheru Statue, closest dist was ${minStatueDist.toFixed(2)}m`,
  );

  // 5. Siren Vehicles Emergency Pull-Over Yield ("siren vehicles varumbol all vehicles side kodukkanam")
  const yieldClose = computeSirenYieldBehavior(3.2, 20, 0, [{ x: 3.2, z: 4, yaw: 0 }]);
  assert.equal(yieldClose.yielding, true, 'Traffic within 44m of siren must yield');
  assert.equal(yieldClose.hazardFlash, true, 'Yielding traffic must trigger hazard flash');
  assert.equal(yieldClose.speedScale, 0, 'Traffic within 24m of siren must pull over and stop');
  assert.ok(
    Math.hypot(yieldClose.pullOverX, yieldClose.pullOverZ) > 1.5,
    'Yielding traffic must pull laterally aside toward the road shoulder',
  );

  const yieldFar = computeSirenYieldBehavior(3.2, 100, 0, [{ x: 3.2, z: 4, yaw: 0 }]);
  assert.equal(yieldFar.yielding, false, 'Distant traffic (>44m) must continue normally');
});

test('Common solid-body physics blocks walking through aeroplanes (fuselage & wings), vehicles, trains, NPCs, and Airport structures while keeping [E] prompts & exits clean', () => {
  const colliders = getWorldColliders();

  // 1. Malabar Sky Prop Plane at (20, 0, -127, yaw=Math.PI/2): fuselage + wide yellow-red wing
  const propObbs = getVehicleSolidOBBs('airplane_prop', 20, 0, -127, Math.PI / 2);
  assert.equal(propObbs.length, 2, 'Prop plane must have both fuselage and main wing solid OBBs');

  // Walk straight North (-Z) from South side of fuselage (z = -124 -> trying to reach z = -130) for 120 frames
  let px = 18.0; // Behind wing, directly beside fuselage
  let pz = -124.5;
  let pvx = 0;
  let pvz = 0;
  for (let i = 0; i < 120; i++) {
    const prevX = px;
    const prevZ = pz;
    const step = stepCharacterPhysics(
      { x: px, y: 0, z: pz, vx: pvx, vy: 0, vz: pvz, yaw: Math.PI, coyoteTimer: 0.12, jumpBufferTimer: 0 },
      { moveX: 0, moveZ: -1, running: true },
      colliders,
      1 / 60,
    );
    const res = resolveCharacterSolidBodies(
      step.x,
      step.y,
      step.z,
      step.vx,
      step.vz,
      0.58,
      propObbs,
      [],
      prevX,
      prevZ,
    );
    px = res.x;
    pz = res.z;
    pvx = res.vx;
    pvz = res.vz;
  }
  assert.ok(
    pz > -127 + 0.72 + 0.55,
    `Character must NEVER cross through Prop Plane fuselage from South to North! Got z=${pz.toFixed(2)}`,
  );
  assert.ok(
    distanceToVehicleHull(px, pz, 'airplane_prop', 20, -127, Math.PI / 2) <= 3.2,
    'Standing blocked right outside Prop Plane fuselage must still trigger [E] Fly prompt',
  );

  // Also test walking East (+X) straight into the Prop Plane's wide wing at z = -124 (wing extends to z = -122.85)
  let wx = 17.0;
  let wz = -124.2;
  let wvx = 0;
  let wvz = 0;
  for (let i = 0; i < 120; i++) {
    const prevX = wx;
    const prevZ = wz;
    const step = stepCharacterPhysics(
      { x: wx, y: 0, z: wz, vx: wvx, vy: 0, vz: wvz, yaw: Math.PI / 2, coyoteTimer: 0.12, jumpBufferTimer: 0 },
      { moveX: 1, moveZ: 0, running: true },
      colliders,
      1 / 60,
    );
    const res = resolveCharacterSolidBodies(
      step.x,
      step.y,
      step.z,
      step.vx,
      step.vz,
      0.58,
      propObbs,
      [],
      prevX,
      prevZ,
    );
    wx = res.x;
    wz = res.z;
    wvx = res.vx;
    wvz = res.vz;
  }
  assert.ok(
    wx < 20.3 - 0.85 - 0.52,
    `Character must NEVER cross through Prop Plane wing from West to East! Got x=${wx.toFixed(2)}`,
  );

  // 2. Airborne aeroplane (y = 8) must NOT block walking underneath on the ground!
  const airborneObbs = getVehicleSolidOBBs('airplane_airliner', -16, 8, -127, Math.PI / 2);
  const underPlane = resolveCharacterSolidBodies(-16, 0, -127, 0, -4, 0.58, airborneObbs, []);
  assert.equal(underPlane.collided, false, 'Airborne plane overhead must NOT block walking on ground');

  // 3. Parked KSRTC Bus, Kerala Train coach, and NPC circle all block character crossing
  const busObbs = getVehicleSolidOBBs('ksrtc_bus', 10, 0, 10, 0);
  const busHit = resolveCharacterSolidBodies(10.5, 0, 10, -5, 0, 0.58, busObbs, [], 12.2, 10);
  assert.equal(busHit.collided, true);
  assert.ok(busHit.x >= 10 + 1.16 + 0.57, `Must stay outside bus right face, got x=${busHit.x.toFixed(2)}`);

  const trainObb = [{ cx: 0, cz: 0, halfW: 1.48, halfL: 5.15, yaw: Math.PI / 2, minY: 0, maxY: 3.6 }];
  const trainHit = resolveCharacterSolidBodies(0, 0, 0.2, 0, -6, 0.58, trainObb, [], 0, 2.5);
  assert.equal(trainHit.collided, true);
  assert.ok(trainHit.z >= 1.48 + 0.57, `Must stay on South side of Kerala Train coach, got z=${trainHit.z.toFixed(2)}`);

  const npcHit = resolveCharacterSolidBodies(0.1, 0, 0, -3, 0, 0.58, [], [{ cx: 0, cz: 0, radius: 0.44, minY: 0, maxY: 1.9 }], 1.4, 0);
  assert.equal(npcHit.collided, true);
  assert.ok(npcHit.x >= 1.0, `Must stay outside solid NPC body, got x=${npcHit.x.toFixed(2)}`);

  // 4. Airport static structure colliders block ATC Tower, GHOP Hangar walls, and Arch pillars (leaving road & north hangar bay clear!)
  assert.equal(resolveCircleWorldCollision(-52, -113, 0.6, colliders).collided, true, 'ATC Tower must be solid');
  assert.equal(resolveCircleWorldCollision(34, -106.5, 0.6, colliders).collided, true, 'Hangar back wall must be solid');
  assert.equal(resolveCircleWorldCollision(34, -116, 0.6, colliders).collided, false, 'Hangar open bay interior must remain walkable');
  assert.equal(resolveCircleWorldCollision(0, -104, 0.8, colliders).collided, false, 'Airport central road under gantry arch must stay open');
  assert.equal(resolveCircleWorldCollision(-7.6, -104, 0.6, colliders).collided, true, 'Airport gantry left pillar must be solid');

  // 5. Safe vehicle/aircraft exit point never overlaps its own hull or static buildings
  const airlinerExit = findSafeVehicleExitPoint('airplane_airliner', -16, 0, -127, Math.PI / 2, true, colliders, 0.72);
  const airlinerObbs = getVehicleSolidOBBs('airplane_airliner', -16, 0, -127, Math.PI / 2);
  for (const obb of airlinerObbs) {
    assert.ok(
      distanceToOBB(airlinerExit.x, airlinerExit.z, obb) >= 0.7,
      'Aircraft exit point must spawn completely outside fuselage & wings',
    );
  }
  assert.equal(
    resolveCircleWorldCollision(airlinerExit.x, airlinerExit.z, 0.72, colliders).collided,
    false,
    'Aircraft exit point must stay clear of buildings',
  );
});

test('Photo Mode [V] guards active gameplay, toggles HUD/camera freeze cleanly, supports clean-frame toggle, and formats PNG snapshot filenames', () => {
  // 1. Only allowed during active gameplay when no modal is open
  assert.equal(canTogglePhotoMode('title', false), false);
  assert.equal(canTogglePhotoMode('paused', false), false);
  assert.equal(canTogglePhotoMode('playing', true), false);
  assert.equal(canTogglePhotoMode('playing', false), true);

  // 2. Toggle enters Photo Mode with controls visible, supports hiding controls [H], and records snapshots
  let pm = createInitialPhotoModeState();
  assert.equal(pm.active, false);
  assert.equal(pm.snapshotCount, 0);

  pm = togglePhotoModeState(pm);
  assert.equal(pm.active, true);
  assert.equal(pm.controlsVisible, true);

  pm = togglePhotoModeControls(pm);
  assert.equal(pm.controlsVisible, false);

  const file = formatSnapshotFilename('Malabar Golden Beach', new Date(2026, 10, 25, 19, 15, 4));
  assert.equal(file, 'kerala-sheru-malabar-golden-beach-20261125-191504.png');

  pm = recordSnapshotTaken(pm, file);
  assert.equal(pm.snapshotCount, 1);
  assert.equal(pm.lastSnapshotName, file);

  // 3. Exiting restores normal HUD while preserving snapshot count, and re-entering resets controlsVisible=true
  pm = exitPhotoModeState(pm);
  assert.equal(pm.active, false);
  assert.equal(pm.snapshotCount, 1);

  pm = togglePhotoModeState(pm);
  assert.equal(pm.active, true);
  assert.equal(pm.controlsVisible, true);
});

test('Top-right road banner detects town roads, auxiliary paved roads, intersection centerline priority, airport runway/apron, and returns null indoors/airborne/off-road', () => {
  // 1. Main town roads
  assert.equal(detectCurrentRoadName(0, 10), 'Main Junction Avenue');
  assert.equal(detectCurrentRoadName(28, -4), 'Central Bazaar Road');
  assert.equal(detectCurrentRoadName(24, 104), 'Marine Drive Coastal Road');
  assert.equal(detectCurrentRoadName(-76, 12), 'West Cinema Ring Road');

  // 2. Intersection centerline priority: closer to z=-4 centerline picks Central Bazaar Road over Main Junction Avenue
  assert.equal(detectCurrentRoadName(3.5, -4.1), 'Central Bazaar Road');
  assert.equal(detectCurrentRoadName(0.2, -1.0), 'Main Junction Avenue');

  // 3. Auxiliary paved connector roads
  assert.equal(detectCurrentRoadName(0, 165.5), 'Malabar Beachfront Parking Blvd');
  assert.equal(detectCurrentRoadName(-46, 135), 'Malabar Beach West Access Road');
  assert.equal(detectCurrentRoadName(-136, -22), 'Kochi Central Station Road');

  // 4. Airport Runway & Apron
  assert.equal(
    detectCurrentRoadName(0, -146, { onRunway: true, onAirportTarmac: true }),
    'Airport Runway 09/27',
  );
  assert.equal(
    detectCurrentRoadName(-2, -129, { onRunway: false, onAirportTarmac: true }),
    'Airport Taxiway & Apron',
  );

  // 5. Returns null indoors, airborne, or far off-road on beach sand
  assert.equal(detectCurrentRoadName(0, 10, { inHospital: true }), null);
  assert.equal(detectCurrentRoadName(0, 10, { airborne: true }), null);
  assert.equal(detectCurrentRoadName(0, 184), null);
});

test('Inch-by-inch scene integrity & common-sense physics: zero road/building overlaps across all world entities, no foot-overbridge sky-teleport, deep sea surf clamp, and safe goat path', () => {
  const colliders = getWorldColliders();

  // 1. ZERO buildings or plots overlap ANY paved road (TOWN_ROADS + AUX_PAVED_ROADS)
  for (const b of BUILDINGS) {
    assert.equal(
      doesBoxOverlapAnyRoad(b.x, b.z, b.width, b.depth, b.rotationY, 0.15),
      null,
      `Building "${b.id}" must not overlap any town or station spur road`,
    );
  }
  for (const p of EMPTY_PLOTS) {
    assert.equal(
      doesBoxOverlapAnyRoad(p.x, p.z, p.width, p.depth, p.rotationY, 0.15),
      null,
      `Empty plot "${p.id}" must not overlap any paved road`,
    );
  }

  // 2. ZERO named NPCs stand on paved roads or clip inside buildings
  for (const npc of NPCS) {
    assert.equal(
      isPointOnAnyRoad(npc.x, npc.z, 0.25),
      false,
      `NPC "${npc.id}" (${npc.name}) at (${npc.x}, ${npc.z}) must stand off paved roads`,
    );
    assert.equal(
      resolveCircleWorldCollision(npc.x, npc.z, 0.4, colliders).collided,
      false,
      `NPC "${npc.id}" (${npc.name}) at (${npc.x}, ${npc.z}) must not clip inside a building collider`,
    );
  }

  // 3. Every ground vehicle spawns cleanly on paved road (never grass/buildings), and every aircraft spawns on airport tarmac
  for (const v of VEHICLES) {
    assert.equal(
      resolveCircleWorldCollision(v.x, v.z, 0.9, colliders).collided,
      false,
      `Vehicle "${v.id}" at (${v.x}, ${v.z}) must not overlap a building collider`,
    );
    if (v.isAircraft) {
      assert.equal(
        isPointOnAirportTarmac(v.x, v.z),
        true,
        `Aircraft "${v.id}" must spawn on Kerala International Airport tarmac`,
      );
    } else {
      assert.equal(
        isPointOnAnyRoad(v.x, v.z, 0.2),
        true,
        `Ground vehicle "${v.id}" at (${v.x}, ${v.z}) must spawn on a paved road`,
      );
    }
  }

  // 4. ZERO street fixtures (Auto Stands, Bus Stops, Parking Bays, Ad Boards, Collectibles) clip into buildings or sit inside paved roads
  for (const stand of AUTO_STANDS) {
    assert.equal(doesBoxOverlapAnyRoad(stand.x, stand.z, 3.0, 1.8, stand.rotationY, 0.1), null);
    assert.equal(
      resolveCircleWorldCollision(stand.x, stand.z, 0.9, colliders).collided,
      false,
      `Auto stand "${stand.id}" must not clip into any building`,
    );
  }
  for (const bay of PARKING_BAYS) {
    if (bay.id === 'park_airport_apron') continue;
    assert.equal(
      isPointOnAnyRoad(bay.x, bay.z, 0.1),
      false,
      `Parking bay "${bay.id}" at (${bay.x}, ${bay.z}) must sit beside, not inside, a paved traffic lane`,
    );
    assert.equal(
      resolveCircleWorldCollision(bay.x, bay.z, 0.9, colliders).collided,
      false,
      `Parking bay "${bay.id}" must not clip inside a building collider`,
    );
  }
  for (const col of WORLD_COLLECTIBLES) {
    assert.equal(
      isPointOnAnyRoad(col.x, col.z, 0.2),
      false,
      `Collectible "${col.id}" at (${col.x}, ${col.z}) must not sit inside traffic lanes`,
    );
    assert.equal(
      resolveCircleWorldCollision(col.x, col.z, 0.45, colliders).collided,
      false,
      `Collectible "${col.id}" must not clip inside a building collider`,
    );
  }

  // 5. Foot-Overbridge Common-Sense Elevation: walking underneath at y=0 NEVER teleports up 4.9m,
  // while climbing the staircase smoothly ascends to BRIDGE_DECK_Y (4.9m)!
  const st0 = RAILWAY_STATIONS[0];
  const underBridge = stationLocalToWorld(st0, 0, 0);
  assert.ok(
    sampleWorldSurface(underBridge.x, underBridge.z, 0).groundY < 0.2,
    'Walking underneath Foot-Overbridge at y=0 must stay at ground level (no sky-teleport!)',
  );
  assert.ok(
    sampleWorldSurface(underBridge.x, underBridge.z, BRIDGE_DECK_Y).groundY >= BRIDGE_DECK_Y - 0.05,
    'Walking across the Foot-Overbridge at deck height must remain solidly supported at 4.9m',
  );

  // Simulate stepping up the staircase from bottom (along=11.5) to top landing (along=2.0) on Platform B (outward=+7.0)
  let stairY = 0.55;
  for (let along = 11.5; along >= 1.8; along -= 0.7) {
    const pt = stationLocalToWorld(st0, along, 7.0);
    stairY = sampleRailwayElevation(pt.x, pt.z, stairY);
  }
  assert.ok(
    stairY >= BRIDGE_DECK_Y - 0.25,
    `Climbing Foot-Overbridge stairs must smoothly reach deck height (${BRIDGE_DECK_Y}m), reached ${stairY.toFixed(2)}m`,
  );

  // 6. Deep Arabian Sea surf limit stops walking out into open deep ocean water
  let swimmer = {
    x: 0,
    y: 0,
    z: BEACH_ZONE.shorelineZ - 1,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    coyoteTimer: 0.1,
    jumpBufferTimer: 0,
  };
  for (let i = 0; i < 120; i++) {
    const res = stepCharacterPhysics(
      swimmer,
      { moveX: 0, moveZ: 1, running: true },
      colliders,
      1 / 60,
    );
    swimmer = res;
  }
  assert.ok(
    swimmer.z >= BEACH_ZONE.shorelineZ && swimmer.z <= BEACH_ZONE.shorelineZ + 2.45,
    `Wading south into Arabian Sea must stop cleanly at waist-deep surf, got z=${swimmer.z.toFixed(2)}`,
  );

  // 7. Roaming village goat orbit stays 100% clear of all roads and building colliders
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (deg * Math.PI) / 180;
    const gx = -25 + Math.cos(rad) * 3.4;
    const gz = 22.5 + Math.sin(rad) * 3.4;
    assert.equal(isPointOnAnyRoad(gx, gz, 0.4), false, `Roaming goat at (${gx.toFixed(1)}, ${gz.toFixed(1)}) touched road`);
    assert.equal(
      resolveCircleWorldCollision(gx, gz, 0.55, colliders).collided,
      false,
      `Roaming goat at (${gx.toFixed(1)}, ${gz.toFixed(1)}) clipped building`,
    );
  }
});

test('Kerala ambient audio weights temple bells, tea stall chatter, monsoon rain, coastal waves, crickets, and airport hum by district, time of day, and weather', () => {
  const weightOf = (pool: ReturnType<typeof getAmbientSoundPool>, id: string) =>
    pool.find((e) => e.id === id)?.weight ?? 0;

  // 1. District classification maps every Kerala town zone cleanly
  assert.equal(classifyDistrictAmbientZone('Main Junction'), 'bazaar');
  assert.equal(classifyDistrictAmbientZone('Sweet Street'), 'bazaar');
  assert.equal(classifyDistrictAmbientZone('Palm Colony'), 'grove');
  assert.equal(classifyDistrictAmbientZone('Malabar Golden Beach'), 'coastal');
  assert.equal(classifyDistrictAmbientZone('Marine Drive Beach'), 'coastal');
  assert.equal(classifyDistrictAmbientZone('Kerala International Airport'), 'airport');
  assert.equal(classifyDistrictAmbientZone('Hospital Square'), 'civic');

  // 2. Daytime Main Junction features tea stall chatter, temple bells & bazaar horn (no night crickets / airport jet)
  const bazaarDay = getAmbientSoundPool({
    district: 'Main Junction',
    timePhase: 'day',
    weather: 'sunny',
  });
  assert.ok(weightOf(bazaarDay, 'tea_stall_chatter') > 2.5);
  assert.ok(weightOf(bazaarDay, 'temple_bells') > 1.0);
  assert.ok(weightOf(bazaarDay, 'bazaar_distant_horn') > 1.0);
  assert.equal(weightOf(bazaarDay, 'night_crickets'), 0);
  assert.equal(weightOf(bazaarDay, 'airport_jet_hum'), 0);

  // 3. Sunset (Kerala Sandhya) peaks temple bells in both Palm Colony and Main Junction
  const groveSunset = getAmbientSoundPool({
    district: 'Palm Colony',
    timePhase: 'sunset',
    weather: 'sunny',
  });
  const groveDay = getAmbientSoundPool({
    district: 'Palm Colony',
    timePhase: 'day',
    weather: 'sunny',
  });
  assert.ok(
    weightOf(groveSunset, 'temple_bells') > weightOf(groveDay, 'temple_bells'),
    'Sunset should peak distant temple bells compared to midday',
  );

  // 4. Nighttime shifts Palm Colony to night crickets and drops daytime tropical birds
  const groveNight = getAmbientSoundPool({
    district: 'Palm Colony',
    timePhase: 'night',
    weather: 'sunny',
  });
  assert.ok(weightOf(groveNight, 'night_crickets') >= 3.5);
  assert.equal(weightOf(groveNight, 'tropical_birds'), 0);

  // 5. Monsoon heavily prioritizes monsoon_rain, dampens chatter/birds, and triggers more frequently than sunny
  const bazaarMonsoon = getAmbientSoundPool({
    district: 'Main Junction',
    timePhase: 'day',
    weather: 'monsoon',
  });
  assert.ok(
    weightOf(bazaarMonsoon, 'monsoon_rain') > weightOf(bazaarMonsoon, 'tea_stall_chatter'),
    'Monsoon weather should prioritize monsoon rain ambience over tea stall chatter',
  );
  assert.ok(
    weightOf(bazaarMonsoon, 'tea_stall_chatter') < weightOf(bazaarDay, 'tea_stall_chatter'),
    'Monsoon weather should dampen outdoor tea stall chatter',
  );
  assert.ok(
    computeNextAmbientIntervalSec({ district: 'Main Junction', timePhase: 'day', weather: 'monsoon' }, () => 0.5) <
      computeNextAmbientIntervalSec({ district: 'Main Junction', timePhase: 'day', weather: 'sunny' }, () => 0.5),
  );

  // 6. Coastal beach zones prioritize coastal_waves; Airport prioritizes airport_jet_hum
  const beachSunset = getAmbientSoundPool({
    district: 'Malabar Golden Beach',
    timePhase: 'sunset',
    weather: 'sunny',
  });
  assert.ok(weightOf(beachSunset, 'coastal_waves') >= 3.0);

  const airportDay = getAmbientSoundPool({
    district: 'Kerala International Airport',
    timePhase: 'day',
    weather: 'sunny',
  });
  assert.ok(weightOf(airportDay, 'airport_jet_hum') >= 3.0);

  // 7. Indoors (Hospital) and airborne flight suppress outdoor ambient cues completely
  assert.deepEqual(
    getAmbientSoundPool({ district: 'Hospital Square', timePhase: 'day', weather: 'monsoon', indoors: true }),
    [],
  );
  assert.deepEqual(
    getAmbientSoundPool({ district: 'Kerala International Airport', timePhase: 'day', weather: 'sunny', airborne: true }),
    [],
  );

  // 8. Anti-repeat damping lowers immediate repeat frequency across deterministic sweep
  const ctxDay = { district: 'Main Junction', timePhase: 'day' as const, weather: 'sunny' as const };
  let repeatsWithLast = 0;
  let picksWithoutLast = 0;
  for (let i = 0; i < 100; i++) {
    const r = i / 100;
    if (pickWeightedAmbientSound(ctxDay, 'tea_stall_chatter', () => r) === 'tea_stall_chatter') {
      repeatsWithLast++;
    }
    if (pickWeightedAmbientSound(ctxDay, null, () => r) === 'tea_stall_chatter') {
      picksWithoutLast++;
    }
  }
  assert.ok(
    repeatsWithLast < picksWithoutLast,
    `Anti-repeat damping must reduce repeat picks (${repeatsWithLast} vs ${picksWithoutLast})`,
  );

  // 9. Scheduler pauses when inactive/indoors, triggers cleanly once cooldown elapses, and updates state
  const sched = createInitialAmbientSchedulerState(2.0);
  const paused = stepAmbientScheduler(sched, 5.0, ctxDay, false, () => 0.5);
  assert.equal(paused.triggeredSound, null);
  assert.equal(paused.state.cooldownSec, 2.0);

  const indoorStep = stepAmbientScheduler(
    sched,
    5.0,
    { ...ctxDay, indoors: true },
    true,
    () => 0.5,
  );
  assert.equal(indoorStep.triggeredSound, null);

  const half = stepAmbientScheduler(sched, 1.2, ctxDay, true, () => 0.5);
  assert.equal(half.triggeredSound, null);
  assert.ok(Math.abs(half.state.cooldownSec - 0.8) < 0.001);

  const fired = stepAmbientScheduler(half.state, 1.0, ctxDay, true, () => 0.2);
  assert.ok(fired.triggeredSound !== null, 'Expected ambient sound trigger when cooldown reaches 0');
  assert.equal(fired.state.lastSoundId, fired.triggeredSound);
  assert.equal(fired.state.triggerCount, 1);
  assert.ok(fired.state.cooldownSec >= 6.8 && fired.state.cooldownSec <= 13.5);
});








