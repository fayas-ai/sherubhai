import { PassengerSeatView, RailwayHudState, TrainRiderMode, VehicleArchetype } from '../types/game';
import { isAircraftType } from './vehiclePhysics';

export type RailwayTrackId = 'A' | 'B';
export type PlatformId = '1' | 'B';

export interface RailwayStationDef {
  id: string;
  code: string;
  name: string;
  mlName: string;
  side: 'south' | 'west' | 'north' | 'east';
  centerX: number;
  centerZ: number;
  /** Platform alignment axis: 'ew' for north/south stations, 'ns' for east/west stations */
  axis: 'ew' | 'ns';
  /** Outward normal pointing from town toward outer track / Platform B */
  outwardX: number;
  outwardZ: number;
  /** Along-platform unit tangent matching Track A (Platform 1, Left-to-Right) direction */
  tangentX: number;
  tangentZ: number;
  platformLength: number;
  /** Arc-length stop distance along Track A (clockwise) and Track B (counter-clockwise) */
  stopDistA: number;
  stopDistB: number;
  scenicHint: string;
}

export interface TrainDef {
  id: string;
  number: string;
  name: string;
  mlName: string;
  track: RailwayTrackId;
  platform: PlatformId;
  locoColor: number;
  coachColor: number;
  stripeColor: number;
  roofColor: number;
  initialPhase: number; // 0..1 fraction around loop
  cruiseSpeed: number; // world units/sec (~18 u/s = 72 km/h)
}

export interface TrackSample {
  x: number;
  z: number;
  tx: number; // unit tangent in direction of train travel
  tz: number;
  nx: number; // outward normal from town center
  nz: number;
  yaw: number; // Three.js Y rotation facing forward (+tx, +tz)
}

export interface LiveTrainState {
  id: string;
  number: string;
  name: string;
  track: RailwayTrackId;
  platform: PlatformId;
  distance: number; // arc distance traveled along this track (0..trackLength)
  speed: number; // current speed u/s
  phase: 'moving' | 'braking' | 'stopped';
  stoppedAtStationId: string | null;
  dwellTimer: number;
  departGraceTimer: number;
  x: number;
  z: number;
  yaw: number;
  nextStationId: string;
  nextStationDist: number;
  honkPending: boolean;
  obstacleBlocked: boolean;
  blockedByLabel: string | null;
}

export interface TrackObstacle {
  x: number;
  y?: number;
  z: number;
  radius: number;
  label: string;
}

export interface MountainPeakDef {
  x: number;
  z: number;
  rx: number;
  rz: number;
  h: number;
}

export interface MountainRangeDef {
  id: string;
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  segX: number;
  segZ: number;
  peaks: MountainPeakDef[];
}

/**
 * Single source of truth for Western Ghats mountain geometry AND aeroplane mountain-crash physics!
 * Leaves Airport Runway 09/27 approach corridor (z = -170..-118) and South Arabian Sea open.
 */
export const WESTERN_GHATS_RANGES: MountainRangeDef[] = [
  {
    id: 'north_sahyadri',
    name: 'Northern Sahyadri Mountains',
    minX: -340,
    maxX: 340,
    minZ: -370,
    maxZ: -205,
    segX: 46,
    segZ: 18,
    peaks: [
      { x: -245, z: -265, rx: 95, rz: 70, h: 66 },
      { x: -135, z: -275, rx: 105, rz: 74, h: 86 },
      { x: -20, z: -290, rx: 115, rz: 78, h: 98 },
      { x: 95, z: -278, rx: 105, rz: 72, h: 82 },
      { x: 215, z: -262, rx: 100, rz: 70, h: 74 },
      { x: -75, z: -242, rx: 68, rz: 44, h: 42 },
      { x: 65, z: -240, rx: 72, rz: 44, h: 46 },
    ],
  },
  {
    id: 'east_ghats',
    name: 'Eastern Western-Ghats Ridge',
    minX: 194,
    maxX: 365,
    minZ: -116,
    maxZ: 172,
    segX: 18,
    segZ: 32,
    peaks: [
      { x: 270, z: -60, rx: 78, rz: 75, h: 78 },
      { x: 285, z: 25, rx: 86, rz: 82, h: 92 },
      { x: 268, z: 105, rx: 76, rz: 72, h: 64 },
      { x: 235, z: -12, rx: 48, rz: 54, h: 40 },
      { x: 238, z: 62, rx: 50, rz: 54, h: 44 },
    ],
  },
  {
    id: 'west_headland',
    name: 'Western Coastal Headland Hills',
    minX: -365,
    maxX: -194,
    minZ: -116,
    maxZ: 166,
    segX: 18,
    segZ: 30,
    peaks: [
      { x: -270, z: -55, rx: 76, rz: 75, h: 68 },
      { x: -282, z: 28, rx: 82, rz: 78, h: 76 },
      { x: -262, z: 102, rx: 72, rz: 66, h: 52 },
      { x: -234, z: -8, rx: 46, rz: 50, h: 34 },
    ],
  },
];

/**
 * Exact mountain terrain height at world (x, z), matching the 3D sculpted mountain meshes!
 */
export function sampleMountainElevation(wx: number, wz: number): number {
  let maxY = 0;
  for (const range of WESTERN_GHATS_RANGES) {
    if (wx < range.minX || wx > range.maxX || wz < range.minZ || wz > range.maxZ) continue;
    const cx = (range.minX + range.maxX) * 0.5;
    const cz = (range.minZ + range.maxZ) * 0.5;
    const width = range.maxX - range.minX;
    const depth = range.maxZ - range.minZ;
    const lx = wx - cx;
    const lz = wz - cz;

    let h = 0;
    for (const p of range.peaks) {
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
    const edgeFadeX = Math.min(1, (width * 0.5 - Math.abs(lx)) / 18);
    const edgeFadeZ = Math.min(1, (depth * 0.5 - Math.abs(lz)) / 18);
    const finalY = h * Math.max(0, Math.min(edgeFadeX, edgeFadeZ)) - 0.6;
    if (finalY > maxY) maxY = finalY;
  }
  return maxY;
}

export type StationPassengerPhase =
  | 'waiting'
  | 'boarding'
  | 'boarded'
  | 'alighting'
  | 'strolling_out';

export interface StationPassengerState {
  id: string;
  stationId: string;
  platform: PlatformId;
  phase: StationPassengerPhase;
  /** Offset along platform (-16..+16) */
  alongOffset: number;
  /** Offset perpendicular from platform edge (+0.5..+4.2 away from track) */
  depthOffset: number;
  targetAlong: number;
  targetDepth: number;
  x: number;
  z: number;
  yaw: number;
  walkPhase: number;
  visible: boolean;
  shirtColor: number;
  lowerColor: number;
  skinColor: number;
  isSaree: boolean;
  timer: number;
}

export interface RailwaySimulationState {
  trains: LiveTrainState[];
  passengers: StationPassengerState[];
  riderMode: TrainRiderMode;
  ridingTrainId: string | null;
  seatView: PassengerSeatView;
  driverThrottle: number; // -1 (brake) .. 0 .. +1 (accelerate)
  passingOppositeTrainName: string | null;
}

export interface BeachBenchDef {
  id: string;
  label: string;
  x: number;
  z: number;
  facingYaw: number; // faces +Z (0) straight out toward the Arabian Sea!
}

// ============================================================================
// DOUBLE-TRACK LOOP GEOMETRY (Cleanly outside all buildings & Airport Runway!)
// ============================================================================
export const RAIL_MIN_X = -164;
export const RAIL_MAX_X = 164;
export const RAIL_MIN_Z = -178;
export const RAIL_MAX_Z = 134;
export const RAIL_CORNER_R = 26;
export const TRACK_HALF_GAP = 2.8; // 5.6m center-to-center parallel tracks!
export const PLATFORM_CENTER_OFFSET = 6.9; // platform deck center from centerline
export const PLATFORM_WIDTH = 4.6;
export const PLATFORM_LENGTH = 42;
export const BRIDGE_DECK_Y = 4.9;

export const BEACH_ZONE = {
  minX: -175,
  maxX: 175,
  sandStartZ: 146,
  boardwalkZ: 174,
  shorelineZ: 192,
  seaFarZ: 640,
} as const;

export const BEACH_BENCHES: BeachBenchDef[] = [
  { id: 'beach_bench_1', label: 'Malabar Sea Bench #1', x: -34, z: 176, facingYaw: 0 },
  { id: 'beach_bench_2', label: 'Malabar Sea Bench #2', x: -20, z: 176, facingYaw: 0 },
  { id: 'beach_bench_3', label: 'Malabar Sunset Bench', x: -8, z: 176, facingYaw: 0 },
  { id: 'beach_bench_4', label: 'Arabian Breeze Bench', x: 8, z: 176, facingYaw: 0 },
  { id: 'beach_bench_5', label: 'Palm Horizon Bench', x: 20, z: 176, facingYaw: 0 },
  { id: 'beach_bench_6', label: 'Malabar Sea Bench #6', x: 34, z: 176, facingYaw: 0 },
];

export function isPointOnBeachZone(x: number, z: number): boolean {
  return (
    x >= BEACH_ZONE.minX &&
    x <= BEACH_ZONE.maxX &&
    z >= BEACH_ZONE.sandStartZ &&
    z <= BEACH_ZONE.shorelineZ + 8
  );
}

/**
 * Players can reach Malabar Beach on foot or by driving ANY ground vehicle,
 * while aeroplanes stay restricted to the Airport & sky.
 */
export function canVehicleAccessBeach(vehicleType: VehicleArchetype): boolean {
  return !isAircraftType(vehicleType);
}

// ============================================================================
// ROUNDED-RECTANGLE TRACK ARC-LENGTH SAMPLER
// ============================================================================
interface TrackGeom {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  r: number;
  straightEW: number;
  straightNS: number;
  cornerLen: number;
  totalLen: number;
  // Clockwise cumulative segment ends starting from South-East corner exit (x = maxX - r, z = maxZ)
  s0: number; // end of South straight (-X)
  s1: number; // end of SW arc
  s2: number; // end of West straight (-Z)
  s3: number; // end of NW arc
  s4: number; // end of North straight (+X)
  s5: number; // end of NE arc
  s6: number; // end of East straight (+Z)
  s7: number; // end of SE arc == totalLen
}

function buildTrackGeom(offset: number): TrackGeom {
  // offset < 0 => Track A (inner); offset > 0 => Track B (outer)
  const minX = RAIL_MIN_X - offset;
  const maxX = RAIL_MAX_X + offset;
  const minZ = RAIL_MIN_Z - offset;
  const maxZ = RAIL_MAX_Z + offset;
  const r = RAIL_CORNER_R + offset;
  const straightEW = RAIL_MAX_X - RAIL_MIN_X - 2 * RAIL_CORNER_R; // 276m (invariant!)
  const straightNS = RAIL_MAX_Z - RAIL_MIN_Z - 2 * RAIL_CORNER_R; // 260m (invariant!)
  const cornerLen = (Math.PI / 2) * r;

  const s0 = straightEW;
  const s1 = s0 + cornerLen;
  const s2 = s1 + straightNS;
  const s3 = s2 + cornerLen;
  const s4 = s3 + straightEW;
  const s5 = s4 + cornerLen;
  const s6 = s5 + straightNS;
  const s7 = s6 + cornerLen;
  return { minX, maxX, minZ, maxZ, r, straightEW, straightNS, cornerLen, totalLen: s7, s0, s1, s2, s3, s4, s5, s6, s7 };
}

const TRACK_GEOM_A = buildTrackGeom(-TRACK_HALF_GAP);
const TRACK_GEOM_B = buildTrackGeom(+TRACK_HALF_GAP);

export function getTrackLength(track: RailwayTrackId): number {
  return track === 'A' ? TRACK_GEOM_A.totalLen : TRACK_GEOM_B.totalLen;
}

function modPos(v: number, m: number): number {
  const r = v % m;
  return r < 0 ? r + m : r;
}

/**
 * Samples a point along Clockwise Track A (offset = -2.8, Platform 1: Left-to-Right)
 * or Counter-Clockwise Track B (offset = +2.8, Platform B: Right-to-Left).
 * `distance` always increases forward in the train's travel direction!
 */
export function sampleTrackPoint(track: RailwayTrackId, distance: number): TrackSample {
  const g = track === 'A' ? TRACK_GEOM_A : TRACK_GEOM_B;
  const isClockwise = track === 'A';
  // Convert travel distance to clockwise perimeter coordinate `cw`
  const dWrap = modPos(distance, g.totalLen);
  const cw = isClockwise ? dWrap : modPos(g.totalLen - dWrap, g.totalLen);

  let x = 0;
  let z = 0;
  let cwTx = -1;
  let cwTz = 0;
  let nx = 0;
  let nz = 1;

  const cMinX = RAIL_MIN_X + RAIL_CORNER_R; // -138
  const cMaxX = RAIL_MAX_X - RAIL_CORNER_R; // +138
  const cMinZ = RAIL_MIN_Z + RAIL_CORNER_R; // -152
  const cMaxZ = RAIL_MAX_Z - RAIL_CORNER_R; // +108

  if (cw < g.s0) {
    // South straight: +X -> -X
    const u = cw;
    x = cMaxX - u;
    z = g.maxZ;
    cwTx = -1;
    cwTz = 0;
    nx = 0;
    nz = 1;
  } else if (cw < g.s1) {
    // SW quarter circle: center (cMinX, cMaxZ), angle PI/2 (+Z) -> PI (-X)
    const a = Math.PI / 2 + ((cw - g.s0) / g.cornerLen) * (Math.PI / 2);
    x = cMinX + Math.cos(a) * g.r;
    z = cMaxZ + Math.sin(a) * g.r;
    cwTx = -Math.sin(a);
    cwTz = Math.cos(a);
    nx = Math.cos(a);
    nz = Math.sin(a);
  } else if (cw < g.s2) {
    // West straight: +Z -> -Z
    const u = cw - g.s1;
    x = g.minX;
    z = cMaxZ - u;
    cwTx = 0;
    cwTz = -1;
    nx = -1;
    nz = 0;
  } else if (cw < g.s3) {
    // NW quarter circle: center (cMinX, cMinZ), angle PI (-X) -> 3*PI/2 (-Z)
    const a = Math.PI + ((cw - g.s2) / g.cornerLen) * (Math.PI / 2);
    x = cMinX + Math.cos(a) * g.r;
    z = cMinZ + Math.sin(a) * g.r;
    cwTx = -Math.sin(a);
    cwTz = Math.cos(a);
    nx = Math.cos(a);
    nz = Math.sin(a);
  } else if (cw < g.s4) {
    // North straight: -X -> +X
    const u = cw - g.s3;
    x = cMinX + u;
    z = g.minZ;
    cwTx = 1;
    cwTz = 0;
    nx = 0;
    nz = -1;
  } else if (cw < g.s5) {
    // NE quarter circle: center (cMaxX, cMinZ), angle 3*PI/2 (-Z) -> 2*PI (+X)
    const a = (Math.PI * 3) / 2 + ((cw - g.s4) / g.cornerLen) * (Math.PI / 2);
    x = cMaxX + Math.cos(a) * g.r;
    z = cMinZ + Math.sin(a) * g.r;
    cwTx = -Math.sin(a);
    cwTz = Math.cos(a);
    nx = Math.cos(a);
    nz = Math.sin(a);
  } else if (cw < g.s6) {
    // East straight: -Z -> +Z
    const u = cw - g.s5;
    x = g.maxX;
    z = cMinZ + u;
    cwTx = 0;
    cwTz = 1;
    nx = 1;
    nz = 0;
  } else {
    // SE quarter circle: center (cMaxX, cMaxZ), angle 0 (+X) -> PI/2 (+Z)
    const a = ((cw - g.s6) / g.cornerLen) * (Math.PI / 2);
    x = cMaxX + Math.cos(a) * g.r;
    z = cMaxZ + Math.sin(a) * g.r;
    cwTx = -Math.sin(a);
    cwTz = Math.cos(a);
    nx = Math.cos(a);
    nz = Math.sin(a);
  }

  const tx = isClockwise ? cwTx : -cwTx;
  const tz = isClockwise ? cwTz : -cwTz;
  return {
    x,
    z,
    tx,
    tz,
    nx,
    nz,
    yaw: Math.atan2(tx, tz),
  };
}

// Midpoint arc-distances for the 4 stations along Track A (cw) and Track B (ccw)
const SOUTH_MID_A = TRACK_GEOM_A.straightEW * 0.5;
const WEST_MID_A = TRACK_GEOM_A.s1 + TRACK_GEOM_A.straightNS * 0.5;
const NORTH_MID_A = TRACK_GEOM_A.s3 + TRACK_GEOM_A.straightEW * 0.5;
const EAST_MID_A = TRACK_GEOM_A.s5 + TRACK_GEOM_A.straightNS * 0.5;

const SOUTH_MID_B = TRACK_GEOM_B.totalLen - TRACK_GEOM_B.straightEW * 0.5;
const WEST_MID_B = TRACK_GEOM_B.totalLen - (TRACK_GEOM_B.s1 + TRACK_GEOM_B.straightNS * 0.5);
const NORTH_MID_B = TRACK_GEOM_B.totalLen - (TRACK_GEOM_B.s3 + TRACK_GEOM_B.straightEW * 0.5);
const EAST_MID_B = TRACK_GEOM_B.totalLen - (TRACK_GEOM_B.s5 + TRACK_GEOM_B.straightNS * 0.5);

export const RAILWAY_STATIONS: RailwayStationDef[] = [
  {
    id: 'stn_malabar_beach',
    code: 'MLB',
    name: 'Malabar Beach Halt',
    mlName: 'മലബാർ ബീച്ച് ഹാൾട്ട്',
    side: 'south',
    centerX: 0,
    centerZ: RAIL_MAX_Z, // 134
    axis: 'ew',
    outwardX: 0,
    outwardZ: 1,
    tangentX: -1,
    tangentZ: 0,
    platformLength: PLATFORM_LENGTH,
    stopDistA: SOUTH_MID_A,
    stopDistB: SOUTH_MID_B,
    scenicHint: 'Arabian Sea & Malabar Golden Beach',
  },
  {
    id: 'stn_kochi_central',
    code: 'KOC',
    name: 'Kochi Central Jn.',
    mlName: 'കൊച്ചി സെൻട്രൽ ജംഗ്ഷൻ',
    side: 'west',
    centerX: RAIL_MIN_X, // -164
    centerZ: -22,
    axis: 'ns',
    outwardX: -1,
    outwardZ: 0,
    tangentX: 0,
    tangentZ: -1,
    platformLength: PLATFORM_LENGTH,
    stopDistA: WEST_MID_A,
    stopDistB: WEST_MID_B,
    scenicHint: 'West Town Bazaar & Coastal Hills',
  },
  {
    id: 'stn_airport_exp',
    code: 'AIR',
    name: 'Airport Express Stn.',
    mlName: 'എയർപോർട്ട് എക്സ്പ്രസ് സ്റ്റേഷൻ',
    side: 'north',
    centerX: 0,
    centerZ: RAIL_MIN_Z, // -178
    axis: 'ew',
    outwardX: 0,
    outwardZ: -1,
    tangentX: 1,
    tangentZ: 0,
    platformLength: PLATFORM_LENGTH,
    stopDistA: NORTH_MID_A,
    stopDistB: NORTH_MID_B,
    scenicHint: 'Kerala International Airport & Northern Ghats',
  },
  {
    id: 'stn_ghats_view',
    code: 'GHV',
    name: 'Ghats View Jn.',
    mlName: 'ഘട്ട്സ് വ്യൂ ജംഗ്ഷൻ',
    side: 'east',
    centerX: RAIL_MAX_X, // +164
    centerZ: -22,
    axis: 'ns',
    outwardX: 1,
    outwardZ: 0,
    tangentX: 0,
    tangentZ: 1,
    platformLength: PLATFORM_LENGTH,
    stopDistA: EAST_MID_A,
    stopDistB: EAST_MID_B,
    scenicHint: 'Western Ghats Mountain Ridge',
  },
];

// ============================================================================
// 4 DISTINCT KERALA TRAINS (2 on Track A / PF 1 L->R, 2 on Track B / PF B R->L)
// ============================================================================
export const TRAIN_DEFS: TrainDef[] = [
  {
    id: 'train_venad',
    number: '16301',
    name: 'Venad Express',
    mlName: 'വേണാട് എക്സ്പ്രസ്',
    track: 'A',
    platform: '1',
    locoColor: 0xc85524, // Authentic Indian Railways burnt-saffron WAP-7
    coachColor: 0x264b78, // Classic Kerala ICF/LHB steel-blue
    stripeColor: 0xf0dfab,
    roofColor: 0xc8d1db,
    initialPhase: 0.04, // Just approaching Malabar Beach Halt!
    cruiseSpeed: 18.5,
  },
  {
    id: 'train_vande',
    number: '20631',
    name: 'Vande Kerala Express',
    mlName: 'വന്ദേ കേരള എക്സ്പ്രസ്',
    track: 'A',
    platform: '1',
    locoColor: 0xedf0f4, // Sleek Vande Bharat pearl-silver & saffron-navy
    coachColor: 0xe6ebf0,
    stripeColor: 0xd96b27,
    roofColor: 0x213859,
    initialPhase: 0.54,
    cruiseSpeed: 19.5,
  },
  {
    id: 'train_malabar',
    number: '12625',
    name: 'Malabar Mail',
    mlName: 'മലബാർ മെയിൽ',
    track: 'B',
    platform: 'B',
    locoColor: 0x8b2323, // Classic LHB crimson WAP-4
    coachColor: 0x731d1d, // Authentic Rajdhani/Mail maroon
    stripeColor: 0xdba834,
    roofColor: 0xcfd6de,
    initialPhase: 0.24,
    cruiseSpeed: 18.0,
  },
  {
    id: 'train_parasuram',
    number: '16649',
    name: 'Parasuram Express',
    mlName: 'പരശുറാം എക്സ്പ്രസ്',
    track: 'B',
    platform: 'B',
    locoColor: 0x1f5c47, // Deep Malabar emerald coastal livery
    coachColor: 0x276b53,
    stripeColor: 0xe9d384,
    roofColor: 0xc8d9d2,
    initialPhase: 0.74,
    cruiseSpeed: 18.5,
  },
];

const STATION_DWELL_SEC = 8.0;

function forwardDistanceOnLoop(from: number, to: number, total: number): number {
  return modPos(to - from, total);
}

function getNextStationForTrain(track: RailwayTrackId, distance: number): {
  station: RailwayStationDef;
  dist: number;
} {
  const total = getTrackLength(track);
  let best = RAILWAY_STATIONS[0];
  let bestDist = Infinity;
  for (const st of RAILWAY_STATIONS) {
    const stopD = track === 'A' ? st.stopDistA : st.stopDistB;
    const d = forwardDistanceOnLoop(distance, stopD, total);
    if (d < bestDist) {
      bestDist = d;
      best = st;
    }
  }
  return { station: best, dist: bestDist };
}

function getStationInStopZone(track: RailwayTrackId, distance: number, tolerance = 14): RailwayStationDef | null {
  const total = getTrackLength(track);
  for (const st of RAILWAY_STATIONS) {
    const stopD = track === 'A' ? st.stopDistA : st.stopDistB;
    const fwd = forwardDistanceOnLoop(distance, stopD, total);
    const bwd = forwardDistanceOnLoop(stopD, distance, total);
    if (Math.min(fwd, bwd) <= tolerance) {
      return st;
    }
  }
  return null;
}

/**
 * Converts local station coordinates (along platform, outward from track centerline) to world X/Z.
 */
export function stationLocalToWorld(
  st: RailwayStationDef,
  along: number,
  outward: number,
): { x: number; z: number } {
  return {
    x: st.centerX + st.tangentX * along + st.outwardX * outward,
    z: st.centerZ + st.tangentZ * along + st.outwardZ * outward,
  };
}

/**
 * Converts world X/Z to local coordinates relative to a railway station:
 * - `along`: signed distance along platform (Track A travel direction)
 * - `outward`: signed distance from track centerline (- = Platform 1 inner side, + = Platform B outer side)
 */
export function worldToStationLocal(
  st: RailwayStationDef,
  x: number,
  z: number,
): { along: number; outward: number } {
  const dx = x - st.centerX;
  const dz = z - st.centerZ;
  return {
    along: dx * st.tangentX + dz * st.tangentZ,
    outward: dx * st.outwardX + dz * st.outwardZ,
  };
}

/**
 * Walkable 3D Foot-Overbridge & Platform elevation sampler:
 * lets Sheru Bhai walk onto Platform 1 (y = 0.55), climb the side stairs up to
 * the covered skybridge (y = BRIDGE_DECK_Y = 4.9m) over both tracks, and descend to Platform B!
 */
export function sampleRailwayElevation(x: number, z: number): number {
  let maxY = 0;
  for (const st of RAILWAY_STATIONS) {
    const { along, outward } = worldToStationLocal(st, x, z);
    const absOut = Math.abs(outward);

    // Platform 1 & Platform B raised decks (y = 0.55m) with gentle end ramps
    if (absOut >= 4.4 && absOut <= 9.5 && Math.abs(along) <= st.platformLength * 0.5 + 3.0) {
      const rampT =
        Math.abs(along) <= st.platformLength * 0.5
          ? 1
          : Math.max(0, 1 - (Math.abs(along) - st.platformLength * 0.5) / 3.0);
      maxY = Math.max(maxY, 0.55 * rampT);
    }

    // Foot-Overbridge skybridge span across BOTH tracks at `along` in [-2.2, +2.2]
    if (Math.abs(along) <= 2.2 && absOut <= 8.4) {
      maxY = Math.max(maxY, BRIDGE_DECK_Y);
    }

    // Walkable Stair Ramps on BOTH Platform 1 (outward ~ -7.2) and Platform B (outward ~ +7.2)
    // Ramp runs from `along = 2.0` (top landing y = BRIDGE_DECK_Y) down to `along = 11.5` (platform y = 0.55)
    if (absOut >= 5.6 && absOut <= 8.6 && along >= 1.6 && along <= 12.0) {
      const t = Math.max(0, Math.min(1, (11.5 - along) / 9.5));
      const stairY = 0.55 + t * (BRIDGE_DECK_Y - 0.55);
      maxY = Math.max(maxY, stairY);
    }
  }
  return maxY;
}

const PASSENGER_PALETTE = [
  { shirt: 0xe11d48, lower: 0xfef08a, skin: 0xb68158, isSaree: true },
  { shirt: 0x2563eb, lower: 0xf8fafc, skin: 0xa6734e, isSaree: false },
  { shirt: 0x10b981, lower: 0xf8fafc, skin: 0xc28b62, isSaree: false },
  { shirt: 0x9333ea, lower: 0xfde68a, skin: 0xb07d56, isSaree: true },
  { shirt: 0xf59e0b, lower: 0x1e293b, skin: 0x9f6b47, isSaree: false },
];

export function createInitialRailwayState(): RailwaySimulationState {
  const trains: LiveTrainState[] = TRAIN_DEFS.map((def) => {
    const total = getTrackLength(def.track);
    const distance = modPos(def.initialPhase * total, total);
    const sample = sampleTrackPoint(def.track, distance);
    const next = getNextStationForTrain(def.track, distance);
    return {
      id: def.id,
      number: def.number,
      name: def.name,
      track: def.track,
      platform: def.platform,
      distance,
      speed: def.cruiseSpeed * 0.85,
      phase: 'moving',
      stoppedAtStationId: null,
      dwellTimer: 0,
      departGraceTimer: 0,
      x: sample.x,
      z: sample.z,
      yaw: sample.yaw,
      nextStationId: next.station.id,
      nextStationDist: next.dist,
      honkPending: false,
      obstacleBlocked: false,
      blockedByLabel: null,
    };
  });

  const passengers: StationPassengerState[] = [];
  let pIdx = 0;
  for (const st of RAILWAY_STATIONS) {
    for (const platform of ['1', 'B'] as const) {
      const sign = platform === '1' ? -1 : 1;
      for (let i = 0; i < 5; i++) {
        const pal = PASSENGER_PALETTE[(pIdx + i) % PASSENGER_PALETTE.length];
        const along = -14 + i * 6.5 + (platform === 'B' ? 1.2 : -0.8);
        const depth = 1.6 + (i % 3) * 0.65;
        const world = stationLocalToWorld(st, along, sign * (4.7 + depth));
        // Face toward the tracks
        const faceYaw = Math.atan2(-sign * st.outwardX, -sign * st.outwardZ);
        passengers.push({
          id: `pax_${st.code}_${platform}_${i}`,
          stationId: st.id,
          platform,
          phase: 'waiting',
          alongOffset: along,
          depthOffset: depth,
          targetAlong: along,
          targetDepth: depth,
          x: world.x,
          z: world.z,
          yaw: faceYaw,
          walkPhase: pIdx * 1.3,
          visible: true,
          shirtColor: pal.shirt,
          lowerColor: pal.lower,
          skinColor: pal.skin,
          isSaree: pal.isSaree,
          timer: 0,
        });
        pIdx++;
      }
    }
  }

  return {
    trains,
    passengers,
    riderMode: 'none',
    ridingTrainId: null,
    seatView: 'right_window',
    driverThrottle: 0,
    passingOppositeTrainName: null,
  };
}

/**
 * Scans along `track` ahead of a train's locomotive nose (+8m to +34m) for ANY human,
 * vehicle, NPC, or rigid-body object on/near the rails (ignoring actors safely up on the 4.9m Foot-Overbridge!).
 */
export function findTrackObstacleAhead(
  track: RailwayTrackId,
  trainDistance: number,
  obstacles: TrackObstacle[],
): { distanceAhead: number; label: string } | null {
  if (obstacles.length === 0) return null;
  const total = getTrackLength(track);
  for (let ahead = 8; ahead <= 34; ahead += 3.2) {
    const pt = sampleTrackPoint(track, modPos(trainDistance + ahead, total));
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if ((obs.y ?? 0) >= 3.6) continue; // Safely overhead on Foot-Overbridge or flying!
      const dx = obs.x - pt.x;
      const dz = obs.z - pt.z;
      const hitRadius = obs.radius + 2.35;
      if (dx * dx + dz * dz <= hitRadius * hitRadius) {
        return { distanceAhead: ahead, label: obs.label };
      }
    }
  }
  return null;
}

export function stepRailwaySimulation(
  state: RailwaySimulationState,
  dt: number,
  driverThrottleInput: number = 0,
  obstacles: TrackObstacle[] = [],
): RailwaySimulationState {
  const safeDt = Math.max(0, Math.min(dt, 0.1));

  // 1. Step all 4 trains cleanly along Track A (clockwise) and Track B (counter-clockwise)
  const nextTrains: LiveTrainState[] = state.trains.map((t) => {
    const def = TRAIN_DEFS.find((d) => d.id === t.id)!;
    const total = getTrackLength(t.track);
    const isPlayerDriving = state.riderMode === 'driver' && state.ridingTrainId === t.id;

    // Safe headway check vs other train on the same track so trains NEVER overlap!
    let minAheadSameTrack = Infinity;
    for (const other of state.trains) {
      if (other.id === t.id || other.track !== t.track) continue;
      const gap = forwardDistanceOnLoop(t.distance, other.distance, total);
      if (gap < minAheadSameTrack) minAheadSameTrack = gap;
    }

    // Real-world Track Safety Sensor: ANY human, vehicle, or object on the track stops the train!
    const obsHit = findTrackObstacleAhead(t.track, t.distance, obstacles);
    const obstacleBlocked = obsHit !== null;
    const blockedByLabel = obsHit ? obsHit.label : null;

    let distance = t.distance;
    let speed = t.speed;
    let phase = t.phase;
    let stoppedAtStationId = t.stoppedAtStationId;
    let dwellTimer = t.dwellTimer;
    let departGraceTimer = Math.max(0, t.departGraceTimer - safeDt);
    let honkPending = false;

    if (obstacleBlocked) {
      // Immediate Emergency Braking! Sound horn once when braking engages
      if (!t.obstacleBlocked && speed > 1.0) {
        honkPending = true;
      }
      const emergencyDecel = obsHit.distanceAhead < 16 ? 48 : 30;
      speed = Math.max(0, speed - emergencyDecel * safeDt);
      if (obsHit.distanceAhead <= 11.5) {
        speed = 0; // Hard safety stop before contact!
      }
      distance = modPos(distance + speed * safeDt, total);
      const inZone = getStationInStopZone(t.track, distance, 18);
      if (speed <= 0.1) {
        speed = 0;
        phase = inZone ? 'stopped' : 'braking';
        stoppedAtStationId = inZone ? inZone.id : null;
      } else {
        phase = 'braking';
        stoppedAtStationId = null;
      }
    } else if (isPlayerDriving) {
      const maxDriveSpeed = 24.5;
      if (driverThrottleInput > 0.05) {
        speed = Math.min(maxDriveSpeed, speed + 10.5 * driverThrottleInput * safeDt);
      } else if (driverThrottleInput < -0.05) {
        speed = Math.max(0, speed + 16.5 * driverThrottleInput * safeDt);
      } else {
        // Gentle rail rolling friction
        speed = Math.max(0, speed - 1.6 * safeDt);
      }
      if (minAheadSameTrack < 72) {
        speed = Math.min(speed, Math.max(0, (minAheadSameTrack - 52) * 0.45));
      }
      distance = modPos(distance + speed * safeDt, total);
      const inZone = getStationInStopZone(t.track, distance, 18);
      if (speed < 0.85 && inZone) {
        speed = 0;
        phase = 'stopped';
        stoppedAtStationId = inZone.id;
      } else {
        phase = driverThrottleInput < -0.05 && speed > 0.5 ? 'braking' : 'moving';
        stoppedAtStationId = null;
      }
    } else {
      // Autonomous Kerala Express AI: smooth station approach, 8s dwell for passengers, crisp departure
      if (phase === 'stopped') {
        speed = 0;
        dwellTimer -= safeDt;
        if (dwellTimer <= 0) {
          phase = 'moving';
          stoppedAtStationId = null;
          departGraceTimer = 4.2;
          honkPending = true;
        }
      } else {
        const nextSt = getNextStationForTrain(t.track, distance);
        const approachDist = nextSt.dist;
        let targetSpeed = def.cruiseSpeed;

        if (departGraceTimer <= 0 && approachDist < 48) {
          phase = 'braking';
          targetSpeed = Math.max(1.2, (approachDist / 48) * def.cruiseSpeed);
        } else {
          phase = 'moving';
        }

        if (minAheadSameTrack < 85) {
          targetSpeed = Math.min(targetSpeed, Math.max(0, (minAheadSameTrack - 56) * 0.4));
        }

        const accel = targetSpeed > speed ? 6.5 : 11.5;
        if (speed < targetSpeed) {
          speed = Math.min(targetSpeed, speed + accel * safeDt);
        } else {
          speed = Math.max(targetSpeed, speed - accel * safeDt);
        }

        const stepDist = speed * safeDt;
        if (departGraceTimer <= 0 && approachDist <= Math.max(1.2, stepDist + 0.35)) {
          // Stop cleanly dead-center at the station platform!
          distance = t.track === 'A' ? nextSt.station.stopDistA : nextSt.station.stopDistB;
          speed = 0;
          phase = 'stopped';
          stoppedAtStationId = nextSt.station.id;
          dwellTimer = STATION_DWELL_SEC;
          honkPending = true;
        } else {
          distance = modPos(distance + stepDist, total);
        }
      }
    }

    const sample = sampleTrackPoint(t.track, distance);
    const nextInfo = getNextStationForTrain(t.track, modPos(distance + 4, total));
    return {
      ...t,
      distance,
      speed,
      phase,
      stoppedAtStationId,
      dwellTimer,
      departGraceTimer,
      x: sample.x,
      z: sample.z,
      yaw: sample.yaw,
      nextStationId: nextInfo.station.id,
      nextStationDist: Math.round(nextInfo.dist),
      honkPending,
      obstacleBlocked,
      blockedByLabel,
    };
  });

  // 2. Detect opposite-direction train passing right outside our window!
  let passingOppositeTrainName: string | null = null;
  if (state.riderMode !== 'none' && state.ridingTrainId) {
    const myTrain = nextTrains.find((t) => t.id === state.ridingTrainId);
    if (myTrain) {
      for (const other of nextTrains) {
        if (other.track === myTrain.track) continue;
        const d = Math.hypot(other.x - myTrain.x, other.z - myTrain.z);
        if (d < 46) {
          passingOppositeTrainName = `${other.number} ${other.name}`;
          break;
        }
      }
    }
  }

  // 3. Step live animated station passengers (waiting -> boarding -> alighting -> strolling out)
  const nextPassengers: StationPassengerState[] = state.passengers.map((p, idx) => {
    const st = RAILWAY_STATIONS.find((s) => s.id === p.stationId)!;
    const sign = p.platform === '1' ? -1 : 1;
    const stoppedTrainHere = nextTrains.find(
      (t) => t.phase === 'stopped' && t.stoppedAtStationId === st.id && t.platform === p.platform,
    );

    let phase = p.phase;
    let along = p.alongOffset;
    let depth = p.depthOffset;
    let targetAlong = p.targetAlong;
    let targetDepth = p.targetDepth;
    let visible = p.visible;
    let walkPhase = p.walkPhase;
    let timer = p.timer + safeDt;
    let yaw = p.yaw;

    // Nearest coach door along-offsets: -12, -2, +8
    const doorAlong = idx % 3 === 0 ? -12 : idx % 3 === 1 ? -2 : 8;

    if (phase === 'waiting') {
      visible = true;
      if (stoppedTrainHere && idx % 5 !== 4) {
        // Walk briskly toward the open coach door to board!
        phase = 'boarding';
        targetAlong = doorAlong;
        targetDepth = 0.05;
        timer = 0;
      } else {
        // Subtle idle platform pacing & facing track
        yaw = Math.atan2(-sign * st.outwardX, -sign * st.outwardZ);
      }
    } else if (phase === 'boarding') {
      if (!stoppedTrainHere) {
        // Train departed before passenger reached door — wait for next train
        phase = 'waiting';
        targetDepth = 1.8;
      } else {
        const da = targetAlong - along;
        const dd = targetDepth - depth;
        const dist = Math.hypot(da, dd);
        if (dist < 0.35) {
          phase = 'boarded';
          visible = false;
          timer = 0;
        } else {
          const step = Math.min(dist, 2.8 * safeDt);
          along += (da / dist) * step;
          depth += (dd / dist) * step;
          walkPhase += safeDt * 9;
          const vx = st.tangentX * (da / dist) + sign * st.outwardX * (dd / dist);
          const vz = st.tangentZ * (da / dist) + sign * st.outwardZ * (dd / dist);
          yaw = Math.atan2(vx, vz);
        }
      }
    } else if (phase === 'boarded') {
      visible = false;
      // Step off the train as an alighting passenger once a train stops here (or same train finishes half-dwell)
      if (stoppedTrainHere && timer > 2.2) {
        phase = 'alighting';
        along = doorAlong;
        depth = 0.15;
        targetAlong = doorAlong + (idx % 2 === 0 ? 3.5 : -3.5);
        targetDepth = 3.2;
        visible = true;
        timer = 0;
      }
    } else if (phase === 'alighting') {
      visible = true;
      const da = targetAlong - along;
      const dd = targetDepth - depth;
      const dist = Math.hypot(da, dd);
      if (dist < 0.35) {
        phase = 'strolling_out';
        targetAlong = (idx % 2 === 0 ? 1 : -1) * 14;
        targetDepth = 2.4;
        timer = 0;
      } else {
        const step = Math.min(dist, 2.3 * safeDt);
        along += (da / dist) * step;
        depth += (dd / dist) * step;
        walkPhase += safeDt * 7.5;
        const vx = st.tangentX * (da / dist) + sign * st.outwardX * (dd / dist);
        const vz = st.tangentZ * (da / dist) + sign * st.outwardZ * (dd / dist);
        yaw = Math.atan2(vx, vz);
      }
    } else if (phase === 'strolling_out') {
      visible = true;
      const da = targetAlong - along;
      const dd = targetDepth - depth;
      const dist = Math.hypot(da, dd);
      if (dist < 0.4 || timer > 6) {
        // Fresh commuter arrives on platform to wait for the next train!
        phase = 'waiting';
        targetAlong = -13 + (idx % 5) * 6.5;
        targetDepth = 1.6 + (idx % 3) * 0.55;
        along = targetAlong;
        depth = targetDepth;
        timer = 0;
      } else {
        const step = Math.min(dist, 1.9 * safeDt);
        along += (da / dist) * step;
        depth += (dd / dist) * step;
        walkPhase += safeDt * 6.5;
        const vx = st.tangentX * (da / dist) + sign * st.outwardX * (dd / dist);
        const vz = st.tangentZ * (da / dist) + sign * st.outwardZ * (dd / dist);
        yaw = Math.atan2(vx, vz);
      }
    }

    const world = stationLocalToWorld(st, along, sign * (4.7 + depth));
    return {
      ...p,
      phase,
      alongOffset: along,
      depthOffset: depth,
      targetAlong,
      targetDepth,
      x: world.x,
      z: world.z,
      yaw,
      walkPhase,
      visible,
      timer,
    };
  });

  return {
    ...state,
    trains: nextTrains,
    passengers: nextPassengers,
    driverThrottle: driverThrottleInput,
    passingOppositeTrainName,
  };
}

export interface PlatformContext {
  station: RailwayStationDef;
  platform: PlatformId;
  track: RailwayTrackId;
  stoppedTrain: LiveTrainState | null;
  nextTrain: LiveTrainState;
  nextTrainEtaSec: number;
}

/**
 * Checks whether Sheru is currently standing on Platform 1 or Platform B at any of the 4 stations.
 */
export function findPlayerPlatformContext(
  state: RailwaySimulationState,
  playerX: number,
  playerZ: number,
): PlatformContext | null {
  for (const st of RAILWAY_STATIONS) {
    const { along, outward } = worldToStationLocal(st, playerX, playerZ);
    if (Math.abs(along) > st.platformLength * 0.5 + 3.5) continue;
    if (Math.abs(outward) < 2.2 || Math.abs(outward) > 12.0) continue;

    const platform: PlatformId = outward < 0 ? '1' : 'B';
    const track: RailwayTrackId = platform === '1' ? 'A' : 'B';
    const trackTrains = state.trains.filter((t) => t.track === track);
    const stoppedTrain =
      trackTrains.find((t) => t.phase === 'stopped' && t.stoppedAtStationId === st.id) ?? null;

    // Find closest incoming train on this platform's track
    const total = getTrackLength(track);
    const stopD = track === 'A' ? st.stopDistA : st.stopDistB;
    let bestTrain = trackTrains[0];
    let bestDist = Infinity;
    for (const tr of trackTrains) {
      const d = forwardDistanceOnLoop(tr.distance, stopD, total);
      if (d < bestDist) {
        bestDist = d;
        bestTrain = tr;
      }
    }
    const avgSpeed = Math.max(8, bestTrain.speed || 15);
    const eta = stoppedTrain ? 0 : Math.max(1, Math.round(bestDist / avgSpeed));
    return {
      station: st,
      platform,
      track,
      stoppedTrain,
      nextTrain: bestTrain,
      nextTrainEtaSec: eta,
    };
  }
  return null;
}

/**
 * Allows Sheru to board a stopped train at the current station as either 'driver' or 'passenger'.
 */
export function boardStoppedTrain(
  state: RailwaySimulationState,
  trainId: string,
  mode: 'driver' | 'passenger',
): { state: RailwaySimulationState; success: boolean; message: string } {
  const tr = state.trains.find((t) => t.id === trainId);
  if (!tr || tr.phase !== 'stopped') {
    return {
      state,
      success: false,
      message: 'Wait for the train to arrive and stop at the station first!',
    };
  }
  return {
    state: {
      ...state,
      riderMode: mode,
      ridingTrainId: tr.id,
      seatView: mode === 'passenger' ? 'right_window' : 'outside',
      driverThrottle: 0,
    },
    success: true,
    message:
      mode === 'driver'
        ? `Driving ${tr.number} ${tr.name}! Press W to accelerate, S to brake & stop at any station.`
        : `Window Seat aboard ${tr.number} ${tr.name}! Enjoy Kerala's sea, mountains & passing trains — get off when stopped at your station!`,
  };
}

/**
 * Strict Real-World Alighting Rule:
 * Sheru can ONLY get off the train when it is STOPPED at a station!
 */
export function alightFromTrain(state: RailwaySimulationState): {
  state: RailwaySimulationState;
  success: boolean;
  exitX: number;
  exitZ: number;
  stationName: string | null;
  message: string;
} {
  if (state.riderMode === 'none' || !state.ridingTrainId) {
    return { state, success: false, exitX: 0, exitZ: 0, stationName: null, message: '' };
  }
  const tr = state.trains.find((t) => t.id === state.ridingTrainId);
  if (!tr) {
    return { state, success: false, exitX: 0, exitZ: 0, stationName: null, message: '' };
  }
  if (tr.phase !== 'stopped' || !tr.stoppedAtStationId) {
    return {
      state,
      success: false,
      exitX: tr.x,
      exitZ: tr.z,
      stationName: null,
      message:
        state.riderMode === 'driver'
          ? 'Brake & stop inside a station first before getting off!'
          : 'Train is moving! Wait until it stops at your station to get off.',
    };
  }
  const st = RAILWAY_STATIONS.find((s) => s.id === tr.stoppedAtStationId)!;
  const sign = tr.platform === '1' ? -1 : 1;
  const platformPos = stationLocalToWorld(st, 0, sign * PLATFORM_CENTER_OFFSET);
  return {
    state: {
      ...state,
      riderMode: 'none',
      ridingTrainId: null,
      driverThrottle: 0,
      passingOppositeTrainName: null,
    },
    success: true,
    exitX: platformPos.x,
    exitZ: platformPos.z,
    stationName: st.name,
    message: `Stepped out onto ${st.name} (Platform ${tr.platform})!`,
  };
}

/**
 * Brings the nearest incoming train on `platform` cleanly into the final approach (~32m away)
 * if the player taps "Wait for Next Train" instead of waiting in real time.
 */
export function fastForwardNextTrainAtPlatform(
  state: RailwaySimulationState,
  stationId: string,
  platform: PlatformId,
): RailwaySimulationState {
  const st = RAILWAY_STATIONS.find((s) => s.id === stationId);
  if (!st) return state;
  const track: RailwayTrackId = platform === '1' ? 'A' : 'B';
  const total = getTrackLength(track);
  const stopD = track === 'A' ? st.stopDistA : st.stopDistB;
  const trackTrains = state.trains.filter((t) => t.track === track);
  if (trackTrains.some((t) => t.phase === 'stopped' && t.stoppedAtStationId === st.id)) {
    return state;
  }

  let best = trackTrains[0];
  let bestDist = Infinity;
  for (const tr of trackTrains) {
    const d = forwardDistanceOnLoop(tr.distance, stopD, total);
    if (d < bestDist) {
      bestDist = d;
      best = tr;
    }
  }
  const approachDist = modPos(stopD - 14, total);
  const sample = sampleTrackPoint(track, approachDist);
  return {
    ...state,
    trains: state.trains.map((t) =>
      t.id === best.id
        ? {
            ...t,
            distance: approachDist,
            speed: 13,
            phase: 'braking',
            stoppedAtStationId: null,
            dwellTimer: 0,
            departGraceTimer: 0,
            x: sample.x,
            z: sample.z,
            yaw: sample.yaw,
            nextStationId: st.id,
            nextStationDist: 28,
          }
        : t,
    ),
  };
}

export function buildRailwayHudState(
  state: RailwaySimulationState,
  playerX: number,
  playerZ: number,
): RailwayHudState | null {
  if (state.riderMode !== 'none' && state.ridingTrainId) {
    const tr = state.trains.find((t) => t.id === state.ridingTrainId);
    if (!tr) return null;
    const curSt = tr.stoppedAtStationId
      ? RAILWAY_STATIONS.find((s) => s.id === tr.stoppedAtStationId) ?? null
      : null;
    const nextSt = RAILWAY_STATIONS.find((s) => s.id === tr.nextStationId) ?? RAILWAY_STATIONS[0];
    return {
      atStationId: curSt?.id ?? null,
      atStationName: curSt?.name ?? null,
      atStationCode: curSt?.code ?? null,
      platform: tr.platform,
      platformDirectionLabel: tr.platform === '1' ? 'Platform 1 (L → R)' : 'Platform B (R → L)',
      stoppedTrainId: curSt ? tr.id : null,
      stoppedTrainNumber: curSt ? tr.number : null,
      stoppedTrainName: curSt ? tr.name : null,
      nextTrainNumber: null,
      nextTrainName: null,
      nextTrainEtaSec: null,
      riderMode: state.riderMode,
      trainId: tr.id,
      trainNumber: tr.number,
      trainName: tr.name,
      trainTrack: tr.track,
      trainSpeedKmh: Math.round(tr.speed * 4),
      trainPhase: tr.phase,
      currentStationName: curSt?.name ?? null,
      nextStationName: nextSt.name,
      nextStationDistM: tr.nextStationDist,
      canAlight: tr.phase === 'stopped' && curSt !== null,
      seatView: state.seatView,
      passingOppositeTrainName: state.passingOppositeTrainName,
      obstacleStoppedLabel: tr.obstacleBlocked ? tr.blockedByLabel : null,
    };
  }

  const ctx = findPlayerPlatformContext(state, playerX, playerZ);
  if (!ctx) return null;
  return {
    atStationId: ctx.station.id,
    atStationName: ctx.station.name,
    atStationCode: ctx.station.code,
    platform: ctx.platform,
    platformDirectionLabel:
      ctx.platform === '1' ? 'Platform 1 · Left → Right' : 'Platform B · Right → Left',
    stoppedTrainId: ctx.stoppedTrain?.id ?? null,
    stoppedTrainNumber: ctx.stoppedTrain?.number ?? null,
    stoppedTrainName: ctx.stoppedTrain?.name ?? null,
    nextTrainNumber: ctx.nextTrain.number,
    nextTrainName: ctx.nextTrain.name,
    nextTrainEtaSec: ctx.nextTrainEtaSec,
    riderMode: 'none',
    trainId: null,
    trainNumber: null,
    trainName: null,
    trainTrack: null,
    trainSpeedKmh: 0,
    trainPhase: 'moving',
    currentStationName: ctx.station.name,
    nextStationName: null,
    nextStationDistM: 0,
    canAlight: false,
    seatView: state.seatView,
    passingOppositeTrainName: null,
    obstacleStoppedLabel: null,
  };
}
