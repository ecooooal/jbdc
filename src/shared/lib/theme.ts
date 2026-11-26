import { DarkTheme, DefaultTheme, type Theme } from "expo-router/react-navigation";

/**
 * React Navigation paints its chrome from JS, not from `global.css`, so the
 * board's palette is restated here once, as the slots navigation actually
 * reads. Every other color in the app resolves through the tokens in
 * `global.css`; nothing else may hold a second palette.
 */
const CHROME = {
  light: {
    background: "#ffffff",
    card: "#f8f6f2",
    border: "#e8e5df",
    primary: "#b38a64",
    text: "#292724",
    destructive: "#b94b45",
  },
  dark: {
    background: "#242424",
    card: "#303030",
    border: "#444444",
    primary: "#d1b18a",
    text: "#f0eee9",
    destructive: "#e27770",
  },
} as const;

export const NAV_THEME: Record<"light" | "dark", Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: CHROME.light.background,
      border: CHROME.light.border,
      card: CHROME.light.card,
      notification: CHROME.light.destructive,
      primary: CHROME.light.primary,
      text: CHROME.light.text,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: CHROME.dark.background,
      border: CHROME.dark.border,
      card: CHROME.dark.card,
      notification: CHROME.dark.destructive,
      primary: CHROME.dark.primary,
      text: CHROME.dark.text,
    },
  },
};
