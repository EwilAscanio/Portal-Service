"use client";

import { useEffect, useRef } from "react";

/**
 * Ejecuta `handler` cuando se hace clic/touch fuera de los elementos referenciados.
 * `extraRefs` (opcional) permite ignorar clics dentro de otros nodos, por ejemplo
 * un dropdown renderizado vía portal.
 */
export function useClickOutside(handler, extraRefs = []) {
  const ref = useRef(null);

  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      const insideExtra = extraRefs.some(
        (extraRef) => extraRef.current && extraRef.current.contains(event.target)
      );
      if (insideExtra) return;
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [handler, extraRefs]);

  return ref;
}
