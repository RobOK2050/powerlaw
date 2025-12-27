// Bitcoin Genesis Block - January 3, 2009
export const GENESIS_BLOCK = new Date('2009-01-03T00:00:00Z');

// Power Law default parameters (Giovanni Santostasi model)
export const DEFAULT_EXPONENT = 5.82;
export const DEFAULT_COEFFICIENT = 1.0117e-17;

// Confidence band multipliers
export const SUPPORT_MULTIPLIER = 0.42;
export const RESISTANCE_MULTIPLIER = 2.4;

// Date range defaults
export const DEFAULT_START_DATE = GENESIS_BLOCK;
export const DEFAULT_END_DATE = new Date('2040-12-31T00:00:00Z');

// Slider ranges
export const EXPONENT_MIN = 4.0;
export const EXPONENT_MAX = 7.0;
export const EXPONENT_STEP = 0.01;

// Data point intervals
export const INTERVAL_THRESHOLDS = {
  MONTHLY: 365 * 20,
  BIWEEKLY: 365 * 10,
  WEEKLY: 365 * 5,
  EVERY_3_DAYS: 365,
  DAILY: 0,
};

// Colors
export const COLORS = {
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgTertiary: '#1a1a25',
  accentPrimary: '#f7931a',
  accentSecondary: '#fb923c',
  textPrimary: '#f4f4f5',
  textSecondary: '#a1a1aa',
  textTertiary: '#71717a',
  chartPowerLaw: '#f7931a',
  chartBandFill: 'rgba(251, 146, 60, 0.15)',
  chartBandStroke: 'rgba(251, 146, 60, 0.4)',
  chartActualPrice: '#22c55e',
  chartGrid: 'rgba(255, 255, 255, 0.05)',
};
