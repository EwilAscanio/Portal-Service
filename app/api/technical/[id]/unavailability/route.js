import { unavailabilityRequest } from "@/lib/technician-unavailability-http";
import { listUnavailability, createUnavailability } from "@/lib/repositories/technician-unavailability.repository";

export const GET = (_request, context) => unavailabilityRequest(context, false, ({ id }, actor) => listUnavailability(id, actor));
export const POST = (request, context) => unavailabilityRequest(context, true, async ({ id }, actor) => createUnavailability(id, await request.json(), actor));
