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
  return false;
}

export function getRoadNameAt(x: number, z: number, margin = 1.5): string | null {
  for (const road of TOWN_ROADS) {
    const b = getRoadBounds(road);
    if (
      x >= b.minX - margin &&
      x <= b.maxX + margin &&
      z >= b.minZ - margin &&
      z <= b.maxZ + margin
    ) {
      return road.name;
    }
  }
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
  return null;
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
  { id: 'crowd_mj_1', district: 'Main Junction', ax: -8, az: 3.5, bx: -8, bz: 25, speed: 1.55, shirtColor: 0xfef3c7, lowerColor: 0xffffff, skinColor: 0xb68158 },
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
  { id: 'crowd_fw_1', district: 'Far West Turf Blvd', ax: -114.5, az: -28, bx: -114.5, bz: -11, speed: 1.75, shirtColor: 0x16a34a, lowerColor: 0xfacc15, skinColor: 0xaa734c },
  { id: 'crowd_fw_2', district: 'Far West Turf Blvd', ax: -114.5, az: 5, bx: -114.5, bz: 30, speed: 1.5, shirtColor: 0xd97706, lowerColor: 0xf8fafc, skinColor: 0xc08960, isSaree: true },
  { id: 'crowd_fw_3', district: 'Far West Turf Blvd', ax: -101.6, az: -26, bx: -101.6, bz: -11, speed: 1.6, shirtColor: 0x0ea5e9, lowerColor: 0x0f172a, skinColor: 0xb68057 },

  // East Promenade & East Harbourfront (6)
  { id: 'crowd_ep_1', district: 'East Promenade', ax: 86.5, az: -26, bx: 86.5, bz: -11, speed: 1.6, shirtColor: 0x0d9488, lowerColor: 0xf8fafc, skinColor: 0xbc865d },
  { id: 'crowd_ep_2', district: 'East Promenade', ax: 86.5, az: 4, bx: 86.5, bz: 26, speed: 1.55, shirtColor: 0xf97316, lowerColor: 0x1e293b, skinColor: 0xb17a51 },
  { id: 'crowd_ep_3', district: 'East Promenade', ax: 86.5, az: 42, bx: 86.5, bz: 63, speed: 1.5, shirtColor: 0xec4899, lowerColor: 0xfef3c7, skinColor: 0xc18a61, isSaree: true },
  { id: 'crowd_eh_1', district: 'East Harbourfront', ax: 114.5, az: -28, bx: 114.5, bz: -11, speed: 1.65, shirtColor: 0x0284c7, lowerColor: 0xf8fafc, skinColor: 0xac764f },
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
  { id: 'crowd_md_1', district: 'Marine Drive Beach', ax: -52, az: 112, bx: -10, bz: 112, speed: 1.45, shirtColor: 0xf43f5e, lowerColor: 0xfef08a, skinColor: 0xbb855c, isSaree: true },
  { id: 'crowd_md_2', district: 'Marine Drive Beach', ax: 10, az: 111, bx: 52, bz: 111, speed: 1.55, shirtColor: 0x10b981, lowerColor: 0xf8fafc, skinColor: 0xb17a51 },
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

