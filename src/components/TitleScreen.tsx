import React from 'react';
import { Play, RotateCcw, Settings, Info } from 'lucide-react';
import { AdSlot } from './AdSlot';

interface TitleScreenProps {
  hasSave: boolean;
  savedLevel: number;
  savedBusinesses: number;
  onPlayNew: () => void;
  onContinue: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSave,
  savedLevel,
  savedBusinesses,
  onPlayNew,
  onContinue,
  onOpenSettings,
  onOpenAbout,
}) => {
  return (
    <div
      className="fixed inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 pointer-events-none"
      style={{
        background:
          'linear-gradient(90deg, rgba(13,22,18,0.88) 0%, rgba(13,22,18,0.58) 38%, rgba(13,22,18,0.06) 72%, rgba(13,22,18,0) 100%)',
      }}
    >
      {/* Left-third Title Lockup & Actions over calm negative space */}
      <div className="my-auto max-w-xl pointer-events-auto">
        {/* Bespoke Inline SVG Golden Lion Crest & Display Lockup */}
        <svg
          viewBox="0 0 540 165"
          className="w-full max-w-[500px] h-auto mb-5 drop-shadow-[0_6px_14px_rgba(0,0,0,0.65)]"
          role="img"
          aria-label="Sheru Bhai: GHOP GHOP Meme World"
        >
          {/* Kerala Kasavu Gold Emblem Crest */}
          <g transform="translate(8, 18)">
            <polygon
              points="46,2 84,24 84,68 46,90 8,68 8,24"
              fill="#17382b"
              stroke="#f5c542"
              strokeWidth="4"
            />
            {/* Stylized Lion Mane */}
            <polygon
              points="46,12 63,20 72,38 68,58 55,72 37,72 24,58 20,38 29,20"
              fill="#8d4614"
              stroke="#f5c542"
              strokeWidth="2"
            />
            {/* Lion Face */}
            <circle cx="46" cy="44" r="18" fill="#e6a13c" />
            {/* Iconic Billionaire Sunglasses */}
            <rect x="30" y="37" width="14" height="9" rx="2" fill="#0d1117" stroke="#ffd166" strokeWidth="1.5" />
            <rect x="48" y="37" width="14" height="9" rx="2" fill="#0d1117" stroke="#ffd166" strokeWidth="1.5" />
            <line x1="44" y1="40" x2="48" y2="40" stroke="#ffd166" strokeWidth="2.2" />
            {/* Snout & Confident Grin */}
            <polygon points="46,49 41,54 51,54" fill="#42210b" />
            <path d="M39 58 Q46 63 53 58" fill="none" stroke="#fff8e7" strokeWidth="2.4" strokeLinecap="round" />
            {/* Gold Crown */}
            <polygon points="34,18 39,9 46,15 53,9 58,18" fill="#ffd166" />
          </g>

          {/* Main Display Lettering */}
          <text
            x="108"
            y="64"
            fill="#ffd166"
            stroke="#1a1206"
            strokeWidth="6"
            paintOrder="stroke fill"
            fontFamily="'Baloo Chettan 2', sans-serif"
            fontWeight="800"
            fontSize="54"
            letterSpacing="1"
          >
            SHERU BHAI
          </text>
          <rect x="108" y="76" width="388" height="4" rx="2" fill="#f5c542" />
          <text
            x="110"
            y="108"
            fill="#fff8e7"
            stroke="#13261d"
            strokeWidth="4"
            paintOrder="stroke fill"
            fontFamily="'Space Grotesk', sans-serif"
            fontWeight="700"
            fontSize="24"
            letterSpacing="1.8"
          >
            GHOP GHOP MEME WORLD
          </text>
          <text
            x="110"
            y="138"
            fill="#9ae6b4"
            fontFamily="'Noto Sans Malayalam', sans-serif"
            fontWeight="700"
            fontSize="15.5"
          >
            100 Levels · Kerala Open World · Unlimited 𖠋 GHOP
          </text>
        </svg>

        {/* Primary Menu CTAs */}
        <div className="flex flex-col gap-3 max-w-xs">
          {hasSave ? (
            <>
              <button
                type="button"
                data-start="true"
                onClick={onContinue}
                className="group flex items-center justify-between px-6 py-4 rounded-xl bg-[#f5c542] hover:bg-[#ffd566] active:scale-[0.98] text-[#151a17] font-display font-extrabold text-xl shadow-[0_6px_0_#9e7312,0_12px_24px_rgba(0,0,0,0.45)] transition-transform cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <Play className="w-6 h-6 fill-current" />
                  CONTINUE
                </span>
                <span className="text-xs font-sans font-bold bg-[#151a17]/15 px-2.5 py-1 rounded-md tabular-nums">
                  LV.{savedLevel} · {savedBusinesses} SHOPS
                </span>
              </button>
              <button
                type="button"
                onClick={onPlayNew}
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#183529] hover:bg-[#1f4636] border-2 border-[#d4a12a]/70 text-[#fff8e7] font-display font-bold text-lg shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-5 h-5 text-[#f5c542]" />
                NEW ADVENTURE
              </button>
            </>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onPlayNew}
              className="group flex items-center justify-center gap-3 px-7 py-4 rounded-xl bg-[#f5c542] hover:bg-[#ffd566] active:scale-[0.98] text-[#151a17] font-display font-extrabold text-2xl shadow-[0_6px_0_#9e7312,0_12px_24px_rgba(0,0,0,0.45)] transition-transform cursor-pointer"
            >
              <Play className="w-7 h-7 fill-current" />
              PLAY GAME
            </button>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#121e19]/95 hover:bg-[#1b2e26] border border-[#d4a12a]/50 text-[#f6e8c3] font-bold text-sm transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 text-[#f5c542]" />
              SETTINGS
            </button>
            <button
              type="button"
              onClick={onOpenAbout}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#121e19]/95 hover:bg-[#1b2e26] border border-[#d4a12a]/50 text-[#f6e8c3] font-bold text-sm transition-colors cursor-pointer"
            >
              <Info className="w-4 h-4 text-[#f5c542]" />
              ABOUT
            </button>
          </div>
        </div>

        {/* Adsterra 320×50 Banner (ads only) */}
        <div className="mt-5">
          <AdSlot variant="banner_320x50" testId="home-banner-320x50" />
        </div>
      </div>

      {/* Adsterra 300×250 Board docked cleanly bottom-right (ads only) */}
      <div className="hidden lg:flex fixed right-8 bottom-20 z-20 pointer-events-auto">
        <AdSlot variant="board_300x250" testId="home-board-300x250" />
      </div>

      {/* Single flat bottom control hint line */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-medium text-[#f5ecd6]/90 hud-text-stroke">
        <span>WASD / Arrows Move · Drag Mouse Look · Shift Run · Space Jump · E Interact · Esc Pause</span>
        <span className="text-[#ffd166] font-bold">Press Enter or Space to Start</span>
      </div>
    </div>
  );
};
