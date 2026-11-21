import * as THREE from 'three';
import { VehicleDef } from '../types/game';
import { createContactShadow } from './models';

export interface VehicleModelRig {
  root: THREE.Group;
  wheels: THREE.Object3D[];
  frontWheelPivots: THREE.Object3D[];
  sirenRedMat?: THREE.MeshStandardMaterial;
  sirenBlueMat?: THREE.MeshStandardMaterial;
  hasSiren: boolean;
}

/**
 * Compact, cute, colorful low-poly cartoon 3D vehicle generator for all 28 original Kerala town vehicles.
 * Proportions match Sheru Bhai (~2.1u tall) so no vehicle looks giant or oversized,
 * and geometry stays lightweight for smooth 4GB-RAM laptop performance.
 */
export function createDetailedVehicleModel(def: VehicleDef): VehicleModelRig {
  const root = new THREE.Group();
  root.position.set(def.x, 0, def.z);
  root.rotation.y = def.rotationY;

  const wheels: THREE.Object3D[] = [];
  const frontWheelPivots: THREE.Object3D[] = [];

  const paintMat = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.28,
    metalness: 0.45,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: def.accentColor,
    roughness: 0.3,
    metalness: 0.55,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a52,
    roughness: 0.12,
    metalness: 0.65,
    transparent: true,
    opacity: 0.85,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.8 });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe5e7eb,
    roughness: 0.2,
    metalness: 0.88,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfff8d6,
    emissive: 0xffe066,
    emissiveIntensity: 0.9,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 0.55,
  });

  let sirenRedMat: THREE.MeshStandardMaterial | undefined;
  let sirenBlueMat: THREE.MeshStandardMaterial | undefined;
  let hasSiren = Boolean(def.hasSiren);

  const addWheel = (wx: number, wy: number, wz: number, r = 0.36, w = 0.22, isFront = false) => {
    const pivot = new THREE.Group();
    pivot.position.set(wx, wy, wz);
    root.add(pivot);

    const spinGroup = new THREE.Group();
    pivot.add(spinGroup);

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 10), darkMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    spinGroup.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.54, r * 0.54, w + 0.03, 6), chromeMat);
    rim.rotation.z = Math.PI / 2;
    spinGroup.add(rim);

    wheels.push(spinGroup);
    if (isFront) frontWheelPivots.push(pivot);
  };

  const addLights = (halfW: number, y: number, frontZ: number, rearZ: number) => {
    for (const s of [-1, 1]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.08), headlightMat);
      hl.position.set(s * halfW, y, frontZ);
      root.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.08), taillightMat);
      tl.position.set(s * halfW, y, rearZ);
      root.add(tl);
    }
  };

  const addSirenBar = (y: number, z: number, width = 1.05, dualBlue = true) => {
    hasSiren = true;
    sirenRedMat = new THREE.MeshStandardMaterial({
      color: 0xff2222,
      emissive: 0xff1111,
      emissiveIntensity: 1.1,
      roughness: 0.2,
    });
    sirenBlueMat = new THREE.MeshStandardMaterial({
      color: dualBlue ? 0x2563eb : 0xff2222,
      emissive: dualBlue ? 0x3b82f6 : 0xff1111,
      emissiveIntensity: 0.3,
      roughness: 0.2,
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, 0.26), darkMat);
    base.position.set(0, y, z);
    root.add(base);

    const redLamp = new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, 0.16, 0.22), sirenRedMat);
    redLamp.position.set(-width * 0.24, y + 0.1, z);
    root.add(redLamp);

    const blueLamp = new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, 0.16, 0.22), sirenBlueMat);
    blueLamp.position.set(width * 0.24, y + 0.1, z);
    root.add(blueLamp);
  };

  const addMedicalCross = (x: number, y: number, z: number, rotY = 0, scale = 1) => {
    const crossMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0x991b1b,
      emissiveIntensity: 0.25,
      roughness: 0.3,
    });
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.16 * scale, 0.52 * scale, 0.05), crossMat);
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.52 * scale, 0.16 * scale, 0.05), crossMat);
    g.add(v, h);
    root.add(g);
  };

  const t = def.type;

  // =========================================================================
  // 1. BEAUTIFUL SMALL WHITE 108 AMBULANCE (with interior, medical staff, rear doors, cross, siren)
  // =========================================================================
  if (t === 'ambulance') {
    root.add(createContactShadow(2.25));
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3, metalness: 0.15 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.32 });

    // Lower chassis & front bumper
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 4.15), whiteMat);
    base.position.set(0, 0.56, 0);
    base.castShadow = true;
    root.add(base);

    // Front cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.86, 1.05, 1.35), whiteMat);
    cab.position.set(0, 1.25, 1.32);
    cab.castShadow = true;
    root.add(cab);

    // Clear front windshield + Driver & Medic heads visible inside!
    const wind = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.62, 0.08), glassMat);
    wind.position.set(0, 1.36, 1.98);
    wind.rotation.x = -0.14;
    root.add(wind);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xb68158, roughness: 0.7 });
    const driverHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), skinMat);
    driverHead.position.set(0.36, 1.38, 1.48);
    root.add(driverHead);
    const medicHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), skinMat);
    medicHead.position.set(-0.36, 1.36, 1.45);
    root.add(medicHead);

    // Rear patient medical cabin with hollow-feel window & small stretcher interior
    const boxLeft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.28, 2.55), whiteMat);
    boxLeft.position.set(-0.88, 1.38, -0.68);
    boxLeft.castShadow = true;
    root.add(boxLeft);

    const boxRight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.28, 2.55), whiteMat);
    boxRight.position.set(0.88, 1.38, -0.68);
    boxRight.castShadow = true;
    root.add(boxRight);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.16, 2.68), whiteMat);
    roof.position.set(0, 2.04, -0.66);
    roof.castShadow = true;
    root.add(roof);

    // Small Medical Interior: stretcher mattress + blue sheet + heart monitor box!
    const stretcher = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.16, 1.85),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.6 }),
    );
    stretcher.position.set(-0.22, 0.94, -0.65);
    root.add(stretcher);

    const monitor = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.34, 0.36),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.4 }),
    );
    monitor.position.set(0.55, 1.25, -0.35);
    root.add(monitor);

    // Rear emergency double doors (crisp white with vertical center seam & windows)
    for (const side of [-0.44, 0.44]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.24, 0.1), whiteMat);
      door.position.set(side, 1.36, -1.96);
      root.add(door);
      const dWin = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.42, 0.12), glassMat);
      dWin.position.set(side, 1.6, -1.97);
      root.add(dWin);
    }

    // Red emergency markings stripe around entire ambulance
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.22, 4.18), redMat);
    stripe.position.set(0, 0.88, 0);
    root.add(stripe);

    // Visible Red Medical Crosses on both sides, front hood & roof!
    addMedicalCross(-0.96, 1.46, -0.65, -Math.PI / 2, 1.0);
    addMedicalCross(0.96, 1.46, -0.65, Math.PI / 2, 1.0);
    addMedicalCross(0, 0.88, 2.09, 0, 0.72);
    const roofCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.82), redMat);
    roofCrossV.position.set(0, 2.13, -0.7);
    const roofCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.04, 0.24), redMat);
    roofCrossH.position.set(0, 2.13, -0.7);
    root.add(roofCrossV, roofCrossH);

    // Flashing red & blue roof lights + working headlights
    addSirenBar(2.14, 1.12, 1.15, true);
    addLights(0.66, 0.68, 2.09, -2.06);

    addWheel(-0.94, 0.36, 1.32, 0.36, 0.24, true);
    addWheel(0.94, 0.36, 1.32, 0.36, 0.24, true);
    addWheel(-0.94, 0.36, -1.25, 0.36, 0.24, false);
    addWheel(0.94, 0.36, -1.25, 0.36, 0.24, false);

    return { root, wheels, frontWheelPivots, sirenRedMat, sirenBlueMat, hasSiren: true };
  }

  // =========================================================================
  // 2. KERALA POLICE PATROL JEEP
  // =========================================================================
  if (t === 'police_jeep') {
    root.add(createContactShadow(1.95));
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.78, 3.6), paintMat);
    body.position.set(0, 0.76, 0);
    body.castShadow = true;
    root.add(body);

    const blueBand = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.26, 3.64), accentMat);
    blueBand.position.set(0, 0.82, 0);
    root.add(blueBand);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.84, 2.05), paintMat);
    cabin.position.set(0, 1.5, -0.25);
    cabin.castShadow = true;
    root.add(cabin);

    const wind = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.56, 0.08), glassMat);
    wind.position.set(0, 1.52, 0.78);
    wind.rotation.x = -0.1;
    root.add(wind);

    const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 10), darkMat);
    spare.rotation.x = Math.PI / 2;
    spare.position.set(0, 1.05, -1.88);
    root.add(spare);

    addSirenBar(1.95, 0.1, 1.0, true);
    addLights(0.62, 0.84, 1.82, -1.82);

    addWheel(-0.9, 0.38, 1.15, 0.38, 0.24, true);
    addWheel(0.9, 0.38, 1.15, 0.38, 0.24, true);
    addWheel(-0.9, 0.38, -1.15, 0.38, 0.24, false);
    addWheel(0.9, 0.38, -1.15, 0.38, 0.24, false);

    return { root, wheels, frontWheelPivots, sirenRedMat, sirenBlueMat, hasSiren: true };
  }

  // =========================================================================
  // 3. KERALA FIRE & RESCUE ENGINE
  // =========================================================================
  if (t === 'fire_engine') {
    root.add(createContactShadow(2.7));
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.48, 4.9), paintMat);
    hull.position.set(0, 1.18, 0);
    hull.castShadow = true;
    root.add(hull);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.26, 4.94), accentMat);
    stripe.position.set(0, 1.02, 0);
    root.add(stripe);

    const wind = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.68, 0.1), glassMat);
    wind.position.set(0, 1.48, 2.45);
    root.add(wind);

    // Silver roof rescue ladder
    for (const s of [-0.28, 0.28]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 3.2), chromeMat);
      rail.position.set(s, 2.02, -0.5);
      root.add(rail);
    }
    for (let z = -1.8; z <= 0.8; z += 0.5) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.08), chromeMat);
      rung.position.set(0, 2.02, z);
      root.add(rung);
    }

    addSirenBar(1.96, 1.85, 1.2, false);
    addLights(0.75, 0.82, 2.48, -2.48);

    addWheel(-1.06, 0.44, 1.58, 0.44, 0.28, true);
    addWheel(1.06, 0.44, 1.58, 0.44, 0.28, true);
    addWheel(-1.06, 0.44, -1.52, 0.44, 0.28, false);
    addWheel(1.06, 0.44, -1.52, 0.44, 0.28, false);

    return { root, wheels, frontWheelPivots, sirenRedMat, sirenBlueMat, hasSiren: true };
  }

  // =========================================================================
  // 4. KERALA AUTO-RICKSHAW
  // =========================================================================
  if (t === 'auto') {
    root.add(createContactShadow(1.4));
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.65, 2.35), paintMat);
    lower.position.set(0, 0.64, 0);
    lower.castShadow = true;
    root.add(lower);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.82, 1.98), accentMat);
    canopy.position.set(0, 1.34, -0.1);
    canopy.castShadow = true;
    root.add(canopy);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.52, 0.08), glassMat);
    windshield.position.set(0, 1.28, 0.92);
    windshield.rotation.x = -0.18;
    root.add(windshield);

    const headLamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), headlightMat);
    headLamp.position.set(0, 0.72, 1.2);
    root.add(headLamp);

    addWheel(0, 0.3, 1.02, 0.3, 0.2, true);
    addWheel(-0.68, 0.3, -0.75, 0.3, 0.2, false);
    addWheel(0.68, 0.3, -0.75, 0.3, 0.2, false);
    return { root, wheels, frontWheelPivots, hasSiren: false };
  }

  // =========================================================================
  // 5. TWO-WHEELERS: Bullet Motorcycle, Scooter, Bicycle
  // =========================================================================
  if (t === 'motorcycle' || t === 'scooter' || t === 'bicycle') {
    root.add(createContactShadow(0.95));
    const isBike = t === 'bicycle';
    const isScooter = t === 'scooter';

    const frameW = isBike ? 0.14 : isScooter ? 0.44 : 0.38;
    const frameH = isBike ? 0.34 : isScooter ? 0.48 : 0.5;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(frameW, frameH, 1.55), paintMat);
    frame.position.set(0, isBike ? 0.62 : 0.66, 0);
    frame.castShadow = true;
    root.add(frame);

    if (isScooter) {
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.78, 0.18), paintMat);
      shield.position.set(0, 0.9, 0.58);
      shield.rotation.x = -0.18;
      root.add(shield);
    } else if (!isBike) {
      const tank = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), accentMat);
      tank.scale.set(0.85, 0.72, 1.35);
      tank.position.set(0, 0.96, 0.22);
      root.add(tank);
    }

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.78, 6), chromeMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, isBike ? 1.06 : 1.12, 0.56);
    root.add(handle);

    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), headlightMat);
    hl.position.set(0, 0.98, 0.78);
    root.add(hl);

    const wheelR = isScooter ? 0.26 : 0.34;
    addWheel(0, wheelR, 0.68, wheelR, isBike ? 0.08 : 0.14, true);
    addWheel(0, wheelR, -0.68, wheelR, isBike ? 0.08 : 0.14, false);
    return { root, wheels, frontWheelPivots, hasSiren: false };
  }

  // =========================================================================
  // 6. BUSES: School Bus, Kerala Private Bus, KSRTC Red Bus, Tourist Bus, Mini Bus
  // =========================================================================
  if (
    t === 'bus' ||
    t === 'school_bus' ||
    t === 'private_bus' ||
    t === 'ksrtc_bus' ||
    t === 'tourist_bus' ||
    t === 'mini_bus'
  ) {
    const isMini = t === 'mini_bus';
    const len = isMini ? 4.4 : 5.7;
    const width = isMini ? 2.05 : 2.25;
    const height = isMini ? 1.85 : 2.15;

    root.add(createContactShadow(len * 0.54));
    const hull = new THREE.Mesh(new THREE.BoxGeometry(width, height, len), paintMat);
    hull.position.set(0, 0.5 + height / 2, 0);
    hull.castShadow = true;
    root.add(hull);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, 0.42, len + 0.05), accentMat);
    stripe.position.set(0, 1.32, 0);
    root.add(stripe);

    const wind = new THREE.Mesh(new THREE.BoxGeometry(width - 0.25, 0.82, 0.1), glassMat);
    wind.position.set(0, 1.85, len / 2 + 0.01);
    root.add(wind);

    // Side window band
    const sideWin = new THREE.Mesh(new THREE.BoxGeometry(width + 0.05, 0.62, len * 0.78), glassMat);
    sideWin.position.set(0, 1.9, -0.15);
    root.add(sideWin);

    if (t === 'tourist_bus') {
      const acPod = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 1.6), chromeMat);
      acPod.position.set(0, 0.5 + height + 0.11, 0);
      root.add(acPod);
    }

    addLights(width * 0.34, 0.86, len / 2 + 0.03, -len / 2 - 0.03);

    const wheelZ = len * 0.31;
    addWheel(-width / 2 - 0.02, 0.44, wheelZ, 0.44, 0.28, true);
    addWheel(width / 2 + 0.02, 0.44, wheelZ, 0.44, 0.28, true);
    addWheel(-width / 2 - 0.02, 0.44, -wheelZ, 0.44, 0.28, false);
    addWheel(width / 2 + 0.02, 0.44, -wheelZ, 0.44, 0.28, false);
    return { root, wheels, frontWheelPivots, hasSiren: false };
  }

  // =========================================================================
  // 7. TRUCKS & VANS: Delivery Van, Goods Truck, Mini Truck, Garbage Truck, Tow Truck
  // =========================================================================
  if (
    t === 'delivery_van' ||
    t === 'goods_truck' ||
    t === 'mini_truck' ||
    t === 'garbage_truck' ||
    t === 'tow_truck'
  ) {
    const isSmall = t === 'mini_truck' || t === 'delivery_van';
    const len = isSmall ? 3.7 : 4.7;
    const width = isSmall ? 1.75 : 2.02;

    root.add(createContactShadow(len * 0.52));

    // Cab front
    const cab = new THREE.Mesh(new THREE.BoxGeometry(width, 1.32, 1.45), paintMat);
    cab.position.set(0, 1.15, len / 2 - 0.78);
    cab.castShadow = true;
    root.add(cab);

    const wind = new THREE.Mesh(new THREE.BoxGeometry(width - 0.24, 0.55, 0.08), glassMat);
    wind.position.set(0, 1.4, len / 2 - 0.03);
    root.add(wind);

    if (t === 'tow_truck') {
      // Flatbed + orange-yellow lifting crane boom
      const bed = new THREE.Mesh(new THREE.BoxGeometry(width, 0.28, len - 1.55), darkMat);
      bed.position.set(0, 0.68, -0.78);
      root.add(bed);
      const boom = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 2.2), accentMat);
      boom.position.set(0, 1.45, -1.15);
      boom.rotation.x = 0.42;
      root.add(boom);
    } else if (t === 'garbage_truck') {
      // Green compactor drum box
      const compactor = new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, 1.48, len - 1.65), paintMat);
      compactor.position.set(0, 1.32, -0.78);
      compactor.castShadow = true;
      root.add(compactor);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, 0.28, len - 1.62), accentMat);
      stripe.position.set(0, 1.25, -0.78);
      root.add(stripe);
    } else {
      // Cargo box (delivery van / goods lorry / mini truck)
      const boxH = t === 'mini_truck' ? 0.92 : 1.52;
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, boxH, len - 1.6), accentMat);
      cargo.position.set(0, 0.58 + boxH / 2, -0.78);
      cargo.castShadow = true;
      root.add(cargo);
    }

    addLights(width * 0.34, 0.78, len / 2 - 0.02, -len / 2 - 0.02);
    const wz = len * 0.32;
    const wr = isSmall ? 0.34 : 0.42;
    addWheel(-width / 2 - 0.02, wr, wz, wr, 0.24, true);
    addWheel(width / 2 + 0.02, wr, wz, wr, 0.24, true);
    addWheel(-width / 2 - 0.02, wr, -wz, wr, 0.24, false);
    addWheel(width / 2 + 0.02, wr, -wz, wr, 0.24, false);
    return { root, wheels, frontWheelPivots, hasSiren: false };
  }

  // =========================================================================
  // 8. CARS, SUVs, JEEPS, TAXIS & SUPERCARS (compact, distinct silhouettes)
  // =========================================================================
  const isSport = t === 'lambo_sport' || t === 'ferrari_sport' || t === 'supercar';
  const isTall = t === 'suv' || t === 'jeep';
  const isHatch = t === 'hatchback';
  const isLimo = t === 'luxury_sedan';

  const len = isHatch ? 3.25 : isLimo ? 4.45 : isSport ? 4.05 : 3.75;
  const width = isHatch ? 1.68 : isSport ? 1.96 : 1.82;
  const bodyH = isSport ? 0.54 : isTall ? 0.72 : 0.62;

  root.add(createContactShadow(len * 0.54));

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(width, bodyH, len), paintMat);
  chassis.position.set(0, 0.34 + bodyH / 2, 0);
  chassis.castShadow = true;
  root.add(chassis);

  // Side accent trim
  const trim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.12, len + 0.04), accentMat);
  trim.position.set(0, 0.44, 0);
  root.add(trim);

  // Cabin greenhouse
  const cabLen = isHatch ? 1.95 : isTall ? 2.15 : isSport ? 1.7 : 1.85;
  const cabH = isSport ? 0.48 : isTall ? 0.76 : 0.6;
  const cabZ = isHatch ? -0.22 : isSport ? -0.18 : -0.12;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.28, cabH, cabLen),
    t === 'jeep' ? darkMat : glassMat,
  );
  cabin.position.set(0, 0.34 + bodyH + cabH / 2 - 0.04, cabZ);
  cabin.castShadow = true;
  root.add(cabin);

  // Painted roof cap
  const roofCap = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.32, 0.1, cabLen - 0.18),
    t === 'taxi' ? accentMat : paintMat,
  );
  roofCap.position.set(0, 0.34 + bodyH + cabH - 0.02, cabZ);
  root.add(roofCap);

  // Unique brand-inspired fictional styling accents!
  if (isLimo) {
    // Tall chrome Pantheon grille & gold bonnet ornament
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.46, 0.08), chromeMat);
    grille.position.set(0, 0.68, len / 2 + 0.03);
    root.add(grille);
    const spirit = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 5), accentMat);
    spirit.position.set(0, 1.04, len / 2 - 0.14);
    root.add(spirit);
  } else if (isSport) {
    // Rear aero wing
    const wing = new THREE.Mesh(new THREE.BoxGeometry(width - 0.08, 0.07, 0.36), accentMat);
    wing.position.set(0, 1.12, -len / 2 + 0.22);
    root.add(wing);
  } else if (t === 'taxi') {
    // Yellow glowing TAXI sign on roof
    const taxiSign = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.26), headlightMat);
    taxiSign.position.set(0, 0.34 + bodyH + cabH + 0.12, cabZ + 0.1);
    root.add(taxiSign);
  } else if (t === 'jeep') {
    const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 10), darkMat);
    spare.rotation.x = Math.PI / 2;
    spare.position.set(0, 0.92, -len / 2 - 0.1);
    root.add(spare);
  } else if (t === 'bmw_sedan') {
    for (const s of [-0.18, 0.18]) {
      const kidney = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.08), chromeMat);
      kidney.position.set(s, 0.64, len / 2 + 0.03);
      root.add(kidney);
    }
  }

  addLights(width * 0.34, 0.66, len / 2 + 0.02, -len / 2 - 0.02);

  const wz = len * 0.31;
  const wr = isTall ? 0.4 : 0.35;
  addWheel(-width / 2 - 0.01, wr, wz, wr, 0.24, true);
  addWheel(width / 2 + 0.01, wr, wz, wr, 0.24, true);
  addWheel(-width / 2 - 0.01, wr, -wz, wr, 0.24, false);
  addWheel(width / 2 + 0.01, wr, -wz, wr, 0.24, false);

  return { root, wheels, frontWheelPivots, hasSiren: false };
}
