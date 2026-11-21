import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Landmark, PlusCircle, TrendingUp, X } from 'lucide-react';
import { GameProgressState } from '../types/game';
import {
  BANK_NAME,
  CURRENCY_FULL_NAME,
  CURRENCY_SYMBOL,
} from '../data/worldData';
import { formatGhop } from '../game/gameLogic';

interface BankModalProps {
  progress: GameProgressState;
  onTransaction: (
    type: 'deposit' | 'withdraw' | 'investment',
    label: string,
    amount: number,
    openAccount?: boolean,
  ) => void;
  onClose: () => void;
}

export const BankModal: React.FC<BankModalProps> = ({
  progress,
  onTransaction,
  onClose,
}) => {
  const [amountInput, setAmountInput] = useState('5000000');
  const [bankNote, setBankNote] = useState<string | null>(null);

  const parsedAmount = Math.max(1000, Number(amountInput.replace(/[^0-9]/g, '')) || 1000000);

  const handleAction = (
    type: 'deposit' | 'withdraw' | 'investment',
    label: string,
    openAccount = false,
  ) => {
    onTransaction(type, label, parsedAmount, openAccount);
    setBankNote(
      type === 'deposit'
        ? `Deposited ${CURRENCY_SYMBOL} ${formatGhop(parsedAmount)} GHOP! Manager Menon says your vault is still INFINITE!`
        : type === 'withdraw'
          ? `Withdrew ${CURRENCY_SYMBOL} ${formatGhop(parsedAmount)} GHOP in gold briefcases! Remaining Balance: UNLIMITED!`
          : `Invested ${CURRENCY_SYMBOL} ${formatGhop(parsedAmount)} GHOP into Kerala Meme Infrastructure! Town Fame +20!`,
    );
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#080e0b]/75"
      role="dialog"
      aria-modal="true"
      aria-label={BANK_NAME}
    >
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-[#111e18] border-2 border-[#f5c542] shadow-[0_20px_55px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#183529] border-b border-[#d4a12a]/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#f5c542] text-[#141a17]">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-xl text-[#ffd166]">
                {BANK_NAME}
              </h2>
              <p className="text-[11px] text-[#cfe3d6]">{CURRENCY_FULL_NAME}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Bank Dashboard"
            className="p-2 rounded-lg bg-[#0f1a14] hover:bg-[#233d30] text-[#fff8e7] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Account Hero Balance Banner */}
          <div className="rounded-xl bg-[#1a2f24] border border-[#f5c542]/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#9ae6b4]">
                ACCOUNT HOLDER: SHERU BHAI (ROYAL VIP #{progress.bankAccountsCount})
              </div>
              <div className="font-display font-extrabold text-3xl sm:text-4xl text-[#ffd166] mt-1 tabular-nums">
                {CURRENCY_SYMBOL} UNLIMITED BALANCE
              </div>
              <div className="text-xs text-[#d6e4da] mt-1">
                Fictional Meme Currency · Zero Grinding · Spend Freely Across Town
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-right shrink-0">
              <div className="rounded-lg bg-[#101d17] px-3 py-2 border border-[#d4a12a]/35">
                <div className="text-[10px] uppercase text-[#a3b8ab]">TOTAL SPENT</div>
                <div className="font-display font-bold text-base text-[#ffd166] tabular-nums">
                  {formatGhop(progress.ghopSpentTotal)}
                </div>
              </div>
              <div className="rounded-lg bg-[#101d17] px-3 py-2 border border-[#d4a12a]/35">
                <div className="text-[10px] uppercase text-[#a3b8ab]">INVESTMENTS</div>
                <div className="font-display font-bold text-base text-[#9ae6b4] tabular-nums">
                  {formatGhop(progress.bankInvestmentsTotal)}
                </div>
              </div>
            </div>
          </div>

          {bankNote && (
            <div className="rounded-xl bg-[#27200e] border border-[#f5c542] px-4 py-2.5 text-sm font-semibold text-[#ffd166]">
              {bankNote}
            </div>
          )}

          {/* Transaction Controls */}
          <div className="rounded-xl bg-[#16261e] border border-[#d4a12a]/40 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="ghop-amount" className="text-xs font-extrabold uppercase tracking-wider text-[#ffd166]">
                Fictional GHOP Transaction Amount
              </label>
              <div className="flex gap-1.5">
                {['1000000', '50000000', '999000000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmountInput(preset)}
                    className="px-2.5 py-1 rounded bg-[#101b16] hover:bg-[#22392d] border border-[#d4a12a]/40 text-[11px] font-bold text-[#ffd166] cursor-pointer"
                  >
                    {formatGhop(Number(preset))}
                  </button>
                ))}
              </div>
            </div>

            <input
              id="ghop-amount"
              type="text"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0d1612] border border-[#d4a12a]/60 text-[#fff8e7] font-display font-bold text-lg tabular-nums focus:outline-none focus:border-[#ffd166]"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => handleAction('deposit', 'Royal Gold Vault Deposit')}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#1f4b37] hover:bg-[#286147] text-[#fff8e7] font-bold text-xs cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4 text-[#9ae6b4]" />
                Deposit GHOP
              </button>
              <button
                type="button"
                onClick={() => handleAction('withdraw', 'Cash Briefcase Withdrawal')}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#5c3d15] hover:bg-[#754f1c] text-[#fff8e7] font-bold text-xs cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 text-[#ffd166]" />
                Withdraw Briefcase
              </button>
              <button
                type="button"
                onClick={() => handleAction('investment', 'Kerala Empire Investment Bond')}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17] font-extrabold text-xs cursor-pointer"
              >
                <TrendingUp className="w-4 h-4" />
                Invest in Town
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAction('deposit', `Opened Platinum Account #${progress.bankAccountsCount + 1}`, true)
                }
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#1a3345] hover:bg-[#23455e] text-[#fff8e7] font-bold text-xs cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-[#4cc9f0]" />
                New Account
              </button>
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9ae6b4] mb-2">
              TRANSACTION LEDGER ({progress.bankTransactions.length})
            </h3>
            <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
              {progress.bankTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-[#0d1612] border border-[#d4a12a]/25 text-xs"
                >
                  <div>
                    <div className="font-bold text-[#fff8e7]">{tx.label}</div>
                    <div className="text-[10px] uppercase text-[#9db3a5]">{tx.type}</div>
                  </div>
                  <div className="font-display font-bold text-sm text-[#ffd166] tabular-nums">
                    {CURRENCY_SYMBOL} {formatGhop(tx.amountGhop)} GHOP
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
