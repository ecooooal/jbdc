# JBDC (Design Catalog)

A private, local-first archive of one designer's clothing designs: what was made, why, and what happened to it. Everything here is written for a single owner working alone, with no customers, orders, or money in the model.

## Records

**Design**:
A single clothing concept the owner documents, from first idea through production or rejection.
_Avoid_: garment, piece, item, product — and "sample", which is a stage, not a design.

**Specification**:
The technical and physical description of a design: silhouette, construction details, sizes, measurements. Its materials are **Material** entries, not text. Only meaningful attached to its design.
_Avoid_: specs, tech pack

**Creative Direction**:
The artistic intent behind a design: concept, mood, inspiration, intended feeling, audience, styling, palette. The part of a design that specifications cannot express.
_Avoid_: vision, mood board — a mood board is a set of images, not the intent.

**Identity**:
The part of a design that names it: its name, description, Category, and Collection. Edited in place on the design's own screen rather than under a tab, because it changes least.
_Avoid_: header, overview, basics, metadata

**Image**:
A visual file attached to a design, carrying the kind that says what role it plays in the process: `inspiration`, `sketch`, `prototype`, or `final`. The kind is required — every image is a step in the journey — and is a label, not history: an image can be reclassified as the design changes.
_Avoid_: photo, picture, asset, attachment — and "design" for the sketch kind, which collides with Design itself.

**Cover**:
The image that represents a design: the newest image of the highest kind the design has, in the order `final`, `prototype`, `sketch`, `inspiration`. Derived, never marked or stored — reclassifying an image can change it — and a design with no images has none.
_Avoid_: primary, thumbnail, "marked image"

**Image note**:
One item of the commentary list attached to an image: what the owner decided there, and why. Added or removed, never edited in place, and it dies with its image.
_Avoid_: caption, comment — and "note" alone, which is an Event

**Category**:
The garment type a design is, chosen from a list the owner maintains. At most one per design, and a design may have none.
_Avoid_: type, tag, label

**Collection**:
A named, owner-managed group of designs, usually one season's body of work, with an optional year. A design belongs to at most one collection, and to none.
_Avoid_: season, line, drop

**Taxonomy**:
The owner-managed lists of Categories and Collections that a design picks from. The module that reads and writes those lists.
_Avoid_: classification, tags, lookup tables

**Material**:
A fabric or trim the owner uses, kept as a named entry in her own list so that the same fabric is spelled the same way everywhere. A design reaches its Materials through **Material uses**.
_Avoid_: fabric, textile, cloth, swatch — and "marketing material", a different concept that belongs to a later release.

**Material use**:
One design's use of a Material: the colour used, and the role it plays — main, secondary, or other. A design has zero or more, and may use the same Material twice in different colours. The colour belongs to the use, not to the Material. A visit changes them only as a before-and-after pair, so History never sees one side alone.
_Avoid_: link, swatch, colourway, fabric entry

**Prototype**:
An image kind: a photograph of a physical sample. There is no Prototype status, because a sample can exist while the design is still In Development — the two facts cannot share one field.
_Avoid_: sample, toile, mockup

## History

**History**:
The append-only sequence of Events kept for one design, newest first when read. One visit is one Event, so History reads as work, not keystrokes.
_Avoid_: audit log, activity feed, revision history

**Visit**:
One trip through a design's Edit screen: opened, changed, closed. Every change is written as it happens, and the visit records at most one Event when it closes.
_Avoid_: session, edit session, sitting — "session" is a login or connection word.

**Status**:
Where a design stands right now: Concept, In Development, Approved, Produced, Rejected, or Archived. Exactly one at a time, changeable in any direction.
_Avoid_: state, stage, phase

**Event**:
A recorded happening in a design's history — a status change, a decision, an edit, or a note. Written once and never altered; a correction is a new event.
_Avoid_: revision, change log, audit trail, activity

**Diff**:
What one visit changed, as its Event stores it: each field with the value it had and the value it became, plus the Material uses the visit added, removed, or corrected. An empty diff is no Event.
_Avoid_: patch, delta, changeset — and "diff" for comparing versions, which this app does not do.

**Decision**:
An event recording a choice about a design and why it was made, optionally with potential improvements. A rejection reason is a decision.
_Avoid_: verdict, outcome

**Note**:
A free-text event the owner writes to explain something no other event captures.
_Avoid_: "image note", which is a different record

**Rejected**:
A status meaning this design will not proceed. It keeps its reason, its images, and its specifications, and stays in the catalog.
_Avoid_: failed, dropped, cancelled

**Archived**:
A status meaning the design is kept out of the way but is still part of the catalog — visible in filters, not in the default library.
_Avoid_: deleted, hidden, "archived collection"

**Trash**:
Designs the owner removed but has not permanently deleted. Excluded from the library, search, and counts; recoverable until purged.
_Avoid_: deleted, recycle bin

## Containers

**Catalog**:
Every design the owner has ever documented, in any status, including rejected and trashed ones. The thing the app exists to preserve.
_Avoid_: archive, vault, library, database — "archive" collides with the Archived status.

**Library**:
The screen showing the designs the owner is actively working on. A view over the catalog, not a separate store.
_Avoid_: gallery, home, dashboard

## Operations

**Export**:
A copy of the entire catalog written outside the app into a location the owner chooses. The owner's only backup; not a sync.
_Avoid_: backup (the OS backup is a different thing), dump, snapshot

**Restore**:
Replacing the current catalog with the contents of an export. Never a merge.
_Avoid_: import, merge, sync

## People

**Owner**:
The single designer who uses the app. There are no other users, accounts, or roles.
_Avoid_: user, customer, client, designer (when "owner" is meant)
