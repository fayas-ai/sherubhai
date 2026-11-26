export interface RoadSegmentDef {
  id: string;
  name: string;
  axis: 'ns' | 'ew';
  x: number;
  z: number;
  width: number;
  length: number;
  yOffset: number;
}

/**
 * Single source of truth for all paved town roads in Kerala Meme Town.
 * Used to build 3D road meshes, verify zero building/shop/tree overlap, and
 * identify road names for emergency/crash dispatches.
 */
export const TOWN_ROADS: RoadSegmentDef[] = [
  {
    id: 'mainRoadNS',
    name: 'Main Junction Avenue',
    axis: 'ns',
    x: 0,
    z: -9,
    width: 11,
    length: 234, // z: -126 (connects straight into Airport Apron!) to +108 (Marine Drive Beach)
    yOffset: 0.025,
  },
  {
    id: 'mainRoadEW',
    name: 'Central Bazaar Road',
    axis: 'ew',
    x: 0,
    z: -4,
    width: 11,
    length: 305, // x: -152.5 to +152.5
    yOffset: 0.032,
  },
  {
    id: 'northRoadEW',
    name: 'Hospital & Market Avenue',
    axis: 'ew',
    x: 0,
    z: -32,
    width: 8.5,
    length: 224,
    yOffset: 0.03,
  },
  {
    id: 'southRoadEW',
    name: 'South Resort Boulevard',
    axis: 'ew',
    x: 0,
    z: 34,
    width: 8.5,
    length: 196,
    yOffset: 0.029,
  },
  {
    id: 'westRingNS',
    name: 'West Cinema Ring Road',
    axis: 'ns',
    x: -76,
    z: 4,
    width: 9.5,
    length: 185,
    yOffset: 0.027,
  },
  {
    id: 'eastRingNS',
    name: 'East Promenade Ring Road',
    axis: 'ns',
    x: 80, // Clean 3.25m sidewalk clearance east of Kerala General Hospital (x=64, w=16)
    z: 4,
    width: 9.5,
    length: 185,
    yOffset: 0.027,
  },
  {
    id: 'southCoastalEW',
    name: 'South Coastal Highway',
    axis: 'ew',
    x: 0,
    z: 72,
    width: 9.5,
    length: 226,
    yOffset: 0.028,
  },
  {
    id: 'northHighwayEW',
    name: 'North InfoPark Highway',
    axis: 'ew',
    x: 0,
    z: -72,
    width: 10,
    length: 236,
    yOffset: 0.029,
  },
  {
    id: 'farWestNS',
    name: 'Far West Turf Boulevard',
    axis: 'ns',
    x: -108,
    z: 6,
    width: 9.5,
    length: 196,
    yOffset: 0.026,
  },
  {
    id: 'farEastNS',
    name: 'East Harbourfront Road',
    axis: 'ns',
    x: 108,
    z: 6,
    width: 9.5,
    length: 196,
    yOffset: 0.026,
  },
  {
    id: 'marineDriveEW',
    name: 'Marine Drive Coastal Road',
    axis: 'ew',
    x: 0,
    z: 104,
    width: 9.5,
    length: 226,
    yOffset: 0.027,
  },
];

export function getRoadBounds(road: RoadSegmentDef): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  const halfW = (road.axis === 'ns' ? road.width : road.length) / 2;
  const halfD = (road.axis === 'ns' ? road.length : road.width) / 2;
  return {
    minX: road.x - halfW,
    maxX: road.x + halfW,
    minZ: road.z - halfD,
    maxZ: road.z + halfD,
  };
}

export function isPointOnAnyRoad(x: number, z: number, margin = 0): boolean {
  for (const road of TOWN_ROADS) {
    const b = getRoadBounds(road);
    if (
      x >= b.minX - margin &&
      x <= b.maxX + margin &&
      z >= b.minZ - margin &&
      z <= b.maxZ + margin
    ) {
      return true;
    }
  }
  for (const road of AUX_PAVED_ROADS) {
    const b = getRoadBounds(road);
    if (
      x >= b.minX - margin &&
      x <= b.maxX + margin &&
      z >= b.minZ - margin &&
      z <= b.maxZ + margin
    ) {
      return true;
    }
  }
  return false;
}

export function getRoadNameAt(x: number, z: number, margin = 1.5): string | null {
  let bestName: string | null = null;
  let bestCenterDist = Infinity;

  const inspectList = (roads: readonly RoadSegmentDef[]) => {
    for (const road of roads) {
      const b = getRoadBounds(road);
      if (
        x >= b.minX - margin &&
        x <= b.maxX + margin &&
        z >= b.minZ - margin &&
        z <= b.maxZ + margin
      ) {
        const centerDist = road.axis === 'ns' ? Math.abs(x - road.x) : Math.abs(z - road.z);
        if (centerDist < bestCenterDist) {
          bestCenterDist = centerDist;
          bestName = road.name;
        }
      }
    }
  };

  inspectList(TOWN_ROADS);
  inspectList(AUX_PAVED_ROADS);
  return bestName;
}

export interface RoadNameDetectOptions {
  inHospital?: boolean;
  airborne?: boolean;
  onRunway?: boolean;
  onAirportTarmac?: boolean;
  margin?: number;
}

/**
 * Detect the player's current road name from the 3D world position.
 * Returns null when indoors, flying airborne, or off-road (beach sand / open grass).
 */
export function detectCurrentRoadName(
  x: number,
  z: number,
  options: RoadNameDetectOptions = {},
): string | null {
  if (options.inHospital || options.airborne) return null;
  if (options.onRunway) return 'Airport Runway 09/27';
  const road = getRoadNameAt(x, z, options.margin ?? 2.2);
  if (road) return road;
  if (options.onAirportTarmac) return 'Airport Taxiway & Apron';
  return null;
}

export function doesBoxOverlapAnyRoad(
  x: number,
  z: number,
  width: number,
  depth: number,
  rotationY = 0,
  margin = 0,
): string | null {
  const c = Math.abs(Math.cos(rotationY));
  const s = Math.abs(Math.sin(rotationY));
  const halfW = (width * c + depth * s) / 2;
  const halfD = (width * s + depth * c) / 2;

  for (const road of TOWN_ROADS) {
    const b = getRoadBounds(road);
    if (
      x + halfW > b.minX - margin &&
      x - halfW < b.maxX + margin &&
      z + halfD > b.minZ - margin &&
      z - halfD < b.maxZ + margin
    ) {
      return road.id;
    }
  }
  for (const road of AUX_PAVED_ROADS) {
    const b = getRoadBounds(road);
    if (
      x + halfW > b.minX - margin &&
      x - halfW < b.maxX + margin &&
      z + halfD > b.minZ - margin &&
      z - halfD < b.maxZ + margin
    ) {
      return road.id;
    }
  }
  return null;
}

/**
 * Paved coastal & station connector roads so ground vehicles can drive on proper asphalt
 * straight to Malabar Beach Parking (across the Railway Level Crossing) and to the stations,
 * while staying strictly OFF grass lawns, sidewalks, and beach sand!
 */
export const AUX_PAVED_ROADS: RoadSegmentDef[] = [
  {
    id: 'beachAccessWestNS',
    name: 'Malabar Beach West Access Road',
    axis: 'ns',
    x: -46,
    z: 135,
    width: 10,
    length: 62, // z: 104 (Marine Drive) -> 166 (Beachfront Parking Blvd), 24m clear west of MLB station!
    yOffset: 0.025,
  },
  {
    id: 'beachAccessEastNS',
    name: 'Malabar Beach East Access Road',
    axis: 'ns',
    x: 46,
    z: 135,
    width: 10,
    length: 62, // z: 104 (Marine Drive) -> 166 (Beachfront Parking Blvd), 24m clear east of MLB station!
    yOffset: 0.025,
  },
  {
    id: 'beachParkingEW',
    name: 'Malabar Beachfront Parking Blvd',
    axis: 'ew',
    x: 0,
    z: 165.5,
    width: 11,
    length: 112, // x: -56..+56 connecting both beach access roads right behind Malabar Beach Promenade!
    yOffset: 0.032,
  },
  {
    id: 'kochiStationSpurEW',
    name: 'Kochi Central Station Road',
    axis: 'ew',
    x: -136,
    z: -22,
    width: 8.5,
    length: 56, // x: -164..-108
    yOffset: 0.031,
  },
  {
    id: 'ghatsStationSpurEW',
    name: 'Ghats View Station Road',
    axis: 'ew',
    x: 136,
    z: -22,
    width: 8.5,
    length: 56, // x: +108..+164
    yOffset: 0.031,
  },
];

export const SHERU_STATUE_ROUNDABOUT = {
  x: 0,
  z: -4,
  pedestalRadius: 2.5,
  orbitRadius: 6.2,
  plazaRadius: 10.6,
} as const;

export const EXTRA_DRIVABLE_ZONES = [
  // Kerala Airport Concrete Apron & Terminal Drop-off
  { minX: -54, maxX: 54, minZ: -137, maxZ: -116 },
  // Hospital Emergency Porch & Bay
  { minX: 50, maxX: 76, minZ: -41, maxZ: -26 },
  // Sheru Home & Resort Front Driveways
  { minX: -36, maxX: 62, minZ: 28, maxZ: 42 },
  // Main Junction Car Showroom & Mall Parking Bays
  { minX: -56, maxX: 56, minZ: -12, maxZ: 4 },
  { minX: -22, maxX: 22, minZ: 6, maxZ: 22 },
  // Police & Fire Station Aprons
  { minX: -72, maxX: -50, minZ: -40, maxZ: -24 },
  { minX: 46, maxX: 74, minZ: 24, maxZ: 42 },
] as const;

/**
 * Returns true ONLY when (x, z) is on a paved road, roundabout plaza, beach parking blvd,
 * or designated parking/apron driveway — enforcing "no vehicles off-road"!
 */
export function isPointOnDrivablePavement(x: number, z: number, margin = 0.6): boolean {
  // Main Junction Golden Statue Roundabout Plaza (strictly outside pedestal!)
  const distStatue = Math.hypot(x - SHERU_STATUE_ROUNDABOUT.x, z - SHERU_STATUE_ROUNDABOUT.z);
  if (distStatue <= SHERU_STATUE_ROUNDABOUT.plazaRadius + margin) {
    return true;
  }

  for (const road of TOWN_ROADS) {
    const b = getRoadBounds(road);
    if (
      x >= b.minX - margin &&
      x <= b.maxX + margin &&
      z >= b.minZ - margin &&
      z <= b.maxZ + margin
    ) {
      return true;
    }
  }

  for (const road of AUX_PAVED_ROADS) {
    const b = getRoadBounds(road);
    if (
      x >= b.minX - margin &&
      x <= b.maxX + margin &&
      z >= b.minZ - margin &&
      z <= b.maxZ + margin
    ) {
      return true;
    }
  }

  for (const zone of EXTRA_DRIVABLE_ZONES) {
    if (
      x >= zone.minX - margin &&
      x <= zone.maxX + margin &&
      z >= zone.minZ - margin &&
      z <= zone.maxZ + margin
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Finds the closest paved road coordinate to (x, z) so spawned or displaced ground vehicles
 * ALWAYS sit neatly on asphalt rather than grass or beach sand.
 */
export function snapPointToNearestRoad(x: number, z: number): { x: number; z: number } {
  if (isPointOnDrivablePavement(x, z, 0)) {
    return { x, z };
  }
  let bestX = 3.2;
  let bestZ = 0;
  let bestDistSq = Infinity;
  const allRoads = [...TOWN_ROADS, ...AUX_PAVED_ROADS];
  for (const road of allRoads) {
    const b = getRoadBounds(road);
    const cx = Math.max(b.minX + 1.2, Math.min(b.maxX - 1.2, x));
    const cz = Math.max(b.minZ + 1.2, Math.min(b.maxZ - 1.2, z));
    const d2 = (cx - x) * (cx - x) + (cz - z) * (cz - z);
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      bestX = cx;
      bestZ = cz;
    }
  }
  return { x: bestX, z: bestZ };
}

/**
 * Road-only containment for ground vehicles ("no vehicles in road allatha sthalath pokan padillah"):
 * Allows smooth curb-sliding along the road edge while blocking off-road excursions into grass/sand.
 */
export function constrainVehicleToDrivableRoads(
  prevX: number,
  prevZ: number,
  nextX: number,
  nextZ: number,
): { x: number; z: number; hitCurb: boolean } {
  if (isPointOnDrivablePavement(nextX, nextZ, 0.35)) {
    return { x: nextX, z: nextZ, hitCurb: false };
  }
  // Try axis-separated curb slide so turning near a curb feels buttery smooth!
  const slideXOk = isPointOnDrivablePavement(nextX, prevZ, 0.35);
  const slideZOk = isPointOnDrivablePavement(prevX, nextZ, 0.35);
  if (slideXOk) return { x: nextX, z: prevZ, hitCurb: true };
  if (slideZOk) return { x: prevX, z: nextZ, hitCurb: true };

  // If somehow already slightly outside pavement, pull smoothly back onto nearest road
  if (!isPointOnDrivablePavement(prevX, prevZ, 0.6)) {
    const snapped = snapPointToNearestRoad(nextX, nextZ);
    return { x: snapped.x, z: snapped.z, hitCurb: true };
  }
  return { x: prevX, z: prevZ, hitCurb: true };
}

/**
 * Computes a clean road-following steering target for Auto-Destination driving that:
 * 1) Uses proper ±3.0m road lanes instead of centerline (x=0, z=-4)
 * 2) Smoothly orbits the Golden Sheru Bhai Statue Roundabout (0, -4) at radius 6.2m — NEVER hits the statue!
 */
export function computeRoadAutopilotTarget(
  vehX: number,
  vehZ: number,
  destX: number,
  destZ: number,
): { targetX: number; targetZ: number; roundingStatue: boolean } {
  const roadZs = [-122, -72, -32, -4, 34, 72, 104, 165.5];
  let destRoadZ = -4;
  let bestRoadDist = Infinity;
  for (const rz of roadZs) {
    const d = Math.abs(destZ - rz);
    if (d < bestRoadDist) {
      bestRoadDist = d;
      destRoadZ = rz;
    }
  }

  const dist = Math.hypot(destX - vehX, destZ - vehZ);
  let targetX = destX;
  let targetZ = destZ;

  const onDestRoad = Math.abs(vehZ - destRoadZ) < 8;
  const nearCenterAve = Math.abs(vehX) < 8;
  if (!onDestRoad && dist > 16) {
    if (!nearCenterAve) {
      let curRoadZ = -4;
      let bestCur = Infinity;
      for (const rz of roadZs) {
        const d = Math.abs(vehZ - rz);
        if (d < bestCur) {
          bestCur = d;
          curRoadZ = rz;
        }
      }
      // Proper lane offset heading toward Main Junction Avenue (avoiding z=-4 center!)
      const goingEast = vehX < 0;
      targetX = goingEast ? -3.1 : 3.1;
      targetZ = curRoadZ + (goingEast ? 2.6 : -2.6);
    } else {
      // Proper lane offset along Main Junction Avenue (NEVER x = 0 through the statue!)
      const goingSouth = destRoadZ > vehZ;
      targetX = goingSouth ? -3.1 : 3.1;
      targetZ = destRoadZ;
    }
  } else if (onDestRoad && dist > 14 && Math.abs(destRoadZ - -4) < 2) {
    // Keep proper lane along Central Bazaar Road (z = -4)
    const goingEast = destX > vehX;
    targetZ = -4 + (goingEast ? 3.0 : -3.0);
  }

  // Sheru Statue Roundabout Avoidance Guard:
  // If vehicle is near (0, -4) OR straight segment to target passes within 5.0m of statue center,
  // steer smoothly around the roundabout orbit (radius 6.4m) counter-clockwise!
  const sx = SHERU_STATUE_ROUNDABOUT.x;
  const sz = SHERU_STATUE_ROUNDABOUT.z;
  const toSegX = targetX - vehX;
  const toSegZ = targetZ - vehZ;
  const segLenSq = toSegX * toSegX + toSegZ * toSegZ;
  let closestDistToStatue = Math.hypot(vehX - sx, vehZ - sz);
  if (segLenSq > 0.01) {
    const t = Math.max(0, Math.min(1, ((sx - vehX) * toSegX + (sz - vehZ) * toSegZ) / segLenSq));
    const cx = vehX + toSegX * t;
    const cz = vehZ + toSegZ * t;
    closestDistToStatue = Math.hypot(cx - sx, cz - sz);
  }

  const distNow = Math.hypot(vehX - sx, vehZ - sz);
  if (distNow < 13.5 && closestDistToStatue < 5.2) {
    // Steer tangentially along the 6.6m roundabout orbit circle around the Golden Statue!
    const angleFromStatue = Math.atan2(vehX - sx, vehZ - sz);
    const orbitStep = 0.65; // ~37° ahead counter-clockwise along roundabout
    const nextAngle = angleFromStatue + orbitStep;
    const orbitR = 6.6;
    return {
      targetX: sx + Math.sin(nextAngle) * orbitR,
      targetZ: sz + Math.cos(nextAngle) * orbitR,
      roundingStatue: true,
    };
  }

  return { targetX, targetZ, roundingStatue: false };
}

export interface SirenSource {
  x: number;
  z: number;
  yaw: number;
}

export interface SirenYieldResult {
  yielding: boolean;
  pullOverX: number;
  pullOverZ: number;
  speedScale: number;
  hazardFlash: boolean;
}

/**
 * Siren Emergency Yield Physics ("siren vehicles varumbol all vehicles side kodukkanam"):
 * When ANY active siren vehicle (108 Ambulance, Police Jeep, Fire Engine) approaches within 44m,
 * every non-emergency road vehicle pulls over laterally toward the outer road shoulder/curb
 * and slows to a stop so the center emergency lane stays wide open!
 */
export function computeSirenYieldBehavior(
  aiX: number,
  aiZ: number,
  aiYaw: number,
  sirenSources: SirenSource[],
): SirenYieldResult {
  if (sirenSources.length === 0) {
    return { yielding: false, pullOverX: 0, pullOverZ: 0, speedScale: 1, hazardFlash: false };
  }

  let nearest: SirenSource | null = null;
  let bestDist = Infinity;
  for (const s of sirenSources) {
    const d = Math.hypot(s.x - aiX, s.z - aiZ);
    if (d < bestDist) {
      bestDist = d;
      nearest = s;
    }
  }

  if (!nearest || bestDist > 44) {
    return { yielding: false, pullOverX: 0, pullOverZ: 0, speedScale: 1, hazardFlash: false };
  }

  // Vehicle right/left perpendicular vector (pull strictly toward the outer curb away from road centerline!)
  const fwdX = Math.sin(aiYaw);
  const fwdZ = Math.cos(aiYaw);
  // Left shoulder vector (Indian left-hand traffic standard: pull to the left curb!)
  let sideX = fwdZ;
  let sideZ = -fwdX;

  // Verify which side pushes AWAY from the approaching siren vehicle so we never steer into it!
  const awayX = aiX - nearest.x;
  const awayZ = aiZ - nearest.z;
  const dot = sideX * awayX + sideZ * awayZ;
  if (dot < -0.25) {
    sideX = -sideX;
    sideZ = -sideZ;
  }

  // Stronger pull-over & full stop as siren closes within 28m
  const urgency = Math.max(0.25, Math.min(1, (44 - bestDist) / 22));
  const pullMag = 2.6 * urgency;
  const speedScale = bestDist < 24 ? 0.0 : bestDist < 34 ? 0.12 : 0.32;

  return {
    yielding: true,
    pullOverX: sideX * pullMag,
    pullOverZ: sideZ * pullMag,
    speedScale,
    hazardFlash: true,
  };
}

/**
 * Curated interactive Kerala Coconut Palms positioned strictly on sidewalks & lawns
 * (>= 2.8m clear of every road edge and clear of all buildings & Airport corridor).
 */
export const TOWN_PALM_TREES: [number, number, number][] = [
  [-9.5, 13.5, 8.6],
  [9.5, 13.5, 8.8],
  [-10, -23.5, 9.2],
  [10, -23.5, 10.1],
  [-26, -23.5, 9.6],
  [26, -23.5, 9.0],
  [-26, 14, 10.5],
  [26, 14, 9.4],
  [-10, 26, 9.8],
  [10, 26, 10.3],
  [-49, -23.5, 11.0],
  [50, -23.5, 10.2],
  [-52, 6.5, 9.5],
  [52, 6.5, 9.8],
  [-36, 42.5, 10.0],
  [36, 42.5, 9.2],
  [9.5, 22, 9.6],
  [-9.5, 22, 9.8],
  [-67, -14, 10.2],
  [69, 26, 9.8],
  [-54, 63, 10.4],
  [54, 63, 10.0],
  [-28, -62.5, 10.2],
  [28, -62.5, 10.5],
  [-98, -42, 10.4],
  [98, -42, 9.9],
  [-98, 44, 10.2],
  [98, 44, 10.0],
  [-32, 95, 10.6],
  [32, 95, 10.4],
];

export interface TownCrowdRoute {
  id: string;
  district: string;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  speed: number;
  shirtColor: number;
  lowerColor: number;
  skinColor: number;
  isSaree?: boolean;
}

/**
 * 48 lively Kerala townspeople walking along safe sidewalks & plazas across
 * EVERY district of the entire expanded town (100% clear of all paved roads!).
 */
export const TOWN_CROWD_ROUTES: TownCrowdRoute[] = [
  // Main Junction & Central Bazaar (8)
  { id: 'crowd_mj_1', district: 'Main Junction', ax: -7.2, az: 11.5, bx: -7.2, bz: 25, speed: 1.55, shirtColor: 0xfef3c7, lowerColor: 0xffffff, skinColor: 0xb68158 },
  { id: 'crowd_mj_2', district: 'Main Junction', ax: 8, az: 25, bx: 8, bz: 3.5, speed: 1.65, shirtColor: 0x0ea5e9, lowerColor: 0x1e293b, skinColor: 0xc28b62 },
  { id: 'crowd_mj_3', district: 'Main Junction', ax: -26, az: -10.8, bx: -8, bz: -10.8, speed: 1.5, shirtColor: 0xf43f5e, lowerColor: 0xfde047, skinColor: 0xb88055, isSaree: true },
  { id: 'crowd_mj_4', district: 'Main Junction', ax: 8, az: -10.8, bx: 28, bz: -10.8, speed: 1.7, shirtColor: 0x10b981, lowerColor: 0xf8fafc, skinColor: 0xaa734c },
  { id: 'crowd_mj_5', district: 'Main Junction', ax: -8, az: -26, bx: -8, bz: -11, speed: 1.45, shirtColor: 0xf59e0b, lowerColor: 0x1e3a8a, skinColor: 0xc48e65 },
  { id: 'crowd_mj_6', district: 'Main Junction', ax: 8, az: -11, bx: 8, bz: -26, speed: 1.6, shirtColor: 0x8b5cf6, lowerColor: 0xfef9c3, skinColor: 0xb27b52, isSaree: true },
  { id: 'crowd_mj_7', district: 'Main Junction', ax: -30, az: 3.5, bx: -10, bz: 3.5, speed: 1.5, shirtColor: 0xec4899, lowerColor: 0xfafaf9, skinColor: 0xc18a61, isSaree: true },
  { id: 'crowd_mj_8', district: 'Main Junction', ax: 10, az: 3.5, bx: 32, bz: 3.5, speed: 1.75, shirtColor: 0x3b82f6, lowerColor: 0x334155, skinColor: 0xac764f },

  // Sweet Street, Spice Avenue & Market Yard (6)
  { id: 'crowd_sw_1', district: 'Sweet Street', ax: -52, az: -10.8, bx: -32, bz: -10.8, speed: 1.55, shirtColor: 0xf97316, lowerColor: 0xf8fafc, skinColor: 0xb88158 },
  { id: 'crowd_sw_2', district: 'Spice Avenue', ax: 30, az: 3.2, bx: 54, bz: 3.2, speed: 1.65, shirtColor: 0x14b8a6, lowerColor: 0x0f172a, skinColor: 0xc28a60 },
  { id: 'crowd_sw_3', district: 'Spice Avenue', ax: 30, az: 12, bx: 52, bz: 12, speed: 1.5, shirtColor: 0xeab308, lowerColor: 0x991b1b, skinColor: 0xb07950, isSaree: true },
  { id: 'crowd_sw_4', district: 'Highway Strip', ax: -54, az: 12, bx: -30, bz: 12, speed: 1.6, shirtColor: 0x22c55e, lowerColor: 0x1e293b, skinColor: 0xbc865d },
  { id: 'crowd_mk_1', district: 'Market Yard', ax: -52, az: -38.5, bx: -30, bz: -38.5, speed: 1.55, shirtColor: 0xd97706, lowerColor: 0xf8fafc, skinColor: 0xa8714a },
  { id: 'crowd_mk_2', district: 'Market Yard', ax: -52, az: -25.5, bx: -24, bz: -25.5, speed: 1.45, shirtColor: 0xbe123c, lowerColor: 0xfef3c7, skinColor: 0xb98259, isSaree: true },

  // Financial Square, Uptown Plaza & Hospital Square (6)
  { id: 'crowd_fn_1', district: 'Financial Square', ax: -28, az: -38.5, bx: -8, bz: -38.5, speed: 1.6, shirtColor: 0x1d4ed8, lowerColor: 0x0f172a, skinColor: 0xc18a61 },
  { id: 'crowd_up_1', district: 'Uptown Plaza', ax: 12, az: -38.5, bx: 48, bz: -38.5, speed: 1.7, shirtColor: 0x6366f1, lowerColor: 0xf8fafc, skinColor: 0xb57f56 },
  { id: 'crowd_up_2', district: 'Uptown Plaza', ax: 24, az: -25.5, bx: 52, bz: -25.5, speed: 1.5, shirtColor: 0xdb2777, lowerColor: 0xfde68a, skinColor: 0xbf8960, isSaree: true },
  { id: 'crowd_hs_1', district: 'Hospital Square', ax: 52, az: -38.5, bx: 72, bz: -38.5, speed: 1.55, shirtColor: 0xf8fafc, lowerColor: 0x0284c7, skinColor: 0xb78158 },
  { id: 'crowd_hs_2', district: 'Hospital Square', ax: 54, az: -25.5, bx: 72, bz: -25.5, speed: 1.65, shirtColor: 0x16a34a, lowerColor: 0xf8fafc, skinColor: 0xac764f },
  { id: 'crowd_hs_3', district: 'Hospital Square', ax: 72.5, az: 5, bx: 72.5, bz: 26, speed: 1.5, shirtColor: 0xdc2626, lowerColor: 0x1e293b, skinColor: 0xc28c63 },

  // Palm Colony, Sheru Home & Lagoon Resort (6)
  { id: 'crowd_pc_1', district: 'Palm Colony', ax: -54, az: 40.5, bx: -12, bz: 40.5, speed: 1.55, shirtColor: 0x7c3aed, lowerColor: 0xf8fafc, skinColor: 0xb98259 },
  { id: 'crowd_pc_2', district: 'Palm Colony', ax: -30, az: 58, bx: -10, bz: 58, speed: 1.45, shirtColor: 0x059669, lowerColor: 0xfef08a, skinColor: 0xb27b52, isSaree: true },
  { id: 'crowd_pc_3', district: 'Palm Colony', ax: 10, az: 39.4, bx: 28, bz: 39.4, speed: 1.65, shirtColor: 0x0284c7, lowerColor: 0x1e293b, skinColor: 0xc48e65 },
  { id: 'crowd_rs_1', district: 'Lagoon Resort', ax: 30, az: 40.5, bx: 68, bz: 40.5, speed: 1.5, shirtColor: 0x06b6d4, lowerColor: 0xf8fafc, skinColor: 0xbb855c },
  { id: 'crowd_rs_2', district: 'Lagoon Resort', ax: 24, az: 58, bx: 66, bz: 58, speed: 1.6, shirtColor: 0xf43f5e, lowerColor: 0xfef9c3, skinColor: 0xb47d54, isSaree: true },
  { id: 'crowd_rs_3', district: 'Palm Colony', ax: -8, az: 42, bx: -8, bz: 63, speed: 1.55, shirtColor: 0xf59e0b, lowerColor: 0x334155, skinColor: 0xaa734c },

  // West Cinema Strip & Far West Turf Blvd (6)
  { id: 'crowd_wc_1', district: 'West Cinema Strip', ax: -83.5, az: -26, bx: -83.5, bz: -11, speed: 1.6, shirtColor: 0xe11d48, lowerColor: 0x1e293b, skinColor: 0xb88158 },
  { id: 'crowd_wc_2', district: 'West Cinema Strip', ax: -83.5, az: 4, bx: -83.5, bz: 26, speed: 1.55, shirtColor: 0x2563eb, lowerColor: 0xf8fafc, skinColor: 0xc28b62 },
  { id: 'crowd_wc_3', district: 'West Cinema Strip', ax: -83.5, az: 42, bx: -83.5, bz: 63, speed: 1.5, shirtColor: 0x9333ea, lowerColor: 0xfde047, skinColor: 0xb47d54, isSaree: true },
  { id: 'crowd_fw_1', district: 'Far West Turf Blvd', ax: -114.5, az: -52, bx: -114.5, bz: -30, speed: 1.75, shirtColor: 0x16a34a, lowerColor: 0xfacc15, skinColor: 0xaa734c },
  { id: 'crowd_fw_2', district: 'Far West Turf Blvd', ax: -114.5, az: 5, bx: -114.5, bz: 30, speed: 1.5, shirtColor: 0xd97706, lowerColor: 0xf8fafc, skinColor: 0xc08960, isSaree: true },
  { id: 'crowd_fw_3', district: 'Far West Turf Blvd', ax: -101.6, az: -26, bx: -101.6, bz: -11, speed: 1.6, shirtColor: 0x0ea5e9, lowerColor: 0x0f172a, skinColor: 0xb68057 },

  // East Promenade & East Harbourfront (6)
  { id: 'crowd_ep_1', district: 'East Promenade', ax: 86.5, az: -26, bx: 86.5, bz: -11, speed: 1.6, shirtColor: 0x0d9488, lowerColor: 0xf8fafc, skinColor: 0xbc865d },
  { id: 'crowd_ep_2', district: 'East Promenade', ax: 86.5, az: 4, bx: 86.5, bz: 26, speed: 1.55, shirtColor: 0xf97316, lowerColor: 0x1e293b, skinColor: 0xb17a51 },
  { id: 'crowd_ep_3', district: 'East Promenade', ax: 86.5, az: 42, bx: 86.5, bz: 63, speed: 1.5, shirtColor: 0xec4899, lowerColor: 0xfef3c7, skinColor: 0xc18a61, isSaree: true },
  { id: 'crowd_eh_1', district: 'East Harbourfront', ax: 114.5, az: -52, bx: 114.5, bz: -30, speed: 1.65, shirtColor: 0x0284c7, lowerColor: 0xf8fafc, skinColor: 0xac764f },
  { id: 'crowd_eh_2', district: 'East Harbourfront', ax: 114.5, az: 5, bx: 114.5, bz: 30, speed: 1.55, shirtColor: 0x4f46e5, lowerColor: 0xfef08a, skinColor: 0xb98259, isSaree: true },
  { id: 'crowd_eh_3', district: 'East Harbourfront', ax: 100, az: 40, bx: 100, bz: 63, speed: 1.5, shirtColor: 0x15803d, lowerColor: 0xf8fafc, skinColor: 0xc28b62 },

  // North InfoPark Strip & Kerala International Airport (6)
  { id: 'crowd_ni_1', district: 'North InfoPark Strip', ax: -60, az: -79.5, bx: -12, bz: -79.5, speed: 1.7, shirtColor: 0x38bdf8, lowerColor: 0x0f172a, skinColor: 0xb78158 },
  { id: 'crowd_ni_2', district: 'North InfoPark Strip', ax: 12, az: -79.5, bx: 68, bz: -79.5, speed: 1.6, shirtColor: 0xf59e0b, lowerColor: 0x1e293b, skinColor: 0xc48e65 },
  { id: 'crowd_ni_3', district: 'North InfoPark Strip', ax: 86.5, az: -80, bx: 100, bz: -80, speed: 1.5, shirtColor: 0x16a34a, lowerColor: 0xfef3c7, skinColor: 0xb27b52, isSaree: true },
  { id: 'crowd_ap_1', district: 'Kerala International Airport', ax: -42, az: -103, bx: -12, bz: -103, speed: 1.75, shirtColor: 0x1e3a8a, lowerColor: 0x0f172a, skinColor: 0xbc865d },
  { id: 'crowd_ap_2', district: 'Kerala International Airport', ax: -40, az: -121, bx: -12, bz: -121, speed: 1.6, shirtColor: 0x0f766e, lowerColor: 0xf8fafc, skinColor: 0xb57f56, isSaree: true },
  { id: 'crowd_ap_3', district: 'Kerala International Airport', ax: 14, az: -103, bx: 44, bz: -103, speed: 1.65, shirtColor: 0xfacc15, lowerColor: 0x1e293b, skinColor: 0xaa734c },

  // South Coastal Blvd & Marine Drive Beach (4)
  { id: 'crowd_sc_1', district: 'South Coastal Blvd', ax: -54, az: 79.5, bx: -12, bz: 79.5, speed: 1.55, shirtColor: 0xd97706, lowerColor: 0xf8fafc, skinColor: 0xb88158 },
  { id: 'crowd_sc_2', district: 'South Coastal Blvd', ax: 12, az: 79.5, bx: 58, bz: 79.5, speed: 1.65, shirtColor: 0x0ea5e9, lowerColor: 0x0f172a, skinColor: 0xc28b62 },
  { id: 'crowd_md_1', district: 'Marine Drive Beach', ax: -38, az: 112, bx: -10, bz: 112, speed: 1.45, shirtColor: 0xf43f5e, lowerColor: 0xfef08a, skinColor: 0xbb855c, isSaree: true },
  { id: 'crowd_md_2', district: 'Marine Drive Beach', ax: 10, az: 111, bx: 38, bz: 111, speed: 1.55, shirtColor: 0x10b981, lowerColor: 0xf8fafc, skinColor: 0xb17a51 },
];

export interface RoadTrafficRouteDef {
  roadId: string;
  catalogId: string;
  loop: { x: number; z: number }[];
  wpIndex: number;
  startLerp: number;
  cruise: number;
}

/**
 * Living Kerala road traffic loops covering ALL 11 paved road routes across the entire town!
 * Lanes at Main Junction (0, -4) stay at ±3.2m so vehicles glide smoothly past the Golden Statue roundabout.
 */
const LOOP_MAIN_NS = [
  { x: 3.2, z: 98 },
  { x: 3.2, z: -100 },
  { x: -3.2, z: -100 },
  { x: -3.2, z: 98 },
];
const LOOP_MAIN_EW = [
  { x: -138, z: -0.8 },
  { x: 138, z: -0.8 },
  { x: 138, z: -7.2 },
  { x: -138, z: -7.2 },
];
const LOOP_NORTH_EW = [
  { x: -102, z: -29.8 },
  { x: 102, z: -29.8 },
  { x: 102, z: -34.2 },
  { x: -102, z: -34.2 },
];
const LOOP_SOUTH_EW = [
  { x: -90, z: 31.8 },
  { x: 90, z: 31.8 },
  { x: 90, z: 36.2 },
  { x: -90, z: 36.2 },
];
const LOOP_NORTH_HWY = [
  { x: -106, z: -69.5 },
  { x: 106, z: -69.5 },
  { x: 106, z: -74.5 },
  { x: -106, z: -74.5 },
];
const LOOP_SOUTH_COASTAL = [
  { x: -102, z: 69.8 },
  { x: 102, z: 69.8 },
  { x: 102, z: 74.2 },
  { x: -102, z: 74.2 },
];
const LOOP_MARINE_DRIVE = [
  { x: -100, z: 101.8 },
  { x: 100, z: 101.8 },
  { x: 100, z: 106.2 },
  { x: -100, z: 106.2 },
];
const LOOP_WEST_RING = [
  { x: -73.8, z: 86 },
  { x: -73.8, z: -80 },
  { x: -78.2, z: -80 },
  { x: -78.2, z: 86 },
];
const LOOP_EAST_RING = [
  { x: 82.2, z: 86 },
  { x: 82.2, z: -80 },
  { x: 77.8, z: -80 },
  { x: 77.8, z: 86 },
];
const LOOP_FAR_WEST = [
  { x: -105.8, z: 94 },
  { x: -105.8, z: -82 },
  { x: -110.2, z: -82 },
  { x: -110.2, z: 94 },
];
const LOOP_FAR_EAST = [
  { x: 110.2, z: 94 },
  { x: 110.2, z: -82 },
  { x: 105.8, z: -82 },
  { x: 105.8, z: 94 },
];

export const TOWN_TRAFFIC_ROUTES: RoadTrafficRouteDef[] = [
  // 1. Main Junction Avenue (NS — Airport to Marine Drive)
  { roadId: 'mainRoadNS', catalogId: 'veh_kerala_bus', loop: LOOP_MAIN_NS, wpIndex: 0, startLerp: 0.18, cruise: 9.2 },
  { roadId: 'mainRoadNS', catalogId: 'veh_town_taxi', loop: LOOP_MAIN_NS, wpIndex: 0, startLerp: 0.62, cruise: 11.0 },
  { roadId: 'mainRoadNS', catalogId: 'veh_royal_bike', loop: LOOP_MAIN_NS, wpIndex: 2, startLerp: 0.28, cruise: 11.8 },
  { roadId: 'mainRoadNS', catalogId: 'veh_kerala_auto', loop: LOOP_MAIN_NS, wpIndex: 2, startLerp: 0.72, cruise: 9.6 },

  // 2. Central Bazaar Road (EW — Full East-West Artery)
  { roadId: 'mainRoadEW', catalogId: 'veh_kerala_auto', loop: LOOP_MAIN_EW, wpIndex: 0, startLerp: 0.14, cruise: 9.5 },
  { roadId: 'mainRoadEW', catalogId: 'veh_pepper_hatch', loop: LOOP_MAIN_EW, wpIndex: 0, startLerp: 0.52, cruise: 11.2 },
  { roadId: 'mainRoadEW', catalogId: 'veh_delivery_van', loop: LOOP_MAIN_EW, wpIndex: 2, startLerp: 0.25, cruise: 9.4 },
  { roadId: 'mainRoadEW', catalogId: 'veh_family_cruiser', loop: LOOP_MAIN_EW, wpIndex: 2, startLerp: 0.68, cruise: 10.8 },
  { roadId: 'mainRoadEW', catalogId: 'veh_mini_bus', loop: LOOP_MAIN_EW, wpIndex: 0, startLerp: 0.82, cruise: 8.8 },

  // 3. Hospital & Market Avenue (northRoadEW)
  { roadId: 'northRoadEW', catalogId: 'veh_ksrtc_bus', loop: LOOP_NORTH_EW, wpIndex: 0, startLerp: 0.2, cruise: 8.8 },
  { roadId: 'northRoadEW', catalogId: 'veh_police_jeep', loop: LOOP_NORTH_EW, wpIndex: 2, startLerp: 0.35, cruise: 11.4 },
  { roadId: 'northRoadEW', catalogId: 'veh_goods_truck', loop: LOOP_NORTH_EW, wpIndex: 0, startLerp: 0.7, cruise: 8.2 },

  // 4. South Resort Boulevard (southRoadEW)
  { roadId: 'southRoadEW', catalogId: 'veh_kochi_scooter', loop: LOOP_SOUTH_EW, wpIndex: 0, startLerp: 0.22, cruise: 9.8 },
  { roadId: 'southRoadEW', catalogId: 'veh_school_bus', loop: LOOP_SOUTH_EW, wpIndex: 2, startLerp: 0.45, cruise: 8.4 },
  { roadId: 'southRoadEW', catalogId: 'veh_wayanad_jeep', loop: LOOP_SOUTH_EW, wpIndex: 0, startLerp: 0.72, cruise: 10.2 },

  // 5. North InfoPark Highway (northHighwayEW)
  { roadId: 'northHighwayEW', catalogId: 'veh_tourist_bus', loop: LOOP_NORTH_HWY, wpIndex: 0, startLerp: 0.2, cruise: 9.6 },
  { roadId: 'northHighwayEW', catalogId: 'veh_sheru_supercar', loop: LOOP_NORTH_HWY, wpIndex: 2, startLerp: 0.38, cruise: 12.8 },
  { roadId: 'northHighwayEW', catalogId: 'veh_town_taxi', loop: LOOP_NORTH_HWY, wpIndex: 0, startLerp: 0.72, cruise: 11.2 },

  // 6. South Coastal Highway (southCoastalEW)
  { roadId: 'southCoastalEW', catalogId: 'veh_kerala_auto', loop: LOOP_SOUTH_COASTAL, wpIndex: 0, startLerp: 0.24, cruise: 9.4 },
  { roadId: 'southCoastalEW', catalogId: 'veh_ksrtc_bus', loop: LOOP_SOUTH_COASTAL, wpIndex: 2, startLerp: 0.55, cruise: 9.0 },
  { roadId: 'southCoastalEW', catalogId: 'veh_pepper_hatch', loop: LOOP_SOUTH_COASTAL, wpIndex: 0, startLerp: 0.78, cruise: 10.6 },

  // 7. Marine Drive Coastal Road (marineDriveEW)
  { roadId: 'marineDriveEW', catalogId: 'veh_tourist_bus', loop: LOOP_MARINE_DRIVE, wpIndex: 0, startLerp: 0.25, cruise: 9.0 },
  { roadId: 'marineDriveEW', catalogId: 'veh_royal_bike', loop: LOOP_MARINE_DRIVE, wpIndex: 2, startLerp: 0.48, cruise: 11.4 },
  { roadId: 'marineDriveEW', catalogId: 'veh_kochi_scooter', loop: LOOP_MARINE_DRIVE, wpIndex: 0, startLerp: 0.76, cruise: 9.6 },

  // 8. West Cinema Ring Road (westRingNS)
  { roadId: 'westRingNS', catalogId: 'veh_kerala_bus', loop: LOOP_WEST_RING, wpIndex: 0, startLerp: 0.22, cruise: 9.2 },
  { roadId: 'westRingNS', catalogId: 'veh_family_cruiser', loop: LOOP_WEST_RING, wpIndex: 2, startLerp: 0.55, cruise: 10.6 },
  { roadId: 'westRingNS', catalogId: 'veh_kerala_auto', loop: LOOP_WEST_RING, wpIndex: 0, startLerp: 0.78, cruise: 9.5 },

  // 9. East Promenade Ring Road (eastRingNS)
  { roadId: 'eastRingNS', catalogId: 'veh_delivery_van', loop: LOOP_EAST_RING, wpIndex: 0, startLerp: 0.2, cruise: 9.6 },
  { roadId: 'eastRingNS', catalogId: 'veh_police_jeep', loop: LOOP_EAST_RING, wpIndex: 2, startLerp: 0.52, cruise: 11.2 },
  { roadId: 'eastRingNS', catalogId: 'veh_wayanad_jeep', loop: LOOP_EAST_RING, wpIndex: 0, startLerp: 0.78, cruise: 10.0 },

  // 10. Far West Turf Boulevard (farWestNS)
  { roadId: 'farWestNS', catalogId: 'veh_goods_truck', loop: LOOP_FAR_WEST, wpIndex: 0, startLerp: 0.26, cruise: 8.6 },
  { roadId: 'farWestNS', catalogId: 'veh_pepper_hatch', loop: LOOP_FAR_WEST, wpIndex: 2, startLerp: 0.62, cruise: 10.8 },

  // 11. East Harbourfront Road (farEastNS)
  { roadId: 'farEastNS', catalogId: 'veh_mini_bus', loop: LOOP_FAR_EAST, wpIndex: 0, startLerp: 0.24, cruise: 9.0 },
  { roadId: 'farEastNS', catalogId: 'veh_town_taxi', loop: LOOP_FAR_EAST, wpIndex: 2, startLerp: 0.64, cruise: 11.0 },
];

