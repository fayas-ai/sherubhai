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
import { AutoStandDef, BusStopDef, ParkingBayDef } from '../data/worldData';
import {
  createContactShadowTexture,
  createRoofTileTexture,
  createSignboardTexture,
} from './textures';

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

export interface BuildingMeshHandle {
  group: THREE.Group;
  signMesh: THREE.Mesh;
  windowMats: THREE.MeshStandardMaterial[];
  def: BuildingDef;
}

export function createBuildingModel(
  def: BuildingDef,
  owned: OwnedBusinessRecord | undefined,
  plasterBump: THREE.Texture,
  maxAnisotropy: number,
): BuildingMeshHandle {
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
  } else if (def.category === 'hospital') {
    // Glowing 3D Red Medical Cross & Emergency 108 Entrance Canopy!
    const crossMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xef4444,
      emissiveIntensity: 0.6,
      roughness: 0.25,
    });
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.2, 0.25), crossMat);
    crossV.position.set(0, def.height - 1.6, def.depth / 2 + 0.3);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 0.25), crossMat);
    crossH.position.set(0, def.height - 1.6, def.depth / 2 + 0.3);
    group.add(crossV, crossH);

    // Ambulance drive-up emergency porch pillars
    for (const sx of [-4.2, 4.2]) {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.28, 3.8, 8),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
      );
      col.position.set(sx, 2.1, def.depth / 2 + 2.8);
      group.add(col);
    }
    const porchRoof = new THREE.Mesh(
      new THREE.BoxGeometry(9.4, 0.35, 3.4),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 }),
    );
    porchRoof.position.set(0, 4.1, def.depth / 2 + 1.7);
    group.add(porchRoof);
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
