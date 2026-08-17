"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signIn, useSession } from "next-auth/react";
import {
  BarChart3,
  Cog,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { PageLoader } from "@/components/ui/Loader";
import { LoginForm } from "@/components/forms/LoginForm";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const FEATURES = [
  {
    icon: Gauge,
    title: "Monitoreo en tiempo real",
    text: "Estado de equipos, órdenes y técnicos al instante.",
  },
  {
    icon: BarChart3,
    title: "Reportes inteligentes",
    text: "Facturación, productividad y rendimiento operativo.",
  },
  {
    icon: ShieldCheck,
    title: "Seguridad empresarial",
    text: "Control de acceso por roles y trazabilidad completa.",
  },
];

const STATS = [
  { value: "1,250+", label: "Equipos gestionados" },
  { value: "98.4%", label: "Satisfacción de clientes" },
  { value: "24/7", label: "Soporte técnico" },
];

/** Panel de marca con ilustración industrial abstracta */
function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#0a1120] lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* Fondo: rejilla + brillos */}
      <div className="bg-grid absolute inset-0 opacity-60" aria-hidden="true" />
      <motion.div
        className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl"
        animate={{ y: [0, 32, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-blue-600/25 blur-3xl"
        animate={{ y: [0, -40, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      />

      {/* Engranajes flotantes */}
      <motion.div
        className="absolute right-20 top-28 text-white/[0.07]"
        animate={{ rotate: 360 }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
        aria-hidden="true"
      >
        <Cog className="h-32 w-32" />
      </motion.div>
      <motion.div
        className="absolute bottom-24 left-16 text-white/[0.05]"
        animate={{ rotate: -360 }}
        transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
        aria-hidden="true"
      >
        <Cog className="h-44 w-44" />
      </motion.div>

      {/* Marca */}
      <div className="relative flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
          <Cog className="h-6 w-6 text-white" />
        </span>
        <div>
          <p className="text-base font-bold tracking-tight text-white">Maquitech</p>
          <p className="text-xs text-slate-400">Gestión Industrial Inteligente</p>
        </div>
      </div>

      {/* Propuesta de valor */}
      <div className="relative max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-orange-300">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            Plataforma SaaS Industrial
          </span>
          <h2 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
            Gestiona tu operación industrial{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
              en tiempo real
            </span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Centraliza órdenes de servicio, clientes, equipos y técnicos en una
            sola plataforma diseñada para la industria moderna.
          </p>
        </motion.div>

        <ul className="mt-8 space-y-4">
          {FEATURES.map((feature, index) => (
            <motion.li
              key={feature.title}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.35 + index * 0.12 }}
              className="flex items-start gap-3.5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-orange-400">
                <feature.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{feature.title}</p>
                <p className="mt-0.5 text-sm text-slate-400">{feature.text}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Métricas */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="relative grid grid-cols-3 gap-6 border-t border-white/10 pt-8"
      >
        {STATS.map((stat) => (
          <div key={stat.label}>
            <p className="text-2xl font-bold tracking-tight text-white">{stat.value}</p>
            <p className="mt-1 text-xs text-slate-400">{stat.label}</p>
          </div>
        ))}
      </motion.div>
    </aside>
  );
}

export default function LoginPage() {
  usePageTitle("Iniciar sesión");
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleLogin = async (login, password) => {
    const result = await signIn("credentials", {
      login,
      password,
      redirect: false,
    });

    if (result?.error) throw new Error("Credenciales inválidas.");
    return result;
  };

  useEffect(() => {
    if (status === "authenticated" && session) router.replace("/dashboard");
  }, [session, status, router]);

  if (status === "loading" || session) return <PageLoader label="Redirigiendo al panel" />;

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      <section className="relative flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {/* Marca en móvil */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25">
              <Cog className="h-6 w-6 text-white" />
            </span>
            <div>
              <p className="text-base font-bold tracking-tight text-foreground">
                Maquitech
              </p>
              <p className="text-xs text-muted">Gestión Industrial Inteligente</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Bienvenido de nuevo
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Inicia sesión para acceder al panel de control de Maquitech.
          </p>

          <div className="mt-8">
            <LoginForm onSubmit={handleLogin} />
          </div>

          <p className="mt-10 text-center text-xs text-muted">
            © 2026 Maquitech S.A.S. — Todos los derechos reservados.
          </p>
        </motion.div>
      </section>
    </main>
  );
}
