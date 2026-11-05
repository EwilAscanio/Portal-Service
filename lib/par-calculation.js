export function calculateLineTotalUsd(item) {
  const qty = Number(item.qty) || 0;
  const unit = Number(item.valorUnitUsd) || 0;
  const mult = Number(item.multiplicador) > 0 ? Number(item.multiplicador) : 1;
  const percent = Number(item.valorPercent) > 0 ? Number(item.valorPercent) : 0;
  if (qty <= 0 || unit < 0) return 0;
  return Math.round(qty * unit * mult * (1 + percent / 100) * 100) / 100;
}

export function calculateTotalUsd(items = []) {
  return Math.round(items.reduce((total, item) => total + calculateLineTotalUsd(item), 0) * 100) / 100;
}

export function calculateTotalBs(totalUsd, exchangeRate) {
  return Math.round(Number(totalUsd || 0) * Number(exchangeRate || 0) * 100) / 100;
}

/** Descuento global: centavos y centésimas de porcentaje, redondeo comercial.
 * El presupuesto de horas se calcula por separado desde las cantidades.
 */
export function calculateParTotals(items = [], exchangeRate = 0, discountPercent = 0) {
  const subtotalUsd = calculateTotalUsd(items);
  const cents = Math.round(subtotalUsd * 100);
  const percent = Number(discountPercent);
  const validPercent = Number.isFinite(percent) && percent >= 0 && percent <= 100;
  const basisPoints = validPercent ? Math.round(percent * 100) : 0;
  // Zod valida la entrada al guardar; evitar que un borrador inválido rompa la vista.
  const discountCents = Number.isSafeInteger(cents) && cents >= 0
    ? Number((BigInt(cents) * BigInt(basisPoints) + 5000n) / 10000n)
    : 0;
  const totalUsd = (cents - discountCents) / 100;
  return { subtotalUsd, discountAmountUsd: discountCents / 100, totalUsd, totalBs: calculateTotalBs(totalUsd, exchangeRate) };
}
