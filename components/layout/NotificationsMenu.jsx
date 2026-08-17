"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Building2,
  CheckCheck,
  ClipboardList,
  Cog,
  Info,
  Wallet,
} from "lucide-react";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/Dropdown";
import { Tooltip } from "@/components/ui/Tooltip";
import { Badge } from "@/components/ui/Badge";
import { notify } from "@/lib/toast";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { cn } from "@/utils/cn";

const TYPE_CONFIG = {
  order: { icon: ClipboardList, classes: "bg-blue-500/10 text-blue-500" },
  equipment: { icon: Cog, classes: "bg-orange-500/10 text-orange-500" },
  billing: { icon: Wallet, classes: "bg-emerald-500/10 text-emerald-500" },
  client: { icon: Building2, classes: "bg-violet-500/10 text-violet-500" },
  system: { icon: Info, classes: "bg-slate-500/10 text-slate-500 dark:text-slate-400" },
};

/** Menú de notificaciones del topbar */
export function NotificationsMenu() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const data = await getNotifications();
        if (mountedRef.current) {
          setItems(data.notifications ?? []);
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch {
        // Silenciar error
      }
    }
    load();
  }, []);

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
      notify.success("Notificaciones al día", {
        description: "Marcaste todas las notificaciones como leídas.",
      });
    } catch {
      // Silenciar error
    }
  };

  const markAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silenciar error
    }
  };

  return (
    <Dropdown>
      <Tooltip label="Notificaciones" side="bottom">
        <DropdownTrigger
          ariaLabel="Abrir notificaciones"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
            </span>
          )}
        </DropdownTrigger>
      </Tooltip>

      <DropdownContent className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Notificaciones</p>
            {unreadCount > 0 && <Badge variant="brand">{unreadCount} nuevas</Badge>}
          </div>
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-500/10 dark:text-blue-400"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar leídas
          </button>
        </div>

        <ul className="max-h-[22rem] space-y-0.5 overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted">
              No hay notificaciones por mostrar.
            </li>
          ) : (
            items.map((item) => {
              const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.system;
              const Icon = config.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => markAsRead(item.id)}
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        config.classes
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {item.title}
                        </span>
                        {!item.read && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">
                        {item.description}
                      </span>
                      <span className="mt-1 block text-[11px] font-medium text-muted/70">
                        {timeAgo(item.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </DropdownContent>
    </Dropdown>
  );
}
