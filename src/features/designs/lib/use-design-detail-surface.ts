import { useCallback } from "react";
import { useDatabase } from "@/features/database/react";
import { useReducerRunner } from "@/shared/hooks/use-reducer-runner";
import {
  createInitialDesignDetailState,
  designDetailReducer,
  type DesignDetailEffect,
  type DesignDetailEvent,
  type DesignDetailState,
} from "./design-detail-reducer";
import { changeStatus } from "./status-writes";

/**
 * Runs Detail's surface reducer and the status writes it asks for. Every
 * catalog call is synchronous, so an effect is performed inside `send`; the
 * live read observes the row the write stored, so the pill and the Library
 * follow without the surface copying anything. A write that finds no Design
 * has nothing left to show, and the sheet has already closed.
 */
export function useDesignDetailSurface(
  designId: string,
): readonly [DesignDetailState, (event: DesignDetailEvent) => void] {
  const database = useDatabase();

  const perform = useCallback(
    (effect: DesignDetailEffect) => {
      changeStatus(database, effect.designId, effect.change);
    },
    [database],
  );

  return useReducerRunner(
    designDetailReducer,
    () => createInitialDesignDetailState(designId),
    perform,
  );
}
