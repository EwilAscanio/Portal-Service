"use client";

import { Users } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";

export default function VendedoresPage() {
  usePageTitle("Vendedores");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendedores"
        description="Gestión del equipo comercial de la organización."
      />
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Próximamente</h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Este módulo está en desarrollo. Aquí podrás gestionar el equipo
            comercial de la organización.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
