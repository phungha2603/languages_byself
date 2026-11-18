import { darkColors, lightColors } from '@/src/theme/colors';

export default {
  light: {
    text: lightColors.textPrimary,
    background: lightColors.background,
    tint: lightColors.tabBarActive,
    tabIconDefault: lightColors.tabBarInactive,
    tabIconSelected: lightColors.tabBarActive,
  },
  dark: {
    text: darkColors.textPrimary,
    background: darkColors.background,
    tint: darkColors.tabBarActive,
    tabIconDefault: darkColors.tabBarInactive,
    tabIconSelected: darkColors.tabBarActive,
  },
};
