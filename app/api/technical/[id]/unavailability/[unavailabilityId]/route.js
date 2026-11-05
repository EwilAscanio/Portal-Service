import { unavailabilityRequest } from "@/lib/technician-unavailability-http";
import { updateUnavailability, cancelUnavailability } from "@/lib/repositories/technician-unavailability.repository";

export const PUT = (request, context) => unavailabilityRequest(context, true, async ({ id, unavailabilityId }, actor) => updateUnavailability(id, unavailabilityId, await request.json(), actor));
export const DELETE = (request, context) => unavailabilityRequest(context, true, async ({ id, unavailabilityId }, actor) => cancelUnavailability(id, unavailabilityId, await request.json(), actor));
