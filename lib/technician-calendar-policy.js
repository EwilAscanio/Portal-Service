export function isCalendarEligible(order) {
  return Boolean(
    order?.approved_by
    && order?.approved_at
    && order?.scheduled_start
    && order?.scheduled_end
    && order.status !== "Cancelada"
  );
}

export function findScheduleConflictIds(events) {
  const byTechnician = new Map();
  for (const event of events) {
    if (!byTechnician.has(event.technician_id)) byTechnician.set(event.technician_id, []);
    byTechnician.get(event.technician_id).push(event);
  }
  const conflicts = new Set();
  for (const technicianEvents of byTechnician.values()) {
    const sorted = technicianEvents.toSorted((left, right) => new Date(left.start_at) - new Date(right.start_at));
    for (let index = 0; index < sorted.length; index += 1) {
      for (let next = index + 1; next < sorted.length; next += 1) {
        if (new Date(sorted[next].start_at) >= new Date(sorted[index].end_at)) break;
        if (sorted[index].service_order_id !== sorted[next].service_order_id) {
          conflicts.add(`${sorted[index].service_order_id}:${sorted[index].technician_id}`);
          conflicts.add(`${sorted[next].service_order_id}:${sorted[next].technician_id}`);
        }
      }
    }
  }
  return conflicts;
}
