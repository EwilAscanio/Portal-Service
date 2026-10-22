import assert from "node:assert/strict";
import fs from "node:fs";
import { findScheduleConflictIds, isCalendarEligible } from "../lib/technician-calendar-policy.js";
import { CALENDAR_ORDER_STATUS, getFullCalendarEventStyle } from "../lib/technician-calendar-status.js";

const approval = { approved_by: "user-1", approved_at: "2026-09-19T10:00:00Z", scheduled_start: "2026-09-20T12:00:00Z", scheduled_end: "2026-09-20T14:00:00Z" };
assert.equal(isCalendarEligible({ ...approval, status: "Aprobada" }), true);
assert.equal(isCalendarEligible({ ...approval, status: "En Proceso" }), true);
assert.equal(isCalendarEligible({ ...approval, status: "Completada" }), true);
assert.equal(isCalendarEligible({ ...approval, status: "Cancelada" }), false);
assert.equal(isCalendarEligible({ ...approval, approved_at: null, status: "Aprobada" }), false);
assert.equal(CALENDAR_ORDER_STATUS.Aprobada.label, "Programada");
assert.equal(CALENDAR_ORDER_STATUS["En Proceso"].label, "En ejecución");
assert.equal(CALENDAR_ORDER_STATUS["En Proceso"].backgroundColor, "#f97316");
assert.equal(CALENDAR_ORDER_STATUS.Completada.label, "Completada");

const approvedStyle = getFullCalendarEventStyle("Aprobada");
const inProgressStyle = getFullCalendarEventStyle("En Proceso");
const completedConflictStyle = getFullCalendarEventStyle("Completada", true);
assert.deepEqual(approvedStyle, { color: "#2563eb", contrastColor: "#ffffff", className: "" });
assert.equal(inProgressStyle.color, "#f97316");
assert.equal(completedConflictStyle.color, "#059669");
assert.equal(completedConflictStyle.className, "mq-calendar-conflict");
assert.equal("backgroundColor" in completedConflictStyle, false);
assert.equal("borderColor" in completedConflictStyle, false);
assert.equal("textColor" in completedConflictStyle, false);
assert.equal("classNames" in completedConflictStyle, false);

const events = [
  { service_order_id: 1, technician_id: "tech-1", start_at: "2026-09-20T12:00:00Z", end_at: "2026-09-20T14:00:00Z" },
  { service_order_id: 2, technician_id: "tech-1", start_at: "2026-09-20T13:00:00Z", end_at: "2026-09-20T15:00:00Z" },
  { service_order_id: 3, technician_id: "tech-1", start_at: "2026-09-20T15:00:00Z", end_at: "2026-09-20T16:00:00Z" },
  { service_order_id: 4, technician_id: "tech-2", start_at: "2026-09-20T13:00:00Z", end_at: "2026-09-20T15:00:00Z" },
];
const conflicts = findScheduleConflictIds(events);
assert.equal(conflicts.has("1:tech-1"), true);
assert.equal(conflicts.has("2:tech-1"), true);
assert.equal(conflicts.has("3:tech-1"), false, "Los horarios consecutivos no deben solaparse");
assert.equal(conflicts.has("4:tech-2"), false, "Las agendas de técnicos distintos son independientes");

const repository = fs.readFileSync("lib/repositories/technician-calendar.repository.js", "utf8");
const route = fs.readFileSync("app/api/technician-calendar/route.js", "utf8");
const page = fs.readFileSync("components/technician-calendar/TechnicianCalendar.jsx", "utf8");
assert.match(repository, /approved_by IS NOT NULL/);
assert.match(repository, /approved_at IS NOT NULL/);
assert.match(repository, /status <> 'Cancelada'/);
assert.match(repository, /technical WHERE user_id/);
assert.match(route, /findCalendarData/);
assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
assert.match(page, /editable=\{false\}/);
assert.match(page, /selectable=\{false\}/);
assert.match(page, /Ver orden/);
assert.match(page, /Pendiente de iniciar/);
assert.match(page, /CALENDAR_ORDER_STATUS/);
assert.match(page, /getFullCalendarEventStyle\(event\.status, event\.has_conflict\)/);
assert.doesNotMatch(page, /classNames:\s*event\.has_conflict/);

console.log("Technician calendar tests passed.");
