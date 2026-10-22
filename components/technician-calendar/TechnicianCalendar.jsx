"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import listPlugin from "@fullcalendar/react/list";
import interactionPlugin from "@fullcalendar/react/interaction";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import esLocale from "@fullcalendar/react/locales/es";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import { AlertTriangle, CalendarCheck2, Clock3, HardHat, Loader2, MapPin, RefreshCw, Wrench } from "lucide-react";
import { getTechnicianCalendar } from "@/lib/api";
import { getPublicError } from "@/lib/ui-errors";
import { Card, CardContent } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/utils/cn";
import { CALENDAR_ORDER_STATUS, getCalendarOrderStatus, getFullCalendarEventStyle } from "@/lib/technician-calendar-status";

const SERVICE_LABELS = { Inspection: "Revisión", Maintenance: "Mantenimiento", Emergency: "Emergencia", Other: "Otro" };
const WORK_LABELS = { Internal: "Interna", External: "Externa" };
const EMPTY_DATA = { events: [], technicians: [], clients: [], plants: [], summary: { orders: 0, technicians: 0, assignments: 0, conflicts: 0 }, scope: { type: "all" } };

function sameLocalDay(value, selectedDate) {
  const date = new Date(value);
  return date.getFullYear() === selectedDate.getFullYear() && date.getMonth() === selectedDate.getMonth() && date.getDate() === selectedDate.getDate();
}

function formatTime(value) {
  return new Intl.DateTimeFormat("es-VE", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

function formatLongDate(value) {
  return new Intl.DateTimeFormat("es-VE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(value);
}

function Kpi({ icon: Icon, label, value, danger = false }) {
  return (
    <Card><CardContent className="flex items-center gap-3 p-4">
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", danger ? "bg-red-500/10 text-red-600" : "bg-blue-500/10 text-blue-600")}><Icon className="h-5 w-5" /></span>
      <div><p className="text-xs text-muted">{label}</p><p className={cn("text-xl font-bold", danger ? "text-red-600" : "text-foreground")}>{value}</p></div>
    </CardContent></Card>
  );
}

export function TechnicianCalendar() {
  const router = useRouter();
  const calendarRef = useRef(null);
  const [range, setRange] = useState(null);
  const [filters, setFilters] = useState({ technicianId: "", status: "", priority: "", serviceType: "", clientId: "", plantId: "" });
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  const load = useCallback(async () => {
    if (!range) return;
    try {
      setLoading(true);
      setError("");
      const response = await getTechnicianCalendar({ from: range.start, to: range.end, ...filters });
      setData(response);
      if (response.scope?.type === "own") {
        setFilters((current) => current.technicianId === response.scope.technicianId ? current : { ...current, technicianId: response.scope.technicianId });
      }
    } catch (requestError) {
      setError(getPublicError(requestError, "No se pudo cargar el calendario."));
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
    }
  }, [filters, range]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el rango visible con la API
  useEffect(() => { load(); }, [load]);

  const calendarEvents = useMemo(() => data.events.map((event) => {
    return {
      id: event.id,
      title: `${event.order_code} · ${SERVICE_LABELS[event.service_type] || event.service_type}`,
      start: event.start_at,
      end: event.end_at,
      ...getFullCalendarEventStyle(event.status, event.has_conflict),
      extendedProps: event,
    };
  }), [data.events]);

  const dayAgenda = useMemo(() => data.events.filter((event) => sameLocalDay(event.start_at, selectedDate)).toSorted((a, b) => new Date(a.start_at) - new Date(b.start_at)), [data.events, selectedDate]);
  const availablePlants = useMemo(() => data.plants.filter((plant) => !filters.clientId || plant.clientId === filters.clientId), [data.plants, filters.clientId]);

  const setFilter = (key) => (event) => {
    const value = event.target.value;
    setFilters((current) => ({ ...current, [key]: value, ...(key === "clientId" ? { plantId: "" } : {}) }));
  };

  const handleDatesSet = useCallback((info) => {
    setRange((current) => current?.start === info.startStr && current?.end === info.endStr ? current : { start: info.startStr, end: info.endStr });
  }, []);

  const handleWindowResize = useCallback((info) => {
    const api = calendarRef.current?.getApi();
    if (api && info.view.containerEl.clientWidth < 720 && api.view.type !== "listWeek") api.changeView("listWeek");
  }, []);

  return (
    <div className="space-y-4">
      <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Select label="Técnico" value={filters.technicianId} onChange={setFilter("technicianId")} disabled={data.scope?.type === "own"}>
          {data.scope?.type !== "own" && <option value="">Todos los técnicos</option>}
          {data.technicians.map((item) => <option key={item.id} value={item.id}>{item.name}{item.status !== "Activo" ? " (Inactivo)" : ""}</option>)}
        </Select>
        <Select label="Estado" value={filters.status} onChange={setFilter("status")}><option value="">Todos los estados</option><option value="Aprobada">Programadas</option><option value="En Proceso">En ejecución</option><option value="Completada">Completadas</option></Select>
        <Select label="Prioridad" value={filters.priority} onChange={setFilter("priority")}><option value="">Todas</option><option>Alta</option><option>Media</option><option>Baja</option></Select>
        <Select label="Servicio" value={filters.serviceType} onChange={setFilter("serviceType")}><option value="">Todos</option><option value="Inspection">Revisión</option><option value="Maintenance">Mantenimiento</option><option value="Emergency">Emergencia</option><option value="Other">Otro</option></Select>
        <Select label="Cliente" value={filters.clientId} onChange={setFilter("clientId")}><option value="">Todos</option>{data.clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
        <Select label="Planta" value={filters.plantId} onChange={setFilter("plantId")}><option value="">Todas</option>{availablePlants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
      </CardContent></Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={HardHat} label="Técnicos programados" value={data.summary.technicians} />
        <Kpi icon={CalendarCheck2} label="Órdenes en el período" value={data.summary.orders} />
        <Kpi icon={Wrench} label="Asignaciones" value={data.summary.assignments} />
        <Kpi icon={AlertTriangle} label="Asignaciones con conflicto" value={data.summary.conflicts} danger={data.summary.conflicts > 0} />
      </div>

      {error && <Card className="border-red-500/30"><CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center"><p className="text-sm text-red-600">{error}</p><Button variant="secondary" size="sm" icon={RefreshCw} onClick={load}>Reintentar</Button></CardContent></Card>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 overflow-hidden"><CardContent className="relative p-3 sm:p-5">
          {loading && <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface/70 backdrop-blur-[1px]"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>}
          <div className="mq-technician-calendar min-h-[650px]">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, classicThemePlugin]}
              themeSystem="classic" locale={esLocale} initialView="timeGridWeek"
              headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek" }}
              buttonText={{ today: "Hoy", month: "Mes", week: "Semana", day: "Día", list: "Agenda" }}
              allDaySlot={false} slotMinTime="06:00:00" slotMaxTime="20:00:00" slotDuration="00:30:00"
              nowIndicator navLinks editable={false} selectable={false} eventStartEditable={false} eventDurationEditable={false}
              height="auto" events={calendarEvents} datesSet={handleDatesSet}
              dateClick={(info) => setSelectedDate(info.date)}
              eventClick={(info) => { setSelectedEvent(info.event.extendedProps); setSelectedDate(info.event.start); }}
              windowResize={handleWindowResize}
              eventContent={(info) => {
                const presentation = getCalendarOrderStatus(info.event.extendedProps.status);
                return <div className="overflow-hidden px-0.5 py-0.5"><p className="truncate text-[9px] font-bold uppercase tracking-wide opacity-90">{presentation.label}</p><p className="truncate text-[11px] font-bold">{info.event.title}</p><p className="truncate text-[10px] opacity-90">{info.event.extendedProps.technician_name}</p><p className="truncate text-[10px] opacity-90">{info.event.extendedProps.client_name} · {info.event.extendedProps.plant_name}</p></div>;
              }}
            />
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3">
              {Object.entries(CALENDAR_ORDER_STATUS).map(([status, presentation]) => (
                <span key={status} className="inline-flex items-center gap-2 text-xs text-muted">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: presentation.backgroundColor }} />
                  {presentation.label}{status === "Aprobada" ? " · Pendiente de iniciar" : ""}
                </span>
              ))}
              <span className="inline-flex items-center gap-2 text-xs text-muted"><span className="h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-red-500/20" />Conflicto de horario</span>
            </div>
          </div>
        </CardContent></Card>

        <Card className="h-fit xl:sticky xl:top-4"><CardContent className="space-y-4 p-4">
          <div><p className="text-base font-semibold text-foreground">Agenda del día</p><p className="mt-1 text-xs capitalize text-muted">{formatLongDate(selectedDate)}</p></div>
          {selectedEvent && <div className="space-y-3 rounded-xl border border-blue-500/30 bg-blue-500/5 p-3">
            <div className="flex items-start justify-between gap-2"><div><p className="font-bold text-foreground">{selectedEvent.order_code}</p><p className="text-xs text-muted">PAR {selectedEvent.par_number}</p></div><Badge variant={getCalendarOrderStatus(selectedEvent.status).badgeVariant} dot>{getCalendarOrderStatus(selectedEvent.status).label}</Badge></div>
            <p className="flex items-center gap-2 text-xs text-foreground"><Clock3 className="h-3.5 w-3.5 text-blue-500" />{formatTime(selectedEvent.start_at)} – {formatTime(selectedEvent.end_at)}</p>
            <p className="flex items-center gap-2 text-xs text-foreground"><HardHat className="h-3.5 w-3.5 text-blue-500" />{selectedEvent.technician_name}</p>
            <p className="flex items-center gap-2 text-xs text-foreground"><MapPin className="h-3.5 w-3.5 text-blue-500" />{selectedEvent.client_name} · {selectedEvent.plant_name}</p>
            <p className="text-xs text-muted">{SERVICE_LABELS[selectedEvent.service_type]} {WORK_LABELS[selectedEvent.work_type]?.toLowerCase()}</p>
            {selectedEvent.has_conflict && <p className="flex items-center gap-2 rounded-lg bg-red-500/10 px-2 py-1.5 text-xs font-medium text-red-600"><AlertTriangle className="h-3.5 w-3.5" />Conflicto de horario</p>}
            <Button size="sm" className="w-full" onClick={() => router.push(`/ordenes/${selectedEvent.service_order_id}`)}>Ver orden</Button>
          </div>}
          <div className="space-y-2">
            {dayAgenda.map((event) => <button key={event.id} type="button" onClick={() => setSelectedEvent(event)} className="w-full rounded-xl border border-border p-3 text-left transition-colors hover:border-blue-500/40 hover:bg-blue-500/5"><div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-xs font-bold text-foreground"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: getCalendarOrderStatus(event.status).backgroundColor }} />{event.order_code}</span><span className="text-[11px] text-muted">{formatTime(event.start_at)}–{formatTime(event.end_at)}</span></div><p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{getCalendarOrderStatus(event.status).label}</p><p className="mt-1 truncate text-xs text-foreground">{event.technician_name}</p><p className="truncate text-[11px] text-muted">{event.client_name} · {event.plant_name}</p></button>)}
            {!dayAgenda.length && !loading && <EmptyState icon={CalendarCheck2} title="Sin órdenes programadas" description="No hay órdenes aprobadas para este día." />}
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}
