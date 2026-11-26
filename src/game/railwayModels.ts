import * as THREE from 'three';
import {
  BEACH_BENCHES,
  BEACH_ZONE,
  BRIDGE_DECK_Y,
  PLATFORM_CENTER_OFFSET,
  PLATFORM_LENGTH,
  PLATFORM_WIDTH,
  RAILWAY_STATIONS,
  RailwayStationDef,
  TrainDef,
  WESTERN_GHATS_RANGES,
  getTrackLength,
  sampleMountainElevation,
  sampleTrackPoint,
  stationLocalToWorld,
} from './railwayLogic';
import { createCoconutPalmRig, createContactShadow, createTownPedestrianModel } from './models';

export interface ArabianSeaRig {
  group: THREE.Group;
  seaUniforms: {
    uTime: { value: number };
    uSunColor: { value: THREE.Color };
    uSkyHorizon: { value: THREE.Color };
    uNightFactor: { value: number };
  };
  boats: { mesh: THREE.Group; baseX: number; baseZ: number; phase: number }[];
  seagulls: { mesh: THREE.Group; leftWing: THREE.Mesh; rightWing: THREE.Mesh; cx: number; cz: number; radius: number; height: number; speed: number; phase: number }[];
}

export interface KeralaTrainRig {
  def: TrainDef;
  root: THREE.Group;
  cars: THREE.Group[]; // [0]=locomotive, [1..3]=coaches
  headlightMat: THREE.MeshBasicMaterial;
}

/**
 * Generates crisp Indian Railways yellow-and-black station nameboard or train numberplate texture.
 */
function createRailwaySignTexture(
  topText: string,
  bottomText: string,
  bgHex = '#facc15',
  fgHex = '#111827',
  borderHex = '#111827',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 144;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 144);
  ctx.strokeStyle = borderHex;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 128);

  ctx.fillStyle = fgHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 40px system-ui, -apple-system, sans-serif';
  ctx.fillText(topText, 256, 54, 468);

  ctx.font = '700 26px system-ui, -apple-system, sans-serif';
  ctx.fillText(bottomText, 256, 102, 468);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural sunlit bright golden-ivory Kerala beach sand texture (warm cream-gold dunes,
 * soft wind-rippled grain & tiny shell glints — never dull brown!).
 */
function createGoldenBeachSandTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Natural sunlit Malabar golden-ochre beach sand (warm golden dunes -> damp shoreline, never chalky white or muddy brown)
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#e8cfa0'); // Warm sunlit dry Malabar sand
  grad.addColorStop(0.55, '#d9ba84'); // Golden coastal mid-beach sand
  grad.addColorStop(0.84, '#c39e66'); // Damp golden-ochre shore sand
  grad.addColorStop(1.0, '#967547'); // Wet shoreline sand glistening under surf
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Soft wind-sculpted golden sand ripples
  for (let y = 0; y < 512; y += 14) {
    ctx.strokeStyle = y < 380 ? 'rgba(255, 245, 222, 0.20)' : 'rgba(255, 238, 205, 0.12)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 32) {
      const wy = y + Math.sin(x * 0.03 + y * 0.05) * 3.5;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }

  // Fine mineral quartz sand grain & subtle shell flecks (deterministic)
  for (let i = 0; i < 2400; i++) {
    const sx = ((i * 197) % 512);
    const sy = ((i * 353 + (i >> 3) * 19) % 512);
    ctx.fillStyle =
      i % 7 === 0
        ? 'rgba(252, 244, 224, 0.44)'
        : i % 3 === 0
          ? 'rgba(182, 146, 94, 0.28)'
          : 'rgba(228, 202, 152, 0.30)';
    ctx.fillRect(sx, sy, i % 11 === 0 ? 2 : 1.5, i % 11 === 0 ? 2 : 1.5);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(6, 1);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Real sculpted multi-ridge Western Ghats Mountain Range surrounding the North, East & West horizons
 * using the EXACT shared `WESTERN_GHATS_RANGES` + `sampleMountainElevation` heightfield so
 * aeroplane mountain collision matches the 3D terrain 1:1!
 */
export function createWesternGhatsMountains(): THREE.Group {
  const group = new THREE.Group();
  const mountainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
    flatShading: false,
  });

  for (const range of WESTERN_GHATS_RANGES) {
    const width = range.maxX - range.minX;
    const depth = range.maxZ - range.minZ;
    const geo = new THREE.PlaneGeometry(width, depth, range.segX, range.segZ);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const col = new THREE.Color();

    const cx = (range.minX + range.maxX) * 0.5;
    const cz = (range.minZ + range.maxZ) * 0.5;

    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const wx = cx + lx;
      const wz = cz + lz;

      const finalY = sampleMountainElevation(wx, wz);
      pos.setY(i, finalY);

      // Realistic Western Ghats elevation palette: deep shola forest -> olive-moss ridge -> Deccan basalt -> sunlit misty summit
      const normH = Math.max(0, Math.min(1, finalY / 74));
      if (normH < 0.30) {
        const t = normH / 0.30;
        col.setRGB(0.13 + t * 0.09, 0.25 + t * 0.09, 0.14 + t * 0.05);
      } else if (normH < 0.64) {
        const t = (normH - 0.30) / 0.34;
        col.setRGB(0.22 + t * 0.14, 0.34 + t * 0.04, 0.19 + t * 0.17);
      } else {
        const t = (normH - 0.64) / 0.36;
        col.setRGB(0.36 + t * 0.16, 0.38 + t * 0.20, 0.36 + t * 0.27);
      }
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mountainMat);
    mesh.position.set(cx, 0, cz);
    group.add(mesh);
  }

  return group;
}

/**
 * Real Vibrant Arabian Sea + Sunlit Golden-Ochre Malabar Beach Promenade + 6 Sit-able Coastal Benches +
 * Coastal Umbrellas + Lifeguard Tower + Swaying Coconut Palms + Bobbing Kerala Fishing Boats + Seagulls!
 */
export function createArabianSeaAndBeach(): ArabianSeaRig {
  const group = new THREE.Group();

  // 1. Sunlit Golden-Ochre Kerala Sandy Beach sloping smoothly into the Arabian Sea (z = 160..234)
  const sandGeo = new THREE.PlaneGeometry(540, 74, 32, 12);
  sandGeo.rotateX(-Math.PI / 2);
  const sPos = sandGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sPos.count; i++) {
    const lx = sPos.getX(i);
    const lz = sPos.getZ(i); // -37 (z=160) .. +37 (z=234)
    const wz = 197 + lz;
    let y = 0.08;
    if (wz <= 187.5) {
      // Sunlit golden beach berm cleanly above y=0
      y = 0.08 + Math.sin(lx * 0.045) * 0.05;
    } else {
      // Smooth underwater seabed slope beneath the emerald-blue Arabian Sea
      y = 0.08 - ((wz - 187.5) / 36) * 1.45;
    }
    sPos.setY(i, y);
  }
  sandGeo.computeVertexNormals();
  const sandTex = createGoldenBeachSandTexture();
  const sandMat = new THREE.MeshStandardMaterial({
    map: sandTex,
    color: 0xf6ead4,
    roughness: 0.93,
    metalness: 0.02,
  });
  const sandMesh = new THREE.Mesh(sandGeo, sandMat);
  sandMesh.position.set(0, 0, 197);
  sandMesh.receiveShadow = true;
  group.add(sandMesh);

  // 2. Clean Limestone & Teak Beachfront Boardwalk Promenade (right beside the paved Beachfront Parking Blvd!)
  const promenade = new THREE.Mesh(
    new THREE.BoxGeometry(96, 0.18, 6.4),
    new THREE.MeshStandardMaterial({ color: 0xded2bc, roughness: 0.84 }),
  );
  promenade.position.set(0, 0.09, BEACH_ZONE.boardwalkZ);
  promenade.receiveShadow = true;
  group.add(promenade);

  // Decorative coastal wooden handrail border along promenade
  const railMat = new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.7 });
  for (const segX of [-30, 30]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(34, 0.1, 0.14), railMat);
    rail.position.set(segX, 0.95, BEACH_ZONE.boardwalkZ - 3.1);
    group.add(rail);
  }

  // Kerala Beach Welcome Arch at Beachfront Parking entrance (cleanly behind promenade so sea view is 100% open!)
  const archPostMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.72 });
  for (const sx of [-6.8, 6.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 5.2, 8), archPostMat);
    post.position.set(sx, 2.6, 161.2);
    group.add(post);
  }
  const beachSignTex = createRailwaySignTexture(
    'MALABAR GOLDEN BEACH',
    'മലബാർ ബീച്ച് · PARK ON ROAD · WALK TO SEA BENCHES',
    '#0284c7',
    '#ffffff',
    '#fde047',
  );
  const archSign = new THREE.Mesh(
    new THREE.BoxGeometry(14.4, 1.5, 0.32),
    new THREE.MeshStandardMaterial({ map: beachSignTex, roughness: 0.4 }),
  );
  archSign.position.set(0, 5.4, 161.2);
  group.add(archSign);

  // 3. Six Sit-able Wooden Beach Benches facing the Arabian Sea!
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a4d1e, roughness: 0.72 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.65 });
  for (const b of BEACH_BENCHES) {
    const bench = new THREE.Group();
    bench.position.set(b.x, 0.16, b.z);
    bench.rotation.y = b.facingYaw;

    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.14, 0.68), woodMat);
    seat.position.set(0, 0.52, 0);
    seat.castShadow = true;
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.56, 0.12), woodMat);
    back.position.set(0, 0.88, -0.28);
    back.rotation.x = -0.14;
    back.castShadow = true;
    bench.add(seat, back);

    for (const lx of [-1.02, 1.02]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.58), ironMat);
      leg.position.set(lx, 0.26, 0);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.58), ironMat);
      arm.position.set(lx, 0.68, -0.02);
      bench.add(leg, arm);
    }
    group.add(bench);
  }

  // 3b. Sun-bleached Malabar Coastal Umbrellas, Linen Mats & Lifeguard Watchtower (shared geometries for zero-lag!)
  const umbrellaSpots: { x: number; z: number; c1: number; c2: number }[] = [
    { x: -42, z: 182, c1: 0xc94a38, c2: 0xefe3cb },
    { x: -25, z: 183, c1: 0x2b6f91, c2: 0xf4eee2 },
    { x: -13, z: 183, c1: 0xd47d2a, c2: 0xf3e7cc },
    { x: 13, z: 183, c1: 0x2d7a5e, c2: 0xf4eee2 },
    { x: 25, z: 183, c1: 0xb33b54, c2: 0xefe1be },
    { x: 42, z: 182, c1: 0x4d5b8c, c2: 0xefe3cb },
  ];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xd4d8dc, metalness: 0.35, roughness: 0.48 });
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.7, 6);
  const canopyGeo = new THREE.ConeGeometry(2.05, 0.72, 8);
  const beachMatGeo = new THREE.BoxGeometry(2.1, 0.04, 1.2);
  const beachMatFabric = new THREE.MeshStandardMaterial({ color: 0xf1e7d2, roughness: 0.88 });
  for (const u of umbrellaSpots) {
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(u.x, 1.35, u.z);
    const canopy = new THREE.Mesh(
      canopyGeo,
      new THREE.MeshStandardMaterial({ color: u.c1, roughness: 0.74 }),
    );
    canopy.position.set(u.x, 2.72, u.z);
    const mat = new THREE.Mesh(beachMatGeo, beachMatFabric);
    mat.position.set(u.x + 0.3, 0.06, u.z + 0.5);
    group.add(pole, canopy, mat);
  }

  // Painted Coastal Lifeguard Watchtower on the East sand flank
  const tower = new THREE.Group();
  tower.position.set(52, 0.06, 181);
  const towerWood = new THREE.MeshStandardMaterial({ color: 0xeae5da, roughness: 0.74 });
  const towerRed = new THREE.MeshStandardMaterial({ color: 0xb8362e, roughness: 0.65 });
  const towerLegGeo = new THREE.BoxGeometry(0.18, 3.2, 0.18);
  for (const sx of [-1.2, 1.2]) {
    for (const sz of [-1.2, 1.2]) {
      const leg = new THREE.Mesh(towerLegGeo, towerWood);
      leg.position.set(sx, 1.6, sz);
      tower.add(leg);
    }
  }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.18, 3.0), towerWood);
  deck.position.y = 3.2;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 2.4), towerRed);
  cabin.position.y = 4.15;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 0.9, 4), towerWood);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 5.45;
  tower.add(deck, cabin, roof);
  group.add(tower);

  // 4. Swaying Coastal Coconut Palms framing Malabar Beach
  const beachPalmCoords: [number, number][] = [
    [-64, 178],
    [-49, 179],
    [-31, 178],
    [-16, 179],
    [16, 179],
    [31, 178],
    [49, 179],
    [64, 178],
    [-82, 174],
    [82, 174],
  ];
  beachPalmCoords.forEach(([px, pz], idx) => {
    const rig = createCoconutPalmRig(9.5 + (idx % 3) * 1.4, 1.25);
    rig.root.position.set(px, 0.04, pz);
    rig.root.rotation.y = idx * 1.1;
    // Lean gently seaward like classic Kerala shoreline palms!
    rig.root.rotation.x = 0.1 + (idx % 2) * 0.05;
    group.add(rig.root);
  });

  // 5. Realistic Animated Multi-Wave Arabian Sea:
  // Natural sunlit coastal emerald-teal shallows -> rich Arabian sea blue -> Fresnel sky reflection -> breaking white surf!
  const seaUniforms = {
    uTime: { value: 0 },
    uSunColor: { value: new THREE.Color(0xfff3de) },
    uSkyHorizon: { value: new THREE.Color(0xc2dcf0) },
    uNightFactor: { value: 0 },
  };
  const seaMat = new THREE.ShaderMaterial({
    uniforms: seaUniforms,
    transparent: true,
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying float vWave;
      varying float vSlope;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        float swell1 = sin(worldPos.z * 0.15 - uTime * 2.1 + sin(worldPos.x * 0.025) * 1.8) * 0.30;
        float swell2 = cos(worldPos.x * 0.085 + worldPos.z * 0.09 - uTime * 1.55) * 0.16;
        float chop = sin(worldPos.z * 0.34 - worldPos.x * 0.14 - uTime * 2.8) * 0.08;
        float shoreDamp = smoothstep(187.0, 206.0, worldPos.z);
        float h = (swell1 + swell2 + chop) * shoreDamp;
        worldPos.y += h;
        vWave = swell1 + swell2 + chop;
        vSlope = cos(worldPos.z * 0.15 - uTime * 2.1) * 0.6 + sin(worldPos.x * 0.09 - uTime * 1.5) * 0.4;
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSunColor;
      uniform vec3 uSkyHorizon;
      uniform float uNightFactor;
      varying vec3 vWorldPos;
      varying float vWave;
      varying float vSlope;

      void main() {
        float distFromShore = max(0.0, vWorldPos.z - 189.0);
        float shallowT = smoothstep(0.0, 28.0, distFromShore);
        float midT = smoothstep(24.0, 98.0, distFromShore);
        float horizonT = smoothstep(165.0, 440.0, distFromShore);

        // Physically grounded Arabian Sea palette (no neon cyan!)
        vec3 shoreEmerald = mix(vec3(0.09, 0.52, 0.54), vec3(0.03, 0.17, 0.24), uNightFactor);
        vec3 midTealBlue = mix(vec3(0.05, 0.31, 0.48), vec3(0.02, 0.10, 0.22), uNightFactor);
        vec3 deepArabian = mix(vec3(0.03, 0.16, 0.32), vec3(0.01, 0.05, 0.13), uNightFactor);

        vec3 col = mix(shoreEmerald, midTealBlue, shallowT);
        col = mix(col, deepArabian, midT);

        // Subtle Fresnel sky reflection across grazing water angles
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - max(dot(viewDir, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);
        col = mix(col, uSkyHorizon * 0.92, clamp(fresnel * 0.42, 0.0, 0.45));

        // Animated water surface ripple shading & shallow sun caustics
        float rippleA = sin(vWorldPos.x * 0.38 + vWorldPos.z * 0.52 - uTime * 2.8);
        float rippleB = cos(vWorldPos.x * 0.55 - vWorldPos.z * 0.41 + uTime * 2.2);
        float caustic = smoothstep(0.38, 0.95, rippleA * 0.55 + rippleB * 0.45);
        col += vec3(0.05, 0.16, 0.18) * caustic * (1.0 - midT * 0.65) * (1.0 - uNightFactor * 0.72);
        col += vec3(0.03, 0.07, 0.10) * clamp(vSlope, -0.4, 0.6);

        // Multi-layered rolling natural seafoam washing onto the golden sand
        float waveCurve = sin(vWorldPos.x * 0.055) * 2.2 + cos(vWorldPos.x * 0.12) * 0.9;
        float surf1 = sin((vWorldPos.z + waveCurve) * 0.46 - uTime * 2.55);
        float surf2 = sin((vWorldPos.z - waveCurve * 0.6) * 0.78 - uTime * 3.15);
        float shoreBand = 1.0 - smoothstep(0.0, 17.5, distFromShore);
        float breakingFoam = shoreBand * (smoothstep(0.38, 0.88, surf1) * 0.82 + smoothstep(0.58, 0.95, surf2) * 0.42);
        float edgeLace = (1.0 - smoothstep(0.0, 3.6, distFromShore)) * (0.55 + 0.45 * surf1);
        float crestWhitecap = smoothstep(0.30, 0.48, vWave) * 0.36 * (1.0 - horizonT * 0.6);
        float totalFoam = clamp(breakingFoam + edgeLace * 0.68 + crestWhitecap, 0.0, 0.90);
        col = mix(col, vec3(0.91, 0.94, 0.95), totalFoam);

        // Soft warm sun-glitter reflection across the waves
        float sunCorridor = exp(-pow(vWorldPos.x * 0.0085, 2.0));
        float sparkle = pow(max(0.0, rippleA * rippleB), 4.0) * (0.35 + sunCorridor * 0.85);
        col += uSunColor * sparkle * 0.48 * (1.0 - uNightFactor * 0.75);

        // Smooth atmospheric horizon haze
        col = mix(col, uSkyHorizon, horizonT * 0.82);

        float alpha = smoothstep(-1.5, 4.0, vWorldPos.z - 187.5);
        gl_FragColor = vec4(col, clamp(alpha * 0.96, 0.0, 0.97));
      }
    `,
  });
  // 48x24 mesh gives identical smooth ocean swells at 55% fewer shaded vertices every frame!
  const seaGeo = new THREE.PlaneGeometry(1320, 480, 48, 24);
  seaGeo.rotateX(-Math.PI / 2);
  const seaMesh = new THREE.Mesh(seaGeo, seaMat);
  seaMesh.position.set(0, -0.02, 427);
  group.add(seaMesh);

  // 6. Five Traditional Painted Kerala Fishing Boats (Vallams) bobbing offshore (shared geometries/materials)
  const boats: ArabianSeaRig['boats'] = [];
  const boatConfigs = [
    { x: -64, z: 220, color: 0xb8382c },
    { x: -28, z: 214, color: 0xc98229 },
    { x: 16, z: 228, color: 0x26658c },
    { x: 52, z: 218, color: 0x2c734e },
    { x: 84, z: 234, color: 0x5c4b82 },
  ];
  const boatHullGeo = new THREE.BoxGeometry(1.5, 0.65, 5.2);
  const boatStripeGeo = new THREE.BoxGeometry(1.58, 0.16, 4.8);
  const boatCanopyGeo = new THREE.BoxGeometry(1.3, 0.8, 1.8);
  const boatStripeMat = new THREE.MeshStandardMaterial({ color: 0xe6c35c, roughness: 0.58 });
  const boatCanopyMat = new THREE.MeshStandardMaterial({ color: 0xece8df, roughness: 0.74 });
  boatConfigs.forEach((bc, idx) => {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      boatHullGeo,
      new THREE.MeshStandardMaterial({ color: bc.color, roughness: 0.68 }),
    );
    hull.position.y = 0.28;
    const stripe = new THREE.Mesh(boatStripeGeo, boatStripeMat);
    stripe.position.y = 0.44;
    const canopy = new THREE.Mesh(boatCanopyGeo, boatCanopyMat);
    canopy.position.set(0, 0.9, -0.4);
    boat.add(hull, stripe, canopy);
    boat.position.set(bc.x, 0, bc.z);
    boat.rotation.y = 0.35 + idx * 0.7;
    group.add(boat);
    boats.push({ mesh: boat, baseX: bc.x, baseZ: bc.z, phase: idx * 2.1 });
  });

  // 7. Seven Soaring White Coastal Seagulls circling gently over Malabar Beach & the Arabian Sea
  const seagulls: ArabianSeaRig['seagulls'] = [];
  const gullMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
  const gullTipMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
  const gullBodyGeo = new THREE.BoxGeometry(0.18, 0.14, 0.56);
  const gullWingGeo = new THREE.BoxGeometry(0.68, 0.05, 0.2);

  for (let i = 0; i < 7; i++) {
    const gull = new THREE.Group();
    const body = new THREE.Mesh(gullBodyGeo, gullMat);
    const wingL = new THREE.Mesh(gullWingGeo, gullMat);
    wingL.position.set(-0.34, 0.02, 0);
    const wingR = new THREE.Mesh(gullWingGeo, gullMat);
    wingR.position.set(0.34, 0.02, 0);
    const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.052, 0.16), gullTipMat);
    tipL.position.set(-0.62, 0.02, 0);
    const tipR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.052, 0.16), gullTipMat);
    tipR.position.set(0.62, 0.02, 0);
    wingL.add(tipL);
    wingR.add(tipR);
    gull.add(body, wingL, wingR);

    const cx = -65 + i * 22;
    const cz = 198 + (i % 3) * 14;
    const radius = 14 + (i % 4) * 5;
    const height = 11 + (i % 3) * 3.5;
    gull.position.set(cx, height, cz);
    group.add(gull);
    seagulls.push({
      mesh: gull,
      leftWing: wingL,
      rightWing: wingR,
      cx,
      cz,
      radius,
      height,
      phase: i * 1.15,
      speed: 0.36 + (i % 3) * 0.09,
    });
  }

  return { group, seaUniforms, boats, seagulls };
}

/**
 * Builds the complete Double-Track Parallel Kerala Railway Loop around town & seaside:
 * gravel ballast bed, instanced sleepers, twin steel rails for Track A (PF 1) & Track B (PF B),
 * overhead electrified traction poles, and road level crossings!
 */
export function createDoubleTrackRailwayMesh(): THREE.Group {
  const group = new THREE.Group();
  const trackIds: ('A' | 'B')[] = ['A', 'B'];

  const ballastMat = new THREE.MeshLambertMaterial({ color: 0x78716c });
  const sleeperMat = new THREE.MeshLambertMaterial({ color: 0x4b382a });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.32, metalness: 0.85 });
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x64748b });

  // Count sleepers & rail segments across both tracks for ultra-low-draw-call InstancedMeshes!
  const sleeperStep = 2.6;
  const railStep = 4.0;
  const poleStep = 34;

  const sleeperTransforms: { x: number; z: number; yaw: number }[] = [];
  const railTransforms: { x: number; z: number; yaw: number; len: number }[] = [];
  const ballastTransforms: { x: number; z: number; yaw: number; len: number }[] = [];
  const poleTransforms: { x: number; z: number; yaw: number }[] = [];

  for (const tid of trackIds) {
    const total = getTrackLength(tid);
    for (let d = 0; d < total; d += sleeperStep) {
      const s = sampleTrackPoint(tid, d);
      sleeperTransforms.push({ x: s.x, z: s.z, yaw: s.yaw });
    }
    for (let d = 0; d < total; d += railStep) {
      const s1 = sampleTrackPoint(tid, d);
      const s2 = sampleTrackPoint(tid, d + railStep);
      const mx = (s1.x + s2.x) * 0.5;
      const mz = (s1.z + s2.z) * 0.5;
      const dx = s2.x - s1.x;
      const dz = s2.z - s1.z;
      const segLen = Math.hypot(dx, dz) + 0.08;
      const yaw = Math.atan2(dx, dz);
      // Outward/right normal for twin rails (gauge = 1.676m Indian Broad Gauge!)
      const rx = Math.cos(yaw);
      const rz = -Math.sin(yaw);
      railTransforms.push({ x: mx + rx * 0.82, z: mz + rz * 0.82, yaw, len: segLen });
      railTransforms.push({ x: mx - rx * 0.82, z: mz - rz * 0.82, yaw, len: segLen });
      ballastTransforms.push({ x: mx, z: mz, yaw, len: segLen + 0.12 });
    }
  }

  // Electrified overhead mast poles placed neatly between Track A and Track B along centerline
  const totalA = getTrackLength('A');
  for (let d = 14; d < totalA; d += poleStep) {
    const s = sampleTrackPoint('A', d);
    // Skip right inside station bridge areas
    const nearStation = RAILWAY_STATIONS.some(
      (st) => Math.hypot(s.x - st.centerX, s.z - st.centerZ) < 26,
    );
    if (nearStation) continue;
    poleTransforms.push({
      x: s.x + s.nx * 2.8,
      z: s.z + s.nz * 2.8,
      yaw: s.yaw,
    });
  }

  const dummy = new THREE.Object3D();

  // Instanced Gravel Ballast
  const ballastMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(3.2, 0.14, 1),
    ballastMat,
    ballastTransforms.length,
  );
  ballastTransforms.forEach((b, i) => {
    dummy.position.set(b.x, 0.07, b.z);
    dummy.rotation.set(0, b.yaw, 0);
    dummy.scale.set(1, 1, b.len);
    dummy.updateMatrix();
    ballastMesh.setMatrixAt(i, dummy.matrix);
  });
  ballastMesh.instanceMatrix.needsUpdate = true;
  group.add(ballastMesh);

  // Instanced Wooden/Concrete Sleepers
  const sleeperMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(2.45, 0.1, 0.34),
    sleeperMat,
    sleeperTransforms.length,
  );
  sleeperTransforms.forEach((sl, i) => {
    dummy.position.set(sl.x, 0.16, sl.z);
    dummy.rotation.set(0, sl.yaw, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    sleeperMesh.setMatrixAt(i, dummy.matrix);
  });
  sleeperMesh.instanceMatrix.needsUpdate = true;
  group.add(sleeperMesh);

  // Instanced Steel Broad-Gauge Rails
  const railMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.11, 0.13, 1),
    railMat,
    railTransforms.length,
  );
  railTransforms.forEach((rl, i) => {
    dummy.position.set(rl.x, 0.24, rl.z);
    dummy.rotation.set(0, rl.yaw, 0);
    dummy.scale.set(1, 1, rl.len);
    dummy.updateMatrix();
    railMesh.setMatrixAt(i, dummy.matrix);
  });
  railMesh.instanceMatrix.needsUpdate = true;
  group.add(railMesh);

  // Instanced Overhead Traction Mast Poles
  const poleMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.22, 6.2, 0.22),
    poleMat,
    poleTransforms.length,
  );
  const armMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(5.6, 0.14, 0.14),
    poleMat,
    poleTransforms.length,
  );
  poleTransforms.forEach((p, i) => {
    dummy.position.set(p.x, 3.1, p.z);
    dummy.rotation.set(0, p.yaw, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poleMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.set(p.x, 5.7, p.z);
    dummy.updateMatrix();
    armMesh.setMatrixAt(i, dummy.matrix);
  });
  poleMesh.instanceMatrix.needsUpdate = true;
  armMesh.instanceMatrix.needsUpdate = true;
  group.add(poleMesh, armMesh);

  // Road connectors linking East/West/North/South stations cleanly to town roads!
  const connRoadMat = new THREE.MeshStandardMaterial({ color: 0x3b4149, roughness: 0.86 });
  // West Kochi Central Jn. road connector (x=-158..-112, z=-22 -> joins West Cinema Ring Road!)
  const westConn = new THREE.Mesh(new THREE.PlaneGeometry(50, 8), connRoadMat);
  westConn.rotation.x = -Math.PI / 2;
  westConn.position.set(-134, 0.04, -22);
  // East Ghats View Jn. road connector (x=112..158, z=-22 -> joins East Harbourfront Road!)
  const eastConn = new THREE.Mesh(new THREE.PlaneGeometry(50, 8), connRoadMat);
  eastConn.rotation.x = -Math.PI / 2;
  eastConn.position.set(134, 0.04, -22);
  // North Airport Express Stn. connector (x=0, z=-170..-155)
  const northConn = new THREE.Mesh(new THREE.PlaneGeometry(9, 18), connRoadMat);
  northConn.rotation.x = -Math.PI / 2;
  northConn.position.set(0, 0.04, -165);
  group.add(westConn, eastConn, northConn);

  return group;
}

/**
 * Builds one of the 4 Kerala Railway Stations with:
 * - Platform 1 (inner track, L -> R) & Platform B (outer track, R -> L)
 * - Yellow-and-black Indian Railways Station Nameboards & Platform directional signs
 * - Sheltered platform canopies, benches & warm platform lights
 * - Walkable Elevated Foot-Overbridge (Platform Change Bridge) spanning both tracks with side stair ramps!
 */
let _stnSharedMats: {
  concreteMat: THREE.MeshStandardMaterial;
  yellowLineMat: THREE.MeshStandardMaterial;
  roofMat: THREE.MeshStandardMaterial;
  pillarMat: THREE.MeshStandardMaterial;
  bridgeMat: THREE.MeshStandardMaterial;
  railGuardMat: THREE.MeshStandardMaterial;
  benchMat: THREE.MeshStandardMaterial;
  pf1Tex: THREE.CanvasTexture;
  pfBTex: THREE.CanvasTexture;
} | null = null;

function getSharedStationAssets() {
  if (!_stnSharedMats) {
    _stnSharedMats = {
      concreteMat: new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.88 }),
      yellowLineMat: new THREE.MeshStandardMaterial({ color: 0xdcb32c, roughness: 0.68 }),
      roofMat: new THREE.MeshStandardMaterial({ color: 0x26416b, roughness: 0.58, metalness: 0.18 }),
      pillarMat: new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.52, metalness: 0.45 }),
      bridgeMat: new THREE.MeshStandardMaterial({ color: 0x3b4554, roughness: 0.56, metalness: 0.48 }),
      railGuardMat: new THREE.MeshStandardMaterial({ color: 0xc98a22, roughness: 0.50 }),
      benchMat: new THREE.MeshStandardMaterial({ color: 0x7c4620, roughness: 0.76 }),
      pf1Tex: createRailwaySignTexture('PLATFORM 1', 'TRAINS: LEFT → RIGHT', '#1f447a', '#f8fafc', '#e6c54a'),
      pfBTex: createRailwaySignTexture('PLATFORM B', 'TRAINS: RIGHT → LEFT', '#7f2424', '#f8fafc', '#e6c54a'),
    };
  }
  return _stnSharedMats;
}

export function createRailwayStationModel(station: RailwayStationDef): THREE.Group {
  const root = new THREE.Group();
  root.position.set(station.centerX, 0, station.centerZ);
  // Align local +Z along Track A travel tangent (so local +X is inward or outward!)
  const stationYaw = Math.atan2(station.tangentX, station.tangentZ);
  root.rotation.y = stationYaw;

  // Determine which local X sign corresponds to outward (+outwardX, +outwardZ)
  // For rotation.y = yaw, local +X maps to world (cos(yaw), -sin(yaw))
  const localPlusXWorldX = Math.cos(stationYaw);
  const localPlusXWorldZ = -Math.sin(stationYaw);
  const outwardSign =
    localPlusXWorldX * station.outwardX + localPlusXWorldZ * station.outwardZ >= 0 ? 1 : -1;

  const {
    concreteMat,
    yellowLineMat,
    roofMat,
    pillarMat,
    bridgeMat,
    railGuardMat,
    benchMat,
    pf1Tex,
    pfBTex,
  } = getSharedStationAssets();

  const stationBoardTex = createRailwaySignTexture(
    `${station.name.toUpperCase()} (${station.code})`,
    station.mlName,
    '#e4bc2f',
    '#141923',
    '#141923',
  );

  // Build Platform 1 (inner = -outwardSign) and Platform B (outer = +outwardSign)
  const platforms: { id: '1' | 'B'; sideSign: number; signTex: THREE.CanvasTexture }[] = [
    { id: '1', sideSign: -outwardSign, signTex: pf1Tex },
    { id: 'B', sideSign: outwardSign, signTex: pfBTex },
  ];

  for (const pf of platforms) {
    const px = pf.sideSign * PLATFORM_CENTER_OFFSET;

    // Raised concrete platform deck (y = 0.55m)
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(PLATFORM_WIDTH, 0.55, PLATFORM_LENGTH),
      concreteMat,
    );
    deck.position.set(px, 0.275, 0);
    deck.receiveShadow = true;
    root.add(deck);

    // End entry ramps at both ends of platform
    for (const endZ of [-1, 1]) {
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(PLATFORM_WIDTH, 0.26, 3.2), concreteMat);
      ramp.position.set(px, 0.18, endZ * (PLATFORM_LENGTH * 0.5 + 1.5));
      ramp.rotation.x = endZ * 0.18;
      root.add(ramp);
    }

    // Yellow safety tactile line along track edge
    const edgeX = px - pf.sideSign * (PLATFORM_WIDTH * 0.5 - 0.26);
    const safetyStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.03, PLATFORM_LENGTH - 0.5),
      yellowLineMat,
    );
    safetyStripe.position.set(edgeX, 0.56, 0);
    root.add(safetyStripe);

    // Canopy shelter roof + support pillars
    const roof = new THREE.Mesh(new THREE.BoxGeometry(PLATFORM_WIDTH + 0.5, 0.18, 28), roofMat);
    roof.position.set(px, 4.15, -2);
    roof.castShadow = true;
    root.add(roof);

    for (const pz of [-13, -5, 4, 11]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.6, 8), pillarMat);
      pillar.position.set(px + pf.sideSign * 0.8, 2.35, pz);
      root.add(pillar);
    }

    // Yellow Indian Railways Station Nameboard at both ends of platform
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 1.35, 5.2),
      new THREE.MeshStandardMaterial({ map: stationBoardTex, roughness: 0.45 }),
    );
    board.position.set(px + pf.sideSign * 1.4, 2.35, -15.5);
    root.add(board);

    // Platform 1 / Platform B Directional Hanging Sign
    const dirSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.72, 2.8),
      new THREE.MeshStandardMaterial({ map: pf.signTex, roughness: 0.45 }),
    );
    dirSign.position.set(px - pf.sideSign * 0.6, 3.48, -6);
    root.add(dirSign);

    // Waiting benches on platform
    for (const bz of [-11, -3]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.48, 2.4), benchMat);
      bench.position.set(px + pf.sideSign * 1.15, 0.79, bz);
      root.add(bench);
    }

    // Walkable Stair Ramp connecting platform (z = +11.5, y = 0.55) up to Foot-Overbridge landing (z = +2.0, y = BRIDGE_DECK_Y)
    const stairRun = 9.5;
    const stairRise = BRIDGE_DECK_Y - 0.55;
    const stairLen = Math.hypot(stairRun, stairRise);
    const stairAngle = Math.atan2(stairRise, stairRun);
    const stair = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.24, stairLen), bridgeMat);
    stair.position.set(px, 0.55 + stairRise * 0.5, 2.0 + stairRun * 0.5);
    stair.rotation.x = stairAngle;
    root.add(stair);

    // Stair railings
    for (const rOff of [-1.08, 1.08]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, stairLen), railGuardMat);
      rail.position.set(px + rOff, 0.55 + stairRise * 0.5 + 0.48, 2.0 + stairRun * 0.5);
      rail.rotation.x = stairAngle;
      root.add(rail);
    }
  }

  // Elevated Covered Foot-Overbridge (Platform Change Skybridge) spanning BOTH tracks at local z = 0!
  const spanWidth = PLATFORM_CENTER_OFFSET * 2 + 2.6;
  const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(spanWidth, 0.28, 3.8), bridgeMat);
  bridgeDeck.position.set(0, BRIDGE_DECK_Y - 0.14, 0);
  bridgeDeck.castShadow = true;
  root.add(bridgeDeck);

  // Side safety truss walls + bridge roof canopy
  for (const bz of [-1.85, 1.85]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(spanWidth, 1.15, 0.14), railGuardMat);
    wall.position.set(0, BRIDGE_DECK_Y + 0.55, bz);
    root.add(wall);
  }
  const bridgeRoof = new THREE.Mesh(new THREE.BoxGeometry(spanWidth + 0.4, 0.18, 4.2), roofMat);
  bridgeRoof.position.set(0, BRIDGE_DECK_Y + 2.65, 0);
  root.add(bridgeRoof);

  // Support columns under bridge outside the tracks
  for (const cx of [-PLATFORM_CENTER_OFFSET, PLATFORM_CENTER_OFFSET]) {
    for (const cz of [-1.7, 1.7]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.32, BRIDGE_DECK_Y + 2.6, 0.32), pillarMat);
      col.position.set(cx, (BRIDGE_DECK_Y + 2.6) * 0.5, cz);
      root.add(col);
    }
  }

  // Overhead station sign right on the foot-overbridge face so trains & passengers see it!
  const bridgeSign = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 1.25, 0.22),
    new THREE.MeshStandardMaterial({ map: stationBoardTex, roughness: 0.4 }),
  );
  bridgeSign.position.set(0, BRIDGE_DECK_Y + 1.65, -2.02);
  root.add(bridgeSign);

  const bridgeSignBack = bridgeSign.clone();
  bridgeSignBack.position.z = 2.02;
  root.add(bridgeSignBack);

  return root;
}

/**
 * Builds a detailed 4-car articulated Kerala Express Train (1 Locomotive + 3 Passenger Coaches)
 * with unique livery, train number & name side boards, glowing headlights, roof pantograph,
 * and framed passenger windows!
 */
let _trainBogieMat: THREE.MeshStandardMaterial | null = null;
let _trainGlassMat: THREE.MeshStandardMaterial | null = null;

export function createKeralaTrainRig(def: TrainDef): KeralaTrainRig {
  const root = new THREE.Group();
  const cars: THREE.Group[] = [];

  if (!_trainBogieMat) {
    _trainBogieMat = new THREE.MeshStandardMaterial({ color: 0x20262e, roughness: 0.72, metalness: 0.55 });
  }
  if (!_trainGlassMat) {
    _trainGlassMat = new THREE.MeshStandardMaterial({
      color: 0x132030,
      emissive: 0x1d3550,
      emissiveIntensity: 0.28,
      roughness: 0.14,
      metalness: 0.82,
    });
  }

  const locoMat = new THREE.MeshStandardMaterial({ color: def.locoColor, roughness: 0.34, metalness: 0.34 });
  const coachMat = new THREE.MeshStandardMaterial({ color: def.coachColor, roughness: 0.36, metalness: 0.30 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: def.stripeColor, roughness: 0.38, metalness: 0.18 });
  const roofMat = new THREE.MeshStandardMaterial({ color: def.roofColor, roughness: 0.52, metalness: 0.22 });
  const bogieMat = _trainBogieMat;
  const glassMat = _trainGlassMat;
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
  const nameBoardTex = createRailwaySignTexture(
    `${def.number} ${def.name.toUpperCase()}`,
    def.mlName,
    '#141c28',
    '#edd268',
    '#d19628',
  );
  const boardMat = new THREE.MeshStandardMaterial({ map: nameBoardTex, roughness: 0.48 });

  // 1. LOCOMOTIVE (Car 0 — 10.6m long)
  const loco = new THREE.Group();
  const locoBody = new THREE.Mesh(new THREE.BoxGeometry(2.85, 2.85, 10.4), locoMat);
  locoBody.position.y = 2.05;
  locoBody.castShadow = true;
  loco.add(locoBody);

  // Sloped aerodynamic nose & windshield
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.75, 1.9, 1.4), locoMat);
  nose.position.set(0, 1.65, 5.45);
  loco.add(nose);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.85, 0.22), glassMat);
  windshield.position.set(0, 2.72, 5.22);
  loco.add(windshield);

  // Side livery stripe
  const locoStripe = new THREE.Mesh(new THREE.BoxGeometry(2.92, 0.36, 10.5), stripeMat);
  locoStripe.position.y = 1.65;
  loco.add(locoStripe);

  // Roof + Pantograph diamond frame
  const locoRoof = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.24, 9.8), roofMat);
  locoRoof.position.y = 3.58;
  loco.add(locoRoof);
  const pantoBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 1.4), bogieMat);
  pantoBase.position.set(0, 3.76, -1.8);
  const pantoArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), bogieMat);
  pantoArm.position.set(0, 4.38, -1.8);
  pantoArm.rotation.x = 0.38;
  const pantoBar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.14), bogieMat);
  pantoBar.position.set(0, 4.98, -1.55);
  loco.add(pantoBase, pantoArm, pantoBar);

  // Glowing Front Headlights + Numberplate
  const mainHeadlight = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), headlightMat);
  mainHeadlight.position.set(0, 2.25, 6.18);
  loco.add(mainHeadlight);
  for (const hx of [-0.75, 0.75]) {
    const marker = new THREE.Mesh(new THREE.CircleGeometry(0.15, 10), headlightMat);
    marker.position.set(hx, 1.32, 6.18);
    loco.add(marker);
  }
  const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.08), boardMat);
  frontPlate.position.set(0, 1.52, 6.17);
  loco.add(frontPlate);

  // Undercarriage bogies + cowcatcher
  for (const bz of [-3.2, 3.2]) {
    const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.56, 2.6), bogieMat);
    bogie.position.set(0, 0.52, bz);
    loco.add(bogie);
  }
  const cowcatcher = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.46, 0.65), bogieMat);
  cowcatcher.position.set(0, 0.52, 6.0);
  loco.add(cowcatcher);

  root.add(loco);
  cars.push(loco);

  // 2. THREE PASSENGER COACHES (Cars 1..3 — 10.2m each, framed side windows & train nameboards!)
  for (let c = 0; c < 3; c++) {
    const coach = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.75, 10.0), coachMat);
    body.position.y = 2.0;
    body.castShadow = true;
    coach.add(body);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.34, 10.05), stripeMat);
    stripe.position.y = 1.48;
    coach.add(stripe);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.24, 9.9), roofMat);
    roof.position.y = 3.48;
    coach.add(roof);

    // Side Windows (5 large viewing windows per side!) + Doors at both ends
    for (const side of [-1, 1]) {
      for (let w = 0; w < 5; w++) {
        const wz = -3.1 + w * 1.55;
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.88, 1.08), glassMat);
        win.position.set(side * 1.4, 2.38, wz);
        coach.add(win);
      }
      // Side Train Name & Number Board
      const sideBoard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 3.2), boardMat);
      sideBoard.position.set(side * 1.42, 1.48, 0);
      coach.add(sideBoard);
    }

    // Bogies
    for (const bz of [-3.1, 3.1]) {
      const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.54, 2.4), bogieMat);
      bogie.position.set(0, 0.5, bz);
      coach.add(bogie);
    }

    root.add(coach);
    cars.push(coach);
  }

  return { def, root, cars, headlightMat };
}

/**
 * Helper to create animated station passenger rigs (reuses createTownPedestrianModel for zero extra bloat!)
 */
export function createStationPassengerRig(
  shirtColor: number,
  lowerColor: number,
  skinColor: number,
  isSaree: boolean,
) {
  const rig = createTownPedestrianModel(shirtColor, lowerColor, skinColor, isSaree);
  rig.root.add(createContactShadow(0.55));
  return rig;
}

/**
 * Helper to position all 4 articulated cars of a Kerala train cleanly along its curved/straight track.
 */
export function updateKeralaTrainRigTransform(
  rig: KeralaTrainRig,
  leadDistance: number,
): void {
  const carSpacing = 11.1; // loco -> coach1 -> coach2 -> coach3
  for (let i = 0; i < rig.cars.length; i++) {
    const carDist = leadDistance - i * carSpacing;
    const sample = sampleTrackPoint(rig.def.track, carDist);
    const car = rig.cars[i];
    car.position.set(sample.x, 0.22, sample.z);
    car.rotation.y = sample.yaw;
  }
}

export { stationLocalToWorld };
