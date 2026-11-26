import * as THREE from 'three';
import { VehicleDef } from '../types/game';
import { createContactShadow } from './models';

export interface VehicleModelRig {
  root: THREE.Group;
  bodyPivot?: THREE.Group;
  wheels: THREE.Object3D[];
  frontWheelPivots: THREE.Object3D[];
  propellers?: THREE.Object3D[];
  sirenRedMat?: THREE.MeshStandardMaterial;
  sirenBlueMat?: THREE.MeshStandardMaterial;
  hasSiren: boolean;
}

/**
 * Compact, cute, colorful low-poly cartoon 3D vehicle generator for all 28 original Kerala town vehicles.
 * Proportions match Sheru Bhai (~2.1u tall) so no vehicle looks giant or oversized,
 * and geometry stays lightweight for smooth 4GB-RAM laptop performance.
 */
let _vehGlassMat: THREE.MeshStandardMaterial | null = null;
let _vehDarkMat: THREE.MeshStandardMaterial | null = null;
let _vehChromeMat: THREE.MeshStandardMaterial | null = null;
let _vehHeadlightMat: THREE.MeshStandardMaterial | null = null;
let _vehTaillightMat: THREE.MeshStandardMaterial | null = null;

function getSharedVehicleMats() {
  if (!_vehGlassMat) {
    _vehGlassMat = new THREE.MeshStandardMaterial({
      color: 0x1b2e40,
      roughness: 0.14,
      metalness: 0.72,
      transparent: true,
      opacity: 0.84,
    });
  }
  if (!_vehDarkMat) {
    _vehDarkMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.85, metalness: 0.08 });
  }
  if (!_vehChromeMat) {
    _vehChromeMat = new THREE.MeshStandardMaterial({
      color: 0xd9dde2,
      roughness: 0.22,
      metalness: 0.88,
    });
  }
  if (!_vehHeadlightMat) {
    _vehHeadlightMat = new THREE.MeshStandardMaterial({
      color: 0xfff6d4,
      emissive: 0xffd970,
      emissiveIntensity: 0.75,
    });
  }
  if (!_vehTaillightMat) {
    _vehTaillightMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      emissive: 0xdc2626,
      emissiveIntensity: 0.5,
    });
  }
  return {
    glassMat: _vehGlassMat,
    darkMat: _vehDarkMat,
    chromeMat: _vehChromeMat,
    headlightMat: _vehHeadlightMat,
    taillightMat: _vehTaillightMat,
  };
}

export function createDetailedVehicleModel(def: VehicleDef): VehicleModelRig {
  const root = new THREE.Group();
  root.position.set(def.x, 0, def.z);
  root.rotation.y = def.rotationY;

  const wheels: THREE.Object3D[] = [];
  const frontWheelPivots: THREE.Object3D[] = [];

  const paintMat = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.26,
    metalness: 0.42,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: def.accentColor,
    roughness: 0.32,
    metalness: 0.48,
  });
  const { glassMat, darkMat, chromeMat, headlightMat, taillightMat } = getSharedVehicleMats();

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
  // 0. FLYABLE 3D KERALA AEROPLANES (Private Jet, Kerala Airways 737, Prop Plane)
  // =========================================================================
  if (t === 'airplane_jet' || t === 'airplane_airliner' || t === 'airplane_prop') {
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);
    const propellers: THREE.Object3D[] = [];

    const isAirliner = t === 'airplane_airliner';
    const isProp = t === 'airplane_prop';
    const fuseLen = isAirliner ? 10.6 : isProp ? 6.4 : 8.6;
    const fuseRadius = isAirliner ? 0.92 : isProp ? 0.56 : 0.68;
    const wingSpan = isAirliner ? 11.4 : isProp ? 7.8 : 8.8;
    const fuseY = isAirliner ? 1.65 : isProp ? 1.15 : 1.35;

    root.add(createContactShadow(isAirliner ? 4.8 : 3.4));

    const navRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 1.4,
    });
    const navGreenMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 1.4,
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: isProp ? def.color : 0xe2e8f0,
      roughness: 0.28,
      metalness: 0.42,
    });
    const engineGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.9,
    });

    // Main cylindrical fuselage (aligned along +Z forward)
    const fuselage = new THREE.Mesh(
      new THREE.CylinderGeometry(fuseRadius * 0.92, fuseRadius, fuseLen, 14),
      paintMat,
    );
    fuselage.rotation.x = Math.PI / 2;
    fuselage.position.set(0, fuseY, 0);
    fuselage.castShadow = true;
    bodyPivot.add(fuselage);

    // Aerodynamic Nose Cone (+Z)
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(fuseRadius * 0.92, isAirliner ? 2.1 : 1.75, 14),
      isProp ? accentMat : paintMat,
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, fuseY - 0.04, fuseLen / 2 + (isAirliner ? 1.05 : 0.87));
    nose.castShadow = true;
    bodyPivot.add(nose);

    // Tapered Rear Tail Cone (-Z)
    const tailCone = new THREE.Mesh(
      new THREE.ConeGeometry(fuseRadius, isAirliner ? 2.6 : 2.1, 14),
      paintMat,
    );
    tailCone.rotation.x = -Math.PI / 2;
    tailCone.position.set(0, fuseY + 0.08, -fuseLen / 2 - (isAirliner ? 1.25 : 1.0));
    bodyPivot.add(tailCone);

    // Signature Kerala / Gold fuselage accent stripe
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(fuseRadius * 2.04, isAirliner ? 0.26 : 0.18, fuseLen * 0.88),
      accentMat,
    );
    stripe.position.set(0, fuseY - 0.06, 0.1);
    bodyPivot.add(stripe);

    // Panoramic Cockpit Windshield
    const cockpit = new THREE.Mesh(
      new THREE.BoxGeometry(fuseRadius * 1.48, fuseRadius * 0.65, 1.25),
      glassMat,
    );
    cockpit.position.set(0, fuseY + fuseRadius * 0.42, fuseLen / 2 - (isProp ? 1.15 : 0.65));
    cockpit.rotation.x = -0.22;
    bodyPivot.add(cockpit);

    // Passenger Cabin Windows for Jet & Airliner
    if (!isProp) {
      const winCount = isAirliner ? 7 : 5;
      for (let i = 0; i < winCount; i++) {
        const wz = fuseLen * 0.28 - i * (isAirliner ? 1.05 : 0.95);
        for (const side of [-1, 1]) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.38), glassMat);
          win.position.set(side * (fuseRadius - 0.01), fuseY + 0.22, wz);
          bodyPivot.add(win);
        }
      }
    }

    // Swept / High Main Wings + Upturned Winglets + Navigation Lights
    const wingY = isProp ? fuseY + fuseRadius * 0.72 : fuseY - 0.18;
    const wingChord = isAirliner ? 2.2 : isProp ? 1.35 : 1.75;
    for (const side of [-1, 1]) {
      const halfSpan = wingSpan / 2;
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(halfSpan, 0.18, wingChord),
        wingMat,
      );
      wing.position.set(side * (halfSpan / 2 + 0.25), wingY, isProp ? 0.3 : -0.15);
      wing.rotation.y = isProp ? 0 : side * -0.22;
      wing.castShadow = true;
      bodyPivot.add(wing);

      // Upturned Gold/Accent Winglet
      const winglet = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.72, 0.75),
        accentMat,
      );
      winglet.position.set(
        side * (halfSpan + 0.22),
        wingY + 0.34,
        isProp ? 0.25 : -0.65,
      );
      winglet.rotation.z = side * -0.24;
      bodyPivot.add(winglet);

      // Wingtip Red (Port/Left) & Green (Starboard/Right) Aviation Nav Lights
      const navLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 8, 8),
        side < 0 ? navRedMat : navGreenMat,
      );
      navLight.position.set(
        side * (halfSpan + 0.28),
        wingY + 0.08,
        isProp ? 0.3 : -0.55,
      );
      bodyPivot.add(navLight);

      // Prop plane wing struts
      if (isProp) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.35, 0.1), darkMat);
        strut.position.set(side * 1.45, fuseY + 0.15, 0.3);
        strut.rotation.z = side * -0.58;
        bodyPivot.add(strut);
      }
    }

    // Tall Vertical Tail Fin & Horizontal Stabilizers
    const tailZ = -fuseLen / 2 - 0.85;
    const vFinH = isAirliner ? 2.75 : isProp ? 1.45 : 2.1;
    const vFin = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, vFinH, isAirliner ? 2.1 : 1.55),
      accentMat,
    );
    vFin.position.set(0, fuseY + vFinH / 2 + 0.18, tailZ);
    vFin.rotation.x = -0.22;
    vFin.castShadow = true;
    bodyPivot.add(vFin);

    const hStab = new THREE.Mesh(
      new THREE.BoxGeometry(isAirliner ? 4.4 : 3.2, 0.14, 1.05),
      wingMat,
    );
    hStab.position.set(0, isAirliner || isProp ? fuseY + 0.32 : fuseY + vFinH + 0.05, tailZ - 0.15);
    bodyPivot.add(hStab);

    // Engines (Spinning Nose Propeller OR Twin Turbofan Jet Pods!)
    if (isProp) {
      const propHub = new THREE.Group();
      propHub.position.set(0, fuseY - 0.04, fuseLen / 2 + 1.78);
      const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 10), chromeMat);
      spinner.rotation.x = Math.PI / 2;
      propHub.add(spinner);
      const blade1 = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.16, 0.06), darkMat);
      const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.15, 0.06), darkMat);
      propHub.add(blade1, blade2);
      bodyPivot.add(propHub);
      propellers.push(propHub);
    } else {
      const engPositions: [number, number, number][] = isAirliner
        ? [
            [-2.45, wingY - 0.56, 0.2],
            [2.45, wingY - 0.56, 0.2],
          ]
        : [
            [-1.12, fuseY + 0.25, -fuseLen / 2 + 0.9],
            [1.12, fuseY + 0.25, -fuseLen / 2 + 0.9],
          ];
      for (const [ex, ey, ez] of engPositions) {
        const pod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.36, 1.85, 12),
          chromeMat,
        );
        pod.rotation.x = Math.PI / 2;
        pod.position.set(ex, ey, ez);
        pod.castShadow = true;
        bodyPivot.add(pod);

        const exhaust = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.24, 0.14, 10),
          engineGlowMat,
        );
        exhaust.rotation.x = Math.PI / 2;
        exhaust.position.set(ex, ey, ez - 0.94);
        bodyPivot.add(exhaust);

        const fan = new THREE.Group();
        fan.position.set(ex, ey, ez + 0.9);
        const fBlade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.04), darkMat);
        const fBlade2 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.62, 0.04), darkMat);
        fan.add(fBlade, fBlade2);
        bodyPivot.add(fan);
        propellers.push(fan);
      }
    }

    // Tricycle Landing Gear (struts + spinning wheels)
    const addGear = (gx: number, gz: number, isNose: boolean) => {
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, fuseY - 0.32, 6),
        chromeMat,
      );
      strut.position.set(gx, (fuseY - 0.32) / 2 + 0.26, gz);
      bodyPivot.add(strut);

      const pivot = new THREE.Group();
      pivot.position.set(gx, 0.32, gz);
      bodyPivot.add(pivot);
      const spin = new THREE.Group();
      pivot.add(spin);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10), darkMat);
      tire.rotation.z = Math.PI / 2;
      spin.add(tire);
      wheels.push(spin);
      if (isNose) frontWheelPivots.push(pivot);
    };

    addGear(0, fuseLen * 0.36, true);
    addGear(-1.45, -0.35, false);
    addGear(1.45, -0.35, false);

    // Nose Landing Headlight
    const landingLamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), headlightMat);
    landingLamp.position.set(0, 0.68, fuseLen * 0.42);
    bodyPivot.add(landingLamp);

    return { root, bodyPivot, wheels, frontWheelPivots, propellers, hasSiren: false };
  }

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
