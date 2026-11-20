/**
 * History — React entry point. Routes import the History screen from here; the
 * Event records and diff format stay on `@/features/history`.
 */
export { HistoryScreen } from "./components/history-screen";
export { useDesignHistory } from "./lib/use-design-history";
export type { DesignHistory } from "./lib/use-design-history";
