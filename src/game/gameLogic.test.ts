import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDialogueChoice,
  buildNpcDialogue,
  buyVehicle,
  checkPalmTreeCollision,
  computePalmShakeState,
  createInitialProgress,
  getRoadEgoMessage,
  getWorldColliders,
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
  AUTO_STANDS,
  BUILDINGS,
  BUS_STOPS,
  NPCS,
  PARKING_BAYS,
  PLAYER_SPAWN,
  WORLD_RADIUS,
} from '../data/worldData';

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

test('28 compact original vehicles catalog has unique IDs, max speed <= 180 km/h, and sirens on emergency vehicles', () => {
  assert.equal(VEHICLE_CATALOG.length, 28);
  const ids = new Set(VEHICLE_CATALOG.map((v) => v.id));
  assert.equal(ids.size, 28);

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

