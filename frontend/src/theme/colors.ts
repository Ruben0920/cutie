import type { CyclePhaseEnum, DateCategoryEnum, EnergyLevelEnum } from '@/types/api';

export const colors = {
  background: '#FFF9FB',
  surface: '#FFFFFF',
  surfaceElevated: '#FDF2F6',
  surfaceMuted: '#F5EFF2',
  primary: '#E11D48',
  primarySoft: '#FFE4E9',
  primaryDark: '#BE123C',
  secondary: '#6D28D9',
  secondarySoft: '#EDE9FE',
  accentGold: '#D97706',
  accentGoldSoft: '#FEF3C7',
  textPrimary: '#1F1623',
  textSecondary: '#6B5E72',
  textMuted: '#9B8FA3',
  border: '#ECE2E8',
  success: '#10B981',
  successSoft: '#D1FAE5',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  white: '#FFFFFF',
} as const;

export const cyclePhaseColors: Record<
  CyclePhaseEnum,
  { main: string; soft: string }
> = {
  menstrual: { main: '#F43F5E', soft: '#FFE4E8' },
  follicular: { main: '#10B981', soft: '#D1FAE5' },
  ovulation: { main: '#F59E0B', soft: '#FEF3C7' },
  luteal: { main: '#8B5CF6', soft: '#EDE9FE' },
};

export const energyColors: Record<
  EnergyLevelEnum,
  { main: string; soft: string }
> = {
  low: { main: '#0EA5E9', soft: '#E0F2FE' },
  medium: { main: '#F59E0B', soft: '#FEF3C7' },
  high: { main: '#EF4444', soft: '#FEE2E2' },
};

export const categoryColors: Record<DateCategoryEnum, string> = {
  romantic: '#EC4899',
  active: '#10B981',
  relax: '#8B5CF6',
  food: '#F97316',
  extreme: '#EF4444',
  home: '#3B82F6',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;
