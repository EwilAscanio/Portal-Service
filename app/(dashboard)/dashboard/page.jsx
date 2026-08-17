"use client";

import { useEffect, useSyncExternalStore, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Cog,
  DollarSign,
  Download,
  Plus,
  Wrench,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/hooks/useAuth";
import { notify } from "@/lib/toast";
import { getDashboard } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { SkeletonChart } from "@/components/ui/Skeleton";
import { Stagger, FadeInUp } from "@/components/ui/animated";
import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Avatar } from "@/components/ui/Avatar";
import { ORDER_STATUS_VARIANTS } from "@/lib/status";
import { formatCurrency, formatDate, getGreeting } from "@/lib/format";

/* Fecha del cliente solo tras la hidratación (evita mismatch servidor/cliente) */
const EMPTY_SUBSCRIBE = () => () => {};
let clientNow = null;

function getClientNow() {
  if (typeof window === "undefined") return null;
  if (clientNow === null) clientNow = new Date();
  return clientNow;
}

/* Gráficos con carga diferida: reducen el JS inicial de la página */
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

const recentOrderColumns = [
  {
    key: "orderCode",
    header: "Orden",
    sortable: false,
    render: (row) => <span className="font-semibold text-foreground">{row.orderCode}</span>,
  },
  { key: "client", header: "Cliente", sortable: false },
  {
    key: "technician",
    header: "Técnico",
    sortable: false,
    className: "hidden md:table-cell",
  },
  {
    key: "status",
    header: "Estado",
    sortable: false,
    render: (row) => (
      <StatusBadge status={row.status} variants={ORDER_STATUS_VARIANTS} />
    ),
  },
  {
    key: "scheduled",
    header: "Fecha",
    sortable: false,
    className: "hidden lg:table-cell",
    render: (row) => formatDate(row.scheduled),
  },
  {
    key: "amount",
    header: "Monto",
    sortable: false,
    className: "text-right",
    render: (row) => (
      <span className="font-semibold text-foreground">
        {formatCurrency(row.amount)}
      </span>
    ),
  },
];

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const { user } = useAuth();

  const router = useRouter();

  const now = useSyncExternalStore(EMPTY_SUBSCRIBE, getClientNow, () => null);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        setStats(await getDashboard());
      } catch {
        // Silenciar error, mostrar zeros
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "Usuario";
  const activeOrders = stats?.kpis?.orders?.inProgress ?? 0;
  const topTechnicians = [];
  const upcomingMaintenances = stats?.upcomingMaintenances ?? [];
  const recentOrders = stats?.recentOrders ?? [];
  const kpis = [
    { id: "orders", label: "Órdenes", value: stats?.kpis?.orders?.total ?? 0, hint: "Servicios totales", icon: ClipboardList, tone: "blue" },
    { id: "clients", label: "Clientes", value: stats?.kpis?.clients?.active ?? 0, hint: "Clientes activos", icon: Building2, tone: "violet" },
    { id: "equipment", label: "Equipos", value: stats?.kpis?.equipment?.total ?? 0, hint: "Equipos registrados", icon: Cog, tone: "cyan" },
    { id: "revenue", label: "Ingresos", value: stats?.kpis?.revenue ?? 0, format: "currency", hint: "Facturación completada", icon: DollarSign, tone: "emerald" },
  ];

  const handleExport = () =>
    notify.success("Reporte en preparación", {
      description: "Recibirás el consolidado del mes por correo (simulado).",
    });

  return (
    <div className="space-y-6">
      {/* Banner de bienvenida */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 p-6 text-white sm:p-8"
      >
        <div className="bg-grid absolute inset-0 opacity-20" aria-hidden="true" />
        <div
          className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-orange-500/25 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium capitalize text-blue-200">
              {now
                ? formatDate(now, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : ""}
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
              {now ? getGreeting(now) : ""}, {firstName}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-blue-100/90">
              Hay <strong className="text-white">{activeOrders} órdenes activas</strong> y{" "}
              <strong className="text-white">{upcomingMaintenances.length} mantenimientos</strong> programados
              para esta semana.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="accent"
              icon={Plus}
              onClick={() => router.push("/ordenes")}
            >
              Nueva Orden
            </Button>
            <Button variant="glass" icon={Download} onClick={handleExport}>
              Exportar
            </Button>
          </div>
        </div>
      </motion.section>

      {/* KPIs */}
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <FadeInUp key={kpi.id}>
            <StatCard {...kpi} />
          </FadeInUp>
        ))}
      </Stagger>

      {/* Gráficos principales */}
      <Stagger className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <FadeInUp className="xl:col-span-2">
          <ChartCard
            title="Facturación mensual"
            description="Ingresos vs. egresos del año en curso"
          >
            <RevenueLineChart />
          </ChartCard>
        </FadeInUp>
        <FadeInUp>
          <ChartCard
            title="Estado de órdenes"
            description="Distribución del periodo actual"
          >
            <OrdersDonutChart data={stats?.ordersByStatus ?? []} />
          </ChartCard>
        </FadeInUp>
      </Stagger>

      <Stagger className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <FadeInUp>
          <ChartCard
            title="Servicios por mes"
            description="Completados vs. pendientes"
          >
            <ServicesBarChart />
          </ChartCard>
        </FadeInUp>
        <FadeInUp>
          <ChartCard
            title="Rendimiento operativo"
            description="Eficiencia y satisfacción"
          >
            <PerformanceAreaChart />
          </ChartCard>
        </FadeInUp>
        <FadeInUp className="lg:col-span-2 xl:col-span-1">
          <ChartCard
            title="Productividad de técnicos"
            description="Top 5 del mes"
          >
            <TechniciansRadialChart />
          </ChartCard>
        </FadeInUp>
      </Stagger>

      {/* Tabla + widgets laterales */}
      <Stagger className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <FadeInUp className="xl:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Órdenes recientes</CardTitle>
                <CardDescription>
                  Últimas órdenes de servicio registradas
                </CardDescription>
              </div>
              <Link
                href="/ordenes"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400"
              >
                Ver todas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              {recentOrders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-surface-2/40 px-4 py-8 text-center text-sm text-muted">
                  No hay órdenes recientes para mostrar.
                </div>
              ) : (
                <DataTable columns={recentOrderColumns} rows={recentOrders} />
              )}
            </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp className="space-y-6">
          {/* Top técnicos */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Top técnicos</CardTitle>
                <CardDescription>Productividad del mes</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {topTechnicians.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-surface-2/40 px-4 py-6 text-center text-sm text-muted">
                  Aún no hay técnicos registrados para mostrar.
                </div>
              ) : (
                topTechnicians.map((tech) => (
                  <div key={tech.id} className="flex items-center gap-3">
                    <Avatar name={tech.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {tech.name}
                        </p>
                        <span className="text-xs font-bold text-foreground">
                          {tech.productivity}%
                        </span>
                      </div>
                      <ProgressBar
                        value={tech.productivity}
                        tone={tech.productivity >= 92 ? "emerald" : "blue"}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Próximos mantenimientos */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Próximos mantenimientos</CardTitle>
                <CardDescription>Agenda de la semana</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-2">
              {upcomingMaintenances.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-surface-2/40 px-4 py-6 text-center text-sm text-muted">
                  No hay mantenimientos programados.
                </div>
              ) : (
                upcomingMaintenances.map((maintenance) => (
                  <div
                    key={maintenance.id}
                    className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-2/60"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                      <Wrench className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {maintenance.equipment}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {maintenance.client} · {maintenance.type}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold capitalize text-muted">
                      {formatDate(maintenance.date, { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </FadeInUp>
      </Stagger>
    </div>
  );
}
