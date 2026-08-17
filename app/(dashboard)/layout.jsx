"use client";

import { AuthGuard } from "@/components/layout/AuthGuard";
import { Sidebar, SidebarProvider } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

/**
 * Layout del área administrativa (grupo de rutas protegidas).
 * Estructura: Sidebar | Topbar + contenido.
 */
export default function DashboardLayout({ children }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:px-0 print:py-0">
              <div className="mx-auto w-full max-w-[1440px] print:max-w-none">{children}</div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
