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
    z: 2,
    width: 11,
    length: 212, // z: -104 (Airport Terminal Drop-off) to +108 (Marine Drive Beach)
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
