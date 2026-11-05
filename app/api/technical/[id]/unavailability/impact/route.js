import { unavailabilityRequest } from "@/lib/technician-unavailability-http";
import { previewUnavailabilityImpact } from "@/lib/repositories/technician-unavailability.repository";

export const POST = (request, context) => unavailabilityRequest(context, true, async ({ id }, actor) => {
  const { unavailabilityId = null, ...data } = await request.json();
  return previewUnavailabilityImpact(id, data, actor, unavailabilityId);
});
