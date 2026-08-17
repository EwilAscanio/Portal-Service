"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Camera,
  ClipboardList,
  FileText,
  Mail,
  Phone,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { notify } from "@/lib/toast";
import { getNotifications } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Stagger, FadeInUp } from "@/components/ui/animated";
import { ROLE_VARIANTS } from "@/lib/status";
import { timeAgo } from "@/lib/format";

const PROFILE_STATS = [
  { label: "Órdenes gestionadas", value: "128" },
  { label: "Reportes generados", value: "46" },
  { label: "Antigüedad", value: "3 años" },
];

export default function PerfilPage() {
  usePageTitle("Perfil");

  const { user } = useAuth();
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    getNotifications()
      .then((data) => setActivity((data.notifications ?? []).slice(0, 4)))
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: "+57 315 442 9087",
    position: "Gerente de Operaciones",
    bio: "Responsable de la operación de mantenimiento industrial y de la relación con clientes estratégicos de Maquitech.",
  });

  const setField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSave = (event) => {
    event.preventDefault();
    notify.success("Perfil actualizado", {
      description: "Tu información se guardó correctamente (simulado).",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Perfil" description="Tu información personal y actividad." />

      <Stagger className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tarjeta de identidad */}
        <FadeInUp>
          <Card className="h-full">
            <CardContent className="flex flex-col items-center pt-8 text-center">
              <div className="relative">
                <Avatar name={user?.name ?? "Usuario"} size="xl" />
                <button
                  type="button"
                  aria-label="Cambiar foto de perfil"
                  onClick={() =>
                    notify.info("Acción de demostración", {
                      description: "La carga de fotos estará disponible pronto.",
                    })
                  }
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-colors hover:bg-blue-700"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <h2 className="mt-4 text-lg font-bold tracking-tight text-foreground">
                {user?.name}
              </h2>
              <div className="mt-2">
                <StatusBadge status={user?.role} variants={ROLE_VARIANTS} dot={false} />
              </div>

              <ul className="mt-6 w-full space-y-3 text-left">
                <li className="flex items-center gap-3 text-sm text-muted">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-muted">
                  <Phone className="h-4 w-4 shrink-0" />
                  {form.phone}
                </li>
                <li className="flex items-center gap-3 text-sm text-muted">
                  <Calendar className="h-4 w-4 shrink-0" />
                  Miembro desde enero 2023
                </li>
              </ul>

              <div className="mt-6 grid w-full grid-cols-3 divide-x divide-border rounded-xl border border-border py-3">
                {PROFILE_STATS.map((stat) => (
                  <div key={stat.label} className="px-2">
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                    <p className="mt-0.5 text-[11px] leading-tight text-muted">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeInUp>

        {/* Formulario + actividad */}
        <FadeInUp className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Información personal</CardTitle>
                <CardDescription>Actualiza tus datos de contacto</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Nombre completo"
                    value={form.name}
                    onChange={setField("name")}
                  />
                  <Input
                    label="Cargo"
                    value={form.position}
                    onChange={setField("position")}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Correo corporativo"
                    type="email"
                    value={form.email}
                    onChange={setField("email")}
                  />
                  <Input
                    label="Teléfono"
                    value={form.phone}
                    onChange={setField("phone")}
                  />
                </div>
                <Textarea
                  label="Biografía"
                  value={form.bio}
                  onChange={setField("bio")}
                />
                <div className="flex justify-end pt-2">
                  <Button type="submit">Guardar cambios</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Actividad reciente</CardTitle>
                <CardDescription>Últimos eventos de tu cuenta</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-2">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-2/60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {item.type === "billing" ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <ClipboardList className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="truncate text-xs text-muted">{item.description}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted/70">
                    {timeAgo(item.created_at)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </FadeInUp>
      </Stagger>
    </div>
  );
}
