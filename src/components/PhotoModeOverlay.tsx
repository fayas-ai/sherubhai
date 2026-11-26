import React from 'react';
import { Camera, Download, Eye, EyeOff, X } from 'lucide-react';

interface PhotoModeOverlayProps {
  district: string;
  controlsVisible: boolean;
  shutterFlash: boolean;
  snapshotCount: number;
  lastSnapshotUrl: string | null;
  lastSnapshotName: string | null;
  onCaptureSnapshot: () => void;
  onToggleControls: () => void;
  onExitPhotoMode: () => void;
}

export const PhotoModeOverlay: React.FC<PhotoModeOverlayProps> = ({
  district,
  controlsVisible,
  shutterFlash,
  snapshotCount,
  lastSnapshotUrl,
  lastSnapshotName,
  onCaptureSnapshot,
  onToggleControls,
  onExitPhotoMode,
}) => {
  return (
    <div
      data-testid="photo-mode-overlay"
      className="pointer-events-none fixed inset-0 z-30 select-none"
    >
      {/* Crisp white camera shutter flash */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 bg-white transition-opacity duration-200 ${
          shutterFlash ? 'opacity-70' : 'opacity-0'
        }`}
      />

      {/* Minimal unobtrusive viewfinder corner marks only while controls are shown */}
      {controlsVisible && (
        <>
          <div
            aria-hidden="true"
            className="fixed top-5 left-5 w-6 h-6 border-t-2 border-l-2 border-[#ffd166]/65 rounded-tl-sm"
          />
          <div
            aria-hidden="true"
            className="fixed top-5 right-5 w-6 h-6 border-t-2 border-r-2 border-[#ffd166]/65 rounded-tr-sm"
          />
          <div
            aria-hidden="true"
            className="fixed bottom-5 left-5 w-6 h-6 border-b-2 border-l-2 border-[#ffd166]/65 rounded-bl-sm"
          />
          <div
            aria-hidden="true"
            className="fixed bottom-5 right-5 w-6 h-6 border-b-2 border-r-2 border-[#ffd166]/65 rounded-br-sm"
          />
        </>
      )}

      {/* Last captured snapshot preview card (bottom-right, compact) */}
      {controlsVisible && lastSnapshotUrl && lastSnapshotName && (
        <div
          data-testid="photo-last-preview"
          className="pointer-events-auto fixed bottom-20 right-5 flex items-center gap-2.5 rounded-xl bg-[#101c16]/90 border border-[#d4a12a]/70 p-2 shadow-[0_10px_28px_rgba(0,0,0,0.65)] backdrop-blur-md"
        >
          <img
            src={lastSnapshotUrl}
            alt={`Snapshot of ${district}`}
            className="w-20 h-12 object-cover rounded-lg border border-[#ffd166]/50"
          />
          <div className="pr-1">
            <div className="text-[11px] font-extrabold text-[#ffd166] leading-tight">
              Snapshot Saved ({snapshotCount})
            </div>
            <div className="text-[10px] text-[#cfe8dc] max-w-[140px] truncate">
              {district}
            </div>
            <a
              href={lastSnapshotUrl}
              download={lastSnapshotName}
              className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#9ae6b4] hover:text-white underline underline-offset-2"
            >
              <Download className="w-3 h-3" />
              Save again
            </a>
          </div>
        </div>
      )}

      {/* Compact bottom-center Photo Mode toolbar (hideable with H for a 100% pure frame) */}
      {controlsVisible ? (
        <div
          data-testid="photo-mode-toolbar"
          className="pointer-events-auto fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-xl bg-[#101c16]/88 border border-[#d4a12a]/75 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.65)] backdrop-blur-md"
        >
          <span className="hidden sm:inline-flex items-center gap-1.5 pr-2 border-r border-[#d4a12a]/35 text-[11px] font-bold text-[#cfe8dc] whitespace-nowrap">
            <Camera className="w-3.5 h-3.5 text-[#ffd166]" />
            <span>Photo Mode</span>
            <span className="text-[#9ae6b4]">· Camera Frozen</span>
          </span>

          <button
            type="button"
            data-testid="photo-capture-btn"
            aria-label="Take Snapshot"
            title="Take Snapshot [Space]"
            onClick={(e) => {
              e.currentTarget.blur();
              onCaptureSnapshot();
            }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17] text-xs font-extrabold cursor-pointer whitespace-nowrap"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Snap [Space]</span>
          </button>

          <button
            type="button"
            data-testid="photo-hide-ui-btn"
            aria-label="Hide Photo Controls"
            title="Hide Photo Bar [H]"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleControls();
            }}
            className="flex items-center gap-1 h-8 px-2.5 rounded-lg bg-[#182c22] hover:bg-[#223d30] border border-[#d4a12a]/50 text-[#fff8e7] text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clean [H]</span>
          </button>

          <button
            type="button"
            data-testid="photo-exit-btn"
            aria-label="Exit Photo Mode"
            title="Exit Photo Mode [V or Esc]"
            onClick={(e) => {
              e.currentTarget.blur();
              onExitPhotoMode();
            }}
            className="flex items-center gap-1 h-8 px-2.5 rounded-lg bg-[#182c22] hover:bg-[#2a3f34] border border-[#d4a12a]/50 text-[#ffd166] text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit [V]</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          data-testid="photo-show-ui-btn"
          aria-label="Show Photo Mode Controls"
          title="Show Photo Controls [H] · Exit [V]"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleControls();
          }}
          className="pointer-events-auto fixed bottom-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg bg-black/35 hover:bg-black/65 text-white/70 hover:text-[#ffd166] cursor-pointer transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
