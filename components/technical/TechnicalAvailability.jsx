"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { operationDate, unavailabilityStatus } from "@/lib/technician-unavailability";

export function TechnicalAvailability({ unavailability = [] }) {
  const [today, setToday] = useState(() => operationDate());
  useEffect(() => {
    const timer = setInterval(() => setToday(operationDate()), 60000);
    return () => clearInterval(timer);
  }, []);
  const current = unavailability.find((v) => unavailabilityStatus(v, today) === "Vigente");
  const next = unavailability.filter((v) => unavailabilityStatus(v, today) === "Programado").toSorted((a, b) => a.start_date.localeCompare(b.start_date))[0];
  if (!current && !next) return null;
  return <Badge variant={current ? "warning" : "purple"}>{current ? `No disponible hasta ${current.end_date}` : `No disponibilidad programada del ${next.start_date} al ${next.end_date}`}</Badge>;
}
