import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTempDatabase } from '@/features/database/testing';
import { createDesign, getDesign } from '@/features/designs';
import {
  coverOf,
  listDesignImages,
  writeImages,
  type ImageStore,
} from '@/features/images';
import { createTempImageStore } from '@/features/images/testing';
import { listDesignEvents } from '@/features/history';

let database: ReturnType<typeof createTempDatabase>['database'];
let dispose: () => void;
let sourceDirectory: string;
let store: ImageStore;
let storeDirectory: string;
let disposeStore: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
  sourceDirectory = mkdtempSync(join(tmpdir(), 'jbdc-image-sources-'));
  ({ store, directory: storeDirectory, dispose: disposeStore } = createTempImageStore());
});

afterEach(() => {
  dispose();
  disposeStore();
  rmSync(sourceDirectory, { recursive: true, force: true });
});

/** A source file on disk, the way a picked image arrives. */
function sourceFile(name: string, contents: string): string {
  const path = join(sourceDirectory, name);
  writeFileSync(path, contents);

  return path;
}

function createWoolCoat(now = 500): string {
  return createDesign(database, { name: 'Wool coat' }, now).id;
}

function storedFiles(): string[] {
  return readdirSync(storeDirectory);
}

describe('attaching images', () => {
  test('several at once is one action and records one image_change event', () => {
    const designId = createWoolCoat();

    const result = writeImages(
      database,
      store,
      designId,
      {
        kind: 'attach',
        images: [
          { sourcePath: sourceFile('front.jpg', 'front bytes'), kind: 'sketch' },
          { sourcePath: sourceFile('back.jpg', 'back bytes'), kind: 'sketch' },
        ],
      },
      1000
    );

    expect(result.kind).toBe('stored');
    expect(listDesignImages(database, designId)).toHaveLength(2);

    const events = listDesignEvents(database, designId);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: 'image_change',
      createdAt: 1000,
      diff: {
        images: {
          attached: [
            { id: expect.any(String), kind: 'sketch', contentHash: expect.any(String) },
            { id: expect.any(String), kind: 'sketch', contentHash: expect.any(String) },
          ],
        },
      },
    });
  });

  test('the same file attached twice is stored once', () => {
    const designId = createWoolCoat();
    const sourcePath = sourceFile('sketch.jpg', 'the same bytes');

    writeImages(
      database,
      store,
      designId,
      { kind: 'attach', images: [{ sourcePath, kind: 'sketch' }] },
      1000
    );
    writeImages(
      database,
      store,
      designId,
      { kind: 'attach', images: [{ sourcePath, kind: 'final' }] },
      2000
    );

    const [first, second] = listDesignImages(database, designId);

    expect(first.contentHash).toBe(second.contentHash);
    expect(storedFiles()).toHaveLength(1);
  });

  test('a design with no images has no Cover', () => {
    const designId = createWoolCoat();

    expect(coverOf(listDesignImages(database, designId))).toBeNull();
  });
});

describe('reclassifying an image', () => {
  test('changes the Cover with no other act', () => {
    const designId = createWoolCoat();

    writeImages(
      database,
      store,
      designId,
      {
        kind: 'attach',
        images: [{ sourcePath: sourceFile('sketch.jpg', 'sketch'), kind: 'sketch' }],
      },
      1000
    );

    const [image] = listDesignImages(database, designId);

    expect(coverOf(listDesignImages(database, designId))).toMatchObject({ kind: 'sketch' });

    writeImages(
      database,
      store,
      designId,
      { kind: 'reclassify', imageId: image.id, to: 'final' },
      2000
    );

    expect(coverOf(listDesignImages(database, designId))).toMatchObject({
      id: image.id,
      kind: 'final',
    });
  });

  test('records one image_change event carrying what it was and what it became', () => {
    const designId = createWoolCoat();

    writeImages(
      database,
      store,
      designId,
      {
        kind: 'attach',
        images: [{ sourcePath: sourceFile('sketch.jpg', 'sketch'), kind: 'sketch' }],
      },
      1000
    );

    const [image] = listDesignImages(database, designId);

    writeImages(
      database,
      store,
      designId,
      { kind: 'reclassify', imageId: image.id, to: 'prototype' },
      2000
    );

    const events = listDesignEvents(database, designId);
    const reclassified = events.filter((event) => event.kind === 'image_change');

    expect(reclassified).toHaveLength(2);
    expect(reclassified[0]).toMatchObject({
      diff: {
        images: {
          reclassified: [{ from: { kind: 'sketch' }, to: { kind: 'prototype' } }],
        },
      },
    });
  });

  test('to the kind it already has stores nothing and records nothing', () => {
    const designId = createWoolCoat();

    writeImages(
      database,
      store,
      designId,
      {
        kind: 'attach',
        images: [{ sourcePath: sourceFile('sketch.jpg', 'sketch'), kind: 'sketch' }],
      },
      1000
    );

    const [image] = listDesignImages(database, designId);

    const result = writeImages(
      database,
      store,
      designId,
      { kind: 'reclassify', imageId: image.id, to: 'sketch' },
      2000
    );

    expect(result).toEqual({
      kind: 'stored',
      images: [image],
      event: null,
    });
    expect(listDesignEvents(database, designId)).toHaveLength(1);
    expect(getDesign(database, designId)?.updatedAt).toBe(1000);
  });
});

describe('removing an image', () => {
  test('garbage-collects the stored file when its last reference goes', () => {
    const designId = createWoolCoat();
    const sourcePath = sourceFile('final.jpg', 'the same bytes');

    writeImages(
      database,
      store,
      designId,
      {
        kind: 'attach',
        images: [
          { sourcePath, kind: 'final' },
          { sourcePath, kind: 'sketch' },
        ],
      },
      1000
    );

    const [first, second] = listDesignImages(database, designId);

    writeImages(database, store, designId, { kind: 'remove', imageId: first.id }, 2000);

    expect(storedFiles()).toHaveLength(1);

    writeImages(database, store, designId, { kind: 'remove', imageId: second.id }, 3000);

    expect(storedFiles()).toHaveLength(0);
    expect(listDesignImages(database, designId)).toEqual([]);
    expect(listDesignEvents(database, designId).map((event) => event.kind)).toEqual([
      'image_change',
      'image_change',
      'image_change',
    ]);
  });

  test('keeps a file another design still references', () => {
    const firstDesign = createWoolCoat();
    const secondDesign = createDesign(database, { name: 'Silk slip' }, 500).id;
    const sourcePath = sourceFile('shared.jpg', 'shared bytes');

    writeImages(
      database,
      store,
      firstDesign,
      { kind: 'attach', images: [{ sourcePath, kind: 'final' }] },
      1000
    );
    writeImages(
      database,
      store,
      secondDesign,
      { kind: 'attach', images: [{ sourcePath, kind: 'sketch' }] },
      1100
    );

    const [image] = listDesignImages(database, firstDesign);

    writeImages(database, store, firstDesign, { kind: 'remove', imageId: image.id }, 2000);

    expect(storedFiles()).toHaveLength(1);
    expect(listDesignImages(database, secondDesign)).toHaveLength(1);
  });
});

describe('the moved updatedAt', () => {
  test('every structural write moves it in the same transaction', () => {
    const designId = createWoolCoat(500);

    writeImages(
      database,
      store,
      designId,
      {
        kind: 'attach',
        images: [{ sourcePath: sourceFile('sketch.jpg', 'sketch'), kind: 'sketch' }],
      },
      1000
    );
    expect(getDesign(database, designId)?.updatedAt).toBe(1000);

    const [image] = listDesignImages(database, designId);

    writeImages(
      database,
      store,
      designId,
      { kind: 'reclassify', imageId: image.id, to: 'final' },
      2000
    );
    expect(getDesign(database, designId)?.updatedAt).toBe(2000);

    writeImages(database, store, designId, { kind: 'remove', imageId: image.id }, 3000);
    expect(getDesign(database, designId)?.updatedAt).toBe(3000);
  });
});

describe('refused writes', () => {
  test('an attach with no images is refused and stores nothing', () => {
    const designId = createWoolCoat(500);

    expect(
      writeImages(database, store, designId, { kind: 'attach', images: [] }, 1000)
    ).toEqual({ kind: 'refused', field: 'images', message: 'Choose at least one image.' });

    expect(listDesignImages(database, designId)).toEqual([]);
    expect(listDesignEvents(database, designId)).toEqual([]);
    expect(storedFiles()).toEqual([]);
    expect(getDesign(database, designId)?.updatedAt).toBe(500);
  });

  test('a kind outside the four is refused', () => {
    const designId = createWoolCoat();

    const result = writeImages(
      database,
      store,
      designId,
      {
        kind: 'attach',
        images: [{ sourcePath: sourceFile('swatch.jpg', 'swatch'), kind: 'material' as never }],
      },
      1000
    );

    expect(result).toEqual({
      kind: 'refused',
      field: 'kind',
      message: 'An image needs one of the four kinds.',
    });
    expect(listDesignImages(database, designId)).toEqual([]);
  });

  test('a write against a design that is gone answers design-missing', () => {
    expect(
      writeImages(
        database,
        store,
        'no-such-design',
        {
        kind: 'attach',
        images: [{ sourcePath: sourceFile('sketch.jpg', 'sketch'), kind: 'sketch' }],
      },
        1000
      )
    ).toEqual({ kind: 'design-missing' });
    expect(storedFiles()).toEqual([]);
  });

  test('reclassifying an image the design does not have answers image-missing', () => {
    const designId = createWoolCoat();

    expect(
      writeImages(
        database,
        store,
        designId,
        { kind: 'reclassify', imageId: 'ghost', to: 'final' },
        1000
      )
    ).toEqual({ kind: 'image-missing', imageId: 'ghost' });
  });

  test('removing an image the design does not have answers image-missing', () => {
    const designId = createWoolCoat();

    expect(
      writeImages(database, store, designId, { kind: 'remove', imageId: 'ghost' }, 1000)
    ).toEqual({ kind: 'image-missing', imageId: 'ghost' });
  });

  test('an image is reached only through the design it belongs to', () => {
    const firstDesign = createWoolCoat();
    const secondDesign = createDesign(database, { name: 'Silk slip' }, 500).id;

    writeImages(
      database,
      store,
      firstDesign,
      { kind: 'attach', images: [{ sourcePath: sourceFile('final.jpg', 'final'), kind: 'final' }] },
      1000
    );

    const [image] = listDesignImages(database, firstDesign);

    expect(
      writeImages(database, store, secondDesign, { kind: 'remove', imageId: image.id }, 2000)
    ).toEqual({ kind: 'image-missing', imageId: image.id });
    expect(listDesignImages(database, firstDesign)).toHaveLength(1);
    expect(storedFiles()).toHaveLength(1);
  });
});
