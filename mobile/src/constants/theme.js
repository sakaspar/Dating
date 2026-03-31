/**
 * Doukhou Theme & Design Constants
 */

export const COLORS = {
  // Primary
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5A4BD1',

  // Secondary (CTAs)
  secondary: '#FF6B6B',
  secondaryLight: '#FF8E8E',
  secondaryDark: '#E85555',

  // Status
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#E17055',

  // Neutrals
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceDark: '#F1F3F5',
  border: '#E9ECEF',

  // Text
  textPrimary: '#2D3436',
  textSecondary: '#636E72',
  textLight: '#B2BEC3',
  textWhite: '#FFFFFF',

  // Activity colors
  coffee: '#D4A574',
  restaurant: '#E17055',
  activities: '#6C5CE7',
  outdoor: '#00B894',
  social: '#FDCB6E',
  events: '#0984E3',

  // Gradient
  gradientStart: '#6C5CE7',
  gradientEnd: '#A29BFE',
};

export const FONTS = {
  regular: { fontSize: 14, color: COLORS.textPrimary },
  medium: { fontSize: 16, fontWeight: '500', color: COLORS.textPrimary },
  bold: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  h1: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary },
  h2: { fontSize: 22, fontWeight: '600', color: COLORS.textPrimary },
  h3: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  caption: { fontSize: 12, color: COLORS.textSecondary },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const ACTIVITY_EMOJIS = {
  coffee: '☕',
  restaurant: '🍽️',
  activities: '🎮',
  outdoor: '🌳',
  social: '👥',
  events: '🎬',
};
