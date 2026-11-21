import React from 'react';
import { Award, Compass, Crown, Sparkles } from 'lucide-react';
import { LevelCompletionNotice } from '../types/game';
import { CURRENCY_SYMBOL } from '../data/worldData';
import { formatGhop } from '../game/gameLogic';

interface LevelCompleteModalProps {
  notice: LevelCompletionNotice;
  onNextLevel: () => void;
  onFreeRoam: () => void;
}

export const LevelCompleteModal: React.FC<LevelCompleteModalProps> = ({
  notice,
  onNextLevel,
  onFreeRoam,
}) => {
  const { level, nextLevelId, legendaryUnlocked } = notice;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#070c09]/75"
      role="dialog"
      aria-modal="true"
      aria-label={`Level ${level.id} Completed`}
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#122019] border-2 border-[#ffd166] shadow-[0_22px_60px_rgba(0,0,0,0.85)] overflow-hidden text-center">
        <div className="px-6 py-5 bg-[#1e3d2d] border-b border-[#f5c542]/60">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#f5c542] text-[#141a17] mb-2 shadow-lg">
            {legendaryUnlocked ? <Crown className="w-8 h-8" /> : <Award className="w-8 h-8" />}
          </div>
          <div className="text-xs font-extrabold uppercase tracking-widest text-[#9ae6b4]">
            LEVEL {level.id} COMPLETED!
          </div>
          <h2 className="font-display font-extrabold text-2xl text-[#ffd166] mt-0.5">
            {level.title}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {legendaryUnlocked && (
            <div className="rounded-xl bg-[#362808] border-2 border-[#ffd166] p-3 text-sm font-extrabold text-[#ffd166]">
              ★ LEGENDARY SHERU CROWN & GOLD SUIT UNLOCKED · KING OF GHOP GHOP WORLD! ★
            </div>
          )}

          {/* Funny Sheru Malayalam Completion Punchline */}
          <div className="rounded-xl bg-[#0e1813] border border-[#d4a12a]/40 p-4">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#ffd166] mb-1">
              SHERU BHAI SAYS:
            </div>
            <p className="font-ml font-bold text-lg text-[#fff8e7]">“{level.completionLineMl}”</p>
            <p className="text-xs text-[#c5d6cb] mt-1">{level.completionLineEn}</p>
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#182c22] border border-[#d4a12a]/40 p-3">
              <div className="text-[10px] font-bold uppercase text-[#9db3a5]">GHOP REWARD</div>
              <div className="font-display font-extrabold text-lg text-[#ffd166] tabular-nums">
                +{CURRENCY_SYMBOL} {formatGhop(level.rewardGhop)}
              </div>
            </div>
            <div className="rounded-xl bg-[#182c22] border border-[#d4a12a]/40 p-3">
              <div className="text-[10px] font-bold uppercase text-[#9db3a5]">TOWN FAME</div>
              <div className="font-display font-extrabold text-lg text-[#9ae6b4] tabular-nums">
                +{level.rewardReputation} FAME
              </div>
            </div>
          </div>

          {level.rewardItem && (
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#ffd166] bg-[#241e0d] rounded-lg py-2 px-3 border border-[#f5c542]/50">
              <Sparkles className="w-4 h-4" />
              Unlocked Item: {level.rewardItem.name} ({level.rewardItem.mlName})
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            {nextLevelId ? (
              <button
                type="button"
                onClick={onNextLevel}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17] font-display font-extrabold text-base cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                NEXT LEVEL ({nextLevelId})
              </button>
            ) : null}
            <button
              type="button"
              onClick={onFreeRoam}
              className={`py-3 px-4 rounded-xl bg-[#1b3629] hover:bg-[#254938] border border-[#9ae6b4]/50 text-[#fff8e7] font-display font-bold text-base cursor-pointer ${
                !nextLevelId ? 'sm:col-span-2' : ''
              }`}
            >
              FREE ROAM TOWN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
