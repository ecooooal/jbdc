import { useCallback, type Dispatch } from "react";
import type { ImageKind } from "@/features/database";
import { useDatabase } from "@/features/database/react";
import type { GalleryEvent } from "./gallery-reducer";
import { useImagePicker } from "./image-picker-context";
import { useImageStore } from "./image-store-context";
import { writeImages } from "./records";

/**
 * The plus card's one action: open the picker, then attach every picked file to
 * the stage the gallery is on. Choosing the stage was the kind decision, so each
 * file carries that kind and nothing asks again. Backing out writes nothing and
 * says nothing; a denial, a refused write, a vanished Design, or a copy that
 * throws leaves the stage untouched and reports `attach-failed`, so the owner
 * never mistakes a failed attach for a cancel.
 */
export function useAttachImages(
  designId: string,
  kind: ImageKind,
  dispatch: Dispatch<GalleryEvent>,
): () => Promise<void> {
  const database = useDatabase();
  const store = useImageStore();
  const picker = useImagePicker();

  return useCallback(async () => {
    dispatch({ type: "attach-pressed" });

    if (!store || !picker) return;

    try {
      const picked = await picker.pick();

      if (picked.kind === "cancelled") return;

      if (picked.kind === "denied") {
        dispatch({ type: "attach-failed" });
        return;
      }

      const result = await writeImages(database, store, designId, {
        kind: "attach",
        images: picked.sourcePaths.map((sourcePath) => ({ sourcePath, kind })),
      });

      if (result.kind !== "stored") dispatch({ type: "attach-failed" });
    } catch {
      // The write path has already rolled back its copies; all that is left is
      // to say the images did not land, never to let the plus card's press
      // become an unhandled rejection.
      dispatch({ type: "attach-failed" });
    }
  }, [database, designId, dispatch, kind, picker, store]);
}
