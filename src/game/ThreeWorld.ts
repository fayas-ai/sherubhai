import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { AD_SLOTS, AdSlotVariant, buildAdSlotSrcDoc } from '../components/AdSlot';
import {
  Ad3DSurface,
  assignPooled3DAdSurfaces,
  buildTown3DAdSurfaces,
} from './ad3dPool';
import {
  AABB,
  AutoDestination,
  BuildingDef,
  GameProgressState,
  GameScreenState,
  GameSettings,
  HudSnapshot,
  NearbyInteractable,
  NpcTag,
  OwnedBusinessRecord,
  Vec2,
  VehicleDef,
  WeatherCondition,
} from '../types/game';
import {
  AD_BOARDS,
  AUTO_STANDS,
  BUILDINGS,
  BUS_STOPS,
  EMPTY_PLOTS,
  NPCS,
  PARKING_BAYS,
  PLAYER_SPAWN,
  RESORT_POOL_BOUNDS,
  VEHICLES,
  WORLD_COLLECTIBLES,
  WORLD_RADIUS,
  getDistrictAt,
} from '../data/worldData';
import { VEHICLE_CATALOG } from '../data/vehiclesData';
import {
  HOSPITAL_INTERIOR_BOUNDS,
  checkPalmTreeCollision,
  computePalmShakeState,
  getTimeOfDayPhase,
  getWorldColliders,
  isInsideHospitalInterior,
  isSheruInCoconutDropRange,
  resolveCircleWorldCollision,
} from './gameLogic';
import {
  AirportComplexRig,
  BuildingMeshHandle,
  CoconutPalmRig,
  DroppedPurseRig,
  FallingCoconutRig,
  HospitalInteriorRig,
  NpcModelRig,
  PickpocketThiefRig,
  SheruModelRig,
  SkyDomeRig,
  TownPedestrianRig,
  TrafficLightRig,
  applyPlayerAppearance,
  createAdBoard300x250Model,
  createAirportComplexModel,
  createAutoStandModel,
  createBuildingLodProxy,
  createBuildingModel,
  createBuiltShopModel,
  createBusStopModel,
  createCoconutPalmRig,
  createCollectibleModel,
  createDroppedPurseModel,
  createEmptyPlotModel,
  createFallingCoconutRig,
  createGoatModel,
  createGoldenJunctionStatue,
  createNpcModel,
  createParkingBayModel,
  createPickpocketThiefModel,
  createRealisticSkyDome,
  createSheruBhaiModel,
  createStreetLamp,
  createTownPedestrianModel,
  createTrafficLightModel,
  createVictimGirlModel,
  createZebraCrossing,
} from './models';
import {
  AIRPORT_RUNWAY,
  evaluateAirplaneHazard,
  isAircraftType,
  isPointOnAirportTarmac,
  mapMobileFlightCursor,
  stepAirplanePhysics,
} from './vehiclePhysics';
import {
  PhysicsDynamicActor,
  RigidBodyProp,
  SolidCircle,
  SolidOBB,
  WORLD_RAMPS,
  createOpenWorldProps,
  distanceToVehicleHull,
  findSafeVehicleExitPoint,
  pushVehicleSolidOBBs,
  resolveCharacterSolidBodies,
  resolveVehiclePairCollision,
  sampleWorldSurface,
  stepCharacterPhysics,
  stepRigidBodyProps,
  stepVehicleChassisPhysics,
} from './openWorldPhysics';
import {
  PhysicsPropVisualRig,
  createRigidBodyPropVisual,
  createStuntRampMesh,
} from './physicsPropModels';
import {
  AUX_PAVED_ROADS,
  SHERU_STATUE_ROUNDABOUT,
  SirenSource,
  TOWN_CROWD_ROUTES,
  TOWN_PALM_TREES,
  TOWN_ROADS,
  TOWN_TRAFFIC_ROUTES,
  computeRoadAutopilotTarget,
  computeSirenYieldBehavior,
  constrainVehicleToDrivableRoads,
  getRoadBounds,
  getRoadNameAt,
  snapPointToNearestRoad,
} from './roadNetwork';
import { VehicleModelRig, createDetailedVehicleModel } from './vehicleModels';
import {
  createGrassTexture,
  createPlasterBumpTexture,
  createRoadTexture,
  createSignboardTexture,
  createStreetPuddleTexture,
} from './textures';
import {
  StreetPuddleSpec,
  WeatherControllerState,
  buildWeatherHudState,
  createInitialWeatherState,
  cycleWeatherCondition,
  generateStreetPuddleSpecs,
  getEffectiveFogRange,
  getPuddleVisibility,
  getWeatherVisualConfig,
  isPointInActivePuddle,
  stepWeatherCycle,
} from './weatherLogic';
import {
  NpcPanicState,
  PurseChaseAction,
  PurseChaseActionResult,
  PurseChaseState,
  applyPurseChaseAction,
  buildPurseChaseHudState,
  computePanickedChasePose,
  createInitialChaseState,
  shouldPhysicalTackleCatch,
  startPurseChase,
  stepPocketKidnapperNpcPanic,
  stepPurseChase,
} from './chaseLogic';
import {
  AdaptivePerfState,
  PerformanceBudget,
  createAdaptivePerfState,
  detectDevicePerformanceBudget,
  stepAdaptivePerformance,
} from './performanceLogic';
import {
  DynamicLodState,
  LodTelemetrySnapshot,
  LodTier,
  classifyLodTierWithHysteresis,
  classifyVisibleWithHysteresis,
  createDynamicLodState,
  updateDynamicLodScale,
} from './lodSystem';
import {
  BEACH_BENCHES,
  PLATFORM_CENTER_OFFSET,
  RAILWAY_STATIONS,
  RailwaySimulationState,
  TRAIN_DEFS,
  TrackObstacle,
  alightFromTrain,
  boardStoppedTrain,
  buildRailwayHudState,
  canVehicleAccessBeach,
  createInitialRailwayState,
  fastForwardNextTrainAtPlatform,
  findPlayerPlatformContext,
  isPointOnBeachZone,
  sampleTrackPoint,
  stationLocalToWorld,
  stepRailwaySimulation,
} from './railwayLogic';
import {
  ArabianSeaRig,
  KeralaTrainRig,
  createArabianSeaAndBeach,
  createDoubleTrackRailwayMesh,
  createKeralaTrainRig,
  createRailwayStationModel,
  createStationPassengerRig,
  createWesternGhatsMountains,
  updateKeralaTrainRigTransform,
} from './railwayModels';
import { soundEngine } from './audio';

// Module-level zero-GC scratch helpers
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _skyDay = new THREE.Color(0xc2dcf0);
const _skySunset = new THREE.Color(0xe6955e);
const _skyNight = new THREE.Color(0x101a2b);
const _skyTopDay = new THREE.Color(0x3a76b8);
const _skyTopSunset = new THREE.Color(0x3b3564);
const _skyTopNight = new THREE.Color(0x050a14);
const _skyTopWork = new THREE.Color();
const _skyWork = new THREE.Color();
const _weatherSky = new THREE.Color();
const _weatherFog = new THREE.Color();
const _roadTintTarget = new THREE.Color();
const _puddleTint = new THREE.Color();
const _sunDirWork = new THREE.Vector3();

function freezeStaticHierarchy(obj: THREE.Object3D): void {
  obj.updateMatrixWorld(true);
  obj.traverse((child) => {
    child.matrixAutoUpdate = false;
    child.updateMatrix();
  });
}

interface ParticleSlot {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

interface LiveNpc {
  id: string;
  homeX: number;
  homeZ: number;
  patrolRadius: number;
  x: number;
  z: number;
  yaw: number;
  targetX: number;
  targetZ: number;
  waitTimer: number;
  walkPhase: number;
  rig: NpcModelRig;
  isBoss?: boolean;
  tag?: NpcTag;
  panicPhase?: number;
  panicState?: NpcPanicState;
  panicDustTimer?: number;
  name: string;
  role: string;
  homeBuildingId?: string;
}

interface LiveVehicle {
  id: string;
  name: string;
  type: VehicleDef['type'];
  x: number;
  y: number;
  z: number;
  vy: number;
  yaw: number;
  pitch: number;
  roll: number;
  pitchVel: number;
  rollVel: number;
  suspY: number;
  suspVy: number;
  grounded: boolean;
  speed: number;
  lateralSpeed: number;
  maxSpeed: number;
  mass: number;
  steerAngle: number;
  steerInput: number;
  isAircraft: boolean;
  flightState: 'ground' | 'takeoff_ready' | 'airborne';
  autoLanding: boolean;
  peakAltitude: number;
  hasSiren: boolean;
  sirenOn: boolean;
  rig: VehicleModelRig;
  mesh: THREE.Group;
}

interface AiTrafficVehicle {
  id: string;
  roadId: string;
  name: string;
  type: VehicleDef['type'];
  isBus: boolean;
  isAuto: boolean;
  isEmergency: boolean;
  waypoints: Vec2[];
  wpIndex: number;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  cruiseSpeed: number;
  stopTimer: number;
  lastBusStopId: string;
  rig: VehicleModelRig;
  active: boolean;
}

interface TownCrowdWalker {
  id: string;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  t: number;
  dir: 1 | -1;
  speed: number;
  length: number;
  walkPhase: number;
  x: number;
  z: number;
  rig: TownPedestrianRig;
}

interface LiveCoconutPalm {
  x: number;
  z: number;
  h: number;
  rig: CoconutPalmRig;
  shaking: boolean;
  shakeTime: number;
  impactDirX: number;
  impactDirZ: number;
  phaseOffset: number;
  detachedCocoIdx: number;
  regrowTimer: number;
  dropCooldown: number;
}

interface FallingCoconut {
  rig: FallingCoconutRig;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spinX: number;
  spinZ: number;
  phase: 'idle' | 'falling' | 'bouncing' | 'resting';
  restTimer: number;
}

export interface ThreeWorldCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onInteract: (target: NearbyInteractable) => void;
  onCollectiblePickup: (collectibleId: string) => void;
  onVehicleEnter: (vehicleId: string) => void;
  onBuildingApproach: (buildingId: string) => void;
  onAutoRandomEvent: (district: string) => void;
  onPositionSample: (pos: { x: number; y: number; z: number; yaw: number }) => void;
  onRoadEgo: (kind: 'auto' | 'bus') => void;
  onEmergencyIncident: (
    cause: 'coconut_drop' | 'crossing_hit' | 'pedestrian_bump' | 'airplane_crash',
    x: number,
    z: number,
    roadName?: string,
  ) => void;
  onSafeLanding?: (aircraftName: string) => void;
  onAmbulanceArrived: (ambulanceId: string) => void;
  onHospitalArrived: () => void;
  onVehicleParked: (vehicleId: string, x: number, z: number, yaw: number, bayName?: string) => void;
}

export class ThreeWorld {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private cssRenderer: CSS3DRenderer;
  private cssScene: THREE.Scene;
  private adSurfaces: Ad3DSurface[] = [];
  private adBoardPool: {
    obj: CSS3DObject;
    el: HTMLDivElement;
    iframe: HTMLIFrameElement;
    variant: AdSlotVariant;
    loaded: boolean;
    assignedSurfaceId: string | null;
  }[] = [];
  private adBannerPool: {
    obj: CSS3DObject;
    el: HTMLDivElement;
    iframe: HTMLIFrameElement;
    variant: AdSlotVariant;
    loaded: boolean;
    assignedSurfaceId: string | null;
  }[] = [];
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;

  private sunLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private skyDome: SkyDomeRig;
  private nightLights: THREE.PointLight[] = [];
  private lampBulbMats: THREE.MeshStandardMaterial[] = [];
  private windowMats: THREE.MeshStandardMaterial[] = [];
  private airportRig: AirportComplexRig | null = null;
  private perfBudget: PerformanceBudget;
  private adaptivePerf: AdaptivePerfState;
  private lodState: DynamicLodState;
  private lodSweepAccum = 1;
  private lodBuildingEntries: {
    id: string;
    x: number;
    z: number;
    high: THREE.Group;
    low: THREE.Group;
    tier: LodTier;
    isHospital: boolean;
  }[] = [];
  private lodPalmEntries: {
    x: number;
    z: number;
    rig: CoconutPalmRig;
    tier: LodTier;
    isPerimeter: boolean;
  }[] = [];
  private lodPropEntries: {
    x: number;
    z: number;
    object: THREE.Object3D;
    visible: boolean;
    isLarge: boolean;
  }[] = [];
  private lodTelemetry: LodTelemetrySnapshot = {
    quality: 'medium',
    lodScale: 1,
    cameraFar: 225,
    buildingsLod0: 0,
    buildingsLod1: 0,
    buildingsCulled: 0,
    palmsLod0: 0,
    palmsLod1: 0,
    palmsCulled: 0,
    propsVisible: 0,
    propsCulled: 0,
    actorsVisible: 0,
    actorsCulled: 0,
  };

  private sheru: SheruModelRig;
  private playerX = PLAYER_SPAWN.x;
  private playerY = 0;
  private playerZ = PLAYER_SPAWN.z;
  private playerVx = 0;
  private playerVy = 0;
  private playerVz = 0;
  private playerYaw = PLAYER_SPAWN.yaw;
  private physicsProps: RigidBodyProp[] = [];
  private physicsPropVisuals: PhysicsPropVisualRig[] = [];
  private physicsActorsScratch: PhysicsDynamicActor[] = [];
  private driftSmokeCooldown = 0;
  private propSoundCooldown = 0;
  private vehicleBumpCooldown = 0;
  private walkPhase = 0;
  private footstepAccum = 0;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private squashX = 1;
  private squashY = 1;
  private reactionTimer = 0;
  private reactionType: 'none' | 'celebrate' | 'flex' | 'laugh' = 'none';

  // Camera state
  private camYaw = PLAYER_SPAWN.yaw;
  private camPitch = 0.28;
  private camCurrentPos = new THREE.Vector3(0, 7, 22);
  private camLookTarget = new THREE.Vector3(0, 1.8, 10);
  private camShakeTrauma = 0;
  private isDraggingCamera = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Input state
  private keysHeld = new Set<string>();
  private touchMoveX = 0;
  private touchMoveY = 0;
  private touchRunning = false;
  private touchFlightVertical: -1 | 0 | 1 = 0;

  // World entities
  private colliders: AABB[] = [];
  private solidObbsScratch: SolidOBB[] = [];
  private solidCirclesScratch: SolidCircle[] = [];
  private buildingHandles = new Map<string, BuildingMeshHandle>();
  private plotMeshes = new Map<string, THREE.Group>();
  private builtShopAnimations: { mesh: THREE.Group; progress: number }[] = [];
  private liveNpcs: LiveNpc[] = [];
  private townCrowd: TownCrowdWalker[] = [];
  private goldenStatueRig: {
    group: THREE.Group;
    statueSpinPivot: THREE.Group;
    uplightMat: THREE.MeshStandardMaterial;
  } | null = null;
  private liveVehicles: LiveVehicle[] = [];
  private aiTraffic: AiTrafficVehicle[] = [];
  private trafficLights: { rig: TrafficLightRig; axis: 'ns' | 'ew' }[] = [];
  private trafficLightCycle = 0;
  private trafficLightState: 'ns_green' | 'ew_green' | 'yellow' = 'ns_green';
  private livePalms: LiveCoconutPalm[] = [];
  private fallingCoconut: FallingCoconut | null = null;
  private underPalmTimer = 0;
  private coconutCooldown = 0;
  private accidentCooldown = 0;
  private roadEgoCooldown = 0;
  private poolSplashCooldown = 0;
  private inPool = false;
  private inHospital = false;
  private hospitalInteriorRig: HospitalInteriorRig | null = null;

  // Autopilot & Emergency 108 Ambulance Rescue state
  private autopilotDest: AutoDestination | null = null;
  private autopilotHornCooldown = 0;
  private emergencyDispatch: {
    active: boolean;
    phase: 'en_route' | 'arrived' | 'to_hospital';
    targetX: number;
    targetZ: number;
    ambulanceId: string;
  } = {
    active: false,
    phase: 'en_route',
    targetX: 0,
    targetZ: 0,
    ambulanceId: 'veh_ambulance_108',
  };

  private collectibleMeshes = new Map<string, THREE.Group>();
  private collectibleGems: THREE.Object3D[] = [];
  private roamingGoat: THREE.Group;
  private goatAngle = 0;
  private questBeacon: THREE.Group;
  private questBeaconArrow: THREE.Object3D | null = null;
  private questTargetCoords: Vec2 | null = null;
  private activeVehicleId: string | null = null;

  // Pooled 3D Crash Blast & Fire Rescue VFX (zero-GC)
  private blastRig!: {
    group: THREE.Group;
    core: THREE.Mesh;
    coreMat: THREE.MeshBasicMaterial;
    shell: THREE.Mesh;
    shellMat: THREE.MeshBasicMaterial;
    ring: THREE.Mesh;
    ringMat: THREE.MeshBasicMaterial;
    scorch: THREE.Mesh;
    scorchMat: THREE.MeshBasicMaterial;
  };
  private blastState = {
    active: false,
    x: 0,
    z: 0,
    age: 0,
    duration: 12,
    smokeTimer: 0,
    foamTimer: 0,
  };
  private fireRescueDispatch = {
    active: false,
    arrived: false,
    targetX: 0,
    targetZ: 0,
    fireEngineId: 'veh_fire_engine',
    timer: 0,
  };

  // Pooled particles (Zero-GC InstancedMesh)
  private particleMesh: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];

  // Runtime & Lag-Prevention Throttle state
  private mode: GameScreenState = 'title';
  private modalOpen = false;
  private settings: GameSettings;
  private callbacks: ThreeWorldCallbacks;
  private timeOfDay = 0.28;
  private lastLightingPhase = '';
  private dayCyclePaused = false;
  private weatherState: WeatherControllerState = createInitialWeatherState('sunny');
  private rainLines: THREE.LineSegments | null = null;
  private rainMat: THREE.LineBasicMaterial | null = null;
  private rainOffsets: Float32Array | null = null;
  private readonly rainMaxDrops = 760;
  private puddleSpecs: StreetPuddleSpec[] = [];
  private puddleMesh: THREE.InstancedMesh | null = null;
  private puddleMat: THREE.MeshStandardMaterial | null = null;
  private puddleVisualLevels: Float32Array | null = null;
  private puddleRippleMesh: THREE.InstancedMesh | null = null;
  private puddleRippleMat: THREE.MeshBasicMaterial | null = null;
  private wetRoadMaterials: THREE.MeshStandardMaterial[] = [];
  private monsoonThunderTimer = 5.5;
  private lightningFlash = 0;
  private lastMonsoonLampBoost = false;
  private elapsed = 0;
  private lastTickTime = 0;
  private hudThrottle = 0;
  private adOverlayThrottle = 0.25;
  private hasVisible3DAd = false;
  private frameCounter = 0;
  private posSaveThrottle = 0;
  private randomEventTimer = 38;
  private purseChase: PurseChaseState = createInitialChaseState();
  private chaseSeed = 1;
  private autoChaseTimer = 42;
  private thiefRig: PickpocketThiefRig | null = null;
  private droppedPurseRig: DroppedPurseRig | null = null;
  private victimRig: TownPedestrianRig | null = null;
  private blasterBeam: THREE.Mesh | null = null;
  private blasterBeamTimer = 0;
  private thiefDustTimer = 0;
  private lastVisitedBuildingId = '';
  private frameId = 0;
  private disposed = false;

  // Real Arabian Sea + Western Ghats Mountains + Beach Bench Sitting + Double-Track Kerala Railway!
  private seaRig: ArabianSeaRig | null = null;
  private sittingBenchId: string | null = null;
  private railwayState: RailwaySimulationState = createInitialRailwayState();
  private trainRigs: KeralaTrainRig[] = [];
  private stationPassengerRigs: Map<string, TownPedestrianRig> = new Map();
  private trainDriverCabView = true;
  // Zero-GC per-frame scratch arrays for siren-yield & railway obstacle detection
  private sirenSourcesScratch: SirenSource[] = [];
  private trackObstaclesScratch: TrackObstacle[] = [];

  constructor(
    container: HTMLElement,
    initialProgress: GameProgressState,
    settings: GameSettings,
    callbacks: ThreeWorldCallbacks,
  ) {
    this.container = container;
    this.settings = { ...settings };
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;

    const initW = container.clientWidth || window.innerWidth;
    const initH = container.clientHeight || window.innerHeight;
    const initIsMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || initW < 820;
    this.perfBudget = detectDevicePerformanceBudget({
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
      viewportWidth: initW,
      devicePixelRatio: window.devicePixelRatio || 1,
      isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      isSoftwareGl: this.isSoftwareGl,
      requestedQuality: settings.graphicsQuality,
    });
    this.adaptivePerf = createAdaptivePerfState(
      this.perfBudget.dprCap,
      this.perfBudget.shadowsEnabled,
      this.perfBudget.initialLodScale,
    );
    this.lodState = createDynamicLodState(
      this.perfBudget.effectiveQuality,
      initIsMobile,
      this.adaptivePerf.lodScale,
    );
    this.applyGraphicsQuality(settings.graphicsQuality);

    this.renderer.setSize(initW, initH);
    this.renderer.domElement.style.position = 'relative';
    this.renderer.domElement.style.zIndex = '0';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.setAttribute('data-testid', 'game-canvas');
    container.appendChild(this.renderer.domElement);

    // Synchronized CSS3DRenderer overlay that projects live Adsterra 300×250 & 320×50 HTML ads directly onto 3D town boards & shop/home walls
    this.cssScene = new THREE.Scene();
    this.cssRenderer = new CSS3DRenderer();
    this.cssRenderer.setSize(initW, initH);
    this.cssRenderer.domElement.style.position = 'absolute';
    this.cssRenderer.domElement.style.top = '0';
    this.cssRenderer.domElement.style.left = '0';
    this.cssRenderer.domElement.style.width = '100%';
    this.cssRenderer.domElement.style.height = '100%';
    this.cssRenderer.domElement.style.pointerEvents = 'none';
    this.cssRenderer.domElement.style.overflow = 'hidden';
    this.cssRenderer.domElement.style.zIndex = '1';
    this.cssRenderer.domElement.style.visibility = 'hidden';
    this.cssRenderer.domElement.setAttribute('data-testid', 'world-3d-ads-layer');
    container.appendChild(this.cssRenderer.domElement);
    this.init3DAdsterraPool();

    this.maxAnisotropy = Math.min(
      this.perfBudget.maxAnisotropy,
      this.renderer.capabilities.getMaxAnisotropy(),
    );

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xc2dcf0);
    this.scene.fog = new THREE.Fog(0xc2dcf0, 68, 180);

    // Studio RoomEnvironment reflections tuned to grounded outdoor Kerala IBL intensity
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.62;
    pmrem.dispose();

    // Single-draw-call realistic gradient sky dome + glowing sun halo
    this.skyDome = createRealisticSkyDome();
    this.scene.add(this.skyDome.mesh);

    this.camera = new THREE.PerspectiveCamera(
      58,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.2,
      260,
    );

    // Natural warm/cool 3-point outdoor lighting rig (Sky-Laterite Hemisphere + Warm Key Sun + Soft Cool Rim)
    this.hemiLight = new THREE.HemisphereLight(0xb8d8f0, 0x6c5e47, 0.80);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff3de, 1.78);
    this.sunLight.position.set(42, 68, 36);
    this.sunLight.castShadow = this.perfBudget.shadowsEnabled;
    this.sunLight.shadow.mapSize.set(this.perfBudget.shadowMapSize, this.perfBudget.shadowMapSize);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 165;
    const d = 42;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.03;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Soft cool sky rim/fill light opposite the sun (zero shadow cost, natural 3D volume separation)
    this.rimLight = new THREE.DirectionalLight(0x9bc2e4, 0.38);
    this.rimLight.position.set(-48, 32, -40);
    this.scene.add(this.rimLight);

    // Lightweight single-draw-call 3D Rain & Heavy Monsoon streaks + Instanced Reflective Street Puddles
    this.initRainSystem();
    this.initStreetPuddles();

    // Build Kerala World Geometry
    this.buildEnvironment(initialProgress);
    this.applyLodCameraAndShadows();
    this.updateEnvironmentLod(0, true);

    // Build Sheru Bhai
    this.sheru = createSheruBhaiModel();
    this.scene.add(this.sheru.root);

    // Roaming Mischievous Goat
    this.roamingGoat = createGoatModel();
    this.scene.add(this.roamingGoat);

    // Golden Quest Waypoint Beacon
    this.questBeacon = this.createQuestBeacon();
    this.questBeaconArrow = this.questBeacon.getObjectByName('beacon_arrow') ?? null;
    this.scene.add(this.questBeacon);

    // Pooled 3D Crash Blast & Fireball VFX Rig (hidden until off-runway crash!)
    this.blastRig = this.createBlastVfxRig();
    this.scene.add(this.blastRig.group);

    // Pooled Zero-GC Particle Burst InstancedMesh (120 slots for fire, smoke, foam & celebration bursts)
    const pGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.4,
    });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, 120);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < 120; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        color: new THREE.Color(0xffd166),
      });
      _mat4.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, this.particles[i].color);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.particleMesh);

    this.syncProgress(initialProgress, true);

    // Position camera cleanly on Frame 0 for Title showcase (front-right 3/4 view of Sheru Bhai!)
    this.camCurrentPos.set(this.playerX + 1.8, 2.35, this.playerZ - 5.2);
    this.camLookTarget.set(this.playerX - 1.35, 1.75, this.playerZ + 0.6);
    this.camera.position.copy(this.camCurrentPos);
    this.camera.lookAt(this.camLookTarget);
    this.sheru.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.sheru.root.rotation.y = this.playerYaw;

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.lastTickTime = performance.now();
    this.tick();
  }

  private createQuestBeacon(): THREE.Group {
    const g = new THREE.Group();
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.9, 14, 12, 1, true), beamMat);
    beam.position.y = 7;
    g.add(beam);

    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 1.3, 6),
      new THREE.MeshStandardMaterial({
        color: 0xffc300,
        emissive: 0xd48800,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.85,
      }),
    );
    arrow.rotation.x = Math.PI;
    arrow.position.y = 6.5;
    arrow.name = 'beacon_arrow';
    g.add(arrow);
    g.visible = false;
    return g;
  }

  private createBlastVfxRig() {
    const group = new THREE.Group();
    group.visible = false;

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfff3b0,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(2.4, 14, 10), coreMat);
    core.position.y = 2.0;
    group.add(core);

    const shellMat = new THREE.MeshBasicMaterial({
      color: 0xff5a1f,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(3.8, 14, 10), shellMat);
    shell.position.y = 2.2;
    group.add(shell);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 3.2, 24), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.22;
    group.add(ring);

    const scorchMat = new THREE.MeshBasicMaterial({
      color: 0x18181b,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const scorch = new THREE.Mesh(new THREE.CircleGeometry(5.8, 22), scorchMat);
    scorch.rotation.x = -Math.PI / 2;
    scorch.position.y = 0.09;
    group.add(scorch);

    return { group, core, coreMat, shell, shellMat, ring, ringMat, scorch, scorchMat };
  }

  private buildEnvironment(initialProgress: GameProgressState) {
    // Extended Kerala lush ground plane ending cleanly at Malabar Golden Beach (z = +162) so ZERO grass bleeds onto golden sand or Arabian Sea!
    const grassTex = createGrassTexture(this.maxAnisotropy);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(540, 424),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: grassTex,
        roughness: 0.92,
        metalness: 0.02,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -50); // spans z = -262 (Western Ghats) .. +162 (Malabar Beachfront Blvd)
    ground.receiveShadow = true;
    freezeStaticHierarchy(ground);
    this.scene.add(ground);

    // Distant coastal backwater sea horizon replaced by real animated Arabian Sea (South) & Western Ghats Mountains (N/E/W)!
    this.seaRig = createArabianSeaAndBeach();
    this.scene.add(this.seaRig.group);

    const mountains = createWesternGhatsMountains();
    freezeStaticHierarchy(mountains);
    this.scene.add(mountains);

    // Double-Track Kerala Railway Loop, 4 Named Stations with Foot-Overbridges, 4 Trains & 40 Live Station Passengers!
    const railwayTrackMesh = createDoubleTrackRailwayMesh();
    freezeStaticHierarchy(railwayTrackMesh);
    this.scene.add(railwayTrackMesh);

    for (const st of RAILWAY_STATIONS) {
      const stationMesh = createRailwayStationModel(st);
      freezeStaticHierarchy(stationMesh);
      this.scene.add(stationMesh);
    }

    this.railwayState = createInitialRailwayState();
    this.trainRigs = [];
    for (const def of TRAIN_DEFS) {
      const rig = createKeralaTrainRig(def);
      const tr = this.railwayState.trains.find((t) => t.id === def.id);
      if (tr) updateKeralaTrainRigTransform(rig, tr.distance);
      this.scene.add(rig.root);
      this.trainRigs.push(rig);
    }

    this.stationPassengerRigs.clear();
    for (const p of this.railwayState.passengers) {
      const pRig = createStationPassengerRig(p.shirtColor, p.lowerColor, p.skinColor, p.isSaree);
      pRig.root.position.set(p.x, 0.55, p.z);
      pRig.root.rotation.y = p.yaw;
      this.scene.add(pRig.root);
      this.stationPassengerRigs.set(p.id, pRig);
    }

    // Kerala International Airport (COK) Complex: 196m Runway 09/27, Apron, Taxiways, ATC Tower, Hangar & Windsock
    this.airportRig = createAirportComplexModel(this.maxAnisotropy);
    this.scene.add(this.airportRig.group);

    // All Paved Town Roads + Coastal Beach & Station Connectors:
    // ZERO-LAG: 1 single shared 512x512 road texture + 2 shared materials (NS & EW) with per-mesh UV scaling!
    const allPavedRoads = [...TOWN_ROADS, ...AUX_PAVED_ROADS];
    const baseRoadTex = createRoadTexture(this.maxAnisotropy);
    const roadMatNS = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: baseRoadTex,
      roughness: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const roadMatEW = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: baseRoadTex,
      roughness: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    const staticRoadsGroup = new THREE.Group();
    for (const seg of allPavedRoads) {
      const roadGeo = new THREE.PlaneGeometry(seg.width, seg.length);
      const repY = Math.max(3, Math.round(seg.length / 10));
      const uvAttr = roadGeo.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uvAttr.count; i++) {
        uvAttr.setY(i, uvAttr.getY(i) * repY);
      }
      uvAttr.needsUpdate = true;

      const roadMesh = new THREE.Mesh(roadGeo, seg.axis === 'ew' ? roadMatEW : roadMatNS);
      roadMesh.rotation.x = -Math.PI / 2;
      if (seg.axis === 'ew') roadMesh.rotation.z = Math.PI / 2;
      roadMesh.position.set(seg.x, seg.yOffset, seg.z);
      roadMesh.receiveShadow = true;
      staticRoadsGroup.add(roadMesh);
    }

    // Crisp Asphalt Intersection Junction Aprons at EVERY NS × EW crossing (eliminates broken overlapping dashed lines!)
    const junctionAsphaltMat = new THREE.MeshStandardMaterial({
      color: 0x363b42,
      roughness: 0.87,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    const nsRoads = allPavedRoads.filter((r) => r.axis === 'ns');
    const ewRoads = allPavedRoads.filter((r) => r.axis === 'ew');
    for (const ns of nsRoads) {
      const bNS = getRoadBounds(ns);
      for (const ew of ewRoads) {
        const bEW = getRoadBounds(ew);
        const ix = ns.x;
        const iz = ew.z;
        if (ix >= bEW.minX - 1 && ix <= bEW.maxX + 1 && iz >= bNS.minZ - 1 && iz <= bNS.maxZ + 1) {
          const pad = new THREE.Mesh(
            new THREE.PlaneGeometry(ns.width + 0.6, ew.width + 0.6),
            junctionAsphaltMat,
          );
          pad.rotation.x = -Math.PI / 2;
          pad.position.set(ix, 0.039, iz);
          pad.receiveShadow = true;
          staticRoadsGroup.add(pad);
        }
      }
    }

    // Clean Railway Level Crossing Decks & Warning Beacons at West (-46, 134) & East (+46, 134) Beach Access Roads
    const crossingMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.82 });
    const gatePostMat = new THREE.MeshStandardMaterial({ color: 0xdcb32c, roughness: 0.56 });
    const gateStripeMat = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.64 });
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xd93830,
      emissive: 0xd93830,
      emissiveIntensity: 1.0,
    });
    const gatePostGeo = new THREE.CylinderGeometry(0.14, 0.16, 2.8, 8);
    const gateBandGeo = new THREE.CylinderGeometry(0.155, 0.155, 0.45, 8);
    const gateLampGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const crossingDeckGeo = new THREE.BoxGeometry(10.6, 0.19, 8.6);
    for (const cx of [-46, 46]) {
      const crossingDeck = new THREE.Mesh(crossingDeckGeo, crossingMat);
      crossingDeck.position.set(cx, 0.1, 134);
      crossingDeck.receiveShadow = true;
      staticRoadsGroup.add(crossingDeck);
      for (const [gx, gz] of [
        [cx - 5.9, 129.2],
        [cx + 5.9, 129.2],
        [cx - 5.9, 138.8],
        [cx + 5.9, 138.8],
      ] as [number, number][]) {
        const post = new THREE.Mesh(gatePostGeo, gatePostMat);
        post.position.set(gx, 1.4, gz);
        const band = new THREE.Mesh(gateBandGeo, gateStripeMat);
        band.position.set(gx, 1.7, gz);
        const lamp = new THREE.Mesh(gateLampGeo, beaconMat);
        lamp.position.set(gx, 2.95, gz);
        staticRoadsGroup.add(post, band, lamp);
      }
    }

    // Central Town Junction Roundabout Plaza & Painted Outer Ring around Golden Sheru Statue (0, -4)
    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0x363b42,
      roughness: 0.86,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    const plaza = new THREE.Mesh(
      new THREE.CircleGeometry(SHERU_STATUE_ROUNDABOUT.plazaRadius, 32),
      plazaMat,
    );
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(SHERU_STATUE_ROUNDABOUT.x, 0.044, SHERU_STATUE_ROUNDABOUT.z);
    plaza.receiveShadow = true;
    staticRoadsGroup.add(plaza);
    this.wetRoadMaterials = [roadMatNS, roadMatEW, junctionAsphaltMat, plazaMat];
    freezeStaticHierarchy(staticRoadsGroup);
    this.scene.add(staticRoadsGroup);

    const roundaboutLaneRing = new THREE.Mesh(
      new THREE.RingGeometry(SHERU_STATUE_ROUNDABOUT.orbitRadius - 0.18, SHERU_STATUE_ROUNDABOUT.orbitRadius + 0.18, 40),
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
        polygonOffset: true,
        polygonOffsetFactor: -5,
        polygonOffsetUnits: -5,
      }),
    );
    roundaboutLaneRing.rotation.x = -Math.PI / 2;
    roundaboutLaneRing.position.set(SHERU_STATUE_ROUNDABOUT.x, 0.056, SHERU_STATUE_ROUNDABOUT.z);
    this.scene.add(roundaboutLaneRing);

    const islandCurb = new THREE.Mesh(
      new THREE.TorusGeometry(SHERU_STATUE_ROUNDABOUT.pedestalRadius + 0.25, 0.18, 8, 32),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.55 }),
    );
    islandCurb.rotation.x = Math.PI / 2;
    islandCurb.position.set(SHERU_STATUE_ROUNDABOUT.x, 0.16, SHERU_STATUE_ROUNDABOUT.z);
    this.scene.add(islandCurb);

    // Iconic 24K Golden Sheru Bhai Lion-King Statue Monument at Main Junction center (0, -4)
    this.goldenStatueRig = createGoldenJunctionStatue(this.maxAnisotropy);
    this.goldenStatueRig.group.position.set(0, 0, -4);
    this.scene.add(this.goldenStatueRig.group);

    // Buildings (LOD0 detailed facade + LOD1 lightweight 2-mesh silhouette proxy)
    const plasterBump = createPlasterBumpTexture(this.maxAnisotropy);
    for (const b of BUILDINGS) {
      const handle = createBuildingModel(
        b,
        initialProgress.ownedBusinesses[b.id],
        plasterBump,
        this.maxAnisotropy,
      );
      this.buildingHandles.set(b.id, handle);
      if (handle.hospitalInterior) {
        this.hospitalInteriorRig = handle.hospitalInterior;
      }
      this.windowMats.push(...handle.windowMats);
      this.scene.add(handle.group);

      const lodProxy = createBuildingLodProxy(b);
      this.scene.add(lodProxy);
      this.lodBuildingEntries.push({
        id: b.id,
        x: b.x,
        z: b.z,
        high: handle.group,
        low: lodProxy,
        tier: 0,
        isHospital: b.category === 'hospital',
      });
    }

    // Empty Buildable Plots (or already-built shops from save)
    for (const plot of EMPTY_PLOTS) {
      const built = initialProgress.builtShops[plot.id];
      const mesh = built
        ? createBuiltShopModel(plot, built.name, this.maxAnisotropy)
        : createEmptyPlotModel(plot, this.maxAnisotropy);
      this.plotMeshes.set(plot.id, mesh);
      this.scene.add(mesh);
    }

    // Streetlamps along main roads (4 key night point lights + emissive bulbs)
    const lampCoords: [number, number, number][] = [
      [-6.8, -14, 0],
      [6.8, -14, Math.PI],
      [-6.8, 6, 0],
      [6.8, 6, Math.PI],
      [-24, -10.5, Math.PI / 2],
      [24, -10.5, Math.PI / 2],
      [-6.8, -28, 0],
      [6.8, -28, Math.PI],
      [-26, 2.5, -Math.PI / 2],
      [26, 2.5, -Math.PI / 2],
      [-70, -18, Math.PI],
      [-70, 18, Math.PI],
      [70, -18, 0],
      [70, 18, 0],
      [-28, 66, Math.PI / 2],
      [28, 66, Math.PI / 2],
    ];
    lampCoords.forEach(([lx, lz, rot], idx) => {
      const { group, bulbMat } = createStreetLamp();
      group.position.set(lx, 0, lz);
      group.rotation.y = rot;
      this.scene.add(group);
      this.lampBulbMats.push(bulbMat);
      this.lodPropEntries.push({ x: lx, z: lz, object: group, visible: true, isLarge: false });

      if (idx < 4) {
        const pl = new THREE.PointLight(0xffcb69, 0, 22, 1.6);
        pl.position.set(lx, 5.4, lz);
        this.scene.add(pl);
        this.nightLights.push(pl);
      }
    });

    // Freestanding 300×250 3D Town Ads Boards (press E to view live 300×250 Ad)
    for (const board of AD_BOARDS) {
      const boardObj = createAdBoard300x250Model(board, this.maxAnisotropy);
      this.scene.add(boardObj);
      this.lodPropEntries.push({
        x: board.x,
        z: board.z,
        object: boardObj,
        visible: true,
        isLarge: true,
      });
    }

    // Bus Stops, Auto Stands, Marked Parking Bays, Traffic Lights & Zebra Crossings
    for (const stop of BUS_STOPS) {
      const stopObj = createBusStopModel(stop, this.maxAnisotropy);
      this.scene.add(stopObj);
      this.lodPropEntries.push({ x: stop.x, z: stop.z, object: stopObj, visible: true, isLarge: true });
    }
    for (const stand of AUTO_STANDS) {
      const standObj = createAutoStandModel(stand, this.maxAnisotropy);
      this.scene.add(standObj);
      this.lodPropEntries.push({
        x: stand.x,
        z: stand.z,
        object: standObj,
        visible: true,
        isLarge: false,
      });
    }
    for (const bay of PARKING_BAYS) {
      const bayObj = createParkingBayModel(bay);
      this.scene.add(bayObj);
      this.lodPropEntries.push({ x: bay.x, z: bay.z, object: bayObj, visible: true, isLarge: false });
    }
    // 4 Zebra Crossings framing Main Junction
    this.scene.add(createZebraCrossing(0, 7.2, 0));
    this.scene.add(createZebraCrossing(0, -15.2, 0));
    this.scene.add(createZebraCrossing(11.2, -4, Math.PI / 2));
    this.scene.add(createZebraCrossing(-11.2, -4, Math.PI / 2));

    // 4 Junction Traffic Lights
    const tl1 = createTrafficLightModel(-6.6, -11.5, 0);
    const tl2 = createTrafficLightModel(6.6, 3.5, Math.PI);
    const tl3 = createTrafficLightModel(7.8, -10.5, -Math.PI / 2);
    const tl4 = createTrafficLightModel(-7.8, 2.5, Math.PI / 2);
    this.scene.add(tl1.group, tl2.group, tl3.group, tl4.group);
    this.trafficLights.push(
      { rig: tl1, axis: 'ns' },
      { rig: tl2, axis: 'ns' },
      { rig: tl3, axis: 'ew' },
      { rig: tl4, axis: 'ew' },
    );

    // Interactive Coconut Palms strictly on sidewalks & lawns (100% clear of all roads, dual-tier LOD!)
    TOWN_PALM_TREES.forEach(([px, pz, ph], idx) => {
      const rig = createCoconutPalmRig(ph, 1.1);
      rig.root.position.set(px, 0, pz);
      rig.root.rotation.y = Math.atan2(px, pz) + 0.4;
      this.scene.add(rig.root);
      this.livePalms.push({
        x: px,
        z: pz,
        h: ph,
        rig,
        shaking: false,
        shakeTime: 0,
        impactDirX: 0,
        impactDirZ: 1,
        phaseOffset: idx * 0.85,
        detachedCocoIdx: -1,
        regrowTimer: 0,
        dropCooldown: 0,
      });
      this.lodPalmEntries.push({
        x: px,
        z: pz,
        rig,
        tier: 0,
        isPerimeter: false,
      });
    });

    // Reusable 3D falling coconut + ground shadow ring (drops with spin & bounce!)
    const cocoRig = createFallingCoconutRig();
    this.scene.add(cocoRig.group);
    this.scene.add(cocoRig.shadowRing);
    this.fallingCoconut = {
      rig: cocoRig,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      spinX: 0,
      spinZ: 0,
      phase: 'idle',
      restTimer: 0,
    };

    // Natural perimeter palm ring around outer town (leaving Airport runway, Beach & Railway Station vistas open!)
    for (let i = 0; i < 42; i++) {
      const angle = (i / 42) * Math.PI * 2;
      const r = WORLD_RADIUS - 14 + (i % 3) * 4;
      const hx = Math.cos(angle) * r;
      const hz = Math.sin(angle) * r;
      // Keep North Airport, Runway 09/27 approach, South Beach & Railway Stations clear!
      if (hz < -104 || hz > 118 || Math.abs(hz - AIRPORT_RUNWAY.centerZ) < 42) continue;
      if (Math.abs(hx) > 144) continue;
      const palmRig = createCoconutPalmRig(9 + (i % 4) * 1.4, 1.35);
      palmRig.root.position.set(hx, 0, hz);
      palmRig.root.rotation.y = angle + Math.PI;
      this.scene.add(palmRig.root);
      this.lodPalmEntries.push({
        x: hx,
        z: hz,
        rig: palmRig,
        tier: 0,
        isPerimeter: true,
      });
    }

    // Town Park Benches & Fictional Billboards
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.78 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.6 });
    const benchPositions: [number, number, number][] = [
      [-9, 10, Math.PI / 2],
      [9, 10, -Math.PI / 2],
      [-9, -18, Math.PI / 2],
      [9, -18, -Math.PI / 2],
    ];
    for (const [bx, bz, rot] of benchPositions) {
      const bench = new THREE.Group();
      bench.position.set(bx, 0, bz);
      bench.rotation.y = rot;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 0.6), benchMat);
      seat.position.y = 0.52;
      bench.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 0.12), benchMat);
      back.position.set(0, 0.85, -0.25);
      bench.add(back);
      for (const lx of [-0.85, 0.85]) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.55), legMat);
        l.position.set(lx, 0.25, 0);
        bench.add(l);
      }
      this.scene.add(bench);
      this.lodPropEntries.push({ x: bx, z: bz, object: bench, visible: true, isLarge: false });
    }

    // Fictional Comedy Billboard cleanly off northRoadEW overlooking Main Junction lawn
    const billGroup = new THREE.Group();
    billGroup.position.set(-24, 0, -22.5);
    billGroup.rotation.y = 0.35;
    const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 7, 8), legMat);
    post1.position.set(-2.5, 3.5, 0);
    billGroup.add(post1);
    const post2 = post1.clone();
    post2.position.x = 2.5;
    billGroup.add(post2);
    const billTex = createSignboardTexture(
      'GHOP GHOP INTERNATIONAL',
      '100% PURE POROTTA BEEF ECONOMY',
      true,
      0xd4a12a,
      this.maxAnisotropy,
    );
    const billFace = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 2.4, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xffffff, map: billTex, roughness: 0.4 }),
    );
    billFace.position.y = 6.2;
    billGroup.add(billFace);
    this.scene.add(billGroup);

    // Spawn NPCs & 5 Major Bosses
    for (const def of NPCS) {
      const rig = createNpcModel(def);
      rig.root.position.set(def.x, 0, def.z);
      this.scene.add(rig.root);
      this.liveNpcs.push({
        id: def.id,
        homeX: def.x,
        homeZ: def.z,
        patrolRadius: def.patrolRadius,
        x: def.x,
        z: def.z,
        yaw: 0,
        targetX: def.x,
        targetZ: def.z,
        waitTimer: 1 + Math.random() * 3,
        walkPhase: Math.random() * 6,
        rig,
        isBoss: def.isBoss,
        tag: def.tag,
        panicPhase: Math.random() * 6,
        panicState: 'calm',
        panicDustTimer: 0,
        name: def.name,
        role: def.role,
        homeBuildingId: def.homeBuildingId,
      });
    }

    // Spawn 48 lively walking Kerala townspeople across EVERY district of the entire town!
    TOWN_CROWD_ROUTES.forEach((route, idx) => {
      const rig = createTownPedestrianModel(
        route.shirtColor,
        route.lowerColor,
        route.skinColor,
        Boolean(route.isSaree),
      );
      const t0 = (idx * 0.27 + 0.15) % 1;
      const sx = route.ax + (route.bx - route.ax) * t0;
      const sz = route.az + (route.bz - route.az) * t0;
      const dir: 1 | -1 = idx % 2 === 0 ? 1 : -1;
      const yaw = Math.atan2((route.bx - route.ax) * dir, (route.bz - route.az) * dir);
      rig.root.position.set(sx, 0, sz);
      rig.root.rotation.y = yaw;
      this.scene.add(rig.root);
      this.townCrowd.push({
        id: route.id,
        ax: route.ax,
        az: route.az,
        bx: route.bx,
        bz: route.bz,
        t: t0,
        dir,
        speed: route.speed,
        length: Math.max(1, Math.hypot(route.bx - route.ax, route.bz - route.az)),
        walkPhase: idx * 0.9,
        x: sx,
        z: sz,
        rig,
      });
    });

    // Spawn Drivable Vehicles (using detailed 28-archetype compact cartoon models!)
    for (const v of VEHICLES) {
      const savedPark = initialProgress.parkedVehicles?.[v.id];
      const spawnDef: VehicleDef = savedPark
        ? { ...v, x: savedPark.x, z: savedPark.z, rotationY: savedPark.yaw }
        : v;
      const rig = createDetailedVehicleModel(spawnDef);
      this.scene.add(rig.root);
      this.liveVehicles.push({
        id: v.id,
        name: v.name,
        type: v.type,
        x: spawnDef.x,
        y: 0,
        z: spawnDef.z,
        vy: 0,
        yaw: spawnDef.rotationY,
        pitch: 0,
        roll: 0,
        pitchVel: 0,
        rollVel: 0,
        suspY: 0,
        suspVy: 0,
        grounded: true,
        speed: 0,
        lateralSpeed: 0,
        maxSpeed: v.maxSpeed,
        mass: v.type === 'bus' || v.type === 'fire_engine' ? 24 : v.type === 'auto' ? 7 : 12,
        steerAngle: 0,
        steerInput: 0,
        isAircraft: Boolean(v.isAircraft || isAircraftType(v.type)),
        flightState: 'ground',
        autoLanding: false,
        peakAltitude: 0,
        hasSiren: Boolean(v.hasSiren || rig.hasSiren),
        sirenOn: false,
        rig,
        mesh: rig.root,
      });
    }

    // Spawn 4 Open-World Kerala Stunt Ramps (matched 1-to-1 with sampleWorldSurface heightfield!)
    for (const ramp of WORLD_RAMPS) {
      const rampMesh = createStuntRampMesh(ramp);
      this.scene.add(rampMesh);
    }

    // Spawn 32 Interactive 3D Rigid-Body Street Props (Footballs, Cones, Crates, Barrels!)
    this.physicsProps = createOpenWorldProps();
    this.physicsPropVisuals = this.physicsProps.map((prop) => {
      const visual = createRigidBodyPropVisual(prop.kind);
      visual.mesh.position.set(prop.x, prop.y, prop.z);
      visual.shadow.position.set(prop.x, sampleWorldSurface(prop.x, prop.z).groundY + 0.025, prop.z);
      this.scene.add(visual.mesh);
      this.scene.add(visual.shadow);
      return visual;
    });

    // Spawn Living Kerala Road Traffic (14 lightweight compact vehicles, capped by Graphics Quality!)
    this.buildRoadTraffic();

    // Spawn World Collectibles (cache spin_gem children once for zero per-frame traversal!)
    for (const c of WORLD_COLLECTIBLES) {
      const mesh = createCollectibleModel(c);
      mesh.visible = !initialProgress.collectedWorldIds.includes(c.id);
      this.collectibleMeshes.set(c.id, mesh);
      const gem = mesh.getObjectByName('spin_gem');
      if (gem) this.collectibleGems.push(gem);
      this.scene.add(mesh);
    }

    // Build pooled 3D Pickpocket Chase Rigs (Thief + Standalone Dropped Purse + Saree Girl Victim + Stun Blaster Beam)
    this.thiefRig = createPickpocketThiefModel();
    this.thiefRig.root.visible = false;
    this.scene.add(this.thiefRig.root);

    this.droppedPurseRig = createDroppedPurseModel();
    this.droppedPurseRig.root.visible = false;
    this.scene.add(this.droppedPurseRig.root);

    this.victimRig = createVictimGirlModel();
    this.victimRig.root.visible = false;
    this.scene.add(this.victimRig.root);

    const beamGeo = new THREE.CylinderGeometry(0.08, 0.14, 1, 8);
    beamGeo.rotateX(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.92,
    });
    this.blasterBeam = new THREE.Mesh(beamGeo, beamMat);
    this.blasterBeam.visible = false;
    this.scene.add(this.blasterBeam);

    this.colliders = getWorldColliders(Object.keys(initialProgress.builtShops));
  }

  private buildRoadTraffic() {
    // Spawn 34 diverse Kerala vehicles cruising ALL 11 paved road routes across the entire town!
    TOWN_TRAFFIC_ROUTES.forEach((item, idx) => {
      const cat = VEHICLE_CATALOG.find((v) => v.id === item.catalogId) ?? VEHICLE_CATALOG[0];
      const a = item.loop[item.wpIndex];
      const b = item.loop[(item.wpIndex + 1) % item.loop.length];
      const sx = a.x + (b.x - a.x) * item.startLerp;
      const sz = a.z + (b.z - a.z) * item.startLerp;
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      const rig = createDetailedVehicleModel({
        ...cat,
        id: `ai_traffic_${idx}`,
        x: sx,
        z: sz,
        rotationY: yaw,
      });
      this.scene.add(rig.root);
      const isBus =
        cat.type === 'bus' ||
        cat.type === 'private_bus' ||
        cat.type === 'ksrtc_bus' ||
        cat.type === 'school_bus' ||
        cat.type === 'mini_bus' ||
        cat.type === 'tourist_bus';
      this.aiTraffic.push({
        id: `ai_traffic_${idx}`,
        roadId: item.roadId,
        name: cat.name,
        type: cat.type,
        isBus,
        isAuto: cat.type === 'auto',
        isEmergency: Boolean(cat.hasSiren),
        waypoints: item.loop,
        wpIndex: (item.wpIndex + 1) % item.loop.length,
        x: sx,
        z: sz,
        yaw,
        speed: item.cruise,
        cruiseSpeed: item.cruise,
        stopTimer: 0,
        lastBusStopId: '',
        rig,
        active: true,
      });
    });
  }

  public syncProgress(progress: GameProgressState, restorePlayerPos = false) {
    if (restorePlayerPos && progress.lastPlayerPos) {
      this.playerX = progress.lastPlayerPos.x;
      this.playerY = progress.lastPlayerPos.y || 0;
      this.playerZ = progress.lastPlayerPos.z;
      this.playerYaw = progress.lastPlayerPos.yaw ?? PLAYER_SPAWN.yaw;
      this.camYaw = this.playerYaw;
    }

    this.timeOfDay = progress.timeOfDay;
    this.colliders = getWorldColliders(Object.keys(progress.builtShops));

    // Apply live Outfit (Black / White / Gold) & Playable Role (Sheru / Auto / Bus / Shop / Ambulance Driver)
    applyPlayerAppearance(
      this.sheru,
      progress.sheruOutfit ?? 'black',
      progress.playableRole ?? 'sheru',
      progress.legendaryOutfitUnlocked,
    );

    // Update building signboards when bought or renamed
    for (const [id, handle] of this.buildingHandles.entries()) {
      const owned = progress.ownedBusinesses[id];
      this.refreshBuildingSign(handle, owned);
    }

    // Update built plots if newly constructed
    for (const plot of EMPTY_PLOTS) {
      const built = progress.builtShops[plot.id];
      const existing = this.plotMeshes.get(plot.id);
      if (built && existing && !existing.userData.isBuiltShop) {
        this.scene.remove(existing);
        const newShop = createBuiltShopModel(plot, built.name, this.maxAnisotropy);
        newShop.userData.isBuiltShop = true;
        newShop.scale.set(1, 0.05, 1);
        this.scene.add(newShop);
        this.plotMeshes.set(plot.id, newShop);
        this.builtShopAnimations.push({ mesh: newShop, progress: 0 });
        this.spawnParticleBurst(plot.x, 2.5, plot.z, 26, 0xffd166);
      }
    }

    // Update collectible visibility
    for (const [id, mesh] of this.collectibleMeshes.entries()) {
      mesh.visible = !progress.collectedWorldIds.includes(id);
    }
  }

  private refreshBuildingSign(
    handle: BuildingMeshHandle,
    owned: OwnedBusinessRecord | undefined,
  ) {
    const key = owned ? `owned_${owned.customName}_${owned.level}` : 'unowned';
    if (handle.signMesh.userData.signKey === key) return;
    handle.signMesh.userData.signKey = key;

    const tex = createSignboardTexture(
      owned ? owned.customName : handle.def.name,
      owned ? `LV.${owned.level} · ${handle.def.mlSign}` : handle.def.mlSign,
      Boolean(owned),
      handle.def.accentColor,
      this.maxAnisotropy,
    );
    const mat = handle.signMesh.material as THREE.MeshStandardMaterial;
    if (mat.map) mat.map.dispose();
    mat.map = tex;
    mat.metalness = owned ? 0.35 : 0.1;
    mat.needsUpdate = true;
  }

  public setQuestTarget(coords: Vec2 | null) {
    this.questTargetCoords = coords;
    if (coords) {
      this.questBeacon.position.set(coords.x, 0, coords.z);
      this.questBeacon.visible = true;
    } else {
      this.questBeacon.visible = false;
    }
  }

  public teleportNear(x: number, z: number, targetId?: string) {
    if (this.activeVehicleId) {
      this.activeVehicleId = null;
      this.sheru.root.visible = true;
    }

    let focusX = x;
    let focusZ = z;
    let offsetDist = 2.4;

    // If targeting a live roaming NPC, teleport right beside their current live position
    if (targetId) {
      const liveNpc = this.liveNpcs.find((n) => n.id === targetId);
      if (liveNpc) {
        focusX = liveNpc.x;
        focusZ = liveNpc.z;
        offsetDist = 2.3;
      }
    }

    // Special walk-in landing for Kerala General Hospital right in front of the automatic sliding doors!
    if (targetId === 'hospital') {
      this.playerX = HOSPITAL_INTERIOR_BOUNDS.doorX;
      this.playerZ = HOSPITAL_INTERIOR_BOUNDS.doorZ + 3.4;
      this.playerY = 0;
      this.playerVy = 0;
      this.playerYaw = Math.PI;
      this.camYaw = Math.PI;
      this.camPitch = 0.22;
      this.camCurrentPos.set(this.playerX, 2.7, this.playerZ + 6.4);
      this.camLookTarget.set(this.playerX, 1.8, this.playerZ - 4.0);
      if (this.hospitalInteriorRig) {
        this.hospitalInteriorRig.doorOpenAmount = 1;
        this.hospitalInteriorRig.slidingDoorLeft.position.x = -3.25;
        this.hospitalInteriorRig.slidingDoorRight.position.x = 3.25;
      }
      this.sheru.root.position.set(this.playerX, this.playerY, this.playerZ);
      this.sheru.root.rotation.y = this.playerYaw;
      this.hudThrottle = 1;
      this.spawnParticleBurst(this.playerX, 1.4, this.playerZ, 16, 0xffd166);
      return;
    }

    // If destination is inside a building footprint, land right in front of its entrance inside triggerRange
    const targetBuilding = BUILDINGS.find(
      (b) =>
        b.id === targetId ||
        Math.hypot(b.x - focusX, b.z - focusZ) < Math.max(b.width, b.depth) * 0.55,
    );
    if (targetBuilding && (!targetId || targetBuilding.id === targetId)) {
      focusX = targetBuilding.x;
      focusZ = targetBuilding.z;
      offsetDist = Math.max(targetBuilding.width, targetBuilding.depth) * 0.55 + 2.2;
    }

    // Offset slightly toward junction center so we never land inside a wall
    const dirX = -focusX || 0;
    const dirZ = -focusZ || 1;
    const len = Math.hypot(dirX, dirZ) || 1;
    const tx = focusX + (dirX / len) * offsetDist;
    const tz = focusZ + (dirZ / len) * offsetDist;
    const safe = resolveCircleWorldCollision(tx, tz, 0.9, this.colliders);
    this.playerX = safe.x;
    this.playerZ = safe.z;
    this.playerY = 0;
    this.playerVy = 0;
    this.playerYaw = Math.atan2(focusX - safe.x, focusZ - safe.z);
    this.camYaw = this.playerYaw;
    this.sheru.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.sheru.root.rotation.y = this.playerYaw;
    this.hudThrottle = 1;
    this.spawnParticleBurst(this.playerX, 1.4, this.playerZ, 16, 0xffd166);
  }

  public setMode(mode: GameScreenState) {
    this.mode = mode;
    if (mode === 'playing') {
      this.keysHeld.clear();
      this.camYaw = this.playerYaw;
    } else {
      this.keysHeld.clear();
      this.isDraggingCamera = false;
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    }
  }

  public setModalOpen(open: boolean) {
    this.modalOpen = open;
    if (open) {
      this.keysHeld.clear();
      this.isDraggingCamera = false;
    }
  }

  public updateSettings(settings: GameSettings) {
    this.settings = { ...settings };
    this.applyGraphicsQuality(settings.graphicsQuality);
  }

  private applyGraphicsQuality(q: GameSettings['graphicsQuality']) {
    const viewW = this.container?.clientWidth || window.innerWidth;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobile = isTouch || viewW < 820;
    this.perfBudget = detectDevicePerformanceBudget({
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
      viewportWidth: viewW,
      devicePixelRatio: window.devicePixelRatio || 1,
      isTouch,
      isSoftwareGl: this.isSoftwareGl,
      requestedQuality: q,
    });
    this.adaptivePerf = createAdaptivePerfState(
      this.perfBudget.dprCap,
      this.perfBudget.shadowsEnabled,
      this.perfBudget.initialLodScale,
    );
    this.lodState = createDynamicLodState(
      this.perfBudget.effectiveQuality,
      isMobile,
      this.adaptivePerf.lodScale,
    );

    // Keep ALL 11 road routes populated across every device & quality tier!
    const perRoadCap = this.perfBudget.trafficPerRoadCap;
    const roadCounts = new Map<string, number>();
    this.aiTraffic.forEach((v) => {
      const count = roadCounts.get(v.roadId) ?? 0;
      const active = count < perRoadCap;
      roadCounts.set(v.roadId, count + 1);
      v.active = active;
      v.rig.root.visible = active;
    });

    this.renderer.setPixelRatio(this.perfBudget.dprCap);
    this.renderer.shadowMap.enabled = this.perfBudget.shadowsEnabled;
    if (this.perfBudget.shadowsEnabled) {
      this.renderer.shadowMap.type =
        this.perfBudget.effectiveQuality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    }
    if (this.sunLight) {
      this.sunLight.castShadow = this.perfBudget.shadowsEnabled;
      this.sunLight.shadow.mapSize.set(
        this.perfBudget.shadowMapSize,
        this.perfBudget.shadowMapSize,
      );
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
    }
    this.applyLodCameraAndShadows();
    this.updateEnvironmentLod(0, true);
  }

  public getLodStats(): LodTelemetrySnapshot {
    return { ...this.lodTelemetry };
  }

  private applyLodCameraAndShadows() {
    if (!this.lodState) return;
    const d = this.lodState.distances;
    const activeVeh = this.activeVehicleId
      ? this.liveVehicles.find((v) => v.id === this.activeVehicleId)
      : null;
    const isScenicVista =
      Boolean(activeVeh?.isAircraft) ||
      this.railwayState.riderMode !== 'none' ||
      this.sittingBenchId !== null ||
      isPointOnBeachZone(this.playerX, this.playerZ);
    // Guarantee mountains, Arabian Sea & railway vistas remain crisp without ever clipping skyDome!
    const desiredFar = Math.max(d.cameraFar, isScenicVista ? 540 : 420);
    if (this.camera && Math.abs(this.camera.far - desiredFar) > 2) {
      this.camera.far = desiredFar;
      this.camera.updateProjectionMatrix();
    }
    if (this.sunLight) {
      const half = d.shadowFrustumHalf;
      if (this.sunLight.shadow.camera.right !== half) {
        this.sunLight.shadow.camera.left = -half;
        this.sunLight.shadow.camera.right = half;
        this.sunLight.shadow.camera.top = half;
        this.sunLight.shadow.camera.bottom = -half;
        this.sunLight.shadow.camera.updateProjectionMatrix();
      }
    }
  }

  /**
   * Zero-GC Dynamic Detail Scaling (LOD) sweep for the 3D environment:
   * Evaluates squared distance from the active camera/player to buildings, coconut palms,
   * street props, rigid-body props, and vehicles with hysteresis to slash draw calls & vertex load
   * on low-end mobile devices without visual popping.
   */
  private updateEnvironmentLod(dt: number, force = false) {
    if (!this.lodState || !this.scene) return;
    this.lodSweepAccum += dt;
    if (!force && this.lodSweepAccum < this.lodState.distances.sweepIntervalSec) return;
    this.lodSweepAccum = 0;

    const d = this.lodState.distances;
    const refX = this.camera ? this.camera.position.x : this.playerX;
    const refZ = this.camera ? this.camera.position.z : this.playerZ;
    const hyst = d.hysteresis;

    let buildingsLod0 = 0;
    let buildingsLod1 = 0;
    let buildingsCulled = 0;
    for (let i = 0; i < this.lodBuildingEntries.length; i++) {
      const b = this.lodBuildingEntries[i];
      const dx = b.x - refX;
      const dz = b.z - refZ;
      const distSq = dx * dx + dz * dz;
      const nextTier: LodTier =
        b.isHospital && this.inHospital
          ? 0
          : classifyLodTierWithHysteresis(
              distSq,
              b.tier,
              d.buildingMidDist,
              d.buildingCullDist,
              hyst,
            );
      if (nextTier !== b.tier || force) {
        b.tier = nextTier;
        b.high.visible = nextTier === 0;
        b.low.visible = nextTier === 1;
      }
      if (b.tier === 0) buildingsLod0++;
      else if (b.tier === 1) buildingsLod1++;
      else buildingsCulled++;
    }

    let palmsLod0 = 0;
    let palmsLod1 = 0;
    let palmsCulled = 0;
    for (let i = 0; i < this.lodPalmEntries.length; i++) {
      const p = this.lodPalmEntries[i];
      const dx = p.x - refX;
      const dz = p.z - refZ;
      const distSq = dx * dx + dz * dz;
      const midDist = p.isPerimeter ? Math.max(18, d.palmMidDist * 0.72) : d.palmMidDist;
      const nextTier = classifyLodTierWithHysteresis(
        distSq,
        p.tier,
        midDist,
        d.palmCullDist,
        hyst,
      );
      if (nextTier !== p.tier || force) {
        p.tier = nextTier;
        p.rig.root.visible = nextTier < 2;
        p.rig.highDetailGroup.visible = nextTier === 0;
        p.rig.lowDetailGroup.visible = nextTier === 1;
      }
      if (p.tier === 0) palmsLod0++;
      else if (p.tier === 1) palmsLod1++;
      else palmsCulled++;
    }

    let propsVisible = 0;
    let propsCulled = 0;
    for (let i = 0; i < this.lodPropEntries.length; i++) {
      const prop = this.lodPropEntries[i];
      const dx = prop.x - refX;
      const dz = prop.z - refZ;
      const distSq = dx * dx + dz * dz;
      const cullDist = prop.isLarge ? d.palmCullDist : d.propCullDist;
      const nextVis = classifyVisibleWithHysteresis(distSq, prop.visible, cullDist, hyst);
      if (nextVis !== prop.visible || force) {
        prop.visible = nextVis;
        prop.object.visible = nextVis;
      }
      if (prop.visible) propsVisible++;
      else propsCulled++;
    }

    // Distance-scale rigid-body physics prop meshes & contact shadows
    const propCullSq = d.propCullDist * d.propCullDist;
    const propShadowSq = d.propShadowDist * d.propShadowDist;
    for (let i = 0; i < this.physicsProps.length; i++) {
      const p = this.physicsProps[i];
      const vis = this.physicsPropVisuals[i];
      if (!vis) continue;
      const dx = p.x - refX;
      const dz = p.z - refZ;
      const distSq = dx * dx + dz * dz;
      const showMesh = !p.sleeping || distSq <= propCullSq;
      vis.mesh.visible = showMesh;
      vis.shadow.visible = showMesh && distSq <= propShadowSq;
      if (showMesh) propsVisible++;
      else propsCulled++;
    }

    // Distance-cull far parked/AI vehicles while always keeping active, emergency, and aircraft visible
    const vehCullSq = d.vehicleCullDist * d.vehicleCullDist;
    let actorsVisible = 0;
    let actorsCulled = 0;
    for (let i = 0; i < this.liveVehicles.length; i++) {
      const v = this.liveVehicles[i];
      const keepVisible =
        v.id === this.activeVehicleId ||
        v.isAircraft ||
        (this.emergencyDispatch.active && v.id === this.emergencyDispatch.ambulanceId);
      const dx = v.x - refX;
      const dz = v.z - refZ;
      const show = keepVisible || dx * dx + dz * dz <= vehCullSq;
      v.mesh.visible = show;
      if (show) actorsVisible++;
      else actorsCulled++;
    }
    for (let i = 0; i < this.aiTraffic.length; i++) {
      const ai = this.aiTraffic[i];
      if (!ai.active) continue;
      const dx = ai.x - refX;
      const dz = ai.z - refZ;
      const show = dx * dx + dz * dz <= vehCullSq;
      ai.rig.root.visible = show;
      if (show) actorsVisible++;
      else actorsCulled++;
    }

    this.lodTelemetry = {
      quality: this.lodState.quality,
      lodScale: this.lodState.lodScale,
      cameraFar: d.cameraFar,
      buildingsLod0,
      buildingsLod1,
      buildingsCulled,
      palmsLod0,
      palmsLod1,
      palmsCulled,
      propsVisible,
      propsCulled,
      actorsVisible,
      actorsCulled,
    };
    if (typeof window !== 'undefined') {
      (window as Window & { __keralaLodStats?: LodTelemetrySnapshot }).__keralaLodStats =
        this.lodTelemetry;
    }
  }

  public spawnAndEnterVehicle(def: VehicleDef) {
    // Summon any vehicle from Garage; Aeroplanes spawn cleanly at Runway 09 threshold facing straight down the 196m runway!
    const aircraft = Boolean(def.isAircraft || isAircraftType(def.type));
    let existing = this.liveVehicles.find((v) => v.id === def.id);
    const spawnX = aircraft
      ? AIRPORT_RUNWAY.takeoffStartX
      : this.playerX + Math.sin(this.playerYaw) * 2.2;
    const spawnZ = aircraft
      ? AIRPORT_RUNWAY.takeoffStartZ
      : this.playerZ + Math.cos(this.playerYaw) * 2.2;
    const spawnYaw = aircraft ? AIRPORT_RUNWAY.takeoffYaw : this.playerYaw;
    const safeRaw = aircraft
      ? { x: spawnX, z: spawnZ }
      : resolveCircleWorldCollision(spawnX, spawnZ, 1.8, this.colliders);
    const safe = aircraft ? safeRaw : snapPointToNearestRoad(safeRaw.x, safeRaw.z);

    if (!existing) {
      const spawnDef: VehicleDef = {
        ...def,
        x: safe.x,
        z: safe.z,
        rotationY: spawnYaw,
      };
      const rig = createDetailedVehicleModel(spawnDef);
      this.scene.add(rig.root);
      existing = {
        id: def.id,
        name: def.name,
        type: def.type,
        x: safe.x,
        y: 0,
        z: safe.z,
        vy: 0,
        yaw: spawnYaw,
        pitch: 0,
        roll: 0,
        pitchVel: 0,
        rollVel: 0,
        suspY: 0,
        suspVy: 0,
        grounded: true,
        speed: 0,
        lateralSpeed: 0,
        maxSpeed: def.maxSpeed,
        mass: def.type === 'bus' || def.type === 'fire_engine' ? 24 : def.type === 'auto' ? 7 : 12,
        steerAngle: 0,
        steerInput: 0,
        isAircraft: aircraft,
        flightState: 'ground',
        autoLanding: false,
        peakAltitude: 0,
        hasSiren: Boolean(def.hasSiren || rig.hasSiren),
        sirenOn: false,
        rig,
        mesh: rig.root,
      };
      this.liveVehicles.push(existing);
    } else {
      existing.x = safe.x;
      existing.y = 0;
      existing.z = safe.z;
      existing.vy = 0;
      existing.yaw = spawnYaw;
      existing.pitch = 0;
      existing.roll = 0;
      existing.pitchVel = 0;
      existing.rollVel = 0;
      existing.suspY = 0;
      existing.suspVy = 0;
      existing.grounded = true;
      existing.speed = 0;
      existing.lateralSpeed = 0;
      existing.steerInput = 0;
      existing.flightState = 'ground';
      existing.autoLanding = false;
      existing.peakAltitude = 0;
      existing.mesh.visible = true;
      existing.mesh.position.set(existing.x, 0, existing.z);
      existing.mesh.rotation.order = 'YXZ';
      existing.mesh.rotation.set(0, existing.yaw, 0);
      if (existing.rig.bodyPivot) existing.rig.bodyPivot.rotation.set(0, 0, 0);
    }

    this.inHospital = false;
    this.autopilotDest = null;
    this.activeVehicleId = existing.id;
    this.sheru.root.visible = false;
    this.playerX = existing.x;
    this.playerY = 0;
    this.playerZ = existing.z;
    this.playerYaw = existing.yaw;
    this.camYaw = existing.yaw;
    this.camPitch = aircraft ? 0.2 : 0.26;
    this.snapCameraImmediate();
    soundEngine.playHorn();
    this.spawnParticleBurst(existing.x, 1.4, existing.z, 18, aircraft ? 0x38bdf8 : 0xffd166);
    this.callbacks.onVehicleEnter(existing.id);
    this.hudThrottle = 1;
  }

  public triggerAutoLand(): boolean {
    if (!this.activeVehicleId) return false;
    const veh = this.liveVehicles.find((v) => v.id === this.activeVehicleId);
    if (!veh || !veh.isAircraft) return false;
    veh.autoLanding = !veh.autoLanding;
    this.hudThrottle = 1;
    return veh.autoLanding;
  }

  public teleportToAirport() {
    this.activeVehicleId = null;
    this.autopilotDest = null;
    this.sittingBenchId = null;
    if (this.railwayState.riderMode !== 'none') {
      this.railwayState = { ...this.railwayState, riderMode: 'none', ridingTrainId: null };
    }
    this.inHospital = false;
    this.sheru.root.visible = true;
    this.playerX = -2;
    this.playerY = 0;
    this.playerZ = -129;
    this.playerYaw = Math.PI; // Facing North directly toward the Runway, parked Jets & ATC Tower!
    this.camYaw = Math.PI;
    this.camPitch = 0.22;
    this.sheru.root.position.set(this.playerX, 0, this.playerZ);
    this.sheru.root.rotation.y = this.playerYaw;
    this.snapCameraImmediate();
    this.spawnParticleBurst(this.playerX, 1.2, this.playerZ, 18, 0x38bdf8);
    this.hudThrottle = 1;
  }

  /**
   * Quick-travel helper to Malabar Golden Beach or any of the 4 Kerala Railway Stations!
   */
  public teleportToScenicSpot(spotId: string) {
    this.activeVehicleId = null;
    this.autopilotDest = null;
    this.sittingBenchId = null;
    if (this.railwayState.riderMode !== 'none') {
      this.railwayState = { ...this.railwayState, riderMode: 'none', ridingTrainId: null };
    }
    this.inHospital = false;
    this.sheru.root.visible = true;

    if (spotId === 'beach') {
      // Spawn cleanly on the sunlit promenade right beside Sea Bench #3 (-12, 173.4) with unobstructed ocean vista!
      this.playerX = -11.5;
      this.playerY = 0.16;
      this.playerZ = 172.2;
      this.playerYaw = 0; // Facing South straight out at the golden beach & turquoise Arabian Sea!
      this.camYaw = 0;
      this.camPitch = 0.16;
    } else {
      const st = RAILWAY_STATIONS.find((s) => s.id === spotId) ?? RAILWAY_STATIONS[0];
      const pfPos = stationLocalToWorld(st, -4, -PLATFORM_CENTER_OFFSET);
      this.playerX = pfPos.x;
      this.playerY = 0.55;
      this.playerZ = pfPos.z;
      // Face outward toward Platform 1 & Track A!
      const faceYaw = Math.atan2(st.outwardX, st.outwardZ);
      this.playerYaw = faceYaw;
      this.camYaw = faceYaw;
      this.camPitch = 0.2;
    }

    this.sheru.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.sheru.root.rotation.y = this.playerYaw;
    this.applyLodCameraAndShadows();
    this.snapCameraImmediate();
    this.spawnParticleBurst(this.playerX, this.playerY + 1.2, this.playerZ, 16, 0x38bdf8);
    this.hudThrottle = 1;
  }

  public boardTrainAtStation(mode: 'driver' | 'passenger'): { success: boolean; message: string } {
    if (this.activeVehicleId || this.railwayState.riderMode !== 'none') {
      return { success: false, message: 'Exit your current vehicle first!' };
    }
    const ctx = findPlayerPlatformContext(this.railwayState, this.playerX, this.playerZ);
    if (!ctx || !ctx.stoppedTrain) {
      return {
        success: false,
        message: 'Wait until a train arrives and stops at this platform!',
      };
    }
    const res = boardStoppedTrain(this.railwayState, ctx.stoppedTrain.id, mode);
    this.railwayState = res.state;
    if (res.success) {
      this.sittingBenchId = null;
      this.sheru.root.visible = false;
      this.trainDriverCabView = true;
      soundEngine.playBusHorn();
      this.applyLodCameraAndShadows();
      this.hudThrottle = 1;
    }
    return { success: res.success, message: res.message };
  }

  public alightCurrentTrain(): { success: boolean; message: string } {
    const res = alightFromTrain(this.railwayState);
    this.railwayState = res.state;
    if (res.success) {
      this.playerX = res.exitX;
      this.playerY = 0.55;
      this.playerZ = res.exitZ;
      this.sheru.root.position.set(this.playerX, this.playerY, this.playerZ);
      this.sheru.root.visible = true;
      soundEngine.playInteract();
      this.snapCameraImmediate();
      this.hudThrottle = 1;
    } else {
      soundEngine.playBrakeScreech();
    }
    return { success: res.success, message: res.message };
  }

  public waitForNextTrainAtStation(): boolean {
    const ctx = findPlayerPlatformContext(this.railwayState, this.playerX, this.playerZ);
    if (!ctx || ctx.stoppedTrain) return false;
    this.railwayState = fastForwardNextTrainAtPlatform(
      this.railwayState,
      ctx.station.id,
      ctx.platform,
    );
    soundEngine.playBusHorn();
    this.hudThrottle = 1;
    return true;
  }

  public cycleTrainCameraView() {
    if (this.railwayState.riderMode === 'passenger') {
      const order: ('right_window' | 'left_window' | 'outside')[] = [
        'right_window',
        'left_window',
        'outside',
      ];
      const next = order[(order.indexOf(this.railwayState.seatView) + 1) % order.length];
      this.railwayState = { ...this.railwayState, seatView: next };
      this.hudThrottle = 1;
    } else if (this.railwayState.riderMode === 'driver') {
      this.trainDriverCabView = !this.trainDriverCabView;
      this.railwayState = {
        ...this.railwayState,
        seatView: this.trainDriverCabView ? 'right_window' : 'outside',
      };
      this.hudThrottle = 1;
    }
  }

  public soundTrainHorn() {
    soundEngine.playBusHorn();
  }

  public setTrainTouchThrottle(throttle: number) {
    this.railwayState = { ...this.railwayState, driverThrottle: throttle };
  }

  public toggleSitOnBench(benchId?: string): boolean {
    if (this.sittingBenchId) {
      // Stand up smoothly right in front of the beach bench!
      const b = BEACH_BENCHES.find((item) => item.id === this.sittingBenchId);
      this.sittingBenchId = null;
      if (b) {
        this.playerX = b.x;
        this.playerZ = b.z - 1.35;
        this.playerY = 0.14;
      }
      this.sheru.leftLeg.rotation.x = 0;
      this.sheru.rightLeg.rotation.x = 0;
      this.sheru.bodyGroup.position.y = 0;
      soundEngine.playInteract();
      this.hudThrottle = 1;
      return false;
    }
    if (this.activeVehicleId || this.railwayState.riderMode !== 'none') return false;
    const target = benchId
      ? BEACH_BENCHES.find((b) => b.id === benchId)
      : BEACH_BENCHES.find((b) => Math.hypot(b.x - this.playerX, b.z - this.playerZ) <= 3.6);
    if (!target) return false;
    this.sittingBenchId = target.id;
    this.playerX = target.x;
    this.playerZ = target.z + 0.05;
    this.playerY = 0.56;
    this.playerYaw = target.facingYaw; // Face +Z directly toward the Arabian Sea waves!
    this.camYaw = target.facingYaw;
    this.camPitch = 0.14;
    this.playerVx = 0;
    this.playerVz = 0;
    this.playerVy = 0;
    this.applyLodCameraAndShadows();
    soundEngine.playInteract();
    this.hudThrottle = 1;
    return true;
  }

  private snapCameraImmediate() {
    const activeVeh = this.activeVehicleId
      ? this.liveVehicles.find((v) => v.id === this.activeVehicleId)
      : null;
    const isFlying = Boolean(activeVeh?.isAircraft);
    const followDist = isFlying ? 17.5 : this.activeVehicleId ? 10.5 : this.inHospital ? 4.4 : 7.6;
    const followHeight = isFlying ? 5.8 : this.activeVehicleId ? 4.4 : this.inHospital ? 2.05 : 3.2;
    const horizDist = Math.cos(this.camPitch) * followDist;
    const vertOffset = Math.sin(this.camPitch) * followDist + followHeight * 0.45;
    const desiredX = this.playerX - Math.sin(this.camYaw) * horizDist;
    const desiredZ = this.playerZ - Math.cos(this.camYaw) * horizDist;
    const desiredY = Math.max(1.6, this.playerY + vertOffset);
    this.camCurrentPos.set(desiredX, desiredY, desiredZ);
    this.camera.position.copy(this.camCurrentPos);
    this.camLookTarget.set(this.playerX, this.playerY + (isFlying ? 2.1 : 1.85), this.playerZ);
    this.camera.lookAt(this.camLookTarget);
  }

  public setAutopilotDestination(dest: AutoDestination | null) {
    this.autopilotDest = dest;
    if (dest && this.activeVehicleId) {
      const veh = this.liveVehicles.find((v) => v.id === this.activeVehicleId);
      if (veh?.hasSiren) {
        veh.sirenOn = true;
        const kind =
          veh.type === 'police_jeep'
            ? 'police'
            : veh.type === 'fire_engine'
              ? 'fire'
              : 'ambulance';
        soundEngine.startSiren(kind);
      } else {
        soundEngine.playHorn();
      }
    }
    this.hudThrottle = 1;
  }

  public toggleActiveSiren(): boolean {
    if (!this.activeVehicleId) return false;
    const veh = this.liveVehicles.find((v) => v.id === this.activeVehicleId);
    if (!veh || !veh.hasSiren) return false;
    veh.sirenOn = !veh.sirenOn;
    if (veh.sirenOn) {
      const kind =
        veh.type === 'police_jeep'
          ? 'police'
          : veh.type === 'fire_engine'
            ? 'fire'
            : 'ambulance';
      soundEngine.startSiren(kind);
    } else {
      soundEngine.stopSiren();
    }
    this.hudThrottle = 1;
    return veh.sirenOn;
  }

  public parkActiveVehicle() {
    if (!this.activeVehicleId) return;
    const veh = this.liveVehicles.find((v) => v.id === this.activeVehicleId);
    if (!veh) return;

    // Snap neatly into a marked parking bay if within 12m
    let bayName: string | undefined;
    for (const bay of PARKING_BAYS) {
      if (Math.hypot(bay.x - veh.x, bay.z - veh.z) <= 12) {
        veh.x = bay.x;
        veh.z = bay.z;
        veh.yaw = bay.rotationY;
        bayName = bay.name;
        break;
      }
    }
    veh.speed = 0;
    veh.y = 0;
    veh.pitch = 0;
    veh.roll = 0;
    veh.autoLanding = false;
    veh.flightState = 'ground';
    veh.sirenOn = false;
    soundEngine.stopSiren();
    veh.mesh.position.set(veh.x, 0, veh.z);
    veh.mesh.rotation.y = veh.yaw;
    if (veh.rig.bodyPivot) veh.rig.bodyPivot.rotation.set(0, 0, 0);
    this.autopilotDest = null;

    this.callbacks.onVehicleParked(veh.id, veh.x, veh.z, veh.yaw, bayName);
    this.triggerInteract(); // Exit neatly beside parked vehicle
  }

  public dispatchEmergencyAmbulance(rawTargetX: number, rawTargetZ: number) {
    // If Sheru calls 108 while already inside Hospital, dispatch ambulance cleanly to the front Emergency Porch!
    const targetX = isInsideHospitalInterior(rawTargetX, rawTargetZ)
      ? HOSPITAL_INTERIOR_BOUNDS.doorX
      : rawTargetX;
    const targetZ = isInsideHospitalInterior(rawTargetX, rawTargetZ)
      ? HOSPITAL_INTERIOR_BOUNDS.doorZ + 5.2
      : rawTargetZ;

    let amb = this.liveVehicles.find((v) => v.id === 'veh_ambulance_108');
    if (!amb) {
      const cat = VEHICLE_CATALOG.find((v) => v.id === 'veh_ambulance_108')!;
      const rig = createDetailedVehicleModel({ ...cat, x: 54, z: -36, rotationY: -Math.PI / 2 });
      this.scene.add(rig.root);
      amb = {
        id: cat.id,
        name: cat.name,
        type: 'ambulance',
        x: 54,
        y: 0,
        z: -36,
        vy: 0,
        yaw: -Math.PI / 2,
        pitch: 0,
        roll: 0,
        pitchVel: 0,
        rollVel: 0,
        suspY: 0,
        suspVy: 0,
        grounded: true,
        speed: 0,
        lateralSpeed: 0,
        maxSpeed: 45,
        mass: 15,
        steerAngle: 0,
        steerInput: 0,
        isAircraft: false,
        flightState: 'ground',
        autoLanding: false,
        peakAltitude: 0,
        hasSiren: true,
        sirenOn: true,
        rig,
        mesh: rig.root,
      };
      this.liveVehicles.push(amb);
    }
    // Position ambulance cleanly on a clear road approach (~13m away) facing the scene so player watches it rush in!
    const dist = Math.hypot(amb.x - targetX, amb.z - targetZ);
    if (dist > 18) {
      const candidates = [
        { x: targetX + 13, z: targetZ },
        { x: targetX - 13, z: targetZ },
        { x: targetX, z: targetZ - 13 },
        { x: 0, z: -4 },
      ];
      let chosen = candidates[0];
      for (const c of candidates) {
        const check = resolveCircleWorldCollision(c.x, c.z, 1.8, this.colliders);
        if (!check.collided) {
          chosen = c;
          break;
        }
      }
      const safe = resolveCircleWorldCollision(chosen.x, chosen.z, 1.8, this.colliders);
      amb.x = safe.x;
      amb.z = safe.z;
    }
    amb.yaw = Math.atan2(targetX - amb.x, targetZ - amb.z);
    amb.mesh.position.set(amb.x, 0, amb.z);
    amb.mesh.rotation.y = amb.yaw;
    amb.sirenOn = true;
    soundEngine.startSiren('ambulance');
    this.emergencyDispatch = {
      active: true,
      phase: 'en_route',
      targetX,
      targetZ,
      ambulanceId: amb.id,
    };
    this.hudThrottle = 1;
  }

  public boardAmbulanceToHospital(mode: 'auto_ambulance' | 'player_driver') {
    const amb = this.liveVehicles.find((v) => v.id === this.emergencyDispatch.ambulanceId);
    if (!amb) return;
    this.activeVehicleId = amb.id;
    this.sheru.root.visible = false;
    amb.sirenOn = true;
    soundEngine.startSiren('ambulance');
    this.emergencyDispatch.active = true;
    this.emergencyDispatch.phase = 'to_hospital';

    if (mode === 'auto_ambulance') {
      this.autopilotDest = {
        id: 'dest_hospital',
        name: 'Kerala General Hospital',
        mlName: 'ആശുപത്രി (108)',
        x: 64,
        z: -34,
      };
    } else {
      this.autopilotDest = null;
    }
    this.hudThrottle = 1;
  }

  public cancelEmergencyDispatch() {
    this.emergencyDispatch.active = false;
    const amb = this.liveVehicles.find((v) => v.id === this.emergencyDispatch.ambulanceId);
    if (amb && this.activeVehicleId !== amb.id) {
      amb.sirenOn = false;
    }
    soundEngine.stopSiren();
  }

  private launchCoconutFromPalm(
    palm: LiveCoconutPalm,
    impactDirX: number,
    impactDirZ: number,
    aimTowardPlayer: boolean,
  ) {
    // Always trigger the 3D trunk shake, frond rustle, leaf burst, and bump SFX
    palm.shaking = true;
    palm.shakeTime = 0;
    palm.impactDirX = impactDirX;
    palm.impactDirZ = impactDirZ;
    soundEngine.playPalmBump();
    this.camShakeTrauma = Math.min(1, this.camShakeTrauma + 0.2);

    // Compute exact 3D world position of the palm's hanging coconut cluster
    palm.rig.root.updateMatrixWorld(true);
    let dropIdx = palm.rig.coconuts.findIndex((c) => c.visible);
    if (dropIdx === -1) dropIdx = 0;
    const crownCoco = palm.rig.coconuts[dropIdx];
    crownCoco.getWorldPosition(_v1);
    this.spawnParticleBurst(_v1.x, _v1.y + 0.3, _v1.z, 12, 0x3a9d4a);

    if (
      !this.fallingCoconut ||
      this.fallingCoconut.phase !== 'idle' ||
      palm.dropCooldown > 0 ||
      this.emergencyDispatch.active
    ) {
      return;
    }

    // Detach hanging coconut from crown (regrows cleanly after 10s)
    crownCoco.visible = false;
    palm.detachedCocoIdx = dropIdx;
    palm.regrowTimer = 10;
    palm.dropCooldown = 6.0;

    // Launch 3D coconut from the crown with realistic horizontal arc toward Sheru/impact side
    const fallTime = Math.sqrt((2 * Math.max(2, _v1.y - 2.0)) / 24);
    let vx = -impactDirX * 1.6;
    let vz = -impactDirZ * 1.6;
    if (aimTowardPlayer && !this.activeVehicleId) {
      vx = THREE.MathUtils.clamp((this.playerX - _v1.x) / Math.max(0.35, fallTime), -4.5, 4.5);
      vz = THREE.MathUtils.clamp((this.playerZ - _v1.z) / Math.max(0.35, fallTime), -4.5, 4.5);
    }

    this.fallingCoconut.x = _v1.x;
    this.fallingCoconut.y = _v1.y;
    this.fallingCoconut.z = _v1.z;
    this.fallingCoconut.vx = vx;
    this.fallingCoconut.vy = 0;
    this.fallingCoconut.vz = vz;
    this.fallingCoconut.spinX = 8.5;
    this.fallingCoconut.spinZ = 5.4;
    this.fallingCoconut.phase = 'falling';
    this.fallingCoconut.restTimer = 0;

    this.fallingCoconut.rig.group.position.set(_v1.x, _v1.y, _v1.z);
    this.fallingCoconut.rig.group.rotation.set(0, 0, 0);
    this.fallingCoconut.rig.group.visible = true;
    this.fallingCoconut.rig.shadowRing.position.set(_v1.x, 0.05, _v1.z);
    this.fallingCoconut.rig.shadowRing.scale.setScalar(0.55);
    this.fallingCoconut.rig.shadowRing.visible = true;
  }

  public triggerCoconutDropDemo() {
    if (this.activeVehicleId) return;
    // Shake nearest palm if close, otherwise launch directly overhead
    let nearest: LiveCoconutPalm | null = null;
    let bestD = Infinity;
    for (const p of this.livePalms) {
      const d = Math.hypot(p.x - this.playerX, p.z - this.playerZ);
      if (d < bestD) {
        bestD = d;
        nearest = p;
      }
    }
    if (nearest && bestD < 8) {
      nearest.dropCooldown = 0;
      this.launchCoconutFromPalm(nearest, nearest.x - this.playerX, nearest.z - this.playerZ, true);
      return;
    }
    if (this.fallingCoconut) {
      this.fallingCoconut.x = this.playerX;
      this.fallingCoconut.z = this.playerZ;
      this.fallingCoconut.y = 8.5;
      this.fallingCoconut.vx = 0;
      this.fallingCoconut.vy = 0;
      this.fallingCoconut.vz = 0;
      this.fallingCoconut.spinX = 8.5;
      this.fallingCoconut.spinZ = 5.0;
      this.fallingCoconut.phase = 'falling';
      this.fallingCoconut.rig.group.position.set(this.playerX, 8.5, this.playerZ);
      this.fallingCoconut.rig.group.visible = true;
      this.fallingCoconut.rig.shadowRing.position.set(this.playerX, 0.05, this.playerZ);
      this.fallingCoconut.rig.shadowRing.visible = true;
    }
  }

  public cycleTimeOfDay(): number {
    const phase = getTimeOfDayPhase(this.timeOfDay);
    if (phase === 'day') this.timeOfDay = 0.71; // Sunset
    else if (phase === 'sunset') this.timeOfDay = 0.88; // Night
    else this.timeOfDay = 0.28; // Day
    return this.timeOfDay;
  }

  public cycleWeather(target?: WeatherCondition): WeatherCondition {
    this.weatherState = cycleWeatherCondition(this.weatherState, target);
    this.hudThrottle = 1;
    return this.weatherState.condition;
  }

  public startPurseChaseEvent(): { victimName: string } {
    // Exit vehicle gently if player triggers chase while parked? Keep it seamless even on foot or near car!
    const raw = startPurseChase(this.playerX, this.playerZ, this.playerYaw, this.chaseSeed++);
    const safeVictim = resolveCircleWorldCollision(raw.victimX, raw.victimZ, 0.75, this.colliders);
    const safeThief = resolveCircleWorldCollision(raw.thiefX, raw.thiefZ, 0.75, this.colliders);
    this.purseChase = {
      ...raw,
      victimX: safeVictim.x,
      victimZ: safeVictim.z,
      thiefX: safeThief.x,
      thiefZ: safeThief.z,
    };
    this.thiefDustTimer = 0;

    if (this.thiefRig) {
      this.thiefRig.root.position.set(this.purseChase.thiefX, 0, this.purseChase.thiefZ);
      this.thiefRig.root.rotation.y = this.purseChase.thiefYaw;
      this.thiefRig.bodyGroup.rotation.set(0.34, 0, 0);
      this.thiefRig.bodyGroup.position.y = 0;
      this.thiefRig.headGroup.rotation.set(0, 0, 0);
      this.thiefRig.stolenPurse.visible = true;
      this.thiefRig.panicAlert.visible = true;
      this.thiefRig.dizzyStars.visible = false;
      this.thiefRig.beaconArrow.visible = true;
      this.thiefRig.root.visible = true;
    }
    if (this.droppedPurseRig) {
      this.droppedPurseRig.root.visible = false;
      this.droppedPurseRig.haloRing.visible = false;
      this.droppedPurseRig.impactRing.visible = false;
      this.droppedPurseRig.purseMesh.scale.set(1, 1, 1);
    }
    if (this.victimRig) {
      this.victimRig.root.position.set(this.purseChase.victimX, 0, this.purseChase.victimZ);
      const lookYaw = Math.atan2(
        this.purseChase.thiefX - this.purseChase.victimX,
        this.purseChase.thiefZ - this.purseChase.victimZ,
      );
      this.victimRig.root.rotation.y = lookYaw;
      this.victimRig.root.visible = true;
    }

    this.spawnParticleBurst(this.purseChase.victimX, 1.5, this.purseChase.victimZ, 12, 0xf472b6);
    soundEngine.playEventPop();
    this.hudThrottle = 1;
    return { victimName: this.purseChase.victimName };
  }

  public performPurseChaseAction(action: PurseChaseAction): PurseChaseActionResult {
    const prevThiefX = this.purseChase.thiefX;
    const prevThiefZ = this.purseChase.thiefZ;
    const res = applyPurseChaseAction(this.purseChase, action, this.playerX, this.playerZ);
    this.purseChase = res.state;

    if (res.success) {
      // Face Sheru Bhai cleanly toward the pickpocket
      const dx = prevThiefX - this.playerX;
      const dz = prevThiefZ - this.playerZ;
      if (!this.activeVehicleId && Math.hypot(dx, dz) > 0.1) {
        this.playerYaw = Math.atan2(dx, dz);
        this.sheru.root.rotation.y = this.playerYaw;
      }

      if (res.caughtNow) {
        // Visually launch the stolen purse out of the pocket kidnapper's hand onto the road!
        if (this.thiefRig) {
          this.thiefRig.stolenPurse.visible = false;
          this.thiefRig.panicAlert.visible = false;
          this.thiefRig.dizzyStars.visible = true;
        }
        if (this.droppedPurseRig && this.purseChase.droppedItem.dropped) {
          const item = this.purseChase.droppedItem;
          this.droppedPurseRig.root.position.set(item.x, 0, item.z);
          this.droppedPurseRig.purseMesh.position.set(0, item.y, 0);
          this.droppedPurseRig.purseMesh.rotation.set(item.rotX, 0, item.rotZ);
          this.droppedPurseRig.haloRing.visible = false;
          this.droppedPurseRig.root.visible = true;
          this.spawnParticleBurst(item.x, item.y, item.z, 14, 0xf472b6);
        }
      }

      if (action === 'gun') {
        soundEngine.playCartoonBlaster();
        if (this.blasterBeam) {
          const sx = this.playerX;
          const sy = this.playerY + 1.35;
          const sz = this.playerZ;
          const tx = prevThiefX;
          const ty = 1.25;
          const tz = prevThiefZ;
          const dist = Math.max(0.5, Math.hypot(tx - sx, ty - sy, tz - sz));
          this.blasterBeam.position.set((sx + tx) / 2, (sy + ty) / 2, (sz + tz) / 2);
          this.blasterBeam.scale.set(1, 1, dist);
          this.blasterBeam.lookAt(tx, ty, tz);
          this.blasterBeam.visible = true;
          (this.blasterBeam.material as THREE.MeshBasicMaterial).opacity = 0.95;
          this.blasterBeamTimer = 0.24;
        }
        this.spawnParticleBurst(prevThiefX, 1.4, prevThiefZ, 18, 0xfde047);
        this.camShakeTrauma = Math.min(1, this.camShakeTrauma + 0.3);
      } else if (action === 'slap') {
        soundEngine.playSlapHand();
        this.triggerCelebration('flex');
        this.spawnParticleBurst(prevThiefX, 1.55, prevThiefZ, 24, 0xf97316);
        this.camShakeTrauma = Math.min(1, this.camShakeTrauma + 0.55);
        if (this.thiefRig) {
          this.thiefRig.dizzyStars.visible = true;
        }
      } else if (action === 'police' && res.completed) {
        soundEngine.playPoliceArrest();
        this.triggerCelebration('celebrate');
        this.spawnParticleBurst(prevThiefX, 1.6, prevThiefZ, 26, 0x3b82f6);
        this.spawnParticleBurst(this.playerX, 1.8, this.playerZ, 20, 0xffd166);
        if (this.thiefRig) {
          this.thiefRig.root.visible = false;
          this.thiefRig.dizzyStars.visible = false;
          this.thiefRig.panicAlert.visible = false;
          this.thiefRig.stolenPurse.visible = true;
        }
        if (this.droppedPurseRig) {
          this.droppedPurseRig.root.visible = false;
          this.droppedPurseRig.haloRing.visible = false;
          this.droppedPurseRig.impactRing.visible = false;
          this.droppedPurseRig.purseMesh.scale.set(1, 1, 1);
        }
        if (this.victimRig) {
          this.victimRig.root.visible = false;
        }
        this.autoChaseTimer = 55;
      }
    } else {
      soundEngine.playInteract();
    }

    this.hudThrottle = 1;
    return res;
  }

  private initRainSystem() {
    const dropCount = this.rainMaxDrops;
    const positions = new Float32Array(dropCount * 6);
    const offsets = new Float32Array(dropCount * 3);
    for (let i = 0; i < dropCount; i++) {
      const rx = (Math.random() - 0.5) * 34;
      const ry = Math.random() * 20;
      const rz = (Math.random() - 0.5) * 34;
      offsets[i * 3] = rx;
      offsets[i * 3 + 1] = ry;
      offsets[i * 3 + 2] = rz;
      positions[i * 6] = rx;
      positions[i * 6 + 1] = ry;
      positions[i * 6 + 2] = rz;
      positions[i * 6 + 3] = rx - 0.2;
      positions[i * 6 + 4] = ry - 1.1;
      positions[i * 6 + 5] = rz;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    const lines = new THREE.LineSegments(geo, mat);
    lines.frustumCulled = false;
    lines.visible = false;
    this.scene.add(lines);
    this.rainLines = lines;
    this.rainMat = mat;
    this.rainOffsets = offsets;
  }

  private initStreetPuddles() {
    const allPavedRoads = [...TOWN_ROADS, ...AUX_PAVED_ROADS];
    const specs = generateStreetPuddleSpecs(allPavedRoads, [
      {
        x: SHERU_STATUE_ROUNDABOUT.x,
        z: SHERU_STATUE_ROUNDABOUT.z,
        radius: SHERU_STATUE_ROUNDABOUT.pedestalRadius + 1.4,
      },
    ]);
    this.puddleSpecs = specs;
    if (specs.length === 0) return;

    const puddleTex = createStreetPuddleTexture(this.maxAnisotropy);
    const puddleGeo = new THREE.PlaneGeometry(2, 2);
    puddleGeo.rotateX(-Math.PI / 2);
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x8fb6d4,
      map: puddleTex,
      roughness: 0.06,
      metalness: 0.78,
      envMapIntensity: 1.55,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -6,
    });
    const puddleMesh = new THREE.InstancedMesh(puddleGeo, puddleMat, specs.length);
    puddleMesh.frustumCulled = false;
    puddleMesh.visible = false;
    puddleMesh.renderOrder = 2;

    const levels = new Float32Array(specs.length);
    _scale.set(0, 0, 0);
    _quat.identity();
    for (let i = 0; i < specs.length; i++) {
      _v1.set(specs[i].x, 0.062, specs[i].z);
      _mat4.compose(_v1, _quat, _scale);
      puddleMesh.setMatrixAt(i, _mat4);
    }
    puddleMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(puddleMesh);
    this.puddleMesh = puddleMesh;
    this.puddleMat = puddleMat;
    this.puddleVisualLevels = levels;

    // Pooled raindrop ripple rings across visible monsoon street puddles (1 draw call!)
    const rippleCount = 28;
    const rippleGeo = new THREE.RingGeometry(0.16, 0.23, 18);
    rippleGeo.rotateX(-Math.PI / 2);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -7,
      polygonOffsetUnits: -7,
    });
    const rippleMesh = new THREE.InstancedMesh(rippleGeo, rippleMat, rippleCount);
    rippleMesh.frustumCulled = false;
    rippleMesh.visible = false;
    rippleMesh.renderOrder = 3;
    for (let i = 0; i < rippleCount; i++) {
      _v1.set(0, -10, 0);
      _mat4.compose(_v1, _quat, _scale);
      rippleMesh.setMatrixAt(i, _mat4);
    }
    rippleMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(rippleMesh);
    this.puddleRippleMesh = rippleMesh;
    this.puddleRippleMat = rippleMat;
  }

  public triggerCelebration(kind: 'celebrate' | 'flex' | 'laugh' = 'celebrate') {
    this.reactionType = kind;
    this.reactionTimer = 1.6;
    this.camShakeTrauma = Math.min(1, this.camShakeTrauma + 0.35);
    this.spawnParticleBurst(this.playerX, this.playerY + 2.2, this.playerZ, 24, 0xffd166);
  }

  public setTouchInput(moveX: number, moveY: number, running: boolean) {
    this.touchMoveX = moveX;
    this.touchMoveY = moveY;
    this.touchRunning = running;
  }

  public setTouchFlightVertical(dir: -1 | 0 | 1) {
    this.touchFlightVertical = dir;
  }

  private dispatchFireRescueEngine(targetX: number, targetZ: number) {
    const fireDef = VEHICLE_CATALOG.find((v) => v.id === 'veh_fire_engine') ?? VEHICLE_CATALOG[0];
    let engine = this.liveVehicles.find((v) => v.id === 'veh_fire_engine');
    if (!engine) {
      const rig = createDetailedVehicleModel({ ...fireDef, x: targetX - 18, z: targetZ });
      this.scene.add(rig.root);
      engine = {
        id: fireDef.id,
        name: fireDef.name,
        type: fireDef.type,
        x: targetX - 18,
        y: 0,
        z: targetZ,
        vy: 0,
        yaw: 0,
        pitch: 0,
        roll: 0,
        pitchVel: 0,
        rollVel: 0,
        suspY: 0,
        suspVy: 0,
        grounded: true,
        speed: 0,
        lateralSpeed: 0,
        maxSpeed: fireDef.maxSpeed,
        mass: 24,
        steerAngle: 0,
        steerInput: 0,
        isAircraft: false,
        flightState: 'ground',
        autoLanding: false,
        peakAltitude: 0,
        hasSiren: true,
        sirenOn: true,
        rig,
        mesh: rig.root,
      };
      this.liveVehicles.push(engine);
    }

    const candidates = [
      { x: targetX - 18, z: targetZ + 2 },
      { x: targetX + 18, z: targetZ - 2 },
      { x: targetX, z: targetZ + 18 },
      { x: targetX, z: targetZ - 18 },
    ];
    let chosen = candidates[0];
    for (const c of candidates) {
      const check = resolveCircleWorldCollision(c.x, c.z, 2.0, this.colliders);
      if (!check.collided) {
        chosen = c;
        break;
      }
    }
    const safe = resolveCircleWorldCollision(chosen.x, chosen.z, 2.0, this.colliders);
    engine.x = safe.x;
    engine.z = safe.z;
    engine.yaw = Math.atan2(targetX - engine.x, targetZ - engine.z);
    engine.mesh.position.set(engine.x, 0, engine.z);
    engine.mesh.rotation.y = engine.yaw;
    engine.sirenOn = true;

    this.fireRescueDispatch = {
      active: true,
      arrived: false,
      targetX,
      targetZ,
      fireEngineId: engine.id,
      timer: 0,
    };
  }

  private triggerAirplaneCrashBlast(
    veh: LiveVehicle,
    crashX: number,
    crashZ: number,
    reason: 'mountain' | 'off_airport' | 'building' = 'off_airport',
  ) {
    // BOOM!! Real off-airport / Western Ghats mountain crash blast VFX + sound + Fire Engine + 108 Ambulance rescue!
    soundEngine.playPlaneBlast();
    this.camShakeTrauma = 1.0;

    // Activate 3D Fireball + Shockwave Ring + Scorch Disc right at crash site!
    this.blastState = {
      active: true,
      x: crashX,
      z: crashZ,
      age: 0,
      duration: 13,
      smokeTimer: 0,
      foamTimer: 0,
    };
    this.blastRig.group.position.set(crashX, 0, crashZ);
    this.blastRig.group.visible = true;
    this.blastRig.core.scale.setScalar(0.6);
    this.blastRig.shell.scale.setScalar(0.8);
    this.blastRig.ring.scale.setScalar(0.6);
    this.blastRig.coreMat.opacity = 0.96;
    this.blastRig.shellMat.opacity = 0.85;
    this.blastRig.ringMat.opacity = 0.9;
    this.blastRig.scorchMat.opacity = 0.88;

    // Massive fiery explosion particle bursts (orange flame, bright yellow flash, dark smoke debris)
    this.spawnParticleBurst(crashX, 1.4, crashZ, 30, 0xff5a1f);
    this.spawnParticleBurst(crashX, 2.4, crashZ, 24, 0xfacc15);
    this.spawnParticleBurst(crashX, 3.0, crashZ, 22, 0x374151);

    // Park damaged plane cleanly back at Runway 09 so it's ready after hospital recovery
    veh.x = AIRPORT_RUNWAY.takeoffStartX;
    veh.y = 0;
    veh.z = AIRPORT_RUNWAY.takeoffStartZ;
    veh.yaw = AIRPORT_RUNWAY.takeoffYaw;
    veh.pitch = 0;
    veh.roll = 0;
    veh.speed = 0;
    veh.peakAltitude = 0;
    veh.flightState = 'ground';
    veh.autoLanding = false;
    veh.mesh.position.set(veh.x, 0, veh.z);
    veh.mesh.rotation.y = veh.yaw;
    if (veh.rig.bodyPivot) veh.rig.bodyPivot.rotation.set(0, 0, 0);

    // Eject Sheru Bhai safely on nearby flat ground facing the smoking blast & rushing rescue vehicles!
    this.activeVehicleId = null;
    this.autopilotDest = null;
    this.sheru.root.visible = true;
    const ejectTargetX = reason === 'mountain' ? THREE.MathUtils.clamp(crashX * 0.72, -165, 165) : crashX + 5.6;
    const ejectTargetZ = reason === 'mountain' ? THREE.MathUtils.clamp(crashZ * 0.72, -165, 165) : crashZ + 4.8;
    const ejectSafe = resolveCircleWorldCollision(ejectTargetX, ejectTargetZ, 0.9, this.colliders);
    this.playerX = ejectSafe.x;
    this.playerY = 0;
    this.playerZ = ejectSafe.z;
    this.playerYaw = Math.atan2(crashX - this.playerX, crashZ - this.playerZ);
    this.camYaw = this.playerYaw;
    this.camPitch = 0.24;
    this.sheru.root.position.set(this.playerX, 0, this.playerZ);
    this.sheru.root.rotation.y = this.playerYaw;
    this.snapCameraImmediate();

    // Auto-dispatch BOTH 108 Ambulance & Kerala Fire & Rescue Engine!
    this.dispatchEmergencyAmbulance(this.playerX, this.playerZ);
    this.dispatchFireRescueEngine(crashX, crashZ);

    const crashLabel =
      reason === 'mountain'
        ? 'Western Ghats Mountain Ridge'
        : reason === 'building'
          ? 'Town Building'
          : (getRoadNameAt(crashX, crashZ, 4.5) ?? getDistrictAt(crashX, crashZ));
    this.callbacks.onEmergencyIncident('airplane_crash', crashX, crashZ, crashLabel);
    this.hudThrottle = 1;
  }

  public rotateCameraDelta(dx: number, dy: number) {
    const sens = 0.005 * this.settings.mobileSensitivity;
    this.camYaw -= dx * sens;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * sens * 0.7, 0.08, 0.75);
  }

  public triggerJump() {
    if (this.mode !== 'playing' || this.modalOpen || this.activeVehicleId) return;
    this.jumpBufferTimer = 0.14;
  }

  public triggerInteract() {
    if (this.mode !== 'playing' || this.modalOpen) return;

    // 1. If riding or driving a Kerala train, E attempts to get off ONLY when stopped at a station!
    if (this.railwayState.riderMode !== 'none') {
      this.alightCurrentTrain();
      return;
    }

    // 2. If sitting on a Malabar Beach bench, E stands Sheru back up!
    if (this.sittingBenchId) {
      this.toggleSitOnBench();
      return;
    }

    if (this.activeVehicleId) {
      // Exit vehicle safely beside it (if airborne, land smoothly on Airport Apron so Sheru stays safe!)
      const veh = this.liveVehicles.find((v) => v.id === this.activeVehicleId);
      this.activeVehicleId = null;
      this.autopilotDest = null;
      if (veh) {
        veh.sirenOn = false;
        veh.autoLanding = false;
        soundEngine.stopSiren();
        if (veh.isAircraft && veh.y > 1.2) {
          veh.x = AIRPORT_RUNWAY.takeoffStartX;
          veh.y = 0;
          veh.z = AIRPORT_RUNWAY.takeoffStartZ;
          veh.yaw = AIRPORT_RUNWAY.takeoffYaw;
          veh.pitch = 0;
          veh.roll = 0;
          veh.speed = 0;
          veh.flightState = 'ground';
          veh.mesh.position.set(veh.x, 0, veh.z);
          veh.mesh.rotation.y = veh.yaw;
          if (veh.rig.bodyPivot) veh.rig.bodyPivot.rotation.set(0, 0, 0);
        }
        const safeExit = findSafeVehicleExitPoint(
          veh.type,
          veh.x,
          veh.y,
          veh.z,
          veh.yaw,
          veh.isAircraft,
          this.colliders,
          0.72,
        );
        this.playerX = safeExit.x;
        this.playerZ = safeExit.z;
        this.playerY = sampleWorldSurface(safeExit.x, safeExit.z).groundY;
      }
      this.sheru.root.visible = true;
      soundEngine.playInteract();
      this.hudThrottle = 1;
      return;
    }

    const nearby = this.findNearestInteractable();
    if (!nearby) return;

    if (nearby.kind === 'beach_bench') {
      this.toggleSitOnBench(nearby.id);
      return;
    }

    if (nearby.kind === 'vehicle') {
      this.activeVehicleId = nearby.id;
      this.sheru.root.visible = false;
      soundEngine.playHorn();
      this.callbacks.onVehicleEnter(nearby.id);
      this.applyLodCameraAndShadows();
      this.hudThrottle = 1;
      return;
    }

    if (nearby.kind === 'collectible') {
      const mesh = this.collectibleMeshes.get(nearby.id);
      if (mesh) mesh.visible = false;
      this.spawnParticleBurst(nearby.x, 1.2, nearby.z, 22, 0x06d6a0);
      soundEngine.playCash();
      this.callbacks.onCollectiblePickup(nearby.id);
      return;
    }

    soundEngine.playInteract();
    this.callbacks.onInteract(nearby);
  }

  public spawnParticleBurst(x: number, y: number, z: number, count: number, hex: number) {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.pos.set(x, y, z);
        const a = Math.random() * Math.PI * 2;
        const spd = 2.2 + Math.random() * 5.2;
        p.vel.set(Math.cos(a) * spd, 3.5 + Math.random() * 4.5, Math.sin(a) * spd);
        p.life = 0;
        p.maxLife = 0.65 + Math.random() * 0.45;
        p.color.setHex(spawned % 3 === 0 ? 0xffffff : hex);
        this.particleMesh.setColorAt(i, p.color);
        spawned++;
      }
    }
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private findNearestInteractable(): NearbyInteractable | null {
    let best: NearbyInteractable | null = null;
    const consider = (cand: NearbyInteractable, maxDist: number) => {
      if (cand.distance <= maxDist && (!best || cand.distance < best.distance)) {
        best = cand;
      }
    };

    // Malabar Beach Sit-able Coastal Benches (only on foot, never while in aeroplane/vehicle!)
    if (!this.activeVehicleId && !this.sittingBenchId && this.railwayState.riderMode === 'none') {
      for (const b of BEACH_BENCHES) {
        const dist = Math.hypot(b.x - this.playerX, b.z - this.playerZ);
        consider(
          {
            kind: 'beach_bench',
            id: b.id,
            label: 'Sit on Beach Bench',
            sublabel: `${b.label} · Arabian Sea View`,
            distance: dist,
            x: b.x,
            z: b.z,
          },
          3.4,
        );
      }
    }

    // Collectibles
    for (const c of WORLD_COLLECTIBLES) {
      const mesh = this.collectibleMeshes.get(c.id);
      if (!mesh || !mesh.visible) continue;
      const dist = Math.hypot(c.x - this.playerX, c.z - this.playerZ);
      consider(
        {
          kind: 'collectible',
          id: c.id,
          label: `Collect ${c.name}`,
          sublabel: c.mlName,
          distance: dist,
          x: c.x,
          z: c.z,
        },
        3.8,
      );
    }

    // NPCs & Bosses
    for (const n of this.liveNpcs) {
      const dist = Math.hypot(n.x - this.playerX, n.z - this.playerZ);
      consider(
        {
          kind: 'npc',
          id: n.id,
          label: `Talk to ${n.name}`,
          sublabel: n.role,
          distance: dist,
          x: n.x,
          z: n.z,
        },
        4.6,
      );
    }

    // Buildings (Bank, Shops, Secret Tunnel, and Walk-In Hospital 108 Reception Desk)
    for (const b of BUILDINGS) {
      if (b.id === 'hospital') {
        const deskX = b.x - 4.3;
        const deskZ = b.z - 2.6;
        const deskDist = Math.hypot(deskX - this.playerX, deskZ - this.playerZ);
        if (deskDist <= 3.4) {
          consider(
            {
              kind: 'building',
              id: b.id,
              label: '108 Reception — VIP Checkup',
              sublabel: 'കേരള ജനറൽ ആശുപത്രി',
              distance: deskDist,
              x: deskX,
              z: deskZ,
            },
            3.4,
          );
        }
        continue;
      }
      const frontDist = Math.hypot(b.x - this.playerX, b.z - this.playerZ);
      const triggerRange = Math.max(b.width, b.depth) * 0.65 + 3.2;
      if (frontDist <= triggerRange) {
        consider(
          {
            kind: 'building',
            id: b.id,
            label: b.category === 'bank' ? `Enter ${b.name}` : `Visit ${b.name}`,
            sublabel: b.mlSign,
            distance: frontDist * 0.85,
            x: b.x,
            z: b.z,
          },
          triggerRange,
        );
      }
    }

    // Empty Plots
    for (const p of EMPTY_PLOTS) {
      const dist = Math.hypot(p.x - this.playerX, p.z - this.playerZ);
      consider(
        {
          kind: 'plot',
          id: p.id,
          label: `Inspect ${p.name}`,
          sublabel: 'Build / Manage Sheru Shop',
          distance: dist,
          x: p.x,
          z: p.z,
        },
        6.5,
      );
    }

    // Freestanding 300×250 Town Ads Boards
    for (const board of AD_BOARDS) {
      const dist = Math.hypot(board.x - this.playerX, board.z - this.playerZ);
      consider(
        {
          kind: 'ad_board',
          id: board.id,
          label: `View ${board.name}`,
          sublabel: `${board.mlName} · 300×250 Ads Board`,
          distance: dist,
          x: board.x,
          z: board.z,
        },
        6.5,
      );
    }

    // Vehicles & Flyable Aeroplanes (measured to exact solid hull so wide wings & fuselages stay accessible!)
    for (const v of this.liveVehicles) {
      if (!v.mesh.visible) continue;
      const dist = distanceToVehicleHull(this.playerX, this.playerZ, v.type, v.x, v.z, v.yaw);
      consider(
        {
          kind: 'vehicle',
          id: v.id,
          label: v.isAircraft ? `Fly ${v.name}` : `Drive ${v.name}`,
          sublabel: v.isAircraft
            ? 'W Throttle · A/D Turn · Space Climb · Shift Land'
            : 'Easy WASD Steer · Space Brake · E Exit · H Horn',
          distance: dist,
          x: v.x,
          z: v.z,
        },
        v.isAircraft ? 3.2 : 2.5,
      );
    }

    return best;
  }

  /**
   * Populate pre-allocated solid OBB & Circle scratch buffers around (cx, cz)
   * for zero-GC common solid-body collision against aeroplanes, vehicles,
   * live AI traffic, 4-car Kerala trains, beach benches, and NPCs.
   */
  private collectSolidBodiesAround(
    cx: number,
    cz: number,
    maxRange: number,
    includeVehicles: boolean = true,
    excludeVehicleId?: string,
  ): void {
    const obbs = this.solidObbsScratch;
    const circles = this.solidCirclesScratch;
    obbs.length = 0;
    circles.length = 0;
    const maxRangeSq = maxRange * maxRange;

    if (includeVehicles) {
      for (let i = 0; i < this.liveVehicles.length; i++) {
        const v = this.liveVehicles[i];
        if (!v.mesh.visible || v.id === excludeVehicleId) continue;
        const dx = v.x - cx;
        const dz = v.z - cz;
        if (dx * dx + dz * dz > maxRangeSq) continue;
        pushVehicleSolidOBBs(obbs, v.type, v.x, v.y, v.z, v.yaw);
      }

      for (let i = 0; i < this.aiTraffic.length; i++) {
        const ai = this.aiTraffic[i];
        if (!ai.active) continue;
        const dx = ai.x - cx;
        const dz = ai.z - cz;
        if (dx * dx + dz * dz > maxRangeSq) continue;
        pushVehicleSolidOBBs(obbs, ai.type, ai.x, 0, ai.z, ai.yaw);
      }
    }

    // 4-car Kerala Express trains along both tracks
    const trainRangeSq = (maxRange + 46) * (maxRange + 46);
    const carSpacing = 11.1;
    for (let t = 0; t < this.railwayState.trains.length; t++) {
      const tr = this.railwayState.trains[t];
      const tdx = tr.x - cx;
      const tdz = tr.z - cz;
      if (tdx * tdx + tdz * tdz > trainRangeSq) continue;
      for (let carIdx = 0; carIdx < 4; carIdx++) {
        const pt = sampleTrackPoint(tr.track, tr.distance - carIdx * carSpacing);
        const cdx = pt.x - cx;
        const cdz = pt.z - cz;
        if (cdx * cdx + cdz * cdz > maxRangeSq) continue;
        obbs.push({
          cx: pt.x,
          cz: pt.z,
          halfW: 1.48,
          halfL: 5.15,
          yaw: pt.yaw,
          minY: 0,
          maxY: 3.6,
        });
      }
    }

    // Malabar Beach sit-able benches (skip the bench Sheru is sitting on)
    for (let i = 0; i < BEACH_BENCHES.length; i++) {
      const b = BEACH_BENCHES[i];
      if (b.id === this.sittingBenchId) continue;
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (dx * dx + dz * dz > maxRangeSq) continue;
      obbs.push({
        cx: b.x,
        cz: b.z,
        halfW: 1.25,
        halfL: 0.52,
        yaw: b.facingYaw,
        minY: 0,
        maxY: 1.05,
      });
    }

    // Solid NPC & Town Crowd bodies (characters cannot walk straight through people)
    for (let i = 0; i < this.liveNpcs.length; i++) {
      const n = this.liveNpcs[i];
      const dx = n.x - cx;
      const dz = n.z - cz;
      if (dx * dx + dz * dz > maxRangeSq) continue;
      circles.push({ cx: n.x, cz: n.z, radius: 0.44, minY: 0, maxY: 1.9 });
    }
    for (let i = 0; i < this.townCrowd.length; i++) {
      const w = this.townCrowd[i];
      const dx = w.x - cx;
      const dz = w.z - cz;
      if (dx * dx + dz * dz > maxRangeSq) continue;
      circles.push({ cx: w.x, cz: w.z, radius: 0.4, minY: 0, maxY: 1.85 });
    }
  }

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleBlur);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
  }

  private handleResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const nextIsMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || w < 820;
    if (this.lodState && nextIsMobile !== this.lodState.isMobile) {
      this.applyGraphicsQuality(this.settings.graphicsQuality);
    }
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.cssRenderer.setSize(w, h);
    this.renderer.render(this.scene, this.camera);
    this.cssRenderer.render(this.cssScene, this.camera);
  };

  private handleBlur = () => {
    this.keysHeld.clear();
    this.isDraggingCamera = false;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.mode !== 'playing' || this.modalOpen) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    const code = e.code;
    if (!this.keysHeld.has(code)) {
      if (code === 'Space') {
        e.preventDefault();
        if (this.activeVehicleId) {
          soundEngine.playBrakeScreech();
        } else {
          this.triggerJump();
        }
      } else if (code === 'KeyE') {
        e.preventDefault();
        this.triggerInteract();
      } else if (code === 'KeyC' && this.railwayState.riderMode !== 'none') {
        e.preventDefault();
        this.cycleTrainCameraView();
      } else if (code === 'KeyH' && this.railwayState.riderMode !== 'none') {
        this.soundTrainHorn();
      } else if (code === 'KeyH' && this.activeVehicleId) {
        const veh = this.liveVehicles.find((v) => v.id === this.activeVehicleId);
        if (
          veh &&
          (veh.type === 'bus' ||
            veh.type === 'private_bus' ||
            veh.type === 'ksrtc_bus' ||
            veh.type === 'school_bus' ||
            veh.type === 'tourist_bus')
        ) {
          soundEngine.playBusHorn();
        } else {
          soundEngine.playHorn();
        }
      } else if (code === 'KeyX' && this.activeVehicleId) {
        this.toggleActiveSiren();
      }
    }
    this.keysHeld.add(code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.code);
    if (e.code === 'Space' && this.playerVy > 2.5) {
      this.playerVy *= 0.48; // variable jump cut
    }
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (this.mode !== 'playing' || this.modalOpen) return;
    this.isDraggingCamera = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.isDraggingCamera || this.mode !== 'playing' || this.modalOpen) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    const sens = 0.0055 * this.settings.mouseSensitivity;
    this.camYaw -= dx * sens;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * sens * 0.7, 0.08, 0.78);
  };

  private handlePointerUp = () => {
    this.isDraggingCamera = false;
  };

  private updateLighting(dt: number) {
    const canAdvanceCycle = this.mode === 'playing' && !this.modalOpen && !this.dayCyclePaused;
    if (canAdvanceCycle) {
      this.timeOfDay = (this.timeOfDay + dt * 0.0022) % 1;
    }
    const weatherStep = stepWeatherCycle(this.weatherState, dt, canAdvanceCycle);
    this.weatherState = weatherStep.state;
    if (weatherStep.changed) {
      // Immediately flush HUD snapshot on dynamic weather transitions so WeatherHUD animates right on cue!
      this.hudThrottle = 1;
    }

    const phase = getTimeOfDayPhase(this.timeOfDay);
    const weatherCfg = getWeatherVisualConfig(this.weatherState.condition, phase);
    const angle = this.timeOfDay * Math.PI * 2;
    const sunOffX = Math.cos(angle) * 58;
    const sunOffY = Math.max(14, Math.sin(angle) * 68);
    const sunOffZ = 32;

    // Texel-snapped player-following sun shadow frustum (2m steps eliminate shadow swimming while keeping ±42m crisp!)
    const snapX = Math.round(this.playerX / 2) * 2;
    const snapZ = Math.round(this.playerZ / 2) * 2;
    this.sunLight.target.position.set(snapX, 0, snapZ);
    this.sunLight.position.set(snapX + sunOffX, sunOffY, snapZ + sunOffZ);
    this.rimLight.position.set(snapX - sunOffX * 0.7, 30, snapZ - sunOffZ * 0.8);

    let baseSunIntensity = 1.78;
    let baseHemiIntensity = 0.80;
    let baseRimIntensity = 0.38;
    let targetSunGlow = 1.0;
    if (phase === 'day') {
      _skyWork.copy(_skyDay);
      _skyTopWork.copy(_skyTopDay);
      this.sunLight.color.setHex(0xfff3de);
      this.rimLight.color.setHex(0x9bc2e4);
      baseSunIntensity = 1.78;
      baseHemiIntensity = 0.80;
      baseRimIntensity = 0.38;
      targetSunGlow = 1.0;
    } else if (phase === 'sunset') {
      _skyWork.copy(_skySunset);
      _skyTopWork.copy(_skyTopSunset);
      this.sunLight.color.setHex(0xf29b5e);
      this.rimLight.color.setHex(0x889ed6);
      baseSunIntensity = 1.38;
      baseHemiIntensity = 0.62;
      baseRimIntensity = 0.34;
      targetSunGlow = 1.18;
    } else {
      _skyWork.copy(_skyNight);
      _skyTopWork.copy(_skyTopNight);
      this.sunLight.color.setHex(0x7aa0e8);
      this.rimLight.color.setHex(0x3a5588);
      baseSunIntensity = 0.52;
      baseHemiIntensity = 0.38;
      baseRimIntensity = 0.22;
      targetSunGlow = 0.16;
    }

    // Apply dynamic weather atmospheric tint, sun dimming, monsoon thunder, and darker fog
    if (weatherCfg.skyBlend > 0) {
      _weatherSky.setHex(weatherCfg.skyHex);
      _skyWork.lerp(_weatherSky, weatherCfg.skyBlend * this.weatherState.intensity);
      _skyTopWork.lerp(_weatherSky, weatherCfg.skyBlend * 0.84 * this.weatherState.intensity);
      targetSunGlow *= Math.max(0.06, 1 - weatherCfg.skyBlend * 0.9);
    }

    // Subtle periodic distant Monsoon lightning flash & rumble
    if (weatherCfg.condition === 'monsoon' && !this.inHospital && this.mode === 'playing') {
      this.monsoonThunderTimer -= dt;
      if (this.monsoonThunderTimer <= 0) {
        this.monsoonThunderTimer = 9 + Math.random() * 11;
        this.lightningFlash = 0.85;
        soundEngine.playThunderSoft();
      }
    }
    if (this.lightningFlash > 0.005) {
      this.lightningFlash *= Math.exp(-9.5 * dt);
    } else {
      this.lightningFlash = 0;
    }

    const lightLerp = 1 - Math.exp(-5.2 * dt);
    const targetSun = baseSunIntensity * weatherCfg.sunIntensityMult + this.lightningFlash * 0.85;
    const targetHemi = baseHemiIntensity * weatherCfg.hemiIntensityMult + this.lightningFlash * 0.45;
    this.sunLight.intensity += (targetSun - this.sunLight.intensity) * lightLerp;
    this.hemiLight.intensity += (targetHemi - this.hemiLight.intensity) * lightLerp;
    this.rimLight.intensity += (baseRimIntensity * weatherCfg.hemiIntensityMult - this.rimLight.intensity) * lightLerp;

    (this.scene.background as THREE.Color).lerp(_skyWork, lightLerp);
    if (this.scene.fog instanceof THREE.Fog) {
      _weatherFog.copy(this.scene.background as THREE.Color);
      if (weatherCfg.condition === 'monsoon') {
        _weatherSky.setHex(weatherCfg.fogColorHex);
        _weatherFog.lerp(_weatherSky, 0.92 * this.weatherState.intensity);
      }
      this.scene.fog.color.lerp(_weatherFog, lightLerp);
      const activeVeh = this.activeVehicleId
        ? this.liveVehicles.find((v) => v.id === this.activeVehicleId)
        : null;
      const isScenicVista =
        Boolean(activeVeh?.isAircraft) ||
        this.railwayState.riderMode !== 'none' ||
        this.sittingBenchId !== null ||
        isPointOnBeachZone(this.playerX, this.playerZ);
      const lodFogFarCap = this.lodState ? this.lodState.distances.fogFarCap : weatherCfg.fogFar;
      const { fogNear: targetFogNear, fogFar: targetFogFar } = getEffectiveFogRange(
        weatherCfg,
        lodFogFarCap,
        isScenicVista,
      );
      this.scene.fog.near += (targetFogNear - this.scene.fog.near) * lightLerp;
      this.scene.fog.far += (targetFogFar - this.scene.fog.far) * lightLerp;
    }

    // Wet asphalt sheen modulation (dry matte roads -> glossy wet streets during Rain & Monsoon)
    if (this.wetRoadMaterials.length > 0) {
      const targetRoughness =
        0.85 + (weatherCfg.roadRoughness - 0.85) * this.weatherState.intensity;
      _roadTintTarget.setHex(weatherCfg.roadTintHex);
      for (let i = 0; i < this.wetRoadMaterials.length; i++) {
        const rm = this.wetRoadMaterials[i];
        rm.roughness += (targetRoughness - rm.roughness) * lightLerp;
        if (i < 2) {
          // Textured NS/EW asphalt roads keep white base when dry and deepen subtly when drenched
          rm.color.lerp(_roadTintTarget, lightLerp);
        }
      }
    }

    // Update sky dome shader uniforms (position & radius are locked to camera in updateCamera so it NEVER clips!)
    this.skyDome.uniforms.uHorizonColor.value.copy(this.scene.background as THREE.Color);
    this.skyDome.uniforms.uTopColor.value.lerp(_skyTopWork, lightLerp);
    this.skyDome.uniforms.uBottomColor.value
      .copy(this.scene.background as THREE.Color)
      .multiplyScalar(weatherCfg.condition === 'monsoon' ? 0.54 : 0.72);
    _sunDirWork.set(sunOffX, sunOffY, sunOffZ).normalize();
    this.skyDome.uniforms.uSunDir.value.copy(_sunDirWork);
    this.skyDome.uniforms.uSunColor.value.copy(this.sunLight.color);
    this.skyDome.uniforms.uSunGlow.value +=
      (targetSunGlow - this.skyDome.uniforms.uSunGlow.value) * lightLerp;

    // Animate shimmering Arabian Sea waves & bobbing fishing boats!
    if (this.seaRig) {
      const stormChop = 1 + weatherCfg.stormDarkness * 0.65;
      this.seaRig.seaUniforms.uTime.value = this.elapsed * stormChop;
      this.seaRig.seaUniforms.uSunColor.value.copy(this.sunLight.color);
      this.seaRig.seaUniforms.uSkyHorizon.value.copy(this.scene.background as THREE.Color);
      const baseSeaDark = phase === 'night' ? 0.9 : phase === 'sunset' ? 0.35 : 0;
      this.seaRig.seaUniforms.uNightFactor.value = Math.min(
        0.95,
        Math.max(baseSeaDark, weatherCfg.stormDarkness * 0.42 * this.weatherState.intensity),
      );
      for (const b of this.seaRig.boats) {
        b.mesh.position.y = Math.sin(this.elapsed * 1.9 * stormChop + b.phase) * (0.18 * stormChop);
        b.mesh.rotation.z = Math.sin(this.elapsed * 1.5 * stormChop + b.phase) * (0.08 * stormChop);
        b.mesh.rotation.x = Math.cos(this.elapsed * 1.3 * stormChop + b.phase) * (0.05 * stormChop);
      }
      for (const g of this.seaRig.seagulls) {
        const ang = this.elapsed * g.speed + g.phase;
        const gx = g.cx + Math.cos(ang) * g.radius;
        const gz = g.cz + Math.sin(ang) * g.radius;
        const gy = g.height + Math.sin(this.elapsed * 1.4 + g.phase) * 1.1;
        g.mesh.position.set(gx, gy, gz);
        g.mesh.rotation.y = -ang;
        const flap = Math.sin(this.elapsed * 6.5 + g.phase * 2) * 0.42;
        g.leftWing.rotation.z = flap;
        g.rightWing.rotation.z = -flap;
      }
    }

    // Update 3D falling Rain & Heavy Slanted Monsoon Downpour streaks around the player
    if (this.rainLines && this.rainMat && this.rainOffsets) {
      const showRain = weatherCfg.rainDensity > 0.01 && !this.inHospital;
      this.rainLines.visible = showRain;
      if (showRain) {
        const activeDrops = Math.max(
          80,
          Math.min(this.rainMaxDrops, Math.round(this.rainMaxDrops * weatherCfg.rainDensity)),
        );
        this.rainLines.geometry.setDrawRange(0, activeDrops * 2);
        this.rainMat.color.setHex(weatherCfg.rainColorHex);
        this.rainMat.opacity = weatherCfg.rainOpacity * this.weatherState.intensity;
        this.rainLines.position.set(this.playerX, Math.max(0, this.playerY - 2), this.playerZ);
        const posAttr = this.rainLines.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const fallSpeed = weatherCfg.rainFallSpeed * dt;
        const windDrift = weatherCfg.rainWindDrift * dt;
        const streakLen = weatherCfg.rainStreakLen;
        const streakTiltX = (weatherCfg.rainWindDrift / Math.max(1, weatherCfg.rainFallSpeed)) * streakLen;
        for (let i = 0; i < activeDrops; i++) {
          let rx = this.rainOffsets[i * 3] - windDrift;
          let ry = this.rainOffsets[i * 3 + 1] - fallSpeed;
          const rz = this.rainOffsets[i * 3 + 2];
          if (ry < 0) {
            ry += 20;
            rx = ((rx + 17) % 34 + 34) % 34 - 17;
          }
          if (rx < -17) rx += 34;
          this.rainOffsets[i * 3] = rx;
          this.rainOffsets[i * 3 + 1] = ry;
          arr[i * 6] = rx;
          arr[i * 6 + 1] = ry;
          arr[i * 6 + 2] = rz;
          arr[i * 6 + 3] = rx - streakTiltX;
          arr[i * 6 + 4] = ry - streakLen;
          arr[i * 6 + 5] = rz;
        }
        posAttr.needsUpdate = true;
      }
    }

    // Update Instanced Reflective Kerala Street Puddles & Raindrop Splash Ripples
    if (this.puddleMesh && this.puddleMat && this.puddleVisualLevels) {
      const showPuddles = !this.inHospital;
      let anyVisiblePuddle = false;
      let matrixDirty = false;
      const puddleLerp = 1 - Math.exp(-4.2 * dt);

      if (showPuddles) {
        _puddleTint.copy(this.scene.background as THREE.Color).lerp(_skyTopWork, 0.35);
        this.puddleMat.color.lerp(_puddleTint, lightLerp);
        this.puddleMat.opacity =
          weatherCfg.condition === 'monsoon'
            ? 0.82
            : weatherCfg.condition === 'rain'
              ? 0.72
              : 0.5;
      }

      for (let i = 0; i < this.puddleSpecs.length; i++) {
        const spec = this.puddleSpecs[i];
        const targetVis = showPuddles
          ? getPuddleVisibility(spec, this.weatherState.condition, this.weatherState.intensity)
          : 0;
        const prevVis = this.puddleVisualLevels[i];
        const nextVis = prevVis + (targetVis - prevVis) * puddleLerp;
        const clampedVis = nextVis < 0.015 && targetVis === 0 ? 0 : nextVis;
        if (Math.abs(clampedVis - prevVis) > 0.002) {
          this.puddleVisualLevels[i] = clampedVis;
          matrixDirty = true;
          if (clampedVis <= 0.015) {
            _scale.set(0, 0, 0);
            _v1.set(spec.x, -2, spec.z);
            _quat.identity();
          } else {
            // Monsoon puddles swell slightly larger (~1.16x) as streets flood with rainwater
            const sizeBoost = weatherCfg.condition === 'monsoon' ? 1.16 : 1.0;
            const grow = (0.45 + 0.55 * clampedVis) * sizeBoost;
            _v1.set(spec.x, 0.062, spec.z);
            _euler.set(0, spec.rotation, 0);
            _quat.setFromEuler(_euler);
            _scale.set(spec.radiusX * grow, 1, spec.radiusZ * grow);
          }
          _mat4.compose(_v1, _quat, _scale);
          this.puddleMesh.setMatrixAt(i, _mat4);
        }
        if (clampedVis > 0.02) anyVisiblePuddle = true;
      }
      if (matrixDirty) {
        this.puddleMesh.instanceMatrix.needsUpdate = true;
      }
      this.puddleMesh.visible = anyVisiblePuddle && showPuddles;

      // Animate expanding raindrop ripple rings across nearby active puddles during Rain & Monsoon!
      if (this.puddleRippleMesh && this.puddleRippleMat) {
        const showRipples =
          showPuddles && anyVisiblePuddle && weatherCfg.rainDensity > 0.05;
        this.puddleRippleMesh.visible = showRipples;
        if (showRipples) {
          const rippleCount = this.puddleRippleMesh.count;
          const speed = weatherCfg.condition === 'monsoon' ? 2.8 : 1.75;
          this.puddleRippleMat.opacity =
            (weatherCfg.condition === 'monsoon' ? 0.54 : 0.34) * this.weatherState.intensity;
          _quat.identity();
          let assigned = 0;
          for (let i = 0; i < this.puddleSpecs.length && assigned < rippleCount; i++) {
            if (this.puddleVisualLevels[i] < 0.2) continue;
            const spec = this.puddleSpecs[i];
            if (
              Math.abs(spec.x - this.playerX) > 62 ||
              Math.abs(spec.z - this.playerZ) > 62
            ) {
              continue;
            }
            const ringsPerPuddle = weatherCfg.condition === 'monsoon' ? 2 : 1;
            for (let r = 0; r < ringsPerPuddle && assigned < rippleCount; r++) {
              const cycle = (this.elapsed * speed + spec.phase + r * 0.53) % 1;
              const offAngle = spec.phase * 3.1 + r * 2.4 + Math.floor(this.elapsed * speed + r) * 1.7;
              const offDist = 0.42 * (0.3 + 0.7 * Math.abs(Math.sin(offAngle)));
              const rx = spec.x + Math.cos(offAngle) * spec.radiusX * offDist;
              const rz = spec.z + Math.sin(offAngle) * spec.radiusZ * offDist;
              const ringScale = 0.35 + cycle * (weatherCfg.condition === 'monsoon' ? 2.4 : 1.7);
              _v1.set(rx, 0.068, rz);
              _scale.set(ringScale, 1, ringScale);
              _mat4.compose(_v1, _quat, _scale);
              this.puddleRippleMesh.setMatrixAt(assigned, _mat4);
              assigned++;
            }
          }
          _scale.set(0, 0, 0);
          _v1.set(0, -10, 0);
          for (let k = assigned; k < rippleCount; k++) {
            _mat4.compose(_v1, _quat, _scale);
            this.puddleRippleMesh.setMatrixAt(k, _mat4);
          }
          this.puddleRippleMesh.instanceMatrix.needsUpdate = true;
        }
      }
    }

    const monsoonLampBoost = weatherCfg.condition === 'monsoon' && phase === 'day';
    if (phase !== this.lastLightingPhase || monsoonLampBoost !== this.lastMonsoonLampBoost) {
      this.lastLightingPhase = phase;
      this.lastMonsoonLampBoost = monsoonLampBoost;
      const nightGlow =
        phase === 'night' ? 1.8 : phase === 'sunset' ? 0.75 : monsoonLampBoost ? 0.95 : 0.12;
      const pointIntensity =
        phase === 'night' ? 18 : phase === 'sunset' ? 6 : monsoonLampBoost ? 5.5 : 0;
      for (const m of this.lampBulbMats) m.emissiveIntensity = nightGlow;
      for (const m of this.windowMats) {
        m.emissiveIntensity = phase === 'night' ? 0.95 : monsoonLampBoost ? 0.45 : 0.14;
      }
      for (const pl of this.nightLights) pl.intensity = pointIntensity;
    }
  }

  private updatePlayerAndVehicles(dt: number) {
    if (this.mode !== 'playing' || this.modalOpen) {
      // Idle confident breathing pose on Title Screen
      this.sheru.root.position.set(this.playerX, this.playerY, this.playerZ);
      this.sheru.root.rotation.y = this.playerYaw;
      this.sheru.bodyGroup.position.y = Math.sin(this.elapsed * 2.4) * 0.03;
      this.sheru.tail.rotation.y = Math.sin(this.elapsed * 3.1) * 0.25;
      return;
    }

    let forward = 0;
    let strafe = 0;
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) forward += 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) forward -= 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) strafe -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) strafe += 1;

    forward += -this.touchMoveY;
    strafe += this.touchMoveX;
    const running =
      this.keysHeld.has('ShiftLeft') || this.keysHeld.has('ShiftRight') || this.touchRunning;

    // DRIVING & FLYING MODE (Easy Arcade Car Driving + Easy Runway Takeoff & Sky Flight!)
    if (this.activeVehicleId) {
      const veh = this.liveVehicles.find((v) => v.id === this.activeVehicleId);
      if (veh) {
        if (veh.isAircraft) {
          // =====================================================================
          // EASY ARCADE AEROPLANE FLIGHT (Runway Takeoff, Mobile UP=Fly / DOWN=Land Cursor, Off-Runway Blast!)
          // =====================================================================
          const mobileCursor = mapMobileFlightCursor(
            this.touchMoveX,
            this.touchMoveY,
            veh.y > 0.35,
          );
          const usingMobileStick =
            Math.abs(this.touchMoveY) > 0.22 || Math.abs(this.touchMoveX) > 0.15;
          const climbKey =
            this.keysHeld.has('Space') ||
            this.touchFlightVertical === 1 ||
            (usingMobileStick && mobileCursor.climb);
          const descendKey =
            running ||
            this.keysHeld.has('KeyC') ||
            this.keysHeld.has('KeyQ') ||
            this.touchFlightVertical === -1 ||
            (usingMobileStick && mobileCursor.descend);
          const throttleInput = usingMobileStick ? mobileCursor.throttle : forward;
          const turnInput = usingMobileStick ? mobileCursor.turn : strafe;

          if (
            veh.autoLanding &&
            (Math.abs(throttleInput) > 0.15 ||
              Math.abs(turnInput) > 0.15 ||
              climbKey ||
              descendKey)
          ) {
            veh.autoLanding = false;
          }

          const wasAutoLand = veh.autoLanding;
          const planeRes = stepAirplanePhysics(
            {
              x: veh.x,
              y: veh.y,
              z: veh.z,
              yaw: veh.yaw,
              pitch: veh.pitch,
              roll: veh.roll,
              speed: veh.speed,
              maxSpeed: veh.maxSpeed,
              steerInput: veh.steerInput,
            },
            {
              throttle: throttleInput,
              turn: turnInput,
              climb: climbKey,
              descend: descendKey,
              autoLand: veh.autoLanding,
            },
            dt,
            WORLD_RADIUS + 80,
          );

          // Track highest flight altitude so we know this was a real airborne flight
          if (planeRes.y > veh.peakAltitude) {
            veh.peakAltitude = planeRes.y;
          }

          // Ground-only soft building collision & no-aeroplanes-on-beach rule!
          let finalX = planeRes.x;
          let finalZ = planeRes.z;
          let finalSpeed = planeRes.speed;
          let hitBuildingLow = false;
          if (planeRes.y < 3.5) {
            // Keep aeroplanes off Malabar Beach sand/promenade (beach is walk + ground vehicles only!)
            if (!canVehicleAccessBeach(veh.type) && isPointOnBeachZone(finalX, finalZ)) {
              finalZ = Math.min(finalZ, 144);
              finalSpeed *= 0.4;
            }
            const gRes = resolveCircleWorldCollision(
              finalX,
              finalZ,
              2.8,
              this.colliders,
              WORLD_RADIUS + 20,
            );
            if (gRes.collided) {
              hitBuildingLow = !wasAutoLand && Math.abs(finalSpeed) > 3.5;
              finalX = gRes.x;
              finalZ = gRes.z;
              finalSpeed *= 0.65;
            }
          }

          // REAL AEROPLANE CRASH PHYSICS (checked EVERY frame!):
          // 1) Flying directly into ANY Western Ghats Mountain ridge -> BHOOOOM!
          // 2) Landing OR normally driving/taxiing outside Kerala Airport tarmac -> BHOOOOM!
          // 3) Low-altitude impact into a building -> BHOOOOM!
          const hazard = evaluateAirplaneHazard(
            finalX,
            planeRes.y,
            finalZ,
            finalSpeed,
            wasAutoLand,
            planeRes.touchedDown,
            hitBuildingLow,
          );
          if (hazard === 'mountain_blast') {
            this.triggerAirplaneCrashBlast(veh, finalX, finalZ, 'mountain');
            return;
          }
          if (hazard === 'off_airport_blast') {
            this.triggerAirplaneCrashBlast(veh, finalX, finalZ, 'off_airport');
            return;
          }
          if (hazard === 'building_blast') {
            this.triggerAirplaneCrashBlast(veh, finalX, finalZ, 'building');
            return;
          }

          if (planeRes.touchedDown) {
            veh.autoLanding = false;
            veh.peakAltitude = 0;
            this.spawnParticleBurst(finalX, 0.4, finalZ, 12, 0xe2e8f0);
            this.callbacks.onSafeLanding?.(veh.name);
          }

          veh.x = finalX;
          veh.y = planeRes.y;
          veh.z = finalZ;
          veh.yaw = planeRes.yaw;
          veh.pitch = planeRes.pitch;
          veh.roll = planeRes.roll;
          veh.speed = finalSpeed;
          veh.steerInput = planeRes.steerInput;
          veh.flightState = planeRes.flightState;

          veh.mesh.position.set(veh.x, veh.y, veh.z);
          veh.mesh.rotation.y = veh.yaw;
          if (veh.rig.bodyPivot) {
            veh.rig.bodyPivot.rotation.set(-veh.pitch, 0, veh.roll);
          }

          // Spin propellers / jet turbine fans & ground wheels
          const propSpeed = 8 + Math.abs(veh.speed) * 1.4;
          if (veh.rig.propellers) {
            for (const prop of veh.rig.propellers) {
              prop.rotation.z += propSpeed * dt;
            }
          }
          if (veh.y < 0.35) {
            for (const w of veh.rig.wheels) {
              w.rotation.x += veh.speed * dt * 2.2;
            }
          }

          this.playerX = veh.x;
          this.playerY = veh.y;
          this.playerZ = veh.z;
          this.playerYaw = veh.yaw;

          // Smooth cinematic chase camera tracking behind the airplane
          const diff = Math.atan2(
            Math.sin(veh.yaw - this.camYaw),
            Math.cos(veh.yaw - this.camYaw),
          );
          this.camYaw += diff * (1 - Math.exp(-5.5 * dt));
          return;
        }

        // =====================================================================
        // REAL 3D OPEN-WORLD GROUND DRIVING PHYSICS
        // (Spring-Damper Suspension, Weight Transfer, Drift Slip, Ramp Jumps & Impulse Collisions!)
        // =====================================================================
        this.driftSmokeCooldown = Math.max(0, this.driftSmokeCooldown - dt);
        this.vehicleBumpCooldown = Math.max(0, this.vehicleBumpCooldown - dt);
        const handbrake = this.keysHeld.has('Space');
        // Cancel autopilot if user manually presses W/S/A/D
        if (this.autopilotDest && (Math.abs(forward) > 0.1 || Math.abs(strafe) > 0.1)) {
          this.autopilotDest = null;
        }

        let nextX = veh.x;
        let nextZ = veh.z;

        if (this.autopilotDest) {
          // Road-aware Auto-Destination Driving up to maxSpeed (180 km/h on Supercar/Ambulance) with automatic horn/siren!
          const destX = this.autopilotDest.x;
          const destZ = this.autopilotDest.z;
          const dist = Math.hypot(destX - veh.x, destZ - veh.z);

          if (dist < 7.0) {
            veh.speed *= Math.exp(-8 * dt);
            if (Math.abs(veh.speed) < 1.2) {
              const arrivedHospital =
                this.emergencyDispatch.active &&
                this.emergencyDispatch.phase === 'to_hospital' &&
                this.autopilotDest.id === 'dest_hospital';
              this.autopilotDest = null;
              if (arrivedHospital) {
                this.completeHospitalDropoff();
                return;
              }
            }
          } else {
            // Road-lane + Sheru Statue Roundabout-safe Autopilot Steering (NEVER hits Golden Statue!)
            const apTarget = computeRoadAutopilotTarget(veh.x, veh.z, destX, destZ);
            const dx = apTarget.targetX - veh.x;
            const dz = apTarget.targetZ - veh.z;
            const desiredYaw = Math.atan2(dx, dz);
            const yawErr = Math.atan2(Math.sin(desiredYaw - veh.yaw), Math.cos(desiredYaw - veh.yaw));
            veh.steerAngle = THREE.MathUtils.clamp(yawErr, -0.58, 0.58);
            veh.yaw += THREE.MathUtils.clamp(yawErr, -3.8 * dt, 3.8 * dt);

            let vehicleAhead = false;
            const fwdX = Math.sin(veh.yaw);
            const fwdZ = Math.cos(veh.yaw);
            for (const ai of this.aiTraffic) {
              if (!ai.active) continue;
              const rx = ai.x - veh.x;
              const rz = ai.z - veh.z;
              const d = Math.hypot(rx, rz);
              const dot = (rx * fwdX + rz * fwdZ) / (d || 1);
              if (d < 15 && dot > 0.65) {
                vehicleAhead = true;
                break;
              }
            }
            if (vehicleAhead && this.autopilotHornCooldown <= 0) {
              this.autopilotHornCooldown = 1.8;
              if (veh.hasSiren && !veh.sirenOn) {
                veh.sirenOn = true;
                soundEngine.startSiren(
                  veh.type === 'police_jeep'
                    ? 'police'
                    : veh.type === 'fire_engine'
                      ? 'fire'
                      : 'ambulance',
                );
              } else {
                soundEngine.playHorn();
              }
            }

            const turnFactor = Math.abs(yawErr) > 0.45 ? 0.55 : 1.0;
            const targetCruise =
              Math.min(veh.maxSpeed, dist > 18 ? veh.maxSpeed : Math.max(12, dist * 1.4)) *
              turnFactor;
            veh.speed += (targetCruise - veh.speed) * Math.min(1, dt * 3.2);
          }

          nextX = veh.x + Math.sin(veh.yaw) * veh.speed * dt;
          nextZ = veh.z + Math.cos(veh.yaw) * veh.speed * dt;
          veh.y = sampleWorldSurface(nextX, nextZ).groundY;
          veh.vy = 0;
          veh.pitch *= Math.exp(-8 * dt);
          veh.roll *= Math.exp(-8 * dt);
          veh.suspY *= Math.exp(-8 * dt);
          veh.lateralSpeed *= Math.exp(-8 * dt);
        } else {
          // Real 3D Chassis, Suspension, Drift & Ramp Jump Physics!
          const chassis = stepVehicleChassisPhysics(
            {
              x: veh.x,
              y: veh.y,
              z: veh.z,
              vy: veh.vy,
              yaw: veh.yaw,
              speed: veh.speed,
              lateralSpeed: veh.lateralSpeed,
              steerAngle: veh.steerAngle,
              steerInput: veh.steerInput,
              maxSpeed: veh.maxSpeed,
              pitch: veh.pitch,
              roll: veh.roll,
              pitchVel: veh.pitchVel,
              rollVel: veh.rollVel,
              suspY: veh.suspY,
              suspVy: veh.suspVy,
              grounded: veh.grounded,
            },
            {
              forward,
              strafe,
              boost: running,
              handbrake,
            },
            dt,
          );
          nextX = chassis.x;
          nextZ = chassis.z;
          veh.y = chassis.y;
          veh.vy = chassis.vy;
          veh.yaw = chassis.yaw;
          veh.speed = chassis.speed;
          veh.lateralSpeed = chassis.lateralSpeed;
          veh.steerAngle = chassis.steerAngle;
          veh.steerInput = chassis.steerInput;
          veh.pitch = chassis.pitch;
          veh.roll = chassis.roll;
          veh.pitchVel = chassis.pitchVel;
          veh.rollVel = chassis.rollVel;
          veh.suspY = chassis.suspY;
          veh.suspVy = chassis.suspVy;
          veh.grounded = chassis.grounded;

          if (chassis.launchedOffRamp) {
            soundEngine.playJump();
            this.spawnParticleBurst(nextX, veh.y + 0.2, nextZ, 10, 0xfde047);
          }
          if (chassis.landedHard) {
            soundEngine.playLand();
            this.camShakeTrauma = Math.min(0.6, this.camShakeTrauma + Math.min(0.35, chassis.landImpactSpeed * 0.025));
            this.spawnParticleBurst(nextX, veh.y + 0.15, nextZ, 12, 0xe2e8f0);
          }
          if (chassis.drifting && this.driftSmokeCooldown <= 0) {
            this.driftSmokeCooldown = 0.09;
            const rearX = nextX - Math.sin(veh.yaw) * 1.4;
            const rearZ = nextZ - Math.cos(veh.yaw) * 1.4;
            this.spawnParticleBurst(rearX, veh.y + 0.12, rearZ, 3, 0xdbeafe);
          }
        }

        const res = resolveCircleWorldCollision(nextX, nextZ, 1.45, this.colliders);
        const vehPalmHit = checkPalmTreeCollision(res.x, res.z, 1.45, this.livePalms, 0.55);
        if (res.collided || vehPalmHit.hit) {
          if (this.autopilotDest) {
            veh.yaw += 0.55 * dt * 4;
            veh.speed = Math.max(6, veh.speed * 0.55);
          } else {
            // Smooth elastic wall bump with suspension jolt
            veh.speed *= 0.62;
            veh.lateralSpeed *= 0.4;
            veh.pitchVel -= 1.2;
            this.camShakeTrauma = Math.min(0.45, this.camShakeTrauma + 0.14);
          }
          if (vehPalmHit.hit && vehPalmHit.palmIndex >= 0) {
            const bumpedPalm = this.livePalms[vehPalmHit.palmIndex];
            if (!bumpedPalm.shaking || bumpedPalm.shakeTime > 0.45) {
              this.launchCoconutFromPalm(bumpedPalm, vehPalmHit.impactDirX, vehPalmHit.impactDirZ, false);
            }
          }
        }
        // Road-Only Containment for ground vehicles ("no vehicles off paved roads!")
        // Allows airborne stunt ramp jumps (veh.y >= 0.85) while keeping tires strictly off grass/beach sand!
        let constrainedX = vehPalmHit.pushedX;
        let constrainedZ = vehPalmHit.pushedZ;
        if (!veh.isAircraft && veh.y < 0.85) {
          const roadLock = constrainVehicleToDrivableRoads(
            veh.x,
            veh.z,
            constrainedX,
            constrainedZ,
          );
          if (roadLock.hitCurb) {
            constrainedX = roadLock.x;
            constrainedZ = roadLock.z;
            veh.speed *= 0.84;
            veh.lateralSpeed *= 0.45;
          }
        }
        veh.x = constrainedX;
        veh.z = constrainedZ;

        // Real Vehicle-to-Vehicle Elastic Momentum Collision (against other parked & traffic vehicles!)
        if (!this.autopilotDest && veh.y < 1.8) {
          const fwdX = Math.sin(veh.yaw);
          const fwdZ = Math.cos(veh.yaw);
          let curVx = fwdX * veh.speed + Math.cos(veh.yaw) * veh.lateralSpeed;
          let curVz = fwdZ * veh.speed - Math.sin(veh.yaw) * veh.lateralSpeed;

          for (const other of this.liveVehicles) {
            if (other.id === veh.id || other.isAircraft || !other.mesh.visible) continue;
            const pair = resolveVehiclePairCollision(
              veh.x,
              veh.z,
              curVx,
              curVz,
              veh.mass,
              other.x,
              other.z,
              Math.sin(other.yaw) * other.speed,
              Math.cos(other.yaw) * other.speed,
              other.mass,
              3.0,
              0.38,
            );
            if (pair.collided) {
              veh.x = pair.ax;
              veh.z = pair.az;
              curVx = pair.avx;
              curVz = pair.avz;
              veh.speed = curVx * fwdX + curVz * fwdZ;
              veh.lateralSpeed = curVx * Math.cos(veh.yaw) - curVz * Math.sin(veh.yaw);

              // Push struck parked vehicle smoothly clear of walls & give it suspension jolt!
              const otherSafe = resolveCircleWorldCollision(pair.bx, pair.bz, 1.45, this.colliders);
              other.x = otherSafe.x;
              other.z = otherSafe.z;
              other.mesh.position.set(other.x, sampleWorldSurface(other.x, other.z).groundY, other.z);
              if (pair.impactSpeed > 3.0 && this.vehicleBumpCooldown <= 0) {
                this.vehicleBumpCooldown = 0.35;
                veh.suspVy -= Math.min(2.2, pair.impactSpeed * 0.14);
                this.camShakeTrauma = Math.min(0.5, this.camShakeTrauma + Math.min(0.26, pair.impactSpeed * 0.02));
                soundEngine.playLand();
                this.spawnParticleBurst((veh.x + other.x) * 0.5, veh.y + 0.9, (veh.z + other.z) * 0.5, 9, 0xfde047);
              }
            }
          }

          // Solid collision between ground vehicles and parked aeroplanes (fuselage + wings)
          const planeObbs = this.solidObbsScratch;
          planeObbs.length = 0;
          for (const other of this.liveVehicles) {
            if (!other.isAircraft || !other.mesh.visible || other.y > 2.6) continue;
            const pdx = other.x - veh.x;
            const pdz = other.z - veh.z;
            if (pdx * pdx + pdz * pdz > 24 * 24) continue;
            pushVehicleSolidOBBs(planeObbs, other.type, other.x, other.y, other.z, other.yaw);
          }
          if (planeObbs.length > 0) {
            const planeRes = resolveCharacterSolidBodies(
              veh.x,
              veh.y,
              veh.z,
              curVx,
              curVz,
              1.45,
              planeObbs,
              [],
              undefined,
              undefined,
              2.2,
              2,
            );
            if (planeRes.collided) {
              veh.x = planeRes.x;
              veh.z = planeRes.z;
              curVx = planeRes.vx * 0.6;
              curVz = planeRes.vz * 0.6;
              veh.speed = curVx * fwdX + curVz * fwdZ;
              veh.lateralSpeed = curVx * Math.cos(veh.yaw) - curVz * Math.sin(veh.yaw);
            }
          }

          for (const ai of this.aiTraffic) {
            if (!ai.active) continue;
            const pair = resolveVehiclePairCollision(
              veh.x,
              veh.z,
              curVx,
              curVz,
              veh.mass,
              ai.x,
              ai.z,
              Math.sin(ai.yaw) * ai.speed,
              Math.cos(ai.yaw) * ai.speed,
              ai.isBus ? 24 : 12,
              3.1,
              0.36,
            );
            if (pair.collided) {
              veh.x = pair.ax;
              veh.z = pair.az;
              curVx = pair.avx;
              curVz = pair.avz;
              veh.speed = curVx * fwdX + curVz * fwdZ;
              veh.lateralSpeed = curVx * Math.cos(veh.yaw) - curVz * Math.sin(veh.yaw);
              ai.speed = Math.max(0, ai.speed * 0.35);
              ai.stopTimer = Math.max(ai.stopTimer, 0.9);
              if (pair.impactSpeed > 3.2 && this.vehicleBumpCooldown <= 0) {
                this.vehicleBumpCooldown = 0.4;
                veh.suspVy -= Math.min(2.4, pair.impactSpeed * 0.15);
                this.camShakeTrauma = Math.min(0.55, this.camShakeTrauma + Math.min(0.28, pair.impactSpeed * 0.022));
                soundEngine.playHorn();
                this.spawnParticleBurst((veh.x + ai.x) * 0.5, veh.y + 0.9, (veh.z + ai.z) * 0.5, 10, 0xfbbf24);
              }
            }
          }
        }

        veh.mesh.position.set(veh.x, Math.max(0, veh.y + veh.suspY), veh.z);
        veh.mesh.rotation.order = 'YXZ';
        veh.mesh.rotation.set(-veh.pitch, veh.yaw, veh.roll);

        // Spin wheels & visibly turn front wheels!
        for (const w of veh.rig.wheels) {
          w.rotation.x += veh.speed * dt * 2.2;
        }
        for (const fp of veh.rig.frontWheelPivots) {
          fp.rotation.y = veh.steerAngle;
        }

        this.playerX = veh.x;
        this.playerY = veh.y;
        this.playerZ = veh.z;
        this.playerYaw = veh.yaw;
        this.playerVx = Math.sin(veh.yaw) * veh.speed;
        this.playerVz = Math.cos(veh.yaw) * veh.speed;

        // Check manual arrival at Hospital while driving Ambulance in emergency rescue!
        if (
          this.emergencyDispatch.active &&
          this.emergencyDispatch.phase === 'to_hospital' &&
          Math.hypot(veh.x - 62, veh.z + 36) < 13
        ) {
          this.completeHospitalDropoff();
          return;
        }

        // Safe cartoon pedestrian bump protection: player CANNOT harm NPCs; witnesses call 108 Ambulance!
        if (Math.abs(veh.speed) > 3.5 && this.accidentCooldown <= 0 && !this.emergencyDispatch.active) {
          for (const n of this.liveNpcs) {
            const nd = Math.hypot(n.x - veh.x, n.z - veh.z);
            if (nd < 2.05) {
              this.accidentCooldown = 14;
              veh.speed = 0;
              const pushAng = Math.atan2(n.x - veh.x, n.z - veh.z);
              n.x += Math.sin(pushAng) * 2.2;
              n.z += Math.cos(pushAng) * 2.2;
              n.rig.root.position.set(n.x, 0, n.z);
              soundEngine.playBrakeScreech();
              this.spawnParticleBurst(n.x, 1.6, n.z, 14, 0xffd166);
              this.callbacks.onEmergencyIncident('pedestrian_bump', veh.x, veh.z);
              break;
            }
          }
        }

        // Responsive easy-drive follow camera smoothly stays right behind the car!
        const diff = Math.atan2(Math.sin(veh.yaw - this.camYaw), Math.cos(veh.yaw - this.camYaw));
        this.camYaw += diff * (1 - Math.exp(-6.2 * dt));
      }
      return;
    }

    // RIDING OR DRIVING A KERALA TRAIN — sync player coordinates to the train!
    if (this.railwayState.riderMode !== 'none' && this.railwayState.ridingTrainId) {
      const tr = this.railwayState.trains.find((t) => t.id === this.railwayState.ridingTrainId);
      if (tr) {
        this.playerX = tr.x;
        this.playerY = 2.4;
        this.playerZ = tr.z;
        this.playerYaw = tr.yaw;
      }
      return;
    }

    // SITTING ON A MALABAR BEACH BENCH — relaxed ocean-gazing seated pose!
    if (this.sittingBenchId) {
      const b = BEACH_BENCHES.find((item) => item.id === this.sittingBenchId);
      if (b) {
        this.sheru.root.visible = true;
        this.sheru.root.position.set(b.x, 0.56, b.z + 0.05);
        this.sheru.root.rotation.y = b.facingYaw;
        this.sheru.bodyGroup.position.y = -0.24 + Math.sin(this.elapsed * 2.2) * 0.015;
        this.sheru.leftLeg.rotation.x = -1.35;
        this.sheru.rightLeg.rotation.x = -1.35;
        this.sheru.leftArm.rotation.x = -0.35;
        this.sheru.rightArm.rotation.x = -0.35;
        this.sheru.tail.rotation.y = Math.sin(this.elapsed * 2.8) * 0.25;
      }
      return;
    }

    // ON-FOOT SHERU BHAI REAL MOMENTUM, RAMP & SURFACE-GRIP THIRD-PERSON PHYSICS
    const mag = Math.hypot(forward, strafe);
    let desiredMoveX = 0;
    let desiredMoveZ = 0;
    if (mag > 0.05) {
      const nf = forward / Math.max(1, mag);
      const ns = strafe / Math.max(1, mag);
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      desiredMoveX = (sinY * nf - cosY * ns) * Math.min(1, mag);
      desiredMoveZ = (cosY * nf + sinY * ns) * Math.min(1, mag);
    }

    const prevPlayerX = this.playerX;
    const prevPlayerZ = this.playerZ;

    const charStep = stepCharacterPhysics(
      {
        x: this.playerX,
        y: this.playerY,
        z: this.playerZ,
        vx: this.playerVx,
        vy: this.playerVy,
        vz: this.playerVz,
        yaw: this.playerYaw,
        coyoteTimer: this.coyoteTimer,
        jumpBufferTimer: this.jumpBufferTimer,
      },
      {
        moveX: desiredMoveX,
        moveZ: desiredMoveZ,
        running,
      },
      this.colliders,
      dt,
    );

    const palmHit = checkPalmTreeCollision(charStep.x, charStep.z, 0.85, this.livePalms, 0.55);
    let nextPlayerX = palmHit.pushedX;
    let nextPlayerZ = palmHit.pushedZ;
    let nextPlayerVx = palmHit.hit ? charStep.vx * 0.25 : charStep.vx;
    let nextPlayerVz = palmHit.hit ? charStep.vz * 0.25 : charStep.vz;

    // Common Solid-Body Physics: prevent character body from crossing through aeroplanes
    // (fuselage + wings), parked vehicles, moving traffic, trains, benches, or NPCs!
    this.collectSolidBodiesAround(nextPlayerX, nextPlayerZ, 28, true);
    const solidRes = resolveCharacterSolidBodies(
      nextPlayerX,
      charStep.y,
      nextPlayerZ,
      nextPlayerVx,
      nextPlayerVz,
      0.58,
      this.solidObbsScratch,
      this.solidCirclesScratch,
      prevPlayerX,
      prevPlayerZ,
    );
    if (solidRes.collided) {
      // Re-clamp once against static building colliders so moving traffic never pushes Sheru into a wall
      const wallSafe = resolveCircleWorldCollision(solidRes.x, solidRes.z, 0.72, this.colliders);
      nextPlayerX = wallSafe.x;
      nextPlayerZ = wallSafe.z;
      nextPlayerVx = solidRes.vx;
      nextPlayerVz = solidRes.vz;
    }

    this.playerX = nextPlayerX;
    this.playerY = charStep.y;
    this.playerZ = nextPlayerZ;
    this.playerVx = nextPlayerVx;
    this.playerVz = nextPlayerVz;
    this.playerVy = charStep.vy;
    this.playerYaw = charStep.yaw;
    this.coyoteTimer = charStep.coyoteTimer;
    this.jumpBufferTimer = charStep.jumpBufferTimer;

    // Colliding with a Coconut Tree trunk shakes the 3D palm & drops a coconut!
    if (palmHit.hit && palmHit.palmIndex >= 0) {
      const bumpedPalm = this.livePalms[palmHit.palmIndex];
      if (!bumpedPalm.shaking || bumpedPalm.shakeTime > 0.45) {
        this.launchCoconutFromPalm(bumpedPalm, palmHit.impactDirX, palmHit.impactDirZ, true);
      }
    }

    const moveSpeed = solidRes.collided ? Math.hypot(nextPlayerVx, nextPlayerVz) : charStep.horizontalSpeed;
    if (moveSpeed > 0.25) {
      this.walkPhase += moveSpeed * dt * 1.45;
      this.footstepAccum += moveSpeed * dt;
      if (charStep.grounded && this.footstepAccum > (running ? 2.6 : 2.1)) {
        this.footstepAccum = 0;
        if (
          !this.inHospital &&
          isPointInActivePuddle(
            this.playerX,
            this.playerZ,
            this.puddleSpecs,
            this.weatherState.condition,
          )
        ) {
          soundEngine.playSplash();
          this.spawnParticleBurst(this.playerX, 0.18, this.playerZ, 6, 0xbae6fd);
        } else {
          soundEngine.playFootstep(running);
        }
      }
    }

    if (charStep.jumped) {
      this.squashX = 0.84;
      this.squashY = 1.2;
      soundEngine.playJump();
      this.spawnParticleBurst(this.playerX, this.playerY + 0.15, this.playerZ, 5, 0xf4e3b2);
    }
    if (charStep.landed) {
      const squashAmt = Math.min(0.28, charStep.landImpactSpeed * 0.018);
      this.squashX = 1 + squashAmt;
      this.squashY = 1 - squashAmt;
      soundEngine.playLand();
      if (charStep.landImpactSpeed > 8) {
        this.spawnParticleBurst(this.playerX, this.playerY + 0.12, this.playerZ, 7, 0xe2e8f0);
      }
    }

    // Smooth squash & stretch recovery
    const damp = 1 - Math.exp(-14 * dt);
    this.squashX += (1 - this.squashX) * damp;
    this.squashY += (1 - this.squashY) * damp;

    // Apply transforms & expressive billionaire swagger animations
    this.sheru.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.sheru.root.rotation.y = this.playerYaw;
    this.sheru.bodyGroup.scale.set(this.squashX, this.squashY, this.squashX);

    if (this.reactionTimer > 0) {
      this.reactionTimer -= dt;
      const bounce = Math.abs(Math.sin(this.elapsed * 11)) * 0.25;
      this.sheru.bodyGroup.position.y = bounce;
      this.sheru.leftArm.rotation.x = -2.4 + Math.sin(this.elapsed * 12) * 0.3;
      this.sheru.rightArm.rotation.x = -2.4 - Math.sin(this.elapsed * 12) * 0.3;
      this.sheru.headGroup.rotation.z = Math.sin(this.elapsed * 10) * 0.15;
    } else if (moveSpeed > 0.2) {
      const swing = Math.sin(this.walkPhase) * (running ? 0.82 : 0.55);
      this.sheru.leftLeg.rotation.x = swing;
      this.sheru.rightLeg.rotation.x = -swing;
      this.sheru.leftArm.rotation.x = -swing * 0.85;
      this.sheru.rightArm.rotation.x = swing * 0.85;
      // Confident chest strut bob
      this.sheru.bodyGroup.position.y = Math.abs(Math.cos(this.walkPhase)) * 0.08;
      this.sheru.bodyGroup.rotation.z = Math.sin(this.walkPhase) * 0.045;
      this.sheru.headGroup.rotation.z = 0;
    } else {
      const settle = 1 - Math.exp(-10 * dt);
      this.sheru.leftLeg.rotation.x *= 1 - settle;
      this.sheru.rightLeg.rotation.x *= 1 - settle;
      this.sheru.leftArm.rotation.x *= 1 - settle;
      this.sheru.rightArm.rotation.x *= 1 - settle;
      this.sheru.bodyGroup.rotation.z *= 1 - settle;
      this.sheru.bodyGroup.position.y = Math.sin(this.elapsed * 2.5) * 0.025;
      this.sheru.headGroup.rotation.z = 0;
    }
    this.sheru.tail.rotation.y = Math.sin(this.elapsed * (moveSpeed > 0.2 ? 6.5 : 2.8)) * 0.32;

    // Auto-detect visiting major landmark buildings for Explore objectives
    for (const b of BUILDINGS) {
      const dist = Math.hypot(b.x - this.playerX, b.z - this.playerZ);
      if (dist < Math.max(b.width, b.depth) * 0.72 + 2.5) {
        if (this.lastVisitedBuildingId !== b.id) {
          this.lastVisitedBuildingId = b.id;
          this.callbacks.onBuildingApproach(b.id);
        }
      }
    }

    // Coconut Lagoon Pool & Resort Swimming Splash!
    const nowInPool =
      this.playerX >= RESORT_POOL_BOUNDS.minX &&
      this.playerX <= RESORT_POOL_BOUNDS.maxX &&
      this.playerZ >= RESORT_POOL_BOUNDS.minZ &&
      this.playerZ <= RESORT_POOL_BOUNDS.maxZ;
    this.inPool = nowInPool;
    if (nowInPool && this.poolSplashCooldown <= 0 && moveSpeed > 0.2) {
      this.poolSplashCooldown = 0.65;
      soundEngine.playSplash();
      this.spawnParticleBurst(this.playerX, 0.45, this.playerZ, 8, 0x38bdf8);
    }

    // Standing Under Coconut Trees -> Shakes Palm & Drops 3D Coconut -> Call 108 Ambulance!
    if (
      this.coconutCooldown <= 0 &&
      this.fallingCoconut?.phase === 'idle' &&
      !this.emergencyDispatch.active
    ) {
      let nearPalm: LiveCoconutPalm | null = null;
      for (const palm of this.livePalms) {
        if (Math.hypot(palm.x - this.playerX, palm.z - this.playerZ) < 2.9) {
          nearPalm = palm;
          break;
        }
      }
      if (nearPalm) {
        this.underPalmTimer += dt;
        if (this.underPalmTimer > 1.6) {
          this.underPalmTimer = 0;
          this.coconutCooldown = 12;
          this.launchCoconutFromPalm(
            nearPalm,
            nearPalm.x - this.playerX,
            nearPalm.z - this.playerZ,
            true,
          );
        }
      } else {
        this.underPalmTimer = Math.max(0, this.underPalmTimer - dt);
      }
    }

    // Periodic lively random street event trigger while exploring on foot
    if (moveSpeed > 0.5) {
      this.randomEventTimer -= dt;
      if (this.randomEventTimer <= 0) {
        this.randomEventTimer = 55 + Math.random() * 30;
        this.callbacks.onAutoRandomEvent(getDistrictAt(this.playerX, this.playerZ));
      }
    }
  }

  private completeHospitalDropoff() {
    this.emergencyDispatch.active = false;
    this.autopilotDest = null;
    const amb = this.liveVehicles.find((v) => v.id === this.emergencyDispatch.ambulanceId);
    if (amb) {
      amb.speed = 0;
      amb.sirenOn = false;
      // Park the 108 Ambulance neatly outside the Hospital Emergency Porch
      amb.x = HOSPITAL_INTERIOR_BOUNDS.doorX;
      amb.z = HOSPITAL_INTERIOR_BOUNDS.doorZ + 5.2;
      amb.yaw = Math.PI / 2;
      amb.mesh.position.set(amb.x, 0, amb.z);
      amb.mesh.rotation.y = amb.yaw;
    }
    soundEngine.stopSiren();
    this.activeVehicleId = null;
    this.sheru.root.visible = true;

    // Slide Hospital glass emergency doors wide open & walk Sheru straight INSIDE the 3D Hospital interior!
    if (this.hospitalInteriorRig) {
      this.hospitalInteriorRig.doorOpenAmount = 1;
      this.hospitalInteriorRig.slidingDoorLeft.position.x = -3.25;
      this.hospitalInteriorRig.slidingDoorRight.position.x = 3.25;
    }
    this.playerX = HOSPITAL_INTERIOR_BOUNDS.doorX;
    this.playerZ = HOSPITAL_INTERIOR_BOUNDS.doorZ - 3.0;
    this.playerY = 0;
    this.playerVy = 0;
    this.playerYaw = Math.PI; // Facing North into the bright Hospital Ward, Dr. Hari Menon & VIP Beds!
    this.inHospital = true;
    this.sheru.root.position.set(this.playerX, 0, this.playerZ);
    this.sheru.root.rotation.y = this.playerYaw;

    // Frame the interior camera cleanly through the open entrance showcasing the full 3D Hospital Ward
    this.camYaw = Math.PI;
    this.camPitch = 0.16;
    this.camCurrentPos.set(this.playerX, 2.35, HOSPITAL_INTERIOR_BOUNDS.doorZ + 0.7);
    this.camLookTarget.set(this.playerX, 1.65, HOSPITAL_INTERIOR_BOUNDS.centerZ - 1.0);
    this.camera.position.copy(this.camCurrentPos);
    this.camera.lookAt(this.camLookTarget);

    this.spawnParticleBurst(this.playerX, 1.6, this.playerZ, 18, 0x4ade80);
    this.hudThrottle = 1;
    this.callbacks.onHospitalArrived();
  }

  private updateHospitalInterior(dt: number) {
    this.inHospital = !this.activeVehicleId && isInsideHospitalInterior(this.playerX, this.playerZ);
    const rig = this.hospitalInteriorRig;
    if (!rig) return;

    const doorDistPlayer = Math.hypot(
      this.playerX - HOSPITAL_INTERIOR_BOUNDS.doorX,
      this.playerZ - HOSPITAL_INTERIOR_BOUNDS.doorZ,
    );
    const amb = this.liveVehicles.find((v) => v.id === this.emergencyDispatch.ambulanceId);
    const ambNear =
      amb !== undefined &&
      Math.hypot(amb.x - HOSPITAL_INTERIOR_BOUNDS.doorX, amb.z - (HOSPITAL_INTERIOR_BOUNDS.doorZ + 3)) < 8.5;

    const shouldOpen = this.inHospital || doorDistPlayer < 7.5 || ambNear;
    const targetOpen = shouldOpen ? 1 : 0;
    rig.doorOpenAmount += (targetOpen - rig.doorOpenAmount) * Math.min(1, dt * 7.5);
    rig.slidingDoorLeft.position.x = -1.2 - rig.doorOpenAmount * 2.1;
    rig.slidingDoorRight.position.x = 1.2 + rig.doorOpenAmount * 2.1;

    // Rhythmic pulsing heartbeat on the 3D ECG Vital Signs Monitor!
    const pulse = Math.pow(Math.max(0, Math.sin(this.elapsed * 4.4)), 6);
    rig.ecgScreenMat.emissiveIntensity = 0.65 + pulse * 0.95;

    // Keep hospital interior bright both day and night
    const phase = getTimeOfDayPhase(this.timeOfDay);
    rig.interiorLight.intensity = phase === 'night' ? 2.1 : 1.35;
  }

  private updateTrafficAndEmergency(dt: number) {
    // Cooldowns
    this.coconutCooldown = Math.max(0, this.coconutCooldown - dt);
    this.accidentCooldown = Math.max(0, this.accidentCooldown - dt);
    this.roadEgoCooldown = Math.max(0, this.roadEgoCooldown - dt);
    this.poolSplashCooldown = Math.max(0, this.poolSplashCooldown - dt);
    this.autopilotHornCooldown = Math.max(0, this.autopilotHornCooldown - dt);

    // 1. Animate 3D Coconut Palm Trees (Tropical Breeze + Collision Spring Shake + Frond Rustle + Coconut Regrow)
    for (const palm of this.livePalms) {
      if (palm.dropCooldown > 0) palm.dropCooldown = Math.max(0, palm.dropCooldown - dt);
      if (palm.regrowTimer > 0) {
        palm.regrowTimer -= dt;
        if (palm.regrowTimer <= 0 && palm.detachedCocoIdx >= 0) {
          palm.rig.coconuts[palm.detachedCocoIdx].visible = true;
          palm.detachedCocoIdx = -1;
        }
      }

      if (!palm.shaking && !palm.rig.highDetailGroup.visible) continue;
      const dxp = palm.x - this.playerX;
      const dzp = palm.z - this.playerZ;
      if (!palm.shaking && dxp * dxp + dzp * dzp > 58 * 58) continue;

      const breezeX = Math.sin(this.elapsed * 1.35 + palm.phaseOffset) * 0.022;
      const breezeZ = Math.cos(this.elapsed * 1.15 + palm.phaseOffset) * 0.018;

      if (palm.shaking) {
        palm.shakeTime += dt;
        const shake = computePalmShakeState(palm.shakeTime, palm.impactDirX, palm.impactDirZ);
        if (shake.done) {
          palm.shaking = false;
          palm.rig.swayPivot.rotation.set(breezeX, 0, breezeZ);
          for (const f of palm.rig.fronds) f.rotation.x = 0;
        } else {
          // Convert world impact tilt into palm's local swayPivot frame
          const cosY = Math.cos(-palm.rig.root.rotation.y);
          const sinY = Math.sin(-palm.rig.root.rotation.y);
          const localTiltX = shake.tiltX * cosY - shake.tiltZ * sinY;
          const localTiltZ = shake.tiltX * sinY + shake.tiltZ * cosY;
          palm.rig.swayPivot.rotation.set(breezeX + localTiltX, 0, breezeZ + localTiltZ);
          palm.rig.fronds.forEach((f, idx) => {
            f.rotation.x = shake.frondRustle * (idx % 2 === 0 ? 1 : -0.85);
          });
        }
      } else {
        palm.rig.swayPivot.rotation.set(breezeX, 0, breezeZ);
      }
    }

    // 1b. Update 3D Falling & Bouncing Coconut Animation + 'coconut_drop' Range Detection
    const coco = this.fallingCoconut;
    if (coco && coco.phase !== 'idle') {
      if (coco.phase === 'falling') {
        coco.vy += 24 * dt;
        coco.x += coco.vx * dt;
        coco.y -= coco.vy * dt;
        coco.z += coco.vz * dt;
        coco.rig.group.rotation.x += coco.spinX * dt;
        coco.rig.group.rotation.z += coco.spinZ * dt;
        coco.rig.group.position.set(coco.x, Math.max(0.3, coco.y), coco.z);

        // Ground shadow ring grows and tightens directly below falling coconut
        const heightRatio = THREE.MathUtils.clamp(1 - coco.y / 10, 0.25, 1.15);
        coco.rig.shadowRing.position.set(coco.x, 0.05, coco.z);
        coco.rig.shadowRing.scale.setScalar(heightRatio);

        // Check Sheru Bhai head-bonk hit if on foot and within range!
        if (
          coco.y <= 2.15 &&
          !this.activeVehicleId &&
          isSheruInCoconutDropRange(coco.x, coco.z, this.playerX, this.playerZ, 3.8)
        ) {
          soundEngine.playCoconutBonk();
          this.camShakeTrauma = Math.min(1, this.camShakeTrauma + 0.55);
          this.squashX = 1.24;
          this.squashY = 0.78;
          this.spawnParticleBurst(this.playerX, 2.35, this.playerZ, 22, 0xfacc15);

          // Visually bounce the 3D coconut off Sheru's head onto the grass!
          coco.phase = 'bouncing';
          coco.vy = -6.8;
          coco.vx = (coco.x >= this.playerX ? 1 : -1) * 2.4;
          coco.vz = (coco.z >= this.playerZ ? 1 : -1) * 2.0;
          coco.spinX = 13;
          coco.spinZ = 9;

          this.callbacks.onEmergencyIncident('coconut_drop', this.playerX, this.playerZ);
        } else if (coco.y <= 0.3) {
          // Missed Sheru (dodged out of range or inside vehicle) -> ground bounce thud!
          coco.y = 0.3;
          coco.phase = 'bouncing';
          coco.vy = -4.6;
          coco.vx *= 0.55;
          coco.vz *= 0.55;
          soundEngine.playCoconutThud();
          this.spawnParticleBurst(coco.x, 0.35, coco.z, 10, 0x4e8c2b);
        }
      } else if (coco.phase === 'bouncing') {
        coco.vy += 24 * dt;
        coco.x += coco.vx * dt;
        coco.y -= coco.vy * dt;
        coco.z += coco.vz * dt;
        coco.rig.group.rotation.x += coco.spinX * dt;
        coco.rig.group.rotation.z += coco.spinZ * dt;
        if (coco.y <= 0.3) {
          coco.y = 0.3;
          coco.phase = 'resting';
          coco.restTimer = 2.4;
          coco.vx = 0;
          coco.vy = 0;
          coco.vz = 0;
        }
        coco.rig.group.position.set(coco.x, coco.y, coco.z);
        coco.rig.shadowRing.position.set(coco.x, 0.05, coco.z);
        coco.rig.shadowRing.scale.setScalar(0.95);
      } else if (coco.phase === 'resting') {
        coco.restTimer -= dt;
        if (coco.restTimer <= 0) {
          coco.phase = 'idle';
          coco.rig.group.visible = false;
          coco.rig.shadowRing.visible = false;
        }
      }
    }

    // 2. Cycle Main Junction Traffic Lights (NS Green -> Yellow -> EW Green -> Yellow)
    this.trafficLightCycle = (this.trafficLightCycle + dt) % 16;
    if (this.trafficLightCycle < 6.5) this.trafficLightState = 'ns_green';
    else if (this.trafficLightCycle < 8.0) this.trafficLightState = 'yellow';
    else if (this.trafficLightCycle < 14.5) this.trafficLightState = 'ew_green';
    else this.trafficLightState = 'yellow';

    for (const tl of this.trafficLights) {
      const isGreen =
        (tl.axis === 'ns' && this.trafficLightState === 'ns_green') ||
        (tl.axis === 'ew' && this.trafficLightState === 'ew_green');
      const isYellow = this.trafficLightState === 'yellow';
      tl.rig.greenMat.emissiveIntensity = isGreen ? 1.4 : 0.08;
      tl.rig.yellowMat.emissiveIntensity = isYellow ? 1.4 : 0.08;
      tl.rig.redMat.emissiveIntensity = !isGreen && !isYellow ? 1.4 : 0.08;
    }

    // 3. Flash Red/Blue Siren Lights on Emergency Vehicles
    const flashRed = Math.floor(this.elapsed * 8) % 2 === 0;
    const anyPlayerSiren = this.liveVehicles.some((v) => v.sirenOn);
    const emergencyYieldActive = this.emergencyDispatch.active || anyPlayerSiren;

    for (const v of this.liveVehicles) {
      if (v.rig.sirenRedMat && v.rig.sirenBlueMat) {
        const active = v.sirenOn;
        v.rig.sirenRedMat.emissiveIntensity = active ? (flashRed ? 2.2 : 0.15) : 0.12;
        v.rig.sirenBlueMat.emissiveIntensity = active ? (flashRed ? 0.15 : 2.2) : 0.12;
      }
    }

    // 4. Animate Live Dispatched 108 Emergency Ambulance rushing to scene!
    if (this.emergencyDispatch.active && this.emergencyDispatch.phase === 'en_route') {
      const amb = this.liveVehicles.find((v) => v.id === this.emergencyDispatch.ambulanceId);
      if (amb) {
        const dx = this.emergencyDispatch.targetX - amb.x;
        const dz = this.emergencyDispatch.targetZ - amb.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= 5.8) {
          amb.speed = 0;
          this.emergencyDispatch.phase = 'arrived';
          this.callbacks.onAmbulanceArrived(amb.id);
        } else {
          const targetYaw = Math.atan2(dx, dz);
          const diff = Math.atan2(Math.sin(targetYaw - amb.yaw), Math.cos(targetYaw - amb.yaw));
          amb.yaw += THREE.MathUtils.clamp(diff, -5.2 * dt, 5.2 * dt);
          amb.speed = Math.abs(diff) > 0.6 ? 5 : Math.min(28, Math.max(14, dist * 2.0));
          const nx = amb.x + Math.sin(amb.yaw) * amb.speed * dt;
          const nz = amb.z + Math.cos(amb.yaw) * amb.speed * dt;
          const safe = resolveCircleWorldCollision(nx, nz, 1.5, this.colliders);
          if (safe.collided) {
            // Slide cleanly around any roadside obstacle so ambulance always reaches the scene
            amb.x += (dx / dist) * 8 * dt;
            amb.z += (dz / dist) * 8 * dt;
          } else {
            amb.x = safe.x;
            amb.z = safe.z;
          }
          amb.mesh.position.set(amb.x, 0, amb.z);
          amb.mesh.rotation.y = amb.yaw;
          for (const w of amb.rig.wheels) w.rotation.x += amb.speed * dt * 2.2;
        }
      }
    }

    // 4B. Animate 3D Airplane Crash Blast Fireball, Shockwave, Smoke & Kerala Fire Rescue Engine!
    if (this.blastState.active) {
      this.blastState.age += dt;
      const t = this.blastState.age;
      if (t < 1.15) {
        const k = t / 1.15;
        this.blastRig.core.visible = true;
        this.blastRig.shell.visible = true;
        this.blastRig.ring.visible = true;
        this.blastRig.core.scale.setScalar(0.8 + k * 3.1);
        this.blastRig.shell.scale.setScalar(1.0 + k * 4.0);
        this.blastRig.ring.scale.setScalar(0.8 + k * 5.2);
        this.blastRig.coreMat.opacity = Math.max(0, 0.95 * (1 - k));
        this.blastRig.shellMat.opacity = Math.max(0, 0.85 * (1 - k));
        this.blastRig.ringMat.opacity = Math.max(0, 0.9 * (1 - k));
      } else {
        this.blastRig.core.visible = false;
        this.blastRig.shell.visible = false;
        this.blastRig.ring.visible = false;
      }

      this.blastState.smokeTimer += dt;
      if (t < 8.5 && this.blastState.smokeTimer >= 0.24) {
        this.blastState.smokeTimer = 0;
        const hex = t < 3.5 ? 0xf97316 : 0x374151;
        this.spawnParticleBurst(this.blastState.x, 0.8, this.blastState.z, 5, hex);
      }

      const fadeStart = this.blastState.duration - 2.5;
      if (t > fadeStart) {
        this.blastRig.scorchMat.opacity = Math.max(
          0,
          0.88 * (1 - (t - fadeStart) / 2.5),
        );
      }
      if (t >= this.blastState.duration) {
        this.blastState.active = false;
        this.blastRig.group.visible = false;
      }
    }

    if (this.fireRescueDispatch.active) {
      const fe = this.liveVehicles.find((v) => v.id === this.fireRescueDispatch.fireEngineId);
      if (fe) {
        this.fireRescueDispatch.timer += dt;
        const dx = this.fireRescueDispatch.targetX - fe.x;
        const dz = this.fireRescueDispatch.targetZ - fe.z;
        const dist = Math.hypot(dx, dz);
        if (!this.fireRescueDispatch.arrived) {
          if (dist <= 7.2) {
            fe.speed = 0;
            this.fireRescueDispatch.arrived = true;
          } else {
            const targetYaw = Math.atan2(dx, dz);
            const diff = Math.atan2(Math.sin(targetYaw - fe.yaw), Math.cos(targetYaw - fe.yaw));
            fe.yaw += THREE.MathUtils.clamp(diff, -4.8 * dt, 4.8 * dt);
            fe.speed = Math.min(24, Math.max(12, dist * 1.8));
            fe.x += Math.sin(fe.yaw) * fe.speed * dt;
            fe.z += Math.cos(fe.yaw) * fe.speed * dt;
            fe.mesh.position.set(fe.x, 0, fe.z);
            fe.mesh.rotation.y = fe.yaw;
            for (const w of fe.rig.wheels) w.rotation.x += fe.speed * dt * 2.2;
          }
        } else {
          // Spray cooling white fire-rescue foam onto the blast site!
          this.blastState.foamTimer += dt;
          if (this.blastState.foamTimer >= 0.22 && this.fireRescueDispatch.timer < 11) {
            this.blastState.foamTimer = 0;
            this.spawnParticleBurst(
              this.fireRescueDispatch.targetX,
              1.1,
              this.fireRescueDispatch.targetZ,
              6,
              0xe0f2fe,
            );
          }
          if (this.fireRescueDispatch.timer >= 12) {
            fe.sirenOn = false;
            this.fireRescueDispatch.active = false;
          }
        }
      } else {
        this.fireRescueDispatch.active = false;
      }
    }

    // 5. Update Living Kerala Road Traffic (Bus Stops, Red Lights, SIREN PULL-OVER YIELD, Road Ego!)
    if (this.mode === 'playing' && !this.modalOpen) {
      // Collect EVERY active siren source into reusable scratch array (zero GC!)
      const sirenSources = this.sirenSourcesScratch;
      sirenSources.length = 0;
      for (const v of this.liveVehicles) {
        if (v.sirenOn && v.mesh.visible) {
          sirenSources.push({ x: v.x, z: v.z, yaw: v.yaw });
        }
      }
      if (this.emergencyDispatch.active && this.emergencyDispatch.ambulanceId) {
        const amb = this.liveVehicles.find((v) => v.id === this.emergencyDispatch.ambulanceId);
        if (amb && !amb.sirenOn) {
          sirenSources.push({ x: amb.x, z: amb.z, yaw: amb.yaw });
        }
      }
      if (this.fireRescueDispatch.active && this.fireRescueDispatch.fireEngineId) {
        const fe = this.liveVehicles.find((v) => v.id === this.fireRescueDispatch.fireEngineId);
        if (fe && !fe.sirenOn) {
          sirenSources.push({ x: fe.x, z: fe.z, yaw: fe.yaw });
        }
      }
      for (const sAi of this.aiTraffic) {
        if (sAi.active && sAi.isEmergency) {
          sirenSources.push({ x: sAi.x, z: sAi.z, yaw: sAi.yaw });
        }
      }

      for (const ai of this.aiTraffic) {
        if (!ai.active) continue;

        if (ai.rig.sirenRedMat && ai.rig.sirenBlueMat) {
          ai.rig.sirenRedMat.emissiveIntensity = flashRed ? 1.8 : 0.2;
          ai.rig.sirenBlueMat.emissiveIntensity = flashRed ? 0.2 : 1.8;
        }

        // Bus Stop waiting behavior!
        if (ai.stopTimer > 0) {
          ai.stopTimer -= dt;
          ai.speed = 0;
          continue;
        }
        if (ai.isBus) {
          for (const stop of BUS_STOPS) {
            if (
              stop.id !== ai.lastBusStopId &&
              Math.hypot(ai.x - stop.stopX, ai.z - stop.stopZ) < 3.6
            ) {
              ai.lastBusStopId = stop.id;
              ai.stopTimer = 3.5;
              ai.speed = 0;
              break;
            }
          }
          if (ai.stopTimer > 0) continue;
        }

        const wp = ai.waypoints[ai.wpIndex];
        const dx = wp.x - ai.x;
        const dz = wp.z - ai.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 2.2) {
          ai.wpIndex = (ai.wpIndex + 1) % ai.waypoints.length;
          if (ai.wpIndex === 0) ai.lastBusStopId = '';
        }

        // Siren Emergency Pull-Over ("siren vehicles varumbol all vehicles side kodukkanam")!
        const yieldInfo = !ai.isEmergency
          ? computeSirenYieldBehavior(ai.x, ai.z, ai.yaw, sirenSources)
          : { yielding: false, pullOverX: 0, pullOverZ: 0, speedScale: 1, hazardFlash: false };

        const desiredYaw = Math.atan2(dx, dz);
        const yawDiff = Math.atan2(Math.sin(desiredYaw - ai.yaw), Math.cos(desiredYaw - ai.yaw));
        ai.yaw += THREE.MathUtils.clamp(yawDiff, -3.2 * dt, 3.2 * dt);

        // Traffic light check approaching Main Junction (0, -4)
        let targetSpeed = ai.cruiseSpeed;
        const distJunction = Math.hypot(ai.x, ai.z + 4);
        if (distJunction > 7.5 && distJunction < 14.5) {
          const movingNS = Math.abs(Math.cos(ai.yaw)) > 0.65;
          if (
            (movingNS && this.trafficLightState !== 'ns_green') ||
            (!movingNS && this.trafficLightState !== 'ew_green')
          ) {
            targetSpeed = 0;
          }
        }

        if (yieldInfo.yielding) {
          // Pull smoothly aside toward the outer paved curb shoulder & stop so siren passes cleanly!
          targetSpeed *= yieldInfo.speedScale;
          const pullStep = Math.min(1, dt * 3.8);
          const candidateX = ai.x + yieldInfo.pullOverX * pullStep;
          const candidateZ = ai.z + yieldInfo.pullOverZ * pullStep;
          const roadEdge = constrainVehicleToDrivableRoads(ai.x, ai.z, candidateX, candidateZ);
          ai.x = roadEdge.x;
          ai.z = roadEdge.z;
        } else if (emergencyYieldActive && !ai.isEmergency) {
          targetSpeed *= 0.28;
        }

        // Slow down cleanly if player vehicle is right in front
        const distPlayer = Math.hypot(ai.x - this.playerX, ai.z - this.playerZ);
        if (distPlayer < 6.5 && this.activeVehicleId) {
          targetSpeed *= 0.25;
        }

        ai.speed += (targetSpeed - ai.speed) * Math.min(1, dt * 4.8);
        ai.x += Math.sin(ai.yaw) * ai.speed * dt;
        ai.z += Math.cos(ai.yaw) * ai.speed * dt;

        ai.rig.root.position.set(ai.x, 0, ai.z);
        ai.rig.root.rotation.y = ai.yaw;
        // Dynamic LOD wheel-spin culling based on active device LOD profile
        const wheelAnimDist = this.lodState ? this.lodState.distances.vehicleAnimDist : 66;
        if (ai.rig.root.visible && distPlayer <= wheelAnimDist) {
          for (const w of ai.rig.wheels) w.rotation.x += ai.speed * dt * 2.2;
        }

        // Auto & Bus Driver Road Ego when Sheru gets close on the road!
        if ((ai.isAuto || ai.isBus) && distPlayer < 7.2 && this.roadEgoCooldown <= 0) {
          this.roadEgoCooldown = 14;
          if (ai.isBus) soundEngine.playBusHorn();
          else soundEngine.playHorn();
          this.callbacks.onRoadEgo(ai.isBus ? 'bus' : 'auto');
        }

        // Safe cartoon crossing hit protection: if AI vehicle bumps on-foot player -> call 108 Ambulance!
        if (
          !this.activeVehicleId &&
          distPlayer < 1.95 &&
          ai.speed > 2.8 &&
          this.accidentCooldown <= 0 &&
          !this.emergencyDispatch.active
        ) {
          this.accidentCooldown = 16;
          ai.speed = 0;
          const pushAng = Math.atan2(this.playerX - ai.x, this.playerZ - ai.z);
          const safe = resolveCircleWorldCollision(
            this.playerX + Math.sin(pushAng) * 2.6,
            this.playerZ + Math.cos(pushAng) * 2.6,
            0.85,
            this.colliders,
          );
          this.playerX = safe.x;
          this.playerZ = safe.z;
          this.camShakeTrauma = Math.min(1, this.camShakeTrauma + 0.5);
          soundEngine.playBrakeScreech();
          this.spawnParticleBurst(this.playerX, 1.5, this.playerZ, 16, 0xef4444);
          this.callbacks.onEmergencyIncident('crossing_hit', this.playerX, this.playerZ);
        }
      }
    }
  }

  private updateOpenWorldPhysicsProps(dt: number) {
    if (this.mode !== 'playing' || this.modalOpen || this.physicsProps.length === 0) return;

    this.propSoundCooldown = Math.max(0, this.propSoundCooldown - dt);

    // Populate zero-GC dynamic actor list (Player / Active Vehicle + nearby moving AI Traffic)
    this.physicsActorsScratch.length = 0;
    if (this.activeVehicleId) {
      const veh = this.liveVehicles.find((v) => v.id === this.activeVehicleId);
      if (veh) {
        const fwdX = Math.sin(veh.yaw);
        const fwdZ = Math.cos(veh.yaw);
        this.physicsActorsScratch.push({
          id: veh.id,
          x: veh.x,
          y: veh.y,
          z: veh.z,
          vx: fwdX * veh.speed + Math.cos(veh.yaw) * veh.lateralSpeed,
          vz: fwdZ * veh.speed - Math.sin(veh.yaw) * veh.lateralSpeed,
          radius: 1.55,
          mass: veh.mass,
          kickBoost: Math.min(3.5, Math.abs(veh.speed) * 0.14),
        });
      }
    } else {
      this.physicsActorsScratch.push({
        id: 'player',
        x: this.playerX,
        y: this.playerY,
        z: this.playerZ,
        vx: this.playerVx,
        vz: this.playerVz,
        radius: 0.9,
        mass: 5.5,
        kickBoost: Math.hypot(this.playerVx, this.playerVz) > 2.5 ? 2.4 : 0.8,
      });
    }

    for (let i = 0; i < this.aiTraffic.length; i++) {
      const ai = this.aiTraffic[i];
      if (!ai.active || ai.speed < 0.8) continue;
      // Only include traffic reasonably near the player for crisp low-lag performance
      if (Math.hypot(ai.x - this.playerX, ai.z - this.playerZ) > 65) continue;
      this.physicsActorsScratch.push({
        id: ai.id,
        x: ai.x,
        y: 0,
        z: ai.z,
        vx: Math.sin(ai.yaw) * ai.speed,
        vz: Math.cos(ai.yaw) * ai.speed,
        radius: 1.45,
        mass: ai.isBus ? 22 : 11,
        kickBoost: 1.4,
      });
    }

    const impacts = stepRigidBodyProps(
      this.physicsProps,
      this.physicsActorsScratch,
      this.colliders,
      dt,
    );

    // Sync active 3D prop meshes & grounded contact shadows
    for (let i = 0; i < this.physicsProps.length; i++) {
      const p = this.physicsProps[i];
      const vis = this.physicsPropVisuals[i];
      if (!vis) continue;
      vis.mesh.position.set(p.x, p.y, p.z);
      vis.mesh.rotation.set(p.rx, p.ry, p.rz);

      const floorY = sampleWorldSurface(p.x, p.z).groundY;
      const heightAbove = Math.max(0, p.y - p.halfHeight - floorY);
      vis.shadow.position.set(p.x, floorY + 0.025, p.z);
      const shadowScale = Math.max(0.42, 1 - heightAbove * 0.14);
      vis.shadow.scale.set(shadowScale, 1, shadowScale);
    }

    // Play tactile impact VFX & audio for kicked balls / smashed crates / cones!
    if (impacts.length > 0) {
      const top = impacts[0];
      const burstColor =
        top.kind === 'football'
          ? 0xfef08a
          : top.kind === 'cone'
            ? 0xf97316
            : top.kind === 'crate'
              ? 0xd69e5c
              : 0x60a5fa;
      this.spawnParticleBurst(top.x, top.y, top.z, Math.min(8, 3 + Math.round(top.intensity * 5)), burstColor);
      if (this.propSoundCooldown <= 0) {
        this.propSoundCooldown = 0.16;
        if (top.kind === 'football') {
          soundEngine.playJump();
        } else {
          soundEngine.playLand();
        }
      }
      if (top.hitByActorId !== 'player' && top.hitByActorId === this.activeVehicleId && top.intensity > 0.45) {
        this.camShakeTrauma = Math.min(0.4, this.camShakeTrauma + top.intensity * 0.1);
      }
    }
  }

  private updateNpcsAndAmbient(dt: number) {
    // All-device adaptive budget: scale NPC & crowd animation counts cleanly without popping!
    const maxAnimated = this.perfBudget.maxAnimatedNpcs;
    let animatedCount = 0;

    const actorCullDist = this.lodState ? this.lodState.distances.actorCullDist : 98;
    for (const n of this.liveNpcs) {
      const distToPlayer = Math.hypot(n.x - this.playerX, n.z - this.playerZ);
      const isTaggedPocketKidnapper = n.tag === 'pocket_kidnapper';
      if (distToPlayer > actorCullDist && !n.isBoss && !isTaggedPocketKidnapper) {
        n.rig.root.visible = false;
        continue;
      }
      n.rig.root.visible = true;

      // Tagged 'pocket_kidnapper' NPCs enter a full panicked flee state whenever a purse chase starts!
      if (isTaggedPocketKidnapper) {
        const panicStep = stepPocketKidnapperNpcPanic(
          n.x,
          n.z,
          n.yaw,
          this.playerX,
          this.playerZ,
          this.purseChase.active,
          this.purseChase.phase,
          this.elapsed,
          dt,
          n.panicPhase ?? 0,
          WORLD_RADIUS,
        );
        n.panicState = panicStep.panicState;

        if (panicStep.panicState === 'panicked') {
          const safe = resolveCircleWorldCollision(panicStep.x, panicStep.z, 0.55, this.colliders);
          n.x = safe.x;
          n.z = safe.z;
          n.yaw = panicStep.yaw;
          n.rig.root.position.set(n.x, 0, n.z);
          n.rig.root.rotation.y = n.yaw;

          const pose = computePanickedChasePose(
            this.elapsed + (n.panicPhase ?? 0),
            'chasing',
            false,
          );
          n.rig.bodyGroup.rotation.set(pose.torsoPitch, 0, pose.bodyTiltZ);
          n.rig.bodyGroup.position.y = pose.bodyBobY;
          n.rig.headGroup.rotation.y = pose.headYaw;
          n.rig.leftLeg.rotation.x = pose.legSwing;
          n.rig.rightLeg.rotation.x = -pose.legSwing;
          n.rig.leftArm.rotation.set(pose.leftArmX, 0, pose.leftArmZ);
          n.rig.rightArm.rotation.set(pose.rightArmX, 0, pose.rightArmZ);
          if (n.rig.panicAlert) {
            n.rig.panicAlert.visible = true;
            n.rig.panicAlert.scale.setScalar(pose.panicPulse);
            n.rig.panicAlert.rotation.y += dt * 4.5;
          }
          n.panicDustTimer = (n.panicDustTimer ?? 0) + dt;
          if (n.panicDustTimer >= 0.34 && distToPlayer < 45) {
            n.panicDustTimer = 0;
            this.spawnParticleBurst(n.x, 0.14, n.z, 2, 0xd6c7a9);
          }
          continue;
        }

        if (panicStep.panicState === 'cowering') {
          n.yaw = panicStep.yaw;
          n.rig.root.rotation.y = n.yaw;
          const tremor = Math.sin(this.elapsed * 22 + (n.panicPhase ?? 0)) * 0.08;
          n.rig.bodyGroup.rotation.set(-0.1, 0, tremor);
          n.rig.bodyGroup.position.y = -0.06;
          n.rig.headGroup.rotation.y = Math.sin(this.elapsed * 6.5) * 0.32;
          n.rig.leftLeg.rotation.x = 0.08;
          n.rig.rightLeg.rotation.x = -0.08;
          n.rig.leftArm.rotation.set(-2.55, 0, 0.42);
          n.rig.rightArm.rotation.set(-2.55, 0, -0.42);
          if (n.rig.panicAlert) {
            n.rig.panicAlert.visible = true;
            n.rig.panicAlert.scale.setScalar(0.75 + Math.abs(Math.sin(this.elapsed * 7)) * 0.15);
            n.rig.panicAlert.rotation.y += dt * 2.4;
          }
          continue;
        }

        // Calm reset
        n.rig.bodyGroup.rotation.set(0, 0, 0);
        n.rig.headGroup.rotation.y = 0;
        n.rig.leftArm.rotation.z = 0;
        n.rig.rightArm.rotation.z = 0;
        if (n.rig.panicAlert) {
          n.rig.panicAlert.visible = false;
        }
      }

      if (distToPlayer > 48 || animatedCount >= maxAnimated) {
        continue;
      }
      animatedCount++;

      if (distToPlayer < 5.5) {
        // Face Sheru Bhai respectfully / curiously!
        const lookYaw = Math.atan2(this.playerX - n.x, this.playerZ - n.z);
        n.yaw = lookYaw;
        n.rig.root.rotation.y = n.yaw;
        n.rig.leftLeg.rotation.x = 0;
        n.rig.rightLeg.rotation.x = 0;
        n.rig.bodyGroup.position.y = Math.sin(this.elapsed * 3.5 + n.homeX) * 0.03;
      } else {
        if (n.waitTimer > 0) {
          n.waitTimer -= dt;
          if (n.waitTimer <= 0) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * n.patrolRadius;
            n.targetX = n.homeX + Math.cos(a) * r;
            n.targetZ = n.homeZ + Math.sin(a) * r;
          }
        } else {
          const dx = n.targetX - n.x;
          const dz = n.targetZ - n.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.25) {
            n.waitTimer = 1.5 + Math.random() * 2.5;
          } else {
            const spd = 1.65;
            n.x += (dx / d) * spd * dt;
            n.z += (dz / d) * spd * dt;
            n.yaw = Math.atan2(dx, dz);
            n.walkPhase += dt * 6;
            n.rig.root.position.set(n.x, 0, n.z);
            n.rig.root.rotation.y = n.yaw;
            const sw = Math.sin(n.walkPhase) * 0.4;
            n.rig.leftLeg.rotation.x = sw;
            n.rig.rightLeg.rotation.x = -sw;
            n.rig.leftArm.rotation.x = -sw * 0.7;
            n.rig.rightArm.rotation.x = sw * 0.7;
          }
        }
      }
      if (n.rig.bossHalo) {
        n.rig.bossHalo.rotation.z += dt * 1.8;
        n.rig.bossHalo.position.y = 2.65 + Math.sin(this.elapsed * 3) * 0.12;
      }
    }

    // Animate 48 lively walking Kerala townspeople across EVERY district (dynamic LOD distance & cap!)
    const crowdVisDist = this.lodState ? this.lodState.distances.actorCullDist : 98;
    const crowdVisDistSq = crowdVisDist * crowdVisDist;
    const scaledCrowdAnimDist =
      this.perfBudget.crowdCullDist * (this.lodState ? this.lodState.lodScale : 1);
    const crowdCullDistSq = scaledCrowdAnimDist * scaledCrowdAnimDist;
    let animatedCrowdCount = 0;
    for (const ped of this.townCrowd) {
      ped.t += (ped.dir * ped.speed * dt) / ped.length;
      if (ped.t >= 1) {
        ped.t = 1;
        ped.dir = -1;
      } else if (ped.t <= 0) {
        ped.t = 0;
        ped.dir = 1;
      }
      ped.x = ped.ax + (ped.bx - ped.ax) * ped.t;
      ped.z = ped.az + (ped.bz - ped.az) * ped.t;

      const distSq = (ped.x - this.playerX) ** 2 + (ped.z - this.playerZ) ** 2;
      if (distSq > crowdVisDistSq) {
        ped.rig.root.visible = false;
        continue;
      }
      ped.rig.root.visible = true;
      ped.rig.root.position.set(ped.x, 0, ped.z);
      ped.rig.root.rotation.y = Math.atan2(
        (ped.bx - ped.ax) * ped.dir,
        (ped.bz - ped.az) * ped.dir,
      );

      if (distSq <= crowdCullDistSq && animatedCrowdCount < this.perfBudget.maxAnimatedCrowd) {
        animatedCrowdCount++;
        ped.walkPhase += dt * (4.8 + ped.speed * 1.2);
        const sw = Math.sin(ped.walkPhase) * 0.42;
        ped.rig.leftLeg.rotation.x = sw;
        ped.rig.rightLeg.rotation.x = -sw;
        ped.rig.leftArm.rotation.x = -sw * 0.65;
        ped.rig.rightArm.rotation.x = sw * 0.65;
      }
    }

    // Golden Sheru Bhai Junction Statue uplight shimmer (glows brightly at sunset & night!)
    if (this.goldenStatueRig) {
      const phase = getTimeOfDayPhase(this.timeOfDay);
      const baseGlow = phase === 'night' ? 1.55 : phase === 'sunset' ? 1.15 : 0.72;
      this.goldenStatueRig.uplightMat.emissiveIntensity =
        baseGlow + Math.sin(this.elapsed * 2.4) * 0.14;
    }

    // Mischievous town goat trotting happily around junction / market
    this.goatAngle += dt * 0.45;
    const gx = Math.cos(this.goatAngle) * 14 - 4;
    const gz = Math.sin(this.goatAngle) * 14 - 4;
    this.roamingGoat.position.set(gx, Math.abs(Math.sin(this.elapsed * 8)) * 0.14, gz);
    this.roamingGoat.rotation.y = -this.goatAngle;

    // Spin visible collectibles (using cached gem refs — zero getObjectByName per frame!)
    for (const gem of this.collectibleGems) {
      if (!gem.parent?.visible) continue;
      gem.rotation.y += dt * 2.2;
      gem.position.y = 1.2 + Math.sin(this.elapsed * 3.5) * 0.22;
    }

    // Animate quest beacon arrow bob (using cached ref)
    if (this.questBeacon.visible && this.questBeaconArrow) {
      this.questBeaconArrow.rotation.y += dt * 2.0;
      this.questBeaconArrow.position.y = 7.2 + Math.sin(this.elapsed * 3.8) * 0.55;
    }

    // Animate newly constructed 3D Sheru shops popping up!
    for (let i = this.builtShopAnimations.length - 1; i >= 0; i--) {
      const anim = this.builtShopAnimations[i];
      anim.progress = Math.min(1, anim.progress + dt * 1.8);
      const ease = 1 - Math.pow(1 - anim.progress, 3);
      anim.mesh.scale.set(1, Math.max(0.05, ease), 1);
      if (anim.progress >= 1) {
        this.builtShopAnimations.splice(i, 1);
      }
    }

    // Animate Kerala International Airport ATC radar dish, windsock & aviation beacon
    if (this.airportRig) {
      this.airportRig.radarDish.rotation.y += dt * 1.45;
      this.airportRig.windsock.rotation.y = Math.sin(this.elapsed * 2.1) * 0.28;
      this.airportRig.windsock.rotation.z = Math.sin(this.elapsed * 3.7) * 0.08;
      const pulse = 0.6 + Math.abs(Math.sin(this.elapsed * 3.2)) * 1.8;
      this.airportRig.beaconMat.emissiveIntensity = pulse;
      this.airportRig.runwayLightMat.emissiveIntensity = 0.9 + Math.sin(this.elapsed * 2.0) * 0.45;
    }

    // Update Golden Stun Blaster Beam fade
    if (this.blasterBeam && this.blasterBeam.visible) {
      this.blasterBeamTimer -= dt;
      if (this.blasterBeamTimer <= 0) {
        this.blasterBeam.visible = false;
      } else {
        (this.blasterBeam.material as THREE.MeshBasicMaterial).opacity = Math.min(
          1,
          this.blasterBeamTimer / 0.24,
        );
      }
    }

    // Live 3D Kerala Pickpocket Chase AI & Animations
    if (this.mode === 'playing' && !this.modalOpen) {
      if (!this.purseChase.active && !this.activeVehicleId && !this.inHospital) {
        this.autoChaseTimer -= dt;
        if (this.autoChaseTimer <= 0) {
          this.autoChaseTimer = 55;
          this.startPurseChaseEvent();
        }
      } else if (this.purseChase.active) {
        const stepped = stepPurseChase(this.purseChase, this.playerX, this.playerZ, dt);
        if (stepped.expired) {
          this.purseChase = stepped.state;
          if (this.thiefRig) {
            this.thiefRig.root.visible = false;
            this.thiefRig.panicAlert.visible = false;
          }
          if (this.droppedPurseRig) {
            this.droppedPurseRig.root.visible = false;
            this.droppedPurseRig.haloRing.visible = false;
          }
          if (this.victimRig) this.victimRig.root.visible = false;
          this.autoChaseTimer = 45;
        } else {
          const safeThief = resolveCircleWorldCollision(
            stepped.state.thiefX,
            stepped.state.thiefZ,
            0.55,
            this.colliders,
          );
          let nextDroppedItem = stepped.state.droppedItem;
          if (nextDroppedItem.dropped) {
            const safePurse = resolveCircleWorldCollision(
              nextDroppedItem.x,
              nextDroppedItem.z,
              0.32,
              this.colliders,
            );
            if (safePurse.x !== nextDroppedItem.x || safePurse.z !== nextDroppedItem.z) {
              nextDroppedItem = {
                ...nextDroppedItem,
                x: safePurse.x,
                z: safePurse.z,
                vx: -nextDroppedItem.vx * 0.4,
                vz: -nextDroppedItem.vz * 0.4,
              };
            }
          }
          this.purseChase = {
            ...stepped.state,
            thiefX: safeThief.x,
            thiefZ: safeThief.z,
            droppedItem: nextDroppedItem,
          };

          // Running directly up to the panicked pocket kidnapper physically tackles & catches them!
          if (shouldPhysicalTackleCatch(this.purseChase, this.playerX, this.playerZ)) {
            this.performPurseChaseAction('slap');
          }

          const isCaught = this.purseChase.phase === 'caught';
          const pose = computePanickedChasePose(
            this.elapsed,
            isCaught ? 'caught' : 'chasing',
            !this.purseChase.droppedItem.dropped,
            this.purseChase.stunTimer,
          );

          if (this.thiefRig) {
            this.thiefRig.root.visible = true;
            this.thiefRig.root.position.set(this.purseChase.thiefX, 0, this.purseChase.thiefZ);
            this.thiefRig.root.rotation.y = this.purseChase.thiefYaw;
            this.thiefRig.beaconArrow.position.y = 3.05 + Math.sin(this.elapsed * 7.5) * 0.22;
            this.thiefRig.beaconArrow.rotation.y += dt * 3.5;

            // Panicked forward sprint lean, head-over-shoulder glances, catch recoil & dizzy surrender!
            this.thiefRig.bodyGroup.rotation.set(pose.torsoPitch, 0, pose.bodyTiltZ);
            this.thiefRig.bodyGroup.position.y = pose.bodyBobY;
            this.thiefRig.headGroup.rotation.y = pose.headYaw;
            this.thiefRig.leftLeg.rotation.x = pose.legSwing;
            this.thiefRig.rightLeg.rotation.x = -pose.legSwing;
            this.thiefRig.leftArm.rotation.set(pose.leftArmX, 0, pose.leftArmZ);
            this.thiefRig.rightArm.rotation.set(pose.rightArmX, 0, pose.rightArmZ);

            this.thiefRig.stolenPurse.visible = !this.purseChase.droppedItem.dropped;
            this.thiefRig.panicAlert.visible = pose.showPanicAlert;
            if (pose.showPanicAlert) {
              this.thiefRig.panicAlert.scale.setScalar(pose.panicPulse);
              this.thiefRig.panicAlert.rotation.y += dt * 4.6;
              this.thiefDustTimer += dt;
              if (this.thiefDustTimer >= 0.24) {
                this.thiefDustTimer = 0;
                this.spawnParticleBurst(
                  this.purseChase.thiefX,
                  0.14,
                  this.purseChase.thiefZ,
                  3,
                  0xd6c7a9,
                );
              }
            }

            this.thiefRig.dizzyStars.visible = isCaught;
            if (isCaught) {
              this.thiefRig.dizzyStars.rotation.y += dt * 5.2;
            }
          }

          // Animate Standalone 3D Dropped Stolen Purse parabolic flight, ground bounce squash, dust & golden recovery ring!
          if (this.droppedPurseRig) {
            const item = this.purseChase.droppedItem;
            this.droppedPurseRig.root.visible = item.dropped;
            if (item.dropped) {
              this.droppedPurseRig.root.position.set(item.x, 0, item.z);
              this.droppedPurseRig.purseMesh.position.set(0, item.y, 0);
              this.droppedPurseRig.purseMesh.rotation.set(
                item.rotX,
                item.landedYaw,
                item.rotZ,
              );

              // Cartoon squash & stretch pulse when purse bounces on the ground!
              const sq = item.impactSquash;
              const sx = 1 + sq * 0.24;
              const sy = Math.max(0.74, 1 - sq * 0.24);
              this.droppedPurseRig.purseMesh.scale.set(sx, sy, sx);

              if (item.justBounced) {
                this.spawnParticleBurst(item.x, 0.14, item.z, 8, 0xfde047);
                this.spawnParticleBurst(item.x, 0.12, item.z, 5, 0xf472b6);
                soundEngine.playInteract();
              }

              // Expanding pink impact shockwave ring during ground contact
              if (sq > 0.02) {
                this.droppedPurseRig.impactRing.visible = true;
                const expand = 1 + (1 - sq) * 1.9;
                this.droppedPurseRig.impactRing.scale.setScalar(expand);
                this.droppedPurseRig.impactRingMat.opacity = sq * 0.85;
              } else {
                this.droppedPurseRig.impactRing.visible = false;
              }

              const shadowScale = THREE.MathUtils.clamp(1.18 - item.y * 0.22, 0.45, 1.18);
              this.droppedPurseRig.shadowMesh.scale.setScalar(shadowScale);
              this.droppedPurseRig.haloRing.visible = item.grounded;
              if (item.grounded) {
                const ringPulse = 1 + Math.sin(this.elapsed * 5.5) * 0.14;
                this.droppedPurseRig.haloRing.scale.setScalar(ringPulse);
              }
            }
          }

          if (this.victimRig) {
            this.victimRig.root.visible = true;
            const bounceY = Math.abs(Math.sin(this.elapsed * 6)) * 0.06;
            this.victimRig.root.position.set(
              this.purseChase.victimX,
              bounceY,
              this.purseChase.victimZ,
            );
            this.victimRig.root.rotation.y = Math.atan2(
              this.purseChase.thiefX - this.purseChase.victimX,
              this.purseChase.thiefZ - this.purseChase.victimZ,
            );
            // Waving arms calling for Sheru Bhai's help!
            const wave = Math.sin(this.elapsed * 9.5) * 0.45;
            this.victimRig.leftArm.rotation.x = -2.6 + wave;
            this.victimRig.rightArm.rotation.x = -2.6 - wave;
          }
        }
      }
    }

    // Update pooled particles (zero-GC _euler + skip GPU upload when idle!)
    let anyActive = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyActive = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.particleMesh.setMatrixAt(i, _mat4);
        continue;
      }
      p.vel.y -= 14 * dt;
      p.pos.addScaledVector(p.vel, dt);
      const s = 1 - p.life / p.maxLife;
      _scale.set(s, s, s);
      _euler.set(p.life * 6, p.life * 4, 0);
      _quat.setFromEuler(_euler);
      _mat4.compose(p.pos, _quat, _scale);
      this.particleMesh.setMatrixAt(i, _mat4);
    }
    if (anyActive) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateRailwaySystem(dt: number) {
    // Compute player throttle when driving a train (W/ArrowUp = accelerate, S/ArrowDown = brake/stop!)
    let throttleInput = this.railwayState.driverThrottle;
    if (this.railwayState.riderMode === 'driver' && this.mode === 'playing' && !this.modalOpen) {
      let keyThrottle = 0;
      if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) keyThrottle += 1;
      if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown') || this.keysHeld.has('Space')) {
        keyThrottle -= 1;
      }
      if (Math.abs(this.touchMoveY) > 0.15) {
        keyThrottle = -this.touchMoveY;
      }
      if (keyThrottle !== 0) throttleInput = keyThrottle;
    }

    // Collect ALL humans, vehicles & physical objects currently near/on the railway tracks
    // into reusable scratch array (zero per-frame array allocation!)
    const trackObstacles = this.trackObstaclesScratch;
    trackObstacles.length = 0;
    if (!this.activeVehicleId && this.railwayState.riderMode === 'none' && this.playerY < 3.6) {
      trackObstacles.push({
        x: this.playerX,
        y: this.playerY,
        z: this.playerZ,
        radius: 1.0,
        label: 'Sheru Bhai',
      });
    }
    for (const v of this.liveVehicles) {
      if (!v.mesh.visible || v.y >= 3.6) continue;
      trackObstacles.push({
        x: v.x,
        y: v.y,
        z: v.z,
        radius: v.type === 'bus' || v.type === 'fire_engine' ? 2.4 : 1.75,
        label: v.name,
      });
    }
    for (const ai of this.aiTraffic) {
      if (!ai.active) continue;
      trackObstacles.push({
        x: ai.x,
        y: 0,
        z: ai.z,
        radius: ai.isBus ? 2.3 : 1.7,
        label: ai.isBus ? 'Kerala Bus' : 'Road Vehicle',
      });
    }
    for (const n of this.liveNpcs) {
      trackObstacles.push({
        x: n.x,
        y: 0,
        z: n.z,
        radius: 0.9,
        label: n.name,
      });
    }
    if (this.purseChase.active) {
      trackObstacles.push({
        x: this.purseChase.thiefX,
        y: 0,
        z: this.purseChase.thiefZ,
        radius: 0.9,
        label: 'Person on Track',
      });
    }
    for (const c of this.townCrowd) {
      trackObstacles.push({
        x: c.x,
        y: 0,
        z: c.z,
        radius: 0.85,
        label: 'Pedestrian',
      });
    }
    for (const p of this.physicsProps) {
      if (p.y < 3.4) {
        trackObstacles.push({
          x: p.x,
          y: p.y,
          z: p.z,
          radius: p.radius + 0.35,
          label: 'Road Object',
        });
      }
    }

    this.railwayState = stepRailwaySimulation(
      this.railwayState,
      dt,
      throttleInput,
      trackObstacles,
    );

    // Sync all 4 articulated Kerala Express trains (Locomotive + 3 Coaches) along Track A & Track B
    for (let i = 0; i < this.trainRigs.length; i++) {
      const rig = this.trainRigs[i];
      const tr = this.railwayState.trains[i];
      if (!tr) continue;
      updateKeralaTrainRigTransform(rig, tr.distance);
      if (tr.honkPending) {
        const dist = Math.hypot(tr.x - this.playerX, tr.z - this.playerZ);
        if (dist < 72 || this.railwayState.ridingTrainId === tr.id) {
          soundEngine.playBusHorn();
        }
      }
    }

    // Sync all 40 live animated station passengers (waiting, boarding stopped trains, alighting!)
    for (const p of this.railwayState.passengers) {
      const pRig = this.stationPassengerRigs.get(p.id);
      if (!pRig) continue;
      const distSq = (p.x - this.playerX) * (p.x - this.playerX) + (p.z - this.playerZ) * (p.z - this.playerZ);
      const show = p.visible && distSq < 120 * 120;
      pRig.root.visible = show;
      if (!show) continue;
      pRig.root.position.set(p.x, 0.55, p.z);
      pRig.root.rotation.y = p.yaw;
      const isWalking = p.phase === 'boarding' || p.phase === 'alighting' || p.phase === 'strolling_out';
      const swing = isWalking ? Math.sin(p.walkPhase) * 0.65 : 0;
      pRig.leftLeg.rotation.x = swing;
      pRig.rightLeg.rotation.x = -swing;
      pRig.leftArm.rotation.x = -swing * 0.7;
      pRig.rightArm.rotation.x = swing * 0.7;
    }
  }

  private updateCamera(dt: number) {
    if (this.mode === 'title') {
      // Heroic front 3/4 Title Showcase framing Sheru Bhai's lion face, shades & gold chains
      // on the right half while leaving calm sky & negative space on the left for the SVG title lockup!
      const orbit = Math.sin(this.elapsed * 0.35) * 0.28;
      const dist = 5.4;
      const desiredX = this.playerX + Math.sin(orbit + 0.32) * dist;
      const desiredZ = this.playerZ - Math.cos(orbit + 0.32) * dist;
      const desiredY = 2.35 + Math.sin(this.elapsed * 0.45) * 0.16;
      _v1.set(desiredX, desiredY, desiredZ);
      this.camCurrentPos.lerp(_v1, 1 - Math.exp(-5 * dt));
      this.camera.position.copy(this.camCurrentPos);
      _v2.set(this.playerX - 1.35, 1.75, this.playerZ + 0.4);
      this.camLookTarget.lerp(_v2, 1 - Math.exp(-5 * dt));
      this.camera.lookAt(this.camLookTarget);
      this.skyDome.mesh.position.copy(this.camera.position);
      this.skyDome.mesh.scale.setScalar(Math.max(140, this.camera.far * 0.85));
      return;
    }

    const activeVeh = this.activeVehicleId
      ? this.liveVehicles.find((v) => v.id === this.activeVehicleId)
      : null;
    const isFlying = Boolean(activeVeh?.isAircraft);

    const followDist = isFlying ? 17.5 : this.activeVehicleId ? 10.5 : this.inHospital ? 4.4 : 7.6;
    const followHeight = isFlying ? 5.8 : this.activeVehicleId ? 4.4 : this.inHospital ? 2.05 : 3.2;

    const horizDist = Math.cos(this.camPitch) * followDist;
    const vertOffset = Math.sin(this.camPitch) * followDist + followHeight * 0.45;

    let desiredX = this.playerX - Math.sin(this.camYaw) * horizDist;
    let desiredZ = this.playerZ - Math.cos(this.camYaw) * horizDist;
    let desiredY = Math.max(1.4, this.playerY + vertOffset);

    // 1. TRAIN DRIVER CAB / PASSENGER WINDOW-SEAT CAMERA (see sea, mountains, stations & opposite passing trains!)
    if (this.railwayState.riderMode !== 'none' && this.railwayState.ridingTrainId) {
      const tr = this.railwayState.trains.find((t) => t.id === this.railwayState.ridingTrainId);
      if (tr) {
        const fwdSample = sampleTrackPoint(tr.track, tr.distance);
        const coach1Sample = sampleTrackPoint(tr.track, tr.distance - 11.1);
        // Right vector relative to forward travel (+tx, +tz): right = (-tz, tx)
        const rightX = -coach1Sample.tz;
        const rightZ = coach1Sample.tx;

        if (this.railwayState.riderMode === 'driver') {
          if (this.trainDriverCabView) {
            // Locomotive Driver Cab Front View looking straight down the gleaming rails!
            _v1.set(
              fwdSample.x + fwdSample.tx * 5.6,
              3.05,
              fwdSample.z + fwdSample.tz * 5.6,
            );
            _v2.set(
              fwdSample.x + fwdSample.tx * 42,
              2.2,
              fwdSample.z + fwdSample.tz * 42,
            );
          } else {
            // Scenic Elevated Chase Cam behind Locomotive!
            _v1.set(
              fwdSample.x - fwdSample.tx * 17 + rightX * 3.5,
              8.2,
              fwdSample.z - fwdSample.tz * 17 + rightZ * 3.5,
            );
            _v2.set(fwdSample.x + fwdSample.tx * 12, 2.4, fwdSample.z + fwdSample.tz * 12);
          }
        } else {
          // PASSENGER WINDOW SEAT VIEW ("kazhchakal kand kond pokam")
          const view = this.railwayState.seatView;
          if (view === 'outside') {
            _v1.set(
              coach1Sample.x - coach1Sample.tx * 14 + rightX * 9.5,
              7.2,
              coach1Sample.z - coach1Sample.tz * 14 + rightZ * 9.5,
            );
            _v2.set(coach1Sample.x + coach1Sample.tx * 6, 2.2, coach1Sample.z + coach1Sample.tz * 6);
          } else {
            // Look right out the Left Window (opposite track + town!) or Right Window (Arabian Sea + Western Ghats!)
            const sideSign = view === 'right_window' ? 1 : -1;
            _v1.set(
              coach1Sample.x + rightX * sideSign * 1.48,
              2.52,
              coach1Sample.z + rightZ * sideSign * 1.48,
            );
            _v2.set(
              coach1Sample.x + rightX * sideSign * 28 + coach1Sample.tx * 12,
              2.2,
              coach1Sample.z + rightZ * sideSign * 28 + coach1Sample.tz * 12,
            );
          }
        }
        this.camCurrentPos.lerp(_v1, 1 - Math.exp(-12 * dt));
        this.camera.position.copy(this.camCurrentPos);
        this.camLookTarget.lerp(_v2, 1 - Math.exp(-12 * dt));
        this.camera.lookAt(this.camLookTarget);
        // Lock sky dome cleanly to camera position & scale < camera.far so ZERO blue circle clipping ever occurs!
        this.skyDome.mesh.position.copy(this.camera.position);
        this.skyDome.mesh.scale.setScalar(Math.max(140, this.camera.far * 0.85));
        return;
      }
    }

    // 2. BEACH BENCH SEATED SCENIC CAMERA (frames Sheru sitting on the bench overlooking the Arabian Sea!)
    if (this.sittingBenchId) {
      const b = BEACH_BENCHES.find((item) => item.id === this.sittingBenchId);
      if (b) {
        _v1.set(b.x + 2.8, 2.35, b.z - 4.4);
        _v2.set(b.x, 1.4, b.z + 24);
        this.camCurrentPos.lerp(_v1, 1 - Math.exp(-5 * dt));
        this.camera.position.copy(this.camCurrentPos);
        this.camLookTarget.lerp(_v2, 1 - Math.exp(-5 * dt));
        this.camera.lookAt(this.camLookTarget);
        this.skyDome.mesh.position.copy(this.camera.position);
        this.skyDome.mesh.scale.setScalar(Math.max(140, this.camera.far * 0.85));
        return;
      }
    }

    if (this.inHospital) {
      // Keep interior camera cleanly below the 5.4m ceiling and inside the bright Hospital Ward walls
      desiredY = THREE.MathUtils.clamp(desiredY, 1.45, 4.4);
      desiredX = THREE.MathUtils.clamp(
        desiredX,
        HOSPITAL_INTERIOR_BOUNDS.minX + 0.75,
        HOSPITAL_INTERIOR_BOUNDS.maxX - 0.75,
      );
      const inDoorCorridor =
        Math.abs(desiredX - HOSPITAL_INTERIOR_BOUNDS.doorX) <
        HOSPITAL_INTERIOR_BOUNDS.doorHalfWidth - 0.35;
      const maxCamZ = inDoorCorridor
        ? HOSPITAL_INTERIOR_BOUNDS.doorZ + 1.4
        : HOSPITAL_INTERIOR_BOUNDS.maxZ - 0.65;
      desiredZ = THREE.MathUtils.clamp(
        desiredZ,
        HOSPITAL_INTERIOR_BOUNDS.minZ + 0.75,
        maxCamZ,
      );
    } else if (!isFlying || this.playerY < 3.5) {
      // Pull camera in smoothly if behind a building collider
      const camSafe = resolveCircleWorldCollision(desiredX, desiredZ, 0.7, this.colliders);
      desiredX = camSafe.x;
      desiredZ = camSafe.z;
    }

    const k = 1 - Math.exp(-10 * dt);
    _v1.set(desiredX, desiredY, desiredZ);
    this.camCurrentPos.lerp(_v1, k);

    // Decaying trauma^2 shake
    if (this.camShakeTrauma > 0) {
      this.camShakeTrauma = Math.max(0, this.camShakeTrauma - dt * 1.8);
      const shake = this.camShakeTrauma * this.camShakeTrauma * 0.35;
      this.camera.position.set(
        this.camCurrentPos.x + (Math.random() - 0.5) * shake,
        this.camCurrentPos.y + (Math.random() - 0.5) * shake,
        this.camCurrentPos.z + (Math.random() - 0.5) * shake,
      );
    } else {
      this.camera.position.copy(this.camCurrentPos);
    }

    _v2.set(this.playerX, this.playerY + (this.inHospital ? 1.65 : 1.85), this.playerZ);
    this.camLookTarget.lerp(_v2, 1 - Math.exp(-14 * dt));
    this.camera.lookAt(this.camLookTarget);

    // PERMANENT FIX FOR BLUE CIRCLE: Keep unit skyDome locked to camera.position & strictly inside camera.far!
    this.skyDome.mesh.position.copy(this.camera.position);
    this.skyDome.mesh.scale.setScalar(Math.max(140, this.camera.far * 0.85));
  }

  private emitHudIfDue(dt: number) {
    this.hudThrottle += dt;
    if (this.hudThrottle < 0.14) return; // ~7 Hz lean HUD updates for smooth FPS
    this.hudThrottle = 0;

    const activeVeh = this.activeVehicleId
      ? this.liveVehicles.find((v) => v.id === this.activeVehicleId)
      : null;

    const speedVal = activeVeh ? Math.abs(activeVeh.speed) : 0;
    const offRunwayWarning = Boolean(
      activeVeh?.isAircraft &&
        activeVeh.y >= 1.5 &&
        activeVeh.y <= 18 &&
        !activeVeh.autoLanding &&
        !isPointOnAirportTarmac(activeVeh.x, activeVeh.z),
    );
    const railwayHud = buildRailwayHudState(this.railwayState, this.playerX, this.playerZ);
    const activeBench = this.sittingBenchId
      ? BEACH_BENCHES.find((b) => b.id === this.sittingBenchId) ?? null
      : null;

    this.callbacks.onHudUpdate({
      playerX: this.playerX,
      playerZ: this.playerZ,
      playerYaw: this.playerYaw,
      speed: speedVal,
      speedKmh:
        this.railwayState.riderMode !== 'none' && railwayHud
          ? railwayHud.trainSpeedKmh
          : Math.min(180, Math.round(speedVal * 4)),
      district: this.inHospital
        ? 'Hospital Interior'
        : railwayHud?.riderMode !== undefined && railwayHud.riderMode !== 'none'
          ? `${railwayHud.trainNumber} ${railwayHud.trainName}`
          : railwayHud?.atStationName
            ? railwayHud.atStationName
            : isPointOnBeachZone(this.playerX, this.playerZ)
              ? 'Malabar Golden Beach'
              : activeVeh?.isAircraft && activeVeh.y > 4
                ? 'Kerala Sky Airspace'
                : getDistrictAt(this.playerX, this.playerZ),
      inVehicleId: this.activeVehicleId,
      inVehicleName: activeVeh?.name ?? null,
      inVehicleIsAircraft: activeVeh?.isAircraft ?? false,
      altitude: activeVeh?.isAircraft ? Math.round(activeVeh.y) : 0,
      flightState: activeVeh?.isAircraft ? activeVeh.flightState : undefined,
      offRunwayWarning,
      inVehicleHasSiren: activeVeh?.hasSiren ?? false,
      sirenActive: activeVeh?.sirenOn ?? false,
      autopilotDestName: activeVeh?.autoLanding
        ? 'Auto-Land Runway 09'
        : this.autopilotDest?.name ?? null,
      inPool: this.inPool,
      sittingOnBench: activeBench ? { benchId: activeBench.id, label: activeBench.label } : null,
      nearby:
        this.activeVehicleId || this.railwayState.riderMode !== 'none' || this.sittingBenchId
          ? null
          : this.findNearestInteractable(),
      timePhase: getTimeOfDayPhase(this.timeOfDay),
      timeOfDay: this.timeOfDay,
      weather: buildWeatherHudState(this.weatherState, getTimeOfDayPhase(this.timeOfDay)),
      activeChase: buildPurseChaseHudState(this.purseChase, this.playerX, this.playerZ),
      railway: railwayHud,
      trains: this.railwayState.trains.map((t) => {
        const def = TRAIN_DEFS.find((d) => d.id === t.id)!;
        return {
          id: t.id,
          number: t.number,
          name: t.name,
          x: t.x,
          z: t.z,
          yaw: t.yaw,
          track: t.track,
          color: def.coachColor,
        };
      }),
      stations: RAILWAY_STATIONS.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        x: s.centerX,
        z: s.centerZ,
      })),
      npcs: this.liveNpcs.map((n) => ({ id: n.id, x: n.x, z: n.z, isBoss: n.isBoss })),
      vehicles: [
        ...this.liveVehicles.map((v) => ({
          id: v.id,
          x: v.x,
          z: v.z,
          isEmergency: v.hasSiren,
          isAircraft: v.isAircraft,
        })),
        ...this.aiTraffic
          .filter((a) => a.active)
          .map((a) => ({ id: a.id, x: a.x, z: a.z, isEmergency: a.isEmergency })),
      ],
      trafficLightState: this.trafficLightState,
    });

    if (typeof window !== 'undefined') {
      (window as Window & { __keralaWorldState?: unknown }).__keralaWorldState = {
        skyDomeRadius: Number(this.skyDome.mesh.scale.x.toFixed(1)),
        cameraFar: Number(this.camera.far.toFixed(1)),
        skyCenteredOnCamera:
          this.skyDome.mesh.position.distanceTo(this.camera.position) < 0.05,
        sittingBenchId: this.sittingBenchId,
        railway: railwayHud,
        trainsCount: this.railwayState.trains.length,
        stationsCount: RAILWAY_STATIONS.length,
        activePassengers: this.railwayState.passengers.length,
      };
    }

    if (typeof window !== 'undefined') {
      (window as Window & { __keralaChaseState?: unknown }).__keralaChaseState = {
        active: this.purseChase.active,
        phase: this.purseChase.phase,
        visualState: this.purseChase.visualState,
        thiefX: Number(this.purseChase.thiefX.toFixed(2)),
        thiefZ: Number(this.purseChase.thiefZ.toFixed(2)),
        distToPlayer: Number(
          Math.hypot(
            this.purseChase.thiefX - this.playerX,
            this.purseChase.thiefZ - this.playerZ,
          ).toFixed(2),
        ),
        droppedItem: {
          dropped: this.purseChase.droppedItem.dropped,
          y: Number(this.purseChase.droppedItem.y.toFixed(2)),
          bounces: this.purseChase.droppedItem.bounces,
          grounded: this.purseChase.droppedItem.grounded,
        },
        pocketKidnappers: this.liveNpcs
          .filter((n) => n.tag === 'pocket_kidnapper')
          .map((n) => ({
            id: n.id,
            panicState: n.panicState ?? 'calm',
            x: Number(n.x.toFixed(2)),
            z: Number(n.z.toFixed(2)),
            distToPlayer: Number(Math.hypot(n.x - this.playerX, n.z - this.playerZ).toFixed(2)),
          })),
      };
    }

    this.posSaveThrottle += 0.12;
    if (this.posSaveThrottle >= 2.0) {
      this.posSaveThrottle = 0;
      this.callbacks.onPositionSample({
        x: this.playerX,
        y: this.playerY,
        z: this.playerZ,
        yaw: this.playerYaw,
      });
    }
  }

  private create3DAdsterraSlot(variant: AdSlotVariant, index: number) {
    const cfg = AD_SLOTS[variant];
    const wrapper = document.createElement('div');
    wrapper.style.width = `${cfg.width}px`;
    wrapper.style.height = `${cfg.height}px`;
    wrapper.style.overflow = 'hidden';
    wrapper.style.background = 'transparent';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.backfaceVisibility = 'hidden';
    wrapper.setAttribute('data-testid', `world-3d-${variant}-${index}`);

    const iframe = document.createElement('iframe');
    iframe.title = `${cfg.label} 3D #${index + 1}`;
    iframe.width = String(cfg.width);
    iframe.height = String(cfg.height);
    iframe.scrolling = 'no';
    iframe.frameBorder = '0';
    iframe.style.width = `${cfg.width}px`;
    iframe.style.height = `${cfg.height}px`;
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.style.background = 'transparent';
    wrapper.appendChild(iframe);

    const obj = new CSS3DObject(wrapper);
    obj.visible = false;
    this.cssScene.add(obj);

    return {
      obj,
      el: wrapper,
      iframe,
      variant,
      loaded: false,
      assignedSurfaceId: null as string | null,
    };
  }

  private hydrateMounted3DAdIframes() {
    for (const pool of [this.adBoardPool, this.adBannerPool]) {
      for (const slot of pool) {
        if (slot.loaded || !slot.obj.visible || !slot.iframe.isConnected) continue;
        try {
          const doc = slot.iframe.contentWindow?.document ?? slot.iframe.contentDocument;
          if (!doc) continue;
          doc.open();
          doc.write(buildAdSlotSrcDoc(slot.variant));
          doc.close();
          slot.loaded = true;
          slot.el.dataset.adLoaded = 'true';
        } catch {
          // ignore if blocked by host browser
        }
      }
    }
  }

  private init3DAdsterraPool() {
    this.adSurfaces = buildTown3DAdSurfaces(BUILDINGS, AD_BOARDS);
    for (let i = 0; i < 3; i++) {
      this.adBoardPool.push(this.create3DAdsterraSlot('board_300x250', i));
    }
    for (let i = 0; i < 4; i++) {
      this.adBannerPool.push(this.create3DAdsterraSlot('banner_320x50', i));
    }
  }

  private update3DAdOverlays(dt: number) {
    const showLayer =
      this.mode === 'playing' && !this.modalOpen && !this.inHospital && this.playerY < 8;
    this.cssRenderer.domElement.style.visibility = showLayer ? 'visible' : 'hidden';

    if (!showLayer) {
      if (this.hasVisible3DAd) {
        for (const s of this.adBoardPool) {
          s.obj.visible = false;
          s.el.style.pointerEvents = 'none';
        }
        for (const s of this.adBannerPool) {
          s.obj.visible = false;
          s.el.style.pointerEvents = 'none';
        }
        this.hasVisible3DAd = false;
      }
      return;
    }

    // Throttle expensive surface occlusion raychecks cleanly using device performance budget
    this.adOverlayThrottle += dt;
    if (this.adOverlayThrottle < this.perfBudget.adSyncInterval) return;
    this.adOverlayThrottle = 0;

    this.camera.getWorldDirection(_v1);
    const fwdLen = Math.hypot(_v1.x, _v1.z) || 1;
    const camFwdX = _v1.x / fwdLen;
    const camFwdZ = _v1.z / fwdLen;
    const camX = this.camera.position.x;
    const camZ = this.camera.position.z;

    let visibleCount = 0;
    const assignedBoards = assignPooled3DAdSurfaces(
      camX,
      camZ,
      camFwdX,
      camFwdZ,
      this.adSurfaces,
      'board_300x250',
      this.adBoardPool.length,
      54,
      this.colliders,
      this.adBoardPool.map((p) => p.assignedSurfaceId),
    );

    for (let i = 0; i < this.adBoardPool.length; i++) {
      const slot = this.adBoardPool[i];
      const surf = assignedBoards[i];
      if (!surf) {
        slot.assignedSurfaceId = null;
        slot.obj.visible = false;
        slot.el.style.pointerEvents = 'none';
        continue;
      }
      visibleCount++;
      slot.assignedSurfaceId = surf.id;
      slot.obj.position.set(surf.x, surf.y, surf.z);
      slot.obj.rotation.set(0, surf.rotY, 0);
      slot.obj.scale.set(surf.widthM / 300, surf.heightM / 250, 1);
      slot.obj.visible = true;
      slot.el.style.pointerEvents = 'auto';
      slot.el.dataset.surfaceId = surf.id;
    }

    const assignedBanners = assignPooled3DAdSurfaces(
      camX,
      camZ,
      camFwdX,
      camFwdZ,
      this.adSurfaces,
      'banner_320x50',
      this.adBannerPool.length,
      40,
      this.colliders,
      this.adBannerPool.map((p) => p.assignedSurfaceId),
    );

    for (let i = 0; i < this.adBannerPool.length; i++) {
      const slot = this.adBannerPool[i];
      const surf = assignedBanners[i];
      if (!surf) {
        slot.assignedSurfaceId = null;
        slot.obj.visible = false;
        slot.el.style.pointerEvents = 'none';
        continue;
      }
      visibleCount++;
      slot.assignedSurfaceId = surf.id;
      slot.obj.position.set(surf.x, surf.y, surf.z);
      slot.obj.rotation.set(0, surf.rotY, 0);
      slot.obj.scale.set(surf.widthM / 320, surf.heightM / 50, 1);
      slot.obj.visible = true;
      slot.el.style.pointerEvents = 'auto';
      slot.el.dataset.surfaceId = surf.id;
    }
    this.hasVisible3DAd = visibleCount > 0;
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed) return;
    const now = performance.now();
    const rawDt = (now - this.lastTickTime) / 1000;
    this.lastTickTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    this.elapsed += dt;
    this.frameCounter++;

    // Adaptive low-lag frame-time governor (auto-steps 3D LOD detail, DPR & shadows on slower mobile GPUs!)
    if (this.mode === 'playing' && !this.modalOpen && !this.isSoftwareGl) {
      const perfStep = stepAdaptivePerformance(this.adaptivePerf, rawDt, false);
      this.adaptivePerf = perfStep.state;
      if (perfStep.changed) {
        this.renderer.setPixelRatio(this.adaptivePerf.currentDpr);
        if (this.renderer.shadowMap.enabled !== this.adaptivePerf.shadowsEnabled) {
          this.renderer.shadowMap.enabled = this.adaptivePerf.shadowsEnabled;
          this.sunLight.castShadow = this.adaptivePerf.shadowsEnabled;
        }
        const nextLod = updateDynamicLodScale(this.lodState, this.adaptivePerf.lodScale);
        if (nextLod !== this.lodState) {
          this.lodState = nextLod;
          this.applyLodCameraAndShadows();
          this.updateEnvironmentLod(0, true);
        }
      }
    }

    this.updateLighting(dt);
    this.updateRailwaySystem(dt);
    this.updatePlayerAndVehicles(dt);
    this.updateTrafficAndEmergency(dt);
    this.updateOpenWorldPhysicsProps(dt);
    this.updateHospitalInterior(dt);
    this.updateNpcsAndAmbient(dt);
    this.updateCamera(dt);
    this.updateEnvironmentLod(dt);
    this.update3DAdOverlays(dt);
    this.emitHudIfDue(dt);

    this.renderer.render(this.scene, this.camera);
    // Only project CSS3D DOM matrices when an ad surface is visible (every 2nd frame for smooth FPS!)
    if (this.hasVisible3DAd && (this.frameCounter & 1) === 0) {
      this.cssRenderer.render(this.cssScene, this.camera);
      this.hydrateMounted3DAdIframes();
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose() {
    this.disposed = true;
    soundEngine.stopSiren();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleBlur);
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
    const cssDom = this.cssRenderer.domElement;
    if (cssDom.parentElement === this.container) {
      this.container.removeChild(cssDom);
    }
  }
}
