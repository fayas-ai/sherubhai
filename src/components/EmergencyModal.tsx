import React from 'react';
import { Ambulance, HeartPulse, Navigation, PhoneCall, Siren, X } from 'lucide-react';
import { EmergencyIncident } from '../types/game';

interface EmergencyModalProps {
  incident: EmergencyIncident;
  doctorResult?: { ml: string; en: string } | null;
  onCallAmbulance: () => void;
  onChooseRideAuto: () => void;
  onChooseDriveSelf: () => void;
  onDismiss: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  incident,
  doctorResult,
  onCallAmbulance,
  onChooseRideAuto,
  onChooseDriveSelf,
  onDismiss,
}) => {
  if (incident.status === 'ambulance_en_route') {
    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-auto w-[92vw] max-w-md rounded-xl bg-[#991b1b]/95 border-2 border-[#fde047] shadow-[0_12px_35px_rgba(0,0,0,0.65)] text-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Ambulance className="w-7 h-7 text-[#fde047] animate-bounce shrink-0" />
            <div>
              <div className="font-display font-extrabold text-sm text-[#fde047] leading-tight">
                108 AMBULANCE RUSHING TO SCENE!
              </div>
              <p className="font-ml text-[11px] text-white/95">
                സൈറൺ ഓൺ ആണ്! മറ്റു വണ്ടികൾ സൈഡ് കൊടുക്കുന്നു...
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Cancel 108 Dispatch"
            className="p-1 rounded bg-black/25 hover:bg-black/45 text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (incident.status === 'treated' && doctorResult) {
    return (
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-[94vw] max-w-xl rounded-2xl bg-[#161a1d]/95 border-2 border-[#4ade80] shadow-[0_18px_50px_rgba(0,0,0,0.75)] text-[#fff8e7] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#0f5132] border-b border-emerald-400/35">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-[#4ade80] shrink-0" />
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#86efac]">
                KERALA GENERAL HOSPITAL · 108 VIP WARD
              </div>
              <h3 className="font-display font-extrabold text-sm sm:text-base leading-tight">
                {incident.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close Hospital Recovery Card"
            className="p-1.5 rounded-lg bg-black/25 hover:bg-black/45 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-3 space-y-2.5">
          <div className="p-2.5 rounded-xl bg-[#1f292e] border border-[#4ade80]/35 space-y-1">
            <p className="font-ml text-sm text-[#ffd166] font-semibold leading-relaxed">
              {doctorResult.ml}
            </p>
            <p className="text-xs text-[#d1d5db] leading-relaxed">{doctorResult.en}</p>
          </div>
          <button
            type="button"
            data-testid="hospital-recovery-done"
            onClick={onDismiss}
            className="w-full py-2 rounded-xl bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17] font-display font-extrabold text-xs sm:text-sm cursor-pointer"
          >
            EXPLORE HOSPITAL INTERIOR &amp; TOWN (+15 FAME!)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#161a1d] border-2 border-[#ef4444] shadow-[0_18px_50px_rgba(0,0,0,0.8)] text-[#fff8e7] overflow-hidden">
        {/* Emergency Banner */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#991b1b] border-b border-red-400/40">
          <div className="flex items-center gap-2.5">
            <Siren className="w-6 h-6 text-[#fde047] animate-pulse" />
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#fde047]">
                108 KERALA EMERGENCY RESCUE
              </div>
              <h3 className="font-display font-extrabold text-lg leading-tight">
                {incident.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close Emergency Window"
            className="p-1.5 rounded-lg bg-black/25 hover:bg-black/45 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {incident.status === 'alert' ? (
            <>
              <div className="p-3.5 rounded-xl bg-[#241b1b] border border-red-500/40 space-y-1.5">
                <p className="font-ml text-base text-[#ffd166] font-bold leading-relaxed">
                  {incident.mlMessage}
                </p>
                <p className="text-xs text-[#e5e7eb]">{incident.enMessage}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  data-testid="call-ambulance-btn"
                  onClick={onCallAmbulance}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#dc2626] hover:bg-[#ef4444] text-white font-display font-extrabold text-sm shadow cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  CALL 108 AMBULANCE!
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="py-3 px-4 rounded-xl bg-[#272e34] hover:bg-[#343e46] text-[#e5e7eb] font-bold text-xs cursor-pointer"
                >
                  I’m Okay, Shake It Off
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="p-3.5 rounded-xl bg-[#1b2922] border border-[#4ade80]/50 space-y-1">
                <div className="font-display font-extrabold text-sm text-[#4ade80]">
                  108 AMBULANCE HAS ARRIVED!
                </div>
                <p className="font-ml text-sm text-[#ffd166]">
                  "ഷേരു ഭായ്! ആംബുലൻസ് എത്തി! ഓട്ടോ-ഡ്രൈവിൽ ആശുപത്രിയിൽ പോകണോ, അതോ ഭായ് തന്നെ ഓടിക്കണോ?"
                </p>
                <p className="text-xs text-[#d1d5db]">
                  Choose who drives to Kerala General Hospital — Auto-Drive races up to 180 km/h with automatic Siren & Horn!
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  data-testid="ambulance-auto-drive"
                  onClick={onChooseRideAuto}
                  className="flex flex-col items-center justify-center gap-1 py-3 px-3 rounded-xl bg-[#dc2626] hover:bg-[#ef4444] text-white font-display font-extrabold text-xs cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>AUTO-DRIVE TO HOSPITAL</span>
                  <span className="text-[10px] font-normal opacity-90">
                    Siren + Auto-Horn · Up to 180 km/h
                  </span>
                </button>
                <button
                  type="button"
                  data-testid="ambulance-self-drive"
                  onClick={onChooseDriveSelf}
                  className="flex flex-col items-center justify-center gap-1 py-3 px-3 rounded-xl bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17] font-display font-extrabold text-xs cursor-pointer"
                >
                  <Ambulance className="w-4 h-4" />
                  <span>DRIVE AMBULANCE MYSELF</span>
                  <span className="text-[10px] font-normal opacity-90">
                    Full WASD + Siren Control
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
