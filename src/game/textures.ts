import * as THREE from 'three';

export function createRoadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm dark tropical asphalt
  ctx.fillStyle = '#333840';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle mineral grain
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 42 + Math.floor(Math.random() * 28);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Side white lines
  ctx.fillStyle = '#e8e4d5';
  ctx.fillRect(18, 0, 10, 512);
  ctx.fillRect(484, 0, 10, 512);

  // Center yellow dashed divider
  ctx.fillStyle = '#f2be35';
  for (let y = 16; y < 512; y += 96) {
    ctx.fillRect(250, y, 12, 52);
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

  // Lush Kerala monsoon emerald grass
  ctx.fillStyle = '#4e8a45';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const g = 115 + Math.floor(Math.random() * 50);
    const r = 62 + Math.floor(Math.random() * 35);
    ctx.fillStyle = `rgb(${r},${g},56)`;
    ctx.fillRect(x, y, 3, 5);
  }

  // Subtle red laterite earth speckles
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = 'rgba(155, 86, 52, 0.25)';
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, 4 + Math.random() * 8, 0, Math.PI * 2);
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
 * Exact 320:50 (6.4:1) horizontal wall banner texture mounted on shop walls & Sheru's Home.
 */
export function createWallBanner320x50Texture(
  title: string,
  isHome: boolean,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 100;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 640, 100);
  if (isHome) {
    grad.addColorStop(0, '#12261c');
    grad.addColorStop(0.5, '#1d4431');
    grad.addColorStop(1, '#2b1e0a');
  } else {
    grad.addColorStop(0, '#10202b');
    grad.addColorStop(0.5, '#17382b');
    grad.addColorStop(1, '#2d1c0c');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 640, 100);

  // Gold Kerala kasavu frame
  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 632, 92);

  // Left AD badge
  ctx.fillStyle = '#f5c542';
  ctx.fillRect(14, 16, 118, 68);
  ctx.fillStyle = '#141a17';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AD BANNER', 73, 46);
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('320 × 50', 73, 71);

  // Main headline
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff8e7';
  ctx.font = 'bold 27px sans-serif';
  ctx.fillText(
    isHome ? 'SHERU ROYAL HOME · SPONSOR BANNER' : `${title.toUpperCase()} · SPONSORED`,
    148,
    46,
    472,
  );
  ctx.fillStyle = '#9ae6b4';
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText(
    isHome
      ? 'GHOP GHOP MEME TOWN · LIVE 320×50 HOME WALL BANNER'
      : 'KERALA MEME TOWN OFFICIAL SHOP WALL BANNER · PRESS E',
    148,
    78,
    472,
  );

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Exact 300:250 (1.2:1) freestanding 3D Town Ads Board texture.
 */
export function createAdBoard300x250Texture(
  boardName: string,
  mlName: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 500;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 600, 500);
  grad.addColorStop(0, '#0f241b');
  grad.addColorStop(0.55, '#193b2c');
  grad.addColorStop(1, '#261a08');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 500);

  // Decorative gold border & corner accents
  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = 14;
  ctx.strokeRect(12, 12, 576, 476);

  // Header strip
  ctx.fillStyle = '#f5c542';
  ctx.fillRect(28, 28, 544, 62);
  ctx.fillStyle = '#141a17';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★ KERALA ADS BOARD · 300×250 ★', 300, 70, 520);

  // Center showcase box
  ctx.fillStyle = 'rgba(10, 18, 14, 0.72)';
  ctx.fillRect(36, 112, 528, 260);
  ctx.strokeStyle = '#9ae6b4';
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 112, 528, 260);

  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(boardName.toUpperCase(), 300, 185, 496);

  ctx.fillStyle = '#fff8e7';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(mlName, 300, 245, 496);

  ctx.fillStyle = '#9ae6b4';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('LIVE 300 × 250 SPONSOR DISPLAY', 300, 315, 496);

  // Interactive CTA footer
  ctx.fillStyle = '#e63946';
  ctx.fillRect(110, 396, 380, 62);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('PRESS [E] TO OPEN LIVE AD', 300, 437, 360);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

