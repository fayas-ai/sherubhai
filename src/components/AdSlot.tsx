import React, { useMemo } from 'react';

export type AdSlotVariant = 'banner_320x50' | 'board_300x250';

export interface AdSlotConfig {
  variant: AdSlotVariant;
  key: string;
  width: number;
  height: number;
  scriptSrc: string;
  label: string;
}

export const AD_SLOTS: Record<AdSlotVariant, AdSlotConfig> = {
  banner_320x50: {
    variant: 'banner_320x50',
    key: '413a7c933ff446f282700a00aeaf2f13',
    width: 320,
    height: 50,
    scriptSrc: 'https://bauval.org/22/413a7c933ff446f282700a00aeaf2f13',
    label: 'Banner 320×50',
  },
  board_300x250: {
    variant: 'board_300x250',
    key: 'b4371a85a2736f642613c332799aeb7b',
    width: 300,
    height: 250,
    scriptSrc: 'https://bauval.org/22/b4371a85a2736f642613c332799aeb7b',
    label: 'Ads Board 300×250',
  },
};

/**
 * Generates an isolated HTML document for each ad unit so multiple `atOptions`
 * scripts on the same page never clobber one another or mutate the parent React DOM.
 */
export function buildAdSlotSrcDoc(variant: AdSlotVariant): string {
  const cfg = AD_SLOTS[variant];
  const isBoard = variant === 'board_300x250';
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8" />',
    '<style>',
    'html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#0e1914;position:relative;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#fff8e7;}',
    '.fallback{position:absolute;inset:0;z-index:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:radial-gradient(circle at 50% 30%,#1a3629 0%,#0c1712 100%);pointer-events:none;text-align:center;padding:8px;box-sizing:border-box;}',
    '.badge{display:inline-block;padding:2px 8px;border-radius:4px;background:#f5c542;color:#141a17;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;}',
    '.title{font-size:12px;font-weight:800;color:#ffd166;letter-spacing:.04em;}',
    '.sub{font-size:10px;color:#9ae6b4;opacity:.9;}',
    '.ad-wrap{position:relative;z-index:1;width:100%;height:100%;display:flex;align-items:center;justify-content:center;}',
    '</style>',
    '</head>',
    '<body>',
    '<div class="fallback">',
    isBoard
      ? `<span class="badge">KERALA ADS BOARD · 300×250</span><div class="title">SHERU BHAI SPONSOR DISPLAY</div><div class="sub">GHOP GHOP MEME TOWN</div>`
      : `<div style="display:flex;align-items:center;gap:8px;"><span class="badge">320×50</span><span class="title">SHERU BHAI SPONSOR BANNER</span></div>`,
    '</div>',
    '<div class="ad-wrap">',
    '<script>',
    'atOptions = {',
    `  'key' : '${cfg.key}',`,
    "  'format' : 'iframe',",
    `  'height' : ${cfg.height},`,
    `  'width' : ${cfg.width},`,
    "  'params' : {}",
    '};',
    '</script>',
    `<script src="${cfg.scriptSrc}"></script>`,
    '</div>',
    '</body>',
    '</html>',
  ].join('\n');
}

interface AdSlotProps {
  variant: AdSlotVariant;
  caption?: string;
  className?: string;
  testId?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ variant, caption, className = '', testId }) => {
  const cfg = AD_SLOTS[variant];
  const srcDoc = useMemo(() => buildAdSlotSrcDoc(variant), [variant]);

  return (
    <div
      data-testid={testId ?? `ad-slot-${variant}`}
      className={`inline-flex flex-col items-center rounded-xl bg-[#0e1914]/95 border border-[#d4a12a]/65 shadow-[0_8px_24px_rgba(0,0,0,0.55)] overflow-hidden ${className}`}
    >
      {caption && (
        <div className="w-full flex items-center justify-between px-2.5 py-1 bg-[#162820] border-b border-[#d4a12a]/35 text-[10px] font-extrabold uppercase tracking-wider text-[#ffd166]">
          <span>{caption}</span>
          <span className="text-[#9ae6b4] tabular-nums">
            {cfg.width}×{cfg.height}
          </span>
        </div>
      )}
      <div
        className="relative flex items-center justify-center bg-[#0c1611] overflow-hidden"
        style={{ width: cfg.width, height: cfg.height }}
      >
        <iframe
          title={caption ?? cfg.label}
          srcDoc={srcDoc}
          width={cfg.width}
          height={cfg.height}
          scrolling="no"
          frameBorder={0}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          className="block border-0"
          style={{ width: cfg.width, height: cfg.height }}
        />
      </div>
    </div>
  );
};
