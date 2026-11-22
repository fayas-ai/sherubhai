export type GameScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type TimeOfDayPhase = 'day' | 'sunset' | 'night';

export type ShopCategory =
  | 'tea_shop'
  | 'grocery'
  | 'bakery'
  | 'barber'
  | 'restaurant'
  | 'hotel'
  | 'mall'
  | 'bank'
  | 'car_showroom'
  | 'market'
  | 'apartment'
  | 'villa'
  | 'secret'
  | 'home'
  | 'hospital'
  | 'police_station'
  | 'fire_station'
  | 'resort';

export type SheruOutfit = 'black' | 'white' | 'gold';

export type PlayableRole =
  | 'sheru'
  | 'auto_driver'
  | 'bus_driver'
  | 'shop_owner'
  | 'ambulance_driver';

export type NpcPersonality =
  | 'arrogant'
  | 'friendly'
  | 'funny'
  | 'angry'
  | 'rich_rival'
  | 'clever'
  | 'confused'
  | 'gossip'
  | 'police'
  | 'child'
  | 'boss'
  | 'doctor'
  | 'nurse'
  | 'student'
  | 'worker'
  | 'driver'
  | 'firefighter';

export type NpcMood =
  | 'neutral'
  | 'happy'
  | 'angry'
  | 'shocked'
  | 'nervous'
  | 'jealous'
  | 'celebrating'
  | 'confused';

export type InventoryCategory = 'item' | 'gift' | 'deed' | 'key' | 'collectible' | 'vehicle';

export interface GameSettings {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  muted: boolean;
  graphicsQuality: GraphicsQuality;
  mouseSensitivity: number; // 0.3..2.0
  mobileSensitivity: number; // 0.3..2.0
  showTouchControls: boolean;
}

export interface Vec2 {
  x: number;
  z: number;
}

export interface AABB {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

export interface ShopProduct {
  id: string;
  name: string;
  mlName: string;
  priceGhop: number;
  description: string;
  category: InventoryCategory;
  funnyEffect: string;
}

export interface BuildingDef {
  id: string;
  name: string;
  mlSign: string;
  category: ShopCategory;
  district: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotationY: number;
  wallColor: number;
  roofColor: number;
  accentColor: number;
  buyable: boolean;
  purchasePrice: number;
  ownerNpcId?: string;
  oppositePlotId?: string;
  products: ShopProduct[];
}

export interface EmptyPlotDef {
  id: string;
  name: string;
  district: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  rotationY: number;
  oppositeBuildingId?: string;
  buildCost: number;
}

export interface BuiltShopRecord {
  plotId: string;
  name: string;
  category: ShopCategory;
  level: number;
  builtAt: number;
  rivalBuildingId?: string;
  customersCount: number;
}

export interface OwnedBusinessRecord {
  buildingId: string;
  customName: string;
  originalName: string;
  category: ShopCategory;
  level: number; // 1..5
  priceMultiplier: number; // 0.5..2.0 for price wars
  hiredManager?: string;
  boughtAt: number;
  revenueTickGhop: number;
}

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  personality: NpcPersonality;
  isBoss?: boolean;
  bossTitle?: string;
  homeBuildingId?: string;
  x: number;
  z: number;
  patrolRadius: number;
  shirtColor: number;
  munduColor: number;
  skinColor: number;
  accessory?:
    | 'sunglasses'
    | 'turban'
    | 'cap'
    | 'apron'
    | 'mustache'
    | 'crown'
    | 'stethoscope'
    | 'hardhat'
    | 'nurse_cap'
    | 'helmet'
    | 'backpack';
  scale?: number;
}

export interface NpcMemory {
  npcId: string;
  relationship: number; // -100..100
  timesMet: number;
  lastLineIds: string[];
  mood: NpcMood;
  boughtTheirShop: boolean;
  builtRivalShop: boolean;
  partnered: boolean;
  defeatedChallenge: boolean;
  lastInteractionTurn: number;
}

export type VehicleArchetype =
  | 'supercar'
  | 'luxury_sedan'
  | 'suv'
  | 'lambo_sport'
  | 'ferrari_sport'
  | 'bmw_sedan'
  | 'merc_sedan'
  | 'audi_sedan'
  | 'hatchback'
  | 'family_car'
  | 'jeep'
  | 'taxi'
  | 'auto'
  | 'motorcycle'
  | 'scooter'
  | 'bicycle'
  | 'delivery_van'
  | 'goods_truck'
  | 'mini_truck'
  | 'school_bus'
  | 'private_bus'
  | 'ksrtc_bus'
  | 'tourist_bus'
  | 'mini_bus'
  | 'bus'
  | 'ambulance'
  | 'police_jeep'
  | 'fire_engine'
  | 'garbage_truck'
  | 'tow_truck';

export type VehicleCategory =
  | 'luxury'
  | 'daily'
  | 'twowheeler'
  | 'commercial'
  | 'bus'
  | 'emergency';

export interface VehicleDef {
  id: string;
  name: string;
  mlName?: string;
  type: VehicleArchetype;
  category?: VehicleCategory;
  color: number;
  accentColor: number;
  x: number;
  z: number;
  rotationY: number;
  maxSpeed: number; // world units/sec (45 world u/s = 180 km/h)
  maxKmh?: number; // up to 180
  drivable: boolean;
  priceGhop?: number;
  hasSiren?: boolean;
  description?: string;
}

export interface ParkedVehicleRecord {
  vehicleId: string;
  x: number;
  z: number;
  yaw: number;
  bayName?: string;
}

export interface AutoDestination {
  id: string;
  name: string;
  mlName: string;
  x: number;
  z: number;
}

export interface EmergencyIncident {
  id: string;
  cause: 'coconut_drop' | 'crossing_hit' | 'pedestrian_bump' | 'manual_call';
  title: string;
  mlMessage: string;
  enMessage: string;
  sceneX: number;
  sceneZ: number;
  status: 'alert' | 'ambulance_en_route' | 'ambulance_arrived' | 'transporting' | 'treated';
  driverChoice?: 'auto_ambulance' | 'player_driver';
}

export interface InventoryItem {
  id: string;
  name: string;
  mlName: string;
  category: InventoryCategory;
  description: string;
  quantity: number;
  acquiredAt: number;
}

export interface BankTransaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'purchase' | 'business' | 'reward' | 'investment';
  label: string;
  amountGhop: number;
  timestamp: number;
}

export interface DialogueExchange {
  speaker: 'npc' | 'sheru' | 'narrator';
  speakerName: string;
  mlText: string;
  enSub: string;
  mood?: NpcMood;
}

export interface DialogueChoiceEffect {
  action:
    | 'buy_item'
    | 'buy_shop'
    | 'build_opposite'
    | 'negotiate'
    | 'challenge'
    | 'partner'
    | 'help'
    | 'prank'
    | 'hire'
    | 'walk_away'
    | 'open_bank'
    | 'claim_reward'
    | 'boss_win'
    | 'rename_shop';
  ghopDelta?: number;
  reputationDelta?: number;
  relationshipDelta?: number;
  itemReward?: Omit<InventoryItem, 'quantity' | 'acquiredAt'>;
  buildingId?: string;
  plotId?: string;
  npcMood?: NpcMood;
  sheruReaction?: 'celebrate' | 'laugh' | 'flex' | 'insulted' | 'walk_away';
  outcomeMl: string;
  outcomeEn: string;
  npcReplyMl: string;
  npcReplyEn: string;
  levelProgressTag?: string;
}

export interface DialogueChoice {
  id: string;
  label: string;
  sublabel?: string;
  badge?: string;
  costGhop?: number;
  disabled?: boolean;
  disabledReason?: string;
  effect: DialogueChoiceEffect;
}

export interface ActiveDialogue {
  id: string;
  sourceType: 'npc' | 'shop' | 'event' | 'boss' | 'plot' | 'collectible';
  title: string;
  npcId?: string;
  buildingId?: string;
  plotId?: string;
  eventId?: string;
  exchanges: DialogueExchange[];
  choices: DialogueChoice[];
  resolved?: {
    choiceLabel: string;
    outcomeMl: string;
    outcomeEn: string;
    npcReplyMl: string;
    npcReplyEn: string;
    ghopDelta?: number;
    reputationDelta?: number;
    unlockedNotice?: string;
  };
}

export interface RandomEventTemplate {
  id: string;
  title: string;
  districtHint?: string;
  rarity: 'common' | 'uncommon' | 'rare';
  cooldownTurns: number;
  speakerName: string;
  speakerRole: string;
  exchanges: DialogueExchange[];
  choices: DialogueChoice[];
}

export type LevelObjectiveType =
  | 'explore_building'
  | 'talk_npc'
  | 'buy_item'
  | 'buy_shop'
  | 'build_plot'
  | 'bank_action'
  | 'drive_vehicle'
  | 'collect_item'
  | 'resolve_event'
  | 'own_count'
  | 'boss_duel';

export interface LevelDefinition {
  id: number; // 1..100
  chapter: number; // 1..10
  chapterName: string;
  title: string;
  story: string;
  objectiveText: string;
  objectiveType: LevelObjectiveType;
  targetId?: string; // buildingId, npcId, vehicleId, plotId, etc.
  targetCount?: number;
  rewardGhop: number;
  rewardReputation: number;
  rewardItem?: Omit<InventoryItem, 'quantity' | 'acquiredAt'>;
  completionLineMl: string;
  completionLineEn: string;
  targetCoords?: Vec2;
}

export interface WorldCollectible {
  id: string;
  name: string;
  mlName: string;
  x: number;
  z: number;
  color: number;
  levelId?: number;
  description: string;
}

export interface NearbyInteractable {
  kind: 'npc' | 'building' | 'plot' | 'vehicle' | 'collectible' | 'event_spot' | 'ad_board';
  id: string;
  label: string;
  sublabel: string;
  distance: number;
  x: number;
  z: number;
}

export interface GameProgressState {
  version: number;
  ghopSpentTotal: number;
  ghopEarnedTotal: number;
  reputation: number; // Sheru's Town Legend Fame
  titleBadge: string;
  legendaryOutfitUnlocked: boolean;
  sheruOutfit: SheruOutfit;
  playableRole: PlayableRole;
  ownedVehicleIds: string[];
  parkedVehicles: Record<string, ParkedVehicleRecord>;
  turnCounter: number;
  currentLevelId: number;
  highestUnlockedLevel: number;
  completedLevels: number[];
  ownedBusinesses: Record<string, OwnedBusinessRecord>;
  builtShops: Record<string, BuiltShopRecord>;
  inventory: InventoryItem[];
  npcMemory: Record<string, NpcMemory>;
  bankTransactions: BankTransaction[];
  bankAccountsCount: number;
  bankInvestmentsTotal: number;
  recentEventIds: { id: string; turn: number }[];
  collectedWorldIds: string[];
  vehiclesDrivenIds: string[];
  visitedBuildingIds: string[];
  eventsResolvedCount: number;
  itemsBoughtCount: number;
  dailyStreak: number;
  bestDailyStreak: number;
  lastActiveDate: string; // YYYY-MM-DD local calendar key
  totalActiveDays: number;
  lastPlayerPos: { x: number; y: number; z: number; yaw: number };
  timeOfDay: number; // 0..1 (0.25 = bright day, 0.72 = sunset, 0.88 = night)
}

export interface HudSnapshot {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  speed: number;
  speedKmh: number;
  district: string;
  inVehicleId: string | null;
  inVehicleName: string | null;
  inVehicleHasSiren?: boolean;
  sirenActive?: boolean;
  autopilotDestName?: string | null;
  inPool?: boolean;
  nearby: NearbyInteractable | null;
  timePhase: TimeOfDayPhase;
  timeOfDay: number;
  npcs: { id: string; x: number; z: number; isBoss?: boolean }[];
  vehicles: { id: string; x: number; z: number; isEmergency?: boolean }[];
  trafficLightState?: 'ns_green' | 'ew_green' | 'yellow';
}

export interface LevelCompletionNotice {
  level: LevelDefinition;
  nextLevelId: number | null;
  legendaryUnlocked?: boolean;
}
