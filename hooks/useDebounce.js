"use client";

import { useEffect, useState } from "react";

/** Devuelve el valor con un retraso de `delay` ms (búsquedas, filtros…) */
export function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
