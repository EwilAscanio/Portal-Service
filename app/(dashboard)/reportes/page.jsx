"use client";

import dynamic from "next/dynamic";
import { CheckCircle2, Download, Gauge, Star, Wallet } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { notify } from "@/lib/toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { SkeletonChart } from "@/components/ui/Skeleton";
import { Stagger, FadeInUp } from "@/components/ui/animated";

const RevenueLineChart = dynamic(
  () => import("@/components/charts/RevenueLineChart"),
  { ssr: false, loading: () => <SkeletonChart /> }
);
const OrdersDonutChart = dynamic(
  () => import("@/components/charts/OrdersDonutChart"),
  { ssr: false, loading: () => <SkeletonChart /> }
);
const ServicesBarChart = dynamic(
  () => import("@/components/charts/ServicesBarChart"),
  { ssr: false, loading: () => <SkeletonChart /> }
);
const PerformanceAreaChart = dynamic(
  () => import("@/components/charts/PerformanceAreaChart"),
  { ssr: false, loading: () => <SkeletonChart /> }
);
const TechniciansRadialChart = dynamic(
  () => import("@/components/charts/TechniciansRadialChart"),
  { ssr: false, loading: () => <SkeletonChart /> }
);

export default function ReportesPage() {
  usePageTitle("Reportes");


  const summary = [
    {
      id: "facturacion",
      label: "Facturación anual",
      value: 0,
      format: "currency",
      delta: 0,
      icon: Wallet,
      tone: "emerald",
      hint: "sin movimientos",
    },
    {
      id: "servicios",
      label: "Servicios completados",
      value: 0,
      delta: 0,
      icon: CheckCircle2,
      tone: "blue",
      hint: "sin registros",
    },
    {
      id: "eficiencia",
      label: "Eficiencia promedio (%)",
      value: 0,
      delta: 0,
      icon: Gauge,
      tone: "violet",
      hint: "sin datos",
    },
    {
      id: "satisfaccion",
      label: "Satisfacción promedio (%)",
      value: 0,
      delta: 0,
      icon: Star,
      tone: "amber",
      hint: "sin datos",
    },
  ];

  const handleExport = (name) =>
    notify.success("Reporte generado", {
      description: `${name} se exportó correctamente (simulado).`,
    });

  const exportAction = (name) => (
    <Button
      variant="ghost"
      size="icon-sm"
      icon={Download}
      aria-label={`Exportar ${name}`}
      onClick={() => handleExport(name)}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Analítica operativa y financiera de la organización."
        actions={
          <>
            <Select
              aria-label="Periodo"
              className="w-44"
              options={[
                { value: "12m", label: "Últimos 12 meses" },
                { value: "6m", label: "Últimos 6 meses" },
                { value: "3m", label: "Último trimestre" },
              ]}
            />
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => handleExport("Consolidado general")}
            >
              Exportar todo
            </Button>
          </>
        }
      />

      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <FadeInUp key={item.id}>
            <StatCard {...item} />
          </FadeInUp>
        ))}
      </Stagger>

      <Stagger className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <FadeInUp className="xl:col-span-2">
          <ChartCard
            title="Facturación mensual"
            description="Ingresos vs. egresos del año en curso"
            action={exportAction("Facturación mensual")}
          >
            <RevenueLineChart />
          </ChartCard>
        </FadeInUp>
        <FadeInUp>
          <ChartCard
            title="Estado de órdenes"
            description="Distribución del periodo actual"
            action={exportAction("Estado de órdenes")}
          >
            <OrdersDonutChart />
          </ChartCard>
        </FadeInUp>
      </Stagger>

      <Stagger className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <FadeInUp>
          <ChartCard
            title="Servicios por mes"
            description="Completados vs. pendientes"
            action={exportAction("Servicios por mes")}
          >
            <ServicesBarChart />
          </ChartCard>
        </FadeInUp>
        <FadeInUp>
          <ChartCard
            title="Rendimiento operativo"
            description="Eficiencia y satisfacción"
            action={exportAction("Rendimiento operativo")}
          >
            <PerformanceAreaChart />
          </ChartCard>
        </FadeInUp>
        <FadeInUp className="lg:col-span-2 xl:col-span-1">
          <ChartCard
            title="Productividad de técnicos"
            description="Top 5 del mes"
            action={exportAction("Productividad de técnicos")}
          >
            <TechniciansRadialChart />
          </ChartCard>
        </FadeInUp>
      </Stagger>
    </div>
  );
}
