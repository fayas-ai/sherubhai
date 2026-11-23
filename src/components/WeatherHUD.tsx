import React from 'react';
import { CloudFog, CloudRain, MoonStar, Sun, Wind } from 'lucide-react';
import { TimeOfDayPhase, WeatherHudState } from '../types/game';

interface WeatherHUDProps {
  weather: WeatherHudState;
  timePhase: TimeOfDayPhase;
  onCycleWeather: () => void;
}

const WEATHER_THEMES = {
  sunny: {
    border: 'border-[#f5c542]',
    badgeBg: 'bg-[#2a220c]',
    accentText: 'text-[#ffd166]',
    barColor: 'bg-[#f5c542]',
    ringGlow: 'shadow-[0_6px_18px_rgba(245,197,66,0.22)]',
  },
  rain: {
    border: 'border-[#38bdf8]',
    badgeBg: 'bg-[#0c2436]',
    accentText: 'text-[#7dd3fc]',
    barColor: 'bg-[#38bdf8]',
    ringGlow: 'shadow-[0_6px_18px_rgba(56,189,248,0.28)]',
  },
  mist: {
    border: 'border-[#94d2bd]',
    badgeBg: 'bg-[#172c2a]',
    accentText: 'text-[#a7f3d0]',
    barColor: 'bg-[#94d2bd]',
    ringGlow: 'shadow-[0_6px_18px_rgba(148,210,189,0.24)]',
  },
} as const;

export const WeatherHUD: React.FC<WeatherHUDProps> = ({
  weather,
  timePhase,
  onCycleWeather,
}) => {
  const theme = WEATHER_THEMES[weather.condition];
  const progressPct = Math.round(weather.cycleProgress * 100);
  const isClearNight = weather.condition === 'sunny' && timePhase === 'night';

  return (
    <button
      key={`${weather.condition}-${weather.transitionId}`}
      type="button"
      tabIndex={-1}
      data-testid="weather-hud"
      data-weather={weather.condition}
      data-transition-id={weather.transitionId}
      aria-label={`Weather HUD: ${weather.label}, ${weather.temperatureC} degrees Celsius. Click to cycle weather.`}
      onClick={(e) => {
        e.currentTarget.blur();
        onCycleWeather();
      }}
      className={`pointer-events-auto animate-weather-shift group relative overflow-hidden rounded-xl bg-[#111d17]/94 hover:bg-[#192c22] border-2 ${theme.border} ${theme.ringGlow} px-2 sm:px-3 py-1 sm:py-2 text-left transition-colors cursor-pointer min-w-0 max-w-[126px] sm:max-w-none sm:min-w-[164px]`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Animated Weather Condition Icon Stage */}
        <div
          data-testid="weather-hud-icon"
          className={`relative w-7 h-7 sm:w-9 sm:h-9 rounded-lg ${theme.badgeBg} border border-white/15 flex items-center justify-center overflow-hidden shrink-0`}
        >
          {weather.condition === 'sunny' && (
            <>
              {isClearNight ? (
                <MoonStar className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#fde68a] animate-pulse" />
              ) : (
                <Sun className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#ffd166] animate-weather-sun" />
              )}
            </>
          )}

          {weather.condition === 'rain' && (
            <>
              <CloudRain className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#7dd3fc] animate-weather-cloud relative z-10 -mt-1" />
              <span
                className="pointer-events-none absolute left-1.5 sm:left-2 top-2.5 sm:top-3 w-0.5 h-2 sm:h-2.5 rounded-full bg-[#38bdf8] rotate-[16deg] animate-weather-raindrop"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="pointer-events-none absolute left-3.5 sm:left-4 top-2 sm:top-2.5 w-0.5 h-2 sm:h-2.5 rounded-full bg-[#bae6fd] rotate-[16deg] animate-weather-raindrop"
                style={{ animationDelay: '260ms' }}
              />
              <span
                className="pointer-events-none absolute left-5 sm:left-6 top-2.5 sm:top-3 w-0.5 h-2 sm:h-2.5 rounded-full bg-[#38bdf8] rotate-[16deg] animate-weather-raindrop"
                style={{ animationDelay: '520ms' }}
              />
            </>
          )}

          {weather.condition === 'mist' && (
            <>
              <CloudFog className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#a7f3d0] relative z-10 -mt-1" />
              <span
                className="pointer-events-none absolute bottom-1 sm:bottom-1.5 left-1 right-1 h-1 rounded-full bg-[#cbd5e1]/65 animate-weather-mist"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="pointer-events-none absolute bottom-2.5 sm:bottom-3 left-1.5 right-1.5 h-0.5 rounded-full bg-[#e2e8f0]/55 animate-weather-mist"
                style={{ animationDelay: '900ms' }}
              />
            </>
          )}
        </div>

        {/* Weather Telemetry Copy */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className={`text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider ${theme.accentText}`}>
              WEATHER
            </span>
            <span
              data-testid="weather-hud-temp"
              className="font-display font-extrabold text-[11px] sm:text-sm text-[#fff8e7] tabular-nums leading-none"
            >
              {weather.temperatureC}°C
            </span>
          </div>

          <div
            data-testid="weather-hud-label"
            className="font-display font-extrabold text-[11px] sm:text-sm text-[#fff8e7] leading-tight truncate mt-0.5"
          >
            {weather.label}
          </div>

          <div className="hidden sm:flex items-center justify-between gap-1.5 text-[10px] text-[#c7d6cc] mt-0.5">
            <span className="font-ml truncate text-[#ffd166]/90">{weather.mlLabel}</span>
            <span className="flex items-center gap-0.5 tabular-nums shrink-0 text-[#9ae6b4]">
              <Wind className="w-2.5 h-2.5" />
              {weather.windKmh}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Weather Cycle Progress Hairline */}
      <div className="mt-1.5 h-1 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full ${theme.barColor} transition-all duration-300`}
          style={{ width: `${Math.max(4, progressPct)}%` }}
        />
      </div>
    </button>
  );
};
