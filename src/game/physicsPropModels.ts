import * as THREE from 'three';
import { PhysicsPropKind, WorldRamp } from './openWorldPhysics';
import { createContactShadow } from './models';

let sharedRampDeckTex: THREE.CanvasTexture | null = null;
let sharedFootballTex: THREE.CanvasTexture | null = null;
let sharedCrateTex: THREE.CanvasTexture | null = null;

function getRampDeckTexture(): THREE.CanvasTexture {
  if (sharedRampDeckTex) return sharedRampDeckTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // High-grip asphalt-concrete deck
  ctx.fillStyle = '#333b42';
  ctx.fillRect(0, 0, 256, 512);

  // Subtle gritty asphalt speckle
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 420; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 512;
    ctx.fillRect(x, y, 2, 2);
  }

  // Side safety stripes (yellow/black hazard edge)
  for (let y = 0; y < 512; y += 32) {
    ctx.fillStyle = (y / 32) % 2 === 0 ? '#facc15' : '#18181b';
    ctx.fillRect(0, y, 18, 32);
    ctx.fillRect(238, y, 18, 32);
  }

  // Forward launch chevrons pointing UP the ramp
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let cy = 96; cy <= 430; cy += 108) {
    ctx.beginPath();
    ctx.moveTo(58, cy + 44);
    ctx.lineTo(128, cy - 22);
    ctx.lineTo(198, cy + 44);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  sharedRampDeckTex = tex;
  return tex;
}

function getFootballTexture(): THREE.CanvasTexture {
  if (sharedFootballTex) return sharedFootballTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 128);

  // Bold classic black & gold Kerala street football patches
  ctx.fillStyle = '#111827';
  const patches = [
    [32, 32],
    [96, 32],
    [160, 32],
    [224, 32],
    [64, 96],
    [128, 96],
    [192, 96],
    [0, 96],
    [256, 96],
  ];
  for (const [px, py] of patches) {
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      const rx = px + Math.cos(a) * 20;
      const ry = py + Math.sin(a) * 18;
      if (k === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Gold equatorial seam highlight
  ctx.strokeStyle = '#d4a12a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 64);
  ctx.lineTo(256, 64);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  sharedFootballTex = tex;
  return tex;
}

function getCrateTexture(): THREE.CanvasTexture {
  if (sharedCrateTex) return sharedCrateTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b98249';
  ctx.fillRect(0, 0, 128, 128);

  // Horizontal wooden slats
  ctx.strokeStyle = '#6b421c';
  ctx.lineWidth = 4;
  for (let y = 24; y < 128; y += 26) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }

  // Outer timber frame & diagonal brace
  ctx.strokeStyle = '#7c4d21';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 116, 116);
  ctx.beginPath();
  ctx.moveTo(12, 12);
  ctx.lineTo(116, 116);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedCrateTex = tex;
  return tex;
}

/**
 * Builds a composite multi-part 3D Kerala Stunt Ramp whose sloped deck geometry
 * aligns 1-to-1 with `sampleWorldSurface(x, z)`.
 */
export function createStuntRampMesh(ramp: WorldRamp): THREE.Group {
  const group = new THREE.Group();
  group.position.set(ramp.x, 0, ramp.z);
  group.rotation.y = ramp.yaw;

  const halfL = ramp.length * 0.5;
  const halfW = ramp.width * 0.5;
  const h = ramp.height;

  // 1. Primary concrete wedge body (ExtrudeGeometry in YZ plane, extruded along X)
  const wedgeShape = new THREE.Shape();
  wedgeShape.moveTo(-halfL, 0);
  wedgeShape.lineTo(halfL, 0);
  wedgeShape.lineTo(halfL, h);
  wedgeShape.closePath();

  const wedgeGeo = new THREE.ExtrudeGeometry(wedgeShape, {
    depth: ramp.width - 0.12,
    bevelEnabled: false,
  });
  // ExtrudeGeometry starts in XY extruded along +Z; rotate so shape X -> local Z, shape Y -> local Y, extrude -> local X
  wedgeGeo.rotateY(-Math.PI / 2);
  wedgeGeo.translate((ramp.width - 0.12) * 0.5, 0, 0);

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.84,
    metalness: 0.12,
  });
  const wedge = new THREE.Mesh(wedgeGeo, concreteMat);
  wedge.castShadow = true;
  wedge.receiveShadow = true;
  group.add(wedge);

  // 2. High-grip chevron launch deck flush on the sloped surface
  const deckLen = Math.hypot(ramp.length, h);
  const slopeAngle = Math.atan2(h, ramp.length);
  const deckGeo = new THREE.PlaneGeometry(ramp.width, deckLen);
  const deckMat = new THREE.MeshStandardMaterial({
    map: getRampDeckTexture(),
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.08,
  });
  const deck = new THREE.Mesh(deckGeo, deckMat);
  // Rotate plane from XY to horizontal facing +Y, then tilt upward along +Z
  deck.rotation.order = 'XYZ';
  deck.rotation.x = -Math.PI / 2 - slopeAngle;
  deck.position.set(0, h * 0.5 + 0.025, 0);
  deck.receiveShadow = true;
  group.add(deck);

  // 3. Painted metallic side guard rails along both edges of the slope
  const railMat = new THREE.MeshStandardMaterial({
    color: ramp.accentColor,
    roughness: 0.34,
    metalness: 0.52,
  });
  const railGeo = new THREE.BoxGeometry(0.18, 0.28, deckLen + 0.06);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(side * (halfW - 0.06), h * 0.5 + 0.12, 0);
    rail.rotation.x = -slopeAngle;
    rail.castShadow = true;
    group.add(rail);
  }

  // 4. Heavy rear vertical steel support columns & top hazard lip bar
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.72,
  });
  const colGeo = new THREE.BoxGeometry(0.26, h, 0.26);
  for (const cx of [-halfW + 0.35, 0, halfW - 0.35]) {
    const col = new THREE.Mesh(colGeo, steelMat);
    col.position.set(cx, h * 0.5, halfL - 0.18);
    col.castShadow = true;
    group.add(col);
  }

  const lipMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: 0.25,
    roughness: 0.3,
    metalness: 0.4,
  });
  const lipBar = new THREE.Mesh(new THREE.BoxGeometry(ramp.width + 0.1, 0.14, 0.22), lipMat);
  lipBar.position.set(0, h + 0.02, halfL - 0.06);
  group.add(lipBar);

  return group;
}

export interface PhysicsPropVisualRig {
  mesh: THREE.Group;
  shadow: THREE.Mesh;
}

// Shared cached geometries & materials for crisp performance across all 32 interactive props
let cachedPropAssets: {
  ballGeo: THREE.SphereGeometry;
  ballMat: THREE.MeshStandardMaterial;
  coneBaseGeo: THREE.BoxGeometry;
  coneBodyGeo: THREE.ConeGeometry;
  coneBand1Geo: THREE.CylinderGeometry;
  coneBand2Geo: THREE.CylinderGeometry;
  coneRubberMat: THREE.MeshStandardMaterial;
  coneOrangeMat: THREE.MeshStandardMaterial;
  coneReflectMat: THREE.MeshStandardMaterial;
  crateBodyGeo: THREE.BoxGeometry;
  crateBracketGeo: THREE.BoxGeometry;
  crateMat: THREE.MeshStandardMaterial;
  ironMat: THREE.MeshStandardMaterial;
  barrelBodyGeo: THREE.CylinderGeometry;
  barrelRibGeo: THREE.CylinderGeometry;
  barrelBandGeo: THREE.CylinderGeometry;
  barrelSteelMat: THREE.MeshStandardMaterial;
  barrelAccentMat: THREE.MeshStandardMaterial;
} | null = null;

function getPropAssets() {
  if (cachedPropAssets) return cachedPropAssets;
  cachedPropAssets = {
    ballGeo: new THREE.SphereGeometry(0.34, 16, 12),
    ballMat: new THREE.MeshStandardMaterial({
      map: getFootballTexture(),
      color: 0xffffff,
      roughness: 0.34,
      metalness: 0.08,
    }),
    coneBaseGeo: new THREE.BoxGeometry(0.56, 0.08, 0.56),
    coneBodyGeo: new THREE.ConeGeometry(0.24, 0.74, 12),
    coneBand1Geo: new THREE.CylinderGeometry(0.11, 0.15, 0.13, 12),
    coneBand2Geo: new THREE.CylinderGeometry(0.17, 0.2, 0.11, 12),
    coneRubberMat: new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.88,
      metalness: 0.05,
    }),
    coneOrangeMat: new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.38,
      metalness: 0.08,
    }),
    coneReflectMat: new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xe2e8f0,
      emissiveIntensity: 0.22,
      roughness: 0.18,
      metalness: 0.32,
    }),
    crateBodyGeo: new THREE.BoxGeometry(0.94, 0.94, 0.94),
    crateBracketGeo: new THREE.BoxGeometry(0.98, 0.1, 0.98),
    crateMat: new THREE.MeshStandardMaterial({
      map: getCrateTexture(),
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.04,
    }),
    ironMat: new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.35,
      metalness: 0.78,
    }),
    barrelBodyGeo: new THREE.CylinderGeometry(0.39, 0.39, 1.08, 14),
    barrelRibGeo: new THREE.CylinderGeometry(0.415, 0.415, 0.07, 14),
    barrelBandGeo: new THREE.CylinderGeometry(0.398, 0.398, 0.34, 14),
    barrelSteelMat: new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.32,
      metalness: 0.68,
    }),
    barrelAccentMat: new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.38,
      metalness: 0.32,
    }),
  };
  return cachedPropAssets;
}

/**
 * Builds a composite multi-part 3D mesh + independent ground contact shadow
 * centered around the prop's physical center-of-mass `(0, 0, 0)` so 3D tumbling looks real!
 */
export function createRigidBodyPropVisual(kind: PhysicsPropKind): PhysicsPropVisualRig {
  const assets = getPropAssets();
  const mesh = new THREE.Group();

  if (kind === 'football') {
    const ball = new THREE.Mesh(assets.ballGeo, assets.ballMat);
    ball.castShadow = true;
    ball.receiveShadow = true;
    mesh.add(ball);
    return { mesh, shadow: createContactShadow(0.42) };
  }

  if (kind === 'cone') {
    // Center of mass at y = 0 (total height 0.84 -> spans -0.42..+0.42)
    const base = new THREE.Mesh(assets.coneBaseGeo, assets.coneRubberMat);
    base.position.y = -0.38;
    base.castShadow = true;
    mesh.add(base);

    const body = new THREE.Mesh(assets.coneBodyGeo, assets.coneOrangeMat);
    body.position.y = 0.03;
    body.castShadow = true;
    mesh.add(body);

    const band1 = new THREE.Mesh(assets.coneBand1Geo, assets.coneReflectMat);
    band1.position.y = 0.13;
    mesh.add(band1);

    const band2 = new THREE.Mesh(assets.coneBand2Geo, assets.coneReflectMat);
    band2.position.y = -0.08;
    mesh.add(band2);

    return { mesh, shadow: createContactShadow(0.45) };
  }

  if (kind === 'crate') {
    const box = new THREE.Mesh(assets.crateBodyGeo, assets.crateMat);
    box.castShadow = true;
    box.receiveShadow = true;
    mesh.add(box);

    const topRim = new THREE.Mesh(assets.crateBracketGeo, assets.ironMat);
    topRim.position.y = 0.43;
    mesh.add(topRim);

    const botRim = new THREE.Mesh(assets.crateBracketGeo, assets.ironMat);
    botRim.position.y = -0.43;
    mesh.add(botRim);

    return { mesh, shadow: createContactShadow(0.68) };
  }

  // Barrel (metallic industrial oil/coconut drum)
  const drum = new THREE.Mesh(assets.barrelBodyGeo, assets.barrelSteelMat);
  drum.castShadow = true;
  drum.receiveShadow = true;
  mesh.add(drum);

  const stripe = new THREE.Mesh(assets.barrelBandGeo, assets.barrelAccentMat);
  mesh.add(stripe);

  for (const ry of [-0.48, -0.18, 0.18, 0.48]) {
    const rib = new THREE.Mesh(assets.barrelRibGeo, assets.ironMat);
    rib.position.y = ry;
    mesh.add(rib);
  }

  return { mesh, shadow: createContactShadow(0.56) };
}
