"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/Dropdown";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { notify } from "@/lib/toast";

/** Menú del usuario autenticado (perfil, configuración, salir) */
export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();


  const handleLogout = async () => {
    await logout();
    notify.success("Sesión cerrada", {
      description: "Has salido del panel de forma segura.",
    });
    router.replace("/login");
  };

  return (
    <Dropdown>
      <DropdownTrigger
        ariaLabel="Menú de usuario"
        className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-surface-2"
      >
        <Avatar name={user?.name ?? "Usuario"} size="sm" status="online" />
        <span className="hidden text-left xl:block">
          <span className="block max-w-36 truncate text-sm font-semibold leading-tight text-foreground">
            {user?.name}
          </span>
          <span className="block text-xs leading-tight text-muted">{user?.role}</span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-muted xl:block" />
      </DropdownTrigger>

      <DropdownContent className="w-60">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Avatar name={user?.name ?? "Usuario"} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {user?.name}
            </p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
        </div>
        <DropdownSeparator />
        <DropdownItem icon={User} onClick={() => router.push("/perfil")}>
          Mi Perfil
        </DropdownItem>
        <DropdownItem icon={Settings} onClick={() => router.push("/configuracion")}>
          Configuración
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem icon={LogOut} danger onClick={handleLogout}>
          Cerrar Sesión
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
