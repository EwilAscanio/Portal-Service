/**
 * Funciones de cálculo y formato para el módulo Par.
 */

export function calculateLineTotalUsd(item) {
  if (item.qty === "" || item.qty == null || Number(item.qty) <= 0) return 0;
  if (item.valorUnitUsd === "" || item.valorUnitUsd == null || Number(item.valorUnitUsd) < 0) return 0;
  const mult =
    item.multiplicador && item.multiplicador > 0 ? Number(item.multiplicador) : 1;
  const percent =
    item.valorPercent !== "" && item.valorPercent != null && Number(item.valorPercent) > 0
      ? Number(item.valorPercent)
      : 0;
  return Number((Number(item.qty) * Number(item.valorUnitUsd) * mult * (1 + percent / 100)).toFixed(2));
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
