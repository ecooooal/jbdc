/**
 * Settings — React entry point. Surfaces read and write their preferences
 * through the module's hooks; no screen touches the `settings` table itself.
 */
export { useCardDensity } from "./lib/use-card-density";
export { useGrouping } from "./lib/use-grouping";
export { ThemeChoiceProvider, useAppTheme } from "./lib/theme-choice-provider";
