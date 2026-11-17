/**
 * @file theme.ts
 * @description Centralized design tokens for the app.
 * All colors, typography, spacing, and common styles are defined here.
 * Components import from this file to ensure visual consistency.
 */

/**
 * App color palette — strict brand colors.
 * Yellow: header/logo bg, table headers, input borders, item buttons
 * Red: primary buttons, links, chart bars, alert icons
 * Cream: screen background
 * White: input fields, cards, text on red buttons
 * NearBlack: titles, labels, body text
 */
export const COLORS = {
  /** Brand yellow — headers, table header rows, input borders, item buttons */
  yellow: '#f6b800',
  /** Primary red — buttons, links, chart bars, alert icons */
  red: '#EC0000',
  /** Cream / off-white — screen background */
  cream: '#fffdf5',
  /** Pure white — input fields, cards, button text on red */
  white: '#FFFFFF',
  /** Near-black — titles, labels, body text */
  nearBlack: '#0F1015',
  /** Secondary text */
  textSecondary: '#374151',
  /** Placeholder text */
  placeholder: '#9ca3af',
  /** Light gray for borders & dividers */
  border: '#e5e7eb',
  /** Transparent overlay for modals */
  overlay: 'rgba(0, 0, 0, 0.22)',
  /** Drawer background */
  drawerBg: '#fdf8ea',
  /** Success green */
  green: '#387c2b',
  /** Modal card background */
  modalBg: '#fdfbf0',
} as const;

/**
 * Typography configuration.
 * All font families reference the Poppins variants loaded in _layout.tsx.
 */
export const FONTS = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

/**
 * Standard font sizes used throughout the app.
 */
export const FONT_SIZES = {
  /** Screen titles (e.g., "Welcome!", "Transaction History") */
  screenTitle: 26,
  /** Section headings */
  sectionTitle: 22,
  /** Page subtitles */
  subtitle: 14,
  /** Button text */
  button: 16,
  /** Body / regular text */
  body: 14,
  /** Small labels */
  label: 13,
  /** Extra small / captions */
  caption: 11,
  /** Links */
  link: 12,
  /** Table header cells */
  tableHeader: 12,
  /** Table body cells */
  tableCell: 11,
} as const;

/**
 * Shared spacing values.
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/**
 * Shared border radius values.
 */
export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
  modal: 34,
} as const;

// TEST: Verify all color values are valid hex codes
// TEST: Verify all font family references match loaded fonts in _layout.tsx
