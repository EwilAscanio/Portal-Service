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
