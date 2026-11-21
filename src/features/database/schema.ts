import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Where a design stands. The whole vocabulary exists from migration 1. */
export const DESIGN_STATUSES = [
  "concept",
  "in_development",
  "approved",
  "produced",
  "rejected",
  "archived",
] as const;

export type DesignStatus = (typeof DESIGN_STATUSES)[number];

/** The kinds of thing an append-only History entry can record. */
export const DESIGN_EVENT_KINDS = [
  "status_change",
  "decision",
  "edit",
  "note",
  "image_change",
] as const;

export type DesignEventKind = (typeof DESIGN_EVENT_KINDS)[number];

/**
 * The kind an Image plays in a Design's journey, in journey order. Required and
 * mutable: an image is reclassified as the design develops. The Cover ranks the
 * same list in reverse.
 */
export const IMAGE_KINDS = ["inspiration", "sketch", "prototype", "final"] as const;

export type ImageKind = (typeof IMAGE_KINDS)[number];

/** The role a Material use plays on a design. */
export const MATERIAL_USE_ROLES = ["main", "secondary", "other"] as const;

export type MaterialUseRole = (typeof MATERIAL_USE_ROLES)[number];

const sqlList = (values: readonly string[]) =>
  sql.raw(values.map((value) => `'${value}'`).join(", "));

const timestamp = (name: string) => integer(name, { mode: "number" });

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** Set only on seeded rows, so a seed never undoes an owner's rename. */
  seedKey: text("seed_key"),
  createdAt: timestamp("created_at").notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const collections = sqliteTable("collections", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  year: integer("year", { mode: "number" }),
  createdAt: timestamp("created_at").notNull(),
  deletedAt: timestamp("deleted_at"),
});

/**
 * The owner's named Materials, each a fabric or trim she works with. A Material
 * is a list entry, not a design field: a design reaches one through a Material
 * use.
 */
export const materials = sqliteTable("materials", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const designs = sqliteTable(
  "designs",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    categoryId: text("category_id").references(() => categories.id),
    collectionId: text("collection_id").references(() => collections.id),
    // Specification: the technical and physical description of a design. All
    // optional; null means the owner has not recorded it.
    silhouette: text("silhouette"),
    neckline: text("neckline"),
    sleeveType: text("sleeve_type"),
    garmentDetails: text("garment_details"),
    sizeRange: text("size_range"),
    measurements: text("measurements"),
    constructionNotes: text("construction_notes"),
    // Creative direction: the artistic intent behind a design. All optional;
    // null means the owner has not recorded it. Description says what the piece
    // is; concept says what it is trying to do.
    concept: text("concept"),
    mood: text("mood"),
    inspiration: text("inspiration"),
    intendedFeeling: text("intended_feeling"),
    audience: text("audience"),
    styling: text("styling"),
    palette: text("palette"),
    status: text("status", { enum: DESIGN_STATUSES }).notNull(),
    /** Lowercased name, description, Specification, Creative direction, category, collection, and Material uses, rebuilt on every write. */
    searchText: text("search_text").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("designs_status_idx").on(table.status),
    index("designs_collection_id_idx").on(table.collectionId),
    check("designs_status_check", sql`${table.status} in (${sqlList(DESIGN_STATUSES)})`),
  ],
);

/**
 * One design's use of a Material: the colour used and the role it plays. The
 * same Material may appear twice in different colours; there is no role
 * cardinality rule, because two mains is a readable inconsistency.
 */
export const designMaterials = sqliteTable(
  "design_materials",
  {
    id: text("id").primaryKey(),
    designId: text("design_id")
      .notNull()
      .references(() => designs.id),
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id),
    colour: text("colour").notNull(),
    role: text("role", { enum: MATERIAL_USE_ROLES }).notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("design_materials_design_id_idx").on(table.designId),
    index("design_materials_material_id_idx").on(table.materialId),
    check("design_materials_role_check", sql`${table.role} in (${sqlList(MATERIAL_USE_ROLES)})`),
  ],
);

export const designEvents = sqliteTable(
  "design_events",
  {
    id: text("id").primaryKey(),
    designId: text("design_id")
      .notNull()
      .references(() => designs.id),
    kind: text("kind", { enum: DESIGN_EVENT_KINDS }).notNull(),
    reason: text("reason"),
    potentialImprovements: text("potential_improvements"),
    /** JSON: field name -> { from, to }. Null when the event is not an edit. */
    diff: text("diff"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("design_events_design_id_created_at_idx").on(table.designId, table.createdAt)],
);

/**
 * One visual file attached to a Design, labelled by its kind. Images are their
 * own table beside the Design aggregate, not columns of it (ADR-0003). The
 * file itself lives in the catalog's image directory, keyed by the content
 * hash, so the same bytes attached twice are stored once; nothing here is the
 * Cover, which is derived from kind and recency.
 */
export const images = sqliteTable(
  "images",
  {
    id: text("id").primaryKey(),
    designId: text("design_id")
      .notNull()
      .references(() => designs.id),
    /** The SHA-256 of the file, and so the store's key. */
    contentHash: text("content_hash").notNull(),
    /** The stored file's extension, without the dot. */
    extension: text("extension").notNull(),
    kind: text("kind", { enum: IMAGE_KINDS }).notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("images_design_id_idx").on(table.designId),
    index("images_content_hash_idx").on(table.contentHash),
    check("images_kind_check", sql`${table.kind} in (${sqlList(IMAGE_KINDS)})`),
  ],
);

/**
 * One item of an Image's commentary list: what the owner decided there, and
 * why. Added or removed, never edited in place, and it dies with its image —
 * the foreign key cascades, so no note outlives the image it explains. A note
 * is not an Event: History records the image's life, not the note's.
 */
export const imageNotes = sqliteTable(
  "image_notes",
  {
    id: text("id").primaryKey(),
    imageId: text("image_id")
      .notNull()
      .references(() => images.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("image_notes_image_id_idx").on(table.imageId)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
