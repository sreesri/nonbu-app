import { useColorScheme } from 'react-native';

const light = {
  background: '#F7F7F5',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEFEC',
  text: '#1B1C1A',
  textMuted: '#6B6D68',
  border: '#E2E2DE',
  primary: '#0F766E',
  primaryText: '#FFFFFF',
  danger: '#B42318',
  protein: '#2563EB',
  carbs: '#D97706',
  fat: '#9333EA',
};

const dark: typeof light = {
  background: '#121312',
  surface: '#1C1D1C',
  surfaceMuted: '#262826',
  text: '#EDEDEA',
  textMuted: '#A0A29D',
  border: '#2F312F',
  primary: '#2DD4BF',
  primaryText: '#062623',
  danger: '#F97066',
  protein: '#60A5FA',
  carbs: '#FBBF24',
  fat: '#C084FC',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12, lg: 20 };
