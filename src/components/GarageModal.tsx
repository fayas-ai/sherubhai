import React, { useState } from 'react';
import { Car, Check, Gauge, MapPin, Plane, Siren, X } from 'lucide-react';
import { GameProgressState, VehicleCategory, VehicleDef } from '../types/game';
import { VEHICLE_CATALOG } from '../data/vehiclesData';
import { CURRENCY_SYMBOL } from '../data/worldData';
import { formatGhop } from '../game/gameLogic';

interface GarageModalProps {
  progress: GameProgressState;
  onBuyVehicle: (veh: VehicleDef) => void;
  onSpawnAndDrive: (veh: VehicleDef) => void;
  onGoToAirport: () => void;
  onClose: () => void;
}

const CATEGORY_TABS: { id: 'all' | VehicleCategory; label: string }[] = [
  { id: 'all', label: `All ${VEHICLE_CATALOG.length} Vehicles` },
  { id: 'aircraft', label: 'Aeroplanes (3)' },
  { id: 'luxury', label: 'Luxury & Sports' },
  { id: 'daily', label: 'Cars, Jeep & Taxi' },
  { id: 'twowheeler', label: 'Auto & Bikes' },
  { id: 'bus', label: 'Kerala Buses' },
  { id: 'commercial', label: 'Trucks & Vans' },
  { id: 'emergency', label: '108 Emergency' },
];

export const GarageModal: React.FC<GarageModalProps> = ({
  progress,
  onBuyVehicle,
  onSpawnAndDrive,
  onGoToAirport,
  onClose,
}) => {
  const [tab, setTab] = useState<'all' | VehicleCategory>('all');

  const list =
    tab === 'all'
      ? VEHICLE_CATALOG
      : VEHICLE_CATALOG.filter((v) => v.category === tab);

  return (
    <div className="fixed inset-0 z-40 bg-black/72 flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[#111d17] border-2 border-[#f5c542] shadow-[0_20px_55px_rgba(0,0,0,0.8)] text-[#fff8e7]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#d4a12a]/35 bg-[#172820] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f5c542] text-[#141a17] flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-lg sm:text-xl text-[#ffd166]">
                SHERU BHAI GARAGE &amp; AIRPORT HANGAR
              </h2>
              <p className="text-xs text-[#c7d6cc]">
                {VEHICLE_CATALOG.length} Fleet Vehicles &amp; Flyable Aeroplanes · Easy Arcade Driving &amp; Runway Takeoff
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="garage-goto-airport"
              onClick={onGoToAirport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-extrabold cursor-pointer"
            >
              <Plane className="w-4 h-4" />
              Go to Airport &amp; Runway
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Vehicle Garage"
              className="p-2 rounded-lg bg-[#21382d] hover:bg-[#2d4d3e] text-[#ffd166] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 px-5 py-3 border-b border-[#d4a12a]/25 bg-[#13221b]">
          {CATEGORY_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                tab === t.id
                  ? 'bg-[#f5c542] text-[#141a17]'
                  : 'bg-[#1a2f25] text-[#d9e5dc] hover:bg-[#254234]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Vehicle Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((v) => {
            const owned = progress.ownedVehicleIds.includes(v.id) || (v.priceGhop ?? 0) === 0;
            const parked = progress.parkedVehicles?.[v.id];
            const swatchHex = `#${v.color.toString(16).padStart(6, '0')}`;
            const accentHex = `#${v.accentColor.toString(16).padStart(6, '0')}`;
            return (
              <div
                key={v.id}
                className={`rounded-xl border-2 p-3.5 flex flex-col justify-between gap-2.5 ${
                  owned
                    ? 'bg-[#172b22] border-[#d4a12a]/65'
                    : 'bg-[#14201a] border-[#d4a12a]/25'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full border-2 shrink-0"
                        style={{ backgroundColor: swatchHex, borderColor: accentHex }}
                      />
                      <span className="font-display font-bold text-sm text-[#fff8e7] leading-tight">
                        {v.name}
                      </span>
                    </div>
                    {v.hasSiren && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-extrabold">
                        <Siren className="w-3 h-3" /> SIREN
                      </span>
                    )}
                  </div>
                  {v.mlName && (
                    <div className="text-[11px] font-ml text-[#ffd166]">{v.mlName}</div>
                  )}
                  <p className="text-[11px] text-[#c7d6cc] mt-1 leading-snug">
                    {v.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#d4a12a]/20">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-[#9ae6b4] font-bold">
                      <Gauge className="w-3.5 h-3.5" />
                      Top: {v.maxKmh ?? Math.round(v.maxSpeed * 4)} km/h
                    </span>
                    {parked ? (
                      <span className="flex items-center gap-1 text-[#ffd166] font-semibold">
                        <MapPin className="w-3 h-3" />
                        {parked.bayName ? parked.bayName.split(' ')[0] : 'Parked'}
                      </span>
                    ) : owned ? (
                      <span className="flex items-center gap-1 text-[#9ae6b4] font-bold">
                        <Check className="w-3 h-3" /> Owned
                      </span>
                    ) : (
                      <span className="font-bold text-[#ffd166] tabular-nums">
                        {CURRENCY_SYMBOL} {formatGhop(v.priceGhop ?? 500000)}
                      </span>
                    )}
                  </div>

                  {owned ? (
                    <button
                      type="button"
                      data-testid={`drive-${v.id}`}
                      onClick={() => onSpawnAndDrive(v)}
                      className={`w-full py-2 rounded-lg font-display font-extrabold text-xs cursor-pointer ${
                        v.isAircraft
                          ? 'bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#0c1d2b]'
                          : 'bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17]'
                      }`}
                    >
                      {v.isAircraft ? 'FLY ON RUNWAY NOW' : 'SUMMON & DRIVE NOW'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-testid={`buy-${v.id}`}
                      onClick={() => onBuyVehicle(v)}
                      className="w-full py-2 rounded-lg bg-[#1c7c54] hover:bg-[#239666] text-white font-display font-extrabold text-xs cursor-pointer"
                    >
                      BUY WITH GHOP ({CURRENCY_SYMBOL} {formatGhop(v.priceGhop ?? 500000)})
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
