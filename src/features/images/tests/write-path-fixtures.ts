/**
 * Fixtures shared by the write path's two suites: `write-path` and
 * `write-path-release`. Call `setupWritePathFixtures()` at the top of a suite to
 * give every test a fresh migrated database, a real temp Image store, and a
 * scratch directory holding the source files a pick would hand the write path.
 * `database` and `store` are the live values for the test that is running; the
 * rest build what a write needs.
 */
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTempDatabase } from "@/features/database/testing";
import { createDesign } from "@/features/designs";
import { createTempImageStore } from "@/features/images/testing";
import type { ImageStore } from "../lib/image-store";

/** The database this test's writes run against. */
export let database: ReturnType<typeof createTempDatabase>["database"];
/** The store this test's writes copy into. */
export let store: ImageStore;

let storeDirectory: string;
let dispose: () => void;
let disposeStore: () => void;
let sourceDirectory: string;

/**
 * Registers the per-test setup both write path suites need; call it once at the
 * top of a suite.
 */
export function setupWritePathFixtures(): void {
  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
    sourceDirectory = mkdtempSync(join(tmpdir(), "jbdc-image-sources-"));
    ({ store, directory: storeDirectory, dispose: disposeStore } = createTempImageStore());
  });

  afterEach(() => {
    dispose();
    disposeStore();
    rmSync(sourceDirectory, { recursive: true, force: true });
  });
}

/** A source file on disk, the way a picked image arrives. */
export function sourceFile(name: string, contents: string): string {
  const path = join(sourceDirectory, name);

  writeFileSync(path, contents);

  return path;
}

/** A source path in the scratch directory, with no file behind it. */
export function missingSourceFile(name: string): string {
  return join(sourceDirectory, name);
}

/**
 * A store that copies for real and always refuses to release a file. The row
 * write is the truth, so an unreleased file is the store's problem: no release
 * may fail the write.
 */
export function storeThatCannotRelease(): ImageStore {
  return {
    copy: (sourcePath) => store.copy(sourcePath),
    remove: () => {
      throw new Error("the store refused to release the file");
    },
    uri: (file) => store.uri(file),
  };
}

/** A Design the write path attaches images to. */
export function createWoolCoat(now = 500): string {
  return createDesign(database, { name: "Wool coat" }, now).id;
}

/** The names of the files the store holds. */
export function storedFiles(): string[] {
  return readdirSync(storeDirectory);
}
