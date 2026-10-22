// Centésimas enteras: la cantidad se reparte, nunca se multiplica por técnicos ni por precio.
export function hourUnits(value) {
  return Math.round(Number(value || 0) * 100);
}

export function sumLaborHours(rows = []) {
  return rows.reduce((sum, row) => sum + hourUnits(row.hours), 0) / 100;
}

export function budgetedLaborHours(items = []) {
  return items.reduce((sum, item) => sum + ((item.requiresTechnician ?? item.requires_technician) ? hourUnits(item.qty) : 0), 0) / 100;
}

export function allocationTechnicianIds(allocations = [], leadTechnicianId) {
  const ids = [...new Set(allocations.map((row) => row.technicalId).filter(Boolean))];
  return ids.includes(leadTechnicianId) ? [leadTechnicianId, ...ids.filter((id) => id !== leadTechnicianId)] : ids;
}
