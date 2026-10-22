"use client";

import { useCallback, useEffect, useState } from "react";
import { getOrderLaborBudget } from "@/lib/api";
import { getPublicError } from "@/lib/ui-errors";

export function useLaborBudget(parId, orderId) {
  const key = `${parId || ""}:${orderId || ""}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ key: "", budget: null, loading: false, error: "" });
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!parId) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- nueva consulta al cambiar PAR o refrescar saldo
    setState({ key, budget: null, loading: true, error: "" });
    getOrderLaborBudget({ parId, ...(orderId ? { orderId } : {}) })
      .then((budget) => { if (active) setState({ key, budget, loading: false, error: "" }); })
      .catch((error) => { if (active) setState({ key, budget: null, loading: false, error: getPublicError(error, "No se pudo cargar el saldo de horas.") }); });
    return () => { active = false; };
  }, [parId, orderId, key, revision]);
  return {
    budget: state.key === key ? state.budget : null,
    loading: Boolean(parId) && (state.key !== key || state.loading),
    error: state.key === key ? state.error : "",
    reload,
  };
}
