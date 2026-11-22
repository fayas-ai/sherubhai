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
  onOpenWardrobe: () => void;
  onCallEmergency108: () => void;
  onSelectAutopilot: (dest: AutoDestination | null) => void;
  onToggleSiren: () => void;
  onParkVehicle: () => void;
  onTriggerRandomEvent: () => void;
  onCycleTime: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onInteractClick: () => void;
  onJumpClick: () => void;
  onTeleportToObjective: () => void;
  onTouchMove: (x: number, y: number, running: boolean) => void;
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
  onOpenWardrobe,
  onCallEmergency108,
  onSelectAutopilot,
  onToggleSiren,
  onParkVehicle,
  onTriggerRandomEvent,
  onCycleTime,
  onToggleMute,
  onPause,
  onInteractClick,
  onJumpClick,
  onTeleportToObjective,
  onTouchMove,
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

    // Roads (Main Cross + Outer Ring Boulevards for Extended Town)
    ctx.fillStyle = '#474f57';
    ctx.fillRect(cx - 3, 0, 6, h);
    ctx.fillRect(0, cy - 4 * scale - 3, w, 6);
    ctx.fillRect(0, cy - 32 * scale - 2, w, 4);
    ctx.fillRect(0, cy + 34 * scale - 2, w, 4);
    ctx.fillRect(0, cy - 72 * scale - 2, w, 4);
    ctx.fillRect(0, cy + 72 * scale - 2, w, 4);
    ctx.fillRect(0, cy + 104 * scale - 2, w, 4);
    ctx.fillRect(cx - 76 * scale - 2, 0, 4, h);
    ctx.fillRect(cx + 76 * scale - 2, 0, 4, h);
    ctx.fillRect(cx - 108 * scale - 2, 0, 4, h);
    ctx.fillRect(cx + 108 * scale - 2, 0, 4, h);

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

    // Vehicles on minimap (flashing red for 108 Ambulance / Police / Fire)
    for (const v of hud.vehicles) {
      const vx = cx + v.x * scale;
      const vz = cy + v.z * scale;
      if (v.isEmergency) {
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
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: GHOP Unlimited Balance + Location + Active Level Objective */}
        <div className="flex flex-col gap-1.5 max-w-[195px] sm:max-w-[330px]">
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
            <div className="mt-1 flex items-center justify-between text-[10px] sm:text-[11px] text-[#d9e5dc]">
              <span className="flex items-center gap-1 font-semibold truncate">
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#f5c542] shrink-0" />
                {hud.district}
              </span>
              <span className="hidden sm:inline tabular-nums text-[#ffd166]/90">
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

        {/* Top-Right: Compact Action & Utility Buttons */}
        <div className="pointer-events-auto flex flex-wrap justify-end gap-1 sm:gap-1.5 max-w-[175px] sm:max-w-[540px] lg:max-w-none">
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
            data-testid="hud-open-garage"
            aria-label="Open 28-Vehicle Garage"
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
      <div className="mt-auto flex items-end justify-between gap-2 sm:gap-3">
        {/* Mobile Left Virtual Joystick */}
        <div className="flex items-end gap-2">
          {isMobileViewport && (
            <div
              onPointerDown={handleJoyStart}
              onPointerMove={handleJoyMove}
              onPointerUp={handleJoyEnd}
              onPointerCancel={handleJoyEnd}
              aria-label="Movement Joystick"
              className="pointer-events-auto relative w-28 h-28 rounded-full bg-[#111d17]/75 border-2 border-[#d4a12a]/80 flex items-center justify-center touch-none"
            >
              <div
                className="w-11 h-11 rounded-full bg-[#f5c542] border-2 border-[#161c18] shadow-md"
                style={{ transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)` }}
              />
            </div>
          )}
        </div>

        {/* Bottom-Center: Contextual Interaction Prompt OR Active Vehicle 180 KM/H Driving Bar */}
        <div className="flex flex-col items-center gap-2 mb-1 max-w-full">
          {hud.inVehicleName ? (
            <div
              data-testid="driving-hud"
              className="pointer-events-auto flex flex-col gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-[#111d17]/95 border-2 border-[#f5c542] shadow-[0_8px_28px_rgba(0,0,0,0.65)] max-w-[94vw]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#ffd166]">
                    <span>DRIVING · WASD · SPACE BRAKE · H HORN</span>
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
        <div className="flex items-end gap-3">
          {isMobileViewport && (
            <div className="pointer-events-auto flex flex-col gap-2 items-end">
              <div
                onPointerDown={handleLookStart}
                onPointerMove={handleLookMove}
                onPointerUp={handleLookEnd}
                onPointerCancel={handleLookEnd}
                className="w-24 h-12 rounded-lg bg-[#111d17]/70 border border-[#d4a12a]/60 flex items-center justify-center text-[10px] font-bold text-[#ffd166] touch-none"
              >
                DRAG CAM
              </div>
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
            </div>
          )}

          {/* Circular Town Minimap */}
          <div className="hidden sm:flex flex-col items-center gap-1">
            <canvas
              ref={minimapRef}
              width={136}
              height={136}
              className="rounded-full shadow-[0_6px_18px_rgba(0,0,0,0.55)]"
            />
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#f5ecd6]/90 hud-text-stroke">
              + Hospital · Red = 108 · Cyan = Pool
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
