import * as THREE from 'three';

export function createRoadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Realistic sun-baked tropical tarmac base with subtle transverse crown shading
  const baseGrad = ctx.createLinearGradient(0, 0, 512, 0);
  baseGrad.addColorStop(0, '#2a2f36');
  baseGrad.addColorStop(0.18, '#343a43');
  baseGrad.addColorStop(0.5, '#3a414b');
  baseGrad.addColorStop(0.82, '#343a43');
  baseGrad.addColorStop(1, '#2a2f36');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle realistic wheel-track polish strips along left & right lanes
  ctx.fillStyle = 'rgba(20, 23, 28, 0.22)';
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
    const v = 38 + Math.floor(nextRand() * 34);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Concrete kerb shoulder edge strips
  ctx.fillStyle = '#5c636b';
  ctx.fillRect(0, 0, 14, 512);
  ctx.fillRect(498, 0, 14, 512);

  // Crisp weathered side white lines
  ctx.fillStyle = '#ebe6d8';
  ctx.fillRect(20, 0, 10, 512);
  ctx.fillRect(482, 0, 10, 512);

  // Realistic Kerala highway center yellow dashed divider with subtle wear
  ctx.fillStyle = '#f2be35';
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

  // Rich sunlit Kerala tropical lawn base
  ctx.fillStyle = '#477f3d';
  ctx.fillRect(0, 0, 512, 512);

  // Soft dappled chlorophyll & sunlit turf patches for realistic organic variation
  let seed = 4242;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 160; i++) {
    const x = nextRand() * 512;
    const y = nextRand() * 512;
    const r = 14 + nextRand() * 32;
    ctx.fillStyle =
      i % 2 === 0 ? 'rgba(92, 152, 68, 0.22)' : 'rgba(42, 88, 38, 0.22)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine blade strokes
  for (let i = 0; i < 5500; i++) {
    const x = nextRand() * 512;
    const y = nextRand() * 512;
    const g = 104 + Math.floor(nextRand() * 56);
    const r = 54 + Math.floor(nextRand() * 34);
    ctx.fillStyle = `rgb(${r},${g},48)`;
    ctx.fillRect(x, y, 2, 5);
  }

  // Warm Kerala red laterite soil speckles
  for (let i = 0; i < 240; i++) {
    ctx.fillStyle = 'rgba(148, 82, 48, 0.22)';
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

export function createRoofTileTexture(baseHex: number, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const color = new THREE.Color(baseHex);
  ctx.fillStyle = `#${color.getHexString()}`;
  ctx.fillRect(0, 0, 256, 256);

  // Mangalore Kerala terracotta roof ridges
  ctx.strokeStyle = 'rgba(20, 10, 8, 0.28)';
  ctx.lineWidth = 3;
  for (let x = 0; x < 256; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 230, 190, 0.16)';
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

  // Deep fresh aviation asphalt
  ctx.fillStyle = '#252b33';
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

  // Solid crisp white runway edge lines
  ctx.fillStyle = '#f8fafc';
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
  ctx.fillStyle = '#f8fafc';
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
 * Airport Apron & Taxiway concrete tarmac texture with crisp yellow aircraft guide lines.
 */
export function createApronTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#525b66';
  ctx.fillRect(0, 0, 512, 256);

  // Subtle concrete slab seams
  ctx.strokeStyle = 'rgba(28,34,42,0.28)';
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

  // Yellow horizontal taxiway lead-in line & gate T-bars
  ctx.fillStyle = '#facc15';
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


