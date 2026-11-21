import React from 'react';
import { Check, Database, Home, Shirt, Sparkles, UserCheck, X } from 'lucide-react';
import { GameProgressState, PlayableRole, SheruOutfit } from '../types/game';

interface HomeWardrobeModalProps {
  progress: GameProgressState;
  savedToIndexedDb: boolean;
  onSelectOutfit: (outfit: SheruOutfit) => void;
  onSelectRole: (role: PlayableRole) => void;
  onFastTravelResort: () => void;
  onFastTravelHospital: () => void;
  onClose: () => void;
}

const OUTFITS: {
  id: SheruOutfit;
  name: string;
  mlName: string;
  swatch: string;
  trim: string;
  desc: string;
}[] = [
  {
    id: 'black',
    name: 'Luxury Black Suit',
    mlName: 'കറുത്ത സ്യൂട്ട് · ബോസ് സ്റ്റൈൽ',
    swatch: '#16181e',
    trim: '#f5c542',
    desc: 'Classic billionaire black suit with red silk tie & 24K gold chains.',
  },
  {
    id: 'white',
    name: 'Royal White Suit',
    mlName: 'വെള്ള സ്യൂട്ട് · റോയൽ സ്റ്റൈൽ',
    swatch: '#f7f5ee',
    trim: '#d4a12a',
    desc: 'Crisp white Kerala VIP suit with black shirt & gold chains.',
  },
  {
    id: 'gold',
    name: 'King Gold Suit',
    mlName: 'സ്വർണ്ണ സ്യൂട്ട് · കിംഗ് സ്റ്റൈൽ',
    swatch: '#c69214',
    trim: '#fff8e7',
    desc: 'Pure solid-gold suit radiating GHOP GHOP royal swagger.',
  },
];

const ROLES: {
  id: PlayableRole;
  name: string;
  mlName: string;
  accent: string;
  desc: string;
}[] = [
  {
    id: 'sheru',
    name: 'Sheru Bhai (Billionaire)',
    mlName: 'ഷേരു ഭായ്',
    accent: '#f5c542',
    desc: 'Original millionaire lion tycoon wearing Black, White, or Gold suit.',
  },
  {
    id: 'auto_driver',
    name: 'Kerala Auto Driver',
    mlName: 'ഓട്ടോ ഡ്രൈവർ',
    accent: '#facc15',
    desc: 'Khaki uniform & cap. Pull ego on the junction & rule the auto stand!',
  },
  {
    id: 'bus_driver',
    name: 'Komban Bus Driver',
    mlName: 'ബസ് ഡ്രൈവർ',
    accent: '#3b82f6',
    desc: 'Blue uniform & cap. Blast air horns & stop at every Kerala bus stand!',
  },
  {
    id: 'shop_owner',
    name: 'Kerala Shop Owner',
    mlName: 'കടയുടമ · മുതലാളി',
    accent: '#10b981',
    desc: 'Traditional cream-gold Kerala attire. Manage your town business empire!',
  },
  {
    id: 'ambulance_driver',
    name: '108 Ambulance Driver',
    mlName: '108 ആംബുലൻസ് ഡ്രൈവർ',
    accent: '#ef4444',
    desc: 'White medical uniform with red cross badge. Drive 108 rescue at 180 km/h!',
  },
];

export const HomeWardrobeModal: React.FC<HomeWardrobeModalProps> = ({
  progress,
  savedToIndexedDb,
  onSelectOutfit,
  onSelectRole,
  onFastTravelResort,
  onFastTravelHospital,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111d17] border-2 border-[#f5c542] shadow-[0_18px_50px_rgba(0,0,0,0.75)] text-[#fff8e7]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#d4a12a]/35 bg-[#172820]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f5c542] text-[#141a17] flex items-center justify-center shadow">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-lg sm:text-xl text-[#ffd166] leading-tight">
                SHERU BHAI HOME · WARDROBE & CHARACTER SWITCH
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#9ae6b4] font-semibold mt-0.5">
                <Database className="w-3.5 h-3.5" />
                <span>
                  {savedToIndexedDb
                    ? 'Auto-Saved to IndexedDB (White/Black Suit & Active Role)'
                    : 'IndexedDB Auto-Save Ready'}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Home Wardrobe"
            className="p-2 rounded-lg bg-[#21382d] hover:bg-[#2d4d3e] text-[#ffd166] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* SECTION 1: WHITE & BLACK DRESS CHANGE */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shirt className="w-4 h-4 text-[#ffd166]" />
              <h3 className="font-display font-bold text-base text-[#ffd166] uppercase tracking-wider">
                1. Sheru Bhai Dress Change (White / Black / Gold)
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {OUTFITS.map((o) => {
                const active = progress.playableRole === 'sheru' && progress.sheruOutfit === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    data-testid={`outfit-${o.id}`}
                    onClick={() => onSelectOutfit(o.id)}
                    className={`text-left p-3.5 rounded-xl border-2 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#1f3b2d] border-[#f5c542]'
                        : 'bg-[#16261f] border-[#d4a12a]/35 hover:border-[#f5c542]/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div
                        className="w-8 h-8 rounded-full border-2 shadow"
                        style={{ backgroundColor: o.swatch, borderColor: o.trim }}
                      />
                      {active && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#f5c542] text-[#141a17] text-[10px] font-extrabold">
                          <Check className="w-3 h-3" /> WEARING
                        </span>
                      )}
                    </div>
                    <div className="font-display font-bold text-sm text-[#fff8e7]">{o.name}</div>
                    <div className="text-[11px] font-ml text-[#ffd166] mt-0.5">{o.mlName}</div>
                    <p className="text-[11px] text-[#c7d6cc] mt-1.5 leading-snug">{o.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: DECIDE WHO I AM (PLAYABLE CHARACTER SWITCH) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="w-4 h-4 text-[#9ae6b4]" />
              <h3 className="font-display font-bold text-base text-[#9ae6b4] uppercase tracking-wider">
                2. Decide Who You Are (Playable Role Switch)
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ROLES.map((r) => {
                const active = progress.playableRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    data-testid={`role-${r.id}`}
                    onClick={() => onSelectRole(r.id)}
                    className={`flex items-start gap-3 text-left p-3 rounded-xl border-2 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#1e3a2d] border-[#9ae6b4]'
                        : 'bg-[#16261f] border-[#d4a12a]/30 hover:border-[#9ae6b4]/75'
                    }`}
                  >
                    <div
                      className="w-3.5 h-10 rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: r.accent }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-sm text-[#fff8e7] truncate">
                          {r.name}
                        </span>
                        {active && (
                          <span className="px-2 py-0.5 rounded bg-[#9ae6b4] text-[#111d17] text-[10px] font-extrabold shrink-0">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-ml text-[#ffd166]">{r.mlName}</div>
                      <p className="text-[11px] text-[#c7d6cc] mt-1 leading-snug">{r.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Trips from Home */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#d4a12a]/30">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onFastTravelResort}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0e7490] hover:bg-[#0891b2] text-white text-xs font-extrabold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Go to Pool & Resort
              </button>
              <button
                type="button"
                onClick={onFastTravelHospital}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#b91c1c] hover:bg-[#dc2626] text-white text-xs font-extrabold cursor-pointer"
              >
                108 Hospital & Emergency Bay
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17] font-display font-extrabold text-sm cursor-pointer"
            >
              DONE & PLAY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
