/**
 * Theme-aware chart color palettes for Finsight.
 *
 * Dark mode palette:
 * Vibrantly tuned against deep slate background (--color-paper: #080b12).
 * Reuses brand tokens: #d6ff62 (--color-horizon), #10d98a (--color-signal-pos), #f87171 (--color-signal-neg).
 */
export const CHART_COLORS_DARK = [
  "#d6ff62", // Brand neon lime (--color-horizon in dark mode)
  "#3b82f6", // Vivid royal blue
  "#8b5cf6", // Vibrant purple
  "#10d98a", // Neon emerald (--color-signal-pos in dark mode)
  "#f59e0b", // Bright amber
  "#f87171", // Light crimson (--color-signal-neg in dark mode)
  "#06b6d4", // Cyan
  "#ec4899", // Vivid pink
];

/**
 * Light mode palette:
 * Carefully tuned for high contrast against warm paper background (--color-paper: #f6f4ef / #ffffff).
 * Reuses brand tokens: #e2a33d (--color-horizon in light mode), #2f8f66 (--color-signal-pos), #a23e48 (--color-signal-neg),
 * avoiding washed-out neon yellows/limes that have poor contrast on white/cream paper.
 */
export const CHART_COLORS_LIGHT = [
  "#e2a33d", // Brand warm amber (--color-horizon in light mode)
  "#2563eb", // Deep royal blue
  "#2f8f66", // Forest emerald (--color-signal-pos in light mode)
  "#7c3aed", // Deep violet / purple
  "#a23e48", // Rich wine crimson (--color-signal-neg in light mode)
  "#0284c7", // Ocean cerulean
  "#c2410c", // Deep terracotta orange
  "#be185d", // Rich berry rose
];

/**
 * Helper to select the appropriate chart palette by theme.
 * @param {string} theme - "light" | "dark"
 * @returns {string[]}
 */
export function getChartColors(theme = "dark") {
  return theme === "light" ? CHART_COLORS_LIGHT : CHART_COLORS_DARK;
}

// Backward-compatible default export
export const CHART_COLORS = CHART_COLORS_DARK;
