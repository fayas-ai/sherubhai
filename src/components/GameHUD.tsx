import React, { useEffect, useRef, useState } from 'react';
import {
  Briefcase,
  Building2,
  Car,
  Compass,
  Flame,
  Landmark,
  MapPin,
  Moon,
  Navigation,
  ParkingSquare,
  Pause,
  Plane,
  Shirt,
  Siren,
  Sparkles,
  Sun,
  Sunset,
  Trophy,
  Volume2,
  VolumeX,
  Waves,
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
import { WeatherHUD } from './WeatherHUD';

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
  onTriggerAutoLand: () => void;
  onOpenWardrobe: () => void;
  onCallEmergency108: () => void;
  onSelectAutopilot: (dest: AutoDestination | null) => void;
  onToggleSiren: () => void;
  onParkVehicle: () => void;
  onTriggerRandomEvent: () => void;
  onCycleTime: () => void;
  onCycleWeather: () => void;
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
  onTriggerAutoLand,
  onOpenWardrobe,
  onCallEmergency108,
  onSelectAutopilot,
  onToggleSiren,
  onParkVehicle,
  onTriggerRandomEvent,
  onCycleTime,
  onCycleWeather,
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
  const [streakOpen, setStreakOpen] = useState(false);
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0 });
  const joyOrigin = useRef<{ x: number; y: number; id: number } | null>(null);
  const lookLast = useRef<{ x: number; y: number; id: number } | null>(null);

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

    // Roads (Main Cross + Outer Ring Boulevards matching TOWN_ROADS)
    ctx.fillStyle = '#474f57';
    // mainRoadNS runs cleanly straight north into the Airport Apron (z = -126 to +108)
    ctx.fillRect(cx - 3, cy - 126 * scale, 6, 234 * scale);
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
  }, [hud, progress.ownedBusinesses, progress.builtShops, activeLevel.targetCoords]);

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

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
      {/* TOP BAR: Compact World-Matched Kerala Brass & Emerald Perimeter Clusters */}
      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
        {/* Top-Left: GHOP Unlimited Balance + Location + Active Level Objective */}
        <div className="flex flex-col gap-1.5 min-w-0 max-w-[168px] sm:max-w-[320px]">
          <div className="pointer-events-auto rounded-xl bg-[#111d17]/92 border-2 border-[#d4a12a] px-2.5 sm:px-3.5 py-1.5 sm:py-2 shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#d4a12a] truncate">
                  GHOP · {roleBadge}
                </div>
                <div
                  className="font-display font-extrabold text-sm sm:text-2xl text-[#ffd166] leading-tight tabular-nums hud-text-stroke"
                  data-testid="ghop-balance"
                >
                  {CURRENCY_SYMBOL} UNLIMITED
                </div>
              </div>
              <div className="text-right border-l border-[#d4a12a]/35 pl-2 sm:pl-3 shrink-0">
                <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#9ae6b4]">
                  FAME
                </div>
                <div className="font-display font-extrabold text-sm sm:text-lg text-[#fff8e7] tabular-nums leading-tight">
                  {Math.round(progress.reputation)}
                </div>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-[#d9e5dc]">
              <span className="flex items-center gap-1 font-semibold truncate min-w-0">
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#f5c542] shrink-0" />
                <span className="truncate">{hud.district}</span>
              </span>
              <span className="hidden sm:inline shrink-0 tabular-nums text-[#ffd166]/90">
                Empire: {ownedCount} · Spent: {formatGhop(progress.ghopSpentTotal)}
              </span>
            </div>
          </div>

          {/* Special Daily Active Player Streak Badge */}
          <div className="pointer-events-auto relative">
            <button
              type="button"
              tabIndex={-1}
              data-testid="daily-streak-badge"
              onClick={() => setStreakOpen((v) => !v)}
              aria-expanded={streakOpen}
              aria-label={`Daily Active Player Streak: Day ${streakCount}`}
              className="w-full flex items-center justify-between gap-2 rounded-xl bg-[#1a2b1f]/95 hover:bg-[#223929] border border-[#f59e0b]/80 px-2.5 sm:px-3 py-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.4)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-[#f59e0b]/20 border border-[#f59e0b]/60 flex items-center justify-center shrink-0">
                  <Flame className="w-3.5 h-3.5 text-[#fbbf24] fill-[#f59e0b]" />
                </span>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display font-extrabold text-xs sm:text-sm text-[#fff8e7] tabular-nums leading-none">
                      DAY {streakCount} STREAK
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider text-[#141a17]"
                      style={{ backgroundColor: streakTier.accentColor }}
                    >
                      {streakTier.label}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#9ae6b4] font-semibold truncate mt-0.5">
                    Daily Active Player · Best {bestStreak}d
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#ffd166] tabular-nums shrink-0">
                {totalDays}d total
              </span>
            </button>

            {streakOpen && (
              <div className="mt-1.5 rounded-xl bg-[#101c16]/98 border border-[#f5c542]/80 p-3 shadow-[0_10px_28px_rgba(0,0,0,0.65)] text-xs text-[#fff8e7] space-y-1.5">
                <div className="flex items-center justify-between font-extrabold text-[#ffd166]">
                  <span>DAILY ACTIVE PLAYER STATUS</span>
                  <span>{streakTier.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                  <div className="rounded-lg bg-[#192c22] p-1.5">
                    <div className="text-[10px] text-[#9ae6b4]">STREAK</div>
                    <div className="font-display font-extrabold text-sm text-[#ffd166] tabular-nums">
                      {streakCount}d
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#192c22] p-1.5">
                    <div className="text-[10px] text-[#9ae6b4]">BEST</div>
                    <div className="font-display font-extrabold text-sm text-[#fff8e7] tabular-nums">
                      {bestStreak}d
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#192c22] p-1.5">
                    <div className="text-[10px] text-[#9ae6b4]">VISITS</div>
                    <div className="font-display font-extrabold text-sm text-[#fff8e7] tabular-nums">
                      {totalDays}d
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-[#c7d6cc] leading-snug pt-0.5">
                  Visit Kerala Meme Town every day to level up your badge! Next milestone:{' '}
                  <strong className="text-[#ffd166]">{streakTier.nextMilestone} days</strong> (+25 Fame × streak day).
                </div>
              </div>
            )}
          </div>

          {/* Active Level Objective Card */}
          <div className="pointer-events-auto rounded-xl bg-[#16271f]/92 border border-[#d4a12a]/70 px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-[0_4px_14px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#ffd166] truncate">
                LV.{activeLevel.id}/100 · {activeLevel.title}
              </span>
              {activeLevel.targetCoords && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onTeleportToObjective();
                  }}
                  aria-label="Fast Travel to Active Level Target"
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17] text-[10px] font-extrabold cursor-pointer shrink-0"
                >
                  <Compass className="w-3 h-3" />
                  GO
                </button>
              )}
            </div>
            <div className="text-[11px] sm:text-xs font-semibold text-[#fff8e7] mt-0.5 leading-snug">
              {activeLevel.objectiveText}
            </div>
          </div>
        </div>

        {/* Top-Right: Compact Action Buttons + Dedicated Weather HUD directly next to the Circular Minimap */}
        <div className="flex flex-col-reverse xl:flex-row items-end xl:items-start justify-end gap-1.5 sm:gap-2 min-w-0 max-w-[196px] sm:max-w-none">
          <div className="pointer-events-auto flex flex-wrap justify-end gap-1 sm:gap-1.5 max-w-[184px] sm:max-w-[460px] xl:max-w-[540px]">
            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-call-108"
              aria-label="Call 108 Emergency Ambulance"
              onClick={(e) => {
                e.currentTarget.blur();
                onCallEmergency108();
              }}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-2 rounded-lg bg-[#b91c1c] hover:bg-[#dc2626] border border-[#fca5a5] text-white text-xs font-extrabold shadow cursor-pointer"
            >
              <Siren className="w-4 h-4 text-[#fde047]" />
              <span className="hidden sm:inline">108</span>
            </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-goto-airport"
            aria-label="Fast Travel to Kerala Airport and Runway"
            onClick={(e) => {
              e.currentTarget.blur();
              onGoToAirport();
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-2 rounded-lg bg-[#0c4a6e]/95 hover:bg-[#0369a1] border border-[#38bdf8] text-[#e0f2fe] text-xs font-extrabold shadow cursor-pointer"
          >
            <Plane className="w-4 h-4 text-[#7dd3fc]" />
            <span className="hidden lg:inline">Airport</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-open-garage"
            aria-label="Open Vehicle Garage and Aeroplanes"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenGarage();
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-2 rounded-lg bg-[#111d17]/92 hover:bg-[#1c3227] border border-[#d4a12a]/80 text-[#ffd166] text-xs font-bold shadow cursor-pointer"
          >
            <Car className="w-4 h-4" />
            <span className="hidden lg:inline">Garage [G]</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-open-wardrobe"
            aria-label="Open Home Wardrobe and Role Switch"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenWardrobe();
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-2 rounded-lg bg-[#111d17]/92 hover:bg-[#1c3227] border border-[#d4a12a]/80 text-[#fff8e7] text-xs font-bold shadow cursor-pointer"
          >
            <Shirt className="w-4 h-4 text-[#c084fc]" />
            <span className="hidden lg:inline">Suit/Role [U]</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Open 100 Levels Campaign"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenLevels();
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-2 rounded-lg bg-[#111d17]/92 hover:bg-[#1c3227] border border-[#d4a12a]/80 text-[#ffd166] text-xs font-bold shadow cursor-pointer"
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline tabular-nums">Lv.{activeLevel.id}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Open Business Empire"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenEmpire();
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-2 rounded-lg bg-[#111d17]/92 hover:bg-[#1c3227] border border-[#d4a12a]/80 text-[#fff8e7] text-xs font-bold shadow cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-[#f5c542]" />
            <span className="hidden md:inline tabular-nums">Empire ({ownedCount})</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Open GHOP GHOP International Bank"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenBank();
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-2 rounded-lg bg-[#111d17]/92 hover:bg-[#1c3227] border border-[#d4a12a]/80 text-[#fff8e7] text-xs font-bold shadow cursor-pointer"
          >
            <Landmark className="w-4 h-4 text-[#4cc9f0]" />
            <span className="hidden md:inline">Bank</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Open Inventory Bag"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenInventory();
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-2 rounded-lg bg-[#111d17]/92 hover:bg-[#1c3227] border border-[#d4a12a]/80 text-[#fff8e7] text-xs font-bold shadow cursor-pointer"
          >
            <Briefcase className="w-4 h-4 text-[#9ae6b4]" />
            <span className="hidden md:inline tabular-nums">Bag ({progress.inventory.length})</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Trigger Random Street Event"
            onClick={(e) => {
              e.currentTarget.blur();
              onTriggerRandomEvent();
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-2 rounded-lg bg-[#6b2d14]/95 hover:bg-[#8c3a1a] border border-[#ffd166]/80 text-[#ffd166] text-xs font-bold shadow cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden xl:inline">Event [R]</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Cycle Day, Sunset, and Night"
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleTime();
            }}
            className="p-2 rounded-lg bg-[#111d17]/92 hover:bg-[#1c3227] border border-[#d4a12a]/70 text-[#ffd166] shadow cursor-pointer"
          >
            {hud.timePhase === 'day' ? (
              <Sun className="w-4 h-4" />
            ) : hud.timePhase === 'sunset' ? (
              <Sunset className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={settings.muted ? 'Unmute Audio' : 'Mute Audio'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="p-2 rounded-lg bg-[#111d17]/92 hover:bg-[#1c3227] border border-[#d4a12a]/70 text-[#fff8e7] shadow cursor-pointer"
          >
            {settings.muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Pause Game"
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              className="p-2 rounded-lg bg-[#111d17]/92 hover:bg-[#1c3227] border border-[#d4a12a]/70 text-[#fff8e7] shadow cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          {/* Top-of-Screen Weather HUD directly next to the Circular Town Minimap */}
          <div className="flex items-start gap-1.5 sm:gap-2.5 shrink-0 max-w-full">
            <WeatherHUD
              weather={hud.weather}
              timePhase={hud.timePhase}
              onCycleWeather={onCycleWeather}
            />
            <div className="pointer-events-auto flex flex-col items-center gap-0.5 shrink-0">
              <canvas
                ref={minimapRef}
                data-testid="town-minimap"
                width={116}
                height={116}
                className="w-12 h-12 sm:w-[116px] sm:h-[116px] rounded-full shadow-[0_6px_18px_rgba(0,0,0,0.55)]"
              />
              <span className="hidden sm:inline text-[9px] font-bold tracking-wider uppercase text-[#f5ecd6]/90 hud-text-stroke">
                + Hosp · Red=108 · Gold=Statue
              </span>
            </div>
          </div>
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

        {/* Bottom-Center: Contextual Interaction Prompt OR Active Vehicle 180 KM/H Driving Bar */}
        <div className="order-1 sm:order-2 w-full sm:w-auto flex flex-col items-center gap-1.5 mb-0 sm:mb-1 max-w-full">
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
              className="pointer-events-auto flex flex-col gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-[#111d17]/95 border-2 border-[#f5c542] shadow-[0_8px_28px_rgba(0,0,0,0.65)] max-w-[94vw]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#ffd166]">
                    <span>EASY DRIVE · WASD · SPACE BRAKE · H HORN</span>
                    {hud.autopilotDestName && (
                      <span className="px-1.5 py-0.5 rounded bg-[#0e7490] text-white">
                        AUTO → {hud.autopilotDestName}
                      </span>
                    )}
                  </div>
                  <div className="font-display font-extrabold text-sm sm:text-base text-[#fff8e7]">
                    {hud.inVehicleName}
                  </div>
                </div>

                {/* Live 0..180 KM/H Speedometer */}
                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <div
                      data-testid="speedometer-kmh"
                      className="font-display font-extrabold text-xl sm:text-2xl text-[#9ae6b4] tabular-nums leading-none"
                    >
                      {speedKmh}{' '}
                      <span className="text-[11px] font-bold text-[#d9e5dc]">KM/H</span>
                    </div>
                    <div className="w-24 h-1.5 rounded bg-[#1f3329] overflow-hidden mt-1">
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
        <div className="order-3 flex items-end gap-3">
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
        </div>
      </div>
    </div>
  );
};
