import { useCallback, useEffect, useMemo, useReducer } from "react";
import { useLiveRead } from "@/features/database/react";
import {
  createInitialGalleryState,
  galleryReducer,
  galleryView,
  type GalleryGesture,
} from "./gallery-reducer";
import { coverOf, imageStages } from "./images";
import { designImagesRead } from "./records";

/**
 * The Detail gallery: the Design's images live read feeding the gallery
 * reducer. The read declares the tables it watches, so an attach, remove, or
 * reclassify re-runs it and the reducer keeps the selection or falls back to
 * the Cover. Every gesture carries the journey it happened against, because a
 * pure reducer cannot read the catalog.
 */
export function useGallery(designId: string) {
  const declaration = useMemo(() => designImagesRead(designId), [designId]);
  const { data, error, status } = useLiveRead(declaration);
  const stages = useMemo(() => imageStages(data.images), [data.images]);
  const cover = useMemo(() => coverOf(data.images)?.id ?? null, [data.images]);
  const [state, dispatch] = useReducer(galleryReducer, undefined, createInitialGalleryState);

  useEffect(() => {
    dispatch({ type: "images-read", stages, cover });
  }, [stages, cover]);

  const send = useCallback((gesture: GalleryGesture) => dispatch({ ...gesture, stages }), [stages]);

  return { state, stages, view: galleryView(stages, state), send, error, status };
}
