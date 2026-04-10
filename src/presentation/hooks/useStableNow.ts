import {useState, useCallback} from 'react';
import {useFocusEffect} from '@react-navigation/native';

/**
 * Returns a stable timestamp that only updates when the screen gains focus,
 * preventing useMemo invalidation on every render.
 */
export function useStableNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(useCallback(() => { setNow(Date.now()); }, []));
  return now;
}
