"use client";

import { usePageTitle } from "@/hooks/usePageTitle";
import { PageHeader } from "@/components/layout/PageHeader";
import { TechnicianCalendar } from "@/components/technician-calendar/TechnicianCalendar";

export default function CalendarioTecnicosPage() {
  usePageTitle("Calendario de Técnicos");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario de Técnicos"
        description="Programación de órdenes aprobadas y períodos de no disponibilidad de los técnicos. Hora de Venezuela."
      />
      <TechnicianCalendar />
    </div>
  );
}
