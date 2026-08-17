import Link from "next/link";
import { Cog, ArrowLeft } from "lucide-react";

export const metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25">
        <Cog className="h-8 w-8 text-white" />
      </div>
      <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
        Error 404
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Página no encontrada
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        La ruta que buscas no existe o fue movida. Verifica la dirección o
        regresa al panel principal.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al Dashboard
      </Link>
    </main>
  );
}
