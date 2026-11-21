import React, { useState } from 'react';
import { ArrowUpCircle, Building2, Check, Edit3, MapPin, X } from 'lucide-react';
import { GameProgressState } from '../types/game';
import { BUILDINGS, CURRENCY_SYMBOL, EMPTY_PLOTS } from '../data/worldData';
import { formatGhop, getShopCategoryLabel } from '../game/gameLogic';

interface EmpireModalProps {
  progress: GameProgressState;
  onRenameBusiness: (buildingId: string, newName: string) => void;
  onUpgradeBusiness: (buildingId: string) => void;
  onFastTravel: (x: number, z: number, label: string) => void;
  onClose: () => void;
}

export const EmpireModal: React.FC<EmpireModalProps> = ({
  progress,
  onRenameBusiness,
  onUpgradeBusiness,
  onFastTravel,
  onClose,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  const ownedList = Object.values(progress.ownedBusinesses);
  const builtList = Object.values(progress.builtShops);
  const availableToBuy = BUILDINGS.filter(
    (b) => b.buyable && !progress.ownedBusinesses[b.id],
  );

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setNameDraft(currentName);
  };

  const commitEdit = (id: string) => {
    if (nameDraft.trim()) {
      onRenameBusiness(id, nameDraft.trim());
    }
    setEditingId(null);
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#080e0b]/75"
      role="dialog"
      aria-modal="true"
      aria-label="Sheru Business Empire"
    >
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-[#111e18] border-2 border-[#f5c542] shadow-[0_20px_55px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#183529] border-b border-[#d4a12a]/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#f5c542] text-[#141a17]">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-xl text-[#ffd166]">
                SHERU BUSINESS EMPIRE
              </h2>
              <p className="text-xs text-[#cfe3d6]">
                Owned Shops: {ownedList.length} · Custom Built Branches: {builtList.length} · Rank: {progress.titleBadge}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Business Empire"
            className="p-2 rounded-lg bg-[#0f1a14] hover:bg-[#233d30] text-[#fff8e7] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Owned Properties */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#ffd166] mb-2">
              OWNED PROPERTIES ({ownedList.length})
            </h3>
            {ownedList.length === 0 ? (
              <div className="rounded-xl bg-[#16261e] border border-[#d4a12a]/35 p-4 text-sm text-[#c7d6cc]">
                You haven’t bought a shop yet! Walk up to Kuttan Chaya Kada or any store in town, press <strong>E</strong>, and choose <strong>BUY ENTIRE SHOP</strong>!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ownedList.map((biz) => {
                  const def = BUILDINGS.find((b) => b.id === biz.buildingId);
                  const upgradeCost = biz.level * 500000;
                  return (
                    <div
                      key={biz.buildingId}
                      className="rounded-xl bg-[#182c22] border border-[#f5c542]/60 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        {editingId === biz.buildingId ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={nameDraft}
                              onChange={(e) => setNameDraft(e.target.value)}
                              aria-label="Rename Business"
                              className="flex-1 px-2 py-1 rounded bg-[#0c1510] border border-[#f5c542] text-xs text-[#fff8e7]"
                            />
                            <button
                              type="button"
                              onClick={() => commitEdit(biz.buildingId)}
                              aria-label="Confirm Business Name"
                              className="p-1.5 rounded bg-[#f5c542] text-[#141a17] cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="font-display font-extrabold text-base text-[#ffd166] leading-tight">
                              {biz.customName}
                            </div>
                            <div className="text-[11px] text-[#b9d0c1]">
                              {getShopCategoryLabel(biz.category)} · Level {biz.level}/5
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(biz.buildingId, biz.customName)}
                          aria-label={`Rename ${biz.customName}`}
                          className="p-1.5 rounded bg-[#101c16] hover:bg-[#233d30] text-[#ffd166] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-xs text-[#9ae6b4] tabular-nums">
                        Profit Tick: +{CURRENCY_SYMBOL} {formatGhop(biz.revenueTickGhop)} GHOP
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={biz.level >= 5}
                          onClick={() => onUpgradeBusiness(biz.buildingId)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-[#f5c542] hover:bg-[#ffd566] disabled:opacity-45 text-[#141a17] font-extrabold text-xs cursor-pointer"
                        >
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                          {biz.level >= 5 ? 'MAX LV.5' : `Upgrade (${formatGhop(upgradeCost)})`}
                        </button>
                        {def && (
                          <button
                            type="button"
                            onClick={() => onFastTravel(def.x, def.z, biz.customName)}
                            className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-[#101c16] hover:bg-[#233d30] border border-[#d4a12a]/50 text-[#fff8e7] text-xs font-bold cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5 text-[#ffd166]" />
                            Visit
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Built Rival Shops on Empty Plots */}
          {builtList.length > 0 && (
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9ae6b4] mb-2">
                CONSTRUCTED SHERU BRANCHES ({builtList.length}/{EMPTY_PLOTS.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {builtList.map((shop) => {
                  const plot = EMPTY_PLOTS.find((p) => p.id === shop.plotId);
                  return (
                    <div
                      key={shop.plotId}
                      className="flex items-center justify-between rounded-xl bg-[#162b21] border border-[#9ae6b4]/50 px-3.5 py-2.5"
                    >
                      <div>
                        <div className="font-display font-bold text-sm text-[#fff8e7]">
                          {shop.name}
                        </div>
                        <div className="text-[11px] text-[#9ae6b4]">
                          Rival Plot Built · {shop.customersCount} Happy Customers
                        </div>
                      </div>
                      {plot && (
                        <button
                          type="button"
                          onClick={() => onFastTravel(plot.x, plot.z, shop.name)}
                          className="px-2.5 py-1 rounded bg-[#f5c542] text-[#141a17] font-bold text-xs cursor-pointer"
                        >
                          Go
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Town Acquisition Directory */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#c7d6cc] mb-2">
              AVAILABLE TOWN BUSINESSES TO BUY ({availableToBuy.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableToBuy.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-lg bg-[#0d1612] border border-[#d4a12a]/25 px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-bold text-[#fff8e7]">{b.name}</div>
                    <div className="text-[11px] text-[#ffd166] tabular-nums">
                      {b.district} · {CURRENCY_SYMBOL} {formatGhop(b.purchasePrice)} GHOP
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onFastTravel(b.x, b.z, b.name)}
                    className="px-2.5 py-1 rounded bg-[#1b3327] hover:bg-[#274b3a] text-[#ffd166] font-bold cursor-pointer"
                  >
                    Go There
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
