import * as THREE from 'three';
import {
  BuildingDef,
  EmptyPlotDef,
  NpcDef,
  OwnedBusinessRecord,
  PlayableRole,
  SheruOutfit,
  VehicleDef,
  WorldCollectible,
} from '../types/game';
import { AdBoardDef, AutoStandDef, BusStopDef, ParkingBayDef } from '../data/worldData';
import {
  createAdBoard300x250Texture,
  createApronTexture,
  createContactShadowTexture,
  createRoofTileTexture,
  createRunwayTexture,
  createSignboardTexture,
  createWallBanner320x50Texture,
} from './textures';
import { AIRPORT_RUNWAY } from './vehiclePhysics';

let sharedShadowTex: THREE.CanvasTexture | null = null;
function getShadowTexture(): THREE.CanvasTexture {
  if (!sharedShadowTex) sharedShadowTex = createContactShadowTexture();
  return sharedShadowTex;
}

export function createContactShadow(radius: number): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 20);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: getShadowTexture(),
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.025;
  return mesh;
}

export interface SheruModelRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  tail: THREE.Group;
  crownMesh: THREE.Group;
  suitMat: THREE.MeshStandardMaterial;
  shirtMat: THREE.MeshStandardMaterial;
  tieMat: THREE.MeshStandardMaterial;
  maneGroup: THREE.Group;
  roleCapMesh: THREE.Group;
  medicalBadgeMesh: THREE.Group;
}

export function createSheruBhaiModel(): SheruModelRig {
  const root = new THREE.Group();
  root.add(createContactShadow(0.95));

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const furMat = new THREE.MeshStandardMaterial({
    color: 0xd9963b,
    roughness: 0.72,
    metalness: 0.05,
  });
  const muzzleMat = new THREE.MeshStandardMaterial({
    color: 0xf4cfa0,
    roughness: 0.78,
    metalness: 0.02,
  });
  const maneMat = new THREE.MeshStandardMaterial({
    color: 0x7c3f14,
    roughness: 0.85,
    metalness: 0.04,
  });
  const suitMat = new THREE.MeshStandardMaterial({
    color: 0x16181e,
    roughness: 0.42,
    metalness: 0.14,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: 0xfaf7f0,
    roughness: 0.55,
    metalness: 0.05,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf6c445,
    roughness: 0.18,
    metalness: 0.92,
  });
  const shadesMat = new THREE.MeshStandardMaterial({
    color: 0x0a0d12,
    roughness: 0.08,
    metalness: 0.7,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.2,
    metalness: 0.35,
  });

  // Legs (articulated at hip y = 0.86)
  const makeLeg = (xOff: number) => {
    const leg = new THREE.Group();
    leg.position.set(xOff, 0.86, 0);
    const trouser = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.72, 10), suitMat);
    trouser.position.y = -0.36;
    trouser.castShadow = true;
    leg.add(trouser);

    // Polished luxury shoe
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.42), shoeMat);
    shoe.position.set(0, -0.78, 0.08);
    shoe.castShadow = true;
    leg.add(shoe);

    // Gold shoe buckle
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.06), goldMat);
    buckle.position.set(0, -0.7, 0.18);
    leg.add(buckle);

    bodyGroup.add(leg);
    return leg;
  };
  const leftLeg = makeLeg(-0.22);
  const rightLeg = makeLeg(0.22);

  // Tail
  const tail = new THREE.Group();
  tail.position.set(0, 0.92, -0.26);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -0.15, -0.28),
    new THREE.Vector3(0.08, 0.05, -0.52),
  ]);
  const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 10, 0.045, 7, false), furMat);
  tail.add(tailMesh);
  const tailTuft = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), maneMat);
  tailTuft.position.set(0.08, 0.06, -0.54);
  tail.add(tailTuft);
  bodyGroup.add(tail);

  // Broad billionaire torso in tailored black suit
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.36, 0.92, 12), suitMat);
  torso.position.y = 1.32;
  torso.scale.set(1.06, 1, 0.72);
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Crisp white shirt V-front & red/gold silk tie
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.56, 0.12), shirtMat);
  shirt.position.set(0, 1.46, 0.28);
  bodyGroup.add(shirt);

  const tieMat = new THREE.MeshStandardMaterial({ color: 0xb81d24, roughness: 0.35, metalness: 0.2 });
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.44, 0.05), tieMat);
  tie.position.set(0, 1.4, 0.34);
  bodyGroup.add(tie);

  // Suit Lapels
  for (const side of [-1, 1]) {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.06), suitMat);
    lapel.position.set(side * 0.16, 1.46, 0.32);
    lapel.rotation.z = side * -0.2;
    bodyGroup.add(lapel);
  }

  // Gold pocket square
  const pocketSq = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.03), goldMat);
  pocketSq.position.set(0.24, 1.52, 0.33);
  bodyGroup.add(pocketSq);

  // Multiple signature shiny gold chains!
  for (let i = 0; i < 3; i++) {
    const chain = new THREE.Mesh(
      new THREE.TorusGeometry(0.2 + i * 0.045, 0.024, 8, 20),
      goldMat,
    );
    chain.position.set(0, 1.66 - i * 0.06, 0.19 + i * 0.025);
    chain.rotation.x = Math.PI * 0.42;
    bodyGroup.add(chain);
  }
  // Medallion pendant
  const medallion = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.025, 14), goldMat);
  medallion.rotation.x = Math.PI / 2;
  medallion.position.set(0, 1.38, 0.38);
  bodyGroup.add(medallion);

  // Arms (articulated at shoulder y = 1.68)
  const makeArm = (side: -1 | 1) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.54, 1.68, 0);
    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.165, 10, 10), suitMat);
    shoulderCap.position.y = 0.02;
    shoulderCap.castShadow = true;
    arm.add(shoulderCap);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.12, 0.68, 10), suitMat);
    sleeve.position.y = -0.32;
    sleeve.castShadow = true;
    arm.add(sleeve);

    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.06, 10), shirtMat);
    cuff.position.y = -0.66;
    arm.add(cuff);

    // Expensive gold wristwatch on left arm
    if (side === -1) {
      const watchBand = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.06, 12), goldMat);
      watchBand.position.y = -0.68;
      arm.add(watchBand);
      const watchFace = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), goldMat);
      watchFace.position.set(-0.08, -0.68, 0.08);
      arm.add(watchFace);
    }

    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), furMat);
    paw.position.y = -0.76;
    arm.add(paw);

    bodyGroup.add(arm);
    return arm;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Head & Glorious Sculpted Lion Mane
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.08, 0.04);
  bodyGroup.add(headGroup);

  // Multi-lobe dramatic mane ring (grouped so role switcher can toggle cap/style cleanly!)
  const maneGroup = new THREE.Group();
  headGroup.add(maneGroup);
  const maneCore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 1), maneMat);
  maneCore.scale.set(1.08, 1.12, 0.88);
  maneCore.position.set(0, 0.04, -0.06);
  maneCore.castShadow = true;
  maneGroup.add(maneCore);

  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.3, 6), maneMat);
    tuft.position.set(Math.cos(angle) * 0.44, Math.sin(angle) * 0.44 + 0.04, -0.02);
    tuft.rotation.z = angle - Math.PI / 2;
    maneGroup.add(tuft);
  }

  // Driver / Role uniform cap (visible for Auto Driver, Bus Driver, Ambulance Driver)
  const roleCapMesh = new THREE.Group();
  roleCapMesh.position.set(0, 0.36, 0.08);
  const capTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.32, 0.14, 10),
    new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 }),
  );
  const capBrim = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.04, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }),
  );
  capBrim.position.set(0, -0.05, 0.22);
  roleCapMesh.add(capTop, capBrim);
  roleCapMesh.visible = false;
  headGroup.add(roleCapMesh);

  // Medical red cross chest badge for Ambulance Driver role
  const medicalBadgeMesh = new THREE.Group();
  medicalBadgeMesh.position.set(-0.22, 1.5, 0.36);
  const crossMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
  medicalBadgeMesh.add(
    new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.03), crossMat),
    new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.03), crossMat),
  );
  medicalBadgeMesh.visible = false;
  bodyGroup.add(medicalBadgeMesh);

  // Golden lion skull
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 14), furMat);
  skull.position.set(0, 0.04, 0.08);
  skull.castShadow = true;
  headGroup.add(skull);

  // Rounded lion ears peeking out of mane
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), furMat);
    ear.position.set(side * 0.28, 0.34, 0.02);
    headGroup.add(ear);
  }

  // Expressive snout + nose + confident smirk
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.26), muzzleMat);
  snout.position.set(0, -0.04, 0.34);
  headGroup.add(snout);

  const noseMat = new THREE.MeshStandardMaterial({ color: 0x3b1f14, roughness: 0.35 });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.1, 4), noseMat);
  nose.rotation.x = Math.PI / 2;
  nose.rotation.z = Math.PI / 4;
  nose.position.set(0, 0.03, 0.48);
  headGroup.add(nose);

  // Confident golden-tooth grin strip
  const grin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), shirtMat);
  grin.position.set(0, -0.11, 0.46);
  headGroup.add(grin);

  // Stylish black billionaire sunglasses with gold bridge & temples
  const lensGeo = new THREE.BoxGeometry(0.16, 0.1, 0.04);
  const leftLens = new THREE.Mesh(lensGeo, shadesMat);
  leftLens.position.set(-0.12, 0.12, 0.41);
  headGroup.add(leftLens);
  const rightLens = new THREE.Mesh(lensGeo, shadesMat);
  rightLens.position.set(0.12, 0.12, 0.41);
  headGroup.add(rightLens);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.03), goldMat);
  bridge.position.set(0, 0.14, 0.415);
  headGroup.add(bridge);

  // Level 100 Legendary Crown (hidden until unlocked)
  const crownMesh = new THREE.Group();
  crownMesh.position.set(0, 0.48, 0.05);
  const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.16, 8), goldMat);
  crownMesh.add(crownBase);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 5), goldMat);
    spike.position.set(Math.cos(a) * 0.2, 0.14, Math.sin(a) * 0.2);
    crownMesh.add(spike);
  }
  crownMesh.visible = false;
  headGroup.add(crownMesh);

  return {
    root,
    bodyGroup,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    tail,
    crownMesh,
    suitMat,
    shirtMat,
    tieMat,
    maneGroup,
    roleCapMesh,
    medicalBadgeMesh,
  };
}

export function applyPlayerAppearance(
  rig: SheruModelRig,
  outfit: SheruOutfit,
  role: PlayableRole,
  legendaryUnlocked: boolean,
) {
  rig.crownMesh.visible = legendaryUnlocked && role === 'sheru';
  rig.roleCapMesh.visible =
    role === 'auto_driver' || role === 'bus_driver' || role === 'ambulance_driver';
  rig.medicalBadgeMesh.visible = role === 'ambulance_driver';
  rig.maneGroup.visible = true;

  if (role === 'auto_driver') {
    // Classic Kerala Khaki Auto Driver uniform
    rig.suitMat.color.setHex(0xbfa065);
    rig.suitMat.metalness = 0.06;
    rig.shirtMat.color.setHex(0xe2d2a8);
    rig.tieMat.color.setHex(0x1f2937);
  } else if (role === 'bus_driver') {
    // Kerala Private / KSRTC Bus Driver Blue uniform
    rig.suitMat.color.setHex(0x1d4ed8);
    rig.suitMat.metalness = 0.08;
    rig.shirtMat.color.setHex(0xe0f2fe);
    rig.tieMat.color.setHex(0xfacc15);
  } else if (role === 'shop_owner') {
    // Kerala Kada Muthalali crisp cream-gold attire
    rig.suitMat.color.setHex(0xf4e3b2);
    rig.suitMat.metalness = 0.1;
    rig.shirtMat.color.setHex(0xffffff);
    rig.tieMat.color.setHex(0xd4a12a);
  } else if (role === 'ambulance_driver') {
    // 108 Emergency Medical Uniform
    rig.suitMat.color.setHex(0xf8fafc);
    rig.suitMat.metalness = 0.08;
    rig.shirtMat.color.setHex(0xfee2e2);
    rig.tieMat.color.setHex(0xdc2626);
  } else {
    // Sheru Bhai signature Wardrobe: Black, Royal White, or Legendary Gold Suit!
    if (outfit === 'white') {
      rig.suitMat.color.setHex(0xf7f5ee);
      rig.suitMat.metalness = 0.12;
      rig.shirtMat.color.setHex(0x14161c);
      rig.tieMat.color.setHex(0xd4a12a);
    } else if (outfit === 'gold') {
      rig.suitMat.color.setHex(0xc69214);
      rig.suitMat.metalness = 0.65;
      rig.shirtMat.color.setHex(0x111318);
      rig.tieMat.color.setHex(0xb81d24);
    } else {
      rig.suitMat.color.setHex(0x16181e);
      rig.suitMat.metalness = 0.14;
      rig.shirtMat.color.setHex(0xfaf7f0);
      rig.tieMat.color.setHex(0xb81d24);
    }
  }
  rig.suitMat.needsUpdate = true;
  rig.shirtMat.needsUpdate = true;
  rig.tieMat.needsUpdate = true;
}

export interface NpcModelRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  bossHalo?: THREE.Mesh;
}

export function createNpcModel(def: NpcDef): NpcModelRig {
  const root = new THREE.Group();
  const s = def.scale ?? 1.0;
  root.add(createContactShadow(0.68 * s));

  const bodyGroup = new THREE.Group();
  bodyGroup.scale.setScalar(s);
  root.add(bodyGroup);

  const skinMat = new THREE.MeshStandardMaterial({ color: def.skinColor, roughness: 0.72 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: def.shirtColor, roughness: 0.65 });
  const munduMat = new THREE.MeshStandardMaterial({ color: def.munduColor, roughness: 0.75 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1d1a18, roughness: 0.85 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf6c445,
    roughness: 0.2,
    metalness: 0.9,
  });

  const makeLeg = (xOff: number) => {
    const leg = new THREE.Group();
    leg.position.set(xOff, 0.76, 0);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.74, 8), munduMat);
    mesh.position.y = -0.37;
    mesh.castShadow = true;
    leg.add(mesh);
    bodyGroup.add(leg);
    return leg;
  };
  const leftLeg = makeLeg(-0.14);
  const rightLeg = makeLeg(0.14);

  // Kerala kasavu gold border strip at waist
  const kasavu = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.08, 10), goldMat);
  kasavu.position.y = 0.78;
  bodyGroup.add(kasavu);

  // Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.76, 10), shirtMat);
  torso.position.y = 1.18;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Apron if shopkeeper/chef/barber
  if (def.accessory === 'apron') {
    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.62, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
    );
    apron.position.set(0, 1.02, 0.24);
    bodyGroup.add(apron);
  }

  const makeArm = (side: -1 | 1) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.37, 1.48, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.56, 8), shirtMat);
    sleeve.position.y = -0.26;
    arm.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), skinMat);
    hand.position.y = -0.56;
    arm.add(hand);
    bodyGroup.add(arm);
    return arm;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), skinMat);
  head.position.set(0, 1.8, 0);
  head.castShadow = true;
  bodyGroup.add(head);

  // Hair cap
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat,
  );
  hair.position.set(0, 1.83, -0.02);
  bodyGroup.add(hair);

  // Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 6), eyeMat);
    eye.position.set(side * 0.085, 1.83, 0.22);
    bodyGroup.add(eye);
  }

  // Distinct accessories
  if (def.accessory === 'mustache' || def.isBoss) {
    const stache = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.06), hairMat);
    stache.position.set(0, 1.73, 0.23);
    bodyGroup.add(stache);
  }
  if (def.accessory === 'sunglasses') {
    const shades = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.08, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x0d1117, roughness: 0.1, metalness: 0.7 }),
    );
    shades.position.set(0, 1.84, 0.24);
    bodyGroup.add(shades);
  }
  if (def.accessory === 'cap') {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.25, 0.12, 10),
      new THREE.MeshStandardMaterial({ color: 0x1d3557, roughness: 0.5 }),
    );
    cap.position.set(0, 2.02, 0);
    bodyGroup.add(cap);
    const brim = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.03, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 }),
    );
    brim.position.set(0, 1.98, 0.16);
    bodyGroup.add(brim);
  }
  if (def.accessory === 'turban') {
    const turban = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.1, 8, 14),
      new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.7 }),
    );
    turban.rotation.x = Math.PI / 2;
    turban.position.set(0, 2.0, 0);
    bodyGroup.add(turban);
  }
  if (def.accessory === 'crown') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.18, 6), goldMat);
    crown.position.set(0, 2.08, 0);
    bodyGroup.add(crown);
  }
  if (def.accessory === 'stethoscope') {
    const steth = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.025, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35 }),
    );
    steth.rotation.x = Math.PI * 0.45;
    steth.position.set(0, 1.5, 0.18);
    bodyGroup.add(steth);
  }
  if (def.accessory === 'nurse_cap') {
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.14, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
    );
    cap.position.set(0, 2.06, 0.04);
    bodyGroup.add(cap);
  }
  if (def.accessory === 'hardhat' || def.accessory === 'helmet') {
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({
        color: def.accessory === 'helmet' ? 0xdc2626 : 0xfacc15,
        roughness: 0.35,
      }),
    );
    helmet.position.set(0, 1.9, 0);
    bodyGroup.add(helmet);
  }
  if (def.accessory === 'backpack') {
    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.48, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.7 }),
    );
    bag.position.set(0, 1.24, -0.32);
    bodyGroup.add(bag);
  }

  // Boss golden rotating ring marker above head
  let bossHalo: THREE.Mesh | undefined;
  if (def.isBoss) {
    bossHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.045, 8, 18),
      new THREE.MeshStandardMaterial({
        color: 0xffc300,
        emissive: 0xd48800,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.85,
      }),
    );
    bossHalo.rotation.x = Math.PI / 2;
    bossHalo.position.y = 2.65;
    bodyGroup.add(bossHalo);
  }

  return { root, bodyGroup, leftArm, rightArm, leftLeg, rightLeg, bossHalo };
}

export interface HospitalInteriorRig {
  slidingDoorLeft: THREE.Group;
  slidingDoorRight: THREE.Group;
  ecgScreenMat: THREE.MeshStandardMaterial;
  interiorLight: THREE.PointLight;
  doorOpenAmount: number;
}

export interface BuildingMeshHandle {
  group: THREE.Group;
  signMesh: THREE.Mesh;
  windowMats: THREE.MeshStandardMaterial[];
  def: BuildingDef;
  hospitalInterior?: HospitalInteriorRig;
}

function createHospitalFloorTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 384;
  const ctx = c.getContext('2d')!;

  // Soft clinical mint-white ceramic tiles
  ctx.fillStyle = '#eef8f6';
  ctx.fillRect(0, 0, c.width, c.height);

  const tile = 32;
  for (let y = 0; y < c.height; y += tile) {
    for (let x = 0; x < c.width; x += tile) {
      const alt = ((x / tile) + (y / tile)) % 2 === 0;
      ctx.fillStyle = alt ? '#f5fbfa' : '#e4f2ef';
      ctx.fillRect(x, y, tile, tile);
      ctx.strokeStyle = '#cde2de';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
    }
  }

  // Central green-and-red 108 Emergency walkway runner leading from doorway (+Z = bottom) inward
  const aisleW = 112;
  const aisleX = (c.width - aisleW) / 2;
  ctx.fillStyle = '#d1fae5';
  ctx.fillRect(aisleX, 54, aisleW, c.height - 54);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(aisleX, 54, 7, c.height - 54);
  ctx.fillRect(aisleX + aisleW - 7, 54, 7, c.height - 54);

  // Clean medical cross emblem painted on center lobby floor
  const cx = c.width / 2;
  const cy = c.height * 0.58;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(cx - 7, cy - 20, 14, 40);
  ctx.fillRect(cx - 20, cy - 7, 40, 14);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAnisotropy);
  return tex;
}

function createEcgTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#071b14';
  ctx.fillRect(0, 0, c.width, c.height);

  // Subtle grid
  ctx.strokeStyle = '#0f3d2e';
  ctx.lineWidth = 1;
  for (let x = 0; x < c.width; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, c.height);
    ctx.stroke();
  }
  for (let y = 0; y < c.height; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(c.width, y);
    ctx.stroke();
  }

  // Heartbeat ECG waveform
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 96);
  ctx.lineTo(48, 96);
  ctx.lineTo(62, 82);
  ctx.lineTo(74, 108);
  ctx.lineTo(90, 32);
  ctx.lineTo(106, 128);
  ctx.lineTo(120, 96);
  ctx.lineTo(175, 96);
  ctx.lineTo(190, 78);
  ctx.lineTo(206, 36);
  ctx.lineTo(222, 120);
  ctx.lineTo(234, 96);
  ctx.lineTo(256, 96);
  ctx.stroke();

  ctx.fillStyle = '#86efac';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('HR 78  SPO2 99%', 14, 28);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHospitalWallBannerTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, c.width, 16);
  ctx.fillRect(0, c.height - 12, c.width, 12);

  // Red Cross badge on left
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(30, 34, 16, 54);
  ctx.fillRect(11, 53, 54, 16);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('KERALA GENERAL HOSPITAL', 84, 58);
  ctx.fillStyle = '#0369a1';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('108 EMERGENCY & SHERU VIP WARD', 84, 94);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAnisotropy);
  return tex;
}

function buildWalkInHospitalBuilding(
  def: BuildingDef,
  owned: OwnedBusinessRecord | undefined,
  plasterBump: THREE.Texture,
  maxAnisotropy: number,
): BuildingMeshHandle {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rotationY;

  const w = def.width; // 16
  const d = def.depth; // 12
  const halfW = w / 2; // 8
  const halfD = d / 2; // 6
  const groundH = 5.4;
  const wallT = 0.42;
  const doorHalfW = 2.4;
  const doorH = 3.55;

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf4f8fa,
    roughness: 0.78,
    metalness: 0.03,
    bumpMap: plasterBump,
    bumpScale: 0.04,
  });
  const interiorWallMat = new THREE.MeshStandardMaterial({
    color: 0xe3f3ee,
    roughness: 0.82,
    metalness: 0.02,
  });
  const wainscotMat = new THREE.MeshStandardMaterial({ color: 0xbfe7de, roughness: 0.75 });
  const blueStripeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.42 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.38 });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xdbe3ec,
    roughness: 0.25,
    metalness: 0.78,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x99e9f2,
    transparent: true,
    opacity: 0.34,
    roughness: 0.12,
    metalness: 0.25,
  });
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xf4f8fb, roughness: 0.85 });

  // 1. Flush clinical tiled interior floor (y = 0.02 so characters & contact shadows never sink!)
  const floorTex = createHospitalFloorTexture(maxAnisotropy);
  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.3, d - 0.3),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55 }),
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0.02;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // Outside emergency porch concrete apron
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(11.2, 4.4),
    new THREE.MeshStandardMaterial({ color: 0xd6dce2, roughness: 0.88 }),
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, 0.015, halfD + 2.1);
  apron.receiveShadow = true;
  group.add(apron);

  // 2. Hollow Ground-Floor Perimeter Walls
  // Back North Wall
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, groundH, wallT), wallMat);
  backWall.position.set(0, groundH / 2, -halfD + wallT / 2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  group.add(backWall);

  // Interior soft mint wall liner + wainscot + blue trim along Back Wall
  const backInner = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.82, groundH - 0.1, 0.04),
    interiorWallMat,
  );
  backInner.position.set(0, groundH / 2, -halfD + wallT + 0.01);
  group.add(backInner);
  const backWainscot = new THREE.Mesh(new THREE.BoxGeometry(w - 0.8, 1.32, 0.06), wainscotMat);
  backWainscot.position.set(0, 0.66, -halfD + wallT + 0.04);
  group.add(backWainscot);
  const backStripe = new THREE.Mesh(new THREE.BoxGeometry(w - 0.8, 0.14, 0.07), blueStripeMat);
  backStripe.position.set(0, 1.38, -halfD + wallT + 0.04);
  group.add(backStripe);

  // West & East Side Walls with large clear viewing windows
  for (const side of [-1, 1]) {
    const sx = side * (halfW - wallT / 2);
    // Lower knee wall under window
    const lowerSide = new THREE.Mesh(new THREE.BoxGeometry(wallT, 1.35, d), wallMat);
    lowerSide.position.set(sx, 0.675, 0);
    lowerSide.castShadow = true;
    lowerSide.receiveShadow = true;
    group.add(lowerSide);
    // Upper lintel wall over window
    const upperSide = new THREE.Mesh(new THREE.BoxGeometry(wallT, 1.75, d), wallMat);
    upperSide.position.set(sx, 3.65 + 0.875, 0);
    upperSide.castShadow = true;
    group.add(upperSide);
    // Front & Back solid corner piers
    for (const sz of [-4.3, 4.3]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(wallT, 2.35, 3.4), wallMat);
      pier.position.set(sx, 1.35 + 1.175, sz);
      pier.castShadow = true;
      group.add(pier);
    }
    // See-through side glass window
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.3, 5.2), glassMat);
    sideGlass.position.set(sx, 2.5, 0);
    group.add(sideGlass);
    // Interior wainscot accent strip
    const sideWain = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.32, d - 0.8), wainscotMat);
    sideWain.position.set(side * (halfW - wallT - 0.02), 0.66, 0);
    group.add(sideWain);
    const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, d - 0.8), blueStripeMat);
    sideStripe.position.set(side * (halfW - wallT - 0.02), 1.38, 0);
    group.add(sideStripe);
  }

  // Front South Wall (Split left & right around the 4.8m wide automatic glass sliding doorway!)
  const wingW = halfW - doorHalfW; // 5.6m each side
  for (const side of [-1, 1]) {
    const cx = side * (doorHalfW + wingW / 2); // ±5.2
    const fz = halfD - wallT / 2;
    // Lower knee wall
    const fLower = new THREE.Mesh(new THREE.BoxGeometry(wingW, 1.35, wallT), wallMat);
    fLower.position.set(cx, 0.675, fz);
    fLower.castShadow = true;
    group.add(fLower);
    // Upper header above storefront window
    const fUpper = new THREE.Mesh(new THREE.BoxGeometry(wingW, 1.9, wallT), wallMat);
    fUpper.position.set(cx, 3.5 + 0.95, fz);
    fUpper.castShadow = true;
    group.add(fUpper);
    // Outer & inner mullions
    const outerCol = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.15, wallT), wallMat);
    outerCol.position.set(side * (halfW - 0.55), 2.425, fz);
    group.add(outerCol);
    const innerCol = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.15, wallT), wallMat);
    innerCol.position.set(side * (doorHalfW + 0.45), 2.425, fz);
    group.add(innerCol);
    // See-through front clinic window pane
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.12, 0.08), glassMat);
    frontGlass.position.set(cx, 2.425, fz);
    group.add(frontGlass);
  }
  // Transom header above the automatic sliding entrance
  const transom = new THREE.Mesh(
    new THREE.BoxGeometry(doorHalfW * 2, groundH - doorH, wallT),
    wallMat,
  );
  transom.position.set(0, doorH + (groundH - doorH) / 2, halfD - wallT / 2);
  group.add(transom);

  // Brushed aluminum doorway surround & top sliding track
  for (const side of [-1, 1]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.16, doorH, 0.48), chromeMat);
    jamb.position.set(side * (doorHalfW + 0.02), doorH / 2, halfD - wallT / 2);
    group.add(jamb);
  }
  const track = new THREE.Mesh(new THREE.BoxGeometry(doorHalfW * 2 + 0.4, 0.2, 0.52), chromeMat);
  track.position.set(0, doorH + 0.05, halfD - wallT / 2);
  group.add(track);

  // Automatic Sliding Glass Emergency Doors (animated smoothly in ThreeWorld!)
  const buildSlidingDoorLeaf = (side: -1 | 1): THREE.Group => {
    const leaf = new THREE.Group();
    const leafW = doorHalfW - 0.04; // 2.36
    const leafH = doorH - 0.08; // 3.47
    const pane = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, 0.08), glassMat);
    pane.position.y = leafH / 2;
    leaf.add(pane);

    // Top & bottom aluminum rails
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(leafW, 0.14, 0.11), chromeMat);
    topRail.position.y = leafH - 0.07;
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(leafW, 0.18, 0.11), chromeMat);
    botRail.position.y = 0.09;
    leaf.add(topRail, botRail);

    // Crisp red emergency visibility band
    const band = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.08, 0.22, 0.1), redMat);
    band.position.y = 1.45;
    leaf.add(band);

    // Vertical chrome handle near center seam
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 8), chromeMat);
    handle.position.set(-side * (leafW / 2 - 0.2), 1.45, 0.08);
    leaf.add(handle);

    leaf.position.set(side * (doorHalfW / 2), 0.02, halfD - wallT / 2 + 0.02);
    return leaf;
  };
  const slidingDoorLeft = buildSlidingDoorLeaf(-1);
  const slidingDoorRight = buildSlidingDoorLeaf(1);
  group.add(slidingDoorLeft, slidingDoorRight);

  // 3. Upper 2nd-Story Exterior Shell, Roof, Signboard, Red Cross & Emergency Drive-Up Porch
  const upperH = Math.max(4.4, def.height - groundH + 0.45);
  const upperBody = new THREE.Mesh(new THREE.BoxGeometry(w, upperH, d), wallMat);
  upperBody.position.y = groundH + upperH / 2;
  upperBody.castShadow = true;
  upperBody.receiveShadow = true;
  group.add(upperBody);

  // Interior acoustic ceiling + 3 bright glowing LED light panels + interior PointLight
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.6, d - 0.6), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = groundH - 0.02;
  group.add(ceiling);

  const ledPanelMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f7ff,
    emissiveIntensity: 0.95,
    roughness: 0.2,
  });
  for (const lx of [-4.2, 0, 4.2]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.1), ledPanelMat);
    panel.position.set(lx, groundH - 0.06, -0.4);
    group.add(panel);
  }

  const interiorLight = new THREE.PointLight(0xf4fffd, 1.4, 24, 1.25);
  interiorLight.position.set(0, 4.35, -0.3);
  group.add(interiorLight);

  // Roof cornice & clean clinical hospital roof parapet + rooftop 108 H-pad
  const topY = groundH + upperH;
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.45, 0.34, d + 0.45), redMat);
  cornice.position.y = topY + 0.14;
  group.add(cornice);

  const roofCap = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.4, 0.35, d - 0.4),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 }),
  );
  roofCap.position.y = topY + 0.35;
  group.add(roofCap);

  // Glowing 2nd-story windows (nighttime glow)
  const windowMats: THREE.MeshStandardMaterial[] = [];
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x6ec1e4,
    emissive: 0xffd166,
    emissiveIntensity: 0.18,
    roughness: 0.14,
    metalness: 0.35,
  });
  windowMats.push(winMat);
  for (const side of [-1, 1]) {
    const uWin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 0.16), winMat);
    uWin.position.set(side * 5.2, groundH + 2.35, halfD + 0.04);
    group.add(uWin);
  }

  // Glowing 3D Red Medical Cross on upper facade
  const crossMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 0.65,
    roughness: 0.25,
  });
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.68, 2.2, 0.26), crossMat);
  crossV.position.set(0, topY - 1.45, halfD + 0.22);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.68, 0.26), crossMat);
  crossH.position.set(0, topY - 1.45, halfD + 0.22);
  group.add(crossV, crossH);

  // Ambulance Drive-Up Emergency Porch Canopy (wide 9.8m clearance so 108 Ambulance pulls right up!)
  for (const sx of [-4.6, 4.6]) {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.26, 4.0, 8),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
    );
    col.position.set(sx, 2.0, halfD + 3.0);
    group.add(col);
  }
  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.36, 3.6), redMat);
  porchRoof.position.set(0, 4.15, halfD + 1.8);
  group.add(porchRoof);

  // Prominent Signboard above canopy
  const signW = Math.min(w * 0.85, 11.2);
  const signH = 1.75;
  const signTex = createSignboardTexture(
    owned ? owned.customName : def.name,
    def.mlSign,
    Boolean(owned),
    def.accentColor,
    maxAnisotropy,
  );
  const signMesh = new THREE.Mesh(
    new THREE.BoxGeometry(signW, signH, 0.22),
    new THREE.MeshStandardMaterial({
      color: 0xf0f0f0,
      map: signTex,
      roughness: 0.78,
      metalness: 0.04,
    }),
  );
  signMesh.position.set(0, 5.95, halfD + 0.26);
  group.add(signMesh);

  // =========================================================================
  // 4. DETAILED LOW-POLY 3D HOSPITAL INTERIOR FURNISHINGS
  // =========================================================================

  // 4A. Back-Wall Hospital Banner Plaque + Clinical Wall Clock
  const bannerTex = createHospitalWallBannerTexture(maxAnisotropy);
  const wallBanner = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 1.35, 0.1),
    new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.55 }),
  );
  wallBanner.position.set(0, 3.35, -halfD + wallT + 0.09);
  group.add(wallBanner);

  // Cute round Hospital Wall Clock above the banner
  const clockRim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.08, 16),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }),
  );
  clockRim.rotation.x = Math.PI / 2;
  clockRim.position.set(-4.3, 3.65, -halfD + wallT + 0.08);
  const clockFace = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.09, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
  );
  clockFace.rotation.x = Math.PI / 2;
  clockFace.position.set(-4.3, 3.65, -halfD + wallT + 0.09);
  const clockHandH = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.22, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x0f172a }),
  );
  clockHandH.position.set(-4.3, 3.74, -halfD + wallT + 0.14);
  const clockHandM = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.04, 0.04),
    redMat,
  );
  clockHandM.position.set(-4.2, 3.65, -halfD + wallT + 0.15);
  group.add(clockRim, clockFace, clockHandH, clockHandM);

  // Framed Eye Chart / Kerala Health Board on West Wall
  const chartFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.35, 0.95),
    new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.5 }),
  );
  chartFrame.position.set(-halfW + wallT + 0.06, 2.55, -3.7);
  const chartPaper = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 1.15, 0.76),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
  );
  chartPaper.position.set(-halfW + wallT + 0.07, 2.55, -3.7);
  const chartHeader = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.56), redMat);
  chartHeader.position.set(-halfW + wallT + 0.08, 2.9, -3.7);
  group.add(chartFrame, chartPaper, chartHeader);

  // 4B. 108 Reception & Triage Desk (Back-Left: x = -4.3, z = -3.4)
  const deskGroup = new THREE.Group();
  deskGroup.position.set(-4.3, 0, -3.4);
  const deskBody = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 1.08, 1.12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 }),
  );
  deskBody.position.y = 0.54;
  deskBody.castShadow = true;
  deskGroup.add(deskBody);

  const deskTop = new THREE.Mesh(
    new THREE.BoxGeometry(3.85, 0.1, 1.32),
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.35 }),
  );
  deskTop.position.y = 1.12;
  deskGroup.add(deskTop);

  const deskTrim = new THREE.Mesh(new THREE.BoxGeometry(3.64, 0.16, 1.16), redMat);
  deskTrim.position.y = 0.14;
  deskGroup.add(deskTrim);

  // Mini 3D Red Cross on front of reception desk
  const rCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.46, 0.06), redMat);
  rCrossV.position.set(0, 0.64, 0.58);
  const rCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.06), redMat);
  rCrossH.position.set(0, 0.64, 0.58);
  deskGroup.add(rCrossV, rCrossH);

  // Reception Computer Monitor + Red 108 Emergency Telephone
  const monStand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), chromeMat);
  monStand.position.set(-0.7, 1.28, -0.05);
  const monBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.44, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 }),
  );
  monBody.position.set(-0.7, 1.56, -0.05);
  const monScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.36, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
    }),
  );
  monScreen.position.set(-0.7, 1.56, -0.005);
  const redPhone = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.24), redMat);
  redPhone.position.set(0.85, 1.23, 0.1);
  deskGroup.add(monStand, monBody, monScreen, redPhone);
  group.add(deskGroup);

  // 4C. Waiting Area Lounge (Front-Left: blue clinic benches + side table + potted indoor palm)
  const buildWaitingBench = (bx: number, bz: number, rotY: number) => {
    const bench = new THREE.Group();
    bench.position.set(bx, 0, bz);
    bench.rotation.y = rotY;
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.12), chromeMat);
    bar.position.y = 0.42;
    bench.add(bar);
    for (const lx of [-1.05, 1.05]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.56), chromeMat);
      leg.position.set(lx, 0.21, 0);
      bench.add(leg);
    }
    for (const sx of [-0.82, 0, 0.82]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.1, 0.56), seatMat);
      seat.position.set(sx, 0.49, 0.04);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.56, 0.1), seatMat);
      back.position.set(sx, 0.78, -0.22);
      bench.add(seat, back);
    }
    group.add(bench);
  };
  buildWaitingBench(-6.6, 1.7, Math.PI / 2);
  buildWaitingBench(-4.6, 4.45, Math.PI);

  // Potted Tropical Kerala Indoor Plant in Waiting Corner
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.22, 0.48, 8),
    new THREE.MeshStandardMaterial({ color: 0xc26d3a, roughness: 0.85 }),
  );
  pot.position.set(-6.7, 0.24, 4.4);
  group.add(pot);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.95, 5), leafMat);
    leaf.position.set(-6.7 + Math.cos(a) * 0.2, 0.85, 4.4 + Math.sin(a) * 0.2);
    leaf.rotation.set(Math.sin(a) * 0.42, 0, -Math.cos(a) * 0.42);
    group.add(leaf);
  }

  // 4D. VIP Sheru Recovery Ward — Two Hospital Beds + Privacy Curtain (Right Wing)
  const mattressMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0x2dd4bf, roughness: 0.65 });
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
  const headBoardMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.48 });

  const buildHospitalBed = (bx: number, bz: number) => {
    const bed = new THREE.Group();
    bed.position.set(bx, 0, bz);
    // Chrome bed frame & 4 legs
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 1.56), chromeMat);
    frame.position.y = 0.52;
    bed.add(frame);
    for (const lx of [-1.45, 1.45]) {
      for (const lz of [-0.68, 0.68]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.52, 6), chromeMat);
        leg.position.set(lx, 0.26, lz);
        bed.add(leg);
      }
    }
    // White mattress
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.26, 1.48), mattressMat);
    mattress.position.y = 0.72;
    mattress.castShadow = true;
    bed.add(mattress);
    // Mint-teal folded hospital blanket covering lower two-thirds
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.3, 1.54), blanketMat);
    blanket.position.set(-0.52, 0.74, 0);
    bed.add(blanket);
    // Fluffy white pillow against East wall side (+X)
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.92), pillowMat);
    pillow.position.set(1.08, 0.92, 0);
    bed.add(pillow);
    // Headboard & footboard
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.05, 1.58), headBoardMat);
    headboard.position.set(1.56, 0.85, 0);
    const footboard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.78, 1.58), headBoardMat);
    footboard.position.set(-1.56, 0.72, 0);
    bed.add(headboard, footboard);
    group.add(bed);
  };
  buildHospitalBed(5.0, -2.6);
  buildHospitalBed(5.0, 1.8);

  // Teal Privacy Curtain Divider between VIP Bed #1 and Bed #2
  const curtainRail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.6, 6), chromeMat);
  curtainRail.rotation.z = Math.PI / 2;
  curtainRail.position.set(5.5, 3.1, -0.4);
  group.add(curtainRail);
  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0x5eead4,
    roughness: 0.82,
    transparent: true,
    opacity: 0.88,
  });
  for (let i = 0; i < 4; i++) {
    const pleat = new THREE.Mesh(new THREE.BoxGeometry(0.58, 2.35, 0.08), curtainMat);
    pleat.position.set(4.6 + i * 0.62, 1.9, -0.4 + (i % 2 === 0 ? 0.04 : -0.04));
    group.add(pleat);
  }

  // 4E. Animated Pulsing ECG Vital Signs Monitor on Medical Cart (Beside VIP Bed #1)
  const ecgGroup = new THREE.Group();
  ecgGroup.position.set(3.85, 0, -4.35);
  ecgGroup.rotation.y = -0.35;
  const cartBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.88, 0.56),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.45 }),
  );
  cartBase.position.y = 0.48;
  const ecgBezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.52, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35 }),
  );
  ecgBezel.position.y = 1.24;
  const ecgTex = createEcgTexture();
  const ecgScreenMat = new THREE.MeshStandardMaterial({
    map: ecgTex,
    emissive: 0x22c55e,
    emissiveMap: ecgTex,
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });
  const ecgScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.4), ecgScreenMat);
  ecgScreen.position.set(0, 1.24, 0.125);
  ecgGroup.add(cartBase, ecgBezel, ecgScreen);
  group.add(ecgGroup);

  // 4F. IV Drip Stand next to VIP Bed #1
  const ivGroup = new THREE.Group();
  ivGroup.position.set(5.9, 0, -1.25);
  const ivBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.08, 8), chromeMat);
  ivBase.position.y = 0.04;
  const ivPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.25, 6), chromeMat);
  ivPole.position.y = 1.15;
  const ivHook = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.04), chromeMat);
  ivHook.position.y = 2.24;
  const salineBag = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.34, 0.09),
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.22,
      transparent: true,
      opacity: 0.78,
    }),
  );
  salineBag.position.set(-0.14, 1.98, 0);
  ivGroup.add(ivBase, ivPole, ivHook, salineBag);
  group.add(ivGroup);

  // 4G. Medicine & First-Aid Supply Cabinet (Back-Center-Right: x = 0.8, z = -5.1)
  const cabGroup = new THREE.Group();
  cabGroup.position.set(0.8, 0, -5.15);
  const cabBody = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 2.25, 0.62),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 }),
  );
  cabBody.position.y = 1.125;
  cabGroup.add(cabBody);
  const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.96, 0.06), glassMat);
  cabGlass.position.set(0, 1.62, 0.31);
  cabGroup.add(cabGlass);
  const bottleColors = [0xef4444, 0x22c55e, 0xf59e0b, 0x3b82f6, 0xec4899];
  for (let i = 0; i < 5; i++) {
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.28, 7),
      new THREE.MeshStandardMaterial({ color: bottleColors[i], roughness: 0.3 }),
    );
    bottle.position.set(-0.7 + i * 0.35, 1.44, 0.14);
    cabGroup.add(bottle);
  }
  const cabCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.05), redMat);
  cabCrossV.position.set(0, 0.56, 0.32);
  const cabCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.05), redMat);
  cabCrossH.position.set(0, 0.56, 0.32);
  cabGroup.add(cabCrossV, cabCrossH);
  group.add(cabGroup);

  return {
    group,
    signMesh,
    windowMats,
    def,
    hospitalInterior: {
      slidingDoorLeft,
      slidingDoorRight,
      ecgScreenMat,
      interiorLight,
      doorOpenAmount: 0,
    },
  };
}

export function createBuildingModel(
  def: BuildingDef,
  owned: OwnedBusinessRecord | undefined,
  plasterBump: THREE.Texture,
  maxAnisotropy: number,
): BuildingMeshHandle {
  if (def.category === 'hospital') {
    return buildWalkInHospitalBuilding(def, owned, plasterBump, maxAnisotropy);
  }

  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rotationY;

  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x8f8a82, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({
    color: def.wallColor,
    roughness: 0.76,
    metalness: 0.04,
    bumpMap: plasterBump,
    bumpScale: 0.06,
  });
  const roofTex = createRoofTileTexture(def.roofColor, maxAnisotropy);
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: roofTex,
    roughness: 0.65,
    metalness: 0.08,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: def.accentColor,
    roughness: 0.42,
    metalness: 0.25,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf4c430,
    roughness: 0.22,
    metalness: 0.88,
  });

  // Raised Kerala verandah plinth
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(def.width + 0.8, 0.45, def.depth + 1.2),
    plinthMat,
  );
  plinth.position.y = 0.225;
  plinth.receiveShadow = true;
  group.add(plinth);

  // Main building body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(def.width, def.height, def.depth),
    wallMat,
  );
  body.position.y = 0.45 + def.height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Horizontal decorative cornice trim
  const cornice = new THREE.Mesh(
    new THREE.BoxGeometry(def.width + 0.45, 0.32, def.depth + 0.45),
    accentMat,
  );
  cornice.position.y = 0.45 + def.height;
  group.add(cornice);

  // Distinct roofline by category
  if (def.category === 'bank') {
    // Grand GHOP GHOP International Bank dome + classical pillars!
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(def.width * 0.26, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      goldMat,
    );
    dome.position.y = 0.6 + def.height;
    dome.castShadow = true;
    group.add(dome);

    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.2, 8), goldMat);
    spire.position.y = 0.6 + def.height + def.width * 0.26 + 0.9;
    group.add(spire);

    for (let i = -3; i <= 3; i += 2) {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.48, def.height - 0.6, 10),
        new THREE.MeshStandardMaterial({ color: 0xfdf8ec, roughness: 0.45 }),
      );
      col.position.set(i * 2.5, 0.45 + (def.height - 0.6) / 2, def.depth / 2 + 0.4);
      col.castShadow = true;
      group.add(col);
    }
  } else if (def.category === 'mall' || def.category === 'car_showroom') {
    // Modern stepped glass-trimmed roof crown
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(def.width * 0.72, 1.8, def.depth * 0.72),
      accentMat,
    );
    crown.position.y = 0.6 + def.height + 0.9;
    crown.castShadow = true;
    group.add(crown);
  } else {
    // Traditional sloped Kerala Mangalore-tiled pyramid roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(def.width, def.depth) * 0.76, 2.8, 4),
      roofMat,
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.6 + def.height + 1.4;
    roof.castShadow = true;
    group.add(roof);
  }

  // Framed front doorway with jambs & wooden double door
  const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.65 });
  const doorRecessMat = new THREE.MeshStandardMaterial({ color: 0x261710, roughness: 0.5 });
  const doorW = Math.min(3.2, def.width * 0.3);
  const doorH = 3.0;
  const doorZ = def.depth / 2 + 0.04;

  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.14), doorRecessMat);
  doorPanel.position.set(0, 0.45 + doorH / 2, doorZ);
  group.add(doorPanel);

  for (const side of [-1, 1]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.28, doorH + 0.2, 0.34), doorFrameMat);
    jamb.position.set(side * (doorW / 2 + 0.12), 0.45 + doorH / 2, doorZ + 0.06);
    group.add(jamb);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.7, 0.28, 0.38), doorFrameMat);
  lintel.position.set(0, 0.45 + doorH + 0.14, doorZ + 0.08);
  group.add(lintel);

  // Striped colorful Kerala shop awning above front entrance
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(def.width * 0.86, 0.24, 2.2),
    accentMat,
  );
  awning.position.set(0, 3.85, def.depth / 2 + 0.95);
  awning.rotation.x = 0.22;
  awning.castShadow = true;
  group.add(awning);

  // Glowing front windows (illuminated brightly at night!)
  const windowMats: THREE.MeshStandardMaterial[] = [];
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x6ec1e4,
    emissive: 0xffd166,
    emissiveIntensity: 0.15,
    roughness: 0.14,
    metalness: 0.4,
  });
  windowMats.push(winMat);

  const floors = Math.max(1, Math.floor(def.height / 4.2));
  for (let f = 0; f < floors; f++) {
    const wy = 2.3 + f * 3.8;
    for (const side of [-1, 1]) {
      const wx = side * (def.width * 0.32);
      if (f === 0 && Math.abs(wx) < doorW * 0.7) continue;
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.4, 0.15), winMat);
      win.position.set(wx, wy, def.depth / 2 + 0.04);
      group.add(win);

      const sill = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.14, 0.32), doorFrameMat);
      sill.position.set(wx, wy - 0.76, def.depth / 2 + 0.1);
      group.add(sill);
    }
  }

  // Signature exterior props per shop type
  if (def.category === 'tea_shop') {
    // Shiny brass Kerala chaya boiler on front counter!
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 0.9), doorFrameMat);
    counter.position.set(def.width * 0.28, 1.0, def.depth / 2 + 0.75);
    group.add(counter);
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.75, 12), goldMat);
    boiler.position.set(def.width * 0.28, 1.9, def.depth / 2 + 0.75);
    group.add(boiler);
  } else if (def.category === 'barber') {
    // Classic red-white-blue barber pole
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 1.8, 10),
      new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.25, metalness: 0.3 }),
    );
    pole.position.set(-def.width * 0.36, 2.2, def.depth / 2 + 0.45);
    group.add(pole);
  } else if (def.category === 'police_station') {
    const siren = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.45, 0.7, 10),
      new THREE.MeshStandardMaterial({
        color: 0x2563eb,
        emissive: 0x3b82f6,
        emissiveIntensity: 0.85,
      }),
    );
    siren.position.set(0, def.height + 1.0, def.depth / 2 - 0.5);
    group.add(siren);
  } else if (def.category === 'fire_station') {
    const bayDoor = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 3.8, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 }),
    );
    bayDoor.position.set(0, 2.35, def.depth / 2 + 0.08);
    group.add(bayDoor);
  } else if (def.category === 'resort') {
    // Sparkling turquoise Resort Swimming Pool + tiled deck + umbrellas right in front!
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.18, 11),
      new THREE.MeshStandardMaterial({ color: 0xf5ebd6, roughness: 0.85 }),
    );
    deck.position.set(0, 0.09, def.depth / 2 + 7.2);
    deck.receiveShadow = true;
    group.add(deck);

    const poolWater = new THREE.Mesh(
      new THREE.BoxGeometry(15.2, 0.12, 8.2),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.25,
        roughness: 0.14,
        metalness: 0.2,
      }),
    );
    poolWater.position.set(0, 0.17, def.depth / 2 + 7.2);
    poolWater.name = 'resort_pool_water';
    group.add(poolWater);

    // Colorful beach umbrellas & loungers
    for (const ux of [-6.8, 6.8]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), goldMat);
      pole.position.set(ux, 1.35, def.depth / 2 + 2.4);
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(1.5, 0.65, 8),
        new THREE.MeshStandardMaterial({ color: ux < 0 ? 0xf97316 : 0xec4899, roughness: 0.6 }),
      );
      canopy.position.set(ux, 2.65, def.depth / 2 + 2.4);
      group.add(pole, canopy);
    }
  } else if (def.category === 'home') {
    // Sheru Bhai Royal Home golden porch pillars
    for (const sx of [-3.6, 3.6]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 4.2, 10), goldMat);
      col.position.set(sx, 2.3, def.depth / 2 + 1.2);
      group.add(col);
    }
  }

  // Prominent Procedural Signboard (flips to GOLD when bought by Sheru!)
  const signW = Math.min(def.width * 0.88, 11);
  const signH = 2.0;
  const signTex = createSignboardTexture(
    owned ? owned.customName : def.name,
    def.mlSign,
    Boolean(owned),
    def.accentColor,
    maxAnisotropy,
  );
  const signMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: signTex,
    roughness: 0.38,
    metalness: owned ? 0.4 : 0.1,
  });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(signW, signH, 0.22), signMat);
  const signZ = def.category === 'bank' ? def.depth / 2 + 1.0 : def.depth / 2 + 0.25;
  const signY = def.category === 'bank' ? def.height - 1.2 : Math.min(def.height - 0.4, 5.1);
  signMesh.position.set(0, signY, signZ);
  group.add(signMesh);

  // 320×50 Wall Ad Banners on Shop Walls & Sheru's Royal Home (exact 6.4:1 aspect ratio)
  const showWallBanners =
    def.category !== 'police_station' &&
    def.category !== 'fire_station' &&
    def.category !== 'secret';
  if (showWallBanners) {
    const isHome = def.category === 'home';
    const bannerTex = createWallBanner320x50Texture(
      owned ? owned.customName : def.name,
      isHome,
      maxAnisotropy,
    );
    const bannerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: bannerTex,
      roughness: 0.35,
      metalness: 0.12,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xd4a12a,
      roughness: 0.3,
      metalness: 0.72,
    });

    // Side wall 320×50 banners on left & right walls of every shop and home
    const sideBannerW = Math.min(def.depth * 0.78, 5.12);
    const sideBannerH = sideBannerW / 6.4; // exact 320:50 ratio
    const sideBannerY = Math.min(def.height - 1.0, 3.4);

    for (const side of [-1, 1]) {
      const sideGroup = new THREE.Group();
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, sideBannerH + 0.14, sideBannerW + 0.16),
        frameMat,
      );
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(sideBannerW, sideBannerH),
        bannerMat,
      );
      face.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      face.position.x = side * 0.06;
      sideGroup.add(frame, face);
      sideGroup.position.set(side * (def.width / 2 + 0.07), sideBannerY, 0);
      group.add(sideGroup);
    }

    // Sheru's Royal Home also gets a prominent front fascia 320×50 banner above the porch!
    if (isHome) {
      const frontW = 6.4;
      const frontH = 1.0; // exact 320:50 ratio
      const homeFrontFrame = new THREE.Mesh(
        new THREE.BoxGeometry(frontW + 0.18, frontH + 0.16, 0.12),
        frameMat,
      );
      homeFrontFrame.position.set(0, 6.45, def.depth / 2 + 0.2);
      const homeFrontFace = new THREE.Mesh(
        new THREE.PlaneGeometry(frontW, frontH),
        bannerMat,
      );
      homeFrontFace.position.set(0, 6.45, def.depth / 2 + 0.27);
      group.add(homeFrontFrame, homeFrontFace);
    }
  }

  return { group, signMesh, windowMats, def };
}

export function createEmptyPlotModel(plot: EmptyPlotDef, maxAnisotropy: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(plot.x, 0, plot.z);
  group.rotation.y = plot.rotationY;

  const dirt = new THREE.Mesh(
    new THREE.BoxGeometry(plot.width, 0.12, plot.depth),
    new THREE.MeshStandardMaterial({ color: 0xc29b6f, roughness: 0.95 }),
  );
  dirt.position.y = 0.06;
  dirt.receiveShadow = true;
  group.add(dirt);

  const postMat = new THREE.MeshStandardMaterial({ color: 0xf4a261, roughness: 0.5 });
  const corners = [
    [-plot.width / 2 + 0.3, -plot.depth / 2 + 0.3],
    [plot.width / 2 - 0.3, -plot.depth / 2 + 0.3],
    [-plot.width / 2 + 0.3, plot.depth / 2 - 0.3],
    [plot.width / 2 - 0.3, plot.depth / 2 - 0.3],
  ];
  for (const [cx, cz] of corners) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.5, 8), postMat);
    post.position.set(cx, 0.75, cz);
    group.add(post);
  }

  // Construction signboard
  const tex = createSignboardTexture(
    'FOR SALE · EMPTY PLOT',
    'BUILD SHERU SHOP HERE!',
    false,
    0x1d4e3f,
    maxAnisotropy,
  );
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 1.4, 0.15),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, roughness: 0.45 }),
  );
  board.position.set(0, 1.9, 0);
  group.add(board);

  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 8), postMat);
  stand.position.set(0, 0.7, 0);
  group.add(stand);

  return group;
}

export function createBuiltShopModel(
  plot: EmptyPlotDef,
  shopName: string,
  maxAnisotropy: number,
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(plot.x, 0, plot.z);
  group.rotation.y = plot.rotationY;

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf5c542,
    roughness: 0.22,
    metalness: 0.85,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x16382b,
    roughness: 0.48,
    metalness: 0.2,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x8be0f8,
    emissive: 0xffd166,
    emissiveIntensity: 0.35,
    roughness: 0.12,
    metalness: 0.5,
  });

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(plot.width + 0.4, 0.4, plot.depth + 0.4),
    goldMat,
  );
  base.position.y = 0.2;
  group.add(base);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(plot.width - 0.3, 5.4, plot.depth - 0.3),
    wallMat,
  );
  body.position.y = 3.1;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(plot.width + 0.5, 0.65, plot.depth + 0.5),
    goldMat,
  );
  roof.position.y = 6.0;
  group.add(roof);

  const glassFront = new THREE.Mesh(
    new THREE.BoxGeometry(plot.width * 0.72, 2.8, 0.18),
    glassMat,
  );
  glassFront.position.set(0, 1.9, (plot.depth - 0.3) / 2 + 0.05);
  group.add(glassFront);

  const tex = createSignboardTexture(shopName, 'SHERU MEGA BRANCH', true, 0xd4a12a, maxAnisotropy);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(plot.width * 0.9, 1.7, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, roughness: 0.35 }),
  );
  sign.position.set(0, 4.7, (plot.depth - 0.3) / 2 + 0.22);
  group.add(sign);

  return group;
}

export function createVehicleModel(def: VehicleDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rotationY;

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: def.color,
    roughness: 0.22,
    metalness: 0.65,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: def.accentColor,
    roughness: 0.25,
    metalness: 0.75,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1b2c3d,
    roughness: 0.08,
    metalness: 0.75,
  });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.88 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfff8d6,
    emissive: 0xffe066,
    emissiveIntensity: 0.85,
  });

  const addWheel = (wx: number, wy: number, wz: number, r = 0.42, w = 0.28) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 12), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    group.add(wheel);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.03, 8), accentMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(wx, wy, wz);
    group.add(rim);
  };

  if (def.type === 'auto') {
    // Classic Kerala Yellow-Black Auto-Rickshaw!
    group.add(createContactShadow(1.65));
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.75, 2.55), paintMat);
    lower.position.set(0, 0.72, 0);
    lower.castShadow = true;
    group.add(lower);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.92, 2.15), accentMat);
    canopy.position.set(0, 1.52, -0.1);
    canopy.castShadow = true;
    group.add(canopy);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.6, 0.1), glassMat);
    windshield.position.set(0, 1.45, 1.02);
    windshield.rotation.x = -0.18;
    group.add(windshield);

    const headLamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), headlightMat);
    headLamp.position.set(0, 0.82, 1.32);
    group.add(headLamp);

    addWheel(0, 0.34, 1.15, 0.34, 0.22);
    addWheel(-0.78, 0.34, -0.82, 0.34, 0.22);
    addWheel(0.78, 0.34, -0.82, 0.34, 0.22);
  } else if (def.type === 'bus') {
    // Komban Express Kerala Private Bus
    group.add(createContactShadow(3.6));
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.4, 6.6), paintMat);
    hull.position.set(0, 1.75, 0);
    hull.castShadow = true;
    group.add(hull);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.52, 6.66), accentMat);
    stripe.position.set(0, 1.45, 0);
    group.add(stripe);

    const wind = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.95, 0.14), glassMat);
    wind.position.set(0, 2.15, 3.28);
    group.add(wind);

    for (const s of [-0.85, 0.85]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.12), headlightMat);
      hl.position.set(s, 0.95, 3.32);
      group.add(hl);
    }

    addWheel(-1.25, 0.52, 2.0, 0.52, 0.34);
    addWheel(1.25, 0.52, 2.0, 0.52, 0.34);
    addWheel(-1.25, 0.52, -2.0, 0.52, 0.34);
    addWheel(1.25, 0.52, -2.0, 0.52, 0.34);
  } else if (def.type === 'motorcycle') {
    // Malabar Bullet Bike
    group.add(createContactShadow(1.1));
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 1.75), paintMat);
    frame.position.set(0, 0.72, 0);
    frame.castShadow = true;
    group.add(frame);

    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), accentMat);
    tank.scale.set(0.85, 0.75, 1.35);
    tank.position.set(0, 1.02, 0.25);
    group.add(tank);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 8), accentMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, 1.2, 0.65);
    group.add(handle);

    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), headlightMat);
    hl.position.set(0, 1.05, 0.92);
    group.add(hl);

    addWheel(0, 0.38, 0.78, 0.38, 0.16);
    addWheel(0, 0.38, -0.78, 0.38, 0.16);
  } else {
    // Luxury Gold-Trimmed Supercar!
    group.add(createContactShadow(2.45));
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.62, 4.4), paintMat);
    chassis.position.set(0, 0.64, 0);
    chassis.castShadow = true;
    group.add(chassis);

    const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 4.46), accentMat);
    goldTrim.position.set(0, 0.52, 0);
    group.add(goldTrim);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.58, 2.05), glassMat);
    cabin.position.set(0, 1.18, -0.15);
    cabin.castShadow = true;
    group.add(cabin);

    const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.42), accentMat);
    spoilerWing.position.set(0, 1.25, -2.02);
    group.add(spoilerWing);

    for (const s of [-0.72, 0.72]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.12), headlightMat);
      hl.position.set(s, 0.72, 2.22);
      group.add(hl);
    }

    addWheel(-1.05, 0.42, 1.35, 0.42, 0.3);
    addWheel(1.05, 0.42, 1.35, 0.42, 0.3);
    addWheel(-1.05, 0.42, -1.35, 0.42, 0.3);
    addWheel(1.05, 0.42, -1.35, 0.42, 0.3);
  }

  return group;
}

export interface CoconutPalmRig {
  root: THREE.Group;
  swayPivot: THREE.Group;
  crown: THREE.Group;
  fronds: THREE.Group[];
  coconuts: THREE.Mesh[];
}

export function createCoconutPalmRig(height = 9.5, curveLean = 1.2): CoconutPalmRig {
  const root = new THREE.Group();
  const swayPivot = new THREE.Group();
  root.add(swayPivot);

  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(curveLean * 0.35, height * 0.35, 0),
    new THREE.Vector3(curveLean * 0.85, height * 0.72, 0),
    new THREE.Vector3(curveLean, height, 0),
  ]);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5738, roughness: 0.92 });
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 8, 0.28, 7, false), trunkMat);
  trunk.castShadow = true;
  swayPivot.add(trunk);

  const crown = new THREE.Group();
  crown.position.set(curveLean, height, 0);
  swayPivot.add(crown);

  // Cluster of 4 green Kerala coconuts that can visibly detach when bumped!
  const cocoMat = new THREE.MeshStandardMaterial({ color: 0x4b7d2c, roughness: 0.52 });
  const coconuts: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const coco = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), cocoMat);
    coco.position.set(Math.cos(a) * 0.34, -0.26, Math.sin(a) * 0.34);
    crown.add(coco);
    coconuts.push(coco);
  }

  // 7 Arched palm fronds that rustle & flap when colliding with the tree!
  const frondMat = new THREE.MeshStandardMaterial({
    color: 0x2d7d3a,
    roughness: 0.62,
    side: THREE.DoubleSide,
  });
  const fronds: THREE.Group[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const frondGroup = new THREE.Group();
    frondGroup.rotation.y = a;

    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 2.2), frondMat);
    blade1.position.set(0, 0.2, 1.1);
    blade1.rotation.x = -0.25;
    frondGroup.add(blade1);

    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 1.9), frondMat);
    blade2.position.set(0, -0.1, 2.95);
    blade2.rotation.x = 0.42;
    frondGroup.add(blade2);

    crown.add(frondGroup);
    fronds.push(frondGroup);
  }

  return { root, swayPivot, crown, fronds, coconuts };
}

export function createCoconutPalm(height = 9.5, curveLean = 1.2): THREE.Group {
  return createCoconutPalmRig(height, curveLean).root;
}

export interface FallingCoconutRig {
  group: THREE.Group;
  shadowRing: THREE.Mesh;
}

export function createFallingCoconutRig(): FallingCoconutRig {
  const group = new THREE.Group();

  // Vibrant green Kerala tender coconut body (slightly oval for unmistakable 3D tumble)
  const hull = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x4e8c2b, roughness: 0.48 }),
  );
  hull.scale.set(0.92, 1.12, 0.92);
  hull.castShadow = true;
  group.add(hull);

  // Dark brown husk cap & stem so 3D spin is crisp and readable
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.21, 0.14, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.85 }),
  );
  cap.position.y = 0.31;
  group.add(cap);

  // Ground drop shadow indicator beneath the falling coconut
  const shadowRing = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 16),
    new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );
  shadowRing.rotation.x = -Math.PI / 2;
  shadowRing.position.y = 0.05;
  shadowRing.visible = false;

  group.visible = false;
  return { group, shadowRing };
}

export function createGoatModel(): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadow(0.55));
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.85 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x3a2e25, roughness: 0.7 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 1.02), whiteMat);
  body.position.set(0, 0.65, 0);
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.44), whiteMat);
  head.position.set(0, 0.96, 0.58);
  group.add(head);

  for (const s of [-0.1, 0.1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 6), darkMat);
    horn.position.set(s, 1.18, 0.5);
    horn.rotation.x = -0.3;
    group.add(horn);
  }

  for (const [lx, lz] of [
    [-0.18, 0.34],
    [0.18, 0.34],
    [-0.18, -0.34],
    [0.18, -0.34],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.45, 6), darkMat);
    leg.position.set(lx, 0.225, lz);
    group.add(leg);
  }
  return group;
}

export function createCollectibleModel(def: WorldCollectible): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.85, 20),
    new THREE.MeshBasicMaterial({
      color: 0xffd166,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.48, 0),
    new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: def.color,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.85,
    }),
  );
  gem.position.y = 1.2;
  gem.name = 'spin_gem';
  group.add(gem);

  return group;
}

export function createStreetLamp(): { group: THREE.Group; bulbMat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.45, metalness: 0.75 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 5.8, 8), poleMat);
  pole.position.y = 2.9;
  group.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.1), poleMat);
  arm.position.set(0.5, 5.7, 0);
  group.add(arm);

  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff3c4,
    emissive: 0xffc857,
    emissiveIntensity: 0.15,
    roughness: 0.2,
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), bulbMat);
  bulb.position.set(0.95, 5.5, 0);
  group.add(bulb);

  return { group, bulbMat };
}

export function createBusStopModel(def: BusStopDef, maxAnisotropy: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(def.x, 0, def.z);
  g.rotation.y = def.rotationY;

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4, metalness: 0.5 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.8 });

  for (const sx of [-1.8, 1.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.7, 6), poleMat);
    post.position.set(sx, 1.35, -0.6);
    g.add(post);
  }
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.1, 0.1), poleMat);
  backPanel.position.set(0, 1.35, -0.65);
  g.add(backPanel);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 1.8), roofMat);
  roof.position.set(0, 2.75, 0.05);
  roof.castShadow = true;
  g.add(roof);

  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.16, 0.55), benchMat);
  bench.position.set(0, 0.55, -0.2);
  g.add(bench);

  const signTex = createSignboardTexture('BUS STOP', def.mlName, false, 0x1d4ed8, maxAnisotropy);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.72, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: signTex, roughness: 0.4 }),
  );
  sign.position.set(0, 3.15, 0.45);
  g.add(sign);

  return g;
}

export function createAutoStandModel(def: AutoStandDef, maxAnisotropy: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(def.x, 0, def.z);
  g.rotation.y = def.rotationY;

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 3.0, 6), poleMat);
  post.position.y = 1.5;
  g.add(post);

  const signTex = createSignboardTexture('AUTO STAND', def.mlName, false, 0xca8a04, maxAnisotropy);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.85, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: signTex, roughness: 0.4 }),
  );
  board.position.set(0, 2.85, 0);
  g.add(board);

  return g;
}

export interface TrafficLightRig {
  group: THREE.Group;
  redMat: THREE.MeshStandardMaterial;
  yellowMat: THREE.MeshStandardMaterial;
  greenMat: THREE.MeshStandardMaterial;
}

export function createTrafficLightModel(x: number, z: number, rotY: number): TrafficLightRig {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.5, metalness: 0.6 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 5.2, 8), poleMat);
  pole.position.y = 2.6;
  group.add(pole);

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.48, 0.42), poleMat);
  box.position.set(0, 4.75, 0.18);
  group.add(box);

  const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.9 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.1 });
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.1 });

  const addLamp = (y: number, mat: THREE.MeshStandardMaterial) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mat);
    l.position.set(0, y, 0.4);
    group.add(l);
  };
  addLamp(5.18, redMat);
  addLamp(4.75, yellowMat);
  addLamp(4.32, greenMat);

  return { group, redMat, yellowMat, greenMat };
}

export function createZebraCrossing(x: number, z: number, rotY: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0.045, z);
  g.rotation.y = rotY;

  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  for (let i = -3; i <= 3; i++) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 3.2), stripeMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(i * 1.35, 0, 0);
    g.add(stripe);
  }
  return g;
}

export function createParkingBayModel(def: ParkingBayDef): THREE.Group {
  const g = new THREE.Group();
  g.position.set(def.x, 0.04, def.z);
  g.rotation.y = def.rotationY;

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  for (const sx of [-2.1, 2.1]) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 5.0), lineMat);
    bar.rotation.x = -Math.PI / 2;
    bar.position.set(sx, 0, 0);
    g.add(bar);
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(4.36, 0.16), lineMat);
  back.rotation.x = -Math.PI / 2;
  back.position.set(0, 0, -2.5);
  g.add(back);

  return g;
}

/**
 * Compact, vibrant low-poly 300×250 (1.2:1 aspect ratio) freestanding 3D Town Ads Board.
 * Players can walk up and press E to view the live 300×250 ad display!
 */
export function createAdBoard300x250Model(
  board: AdBoardDef,
  maxAnisotropy: number,
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(board.x, 0, board.z);
  g.rotation.y = board.rotationY;

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.65,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf5c542,
    roughness: 0.25,
    metalness: 0.78,
  });

  // Concrete base plinth
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(3.9, 0.35, 0.9),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.88 }),
  );
  plinth.position.y = 0.175;
  plinth.receiveShadow = true;
  g.add(plinth);

  // Twin steel support posts
  for (const sx of [-1.45, 1.45]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.2, 8), steelMat);
    post.position.set(sx, 1.25, 0);
    post.castShadow = true;
    g.add(post);
  }

  // Exact 300:250 (1.2:1) billboard housing: 3.6m wide × 3.0m tall
  const boardW = 3.6;
  const boardH = 3.0;
  const boardCenterY = 3.65;

  const casing = new THREE.Mesh(
    new THREE.BoxGeometry(boardW + 0.24, boardH + 0.24, 0.28),
    steelMat,
  );
  casing.position.set(0, boardCenterY, 0);
  casing.castShadow = true;
  g.add(casing);

  // Gold top & bottom accent trim bars
  for (const sy of [-1, 1]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(boardW + 0.32, 0.12, 0.34), goldMat);
    trim.position.set(0, boardCenterY + sy * (boardH / 2 + 0.14), 0);
    g.add(trim);
  }

  // Front & back 300×250 canvas faces
  const tex = createAdBoard300x250Texture(board.name, board.mlName, maxAnisotropy);
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex,
    roughness: 0.32,
    metalness: 0.08,
  });

  const frontFace = new THREE.Mesh(new THREE.PlaneGeometry(boardW, boardH), faceMat);
  frontFace.position.set(0, boardCenterY, 0.15);
  g.add(frontFace);

  const backFace = new THREE.Mesh(new THREE.PlaneGeometry(boardW, boardH), faceMat);
  backFace.rotation.y = Math.PI;
  backFace.position.set(0, boardCenterY, -0.15);
  g.add(backFace);

  // Overhead twin spotlight fixtures
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfff8dc,
    emissive: 0xffd166,
    emissiveIntensity: 0.85,
  });
  for (const sx of [-1.0, 1.0]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.65), steelMat);
    arm.position.set(sx, boardCenterY + boardH / 2 + 0.24, 0.32);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.18), lampMat);
    lamp.position.set(sx, boardCenterY + boardH / 2 + 0.2, 0.62);
    g.add(arm, lamp);
  }

  return g;
}

export interface AirportComplexRig {
  group: THREE.Group;
  radarDish: THREE.Object3D;
  windsock: THREE.Object3D;
  beaconMat: THREE.MeshStandardMaterial;
  runwayLightMat: THREE.MeshStandardMaterial;
}

/**
 * Builds the complete Kerala International Airport (COK) Complex:
 * - 196m x 22m Asphalt Runway (09 / 27) with piano-key markings, aiming blocks & dashed centerline
 * - Glowing runway edge lights, green threshold lamps & red end lights
 * - Concrete Terminal Apron, yellow-lined taxiways & North Airport Access Road
 * - Air Traffic Control (ATC) Tower with 360° glass deck, flashing beacon & rotating radar dish
 * - GHOP Airways Aviation Hangar & fluttering orange-white Windsock
 */
export function createAirportComplexModel(maxAnisotropy: number): AirportComplexRig {
  const group = new THREE.Group();

  const rwZ = AIRPORT_RUNWAY.centerZ;
  const rwLen = AIRPORT_RUNWAY.length;
  const rwW = AIRPORT_RUNWAY.width;

  // 1. Main East-West Asphalt Runway (196m x 22m)
  const runwayTex = createRunwayTexture(maxAnisotropy);
  const runwayMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(rwLen, rwW),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: runwayTex,
      roughness: 0.82,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  runwayMesh.rotation.x = -Math.PI / 2;
  runwayMesh.position.set(0, 0.045, rwZ);
  runwayMesh.receiveShadow = true;
  group.add(runwayMesh);

  // Subtle runway shoulder border strip
  const shoulderMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(rwLen + 10, rwW + 7),
    new THREE.MeshStandardMaterial({ color: 0x3b434d, roughness: 0.9 }),
  );
  shoulderMesh.rotation.x = -Math.PI / 2;
  shoulderMesh.position.set(0, 0.028, rwZ);
  shoulderMesh.receiveShadow = true;
  group.add(shoulderMesh);

  // 2. Concrete Airport Apron (front of Terminal + Hangar + ATC) & Twin Taxiways to Runway
  const apronTex = createApronTexture(maxAnisotropy);
  const apronMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(118, 26),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: apronTex,
      roughness: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  apronMesh.rotation.x = -Math.PI / 2;
  apronMesh.position.set(0, 0.036, AIRPORT_RUNWAY.apronZ);
  apronMesh.receiveShadow = true;
  group.add(apronMesh);

  // Connecting Taxiway ramps (West & East connectors from Apron to Runway)
  const taxiMat = new THREE.MeshStandardMaterial({ color: 0x3e4650, roughness: 0.86 });
  const yellowLineMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  for (const tx of [-54, 0, 54]) {
    const conn = new THREE.Mesh(new THREE.PlaneGeometry(12, 16), taxiMat);
    conn.rotation.x = -Math.PI / 2;
    conn.position.set(tx, 0.038, rwZ + rwW / 2 + 4.5);
    conn.receiveShadow = true;
    group.add(conn);

    const yLine = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 14), yellowLineMat);
    yLine.rotation.x = -Math.PI / 2;
    yLine.position.set(tx, 0.048, rwZ + rwW / 2 + 4.5);
    group.add(yLine);
  }

  // North Airport Access Road linking North InfoPark Blvd (z = -72) straight to Airport Terminal (z = -108)
  const accessRoad = new THREE.Mesh(new THREE.PlaneGeometry(12, 42), taxiMat);
  accessRoad.rotation.x = -Math.PI / 2;
  accessRoad.position.set(0, 0.033, -90);
  accessRoad.receiveShadow = true;
  group.add(accessRoad);

  // 3. Runway Edge, Green Threshold & Red End Lights
  const runwayLightMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfde047,
    emissiveIntensity: 1.25,
  });
  const greenLightMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 1.4,
  });
  const redLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.4,
  });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.5 });
  const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.65, 6);
  const bulbGeo = new THREE.SphereGeometry(0.2, 8, 8);

  for (let lx = -92; lx <= 92; lx += 18.4) {
    for (const side of [-1, 1]) {
      const lz = rwZ + side * (rwW / 2 + 1.3);
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(lx, 0.32, lz);
      const bulb = new THREE.Mesh(bulbGeo, runwayLightMat);
      bulb.position.set(lx, 0.72, lz);
      group.add(post, bulb);
    }
  }
  // Threshold green (West 09) & end red (East 27) approach bar lights
  for (let kz = -8; kz <= 8; kz += 4) {
    const westLamp = new THREE.Mesh(bulbGeo, greenLightMat);
    westLamp.position.set(-rwLen / 2 - 1.5, 0.55, rwZ + kz);
    const eastLamp = new THREE.Mesh(bulbGeo, redLightMat);
    eastLamp.position.set(rwLen / 2 + 1.5, 0.55, rwZ + kz);
    group.add(westLamp, eastLamp);
  }

  // 4. Air Traffic Control (ATC) Tower (West of Terminal at x: -34, z: -113)
  const atc = new THREE.Group();
  atc.position.set(-34, 0, -113);
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  const tealMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.4, metalness: 0.25 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf5c542, roughness: 0.28, metalness: 0.72 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x0369a1,
    emissiveIntensity: 0.35,
    roughness: 0.12,
    metalness: 0.75,
  });

  const atcBase = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.2, 7.2), whiteMat);
  atcBase.position.y = 2.1;
  atcBase.castShadow = true;
  atc.add(atcBase);

  const atcShaft = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.8, 12.5, 8), whiteMat);
  atcShaft.position.y = 10.2;
  atcShaft.castShadow = true;
  atc.add(atcShaft);

  const atcRing = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 2.5, 1.4, 8), tealMat);
  atcRing.position.y = 16.8;
  atc.add(atcRing);

  const atcCabGlass = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 3.8, 2.7, 8), glassMat);
  atcCabGlass.position.y = 18.8;
  atc.add(atcCabGlass);

  const atcRoof = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.5, 0.75, 8), goldMat);
  atcRoof.position.y = 20.5;
  atc.add(atcRoof);

  // Rotating ATC Radar Dish on top
  const radarDish = new THREE.Group();
  radarDish.position.set(0, 21.8, 0);
  const radarMast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.6, 6), postMat);
  const radarBar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.65, 0.22), whiteMat);
  radarBar.position.y = 0.7;
  const radarTip = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.16, 0.26), goldMat);
  radarTip.position.y = 1.05;
  radarDish.add(radarMast, radarBar, radarTip);
  atc.add(radarDish);

  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xff2222,
    emissiveIntensity: 1.8,
  });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), beaconMat);
  beacon.position.y = 23.6;
  atc.add(beacon);

  const atcSignTex = createSignboardTexture(
    'ATC TOWER · COK',
    'എയർ ട്രാഫിക് കൺട്രോൾ',
    true,
    0x0f766e,
    maxAnisotropy,
  );
  const atcSign = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 1.35, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: atcSignTex, roughness: 0.35 }),
  );
  atcSign.position.set(0, 4.5, -3.7);
  atcSign.rotation.y = Math.PI;
  atc.add(atcSign);
  group.add(atc);

  // 5. GHOP Airways Aviation Hangar (East of Terminal at x: 38, z: -113)
  const hangar = new THREE.Group();
  hangar.position.set(38, 0, -113);
  const hangarMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.55, metalness: 0.25 });
  const hangarDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

  const hBack = new THREE.Mesh(new THREE.BoxGeometry(20, 8.2, 1.0), hangarMat);
  hBack.position.set(0, 4.1, 6.5);
  hBack.castShadow = true;
  const hLeft = new THREE.Mesh(new THREE.BoxGeometry(1.0, 8.2, 14), hangarMat);
  hLeft.position.set(-9.5, 4.1, 0);
  hLeft.castShadow = true;
  const hRight = new THREE.Mesh(new THREE.BoxGeometry(1.0, 8.2, 14), hangarMat);
  hRight.position.set(9.5, 4.1, 0);
  hRight.castShadow = true;
  const hRoof = new THREE.Mesh(
    new THREE.CylinderGeometry(10.1, 10.1, 14.4, 14, 1, false, 0, Math.PI),
    tealMat,
  );
  hRoof.rotation.z = Math.PI / 2;
  hRoof.rotation.y = Math.PI / 2;
  hRoof.scale.set(1, 0.42, 1);
  hRoof.position.set(0, 8.2, 0);
  hRoof.castShadow = true;

  const hInnerDark = new THREE.Mesh(new THREE.PlaneGeometry(18, 7.8), hangarDarkMat);
  hInnerDark.position.set(0, 3.9, 5.9);
  hInnerDark.rotation.y = Math.PI;

  const hangarSignTex = createSignboardTexture(
    'GHOP AIRWAYS HANGAR',
    'ഷേരു എയർവേയ്‌സ് ഹാംഗർ',
    true,
    0xf5c542,
    maxAnisotropy,
  );
  const hangarSign = new THREE.Mesh(
    new THREE.BoxGeometry(12, 1.9, 0.24),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: hangarSignTex, roughness: 0.35 }),
  );
  hangarSign.position.set(0, 9.6, -7.1);
  hangarSign.rotation.y = Math.PI;

  hangar.add(hBack, hLeft, hRight, hRoof, hInnerDark, hangarSign);
  group.add(hangar);

  // 6. Fluttering Aviation Windsock near Runway midpoint
  const sockPoleGroup = new THREE.Group();
  sockPoleGroup.position.set(-48, 0, rwZ - rwW / 2 - 4.5);
  const sockPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 5.8, 6), whiteMat);
  sockPole.position.y = 2.9;
  sockPoleGroup.add(sockPole);

  const windsock = new THREE.Group();
  windsock.position.set(0, 5.65, 0);
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.55 });
  for (let s = 0; s < 4; s++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36 - s * 0.05, 0.42 - s * 0.05, 0.55, 10),
      s % 2 === 0 ? orangeMat : whiteMat,
    );
    seg.rotation.z = -Math.PI / 2;
    seg.position.set(0.35 + s * 0.52, -s * 0.06, 0);
    windsock.add(seg);
  }
  sockPoleGroup.add(windsock);
  group.add(sockPoleGroup);

  return { group, radarDish, windsock, beaconMat, runwayLightMat };
}


