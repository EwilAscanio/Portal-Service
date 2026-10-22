import { NextResponse } from "next/server";

export function closureErrorResponse(error) {
  const statuses = { ORDER_CLOSURE_INVALID: 400, ORDER_CLOSURE_FORBIDDEN: 403, ORDER_CLOSURE_NOT_FOUND: 404,
    ORDER_CLOSURE_CONFLICT: 409, ORDER_CLOSURE_LOCKED: 409, ORDER_CLOSURE_REQUIRED: 409,
    ORDER_CLOSURE_TOO_LARGE: 413, ORDER_CLOSURE_STORAGE: 503 };
  const status = statuses[error.code];
  return status ? NextResponse.json({ error: error.message, code: error.code }, { status }) : null;
}

export function laborErrorResponse(error) {
  const closure = closureErrorResponse(error);
  if (closure) return closure;
  if (!["ORDER_LABOR_INVALID", "ORDER_LABOR_EXCEEDED", "ORDER_LABOR_REVIEW_REQUIRED", "ORDER_LABOR_REVIEW_FORBIDDEN"].includes(error.code)) return null;
  const status = error.code === "ORDER_LABOR_REVIEW_FORBIDDEN" ? 403 : error.code === "ORDER_LABOR_INVALID" ? 400 : 409;
  return NextResponse.json({ error: error.message, code: error.code }, { status });
}
