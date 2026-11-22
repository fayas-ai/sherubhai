import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AIRPORT_RUNWAY,
  isAircraftType,
  isPointOnRunway,
  stepAirplanePhysics,
  stepGroundVehiclePhysics,
} from './vehiclePhysics';
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
  NPCS,
  PARKING_BAYS,
  PLAYER_SPAWN,
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






