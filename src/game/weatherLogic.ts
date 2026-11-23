import { TimeOfDayPhase, WeatherCondition, WeatherHudState } from '../types/game';

export const WEATHER_SEQUENCE: readonly WeatherCondition[] = ['sunny', 'rain', 'mist'] as const;

export const DEFAULT_WEATHER_CYCLE_SECONDS = 48;

export interface WeatherVisualConfig {
  condition: WeatherCondition;
  label: string;
  shortLabel: string;
  mlLabel: string;
  skyHex: number;
  skyBlend: number;
  fogNear: number;
  fogFar: number;
  sunIntensityMult: number;
  hemiIntensityMult: number;
  rainDensity: number;
  temperatureC: number;
  windKmh: number;
}

export interface WeatherControllerState {
  condition: WeatherCondition;
  previousCondition: WeatherCondition;
  transitionId: number;
  elapsedInPhase: number;
  phaseDuration: number;
  intensity: number; // 0..1 smooth fade-in within active condition
}

export function createInitialWeatherState(
  initialCondition: WeatherCondition = 'sunny',
  phaseDuration: number = DEFAULT_WEATHER_CYCLE_SECONDS,
): WeatherControllerState {
  return {
    condition: initialCondition,
    previousCondition: initialCondition,
    transitionId: 0,
    elapsedInPhase: 0,
    phaseDuration: Math.max(8, phaseDuration),
    intensity: 1,
  };
}

export function getNextWeatherCondition(current: WeatherCondition): WeatherCondition {
  const idx = WEATHER_SEQUENCE.indexOf(current);
  return WEATHER_SEQUENCE[(idx + 1) % WEATHER_SEQUENCE.length];
}

export function cycleWeatherCondition(
  state: WeatherControllerState,
  target?: WeatherCondition,
): WeatherControllerState {
  const nextCondition = target ?? getNextWeatherCondition(state.condition);
  if (nextCondition === state.condition) {
    return state;
  }
  return {
    ...state,
    previousCondition: state.condition,
    condition: nextCondition,
    transitionId: state.transitionId + 1,
    elapsedInPhase: 0,
    intensity: 0.15,
  };
}

export function stepWeatherCycle(
  state: WeatherControllerState,
  dt: number,
  autoAdvance: boolean = true,
): { state: WeatherControllerState; changed: boolean } {
  const safeDt = Math.max(0, Math.min(dt, 5));
  let nextElapsed = state.elapsedInPhase + (autoAdvance ? safeDt : 0);
  let nextCondition = state.condition;
  let prevCondition = state.previousCondition;
  let transitionId = state.transitionId;
  let changed = false;

  if (autoAdvance && nextElapsed >= state.phaseDuration) {
    const steps = Math.floor(nextElapsed / state.phaseDuration);
    nextElapsed = nextElapsed % state.phaseDuration;
    for (let i = 0; i < steps; i++) {
      prevCondition = nextCondition;
      nextCondition = getNextWeatherCondition(nextCondition);
      transitionId += 1;
      changed = true;
    }
  }

  // Smooth 3.5s ramp-in when entering a new weather phase
  const ramp = Math.min(1, Math.max(0.15, nextElapsed / 3.5));
  const intensity = changed ? ramp : Math.min(1, state.intensity + safeDt * 0.45);

  return {
    state: {
      ...state,
      condition: nextCondition,
      previousCondition: prevCondition,
      transitionId,
      elapsedInPhase: nextElapsed,
      intensity: Math.max(ramp, intensity),
    },
    changed,
  };
}

export function getWeatherVisualConfig(
  condition: WeatherCondition,
  timePhase: TimeOfDayPhase,
): WeatherVisualConfig {
  const tempOffset = timePhase === 'night' ? -4 : timePhase === 'sunset' ? -2 : 0;

  if (condition === 'rain') {
    return {
      condition: 'rain',
      label: 'Monsoon Rain',
      shortLabel: 'Rain',
      mlLabel: 'മഴക്കാലം',
      skyHex: timePhase === 'night' ? 0x0c1422 : timePhase === 'sunset' ? 0x626b7a : 0x5c758c,
      skyBlend: 0.72,
      fogNear: 36,
      fogFar: 122,
      sunIntensityMult: 0.56,
      hemiIntensityMult: 0.78,
      rainDensity: 1,
      temperatureC: 25 + tempOffset,
      windKmh: 22,
    };
  }

  if (condition === 'mist') {
    return {
      condition: 'mist',
      label: 'Backwater Mist',
      shortLabel: 'Mist',
      mlLabel: 'മൂടൽമഞ്ഞ്',
      skyHex: timePhase === 'night' ? 0x1e2c3a : timePhase === 'sunset' ? 0xc7b8a8 : 0xcbdce0,
      skyBlend: 0.82,
      fogNear: 15,
      fogFar: 86,
      sunIntensityMult: 0.72,
      hemiIntensityMult: 0.94,
      rainDensity: 0,
      temperatureC: 22 + tempOffset,
      windKmh: 9,
    };
  }

  return {
    condition: 'sunny',
    label: timePhase === 'night' ? 'Clear Night' : timePhase === 'sunset' ? 'Golden Dusk' : 'Tropical Sun',
    shortLabel: timePhase === 'night' ? 'Clear' : 'Sunny',
    mlLabel: timePhase === 'night' ? 'തെളിഞ്ഞ രാത്രി' : 'നല്ല വെയിൽ',
    skyHex: 0x88ccf1,
    skyBlend: 0,
    fogNear: 65,
    fogFar: 175,
    sunIntensityMult: 1,
    hemiIntensityMult: 1,
    rainDensity: 0,
    temperatureC: 31 + tempOffset,
    windKmh: 12,
  };
}

export function buildWeatherHudState(
  state: WeatherControllerState,
  timePhase: TimeOfDayPhase,
): WeatherHudState {
  const cfg = getWeatherVisualConfig(state.condition, timePhase);
  return {
    condition: state.condition,
    previousCondition: state.previousCondition,
    transitionId: state.transitionId,
    cycleProgress: Math.min(1, Math.max(0, state.elapsedInPhase / state.phaseDuration)),
    intensity: state.intensity,
    label: cfg.label,
    mlLabel: cfg.mlLabel,
    temperatureC: cfg.temperatureC,
    windKmh: cfg.windKmh,
  };
}
