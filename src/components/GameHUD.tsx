import React, { useEffect, useRef, useState } from 'react';
import {
  Armchair,
  Briefcase,
  Building2,
  Car,
  Clock,
  Compass,
  Crosshair,
  Eye,
  EyeOff,
  Flame,
  Hand,
  Landmark,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Moon,
  Navigation,
  Palmtree,
  ParkingSquare,
  Pause,
  Plane,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  Siren,
  Sparkles,
  Sun,
  Sunset,
  TrainFront,
  Trophy,
  Volume2,
  VolumeX,
  Waves,
  X,
} from 'lucide-react';
import {
  AutoDestination,
  GameProgressState,
  GameSettings,
  HudSnapshot,
  LevelDefinition,
} from '../types/game';
import {
  BUILDINGS,
  CURRENCY_SYMBOL,
  EMPTY_PLOTS,
  RESORT_POOL_BOUNDS,
  WORLD_RADIUS,
} from '../data/worldData';
import { AUTO_DESTINATIONS } from '../data/vehiclesData';
import { formatGhop, getDailyStreakTier } from '../game/gameLogic';
import { AIRPORT_RUNWAY } from '../game/vehiclePhysics';
import { WORLD_RAMPS } from '../game/openWorldPhysics';
import { PurseChaseAction } from '../game/chaseLogic';
import {
  BEACH_ZONE,
  RAILWAY_STATIONS,
  RAIL_MAX_X,
  RAIL_MAX_Z,
  RAIL_MIN_X,
  RAIL_MIN_Z,
} from '../game/railwayLogic';
import {
  formatCompactObjective,
  readMinimapPreference,
  toggleHudMenu,
  toggleMinimapVisibility,
  writeMinimapPreference,
} from '../game/hudPreferences';

interface GameHUDProps {
  hud: HudSnapshot;
  progress: GameProgressState;
  activeLevel: LevelDefinition;
  settings: GameSettings;
  toastMessage: string | null;
  roadEgoBanner: { ml: string; en: string } | null;
  onOpenLevels: () => void;
  onOpenEmpire: () => void;
  onOpenBank: () => void;
  onOpenInventory: () => void;
  onOpenGarage: () => void;
  onGoToAirport: () => void;
  onGoToScenicSpot: (spotId: string) => void;
  onBoardTrain: (mode: 'driver' | 'passenger') => void;
  onAlightTrain: () => void;
  onWaitForTrain: () => void;
  onCycleTrainView: () => void;
  onTrainHorn: () => void;
  onTrainThrottle: (throttle: number) => void;
  onToggleSitBench: () => void;
  onTriggerAutoLand: () => void;
  onOpenWardrobe: () => void;
  onCallEmergency108: () => void;
  onSelectAutopilot: (dest: AutoDestination | null) => void;
  onToggleSiren: () => void;
  onParkVehicle: () => void;
  onTriggerRandomEvent: () => void;
  onStartPurseChase: () => void;
  onChaseAction: (action: PurseChaseAction) => void;
  onCycleTime: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onInteractClick: () => void;
  onJumpClick: () => void;
  onTeleportToObjective: () => void;
  onTouchMove: (x: number, y: number, running: boolean) => void;
  onTouchFlightVertical?: (dir: -1 | 0 | 1) => void;
  onTouchLook: (dx: number, dy: number) => void;
}

const ROLE_SHORT_LABELS: Record<GameProgressState['playableRole'], string> = {
  sheru: 'SHERU BHAI',
  auto_driver: 'AUTO DRIVER',
  bus_driver: 'BUS DRIVER',
  shop_owner: 'SHOP OWNER',
  ambulance_driver: '108 DRIVER',
};

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  progress,
  activeLevel,
  settings,
  toastMessage,
  roadEgoBanner,
  onOpenLevels,
  onOpenEmpire,
  onOpenBank,
  onOpenInventory,
  onOpenGarage,
  onGoToAirport,
  onGoToScenicSpot,
  onBoardTrain,
  onAlightTrain,
  onWaitForTrain,
  onCycleTrainView,
  onTrainHorn,
  onTrainThrottle,
  onToggleSitBench,
  onTriggerAutoLand,
  onOpenWardrobe,
  onCallEmergency108,
  onSelectAutopilot,
  onToggleSiren,
  onParkVehicle,
  onTriggerRandomEvent,
  onStartPurseChase,
  onChaseAction,
  onCycleTime,
  onToggleMute,
  onPause,
  onInteractClick,
  onJumpClick,
  onTeleportToObjective,
  onTouchMove,
  onTouchFlightVertical,
  onTouchLook,
}) => {
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const [touchRunning, setTouchRunning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(() =>
    typeof window === 'undefined'
      ? true
      : readMinimapPreference(window.localStorage, window.innerWidth),
  );
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0 });
  const joyOrigin = useRef<{ x: number; y: number; id: number } | null>(null);
  const lookLast = useRef<{ x: number; y: number; id: number } | null>(null);

  const handleToggleMinimap = () => {
    setShowMinimap((prev) => {
      const next = toggleMinimapVisibility(prev);
      if (typeof window !== 'undefined') {
        writeMinimapPreference(next, window.localStorage);
      }
      return next;
    });
  };

  const runMenuAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === 'KeyN') {
        setShowMinimap((prev) => {
          const next = toggleMinimapVisibility(prev);
          writeMinimapPreference(next, window.localStorage);
          return next;
        });
      } else if (e.code === 'Tab') {
        e.preventDefault();
        setMenuOpen((prev) => toggleHudMenu(prev));
      } else if (e.code === 'Escape' && menuOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [menuOpen]);

  const streakCount = Math.max(1, progress.dailyStreak || 1);
  const bestStreak = Math.max(streakCount, progress.bestDailyStreak || 1);
  const totalDays = Math.max(1, progress.totalActiveDays || 1);
  const streakTier = getDailyStreakTier(streakCount);

  const isMobileViewport =
    typeof window !== 'undefined' &&
    (window.innerWidth < 820 || 'ontouchstart' in window || settings.showTouchControls);

  const ownedCount =
    Object.keys(progress.ownedBusinesses).length + Object.keys(progress.builtShops).length;

  const roleBadge =
    progress.playableRole === 'sheru'
      ? `${progress.sheruOutfit.toUpperCase()} SUIT`
      : ROLE_SHORT_LABELS[progress.playableRole];

  // Draw crisp 2D Kerala town minimap (with Roads, Hospital +, Resort Pool, Emergency Vehicles)
  useEffect(() => {
    if (!showMinimap) return;
    const canvas = minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = (w / 2 - 8) / WORLD_RADIUS;

    ctx.clearRect(0, 0, w, h);

    // Circular tropical ground background
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#1b3526';
    ctx.fillRect(0, 0, w, h);

    // Golden Malabar Beach & Arabian Sea along South edge
    const beachY = cy + BEACH_ZONE.sandStartZ * scale;
    const seaY = cy + (BEACH_ZONE.shorelineZ - 4) * scale;
    ctx.fillStyle = '#d4b478';
    ctx.fillRect(0, beachY, w, Math.max(4, seaY - beachY));
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, seaY, w, Math.max(8, h - seaY));

    // Double-Track Kerala Railway Perimeter Loop
    const railX = cx + RAIL_MIN_X * scale;
    const railY = cy + RAIL_MIN_Z * scale;
    const railW = (RAIL_MAX_X - RAIL_MIN_X) * scale;
    const railH = (RAIL_MAX_Z - RAIL_MIN_Z) * scale;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.2;
    ctx.strokeRect(railX, railY, railW, railH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(railX, railY, railW, railH);
    ctx.setLineDash([]);

    // Roads (Main Cross + Outer Ring Boulevards matching TOWN_ROADS)
    ctx.fillStyle = '#474f57';
    // mainRoadNS runs cleanly straight north into the Airport Apron & south to Malabar Beach
    ctx.fillRect(cx - 3, cy - 126 * scale, 6, 300 * scale);
    ctx.fillRect(0, cy - 4 * scale - 3, w, 6);
    ctx.fillRect(0, cy - 32 * scale - 2, w, 4);
    ctx.fillRect(0, cy + 34 * scale - 2, w, 4);
    ctx.fillRect(0, cy - 72 * scale - 2, w, 4);
    ctx.fillRect(0, cy + 72 * scale - 2, w, 4);
    ctx.fillRect(0, cy + 104 * scale - 2, w, 4);
    ctx.fillRect(cx - 76 * scale - 2, 0, 4, h);
    ctx.fillRect(cx + 80 * scale - 2, 0, 4, h);
    ctx.fillRect(cx - 108 * scale - 2, 0, 4, h);
    ctx.fillRect(cx + 108 * scale - 2, 0, 4, h);

    // Golden Sheru Bhai Statue Roundabout Marker at Main Junction (0, -4)
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(cx, cy - 4 * scale, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Kerala International Airport Runway (09/27) & Apron strip at North end of town
    const rwX = cx + AIRPORT_RUNWAY.centerX * scale;
    const rwZ = cy + AIRPORT_RUNWAY.centerZ * scale;
    const rwLenPx = AIRPORT_RUNWAY.length * scale;
    const rwWPx = Math.max(5, AIRPORT_RUNWAY.width * scale);
    ctx.fillStyle = '#334155';
    ctx.fillRect(rwX - rwLenPx / 2, rwZ - rwWPx / 2, rwLenPx, rwWPx);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(rwX - rwLenPx / 2 + 2, rwZ);
    ctx.lineTo(rwX + rwLenPx / 2 - 2, rwZ);
    ctx.stroke();
    ctx.setLineDash([]);

    // Resort Turquoise Swimming Pool
    const poolX = cx + ((RESORT_POOL_BOUNDS.minX + RESORT_POOL_BOUNDS.maxX) / 2) * scale;
    const poolZ = cy + ((RESORT_POOL_BOUNDS.minZ + RESORT_POOL_BOUNDS.maxZ) / 2) * scale;
    const poolW = Math.max(5, (RESORT_POOL_BOUNDS.maxX - RESORT_POOL_BOUNDS.minX) * scale);
    const poolD = Math.max(4, (RESORT_POOL_BOUNDS.maxZ - RESORT_POOL_BOUNDS.minZ) * scale);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(poolX - poolW / 2, poolZ - poolD / 2, poolW, poolD);

    // Open-World Stunt Ramps (amber launch rectangles)
    for (const ramp of WORLD_RAMPS) {
      const rx = cx + ramp.x * scale;
      const rz = cy + ramp.z * scale;
      ctx.save();
      ctx.translate(rx, rz);
      ctx.rotate(-ramp.yaw);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-2.4, -3.6, 4.8, 7.2);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-2.4, -3.6, 4.8, 7.2);
      ctx.restore();
    }

    // Buildings
    for (const b of BUILDINGS) {
      const bx = cx + b.x * scale;
      const bz = cy + b.z * scale;
      const bw = Math.max(5, b.width * scale);
      const bd = Math.max(4, b.depth * scale);
      const isOwned = Boolean(progress.ownedBusinesses[b.id]);

      if (b.category === 'hospital') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx - bw / 2, bz - bd / 2, bw, bd);
        // Red medical cross
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(bx - 1, bz - 3, 2, 6);
        ctx.fillRect(bx - 3, bz - 1, 6, 2);
      } else {
        ctx.fillStyle = isOwned
          ? '#ffd166'
          : b.category === 'bank'
            ? '#4cc9f0'
            : b.category === 'police_station'
              ? '#3b82f6'
              : b.category === 'fire_station'
                ? '#f97316'
                : b.category === 'home'
                  ? '#c084fc'
                  : b.category === 'resort'
                    ? '#06b6d4'
                    : '#c98a5b';
        ctx.fillRect(bx - bw / 2, bz - bd / 2, bw, bd);
      }
    }

    // Empty / Built Plots
    for (const p of EMPTY_PLOTS) {
      const px = cx + p.x * scale;
      const pz = cy + p.z * scale;
      ctx.fillStyle = progress.builtShops[p.id] ? '#ffd166' : '#80ed99';
      ctx.fillRect(px - 3, pz - 3, 6, 6);
    }

    // Active Quest Target Beacon
    if (activeLevel.targetCoords) {
      const tx = cx + activeLevel.targetCoords.x * scale;
      const tz = cy + activeLevel.targetCoords.z * scale;
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, tz, 6.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Vehicles & Aeroplanes on minimap (sky-blue for Aeroplanes, red for 108 Emergency)
    for (const v of hud.vehicles) {
      const vx = cx + v.x * scale;
      const vz = cy + v.z * scale;
      if (v.isAircraft) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(vx, vz, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (v.isEmergency) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(vx, vz, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(vx - 1.5, vz - 1.5, 3, 3);
      }
    }

    // NPC dots (red-gold for Bosses)
    for (const n of hud.npcs) {
      const nx = cx + n.x * scale;
      const nz = cy + n.z * scale;
      ctx.fillStyle = n.isBoss ? '#ff4d6d' : '#f4f1de';
      ctx.beginPath();
      ctx.arc(nx, nz, n.isBoss ? 3.2 : 1.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4 Kerala Railway Stations (Yellow/Black Indian Railways Station Markers)
    for (const st of RAILWAY_STATIONS) {
      const sx = cx + st.centerX * scale;
      const sz = cy + st.centerZ * scale;
      ctx.fillStyle = '#facc15';
      ctx.fillRect(sx - 4, sz - 3, 8, 6);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - 4, sz - 3, 8, 6);
    }

    // 4 Live Moving Kerala Trains (Track A & Track B opposite-direction express markers)
    if (hud.trains) {
      for (const tr of hud.trains) {
        const tx = cx + tr.x * scale;
        const tz = cy + tr.z * scale;
        ctx.save();
        ctx.translate(tx, tz);
        ctx.rotate(-tr.yaw);
        ctx.fillStyle = tr.track === 'A' ? '#38bdf8' : '#f97316';
        ctx.fillRect(-2.2, -5.5, 4.4, 11);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-2.2, -5.5, 4.4, 11);
        ctx.restore();
      }
    }

    // Active Pickpocket Thief Blip on Minimap (High-contrast red & gold radar ring!)
    if (hud.activeChase?.active) {
      const tx = cx + hud.activeChase.thiefX * scale;
      const tz = cy + hud.activeChase.thiefZ * scale;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, tz, 6.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(tx, tz, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sheru Bhai Arrow
    const px = cx + hud.playerX * scale;
    const pz = cy + hud.playerZ * scale;
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-hud.playerYaw + Math.PI);
    ctx.fillStyle = '#ffbe0b';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    // Brass rim border
    ctx.strokeStyle = '#d4a12a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }, [hud, progress.ownedBusinesses, progress.builtShops, activeLevel.targetCoords, showMinimap]);

  const handleJoyStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    joyOrigin.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      id: e.pointerId,
    };
  };

  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joyOrigin.current || joyOrigin.current.id !== e.pointerId) return;
    const maxR = 38;
    const dx = e.clientX - joyOrigin.current.x;
    const dy = e.clientY - joyOrigin.current.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;
    setJoyKnob({ x: kx, y: ky });
    onTouchMove(kx / maxR, ky / maxR, touchRunning);
  };

  const handleJoyEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joyOrigin.current || joyOrigin.current.id !== e.pointerId) return;
    joyOrigin.current = null;
    setJoyKnob({ x: 0, y: 0 });
    onTouchMove(0, 0, touchRunning);
  };

  const handleLookStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    lookLast.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };

  const handleLookMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!lookLast.current || lookLast.current.id !== e.pointerId) return;
    const dx = e.clientX - lookLast.current.x;
    const dy = e.clientY - lookLast.current.y;
    lookLast.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    onTouchLook(dx, dy);
  };

  const handleLookEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookLast.current && lookLast.current.id === e.pointerId) {
      lookLast.current = null;
    }
  };

  const speedKmh = hud.speedKmh ?? Math.min(180, Math.round(hud.speed * 4));
  const speedPct = Math.min(100, Math.round((speedKmh / 180) * 100));

  const isWindowSeatView =
    hud.railway?.riderMode === 'passenger' &&
    (hud.railway.seatView === 'left_window' || hud.railway.seatView === 'right_window');

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
      {/* Subtle Authentic Indian Railways Coach Window Frame when riding in Window Seat */}
      {isWindowSeatView && (
        <div
          aria-hidden="true"
          data-testid="train-window-frame"
          className="fixed inset-0 z-0 pointer-events-none"
        >
          {/* Thin brushed coach bulkhead top & bottom window sill */}
          <div className="absolute top-0 inset-x-0 h-3 bg-[#172554]/85 border-b-2 border-[#93c5fd]/55" />
          <div className="absolute bottom-0 inset-x-0 h-4 bg-[#172554]/85 border-t-2 border-[#93c5fd]/55" />
          {/* Side window mullions (keep central 88% panoramic vista 100% open!) */}
          <div className="absolute inset-y-0 left-0 w-3 sm:w-5 bg-[#1e3a8a]/80 border-r-2 border-[#cbd5e1]/50" />
          <div className="absolute inset-y-0 right-0 w-3 sm:w-5 bg-[#1e3a8a]/80 border-l-2 border-[#cbd5e1]/50" />
          {/* Classic subtle horizontal Indian Railways window guard rail near bottom edge */}
          <div className="absolute bottom-[18%] inset-x-3 sm:inset-x-5 h-[2px] bg-[#cbd5e1]/35" />
        </div>
      )}

      {/* Invisible outside-click backdrop when Town Menu drawer is open */}
      {menuOpen && (
        <div
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-10 pointer-events-auto"
        />
      )}

      {/* TOP BAR: Minimal Unobstructed Perimeter Clusters (>= 88% Clear 3D World) */}
      <div className="relative z-20 flex items-start justify-between gap-2">
        {/* Top-Left: Compact Status Plaque + Single-Line Objective Strip */}
        <div className="flex flex-col gap-1.5 min-w-0 max-w-[228px] sm:max-w-[292px]">
          <div className="pointer-events-auto rounded-lg bg-[#111d17]/90 border border-[#d4a12a]/85 px-2.5 sm:px-3 py-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between gap-2.5">
              <div
                className="font-display font-extrabold text-sm sm:text-lg text-[#ffd166] leading-none tabular-nums hud-text-stroke truncate"
                data-testid="ghop-balance"
              >
                {CURRENCY_SYMBOL} UNLIMITED
              </div>
              <div className="flex items-baseline gap-1 border-l border-[#d4a12a]/35 pl-2.5 shrink-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#9ae6b4]">
                  FAME
                </span>
                <span className="font-display font-extrabold text-xs sm:text-sm text-[#fff8e7] tabular-nums leading-none">
                  {Math.round(progress.reputation)}
                </span>
              </div>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[#cfe0d5] leading-none">
              <MapPin className="w-3 h-3 text-[#f5c542] shrink-0" />
              <span className="font-semibold truncate">{hud.district}</span>
              <span aria-hidden="true" className="text-[#d4a12a]/70">
                ·
              </span>
              <span className="text-[#d4a12a] font-bold truncate">{roleBadge}</span>
            </div>
          </div>

          {/* Slim Single-Line Active Objective Strip */}
          <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-lg bg-[#14231c]/88 border border-[#d4a12a]/55 px-2.5 py-1 shadow-[0_3px_10px_rgba(0,0,0,0.38)]">
            <div className="min-w-0 truncate text-[11px] leading-tight">
              <span className="font-extrabold text-[#ffd166] tabular-nums">
                LV.{activeLevel.id}
              </span>
              <span aria-hidden="true" className="mx-1 text-[#d4a12a]/70">
                ·
              </span>
              <span className="font-semibold text-[#fff8e7]" title={activeLevel.objectiveText}>
                {formatCompactObjective(activeLevel.objectiveText, 38)}
              </span>
            </div>
            {activeLevel.targetCoords && (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTeleportToObjective();
                }}
                aria-label="Fast Travel to Active Level Target"
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17] text-[10px] font-extrabold cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Compass className="w-3 h-3" />
                GO
              </button>
            )}
          </div>
        </div>

        {/* Top-Right: Single Compact 4-Button Bar + Collapsible Town Menu Drawer */}
        <div className="pointer-events-auto relative flex flex-col items-end shrink-0">
          <div className="flex items-center gap-1.5 flex-nowrap">
            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-start-chase"
              aria-label="Start Pickpocket Purse Chase"
              title="Catch Purse Snatcher [C]"
              onClick={(e) => {
                e.currentTarget.blur();
                setMenuOpen(false);
                onStartPurseChase();
              }}
              className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-[#9a3412]/95 hover:bg-[#c2410c] border border-[#fdba74]/90 text-[#fff7ed] text-xs font-extrabold shadow cursor-pointer whitespace-nowrap shrink-0"
            >
              <ShieldAlert className="w-4 h-4 text-[#fde047] shrink-0" />
              <span className="hidden sm:inline">Catch Thief</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="hud-town-menu"
              aria-label={menuOpen ? 'Close Town Menu' : 'Open Town Menu'}
              title="Town Menu [Tab]"
              onClick={(e) => {
                e.currentTarget.blur();
                setMenuOpen((prev) => toggleHudMenu(prev));
              }}
              className={`flex items-center gap-1.5 h-9 px-2.5 rounded-lg border text-xs font-extrabold shadow cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                menuOpen
                  ? 'bg-[#f5c542] border-[#fff8e7] text-[#141a17]'
                  : 'bg-[#111d17]/92 hover:bg-[#1c3227] border-[#d4a12a]/85 text-[#ffd166]'
              }`}
            >
              {menuOpen ? (
                <X className="w-4 h-4 shrink-0" />
              ) : (
                <LayoutGrid className="w-4 h-4 shrink-0" />
              )}
              <span>Menu</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label={settings.muted ? 'Unmute Audio' : 'Mute Audio'}
              title={settings.muted ? 'Unmute [M]' : 'Mute [M]'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#111d17]/92 hover:bg-[#1c3227] border border-[#d4a12a]/75 text-[#fff8e7] shadow cursor-pointer shrink-0"
            >
              {settings.muted ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Pause Game"
              title="Pause [P]"
              onClick={(e) => {
                e.currentTarget.blur();
                setMenuOpen(false);
                onPause();
              }}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#111d17]/92 hover:bg-[#1c3227] border border-[#d4a12a]/75 text-[#fff8e7] shadow cursor-pointer shrink-0"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          {/* Collapsible Town Menu Popover (All Secondary Actions Organized Off-Screen Until Needed) */}
          {menuOpen && (
            <div
              id="hud-town-menu"
              data-testid="hud-town-menu"
              className="mt-2 w-[272px] sm:w-[308px] rounded-xl bg-[#101c16]/96 border-2 border-[#d4a12a] p-2.5 shadow-[0_14px_36px_rgba(0,0,0,0.75)]"
            >
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-open-garage"
                  aria-label="Open Vehicle Garage and Aeroplanes"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    runMenuAction(onOpenGarage);
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#182c22] hover:bg-[#223d30] border border-[#d4a12a]/55 text-[#ffd166] text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  <Car className="w-4 h-4 shrink-0" />
                  <span className="truncate">Garage [G]</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-open-wardrobe"
                  aria-label="Open Home Wardrobe and Role Switch"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    runMenuAction(onOpenWardrobe);
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#182c22] hover:bg-[#223d30] border border-[#d4a12a]/55 text-[#fff8e7] text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  <Shirt className="w-4 h-4 text-[#c084fc] shrink-0" />
                  <span className="truncate">Suit / Role [U]</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-call-108"
                  aria-label="Call 108 Emergency Ambulance"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    runMenuAction(onCallEmergency108);
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#991b1b]/90 hover:bg-[#b91c1c] border border-[#fca5a5]/70 text-white text-xs font-extrabold cursor-pointer whitespace-nowrap"
                >
                  <Siren className="w-4 h-4 text-[#fde047] shrink-0" />
                  <span className="truncate">108 Ambulance</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-goto-airport"
                  aria-label="Fast Travel to Kerala Airport and Runway"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    runMenuAction(onGoToAirport);
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#0c4a6e]/90 hover:bg-[#0369a1] border border-[#38bdf8]/75 text-[#e0f2fe] text-xs font-extrabold cursor-pointer whitespace-nowrap"
                >
                  <Plane className="w-4 h-4 text-[#7dd3fc] shrink-0" />
                  <span className="truncate">Airport</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Open 100 Levels Campaign"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    runMenuAction(onOpenLevels);
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#182c22] hover:bg-[#223d30] border border-[#d4a12a]/45 text-[#ffd166] text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  <Trophy className="w-4 h-4 shrink-0" />
                  <span className="truncate tabular-nums">Levels (Lv.{activeLevel.id})</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Open Business Empire"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    runMenuAction(onOpenEmpire);
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#182c22] hover:bg-[#223d30] border border-[#d4a12a]/45 text-[#fff8e7] text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  <Building2 className="w-4 h-4 text-[#f5c542] shrink-0" />
                  <span className="truncate tabular-nums">Empire ({ownedCount})</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Open GHOP GHOP International Bank"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    runMenuAction(onOpenBank);
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#182c22] hover:bg-[#223d30] border border-[#d4a12a]/45 text-[#fff8e7] text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  <Landmark className="w-4 h-4 text-[#4cc9f0] shrink-0" />
                  <span className="truncate">GHOP Bank</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Open Inventory Bag"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    runMenuAction(onOpenInventory);
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#182c22] hover:bg-[#223d30] border border-[#d4a12a]/45 text-[#fff8e7] text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  <Briefcase className="w-4 h-4 text-[#9ae6b4] shrink-0" />
                  <span className="truncate tabular-nums">Bag ({progress.inventory.length})</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Trigger Random Street Event"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    runMenuAction(onTriggerRandomEvent);
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#5b2611]/90 hover:bg-[#7c3417] border border-[#ffd166]/60 text-[#ffd166] text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span className="truncate">Street Event [R]</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Cycle Day, Sunset, and Night"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onCycleTime();
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#182c22] hover:bg-[#223d30] border border-[#d4a12a]/45 text-[#ffd166] text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  {hud.timePhase === 'day' ? (
                    <Sun className="w-4 h-4 shrink-0" />
                  ) : hud.timePhase === 'sunset' ? (
                    <Sunset className="w-4 h-4 shrink-0" />
                  ) : (
                    <Moon className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate capitalize">
                    Time: {hud.timePhase} [T]
                  </span>
                </button>
              </div>

              {/* Malabar Beach & 4 Kerala Railway Stations Quick Travel */}
              <div className="mt-2.5 pt-2 border-t border-[#d4a12a]/30">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#9ae6b4] mb-1.5 flex items-center justify-between">
                  <span>Beach &amp; 4 Railway Stations</span>
                  <span className="text-[#fde047]">PF 1 L→R · PF B R→L</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="hud-goto-beach"
                    aria-label="Go to Malabar Golden Beach and Benches"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      runMenuAction(() => onGoToScenicSpot('beach'));
                    }}
                    className="col-span-2 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0369a1]/90 hover:bg-[#0284c7] border border-[#7dd3fc]/75 text-[#f0f9ff] text-xs font-extrabold cursor-pointer whitespace-nowrap"
                  >
                    <Palmtree className="w-3.5 h-3.5 text-[#fde047] shrink-0" />
                    <span>Malabar Beach &amp; Sea Benches</span>
                  </button>
                  {RAILWAY_STATIONS.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      tabIndex={-1}
                      data-testid={`hud-goto-${st.id}`}
                      aria-label={`Go to ${st.name} Railway Station`}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        runMenuAction(() => onGoToScenicSpot(st.id));
                      }}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#1c2b22] hover:bg-[#274032] border border-[#facc15]/50 text-[#fef08a] text-[11px] font-bold cursor-pointer whitespace-nowrap"
                    >
                      <TrainFront className="w-3.5 h-3.5 text-[#facc15] shrink-0" />
                      <span className="truncate">
                        {st.code} · {st.name.replace(' Halt', '').replace(' Stn.', '').replace(' Jn.', '')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Clean Unboxed Daily Streak & Spend Summary */}
              <div
                data-testid="daily-streak-badge"
                className="mt-2.5 pt-2 border-t border-[#d4a12a]/30 flex items-center justify-between gap-2 text-[11px] text-[#cfe0d5]"
              >
                <span className="flex items-center gap-1.5 font-bold text-[#ffd166] tabular-nums">
                  <Flame className="w-3.5 h-3.5 text-[#fbbf24] fill-[#f59e0b] shrink-0" />
                  Day {streakCount} · {streakTier.label}
                </span>
                <span className="text-[10px] text-[#9ae6b4] tabular-nums truncate">
                  Best {bestStreak}d · {totalDays}v · {formatGhop(progress.ghopSpentTotal)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CENTER-TOP FLOATING NOTIFICATIONS (Toast, Road Ego Speech, Pool Swimming) */}
      <div className="flex flex-col items-center gap-1.5 mt-1">
        {roadEgoBanner && (
          <div className="max-w-lg px-4 py-2 rounded-xl bg-[#241911]/95 border-2 border-[#f97316] shadow-lg text-center">
            <div className="font-ml font-bold text-xs sm:text-sm text-[#fde047]">
              {roadEgoBanner.ml}
            </div>
            <div className="text-[11px] text-[#fed7aa]">{roadEgoBanner.en}</div>
          </div>
        )}

        {toastMessage && (
          <div className="px-4 py-1.5 rounded-lg bg-[#13261d]/95 border-2 border-[#f5c542] text-[#ffd166] font-display font-bold text-xs sm:text-sm shadow-lg text-center">
            {toastMessage}
          </div>
        )}

        {hud.inPool && (
          <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-[#0e7490]/95 border border-[#67e8f9] text-white text-xs font-bold shadow">
            <Waves className="w-3.5 h-3.5 text-[#a5f3fc]" />
            Swimming in Sheru Pool & Resort!
          </div>
        )}

        {hud.railway?.riderMode !== 'none' && hud.railway?.passingOppositeTrainName && (
          <div
            data-testid="opposite-train-banner"
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-[#1e3a8a]/95 border border-[#facc15] text-[#fef08a] text-xs font-extrabold shadow-lg"
          >
            <TrainFront className="w-3.5 h-3.5 text-[#fde047] shrink-0" />
            <span>Passing Opposite Track: {hud.railway.passingOppositeTrainName}</span>
          </div>
        )}
      </div>

      {/* BOTTOM ROW: Contextual Interact Prompt, 180 KM/H Driving Bar + Autopilot, Minimap & Mobile Controls */}
      <div className="mt-auto flex flex-wrap sm:flex-nowrap items-end justify-between gap-2 sm:gap-3">
        {/* Mobile Left Virtual Joystick / Flight Cursor (UP = FLY, DOWN = LAND) */}
        <div className="order-2 sm:order-1 flex items-end gap-2">
          {isMobileViewport && (
            <div
              data-testid={hud.inVehicleIsAircraft ? 'mobile-flight-cursor' : 'mobile-joystick'}
              onPointerDown={handleJoyStart}
              onPointerMove={handleJoyMove}
              onPointerUp={handleJoyEnd}
              onPointerCancel={handleJoyEnd}
              aria-label={
                hud.inVehicleIsAircraft
                  ? 'Flight Cursor: Push Up to Fly, Pull Down to Land'
                  : 'Movement Joystick'
              }
              className={`pointer-events-auto relative rounded-full flex items-center justify-center touch-none select-none ${
                hud.inVehicleIsAircraft
                  ? 'w-32 h-32 bg-[#0c1d2b]/85 border-2 border-[#38bdf8] shadow-[0_4px_18px_rgba(0,0,0,0.6)]'
                  : 'w-28 h-28 bg-[#111d17]/75 border-2 border-[#d4a12a]/80'
              }`}
            >
              {hud.inVehicleIsAircraft && (
                <>
                  <span className="pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-extrabold tracking-wide text-[#7dd3fc] whitespace-nowrap">
                    ▲ FLY UP
                  </span>
                  <span className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-extrabold tracking-wide text-[#fbbf24] whitespace-nowrap">
                    ▼ LAND
                  </span>
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-[#bae6fd]">
                    ◄
                  </span>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-[#bae6fd]">
                    ►
                  </span>
                </>
              )}
              <div
                className={`w-11 h-11 rounded-full border-2 border-[#161c18] shadow-md ${
                  hud.inVehicleIsAircraft ? 'bg-[#38bdf8]' : 'bg-[#f5c542]'
                }`}
                style={{ transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)` }}
              />
            </div>
          )}
        </div>

        {/* Bottom-Center: Pickpocket Chase Action Bar + Contextual Interact Prompt / Driving Bar */}
        <div className="order-1 sm:order-2 w-full sm:w-auto flex flex-col items-center gap-1.5 mb-0 sm:mb-1 max-w-full">
          {hud.activeChase?.active && (
            <div
              data-testid="chase-action-bar"
              className="pointer-events-auto w-full sm:w-auto flex flex-col gap-1.5 px-3 py-2 rounded-xl bg-[#1a1210]/94 border border-[#ef4444]/90 shadow-[0_6px_22px_rgba(0,0,0,0.68)] max-w-[460px]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 min-w-0 text-xs font-extrabold text-[#fff8e7]">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#fde047] shrink-0" />
                  <span className="truncate">
                    {hud.activeChase.itemDropped || hud.activeChase.phase === 'caught'
                      ? 'CAUGHT · Purse dropped! Hand to Police'
                      : `PANICKED · Thief fleeing (${hud.activeChase.distance}m)`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold text-[#fde047] tabular-nums">
                    {hud.activeChase.thiefHp}%
                  </span>
                  <div className="w-16 h-1.5 rounded bg-[#3b1c1c] overflow-hidden border border-[#ef4444]/50">
                    <div
                      className={`h-full transition-all duration-150 ${
                        hud.activeChase.phase === 'caught' ? 'bg-[#38bdf8]' : 'bg-[#ef4444]'
                      }`}
                      style={{ width: `${hud.activeChase.thiefHp}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="chase-btn-gun"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onChaseAction('gun');
                  }}
                  className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg font-display font-extrabold text-xs border transition-transform active:scale-95 cursor-pointer whitespace-nowrap ${
                    hud.activeChase.canGun && hud.activeChase.phase !== 'caught'
                      ? 'bg-[#f59e0b] hover:bg-[#fbbf24] border-[#fef08a] text-[#141a17]'
                      : 'bg-[#2b2319] hover:bg-[#3a2e20] border-[#785c2a] text-[#fcd34d]'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5 shrink-0" />
                  <span>Gun [1]</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="chase-btn-slap"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onChaseAction('slap');
                  }}
                  className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg font-display font-extrabold text-xs border transition-transform active:scale-95 cursor-pointer whitespace-nowrap ${
                    hud.activeChase.canSlap
                      ? 'bg-[#ea580c] hover:bg-[#f97316] border-[#fed7aa] text-white'
                      : 'bg-[#2b1d17] hover:bg-[#3a261e] border-[#7c3d22] text-[#fdba74]'
                  }`}
                >
                  <Hand className="w-3.5 h-3.5 shrink-0" />
                  <span>Slap [2]</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="chase-btn-police"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onChaseAction('police');
                  }}
                  className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg font-display font-extrabold text-xs border transition-transform active:scale-95 cursor-pointer whitespace-nowrap ${
                    hud.activeChase.canHandToPolice
                      ? 'bg-[#2563eb] hover:bg-[#3b82f6] border-[#fde047] text-white shadow-[0_0_10px_rgba(59,130,246,0.6)]'
                      : 'bg-[#172338] hover:bg-[#1e2f4d] border-[#3b5580] text-[#93c5fd]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Police [3]</span>
                </button>
              </div>
            </div>
          )}

          {hud.inVehicleName && hud.inVehicleIsAircraft ? (
            <div
              data-testid="flight-hud"
              className="pointer-events-auto w-full sm:w-auto flex flex-col gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl bg-[#0c1d2b]/95 border-2 border-[#38bdf8] shadow-[0_8px_28px_rgba(0,0,0,0.7)] max-w-full sm:max-w-[94vw]"
            >
              {hud.offRunwayWarning && (
                <div
                  data-testid="off-runway-warning"
                  className="px-2.5 py-1 rounded-lg bg-[#991b1b] border border-[#fde047] text-[#fef08a] text-[10px] sm:text-xs font-extrabold text-center tracking-wide animate-pulse"
                >
                  ⚠ OFF-RUNWAY! ROAD LANDING = BLAST! LAND ON RUNWAY 09/27 OR PRESS AUTO-LAND
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#7dd3fc]">
                    <span>
                      {isMobileViewport
                        ? 'CURSOR ▲ FLY UP · ▼ LAND · ◄► TURN'
                        : 'EASY FLIGHT · W THROTTLE · A/D TURN · SPACE CLIMB · SHIFT LAND'}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                        hud.flightState === 'airborne'
                          ? 'bg-[#0284c7] text-white'
                          : hud.flightState === 'takeoff_ready'
                            ? 'bg-[#16a34a] text-white'
                            : 'bg-[#f5c542] text-[#141a17]'
                      }`}
                    >
                      {hud.flightState === 'airborne'
                        ? 'AIRBORNE'
                        : hud.flightState === 'takeoff_ready'
                          ? 'TAKEOFF READY · FLY UP'
                          : 'RUNWAY TAXI'}
                    </span>
                  </div>
                  <div className="font-display font-extrabold text-sm sm:text-base text-[#fff8e7] flex items-center gap-1.5">
                    <Plane className="w-4 h-4 text-[#38bdf8]" />
                    {hud.inVehicleName}
                  </div>
                </div>

                {/* Live Airspeed & Altitude Gauges */}
                <div className="flex items-center gap-3">
                  <div className="text-right border-r border-[#38bdf8]/30 pr-3">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#7dd3fc]">
                      ALTITUDE
                    </div>
                    <div
                      data-testid="flight-altitude"
                      className="font-display font-extrabold text-xl sm:text-2xl text-[#fde047] tabular-nums leading-none"
                    >
                      {hud.altitude ?? 0}{' '}
                      <span className="text-[11px] font-bold text-[#d9e5dc]">M</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      data-testid="speedometer-kmh"
                      className="font-display font-extrabold text-xl sm:text-2xl text-[#9ae6b4] tabular-nums leading-none"
                    >
                      {speedKmh}{' '}
                      <span className="text-[11px] font-bold text-[#d9e5dc]">KM/H</span>
                    </div>
                    <div className="w-24 h-1.5 rounded bg-[#163247] overflow-hidden mt-1">
                      <div
                        className="h-full bg-[#38bdf8] transition-all duration-100"
                        style={{ width: `${speedPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[#38bdf8]/30">
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="auto-land-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onTriggerAutoLand();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold text-xs cursor-pointer"
                >
                  <Plane className="w-3.5 h-3.5" />
                  {hud.autopilotDestName ? 'CANCEL AUTO-LAND' : 'AUTO-LAND ON RUNWAY'}
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onInteractClick();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#f5c542] hover:bg-[#ffd566] text-[#151a17] font-extrabold text-xs cursor-pointer"
                >
                  EXIT PLANE [E]
                </button>
              </div>
            </div>
          ) : hud.inVehicleName ? (
            <div
              data-testid="driving-hud"
              className="pointer-events-auto flex flex-col gap-1.5 px-3 py-2 rounded-xl bg-[#111d17]/94 border border-[#f5c542]/90 shadow-[0_6px_22px_rgba(0,0,0,0.62)] max-w-[92vw]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-display font-extrabold text-xs sm:text-sm text-[#fff8e7] truncate">
                    {hud.inVehicleName}
                  </div>
                  {hud.autopilotDestName && (
                    <div className="text-[10px] font-bold text-[#7dd3fc] truncate">
                      Auto → {hud.autopilotDestName}
                    </div>
                  )}
                </div>

                {/* Live 0..180 KM/H Speedometer */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div
                      data-testid="speedometer-kmh"
                      className="font-display font-extrabold text-lg sm:text-xl text-[#9ae6b4] tabular-nums leading-none"
                    >
                      {speedKmh}{' '}
                      <span className="text-[10px] font-bold text-[#d9e5dc]">KM/H</span>
                    </div>
                    <div className="w-20 h-1 rounded bg-[#1f3329] overflow-hidden mt-1">
                      <div
                        className="h-full bg-[#f5c542] transition-all duration-100"
                        style={{ width: `${speedPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Row: Auto-Destination, Siren, Park, Exit */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[#d4a12a]/30">
                <div className="flex items-center gap-1 bg-[#192b22] border border-[#d4a12a]/50 rounded-lg px-2 py-1">
                  <Navigation className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                  <select
                    aria-label="Auto-Destination Autopilot"
                    data-testid="autopilot-select"
                    value={
                      hud.autopilotDestName
                        ? AUTO_DESTINATIONS.find((d) => d.name === hud.autopilotDestName)?.id ?? ''
                        : ''
                    }
                    onChange={(e) => {
                      const dest = AUTO_DESTINATIONS.find((d) => d.id === e.target.value) ?? null;
                      onSelectAutopilot(dest);
                      e.currentTarget.blur();
                    }}
                    className="bg-transparent text-[#fff8e7] text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="" className="bg-[#111d17]">
                      Auto-Destination (Off)
                    </option>
                    {AUTO_DESTINATIONS.map((d) => (
                      <option key={d.id} value={d.id} className="bg-[#111d17]">
                        Auto → {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {hud.inVehicleHasSiren && (
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="toggle-siren-btn"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onToggleSiren();
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-extrabold text-xs cursor-pointer ${
                      hud.sirenActive
                        ? 'bg-[#dc2626] text-white border border-[#fde047]'
                        : 'bg-[#2a1a1a] text-[#fca5a5] border border-red-500/50 hover:bg-[#3f1d1d]'
                    }`}
                  >
                    <Siren className="w-3.5 h-3.5" />
                    {hud.sirenActive ? 'SIREN ON [X]' : 'SIREN [X]'}
                  </button>
                )}

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="park-vehicle-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onParkVehicle();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1d4ed8] hover:bg-[#2563eb] text-white font-extrabold text-xs cursor-pointer"
                >
                  <ParkingSquare className="w-3.5 h-3.5" />
                  PARK
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onInteractClick();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#f5c542] hover:bg-[#ffd566] text-[#151a17] font-extrabold text-xs cursor-pointer"
                >
                  EXIT [E]
                </button>
              </div>
            </div>
          ) : hud.sittingOnBench ? (
            <div
              data-testid="beach-bench-hud"
              className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-xl bg-[#0c2432]/92 border-2 border-[#38bdf8] shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
            >
              <Armchair className="w-5 h-5 text-[#fde047] shrink-0" />
              <div className="text-left">
                <div className="font-display font-extrabold text-xs sm:text-sm text-[#fff8e7] leading-tight">
                  {hud.sittingOnBench.label}
                </div>
                <div className="text-[11px] text-[#7dd3fc] leading-tight">
                  Arabian Sea Breeze · Drag camera to enjoy the sunset &amp; waves
                </div>
              </div>
              <button
                type="button"
                tabIndex={-1}
                data-testid="bench-stand-up-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleSitBench();
                }}
                className="px-3 py-1.5 rounded-lg bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17] font-display font-extrabold text-xs cursor-pointer whitespace-nowrap"
              >
                STAND UP [E]
              </button>
            </div>
          ) : hud.railway && hud.railway.riderMode !== 'none' ? (
            <div
              data-testid="train-hud"
              className="pointer-events-auto w-full sm:w-auto flex flex-col gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#101c2c]/95 border-2 border-[#facc15] shadow-[0_8px_28px_rgba(0,0,0,0.72)] max-w-[94vw] sm:min-w-[430px]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#fde047]">
                    <TrainFront className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {hud.railway.riderMode === 'driver'
                        ? 'LOCO PILOT CAB'
                        : 'PASSENGER · WINDOW SEAT'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#1e3a8a] text-[#bfdbfe]">
                      {hud.railway.trainTrack === 'A' ? 'PF 1 · L→R' : 'PF B · R→L'}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-extrabold ${
                        hud.railway.canAlight
                          ? 'bg-[#16a34a] text-white'
                          : 'bg-[#334155] text-[#cbd5e1]'
                      }`}
                    >
                      {hud.railway.canAlight ? 'STOPPED AT STATION' : 'IN TRANSIT'}
                    </span>
                  </div>
                  <div className="font-display font-extrabold text-sm sm:text-base text-[#fff8e7] truncate mt-0.5">
                    {hud.railway.trainNumber} {hud.railway.trainName}
                  </div>
                  <div className="text-[11px] text-[#93c5fd] truncate">
                    {hud.railway.canAlight && hud.railway.currentStationName
                      ? `Stopped at ${hud.railway.currentStationName} — Safe to get off now!`
                      : `Next Stop: ${hud.railway.nextStationName ?? 'Kerala Loop'} (${hud.railway.nextStationDistM}m)`}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    data-testid="train-speed-kmh"
                    className="font-display font-extrabold text-xl text-[#9ae6b4] tabular-nums leading-none"
                  >
                    {hud.railway.trainSpeedKmh}{' '}
                    <span className="text-[10px] font-bold text-[#d9e5dc]">KM/H</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[#facc15]/30">
                {hud.railway.riderMode === 'driver' && (
                  <>
                    <button
                      type="button"
                      tabIndex={-1}
                      data-testid="train-btn-accel"
                      onPointerDown={() => onTrainThrottle(1)}
                      onPointerUp={() => onTrainThrottle(0)}
                      onPointerLeave={() => onTrainThrottle(0)}
                      onPointerCancel={() => onTrainThrottle(0)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#15803d] hover:bg-[#16a34a] text-white font-extrabold text-xs cursor-pointer select-none"
                    >
                      THROTTLE [W]
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      data-testid="train-btn-brake"
                      onPointerDown={() => onTrainThrottle(-1)}
                      onPointerUp={() => onTrainThrottle(0)}
                      onPointerLeave={() => onTrainThrottle(0)}
                      onPointerCancel={() => onTrainThrottle(0)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#b91c1c] hover:bg-[#dc2626] text-white font-extrabold text-xs cursor-pointer select-none"
                    >
                      BRAKE [S]
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      data-testid="train-btn-horn"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onTrainHorn();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#1d4ed8] hover:bg-[#2563eb] text-white font-extrabold text-xs cursor-pointer"
                    >
                      HORN [H]
                    </button>
                  </>
                )}

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="train-btn-view"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onCycleTrainView();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] border border-[#93c5fd]/50 text-[#e0f2fe] font-extrabold text-xs cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>
                    {hud.railway.riderMode === 'driver'
                      ? hud.railway.seatView === 'outside'
                        ? 'View: Chase [C]'
                        : 'View: Driver Cab [C]'
                      : hud.railway.seatView === 'right_window'
                        ? 'Right Window [C]'
                        : hud.railway.seatView === 'left_window'
                          ? 'Left Window [C]'
                          : 'Outside Scenic [C]'}
                  </span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="train-btn-alight"
                  disabled={!hud.railway.canAlight}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onAlightTrain();
                  }}
                  className={`px-3 py-1.5 rounded-lg font-display font-extrabold text-xs whitespace-nowrap transition-colors ${
                    hud.railway.canAlight
                      ? 'bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17] cursor-pointer shadow'
                      : 'bg-[#1e293b] text-[#94a3b8] border border-[#475569] cursor-not-allowed'
                  }`}
                >
                  {hud.railway.canAlight
                    ? `GET OFF AT ${hud.railway.currentStationName?.toUpperCase() ?? 'STATION'} [E]`
                    : 'WAIT FOR STATION STOP'}
                </button>
              </div>
            </div>
          ) : hud.railway && hud.railway.atStationId ? (
            <div
              data-testid="station-platform-hud"
              className="pointer-events-auto w-full sm:w-auto flex flex-col gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#111d17]/95 border-2 border-[#facc15] shadow-[0_8px_26px_rgba(0,0,0,0.68)] max-w-[94vw] sm:min-w-[390px]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#facc15]">
                    <TrainFront className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {hud.railway.atStationName} ({hud.railway.atStationCode})
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-[#9ae6b4]">
                    {hud.railway.platformDirectionLabel} · Use Foot-Overbridge to change platform
                  </div>
                </div>
              </div>

              {hud.railway.stoppedTrainId ? (
                <div className="flex flex-col gap-1.5 pt-1.5 border-t border-[#facc15]/30">
                  <div className="text-xs font-extrabold text-[#fff8e7]">
                    STOPPED NOW: {hud.railway.stoppedTrainNumber} {hud.railway.stoppedTrainName}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      tabIndex={-1}
                      data-testid="train-btn-drive"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onBoardTrain('driver');
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#ea580c] hover:bg-[#f97316] border border-[#fed7aa] text-white font-display font-extrabold text-xs cursor-pointer whitespace-nowrap"
                    >
                      <TrainFront className="w-3.5 h-3.5 shrink-0" />
                      <span>Drive Train [1]</span>
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      data-testid="train-btn-passenger"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onBoardTrain('passenger');
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0284c7] hover:bg-[#0ea5e9] border border-[#bae6fd] text-white font-display font-extrabold text-xs cursor-pointer whitespace-nowrap"
                    >
                      <Eye className="w-3.5 h-3.5 shrink-0" />
                      <span>Passenger · Window Seat [2]</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#facc15]/30">
                  <div className="text-xs text-[#e2e8f0] min-w-0 truncate">
                    <span className="font-bold text-[#fde047]">Incoming:</span>{' '}
                    {hud.railway.nextTrainNumber} {hud.railway.nextTrainName}
                    {hud.railway.nextTrainEtaSec !== null
                      ? ` (~${hud.railway.nextTrainEtaSec}s)`
                      : ''}
                  </div>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="station-btn-wait"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onWaitForTrain();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17] font-display font-extrabold text-xs cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Wait · Next Train</span>
                  </button>
                </div>
              )}
            </div>
          ) : hud.nearby ? (
            <button
              type="button"
              tabIndex={-1}
              data-testid="interact-prompt"
              onClick={(e) => {
                e.currentTarget.blur();
                onInteractClick();
              }}
              className="pointer-events-auto flex items-center gap-3 px-5 py-2.5 rounded-xl bg-[#111d17]/95 hover:bg-[#1a2e24] border-2 border-[#f5c542] shadow-[0_6px_20px_rgba(0,0,0,0.5)] cursor-pointer transition-transform active:scale-95"
            >
              <span className="px-2 py-0.5 rounded bg-[#f5c542] text-[#141a17] font-extrabold text-sm">
                E
              </span>
              <div className="text-left">
                <div className="font-display font-bold text-sm sm:text-base text-[#fff8e7] leading-tight">
                  {hud.nearby.label}
                </div>
                <div className="text-[11px] text-[#ffd166] font-ml leading-tight">
                  {hud.nearby.sublabel}
                </div>
              </div>
            </button>
          ) : null}
        </div>

        {/* Bottom-Right: Mobile Action Buttons + Live 2D Town Minimap */}
        <div className="order-3 flex flex-col-reverse sm:flex-row items-end gap-2 sm:gap-3">
          {isMobileViewport && (
            <div className="pointer-events-auto flex flex-col gap-2 items-end">
              <div
                onPointerDown={handleLookStart}
                onPointerMove={handleLookMove}
                onPointerUp={handleLookEnd}
                onPointerCancel={handleLookEnd}
                className="w-24 h-11 rounded-lg bg-[#111d17]/75 border border-[#d4a12a]/60 flex items-center justify-center text-[10px] font-bold text-[#ffd166] touch-none select-none"
              >
                DRAG CAM
              </div>
              {hud.inVehicleIsAircraft ? (
                <div className="flex flex-col gap-1.5 items-end">
                  <button
                    type="button"
                    data-testid="mobile-fly-up"
                    aria-label="Fly Up"
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      onTouchFlightVertical?.(1);
                    }}
                    onPointerUp={() => onTouchFlightVertical?.(0)}
                    onPointerCancel={() => onTouchFlightVertical?.(0)}
                    onPointerLeave={() => onTouchFlightVertical?.(0)}
                    className="w-24 py-2.5 rounded-lg bg-[#0284c7] active:bg-[#38bdf8] border-2 border-[#7dd3fc] text-white font-display font-extrabold text-xs shadow-md touch-none select-none"
                  >
                    ▲ FLY UP
                  </button>
                  <button
                    type="button"
                    data-testid="mobile-fly-down"
                    aria-label="Land Plane"
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      onTouchFlightVertical?.(-1);
                    }}
                    onPointerUp={() => onTouchFlightVertical?.(0)}
                    onPointerCancel={() => onTouchFlightVertical?.(0)}
                    onPointerLeave={() => onTouchFlightVertical?.(0)}
                    className="w-24 py-2.5 rounded-lg bg-[#b45309] active:bg-[#f59e0b] border-2 border-[#fde047] text-white font-display font-extrabold text-xs shadow-md touch-none select-none"
                  >
                    ▼ LAND
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !touchRunning;
                      setTouchRunning(next);
                    }}
                    className={`px-3 py-2.5 rounded-lg font-extrabold text-xs border ${
                      touchRunning
                        ? 'bg-[#f5c542] text-[#141a17] border-[#fff]'
                        : 'bg-[#111d17]/90 text-[#fff8e7] border-[#d4a12a]'
                    }`}
                  >
                    RUN
                  </button>
                  <button
                    type="button"
                    onClick={onJumpClick}
                    className="px-3.5 py-2.5 rounded-lg bg-[#1c3d2e]/95 border border-[#9ae6b4] text-[#fff8e7] font-extrabold text-xs"
                  >
                    JUMP
                  </button>
                  <button
                    type="button"
                    onClick={onInteractClick}
                    className="px-3.5 py-2.5 rounded-lg bg-[#f5c542] text-[#141a17] font-extrabold text-xs"
                  >
                    ACT
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Classic Circular Town Minimap with Dedicated Corner Show/Hide Toggle */}
          <div
            data-testid="minimap-corner-control"
            className="pointer-events-auto relative flex flex-col items-end shrink-0"
          >
            {showMinimap ? (
              <div id="hud-minimap-panel" className="flex flex-col items-end gap-1">
                <div className="relative w-[100px] h-[100px] sm:w-[126px] sm:h-[126px]">
                  <canvas
                    ref={minimapRef}
                    data-testid="town-minimap"
                    title="+ Hospital · Red = 108 · Gold = Statue · Amber = Ramps"
                    width={136}
                    height={136}
                    className="w-full h-full rounded-full shadow-[0_6px_22px_rgba(0,0,0,0.55)]"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="minimap-corner-toggle"
                    aria-expanded={true}
                    aria-controls="hud-minimap-panel"
                    aria-label="Hide Minimap"
                    title="Hide Minimap [N]"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handleToggleMinimap();
                    }}
                    className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[#111d17]/95 hover:bg-[#1e382b] border-2 border-[#f5c542] text-[#ffd166] flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.7)] cursor-pointer transition-transform active:scale-95"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                tabIndex={-1}
                data-testid="minimap-corner-toggle"
                aria-expanded={false}
                aria-controls="hud-minimap-panel"
                aria-label="Show Minimap"
                title="Show Minimap [N]"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleToggleMinimap();
                }}
                className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-[#111d17]/95 hover:bg-[#1e382b] border-2 border-[#f5c542] text-[#ffd166] text-xs font-extrabold tracking-wide shadow-[0_4px_14px_rgba(0,0,0,0.65)] cursor-pointer transition-transform active:scale-95"
              >
                <MapIcon className="w-4 h-4 shrink-0" />
                <span>MAP</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
