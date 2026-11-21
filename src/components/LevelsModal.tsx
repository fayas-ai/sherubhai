import React, { useState } from 'react';
import { CheckCircle2, Compass, Lock, Play, Trophy, X } from 'lucide-react';
import { GameProgressState, LevelDefinition } from '../types/game';
import { CHAPTER_NAMES, LEVELS } from '../data/levelsData';
import { CURRENCY_SYMBOL } from '../data/worldData';
import { formatGhop } from '../game/gameLogic';

interface LevelsModalProps {
  progress: GameProgressState;
  onSelectLevel: (level: LevelDefinition, fastTravel: boolean) => void;
  onClose: () => void;
}

export const LevelsModal: React.FC<LevelsModalProps> = ({
  progress,
  onSelectLevel,
  onClose,
}) => {
  const initialChapter = Math.ceil(progress.currentLevelId / 10);
  const [selectedChapter, setSelectedChapter] = useState(initialChapter);

  const chapterLevels = LEVELS.filter((l) => l.chapter === selectedChapter);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#080e0b]/75"
      role="dialog"
      aria-modal="true"
      aria-label="100 Levels Campaign"
    >
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-[#111e18] border-2 border-[#f5c542] shadow-[0_20px_55px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#183529] border-b border-[#d4a12a]/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#f5c542] text-[#141a17]">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-xl text-[#ffd166]">
                SHERU BHAI · 100-LEVEL STORY CAMPAIGN
              </h2>
              <p className="text-xs text-[#cfe3d6] tabular-nums">
                Completed: {progress.completedLevels.length}/100 · Highest Unlocked: Lv.{progress.highestUnlockedLevel} · Active: Lv.{progress.currentLevelId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Levels Campaign"
            className="p-2 rounded-lg bg-[#0f1a14] hover:bg-[#233d30] text-[#fff8e7] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 10 Chapter Tabs */}
        <div className="px-5 py-3 bg-[#0e1914] border-b border-[#d4a12a]/30 flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((ch) => {
            const doneInChapter = LEVELS.filter(
              (l) => l.chapter === ch && progress.completedLevels.includes(l.id),
            ).length;
            return (
              <button
                key={ch}
                type="button"
                onClick={() => setSelectedChapter(ch)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer tabular-nums ${
                  selectedChapter === ch
                    ? 'bg-[#f5c542] text-[#141a17]'
                    : 'bg-[#172820] text-[#d6e4da] hover:bg-[#233b30]'
                }`}
              >
                Ch.{ch} ({doneInChapter}/10)
              </button>
            );
          })}
        </div>

        {/* Chapter Title */}
        <div className="px-6 py-2.5 bg-[#15251d] border-b border-[#d4a12a]/25 flex items-center justify-between">
          <h3 className="font-display font-extrabold text-base text-[#ffd166]">
            {CHAPTER_NAMES[selectedChapter]}
          </h3>
          <span className="text-xs text-[#9ae6b4]">
            Levels {(selectedChapter - 1) * 10 + 1} – {selectedChapter * 10}
          </span>
        </div>

        {/* 10 Level Cards in Selected Chapter */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {chapterLevels.map((lvl) => {
            const unlocked = lvl.id <= progress.highestUnlockedLevel;
            const completed = progress.completedLevels.includes(lvl.id);
            const active = lvl.id === progress.currentLevelId;

            return (
              <div
                key={lvl.id}
                className={`rounded-xl p-3.5 border transition-colors ${
                  active
                    ? 'bg-[#1e3529] border-[#ffd166]'
                    : unlocked
                      ? 'bg-[#15241c] border-[#d4a12a]/40'
                      : 'bg-[#0e1612] border-[#2d3b33] opacity-65'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#0c1410] text-[#ffd166] font-extrabold text-[11px] tabular-nums">
                        LV.{lvl.id}
                      </span>
                      <span className="font-display font-bold text-sm text-[#fff8e7]">
                        {lvl.title}
                      </span>
                    </div>
                    <p className="text-xs text-[#c5d6cb] mt-1 leading-snug">{lvl.story}</p>
                    <p className="text-[11px] font-bold text-[#9ae6b4] mt-1.5">
                      Objective: {lvl.objectiveText}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {completed ? (
                      <CheckCircle2 className="w-5 h-5 text-[#9ae6b4]" />
                    ) : !unlocked ? (
                      <Lock className="w-4 h-4 text-[#7c9084]" />
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#d4a12a]/20 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#ffd166] tabular-nums">
                    Reward: +{CURRENCY_SYMBOL} {formatGhop(lvl.rewardGhop)} GHOP
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={!unlocked}
                      onClick={() => onSelectLevel(lvl, false)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#243f31] hover:bg-[#2f5240] disabled:opacity-40 text-[#fff8e7] text-xs font-bold cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      {completed ? 'Replay' : active ? 'Active' : 'Track'}
                    </button>
                    {unlocked && lvl.targetCoords && (
                      <button
                        type="button"
                        onClick={() => onSelectLevel(lvl, true)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17] text-xs font-extrabold cursor-pointer"
                      >
                        <Compass className="w-3 h-3" />
                        Go
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
