/**
 * Database — the port every feature module depends on.
 *
 * This entry is driver-free on purpose: feature modules import the query-handle
 * type and the schema here and never see expo-sqlite or better-sqlite3. The
 * adapters live in `./expo` (the app) and `./testing` (Jest).
 */
export type { DatabaseHandle, Database } from './lib/port';
export {
  categories,
  collections,
  designEvents,
  designMaterials,
  designs,
  materials,
  settings,
  DESIGN_EVENT_KINDS,
  DESIGN_STATUSES,
  MATERIAL_USE_ROLES,
} from './schema';
export type { DesignEventKind, DesignStatus, MaterialUseRole } from './schema';
