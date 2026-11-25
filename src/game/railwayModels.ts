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
  getTrackLength,
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
 * Real sculpted multi-ridge Western Ghats Mountain Range surrounding the North, East & West horizons
 * while leaving the Airport Runway 09/27 approach corridor (z = -170..-118) and South Arabian Sea open!
 * Uses vertex-colored displaced ridge geometry for ultra-low draw calls (1 mesh per range = 60 FPS!).
 */
export function createWesternGhatsMountains(): THREE.Group {
  const group = new THREE.Group();

  const buildRidgeRange = (
    peaks: { x: number; z: number; rx: number; rz: number; h: number }[],
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    segX: number,
    segZ: number,
  ) => {
    const width = maxX - minX;
    const depth = maxZ - minZ;
    const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const col = new THREE.Color();

    const cx = (minX + maxX) * 0.5;
    const cz = (minZ + maxZ) * 0.5;

    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const wx = cx + lx;
      const wz = cz + lz;

      // Sum overlapping ridged mountain peaks + procedural craggy fold noise
      let h = 0;
      for (const p of peaks) {
        const dx = (wx - p.x) / p.rx;
        const dz = (wz - p.z) / p.rz;
        const d2 = dx * dx + dz * dz;
        if (d2 < 1.35) {
          const falloff = Math.max(0, 1 - Math.sqrt(d2) / 1.16);
          const ridged = falloff * falloff * (1.28 - 0.28 * falloff);
          h = Math.max(h, p.h * ridged);
        }
      }

      if (h > 0.6) {
        const crag =
          Math.sin(wx * 0.055 + wz * 0.042) * 3.8 +
          Math.cos(wx * 0.11 - wz * 0.095) * 2.1 +
          Math.sin((wx - wz) * 0.032) * 4.2;
        h = Math.max(0, h + crag * Math.min(1, h / 22));
      }

      // Sink edges cleanly below ground so there's zero floating skirt seam
      const edgeFadeX = Math.min(1, (width * 0.5 - Math.abs(lx)) / 18);
      const edgeFadeZ = Math.min(1, (depth * 0.5 - Math.abs(lz)) / 18);
      const finalY = h * Math.max(0, Math.min(edgeFadeX, edgeFadeZ)) - 0.6;
      pos.setY(i, finalY);

      // Authentic Western Ghats altitude shading: lush jungle base -> mossy slope -> basalt cliff -> misty summit
      const normH = Math.max(0, Math.min(1, finalY / 72));
      if (normH < 0.28) {
        col.setRGB(0.14 + normH * 0.25, 0.34 + normH * 0.22, 0.15 + normH * 0.12);
      } else if (normH < 0.62) {
        const t = (normH - 0.28) / 0.34;
        col.setRGB(0.21 + t * 0.17, 0.4 + t * 0.06, 0.19 + t * 0.14);
      } else {
        const t = (normH - 0.62) / 0.38;
        col.setRGB(0.38 + t * 0.22, 0.46 + t * 0.18, 0.33 + t * 0.29);
      }
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.02,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, 0, cz);
    return mesh;
  };

  // 1. Grand Northern Western Ghats (Sahyadri) towering behind Kerala International Airport & North Track
  group.add(
    buildRidgeRange(
      [
        { x: -245, z: -265, rx: 95, rz: 70, h: 66 },
        { x: -135, z: -275, rx: 105, rz: 74, h: 86 },
        { x: -20, z: -290, rx: 115, rz: 78, h: 98 },
        { x: 95, z: -278, rx: 105, rz: 72, h: 82 },
        { x: 215, z: -262, rx: 100, rz: 70, h: 74 },
        { x: -75, z: -242, rx: 68, rz: 44, h: 42 },
        { x: 65, z: -240, rx: 72, rz: 44, h: 46 },
      ],
      -340,
      340,
      -370,
      -205,
      46,
      18,
    ),
  );

  // 2. Eastern Ghats Mountain Chain (overlooking Ghats View Jn., keeping Runway 09/27 east approach z=-170..-118 clear!)
  group.add(
    buildRidgeRange(
      [
        { x: 270, z: -60, rx: 78, rz: 75, h: 78 },
        { x: 285, z: 25, rx: 86, rz: 82, h: 92 },
        { x: 268, z: 105, rx: 76, rz: 72, h: 64 },
        { x: 235, z: -12, rx: 48, rz: 54, h: 40 },
        { x: 238, z: 62, rx: 50, rz: 54, h: 44 },
      ],
      194,
      365,
      -116,
      172,
      18,
      32,
    ),
  );

  // 3. Western Coastal Headland Hills (overlooking Kochi Central Jn., sloping down toward the Arabian Sea)
  group.add(
    buildRidgeRange(
      [
        { x: -270, z: -55, rx: 76, rz: 75, h: 68 },
        { x: -282, z: 28, rx: 82, rz: 78, h: 76 },
        { x: -262, z: 102, rx: 72, rz: 66, h: 52 },
        { x: -234, z: -8, rx: 46, rz: 50, h: 34 },
      ],
      -365,
      -194,
      -116,
      166,
      18,
      30,
    ),
  );

  return group;
}

/**
 * Real Arabian Sea + Malabar Golden Sandy Beach Promenade + 6 Sit-able Coastal Benches +
 * Swaying Coastal Coconut Palms + Bobbing Kerala Fishing Vallams!
 */
export function createArabianSeaAndBeach(): ArabianSeaRig {
  const group = new THREE.Group();

  // 1. Golden Kerala Sandy Beach sloping gently into the Arabian Sea
  const sandGeo = new THREE.PlaneGeometry(420, 68, 24, 8);
  sandGeo.rotateX(-Math.PI / 2);
  const sPos = sandGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sPos.count; i++) {
    const lz = sPos.getZ(i); // -34 (z=146) .. +34 (z=214)
    const wz = 180 + lz;
    let y = 0.04;
    if (wz > 184) {
      y = 0.04 - ((wz - 184) / 30) * 1.1; // slopes underwater smoothly!
    }
    sPos.setY(i, y);
  }
  sandGeo.computeVertexNormals();
  const sandMat = new THREE.MeshStandardMaterial({
    color: 0xe6c88a,
    roughness: 0.94,
    metalness: 0.02,
  });
  const sandMesh = new THREE.Mesh(sandGeo, sandMat);
  sandMesh.position.set(0, 0, 180);
  sandMesh.receiveShadow = true;
  group.add(sandMesh);

  // 2. Beach Access Road connecting Main Junction Avenue (z=108) across Railway Level Crossing (z=134) straight to Beach Parking (z=170)!
  const accessRoadMat = new THREE.MeshStandardMaterial({
    color: 0x383e46,
    roughness: 0.85,
  });
  const accessRoad = new THREE.Mesh(new THREE.PlaneGeometry(11, 64), accessRoadMat);
  accessRoad.rotation.x = -Math.PI / 2;
  accessRoad.position.set(0, 0.055, 140);
  accessRoad.receiveShadow = true;
  group.add(accessRoad);

  // Beachfront Vehicle Parking & Boardwalk Promenade (ground vehicles can park right beside the sea!)
  const promenade = new THREE.Mesh(
    new THREE.BoxGeometry(92, 0.14, 7.2),
    new THREE.MeshStandardMaterial({ color: 0xc8a97e, roughness: 0.88 }),
  );
  promenade.position.set(0, 0.07, BEACH_ZONE.boardwalkZ);
  promenade.receiveShadow = true;
  group.add(promenade);

  // Decorative wooden boardwalk planks & Kerala beach welcome arch
  const archPostMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.72 });
  for (const sx of [-6.4, 6.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 4.8, 8), archPostMat);
    post.position.set(sx, 2.4, 165);
    group.add(post);
  }
  const beachSignTex = createRailwaySignTexture(
    'MALABAR GOLDEN BEACH',
    'മലബാർ ബീച്ച് · WALK OR DRIVE (NO PLANES)',
    '#0ea5e9',
    '#ffffff',
    '#fde047',
  );
  const archSign = new THREE.Mesh(
    new THREE.BoxGeometry(13.6, 1.5, 0.35),
    new THREE.MeshStandardMaterial({ map: beachSignTex, roughness: 0.45 }),
  );
  archSign.position.set(0, 4.9, 165);
  group.add(archSign);

  // 3. Six Sit-able Wooden Beach Benches facing the Arabian Sea!
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a4d1e, roughness: 0.72 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.65 });
  for (const b of BEACH_BENCHES) {
    const bench = new THREE.Group();
    bench.position.set(b.x, 0.14, b.z);
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

  // 4. Swaying Coastal Coconut Palms framing Malabar Beach
  const beachPalmCoords: [number, number][] = [
    [-58, 178],
    [-46, 181],
    [-27, 179],
    [-14, 180],
    [14, 180],
    [27, 179],
    [46, 181],
    [58, 178],
    [-78, 174],
    [78, 174],
  ];
  beachPalmCoords.forEach(([px, pz], idx) => {
    const rig = createCoconutPalmRig(9.5 + (idx % 3) * 1.4, 1.25);
    rig.root.position.set(px, 0.04, pz);
    rig.root.rotation.y = idx * 1.1;
    // Lean gently seaward like classic Kerala shoreline palms!
    rig.root.rotation.x = 0.08 + (idx % 2) * 0.05;
    group.add(rig.root);
  });

  // 5. Real Animated Arabian Sea with rolling waves, turquoise shallows & white surf foam!
  const seaUniforms = {
    uTime: { value: 0 },
    uSunColor: { value: new THREE.Color(0xfff5d6) },
    uSkyHorizon: { value: new THREE.Color(0xa9dcfa) },
    uNightFactor: { value: 0 },
  };
  const seaMat = new THREE.ShaderMaterial({
    uniforms: seaUniforms,
    transparent: true,
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying float vWave;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        float w1 = sin(worldPos.z * 0.14 - uTime * 2.1 + worldPos.x * 0.03) * 0.26;
        float w2 = cos(worldPos.x * 0.09 + uTime * 1.45 - worldPos.z * 0.08) * 0.14;
        float shoreDamp = smoothstep(188.0, 206.0, worldPos.z);
        worldPos.y += (w1 + w2) * shoreDamp;
        vWave = w1 + w2;
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

      void main() {
        float distFromShore = max(0.0, vWorldPos.z - 190.0);
        float shallowT = smoothstep(0.0, 38.0, distFromShore);
        float horizonT = smoothstep(180.0, 440.0, distFromShore);

        vec3 shallowCol = mix(vec3(0.08, 0.68, 0.74), vec3(0.03, 0.22, 0.34), uNightFactor);
        vec3 deepCol = mix(vec3(0.04, 0.29, 0.56), vec3(0.02, 0.08, 0.20), uNightFactor);
        vec3 col = mix(shallowCol, deepCol, shallowT);

        // Animated foamy white surf bands washing onto the golden sand
        float surfPhase = sin(vWorldPos.z * 0.45 - uTime * 2.6 + sin(vWorldPos.x * 0.07) * 1.6);
        float shoreFoam = (1.0 - smoothstep(0.0, 11.0, distFromShore)) * smoothstep(0.25, 0.85, surfPhase);
        float crestFoam = smoothstep(0.26, 0.38, vWave) * 0.35;
        col = mix(col, vec3(0.95, 0.98, 1.0), clamp(shoreFoam * 0.85 + crestFoam, 0.0, 0.9));

        // Sun shimmer glints dancing across wave facets
        float glint = pow(max(0.0, sin(vWorldPos.x * 0.22 + vWorldPos.z * 0.31 - uTime * 2.8)), 10.0);
        col += uSunColor * glint * 0.38 * (1.0 - uNightFactor * 0.7);

        // Blend far horizon smoothly into sky horizon
        col = mix(col, uSkyHorizon, horizonT * 0.82);

        float alpha = smoothstep(-2.0, 4.5, vWorldPos.z - 188.0);
        gl_FragColor = vec4(col, clamp(alpha * 0.94, 0.0, 0.96));
      }
    `,
  });
  const seaGeo = new THREE.PlaneGeometry(1260, 470, 52, 26);
  seaGeo.rotateX(-Math.PI / 2);
  const seaMesh = new THREE.Mesh(seaGeo, seaMat);
  seaMesh.position.set(0, -0.04, 422);
  group.add(seaMesh);

  // 6. Colorful Traditional Kerala Fishing Boats (Vallams) bobbing offshore
  const boats: ArabianSeaRig['boats'] = [];
  const boatConfigs = [
    { x: -42, z: 218, color: 0xdc2626 },
    { x: 18, z: 232, color: 0x0284c7 },
    { x: 64, z: 222, color: 0x16a34a },
  ];
  boatConfigs.forEach((bc, idx) => {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.65, 5.2),
      new THREE.MeshStandardMaterial({ color: bc.color, roughness: 0.6 }),
    );
    hull.position.y = 0.28;
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.58, 0.16, 4.8),
      new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 }),
    );
    stripe.position.y = 0.44;
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.8, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 }),
    );
    canopy.position.set(0, 0.9, -0.4);
    boat.add(hull, stripe, canopy);
    boat.position.set(bc.x, 0, bc.z);
    boat.rotation.y = 0.35 + idx * 0.7;
    group.add(boat);
    boats.push({ mesh: boat, baseX: bc.x, baseZ: bc.z, phase: idx * 2.1 });
  });

  return { group, seaUniforms, boats };
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

  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.85 });
  const yellowLineMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.55 });
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.45 });
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.5 });
  const railGuardMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.72 });

  const stationBoardTex = createRailwaySignTexture(
    `${station.name.toUpperCase()} (${station.code})`,
    station.mlName,
    '#facc15',
    '#111827',
    '#111827',
  );
  const pf1Tex = createRailwaySignTexture('PLATFORM 1', 'TRAINS: LEFT → RIGHT', '#1d4ed8', '#ffffff', '#fde047');
  const pfBTex = createRailwaySignTexture('PLATFORM B', 'TRAINS: RIGHT → LEFT', '#991b1b', '#ffffff', '#fde047');

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
export function createKeralaTrainRig(def: TrainDef): KeralaTrainRig {
  const root = new THREE.Group();
  const cars: THREE.Group[] = [];

  const locoMat = new THREE.MeshStandardMaterial({ color: def.locoColor, roughness: 0.36, metalness: 0.25 });
  const coachMat = new THREE.MeshStandardMaterial({ color: def.coachColor, roughness: 0.4, metalness: 0.22 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: def.stripeColor, roughness: 0.35 });
  const roofMat = new THREE.MeshStandardMaterial({ color: def.roofColor, roughness: 0.5 });
  const bogieMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0x1e3a5f,
    emissiveIntensity: 0.35,
    roughness: 0.12,
    metalness: 0.85,
  });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const nameBoardTex = createRailwaySignTexture(
    `${def.number} ${def.name.toUpperCase()}`,
    def.mlName,
    '#0f172a',
    '#fde047',
    '#f59e0b',
  );
  const boardMat = new THREE.MeshStandardMaterial({ map: nameBoardTex, roughness: 0.45 });

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
