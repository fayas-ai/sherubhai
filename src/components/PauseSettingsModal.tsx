import React from 'react';
import { Home, Play, Save, Settings, X, Info } from 'lucide-react';
import { GameSettings, GraphicsQuality } from '../types/game';
import { BANK_NAME, CURRENCY_FULL_NAME } from '../data/worldData';

interface PauseSettingsModalProps {
  mode: 'pause' | 'settings' | 'about';
  settings: GameSettings;
  savedNotice: string | null;
  onUpdateSettings: (next: GameSettings) => void;
  onResume: () => void;
  onSaveGame: () => void;
  onOpenSettings: () => void;
  onReturnTitle: () => void;
  onClose: () => void;
}

export const PauseSettingsModal: React.FC<PauseSettingsModalProps> = ({
  mode,
  settings,
  savedNotice,
  onUpdateSettings,
  onResume,
  onSaveGame,
  onOpenSettings,
  onReturnTitle,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#070c09]/80"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'pause' ? 'Game Paused' : mode === 'settings' ? 'Game Settings' : 'About Sheru Bhai'}
    >
      <div className="w-full max-w-md rounded-2xl bg-[#111e18] border-2 border-[#f5c542] shadow-[0_20px_55px_rgba(0,0,0,0.85)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-[#183529] border-b border-[#d4a12a]/70">
          <h2 className="font-display font-extrabold text-xl text-[#ffd166] flex items-center gap-2">
            {mode === 'pause' ? (
              'GAME PAUSED'
            ) : mode === 'settings' ? (
              <>
                <Settings className="w-5 h-5" /> SETTINGS
              </>
            ) : (
              <>
                <Info className="w-5 h-5" /> ABOUT SHERU BHAI
              </>
            )}
          </h2>
          <button
            type="button"
            onClick={mode === 'pause' ? onResume : onClose}
            aria-label="Close Menu"
            className="p-1.5 rounded-lg bg-[#0f1a14] hover:bg-[#233d30] text-[#fff8e7] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {mode === 'pause' && (
            <>
              {savedNotice && (
                <div className="rounded-lg bg-[#1d3b2b] border border-[#9ae6b4] px-3 py-2 text-xs font-bold text-[#9ae6b4]">
                  {savedNotice}
                </div>
              )}
              <button
                type="button"
                onClick={onResume}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17] font-display font-extrabold text-lg cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                RESUME GAME
              </button>
              <button
                type="button"
                onClick={onSaveGame}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1b3a2c] hover:bg-[#25503c] border border-[#9ae6b4]/60 text-[#fff8e7] font-bold text-sm cursor-pointer"
              >
                <Save className="w-4 h-4 text-[#9ae6b4]" />
                SAVE PROGRESS LOCALLY
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#172720] hover:bg-[#21382e] border border-[#d4a12a]/50 text-[#fff8e7] font-bold text-sm cursor-pointer"
              >
                <Settings className="w-4 h-4 text-[#ffd166]" />
                SETTINGS
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#361b18] hover:bg-[#4c2622] border border-[#e63946]/50 text-[#ffd7d7] font-bold text-sm cursor-pointer"
              >
                <Home className="w-4 h-4" />
                RETURN TO MAIN MENU
              </button>
            </>
          )}

          {mode === 'settings' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-[#f6e8c3] mb-1">
                  <label htmlFor="music-vol">Music Volume</label>
                  <span className="tabular-nums">{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  id="music-vol"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.musicVolume}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, musicVolume: Number(e.target.value) })
                  }
                  className="w-full accent-[#f5c542]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-[#f6e8c3] mb-1">
                  <label htmlFor="sfx-vol">Sound Effects Volume</label>
                  <span className="tabular-nums">{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  id="sfx-vol"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.sfxVolume}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, sfxVolume: Number(e.target.value) })
                  }
                  className="w-full accent-[#f5c542]"
                />
              </div>

              <div>
                <div className="text-xs font-bold text-[#f6e8c3] mb-1.5">Graphics Quality</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, graphicsQuality: q })}
                      className={`py-2 rounded-lg text-xs font-extrabold uppercase cursor-pointer ${
                        settings.graphicsQuality === q
                          ? 'bg-[#f5c542] text-[#141a17]'
                          : 'bg-[#172820] text-[#d6e4da]'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-[#f6e8c3] mb-1">
                  <label htmlFor="mouse-sens">Mouse Camera Sensitivity</label>
                  <span className="tabular-nums">{settings.mouseSensitivity.toFixed(1)}x</span>
                </div>
                <input
                  id="mouse-sens"
                  type="range"
                  min={0.3}
                  max={2.0}
                  step={0.1}
                  value={settings.mouseSensitivity}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, mouseSensitivity: Number(e.target.value) })
                  }
                  className="w-full accent-[#f5c542]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-[#f6e8c3] mb-1">
                  <label htmlFor="mob-sens">Mobile Touch Sensitivity</label>
                  <span className="tabular-nums">{settings.mobileSensitivity.toFixed(1)}x</span>
                </div>
                <input
                  id="mob-sens"
                  type="range"
                  min={0.3}
                  max={2.0}
                  step={0.1}
                  value={settings.mobileSensitivity}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, mobileSensitivity: Number(e.target.value) })
                  }
                  className="w-full accent-[#f5c542]"
                />
              </div>

              <label className="flex items-center justify-between text-xs font-bold text-[#f6e8c3] pt-1 cursor-pointer">
                <span>Always Show On-Screen Touch Controls</span>
                <input
                  type="checkbox"
                  checked={settings.showTouchControls}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, showTouchControls: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#f5c542]"
                />
              </label>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-[#f5c542] text-[#141a17] font-display font-extrabold text-base cursor-pointer"
              >
                DONE
              </button>
            </div>
          )}

          {mode === 'about' && (
            <div className="space-y-3 text-xs text-[#d7e5dc] leading-relaxed">
              <p className="font-display font-bold text-base text-[#ffd166]">
                Sheru Bhai: GHOP GHOP Meme World
              </p>
              <p>
                Explore a lively 3D Kerala-inspired comedy town starring <strong>Sheru Bhai</strong>,
                the billionaire lion with sunglasses, gold chains, and unlimited fictional{' '}
                <strong>{CURRENCY_FULL_NAME}</strong> from <strong>{BANK_NAME}</strong>.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>100 playable story levels across 10 chapters + 5 Boss characters.</li>
                <li>Buy shops, rename & upgrade your empire, or build competing shops right opposite!</li>
                <li>Drive Kerala auto-rickshaws, supercars, town buses, and motorcycles.</li>
                <li>22 non-repeating random street events & hundreds of Malayalam/Manglish lines.</li>
                <li>100% fictional comedy game with local browser saving—no real money or external APIs.</li>
              </ul>
              <button
                type="button"
                onClick={onClose}
                className="w-full mt-2 py-2.5 rounded-xl bg-[#f5c542] text-[#141a17] font-display font-extrabold text-base cursor-pointer"
              >
                GOT IT!
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
