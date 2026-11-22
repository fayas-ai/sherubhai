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
  OwnedBusinessRecord,
  Vec2,
  VehicleDef,
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
  FallingCoconutRig,
  HospitalInteriorRig,
  NpcModelRig,
  SheruModelRig,
  TrafficLightRig,
  applyPlayerAppearance,
  createAdBoard300x250Model,
  createAirportComplexModel,
  createAutoStandModel,
  createBuildingModel,
  createBuiltShopModel,
  createBusStopModel,
  createCoconutPalm,
  createCoconutPalmRig,
  createCollectibleModel,
  createEmptyPlotModel,
  createFallingCoconutRig,
  createGoatModel,
  createNpcModel,
  createParkingBayModel,
  createSheruBhaiModel,
  createStreetLamp,
  createTrafficLightModel,
  createZebraCrossing,
} from './models';
import {
  AIRPORT_RUNWAY,
  isAircraftType,
  stepAirplanePhysics,
  stepGroundVehiclePhysics,
} from './vehiclePhysics';
import { VehicleModelRig, createDetailedVehicleModel } from './vehicleModels';
import {
  createGrassTexture,
  createPlasterBumpTexture,
  createRoadTexture,
  createSignboardTexture,
} from './textures';
import { soundEngine } from './audio';

// Module-level zero-GC scratch helpers
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _skyDay = new THREE.Color(0x88ccf1);
const _skySunset = new THREE.Color(0xf29f67);
const _skyNight = new THREE.Color(0x111a2c);
const _skyWork = new THREE.Color();

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
  yaw: number;
  pitch: number;
  roll: number;
  speed: number;
  maxSpeed: number;
  steerAngle: number;
  steerInput: number;
  isAircraft: boolean;
  flightState: 'ground' | 'takeoff_ready' | 'airborne';
  autoLanding: boolean;
  hasSiren: boolean;
  sirenOn: boolean;
  rig: VehicleModelRig;
  mesh: THREE.Group;
}

interface AiTrafficVehicle {
  id: string;
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
    cause: 'coconut_drop' | 'crossing_hit' | 'pedestrian_bump',
    x: number,
    z: number,
  ) => void;
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
  private hemiLight: THREE.HemisphereLight;
  private nightLights: THREE.PointLight[] = [];
  private lampBulbMats: THREE.MeshStandardMaterial[] = [];
  private windowMats: THREE.MeshStandardMaterial[] = [];
  private airportRig: AirportComplexRig | null = null;

  private sheru: SheruModelRig;
  private playerX = PLAYER_SPAWN.x;
  private playerY = 0;
  private playerZ = PLAYER_SPAWN.z;
  private playerVy = 0;
  private playerYaw = PLAYER_SPAWN.yaw;
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

  // World entities
  private colliders: AABB[] = [];
  private buildingHandles = new Map<string, BuildingMeshHandle>();
  private plotMeshes = new Map<string, THREE.Group>();
  private builtShopAnimations: { mesh: THREE.Group; progress: number }[] = [];
  private liveNpcs: LiveNpc[] = [];
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
  private roamingGoat: THREE.Group;
  private goatAngle = 0;
  private questBeacon: THREE.Group;
  private questTargetCoords: Vec2 | null = null;
  private activeVehicleId: string | null = null;

  // Pooled particles (Zero-GC InstancedMesh)
  private particleMesh: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];

  // Runtime state
  private mode: GameScreenState = 'title';
  private modalOpen = false;
  private settings: GameSettings;
  private callbacks: ThreeWorldCallbacks;
  private timeOfDay = 0.28;
  private dayCyclePaused = false;
  private elapsed = 0;
  private lastTickTime = 0;
  private hudThrottle = 0;
  private posSaveThrottle = 0;
  private randomEventTimer = 38;
  private lastVisitedBuildingId = '';
  private frameId = 0;
  private disposed = false;

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
    this.renderer.toneMappingExposure = 1.12;
    this.applyGraphicsQuality(settings.graphicsQuality);

    const initW = container.clientWidth || window.innerWidth;
    const initH = container.clientHeight || window.innerHeight;
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

    this.maxAnisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x88ccf1);
    this.scene.fog = new THREE.Fog(0x88ccf1, 65, 175);

    // Studio RoomEnvironment reflections on every device
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(
      58,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.2,
      260,
    );

    // Warm/cool 3-point lighting rig
    this.hemiLight = new THREE.HemisphereLight(0xaad9ff, 0x6b5d42, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.9);
    this.sunLight.position.set(42, 68, 36);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 180;
    const d = 62;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.03;
    this.scene.add(this.sunLight);

    // Build Kerala World Geometry
    this.buildEnvironment(initialProgress);

    // Build Sheru Bhai
    this.sheru = createSheruBhaiModel();
    this.scene.add(this.sheru.root);

    // Roaming Mischievous Goat
    this.roamingGoat = createGoatModel();
    this.scene.add(this.roamingGoat);

    // Golden Quest Waypoint Beacon
    this.questBeacon = this.createQuestBeacon();
    this.scene.add(this.questBeacon);

    // Pooled Zero-GC Particle Burst InstancedMesh
    const pGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.6,
    });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, 80);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < 80; i++) {
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

  private buildEnvironment(initialProgress: GameProgressState) {
    // Extended Kerala lush ground plane + distant tropical backwaters ring (no floating void wall!)
    const grassTex = createGrassTexture(this.maxAnisotropy);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(WORLD_RADIUS + 48, 48),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: grassTex,
        roughness: 0.92,
        metalness: 0.02,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Distant coastal backwater ocean ring beyond the extended town & airport perimeter
    const water = new THREE.Mesh(
      new THREE.RingGeometry(WORLD_RADIUS + 34, 460, 48),
      new THREE.MeshStandardMaterial({
        color: 0x2176ae,
        roughness: 0.22,
        metalness: 0.35,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.12;
    this.scene.add(water);

    // Kerala International Airport (COK) Complex: 196m Runway 09/27, Apron, Taxiways, ATC Tower, Hangar & Windsock
    this.airportRig = createAirportComplexModel(this.maxAnisotropy);
    this.scene.add(this.airportRig.group);

    // Extended Crossroads Roads (offset y = 0.025 to prevent any Z-fighting!)
    const roadTexNS = createRoadTexture(this.maxAnisotropy);
    roadTexNS.repeat.set(1, 26);
    const roadMatNS = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: roadTexNS,
      roughness: 0.82,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const mainRoadNS = new THREE.Mesh(new THREE.PlaneGeometry(11, 305), roadMatNS);
    mainRoadNS.rotation.x = -Math.PI / 2;
    mainRoadNS.position.set(0, 0.025, 10);
    mainRoadNS.receiveShadow = true;
    this.scene.add(mainRoadNS);

    const roadTexEW = createRoadTexture(this.maxAnisotropy);
    roadTexEW.repeat.set(1, 26);
    const roadMatEW = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: roadTexEW,
      roughness: 0.82,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const mainRoadEW = new THREE.Mesh(new THREE.PlaneGeometry(11, 305), roadMatEW);
    mainRoadEW.rotation.x = -Math.PI / 2;
    mainRoadEW.rotation.z = Math.PI / 2;
    mainRoadEW.position.set(0, 0.032, -4);
    mainRoadEW.receiveShadow = true;
    this.scene.add(mainRoadEW);

    // Secondary North Market/Hospital Avenue
    const northRoadEW = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 224), roadMatEW);
    northRoadEW.rotation.x = -Math.PI / 2;
    northRoadEW.rotation.z = Math.PI / 2;
    northRoadEW.position.set(0, 0.03, -32);
    northRoadEW.receiveShadow = true;
    this.scene.add(northRoadEW);

    // Extended Town Ring Roads: West Cinema Strip, East Promenade, & South Coastal Blvd
    const westRingNS = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 185), roadMatNS);
    westRingNS.rotation.x = -Math.PI / 2;
    westRingNS.position.set(-76, 0.027, 4);
    westRingNS.receiveShadow = true;
    this.scene.add(westRingNS);

    const eastRingNS = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 185), roadMatNS);
    eastRingNS.rotation.x = -Math.PI / 2;
    eastRingNS.position.set(76, 0.027, 4);
    eastRingNS.receiveShadow = true;
    this.scene.add(eastRingNS);

    const southCoastalEW = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 226), roadMatEW);
    southCoastalEW.rotation.x = -Math.PI / 2;
    southCoastalEW.rotation.z = Math.PI / 2;
    southCoastalEW.position.set(0, 0.028, 72);
    southCoastalEW.receiveShadow = true;
    this.scene.add(southCoastalEW);

    // Grand Expansion II Outer Boulevards: North InfoPark, Far West Turf, Far East Harbour, Marine Drive
    const northHighwayEW = new THREE.Mesh(new THREE.PlaneGeometry(10, 236), roadMatEW);
    northHighwayEW.rotation.x = -Math.PI / 2;
    northHighwayEW.rotation.z = Math.PI / 2;
    northHighwayEW.position.set(0, 0.029, -72);
    northHighwayEW.receiveShadow = true;
    this.scene.add(northHighwayEW);

    const farWestNS = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 196), roadMatNS);
    farWestNS.rotation.x = -Math.PI / 2;
    farWestNS.position.set(-108, 0.026, 6);
    farWestNS.receiveShadow = true;
    this.scene.add(farWestNS);

    const farEastNS = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 196), roadMatNS);
    farEastNS.rotation.x = -Math.PI / 2;
    farEastNS.position.set(108, 0.026, 6);
    farEastNS.receiveShadow = true;
    this.scene.add(farEastNS);

    const marineDriveEW = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 226), roadMatEW);
    marineDriveEW.rotation.x = -Math.PI / 2;
    marineDriveEW.rotation.z = Math.PI / 2;
    marineDriveEW.position.set(0, 0.027, 104);
    marineDriveEW.receiveShadow = true;
    this.scene.add(marineDriveEW);

    // Central Town Junction Plaza Circle
    const plaza = new THREE.Mesh(
      new THREE.CircleGeometry(10.5, 28),
      new THREE.MeshStandardMaterial({ color: 0x454c54, roughness: 0.84 }),
    );
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(0, 0.04, -4);
    plaza.receiveShadow = true;
    this.scene.add(plaza);

    // Decorative Kerala brass town center monument at junction center (-4) offset nicely off spawn
    const monument = new THREE.Group();
    monument.position.set(0, 0, -4);
    const monoBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.5, 0.55, 14),
      new THREE.MeshStandardMaterial({ color: 0xe6dcc8, roughness: 0.7 }),
    );
    monoBase.position.y = 0.275;
    monument.add(monoBase);
    const grassCap = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.85, 0.15, 14),
      new THREE.MeshStandardMaterial({ color: 0x3b8c47, roughness: 0.85 }),
    );
    grassCap.position.y = 0.58;
    monument.add(grassCap);
    const goldenLamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.55, 1.8, 10),
      new THREE.MeshStandardMaterial({ color: 0xf4c430, roughness: 0.22, metalness: 0.88 }),
    );
    goldenLamp.position.y = 1.48;
    monument.add(goldenLamp);
    this.scene.add(monument);

    // Buildings
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

      if (idx < 4) {
        const pl = new THREE.PointLight(0xffcb69, 0, 22, 1.6);
        pl.position.set(lx, 5.4, lz);
        this.scene.add(pl);
        this.nightLights.push(pl);
      }
    });

    // Secondary South Resort & Home Road (extended to connect West & East Rings)
    const southRoadEW = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 196), roadMatEW);
    southRoadEW.rotation.x = -Math.PI / 2;
    southRoadEW.rotation.z = Math.PI / 2;
    southRoadEW.position.set(0, 0.029, 34);
    southRoadEW.receiveShadow = true;
    this.scene.add(southRoadEW);

    // Freestanding 300×250 3D Town Ads Boards (press E to view live 300×250 Ad)
    for (const board of AD_BOARDS) {
      this.scene.add(createAdBoard300x250Model(board, this.maxAnisotropy));
    }

    // Bus Stops, Auto Stands, Marked Parking Bays, Traffic Lights & Zebra Crossings
    for (const stop of BUS_STOPS) {
      this.scene.add(createBusStopModel(stop, this.maxAnisotropy));
    }
    for (const stand of AUTO_STANDS) {
      this.scene.add(createAutoStandModel(stand, this.maxAnisotropy));
    }
    for (const bay of PARKING_BAYS) {
      this.scene.add(createParkingBayModel(bay));
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

    // Interactive Coconut Palms lining town lanes (bump trunks or walk under to shake & drop coconuts!)
    const innerPalms: [number, number, number][] = [
      [-8.5, 13.0, 8.6],
      [8.5, 13.0, 8.8],
      [-10, -24, 9.2],
      [10, -24, 10.1],
      [-26, -24, 9.6],
      [26, -24, 9.0],
      [-26, 14, 10.5],
      [26, 14, 9.4],
      [-10, 28, 9.8],
      [10, 28, 10.3],
      [-48, -28, 11.0],
      [50, -30, 10.2],
      [-52, 4, 9.5],
      [52, 4, 9.8],
      [-36, 36, 10.0],
      [36, 36, 9.2],
      [8, 18, 9.6],
      [-8, 18, 9.8],
      [-68, -28, 10.2],
      [68, 28, 9.8],
      [-54, 66, 10.4],
      [54, 66, 10.0],
      [-28, -66, 10.2],
      [28, -66, 10.5],
      [-100, -40, 10.4],
      [100, -40, 9.9],
      [-100, 42, 10.2],
      [100, 42, 10.0],
      [-32, 98, 10.6],
      [32, 98, 10.4],
    ];
    innerPalms.forEach(([px, pz, ph], idx) => {
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

    // Natural perimeter palm & hill ring around extended WORLD_RADIUS (leaving Airport approach corridor 100% clear!)
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x3b7a3e, roughness: 0.92 });
    for (let i = 0; i < 56; i++) {
      const angle = (i / 56) * Math.PI * 2;
      const r = WORLD_RADIUS + 4 + (i % 3) * 4;
      const hx = Math.cos(angle) * r;
      const hz = Math.sin(angle) * r;
      // Keep North Airport & East-West Runway 09/27 approach corridor completely open!
      if (hz < -104 || Math.abs(hz - AIRPORT_RUNWAY.centerZ) < 42) continue;
      const palm = createCoconutPalm(9 + (i % 4) * 1.4, 1.35);
      palm.position.set(hx, 0, hz);
      palm.rotation.y = angle + Math.PI;
      this.scene.add(palm);

      if (i % 2 === 0) {
        const mound = new THREE.Mesh(new THREE.SphereGeometry(14, 10, 8), hillMat);
        mound.scale.set(1.4, 0.55, 1.4);
        mound.position.set(Math.cos(angle) * (WORLD_RADIUS + 22), -1.5, Math.sin(angle) * (WORLD_RADIUS + 22));
        this.scene.add(mound);
      }
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
    }

    // Fictional Comedy Billboard overlooking Main Junction
    const billGroup = new THREE.Group();
    billGroup.position.set(-22, 0, -32);
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
        name: def.name,
        role: def.role,
        homeBuildingId: def.homeBuildingId,
      });
    }

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
        yaw: spawnDef.rotationY,
        pitch: 0,
        roll: 0,
        speed: 0,
        maxSpeed: v.maxSpeed,
        steerAngle: 0,
        steerInput: 0,
        isAircraft: Boolean(v.isAircraft || isAircraftType(v.type)),
        flightState: 'ground',
        autoLanding: false,
        hasSiren: Boolean(v.hasSiren || rig.hasSiren),
        sirenOn: false,
        rig,
        mesh: rig.root,
      });
    }

    // Spawn Living Kerala Road Traffic (14 lightweight compact vehicles, capped by Graphics Quality!)
    this.buildRoadTraffic();

    // Spawn World Collectibles
    for (const c of WORLD_COLLECTIBLES) {
      const mesh = createCollectibleModel(c);
      mesh.visible = !initialProgress.collectedWorldIds.includes(c.id);
      this.collectibleMeshes.set(c.id, mesh);
      this.scene.add(mesh);
    }

    this.colliders = getWorldColliders(Object.keys(initialProgress.builtShops));
  }

  private buildRoadTraffic() {
    // 4 clean non-overlapping Kerala road loops (EW main road, NS avenue, North Uptown/Hospital loop, South Resort loop)
    const loopEW: Vec2[] = [
      { x: -58, z: -1.6 },
      { x: 58, z: -1.6 },
      { x: 58, z: -6.4 },
      { x: -58, z: -6.4 },
    ];
    const loopNS: Vec2[] = [
      { x: 2.6, z: 38 },
      { x: 2.6, z: -34 },
      { x: -2.6, z: -34 },
      { x: -2.6, z: 38 },
    ];
    const loopNorth: Vec2[] = [
      { x: -46, z: -30.2 },
      { x: 48, z: -30.2 },
      { x: 48, z: -33.8 },
      { x: -46, z: -33.8 },
    ];
    const loopSouth: Vec2[] = [
      { x: -44, z: 32.2 },
      { x: 44, z: 32.2 },
      { x: 44, z: 35.8 },
      { x: -44, z: 35.8 },
    ];

    const trafficRoster: {
      catalogId: string;
      loop: Vec2[];
      wpIndex: number;
      startLerp: number;
      cruise: number;
    }[] = [
      { catalogId: 'veh_kerala_auto', loop: loopEW, wpIndex: 0, startLerp: 0.15, cruise: 9.2 },
      { catalogId: 'veh_ksrtc_bus', loop: loopNorth, wpIndex: 0, startLerp: 0.2, cruise: 8.5 },
      { catalogId: 'veh_pepper_hatch', loop: loopEW, wpIndex: 1, startLerp: 0.4, cruise: 10.5 },
      { catalogId: 'veh_kerala_bus', loop: loopNS, wpIndex: 2, startLerp: 0.25, cruise: 8.8 },
      { catalogId: 'veh_town_taxi', loop: loopNS, wpIndex: 0, startLerp: 0.3, cruise: 10.2 },
      { catalogId: 'veh_delivery_van', loop: loopEW, wpIndex: 2, startLerp: 0.35, cruise: 9.0 },
      { catalogId: 'veh_kochi_scooter', loop: loopSouth, wpIndex: 0, startLerp: 0.2, cruise: 9.4 },
      { catalogId: 'veh_police_jeep', loop: loopNorth, wpIndex: 2, startLerp: 0.45, cruise: 11.2 },
      { catalogId: 'veh_school_bus', loop: loopSouth, wpIndex: 2, startLerp: 0.5, cruise: 8.2 },
      { catalogId: 'veh_family_cruiser', loop: loopEW, wpIndex: 3, startLerp: 0.55, cruise: 10.4 },
      { catalogId: 'veh_royal_bike', loop: loopNS, wpIndex: 1, startLerp: 0.6, cruise: 11.4 },
      { catalogId: 'veh_goods_truck', loop: loopNorth, wpIndex: 1, startLerp: 0.65, cruise: 7.8 },
      { catalogId: 'veh_wayanad_jeep', loop: loopSouth, wpIndex: 1, startLerp: 0.7, cruise: 9.8 },
      { catalogId: 'veh_mini_bus', loop: loopEW, wpIndex: 0, startLerp: 0.72, cruise: 8.6 },
    ];

    trafficRoster.forEach((item, idx) => {
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
    // 4GB RAM Laptop Traffic Cap: Low=8, Medium=12, High=14 active road vehicles
    const maxTraffic = q === 'low' ? 8 : q === 'medium' ? 12 : 14;
    this.aiTraffic.forEach((v, idx) => {
      v.active = idx < maxTraffic;
      v.rig.root.visible = v.active;
    });

    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      return;
    }
    if (q === 'low') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
    } else if (q === 'medium') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    const safe = aircraft
      ? { x: spawnX, z: spawnZ }
      : resolveCircleWorldCollision(spawnX, spawnZ, 1.8, this.colliders);

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
        yaw: spawnYaw,
        pitch: 0,
        roll: 0,
        speed: 0,
        maxSpeed: def.maxSpeed,
        steerAngle: 0,
        steerInput: 0,
        isAircraft: aircraft,
        flightState: 'ground',
        autoLanding: false,
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
      existing.yaw = spawnYaw;
      existing.pitch = 0;
      existing.roll = 0;
      existing.speed = 0;
      existing.steerInput = 0;
      existing.flightState = 'ground';
      existing.autoLanding = false;
      existing.mesh.position.set(existing.x, 0, existing.z);
      existing.mesh.rotation.y = existing.yaw;
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
        yaw: -Math.PI / 2,
        pitch: 0,
        roll: 0,
        speed: 0,
        maxSpeed: 45,
        steerAngle: 0,
        steerInput: 0,
        isAircraft: false,
        flightState: 'ground',
        autoLanding: false,
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
        const sideOffset = veh.isAircraft ? 5.6 : 2.4;
        const exitX = veh.x + Math.cos(veh.yaw) * sideOffset;
        const exitZ = veh.z - Math.sin(veh.yaw) * sideOffset;
        const safe = resolveCircleWorldCollision(exitX, exitZ, 0.85, this.colliders);
        this.playerX = safe.x;
        this.playerZ = safe.z;
        this.playerY = 0;
      }
      this.sheru.root.visible = true;
      soundEngine.playInteract();
      this.hudThrottle = 1;
      return;
    }

    const nearby = this.findNearestInteractable();
    if (!nearby) return;

    if (nearby.kind === 'vehicle') {
      this.activeVehicleId = nearby.id;
      this.sheru.root.visible = false;
      soundEngine.playHorn();
      this.callbacks.onVehicleEnter(nearby.id);
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

    // Vehicles & Flyable Aeroplanes
    for (const v of this.liveVehicles) {
      const dist = Math.hypot(v.x - this.playerX, v.z - this.playerZ);
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
        v.isAircraft ? 7.2 : 4.6,
      );
    }

    return best;
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
    if (this.mode === 'playing' && !this.modalOpen && !this.dayCyclePaused) {
      this.timeOfDay = (this.timeOfDay + dt * 0.0022) % 1;
    }
    const phase = getTimeOfDayPhase(this.timeOfDay);
    const angle = this.timeOfDay * Math.PI * 2;
    this.sunLight.position.set(Math.cos(angle) * 65, Math.max(12, Math.sin(angle) * 75), 32);

    if (phase === 'day') {
      _skyWork.copy(_skyDay);
      this.sunLight.color.setHex(0xfff1d6);
      this.sunLight.intensity = 1.95;
      this.hemiLight.intensity = 0.88;
    } else if (phase === 'sunset') {
      _skyWork.copy(_skySunset);
      this.sunLight.color.setHex(0xff9f5a);
      this.sunLight.intensity = 1.45;
      this.hemiLight.intensity = 0.62;
    } else {
      _skyWork.copy(_skyNight);
      this.sunLight.color.setHex(0x7aa2f7);
      this.sunLight.intensity = 0.52;
      this.hemiLight.intensity = 0.38;
    }

    (this.scene.background as THREE.Color).lerp(_skyWork, 1 - Math.exp(-3 * dt));
    if (this.scene.fog) {
      this.scene.fog.color.copy(this.scene.background as THREE.Color);
    }

    const nightGlow = phase === 'night' ? 1.8 : phase === 'sunset' ? 0.7 : 0.12;
    const pointIntensity = phase === 'night' ? 18 : phase === 'sunset' ? 6 : 0;
    for (const m of this.lampBulbMats) m.emissiveIntensity = nightGlow;
    for (const m of this.windowMats) m.emissiveIntensity = phase === 'night' ? 0.95 : 0.14;
    for (const pl of this.nightLights) pl.intensity = pointIntensity;
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
          // EASY ARCADE AEROPLANE FLIGHT (Runway Takeoff, Banked Turns, Auto-Land)
          // =====================================================================
          const climbKey = this.keysHeld.has('Space');
          const descendKey =
            running || this.keysHeld.has('KeyC') || this.keysHeld.has('KeyQ');
          if (
            veh.autoLanding &&
            (Math.abs(forward) > 0.1 || Math.abs(strafe) > 0.1 || climbKey)
          ) {
            veh.autoLanding = false;
          }

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
              throttle: forward,
              turn: strafe,
              climb: climbKey,
              descend: descendKey,
              autoLand: veh.autoLanding,
            },
            dt,
            WORLD_RADIUS + 80,
          );

          // Ground-only soft building collision (when airborne > 2.2m, fly cleanly over everything!)
          let finalX = planeRes.x;
          let finalZ = planeRes.z;
          let finalSpeed = planeRes.speed;
          if (planeRes.y < 2.2) {
            const gRes = resolveCircleWorldCollision(
              finalX,
              finalZ,
              2.8,
              this.colliders,
              WORLD_RADIUS + 20,
            );
            if (gRes.collided) {
              finalX = gRes.x;
              finalZ = gRes.z;
              finalSpeed *= 0.65;
            }
          }

          if (planeRes.touchedDown) {
            veh.autoLanding = false;
            this.spawnParticleBurst(finalX, 0.4, finalZ, 12, 0xe2e8f0);
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
        // EASY ARCADE GROUND DRIVING (Speed-sensitive steering, ABS brake, wall glide)
        // =====================================================================
        const handbrake = this.keysHeld.has('Space');
        // Cancel autopilot if user manually presses W/S/A/D
        if (this.autopilotDest && (Math.abs(forward) > 0.1 || Math.abs(strafe) > 0.1)) {
          this.autopilotDest = null;
        }

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
            // Follow paved Kerala town roads (including Airport Access at z=-122!)
            const roadZs = [-122, -72, -32, -4, 34, 72];
            let destRoadZ = -4;
            let bestRoadDist = Infinity;
            for (const rz of roadZs) {
              const d = Math.abs(destZ - rz);
              if (d < bestRoadDist) {
                bestRoadDist = d;
                destRoadZ = rz;
              }
            }

            let steerTargetX = destX;
            let steerTargetZ = destZ;
            const onDestRoad = Math.abs(veh.z - destRoadZ) < 8;
            const nearCenterAve = Math.abs(veh.x) < 8;
            if (!onDestRoad && dist > 16) {
              if (!nearCenterAve) {
                let curRoadZ = -4;
                let bestCur = Infinity;
                for (const rz of roadZs) {
                  const d = Math.abs(veh.z - rz);
                  if (d < bestCur) {
                    bestCur = d;
                    curRoadZ = rz;
                  }
                }
                steerTargetX = 0;
                steerTargetZ = curRoadZ;
              } else {
                steerTargetX = 0;
                steerTargetZ = destRoadZ;
              }
            }

            const dx = steerTargetX - veh.x;
            const dz = steerTargetZ - veh.z;
            const desiredYaw = Math.atan2(dx, dz);
            const yawErr = Math.atan2(Math.sin(desiredYaw - veh.yaw), Math.cos(desiredYaw - veh.yaw));
            veh.steerAngle = THREE.MathUtils.clamp(yawErr, -0.58, 0.58);
            veh.yaw += THREE.MathUtils.clamp(yawErr, -3.4 * dt, 3.4 * dt);

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
        } else {
          // Super-easy speed-sensitive arcade driving!
          const nextPhys = stepGroundVehiclePhysics(
            {
              speed: veh.speed,
              yaw: veh.yaw,
              steerAngle: veh.steerAngle,
              steerInput: veh.steerInput,
              maxSpeed: veh.maxSpeed,
            },
            {
              forward,
              strafe,
              boost: running,
              handbrake,
            },
            dt,
          );
          veh.speed = nextPhys.speed;
          veh.yaw = nextPhys.yaw;
          veh.steerAngle = nextPhys.steerAngle;
          veh.steerInput = nextPhys.steerInput;
        }

        const nextX = veh.x + Math.sin(veh.yaw) * veh.speed * dt;
        const nextZ = veh.z + Math.cos(veh.yaw) * veh.speed * dt;
        const res = resolveCircleWorldCollision(nextX, nextZ, 1.45, this.colliders);
        const vehPalmHit = checkPalmTreeCollision(res.x, res.z, 1.45, this.livePalms, 0.55);
        if (res.collided || vehPalmHit.hit) {
          if (this.autopilotDest) {
            veh.yaw += 0.55 * dt * 4;
            veh.speed = Math.max(6, veh.speed * 0.55);
          } else {
            // Smooth wall glide instead of jarring backwards bounce!
            veh.speed *= 0.65;
            this.camShakeTrauma = Math.min(0.45, this.camShakeTrauma + 0.12);
          }
          if (vehPalmHit.hit && vehPalmHit.palmIndex >= 0) {
            const bumpedPalm = this.livePalms[vehPalmHit.palmIndex];
            if (!bumpedPalm.shaking || bumpedPalm.shakeTime > 0.45) {
              this.launchCoconutFromPalm(bumpedPalm, vehPalmHit.impactDirX, vehPalmHit.impactDirZ, false);
            }
          }
        }
        veh.x = vehPalmHit.pushedX;
        veh.z = vehPalmHit.pushedZ;
        veh.mesh.position.set(veh.x, 0, veh.z);
        veh.mesh.rotation.y = veh.yaw;

        // Spin wheels & visibly turn front wheels!
        for (const w of veh.rig.wheels) {
          w.rotation.x += veh.speed * dt * 2.2;
        }
        for (const fp of veh.rig.frontWheelPivots) {
          fp.rotation.y = veh.steerAngle;
        }

        this.playerX = veh.x;
        this.playerY = 0;
        this.playerZ = veh.z;
        this.playerYaw = veh.yaw;

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

    // ON-FOOT SHERU BHAI THIRD-PERSON MOVEMENT
    const mag = Math.hypot(forward, strafe);
    let moveSpeed = 0;
    if (mag > 0.05) {
      const nf = forward / Math.max(1, mag);
      const ns = strafe / Math.max(1, mag);
      // Forward vector from camera yaw: camera is behind (-sin(camYaw), -cos(camYaw))
      // Looking forward is (sin(camYaw), cos(camYaw))
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      const moveX = sinY * nf - cosY * ns;
      const moveZ = cosY * nf + sinY * ns;

      const targetSpeed = running ? 13.2 : 7.6;
      moveSpeed = targetSpeed * Math.min(1, mag);

      const nextX = this.playerX + moveX * moveSpeed * dt;
      const nextZ = this.playerZ + moveZ * moveSpeed * dt;
      const res = resolveCircleWorldCollision(nextX, nextZ, 0.8, this.colliders);
      const palmHit = checkPalmTreeCollision(res.x, res.z, 0.85, this.livePalms, 0.55);
      this.playerX = palmHit.pushedX;
      this.playerZ = palmHit.pushedZ;

      // Colliding with a Coconut Tree trunk shakes the 3D palm & drops a coconut!
      if (palmHit.hit && palmHit.palmIndex >= 0) {
        const bumpedPalm = this.livePalms[palmHit.palmIndex];
        if (!bumpedPalm.shaking || bumpedPalm.shakeTime > 0.45) {
          this.launchCoconutFromPalm(bumpedPalm, palmHit.impactDirX, palmHit.impactDirZ, true);
        }
      }

      const targetYaw = Math.atan2(moveX, moveZ);
      const yawDiff = Math.atan2(
        Math.sin(targetYaw - this.playerYaw),
        Math.cos(targetYaw - this.playerYaw),
      );
      this.playerYaw += yawDiff * (1 - Math.exp(-12 * dt));

      this.walkPhase += moveSpeed * dt * 1.45;
      this.footstepAccum += moveSpeed * dt;
      if (this.playerY <= 0.05 && this.footstepAccum > (running ? 2.6 : 2.1)) {
        this.footstepAccum = 0;
        soundEngine.playFootstep(running);
      }
    }

    // Jump physics with Coyote Time & Input Buffering
    if (this.playerY <= 0.01) {
      this.coyoteTimer = 0.1;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.playerVy = 11.4;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.squashX = 0.84;
      this.squashY = 1.2;
      soundEngine.playJump();
      this.spawnParticleBurst(this.playerX, 0.15, this.playerZ, 5, 0xf4e3b2);
    }

    const wasAirborne = this.playerY > 0.05;
    this.playerVy -= 29 * dt;
    this.playerY += this.playerVy * dt;
    if (this.playerY <= 0) {
      this.playerY = 0;
      if (wasAirborne && this.playerVy < -3) {
        this.squashX = 1.2;
        this.squashY = 0.8;
        soundEngine.playLand();
      }
      this.playerVy = 0;
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

    // 5. Update Living Kerala Road Traffic (10-14 compact vehicles, Bus Stops, Red Lights, Emergency Yield, Road Ego!)
    if (this.mode === 'playing' && !this.modalOpen) {
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

        // Give way during Emergency Siren / 108 Ambulance dispatch!
        if (emergencyYieldActive && !ai.isEmergency) {
          targetSpeed *= 0.22;
        }

        // Slow down cleanly if player vehicle is right in front
        const distPlayer = Math.hypot(ai.x - this.playerX, ai.z - this.playerZ);
        if (distPlayer < 6.5 && this.activeVehicleId) {
          targetSpeed *= 0.25;
        }

        ai.speed += (targetSpeed - ai.speed) * Math.min(1, dt * 4.5);
        ai.x += Math.sin(ai.yaw) * ai.speed * dt;
        ai.z += Math.cos(ai.yaw) * ai.speed * dt;

        ai.rig.root.position.set(ai.x, 0, ai.z);
        ai.rig.root.rotation.y = ai.yaw;
        for (const w of ai.rig.wheels) w.rotation.x += ai.speed * dt * 2.2;

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

  private updateNpcsAndAmbient(dt: number) {
    // 4GB-RAM Performance Optimization: animate & render nearest 18 NPCs smoothly
    const maxAnimated = this.settings.graphicsQuality === 'low' ? 14 : 18;
    let animatedCount = 0;

    for (const n of this.liveNpcs) {
      const distToPlayer = Math.hypot(n.x - this.playerX, n.z - this.playerZ);
      if (this.settings.graphicsQuality === 'low' && distToPlayer > 54 && !n.isBoss) {
        n.rig.root.visible = false;
        continue;
      }
      n.rig.root.visible = true;

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

    // Mischievous town goat trotting happily around junction / market
    this.goatAngle += dt * 0.45;
    const gx = Math.cos(this.goatAngle) * 14 - 4;
    const gz = Math.sin(this.goatAngle) * 14 - 4;
    this.roamingGoat.position.set(gx, Math.abs(Math.sin(this.elapsed * 8)) * 0.14, gz);
    this.roamingGoat.rotation.y = -this.goatAngle;

    // Spin visible collectibles
    for (const mesh of this.collectibleMeshes.values()) {
      if (!mesh.visible) continue;
      const gem = mesh.getObjectByName('spin_gem');
      if (gem) {
        gem.rotation.y += dt * 2.2;
        gem.position.y = 1.2 + Math.sin(this.elapsed * 3.5) * 0.22;
      }
    }

    // Animate quest beacon arrow bob
    if (this.questBeacon.visible) {
      const arrow = this.questBeacon.getObjectByName('beacon_arrow');
      if (arrow) {
        arrow.rotation.y += dt * 2.0;
        arrow.position.y = 7.2 + Math.sin(this.elapsed * 3.8) * 0.55;
      }
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

    // Update pooled particles
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
      _quat.setFromEuler(new THREE.Euler(p.life * 6, p.life * 4, 0));
      _mat4.compose(p.pos, _quat, _scale);
      this.particleMesh.setMatrixAt(i, _mat4);
    }
    if (anyActive) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
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
  }

  private emitHudIfDue(dt: number) {
    this.hudThrottle += dt;
    if (this.hudThrottle < 0.12) return; // <= 8.3 Hz throttled HUD updates
    this.hudThrottle = 0;

    const activeVeh = this.activeVehicleId
      ? this.liveVehicles.find((v) => v.id === this.activeVehicleId)
      : null;

    const speedVal = activeVeh ? Math.abs(activeVeh.speed) : 0;
    this.callbacks.onHudUpdate({
      playerX: this.playerX,
      playerZ: this.playerZ,
      playerYaw: this.playerYaw,
      speed: speedVal,
      speedKmh: Math.min(180, Math.round(speedVal * 4)),
      district: this.inHospital
        ? 'Hospital Interior'
        : activeVeh?.isAircraft && activeVeh.y > 4
          ? 'Kerala Sky Airspace'
          : getDistrictAt(this.playerX, this.playerZ),
      inVehicleId: this.activeVehicleId,
      inVehicleName: activeVeh?.name ?? null,
      inVehicleIsAircraft: activeVeh?.isAircraft ?? false,
      altitude: activeVeh?.isAircraft ? Math.round(activeVeh.y) : 0,
      flightState: activeVeh?.isAircraft ? activeVeh.flightState : undefined,
      inVehicleHasSiren: activeVeh?.hasSiren ?? false,
      sirenActive: activeVeh?.sirenOn ?? false,
      autopilotDestName: activeVeh?.autoLanding
        ? 'Auto-Land Runway 09'
        : this.autopilotDest?.name ?? null,
      inPool: this.inPool,
      nearby: this.activeVehicleId ? null : this.findNearestInteractable(),
      timePhase: getTimeOfDayPhase(this.timeOfDay),
      timeOfDay: this.timeOfDay,
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

  private update3DAdOverlays() {
    const showLayer = this.mode === 'playing' && !this.modalOpen && !this.inHospital;
    this.cssRenderer.domElement.style.visibility = showLayer ? 'visible' : 'hidden';

    if (!showLayer) {
      for (const s of this.adBoardPool) {
        s.obj.visible = false;
        s.el.style.pointerEvents = 'none';
      }
      for (const s of this.adBannerPool) {
        s.obj.visible = false;
        s.el.style.pointerEvents = 'none';
      }
      return;
    }

    this.camera.getWorldDirection(_v1);
    const fwdLen = Math.hypot(_v1.x, _v1.z) || 1;
    const camFwdX = _v1.x / fwdLen;
    const camFwdZ = _v1.z / fwdLen;
    const camX = this.camera.position.x;
    const camZ = this.camera.position.z;

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
      slot.assignedSurfaceId = surf.id;
      slot.obj.position.set(surf.x, surf.y, surf.z);
      slot.obj.rotation.set(0, surf.rotY, 0);
      slot.obj.scale.set(surf.widthM / 320, surf.heightM / 50, 1);
      slot.obj.visible = true;
      slot.el.style.pointerEvents = 'auto';
      slot.el.dataset.surfaceId = surf.id;
    }
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

    this.updateLighting(dt);
    this.updatePlayerAndVehicles(dt);
    this.updateTrafficAndEmergency(dt);
    this.updateHospitalInterior(dt);
    this.updateNpcsAndAmbient(dt);
    this.updateCamera(dt);
    this.update3DAdOverlays();
    this.emitHudIfDue(dt);

    this.renderer.render(this.scene, this.camera);
    this.cssRenderer.render(this.cssScene, this.camera);
    this.hydrateMounted3DAdIframes();

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
