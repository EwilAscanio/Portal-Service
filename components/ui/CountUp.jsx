"use client";

import { useEffect, useRef } from "react";
import { animate } from "framer-motion";

const defaultFormat = (value) => Math.round(value).toLocaleString("en-US");

/** Número animado con easing (KPIs) */
export function CountUp({ value, format = defaultFormat, duration = 1.4, className }) {
  const ref = useRef(null);
  const formatRef = useRef(format);

  useEffect(() => {
    formatRef.current = format;
  });

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        if (ref.current) ref.current.textContent = formatRef.current(latest);
      },
    });
    return () => controls.stop();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {defaultFormat(0)}
    </span>
  );
}
