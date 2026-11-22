import React, { useState, useEffect } from 'react';
import { Crown, Heart, Sparkles, X, ChevronRight } from 'lucide-react';
import { ActiveDialogue, DialogueChoice, NpcMemory } from '../types/game';
import { CURRENCY_SYMBOL } from '../data/worldData';
import { formatGhop } from '../game/gameLogic';
import { AdSlot } from './AdSlot';

interface DialogueModalProps {
  dialogue: ActiveDialogue;
  npcMemory?: NpcMemory;
  onSelectChoice: (choice: DialogueChoice) => void;
  onClose: () => void;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({
  dialogue,
  npcMemory,
  onSelectChoice,
  onClose,
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setStepIndex(0);
  }, [dialogue.id]);

  const totalExchanges = dialogue.exchanges.length;
  const showingChoices = stepIndex >= totalExchanges - 1;
  const currentLine = dialogue.exchanges[Math.min(stepIndex, totalExchanges - 1)];

  return (
    <div
      className="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-3 sm:p-6 bg-[#090f0c]/65"
      role="dialog"
      aria-modal="true"
      aria-label={dialogue.title}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#121f18] border-2 border-[#f5c542] shadow-[0_18px_50px_rgba(0,0,0,0.75)] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#1b3327] border-b border-[#d4a12a]/60">
          <div className="flex items-center gap-2.5">
            {dialogue.sourceType === 'boss' ? (
              <Crown className="w-5 h-5 text-[#ffbe0b]" />
            ) : (
              <Sparkles className="w-5 h-5 text-[#ffd166]" />
            )}
            <div>
              <h2 className="font-display font-extrabold text-lg text-[#ffd166] leading-tight">
                {dialogue.title}
              </h2>
              {npcMemory && (
                <div className="flex items-center gap-3 text-[11px] text-[#cfe3d6] mt-0.5">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-[#ff6b6b]" />
                    Relation: {npcMemory.relationship >= 0 ? `+${npcMemory.relationship}` : npcMemory.relationship}
                  </span>
                  <span className="uppercase tracking-wider text-[#ffd166]">
                    Mood: {npcMemory.mood}
                  </span>
                  {npcMemory.boughtTheirShop && (
                    <span className="px-1.5 py-0.2 rounded bg-[#f5c542] text-[#141a17] font-bold">
                      SHERU OWNED
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Dialogue"
            className="p-1.5 rounded-lg bg-[#101c16] hover:bg-[#233d30] text-[#f6e8c3] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {dialogue.resolved ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#1a2e24] border border-[#9ae6b4]/50 p-4">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#9ae6b4] mb-1">
                  CONSEQUENCE · {dialogue.resolved.choiceLabel}
                </div>
                <p className="font-ml font-bold text-lg text-[#fff8e7] leading-snug">
                  “{dialogue.resolved.outcomeMl}”
                </p>
                <p className="text-sm text-[#d4e2d8] mt-1">{dialogue.resolved.outcomeEn}</p>
              </div>

              <div className="rounded-xl bg-[#0e1712] border border-[#d4a12a]/40 p-3.5">
                <div className="text-[11px] font-bold uppercase text-[#ffd166]">REACTION</div>
                <p className="font-ml font-semibold text-base text-[#ffd166] mt-0.5">
                  “{dialogue.resolved.npcReplyMl}”
                </p>
                <p className="text-xs text-[#c7d6cc] mt-0.5">{dialogue.resolved.npcReplyEn}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                {dialogue.resolved.unlockedNotice && (
                  <span className="px-3 py-1 rounded-md bg-[#f5c542] text-[#141a17]">
                    ★ {dialogue.resolved.unlockedNotice}
                  </span>
                )}
                {dialogue.resolved.reputationDelta ? (
                  <span className="px-3 py-1 rounded-md bg-[#1f4636] text-[#9ae6b4]">
                    +{dialogue.resolved.reputationDelta} Town Fame
                  </span>
                ) : null}
                {dialogue.resolved.ghopDelta ? (
                  <span className="px-3 py-1 rounded-md bg-[#2a2312] text-[#ffd166] tabular-nums">
                    {dialogue.resolved.ghopDelta > 0 ? '+' : '-'}
                    {CURRENCY_SYMBOL} {formatGhop(dialogue.resolved.ghopDelta)} GHOP
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17] font-display font-extrabold text-lg cursor-pointer"
              >
                CONTINUE EXPLORING
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Conversation History / Active Exchange */}
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {dialogue.exchanges.slice(0, stepIndex + 1).map((ex, idx) => {
                  const isSheru = ex.speaker === 'sheru';
                  return (
                    <div
                      key={idx}
                      className={`rounded-xl p-3.5 border ${
                        isSheru
                          ? 'bg-[#251f0f] border-[#f5c542]/70 ml-6'
                          : 'bg-[#192b22] border-[#63a375]/50 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider mb-1">
                        <span className={isSheru ? 'text-[#ffd166]' : 'text-[#9ae6b4]'}>
                          {ex.speakerName}
                        </span>
                        {ex.mood && !isSheru && (
                          <span className="text-[#f5c542]/80">{ex.mood}</span>
                        )}
                      </div>
                      <p className="font-ml font-bold text-base sm:text-lg text-[#fff8e7] leading-snug">
                        “{ex.mlText}”
                      </p>
                      <p className="text-xs sm:text-sm text-[#c9d8ce] mt-1">{ex.enSub}</p>
                    </div>
                  );
                })}
              </div>

              {/* Next / Skip or Choices */}
              {!showingChoices ? (
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStepIndex(totalExchanges - 1)}
                    className="px-4 py-2 rounded-lg bg-[#1a2c22] hover:bg-[#233c2e] text-xs font-bold text-[#c7d6cc] cursor-pointer"
                  >
                    Skip to Choices
                  </button>
                  <button
                    type="button"
                    onClick={() => setStepIndex((s) => Math.min(totalExchanges - 1, s + 1))}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17] font-display font-extrabold text-base cursor-pointer"
                  >
                    Next ({stepIndex + 1}/{totalExchanges})
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#ffd166]">
                    CHOOSE SHERU BHAI’S MOVE ({currentLine.speakerName} WAITS):
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-1">
                    {dialogue.choices.map((c, idx) => (
                      <button
                        key={c.id}
                        type="button"
                        disabled={c.disabled}
                        onClick={() => onSelectChoice(c)}
                        className="w-full text-left px-4 py-2.5 rounded-xl bg-[#192c22] hover:bg-[#234132] border border-[#d4a12a]/60 hover:border-[#ffd166] transition-colors flex items-center justify-between gap-3 cursor-pointer disabled:opacity-45"
                      >
                        <div>
                          <div className="font-display font-bold text-sm sm:text-base text-[#fff8e7]">
                            {idx + 1}. {c.label}
                          </div>
                          {c.sublabel && (
                            <div className="text-xs text-[#bdd2c4]">{c.sublabel}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {c.badge && (
                            <span className="px-2 py-0.5 rounded bg-[#f5c542] text-[#141a17] text-[10px] font-extrabold">
                              {c.badge}
                            </span>
                          )}
                          {c.costGhop ? (
                            <span className="text-xs font-bold text-[#ffd166] tabular-nums">
                              {CURRENCY_SYMBOL} {formatGhop(c.costGhop)}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shop Wall 320×50 Live Sponsor Banner */}
        {dialogue.sourceType === 'shop' && (
          <div className="px-5 pb-4 pt-2 border-t border-[#d4a12a]/30 bg-[#0e1914] flex justify-center">
            <AdSlot
              variant="banner_320x50"
              caption="SHOP WALL BANNER"
              testId="shop-banner-320x50"
            />
          </div>
        )}
      </div>
    </div>
  );
};
