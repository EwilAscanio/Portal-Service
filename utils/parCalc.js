import { calculateLineTotalUsd as calculateLineTotalUsdPure } from "../lib/par-calculation.js";

/** Funciones de cálculo y formato para el módulo PAR. */

export function calculateLineTotalUsd(item) {
  return calculateLineTotalUsdPure(item);
}

export function calculateLineTotalBs(item, exchangeRate) {
  const totalUsd = calculateLineTotalUsd(item);
  return Number((totalUsd * exchangeRate).toFixed(2));
}

export function formatCurrencyUsd(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatCurrencyBs(amount) {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount || 0)
    .replace("VES", "Bs.");
}

export function formatNumber(amount) {
  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}
