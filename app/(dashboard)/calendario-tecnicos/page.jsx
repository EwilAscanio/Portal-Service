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
        description="Agenda generada exclusivamente desde órdenes de servicio aprobadas."
      />
      <TechnicianCalendar />
    </div>
  );
}
