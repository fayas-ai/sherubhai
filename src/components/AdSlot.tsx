import React, { useEffect, useRef } from 'react';

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
    label: 'Adsterra 320×50',
  },
  board_300x250: {
    variant: 'board_300x250',
    key: 'b4371a85a2736f642613c332799aeb7b',
    width: 300,
    height: 250,
    scriptSrc: 'https://bauval.org/22/b4371a85a2736f642613c332799aeb7b',
    label: 'Adsterra 300×250',
  },
};

/**
 * Generates clean, ads-only HTML for an unsandboxed friendly same-origin iframe.
 * Using a friendly iframe (doc.open/write/close without `sandbox`) inherits the
 * host page's real domain & Referer so Adsterra serves live ads, while isolating
 * each slot's `atOptions` global so 320×50 and 300×250 units never collide.
 */
export function buildAdSlotSrcDoc(variant: AdSlotVariant): string {
  const cfg = AD_SLOTS[variant];
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8" />',
    '<style>',
    'html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:transparent;display:flex;align-items:center;justify-content:center;}',
    '</style>',
    '</head>',
    '<body>',
    '<script type="text/javascript">',
    'atOptions = {',
    `  'key' : '${cfg.key}',`,
    "  'format' : 'iframe',",
    `  'height' : ${cfg.height},`,
    `  'width' : ${cfg.width},`,
    "  'params' : {}",
    '};',
    '</script>',
    `<script type="text/javascript" src="${cfg.scriptSrc}"></script>`,
    '</body>',
    '</html>',
  ].join('\n');
}

interface AdSlotProps {
  variant: AdSlotVariant;
  className?: string;
  testId?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ variant, className = '', testId }) => {
  const cfg = AD_SLOTS[variant];
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentWindow?.document ?? iframe.contentDocument;
      if (!doc) return;
      doc.open();
      doc.write(buildAdSlotSrcDoc(variant));
      doc.close();
    } catch {
      // ignore cross-origin restriction if browser blocks document write
    }
  }, [variant]);

  return (
    <div
      data-testid={testId ?? `ad-slot-${variant}`}
      className={`inline-flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: cfg.width, height: cfg.height }}
    >
      <iframe
        ref={iframeRef}
        title={cfg.label}
        width={cfg.width}
        height={cfg.height}
        scrolling="no"
        frameBorder={0}
        className="block border-0 bg-transparent"
        style={{ width: cfg.width, height: cfg.height }}
      />
    </div>
  );
};
