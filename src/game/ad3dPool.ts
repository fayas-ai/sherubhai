import { AABB, BuildingDef } from '../types/game';
import { AdBoardDef } from '../data/worldData';
import { AdSlotVariant } from '../components/AdSlot';

export interface Ad3DSurface {
  id: string;
  variant: AdSlotVariant;
  x: number;
  y: number;
  z: number;
  rotY: number;
  normalX: number;
  normalZ: number;
  widthM: number;
  heightM: number;
  ownerColliderId?: string;
}

/**
 * Generates exact 3D world-space surface transforms for every 300×250 Town Ads Board
 * (front & back faces) and every 320×50 Shop Wall & Sheru Home Banner in Kerala Meme Town.
 */
export function buildTown3DAdSurfaces(
  buildings: readonly BuildingDef[],
  adBoards: readonly AdBoardDef[],
): Ad3DSurface[] {
  const surfaces: Ad3DSurface[] = [];

  // 1. All freestanding 300×250 Town Ads Boards (front + back faces)
  for (const board of adBoards) {
    const boardW = 3.6;
    const boardH = 3.0;
    const boardY = 3.65;
    const offset = 0.18;

    // Front face (local +Z)
    const fnx = Math.sin(board.rotationY);
    const fnz = Math.cos(board.rotationY);
    surfaces.push({
      id: `${board.id}_front`,
      variant: 'board_300x250',
      x: board.x + fnx * offset,
      y: boardY,
      z: board.z + fnz * offset,
      rotY: board.rotationY,
      normalX: fnx,
      normalZ: fnz,
      widthM: boardW,
      heightM: boardH,
    });

    // Back face (local -Z)
    const backRotY = board.rotationY + Math.PI;
    const bnx = Math.sin(backRotY);
    const bnz = Math.cos(backRotY);
    surfaces.push({
      id: `${board.id}_back`,
      variant: 'board_300x250',
      x: board.x + bnx * offset,
      y: boardY,
      z: board.z + bnz * offset,
      rotY: backRotY,
      normalX: bnx,
      normalZ: bnz,
      widthM: boardW,
      heightM: boardH,
    });
  }

  // 2. All 320×50 Shop Wall Banners & Sheru's Royal Home Banners
  for (const b of buildings) {
    if (
      b.category === 'hospital' ||
      b.category === 'police_station' ||
      b.category === 'fire_station' ||
      b.category === 'secret'
    ) {
      continue;
    }

    const cosR = Math.cos(b.rotationY);
    const sinR = Math.sin(b.rotationY);
    const toWorld = (lx: number, lz: number) => ({
      x: b.x + lx * cosR + lz * sinR,
      z: b.z - lx * sinR + lz * cosR,
    });

    const sideBannerW = Math.min(b.depth * 0.78, 5.12);
    const sideBannerH = sideBannerW / 6.4; // exact 320:50 ratio
    const sideBannerY = Math.min(b.height - 1.0, 3.4);

    for (const side of [-1, 1] as const) {
      const lx = side * (b.width / 2 + 0.16);
      const wp = toWorld(lx, 0);
      const rotY = b.rotationY + (side > 0 ? Math.PI / 2 : -Math.PI / 2);
      surfaces.push({
        id: `${b.id}_wall_${side > 0 ? 'r' : 'l'}`,
        variant: 'banner_320x50',
        x: wp.x,
        y: sideBannerY,
        z: wp.z,
        rotY,
        normalX: Math.sin(rotY),
        normalZ: Math.cos(rotY),
        widthM: sideBannerW,
        heightM: sideBannerH,
        ownerColliderId: b.id,
      });
    }

    // Sheru's Royal Home prominent front fascia 320×50 banner
    if (b.category === 'home') {
      const wp = toWorld(0, b.depth / 2 + 0.3);
      const rotY = b.rotationY;
      surfaces.push({
        id: `${b.id}_front_banner`,
        variant: 'banner_320x50',
        x: wp.x,
        y: 6.45,
        z: wp.z,
        rotY,
        normalX: Math.sin(rotY),
        normalZ: Math.cos(rotY),
        widthM: 6.4,
        heightM: 1.0,
        ownerColliderId: b.id,
      });
    }
  }

  return surfaces;
}

/**
 * 2D slab intersection test (camera -> 3D ad surface) to prevent distant CSS3D ads
 * from bleeding through closer buildings in front of them.
 */
export function isSurfaceOccludedByBuildings(
  camX: number,
  camZ: number,
  targetX: number,
  targetZ: number,
  ownerColliderId: string | undefined,
  colliders: readonly AABB[],
): boolean {
  const dx = targetX - camX;
  const dz = targetZ - camZ;

  for (const box of colliders) {
    if (ownerColliderId && (box.id === ownerColliderId || box.id.startsWith(`${ownerColliderId}_`))) {
      continue;
    }
    // Only consider tall solid structures that can actually block sightlines
    if (box.height < 3.5) continue;

    let tmin = 0.02;
    let tmax = 0.96;

    if (Math.abs(dx) < 1e-6) {
      if (camX < box.minX || camX > box.maxX) continue;
    } else {
      const invD = 1 / dx;
      let t1 = (box.minX - camX) * invD;
      let t2 = (box.maxX - camX) * invD;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }

    if (Math.abs(dz) < 1e-6) {
      if (camZ < box.minZ || camZ > box.maxZ) continue;
    } else {
      const invD = 1 / dz;
      let t1 = (box.minZ - camZ) * invD;
      let t2 = (box.maxZ - camZ) * invD;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }

    if (tmin <= tmax && tmax >= 0.02 && tmin <= 0.96) {
      return true;
    }
  }
  return false;
}

/**
 * Selects up to `maxSlots` closest, front-facing, in-frustum, unoccluded 3D ad surfaces
 * for a given ad variant while preserving sticky slot assignments so live Adsterra iframes
 * never flicker or swap slots as the player walks past a board or shop wall.
 */
export function assignPooled3DAdSurfaces(
  camX: number,
  camZ: number,
  camFwdX: number,
  camFwdZ: number,
  surfaces: readonly Ad3DSurface[],
  variant: AdSlotVariant,
  maxSlots: number,
  maxDist: number,
  colliders: readonly AABB[],
  previousSlotSurfaceIds: readonly (string | null)[],
): (Ad3DSurface | null)[] {
  const candidates: { surface: Ad3DSurface; dist: number }[] = [];

  for (const s of surfaces) {
    if (s.variant !== variant) continue;
    const vx = s.x - camX;
    const vz = s.z - camZ;
    const dist = Math.hypot(vx, vz);
    if (dist > maxDist || dist < 0.8) continue;

    const invDist = 1 / dist;
    const toSurfX = vx * invDist;
    const toSurfZ = vz * invDist;

    // Must be in front of camera view cone (wide enough for 16:9 edges)
    const viewDot = toSurfX * camFwdX + toSurfZ * camFwdZ;
    if (viewDot < 0.2) continue;

    // Must be viewing the front side of the board/wall banner (never through the back!)
    const facingDot = s.normalX * -toSurfX + s.normalZ * -toSurfZ;
    if (facingDot < 0.05) continue;

    if (isSurfaceOccludedByBuildings(camX, camZ, s.x, s.z, s.ownerColliderId, colliders)) {
      continue;
    }

    candidates.push({ surface: s, dist });
  }

  candidates.sort((a, b) => a.dist - b.dist);
  const chosen = candidates.slice(0, maxSlots).map((c) => c.surface);
  const chosenById = new Map(chosen.map((s) => [s.id, s]));

  // Sticky slot assignment: keep already-mounted surfaces in their existing pool slot
  const result: (Ad3DSurface | null)[] = new Array(maxSlots).fill(null);
  const assignedIds = new Set<string>();

  for (let i = 0; i < maxSlots; i++) {
    const prevId = previousSlotSurfaceIds[i];
    if (prevId && chosenById.has(prevId)) {
      result[i] = chosenById.get(prevId)!;
      assignedIds.add(prevId);
    }
  }

  let nextIdx = 0;
  for (const s of chosen) {
    if (assignedIds.has(s.id)) continue;
    while (nextIdx < maxSlots && result[nextIdx] !== null) nextIdx++;
    if (nextIdx >= maxSlots) break;
    result[nextIdx] = s;
    assignedIds.add(s.id);
    nextIdx++;
  }

  return result;
}
