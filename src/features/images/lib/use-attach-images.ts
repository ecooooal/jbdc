import { useCallback } from "react";
import type { ImageKind } from "@/features/database";
import { useDatabase } from "@/features/database/react";
import { useImagePicker } from "./image-picker-context";
import { useImageStore } from "./image-store-context";
import { writeImages } from "./records";

/**
 * The plus card's one action: open the picker, then attach every picked file to
 * the stage the gallery is on. Choosing the stage was the kind decision, so each
 * file carries that kind and nothing asks again. A picker that comes back
 * cancelled or denied writes nothing; a failed copy leaves the catalog and the
 * store as the write path found them.
 */
export function useAttachImages(designId: string, kind: ImageKind): () => Promise<void> {
  const database = useDatabase();
  const store = useImageStore();
  const picker = useImagePicker();

  return useCallback(async () => {
    if (!store || !picker) return;

    const picked = await picker.pick();

    if (picked.kind !== "picked" || picked.sourcePaths.length === 0) return;

    await writeImages(database, store, designId, {
      kind: "attach",
      images: picked.sourcePaths.map((sourcePath) => ({ sourcePath, kind })),
    });
  }, [database, designId, kind, picker, store]);
}
