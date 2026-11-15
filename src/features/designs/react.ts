/**
 * Designs — React entry point. Routes import the form and Detail from here; the
 * record functions and types stay on the driver-free entry
 * (`@/features/designs`).
 */
export { DesignDetailScreen } from './components/design-detail-screen';
export { DesignStatusBadge } from './components/design-status-badge';
export { NewDesignForm } from './components/new-design-form';
export { useDesignDetail } from './lib/use-design-detail';
export type { DesignDetailResult } from './lib/use-design-detail';
