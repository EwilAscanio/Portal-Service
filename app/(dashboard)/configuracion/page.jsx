"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Monitor, Moon, Sun, RefreshCw, Globe, MapPin, Building2, Image as ImageIcon, DollarSign } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { notify } from "@/lib/toast";
import { syncUbicacion, getConfiguration, updateConfiguration } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Stagger, FadeInUp } from "@/components/ui/animated";
import { PermissionsMatrix } from "@/components/config/PermissionsMatrix";
import { PAGE_PERMISSIONS, API_PERMISSIONS, ROLES } from "@/lib/permissions";
import { cn } from "@/utils/cn";

const ROLE_LIST = Object.values(ROLES);

const PERMISSION_TABS = [
  { key: "pages", label: "Módulos del sistema" },
  { key: "api", label: "Endpoints de API" },
];

const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export default function ConfiguracionPage() {
  usePageTitle("Configuración");

  const { theme, setTheme } = useTheme();

  const [company, setCompany] = useState({
    name: "",
    rif: "",
    phone: "",
    email: "",
    address: "",
    website: "",
    city: "",
    country: "",
    logo: "/logo.webp",
    facebook: "",
    instagram: "",
    linkedin: "",
  });
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const [exchangeRate, setExchangeRate] = useState("");
  const [rateSaving, setRateSaving] = useState(false);

  useEffect(() => {
    getConfiguration()
      .then((data) => {
        setCompany({
          name: data.company_name ?? "",
          rif: data.rif ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          website: data.website ?? "",
          city: data.city ?? "",
          country: data.country ?? "",
          logo: data.logo || "/logo.webp",
          facebook: data.facebook ?? "",
          instagram: data.instagram ?? "",
          linkedin: data.linkedin ?? "",
        });
        setExchangeRate(data.exchange_rate?.toString() ?? "");
      })
      .catch((error) => {
        notify.error("Error al cargar la configuración", {
          description: error.message,
        });
      })
      .finally(() => setCompanyLoading(false));
  }, []);

  const [activeTab, setActiveTab] = useState("pages");
  const [notifications, setNotifications] = useState({
    orders: true,
    maintenances: true,
    billing: false,
    weekly: true,
  });

  const [security, setSecurity] = useState({
    current: "",
    next: "",
    confirm: "",
    twoFactor: false,
  });

  const [syncing, setSyncing] = useState(null);

  const setCompanyField = (field) => (event) =>
    setCompany((current) => ({ ...current, [field]: event.target.value }));

  const saveExchangeRate = async (event) => {
    event.preventDefault();
    const value = Number(exchangeRate);
    if (!Number.isFinite(value) || value <= 0) {
      notify.warning("Tasa inválida", {
        description: "Ingresa un valor mayor a 0 para la tasa BCV.",
      });
      return;
    }

    setRateSaving(true);
    try {
      await updateConfiguration({ exchange_rate: value });
      setExchangeRate(value.toString());
      notify.success("Tasa guardada", {
        description: "La tasa BCV del día se actualizó.",
      });
    } catch (error) {
      notify.error("Error al guardar", {
        description: error.response?.data?.error || error.message,
      });
    } finally {
      setRateSaving(false);
    }
  };

  const saveCompany = async (event) => {
    event.preventDefault();
    if (!company.name.trim()) {
      notify.warning("Falta la razón social", {
        description: "El nombre de la empresa es obligatorio.",
      });
      return;
    }

    setCompanySaving(true);
    try {
      await updateConfiguration({
        company_name: company.name.trim(),
        rif: company.rif.trim(),
        phone: company.phone.trim(),
        email: company.email.trim(),
        address: company.address.trim(),
        website: company.website.trim(),
        city: company.city.trim(),
        country: company.country.trim(),
        logo: company.logo.trim() || "/logo.webp",
        facebook: company.facebook.trim(),
        instagram: company.instagram.trim(),
        linkedin: company.linkedin.trim(),
      });
      notify.success("Configuración guardada", {
        description: "La información de la empresa se actualizó.",
      });
    } catch (error) {
      notify.error("Error al guardar", {
        description: error.response?.data?.error || error.message,
      });
    } finally {
      setCompanySaving(false);
    }
  };

  const toggleNotification = (key) => (value) => {
    setNotifications((current) => ({ ...current, [key]: value }));
    notify.success("Preferencia actualizada", {
      description: "Tus ajustes de notificación se guardaron.",
    });
  };

  const updatePassword = (event) => {
    event.preventDefault();
    if (!security.current) {
      notify.warning("Falta tu contraseña actual", {
        description: "Debes verificar tu identidad para continuar.",
      });
      return;
    }
    if (security.next.length < 8) {
      notify.warning("Contraseña muy corta", {
        description: "La nueva contraseña debe tener al menos 8 caracteres.",
      });
      return;
    }
    if (security.next !== security.confirm) {
      notify.error("Las contraseñas no coinciden", {
        description: "Verifica la confirmación de tu nueva contraseña.",
      });
      return;
    }
    setSecurity((current) => ({ ...current, current: "", next: "", confirm: "" }));
    notify.success("Contraseña actualizada", {
      description: "Tu contraseña se cambió correctamente (simulado).",
    });
  };

  const handleSyncUbicacion = async (endpoint, label) => {
    try {
      setSyncing(endpoint);
      const data = await syncUbicacion(endpoint);
      notify.success(`${label} sincronizados`, { description: data.message });
    } catch (error) {
      notify.error("Error de sincronización", { description: error.message });
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Preferencias de la organización y de tu cuenta."
      />

      <Stagger className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Empresa */}
        <FadeInUp className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div>
                <CardTitle>Información de la empresa</CardTitle>
                <CardDescription>Datos generales de la organización</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveCompany} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Razón social"
                    value={company.name}
                    onChange={setCompanyField("name")}
                  />
                  <Input
                    label="RIF"
                    value={company.rif}
                    onChange={setCompanyField("rif")}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Teléfono"
                    value={company.phone}
                    onChange={setCompanyField("phone")}
                  />
                  <Input
                    label="Correo"
                    type="email"
                    value={company.email}
                    onChange={setCompanyField("email")}
                  />
                </div>
                <Input
                  label="Dirección"
                  value={company.address}
                  onChange={setCompanyField("address")}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Sitio web"
                    value={company.website}
                    onChange={setCompanyField("website")}
                  />
                  <Input
                    label="Ciudad"
                    value={company.city}
                    onChange={setCompanyField("city")}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="País"
                    value={company.country}
                    onChange={setCompanyField("country")}
                  />
                  <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-2/50 p-3">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface">
                      {logoError ? (
                        <ImageIcon className="h-7 w-7 text-muted" />
                      ) : (
                        <Image
                          src={company.logo}
                          alt="Logo de la empresa"
                          width={56}
                          height={56}
                          className="object-contain"
                          onError={() => setLogoError(true)}
                          onLoad={() => setLogoError(false)}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Logo</p>
                      <p className="truncate text-xs text-muted">
                        {companyLoading ? "Cargando…" : company.logo}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted/70">
                        Imagen webp ubicada en la carpeta{" "}
                        <code className="rounded bg-surface-2 px-1 py-0.5 font-mono">
                          public
                        </code>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    label="Facebook"
                    value={company.facebook}
                    onChange={setCompanyField("facebook")}
                  />
                  <Input
                    label="Instagram"
                    value={company.instagram}
                    onChange={setCompanyField("instagram")}
                  />
                  <Input
                    label="LinkedIn"
                    value={company.linkedin}
                    onChange={setCompanyField("linkedin")}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" loading={companySaving} disabled={companyLoading}>
                    Guardar cambios
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </FadeInUp>

        {/* Apariencia */}
        <FadeInUp>
          <Card className="h-full">
            <CardHeader>
              <div>
                <CardTitle>Apariencia</CardTitle>
                <CardDescription>
                  Tema de la interfaz — se guarda automáticamente
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = theme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      aria-pressed={active}
                      className={cn(
                        "flex flex-col items-center gap-2.5 rounded-xl border p-5 text-sm font-medium transition-all duration-200",
                        active
                          ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "border-border text-muted hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                La opción <strong className="text-foreground">Sistema</strong> sigue
                la preferencia de tu sistema operativo y cambia de forma automática.
              </p>
            </CardContent>
          </Card>
        </FadeInUp>

        {/* Tasa de cambio */}
        <FadeInUp>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Tasa de cambio</CardTitle>
                  <CardDescription>
                    Tasa BCV del día para la conversión USD → Bs.
                  </CardDescription>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="h-5 w-5" />
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveExchangeRate} className="space-y-4">
                <Input
                  label="Tasa BCV del día (Bs. por USD)"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={exchangeRate}
                  onChange={(event) => setExchangeRate(event.target.value)}
                />
                <p className="text-xs text-muted">
                  Se usará como valor inicial de la tasa vigente en los PAR nuevos.
                </p>
                <div className="flex justify-end pt-2">
                  <Button type="submit" loading={rateSaving} disabled={companyLoading}>
                    Guardar tasa
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </FadeInUp>

        {/* Notificaciones */}
        <FadeInUp>
          <Card className="h-full">
            <CardHeader>
              <div>
                <CardTitle>Notificaciones</CardTitle>
                <CardDescription>Qué avisos quieres recibir por correo</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <Switch
                label="Órdenes de servicio"
                description="Nuevas órdenes, cambios de estado y asignaciones."
                checked={notifications.orders}
                onChange={toggleNotification("orders")}
              />
              <Switch
                label="Mantenimientos programados"
                description="Recordatorios de la agenda de mantenimiento."
                checked={notifications.maintenances}
                onChange={toggleNotification("maintenances")}
              />
              <Switch
                label="Facturación y pagos"
                description="Pagos recibidos y facturas vencidas."
                checked={notifications.billing}
                onChange={toggleNotification("billing")}
              />
              <Switch
                label="Resumen semanal"
                description="Informe de KPIs cada lunes por la mañana."
                checked={notifications.weekly}
                onChange={toggleNotification("weekly")}
              />
            </CardContent>
          </Card>
        </FadeInUp>

        {/* Seguridad */}
        <FadeInUp>
          <Card className="h-full">
            <CardHeader>
              <div>
                <CardTitle>Seguridad</CardTitle>
                <CardDescription>Contraseña y acceso a tu cuenta</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={updatePassword} className="space-y-4" noValidate>
                <Input
                  label="Contraseña actual"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={security.current}
                  onChange={(event) =>
                    setSecurity((current) => ({
                      ...current,
                      current: event.target.value,
                    }))
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Nueva contraseña"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    value={security.next}
                    onChange={(event) =>
                      setSecurity((current) => ({
                        ...current,
                        next: event.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Confirmar contraseña"
                    type="password"
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                    value={security.confirm}
                    onChange={(event) =>
                      setSecurity((current) => ({
                        ...current,
                        confirm: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="border-t border-border pt-4">
                  <Switch
                    label="Autenticación en dos pasos (2FA)"
                    description="Capa adicional de seguridad al iniciar sesión."
                    checked={security.twoFactor}
                    onChange={(value) => {
                      setSecurity((current) => ({ ...current, twoFactor: value }));
                      notify.success(
                        value ? "2FA activado" : "2FA desactivado",
                        { description: "Cambio aplicado a tu cuenta (simulado)." }
                      );
                    }}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit">Actualizar contraseña</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </FadeInUp>
      </Stagger>

      {/* Sincronización Saint */}
      <FadeInUp>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Sincronización Saint ERP</CardTitle>
              <CardDescription>
                Tablas de referencia: Países, Estados y Ciudades. Se guardan en PostgreSQL.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                icon={syncing === "paises" ? undefined : Globe}
                loading={syncing === "paises"}
                onClick={() => handleSyncUbicacion("country", "Países")}
              >
                Sincronizar Países
              </Button>
              <Button
                variant="secondary"
                icon={syncing === "estados" ? undefined : MapPin}
                loading={syncing === "estados"}
                onClick={() => handleSyncUbicacion("state", "Estados")}
              >
                Sincronizar Estados
              </Button>
              <Button
                variant="secondary"
                icon={syncing === "ciudades" ? undefined : Building2}
                loading={syncing === "ciudades"}
                onClick={() => handleSyncUbicacion("city", "Ciudades")}
              >
                Sincronizar Ciudades
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted">
              Ordén recomendado: Países → Estados → Ciudades. Estas tablas no cambian frecuentemente.
            </p>
          </CardContent>
        </Card>
      </FadeInUp>

      {/* Permisos */}
      <FadeInUp>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Permisos del sistema</CardTitle>
              <CardDescription>
                Mapa de acceso a módulos y endpoints de la API
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
              {PERMISSION_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                    activeTab === tab.key
                      ? "bg-surface shadow-sm text-foreground"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Matriz */}
            {activeTab === "pages" ? (
              <PermissionsMatrix
                permissions={PAGE_PERMISSIONS}
                availableRoles={ROLE_LIST}
              />
            ) : (
              <PermissionsMatrix
                permissions={API_PERMISSIONS}
                availableRoles={ROLE_LIST}
              />
            )}

            {/* Nota */}
            <p className="text-xs text-muted border-t border-border pt-4">
              Los permisos se definen en código fuente (
              <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-mono">
                lib/permissions.js
              </code>
              ). Edita el archivo para modificar el acceso.
            </p>
          </CardContent>
        </Card>
      </FadeInUp>
    </div>
  );
}
