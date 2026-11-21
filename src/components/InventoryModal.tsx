import React, { useState } from 'react';
import { Briefcase, X } from 'lucide-react';
import { GameProgressState, InventoryCategory } from '../types/game';

interface InventoryModalProps {
  progress: GameProgressState;
  onClose: () => void;
}

const CATEGORIES: { id: 'all' | InventoryCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'item', label: 'Luxury Items' },
  { id: 'deed', label: 'Business Deeds' },
  { id: 'collectible', label: 'Collectibles' },
  { id: 'gift', label: 'Gifts' },
  { id: 'key', label: 'Keys & Cards' },
];

export const InventoryModal: React.FC<InventoryModalProps> = ({ progress, onClose }) => {
  const [filter, setFilter] = useState<'all' | InventoryCategory>('all');

  const items =
    filter === 'all'
      ? progress.inventory
      : progress.inventory.filter((i) => i.category === filter);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#080e0b]/75"
      role="dialog"
      aria-modal="true"
      aria-label="Sheru Inventory Bag"
    >
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#111e18] border-2 border-[#f5c542] shadow-[0_20px_55px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#183529] border-b border-[#d4a12a]/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#f5c542] text-[#141a17]">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-xl text-[#ffd166]">
                SHERU’S LUXURY BRIEFCASE
              </h2>
              <p className="text-xs text-[#cfe3d6]">
                {progress.inventory.length} Unique Items · Collectibles, Deeds, Keys & Meme Gifts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Inventory"
            className="p-2 rounded-lg bg-[#0f1a14] hover:bg-[#233d30] text-[#fff8e7] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-3 flex flex-wrap gap-1.5 border-b border-[#d4a12a]/25 pb-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                filter === cat.id
                  ? 'bg-[#f5c542] text-[#141a17]'
                  : 'bg-[#172820] text-[#d6e4da] hover:bg-[#213a2e]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.length === 0 ? (
            <div className="col-span-full rounded-xl bg-[#16261e] p-6 text-center text-sm text-[#c7d6cc]">
              No items in this category yet. Explore shops, complete levels, and resolve street events!
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-[#16271f] border border-[#d4a12a]/45 p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-display font-bold text-base text-[#ffd166] leading-tight">
                      {item.name}
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#0d1612] text-[#9ae6b4] text-xs font-bold tabular-nums">
                      x{item.quantity}
                    </span>
                  </div>
                  <div className="font-ml text-xs text-[#9ae6b4] mt-0.5">{item.mlName}</div>
                  <p className="text-xs text-[#d0dfd5] mt-1.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-[#d4a12a]/20 text-[10px] font-extrabold uppercase tracking-wider text-[#f5c542]/80">
                  {item.category}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
