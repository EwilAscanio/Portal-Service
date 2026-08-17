"use client";

import { useEffect } from "react";
import { APP_NAME } from "@/lib/constants";

/** Actualiza el título del documento: "Sección | Maquitech" */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title
      ? `${title} | ${APP_NAME}`
      : `${APP_NAME} | Panel Administrativo`;
  }, [title]);
}
