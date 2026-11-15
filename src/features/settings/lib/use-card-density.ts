import { useCallback, useState } from 'react';
import { useDatabase } from '@/features/database/react';
import { createSettings, type CardDensity } from './settings';

export type CardDensityState = {
  density: CardDensity;
  /** Persists the choice and updates the Library in the same render. */
  setDensity: (density: CardDensity) => void;
};

/**
 * The Library's card density. The first render reads the persisted row
 * synchronously, so the grid never flashes the default before the stored
 * choice arrives; every change writes through to `settings`.
 */
export function useCardDensity(): CardDensityState {
  const database = useDatabase();
  const [settings] = useState(() => createSettings(database));
  const [density, setDensity] = useState(() => settings.cardDensity());

  const chooseDensity = useCallback(
    (next: CardDensity) => {
      settings.setCardDensity(next);
      setDensity(next);
    },
    [settings]
  );

  return { density, setDensity: chooseDensity };
}
