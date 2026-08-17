"use client";

import { useCallback, useSyncExternalStore, useState } from "react";

/**
 * Estado sincronizado con localStorage.
 * Devuelve [valor, setter, hidratado].
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored);
    } catch {
      /* almacenamiento no disponible */
    }
    return initialValue;
  });
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const set = useCallback(
    (next) => {
      setValue((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* almacenamiento no disponible */
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, set, hydrated];
}
