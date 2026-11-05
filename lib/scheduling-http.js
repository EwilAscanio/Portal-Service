import { NextResponse } from "next/server";

export function schedulingErrorResponse(error) {
  const statuses = { SCHEDULING_FORBIDDEN: 403, SCHEDULING_INVALID: 400, SCHEDULING_NOT_FOUND: 404,
    SCHEDULING_CONFLICT: 409, UNAVAILABILITY_OPEN_ORDERS: 409, UNAVAILABILITY_OVERLAP: 409,
    ORDER_TECHNICIAN_UNAVAILABLE: 409, ORDER_RESCHEDULE_LOCKED: 409, ORDER_RESCHEDULE_HOURS: 400 };
  return statuses[error.code] ? NextResponse.json({ error: error.message, code: error.code, conflicts: error.conflicts || [] }, { status: statuses[error.code], headers: { "Cache-Control": "private, no-store" } }) : null;
}
