import * as THREE from 'three';

export function createRoadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Realistic sun-weathered Kerala basalt tarmac with subtle crown shading
  const baseGrad = ctx.createLinearGradient(0, 0, 512, 0);
  baseGrad.addColorStop(0, '#292c31');
  baseGrad.addColorStop(0.18, '#32363c');
  baseGrad.addColorStop(0.5, '#383d44');
  baseGrad.addColorStop(0.82, '#32363c');
  baseGrad.addColorStop(1, '#292c31');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle realistic wheel-track polish strips along left & right lanes
  ctx.fillStyle = 'rgba(18, 20, 24, 0.24)';
  ctx.fillRect(92, 0, 44, 512);
  ctx.fillRect(178, 0, 44, 512);
  ctx.fillRect(290, 0, 44, 512);
  ctx.fillRect(376, 0, 44, 512);

  // Fine mineral asphalt aggregate grain (deterministic LCG for crisp tiling)
  let seed = 1337;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 6500; i++) {
    const x = nextRand() * 512;
    const y = nextRand() * 512;
    const v = 36 + Math.floor(nextRand() * 32);
    ctx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Sun-weathered warm concrete kerb shoulder strips
  ctx.fillStyle = '#686b6a';
  ctx.fillRect(0, 0, 14, 512);
  ctx.fillRect(498, 0, 14, 512);

  // Naturally weathered off-white road edge lines
  ctx.fillStyle = '#dfd9cd';
  ctx.fillRect(20, 0, 10, 512);
  ctx.fillRect(482, 0, 10, 512);

  // Realistic Kerala highway center ochre-gold dashed divider
  ctx.fillStyle = '#d8a735';
  for (let y = 16; y < 512; y += 96) {
    ctx.fillRect(250, y, 12, 54);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createGrassTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Natural lush Kerala monsoon-fed olive-emerald turf (avoids neon lime cast)
  ctx.fillStyle = '#3d6634';
  ctx.fillRect(0, 0, 512, 512);

  // Soft organic sunlit olive & deep tropical shade meadow patches
  let seed = 4242;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 160; i++) {
    const x = nextRand() * 512;
    const y = nextRand() * 512;
    const r = 16 + nextRand() * 36;
    ctx.fillStyle =
      i % 2 === 0 ? 'rgba(84, 120, 60, 0.24)' : 'rgba(38, 72, 34, 0.24)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine natural tropical grass blade texture
  for (let i = 0; i < 5500; i++) {
    const x = nextRand() * 512;
    const y = nextRand() * 512;
    const g = 88 + Math.floor(nextRand() * 44);
    const r = 52 + Math.floor(nextRand() * 32);
    const b = 38 + Math.floor(nextRand() * 18);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, 2, 5);
  }

  // Subtle Kerala red laterite earth flecks peeking through turf
  for (let i = 0; i < 240; i++) {
    ctx.fillStyle = 'rgba(130, 77, 49, 0.20)';
    ctx.beginPath();
    ctx.arc(nextRand() * 512, nextRand() * 512, 3 + nextRand() * 7, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 22);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createPlasterBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 2400; i++) {
    const v = 100 + Math.floor(Math.random() * 55);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

const _roofTileTexCache = new Map<number, THREE.CanvasTexture>();

export function createRoofTileTexture(baseHex: number, maxAnisotropy: number): THREE.CanvasTexture {
  const cached = _roofTileTexCache.get(baseHex);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const color = new THREE.Color(baseHex);
  ctx.fillStyle = `#${color.getHexString()}`;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle kiln-baked clay tonal variation per Mangalore roof tile
  let seed = (baseHex ^ 0x5a3c) >>> 0;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 24) {
      const shade = (nextRand() - 0.5) * 0.16;
      ctx.fillStyle =
        shade >= 0
          ? `rgba(255, 232, 200, ${shade.toFixed(3)})`
          : `rgba(18, 10, 6, ${(-shade).toFixed(3)})`;
      ctx.fillRect(x, y, 24, 32);
    }
  }

  // Mangalore Kerala terracotta roof ridges & overlap shadows
  ctx.strokeStyle = 'rgba(20, 10, 8, 0.28)';
  ctx.lineWidth = 3;
  for (let x = 0; x < 256; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 230, 190, 0.14)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.anisotropy = maxAnisotropy;
  _roofTileTexCache.set(baseHex, tex);
  return tex;
}

export function createSignboardTexture(
  title: string,
  subtitle: string,
  ownedBySheru: boolean,
  accentHex: number,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  const accent = new THREE.Color(accentHex);

  if (ownedBySheru) {
    ctx.fillStyle = '#14110b';
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 496, 144);
    ctx.fillStyle = '#f5c542';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ SHERU EMPIRE OWNED ★', 256, 38, 468);
    ctx.fillStyle = '#fff8dc';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(title, 256, 88, 468);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 25px sans-serif';
    ctx.fillText(subtitle, 256, 132, 468);
  } else {
    // Ensure high contrast dark background even for light accent hues
    const hsl = { h: 0, s: 0, l: 0 };
    accent.getHSL(hsl);
    if (hsl.l > 0.42) {
      accent.setHSL(hsl.h, Math.min(0.85, hsl.s), 0.28);
    }
    ctx.fillStyle = `#${accent.getHexString()}`;
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 144);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 256, 70, 468);
    ctx.fillStyle = '#ffef9f';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(subtitle, 256, 122, 468);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(10, 14, 12, 0.55)');
  grad.addColorStop(0.55, 'rgba(10, 14, 12, 0.25)');
  grad.addColorStop(1, 'rgba(10, 14, 12, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/**
 * Clean, text-free 320:50 (6.4:1) digital LED display backing behind the live 3D Adsterra banner.
 */
export function createWallBanner320x50Texture(
  _title: string,
  _isHome: boolean,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 50;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 320, 50);
  grad.addColorStop(0, '#0c1813');
  grad.addColorStop(0.5, '#13261d');
  grad.addColorStop(1, '#0c1813');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 320, 50);

  ctx.strokeStyle = '#d4a12a';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 318, 48);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Clean, text-free 300:250 (1.2:1) digital LED billboard backing behind the live 3D Adsterra 300×250 ad.
 */
export function createAdBoard300x250Texture(
  _boardName: string,
  _mlName: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 250;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 300, 250);
  grad.addColorStop(0, '#0b1611');
  grad.addColorStop(0.5, '#12241b');
  grad.addColorStop(1, '#0b1611');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 300, 250);

  ctx.strokeStyle = '#d4a12a';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 296, 246);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Crisp high-contrast 196m x 22m Kerala International Airport Runway (09 / 27) asphalt texture
 * with piano-key thresholds, touchdown zone bars, dashed centerline & subtle rubber tire marks.
 */
export function createRunwayTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Realistic weathered aviation asphalt
  ctx.fillStyle = '#282c31';
  ctx.fillRect(0, 0, 2048, 256);

  // Subtle weathered grain & centerline tire touchdown rubber streaks
  for (let i = 0; i < 900; i++) {
    const gx = (i * 197) % 2048;
    const gy = (i * 83) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(gx, gy, 8, 3);
  }
  ctx.fillStyle = 'rgba(12,14,18,0.42)';
  ctx.fillRect(260, 96, 360, 64);
  ctx.fillRect(1428, 96, 360, 64);

  // Natural off-white painted runway edge lines
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(16, 12, 2016, 7);
  ctx.fillRect(16, 237, 2016, 7);

  // Piano-key threshold markings on both ends (09 on West/left, 27 on East/right)
  for (const startX of [28, 1936]) {
    for (let k = 0; k < 6; k++) {
      const y = 28 + k * 34;
      ctx.fillRect(startX, y, 84, 18);
    }
  }

  // Runway designator numbers ("09" left, "27" right)
  ctx.save();
  ctx.fillStyle = '#e5e7eb';
  ctx.font = '900 58px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.save();
  ctx.translate(185, 128);
  ctx.rotate(Math.PI / 2);
  ctx.fillText('09', 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(1863, 128);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('27', 0, 0);
  ctx.restore();
  ctx.restore();

  // Aiming point blocks (wide white rectangles)
  for (const ax of [340, 1618]) {
    ctx.fillRect(ax, 54, 90, 26);
    ctx.fillRect(ax, 176, 90, 26);
  }

  // Touchdown zone bars
  for (const tx of [480, 560, 1408, 1488]) {
    ctx.fillRect(tx, 66, 48, 14);
    ctx.fillRect(tx, 176, 48, 14);
  }

  // Dashed white centerline along the entire runway
  for (let cx = 250; cx < 1790; cx += 92) {
    ctx.fillRect(cx, 122, 54, 12);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Airport Apron & Taxiway concrete tarmac texture with weathered ochre aircraft guide lines.
 */
export function createApronTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#5c6064';
  ctx.fillRect(0, 0, 512, 256);

  // Subtle concrete slab seams
  ctx.strokeStyle = 'rgba(28,32,36,0.28)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 512; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Weathered aviation yellow taxiway lead-in line & gate T-bars
  ctx.fillStyle = '#dbb233';
  ctx.fillRect(16, 124, 480, 8);
  for (const gx of [128, 256, 384]) {
    ctx.fillRect(gx - 3, 44, 6, 84);
    ctx.fillRect(gx - 22, 44, 44, 6);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

let _streetPuddleTexCache: THREE.CanvasTexture | null = null;

/**
 * Procedural irregular organic street rainwater puddle texture (cached once).
 * Features feathered wet rim, murky monsoon-asphalt depth gradient, and subtle specular sheen.
 */
export function createStreetPuddleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  if (_streetPuddleTexCache) return _streetPuddleTexCache;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  // Build an organic multi-lobe puddle silhouette
  ctx.save();
  ctx.beginPath();
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const lobe =
      1 +
      0.13 * Math.sin(a * 2 + 0.6) +
      0.09 * Math.cos(a * 3 - 0.8) +
      0.05 * Math.sin(a * 5 + 1.4);
    const r = (size * 0.38) * lobe;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  // Soft dark wet asphalt halo ring around puddle edge
  ctx.shadowColor = 'rgba(10, 15, 22, 0.78)';
  ctx.shadowBlur = 18;
  const grad = ctx.createRadialGradient(cx - 10, cy - 8, 6, cx, cy, size * 0.44);
  grad.addColorStop(0, 'rgba(64, 92, 118, 0.86)');
  grad.addColorStop(0.58, 'rgba(42, 64, 86, 0.78)');
  grad.addColorStop(0.84, 'rgba(24, 36, 48, 0.56)');
  grad.addColorStop(1, 'rgba(18, 26, 34, 0.0)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // Subtle realistic overcast sky reflection glint (soft, never milky white)
  ctx.save();
  const sheen = ctx.createLinearGradient(cx - 52, cy - 44, cx + 52, cy + 44);
  sheen.addColorStop(0, 'rgba(168, 198, 222, 0.22)');
  sheen.addColorStop(0.5, 'rgba(120, 150, 178, 0.07)');
  sheen.addColorStop(1, 'rgba(176, 206, 230, 0.14)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.ellipse(cx - 4, cy - 5, size * 0.22, size * 0.14, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  _streetPuddleTexCache = tex;
  return tex;
}



