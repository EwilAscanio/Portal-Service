"use client";

import { motion } from "framer-motion";

/** Variantes reutilizables de entrada escalonada */
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Contenedor que anima a sus hijos <FadeInUp> en cascada */
export function Stagger({ children, className, ...props }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Ítem animado dentro de <Stagger> */
export function FadeInUp({ children, className, ...props }) {
  return (
    <motion.div variants={fadeInUp} className={className} {...props}>
      {children}
    </motion.div>
  );
}
