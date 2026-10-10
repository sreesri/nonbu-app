import { useColorScheme } from 'react-native';

/**
 * Design tokens, in three layers:
 *   1. `palette`   — raw colors built around the brand navy #003049. Never used directly by UI.
 *   2. semantic    — what a color *means* (background, text, primary, danger…), per scheme.
 *   3. component   — what each component paints with, derived from the semantic layer.
 * Screens use semantic tokens; shared components in `src/components/` use component tokens.
 * All text/background pairs meet WCAG AA (4.5:1) and bars/graphics meet 3:1 in both schemes.
 */
export const palette = {
  white: '#FFFFFF',
  /** Brand scale (OKLCH tints/shades of #003049). */
  navy: {
    50: '#ECF7FF',
    100: '#D7EBFA',
    200: '#B6D6EC',
    300: '#8DBBDA',
    400: '#6C98B6',
    500: '#4C7794',
    600: '#2F5A76',
    700: '#18445E',
    800: '#003049',
    950: '#001624',
  },
  /** Navy-tinted neutrals for light-mode surfaces and muted text. */
  slate: {
    50: '#F4F7F9',
    100: '#E4ECF1',
    200: '#D3DEE5',
    400: '#93AEBF',
    600: '#4A5D69',
  },
  /** Deep navy surfaces for dark mode. */
  ink: {
    700: '#163E55',
    800: '#0B3045',
    900: '#04202F',
    950: '#000F18',
  },
  // Accents from the classic #003049 palette (orange, crimson, gold), plus sky, plum and green for data.
  orange: { 400: '#F77F00', 600: '#B35400' },
  red: { 400: '#FF6B6B', 600: '#C1121F' },
  gold: { 300: '#FCBF49', 600: '#A87400' },
  sky: { 300: '#7FB3D9', 600: '#3F7CA6' },
  plum: { 300: '#C4A3E0', 600: '#7B4F9E' },
  green: { 300: '#86CFA0', 600: '#2E7A4C' },
} as const;

const light = {
  background: palette.slate[50],
  surface: palette.white,
  surfaceMuted: palette.slate[100],
  border: palette.slate[200],
  text: palette.navy[950],
  textMuted: palette.slate[600],
  primary: palette.navy[800],
  primaryText: palette.white,
  accent: palette.orange[600],
  accentText: palette.white,
  danger: palette.red[600],
  scrim: 'rgba(0,22,36,0.5)',
  fasting: palette.navy[800],
  eating: palette.orange[600],
  protein: palette.sky[600],
  carbs: palette.gold[600],
  fat: palette.plum[600],
  fiber: palette.green[600],
};

type ColorTokens = { [K in keyof typeof light]: string };

const dark: ColorTokens = {
  background: palette.ink[950],
  surface: palette.ink[900],
  surfaceMuted: palette.ink[800],
  border: palette.ink[700],
  text: palette.slate[100],
  textMuted: palette.slate[400],
  primary: palette.navy[300],
  primaryText: palette.navy[950],
  accent: palette.orange[400],
  accentText: palette.navy[950],
  danger: palette.red[400],
  scrim: 'rgba(0,0,0,0.6)',
  fasting: palette.navy[300],
  eating: palette.orange[400],
  protein: palette.sky[300],
  carbs: palette.gold[300],
  fat: palette.plum[300],
  fiber: palette.green[300],
};

function componentTokens(c: ColorTokens) {
  return {
    header: { bg: c.surface, fg: c.text },
    tabBar: { bg: c.surface, border: c.border, active: c.primary, inactive: c.textMuted },
    card: { bg: c.surface, border: c.border },
    button: {
      primary: { bg: c.primary, fg: c.primaryText },
      secondary: { bg: c.surfaceMuted, fg: c.text },
      danger: { bg: c.surfaceMuted, fg: c.danger },
    },
    chip: {
      bg: c.surfaceMuted,
      fg: c.text,
      border: c.border,
      selectedBg: c.primary,
      selectedFg: c.primaryText,
      selectedBorder: c.primary,
    },
    input: { bg: c.surface, fg: c.text, border: c.border, placeholder: c.textMuted },
    progress: { track: c.surfaceMuted, fill: c.primary, over: c.danger },
    chart: { goalLine: c.textMuted, label: c.textMuted, over: c.danger },
    banner: { bg: c.primary, fg: c.primaryText },
    sheet: { bg: c.surface, handle: c.border, scrim: c.scrim },
    wheel: { bg: c.surfaceMuted, band: c.surface, bandBorder: c.border, selected: c.primary, item: c.text, faded: c.textMuted },
    spinner: c.primary,
  };
}

function buildTheme(colors: ColorTokens) {
  return { ...colors, ...componentTokens(colors) };
}

/** Both schemes, for code that renders outside React (the home-screen widget). */
export const themes = { light: buildTheme(light), dark: buildTheme(dark) };

export type Theme = ReturnType<typeof buildTheme>;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? themes.dark : themes.light;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12, lg: 20 };
