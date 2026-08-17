import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: {
    default: "Maquitech | Panel Administrativo",
    template: "%s | Maquitech",
  },
  description:
    "Plataforma de gestión industrial de Maquitech: órdenes de servicio, clientes, equipos, técnicos y reportes en un solo lugar.",
};

/**
 * Evita el "flash" de tema incorrecto (FOUC):
 * se ejecuta antes del primer paint y sincroniza la clase `dark`
 * con la preferencia guardada en localStorage.
 */
const themeScript = `(function(){try{var t=localStorage.getItem('mq-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4200,
              style: {
                background: "var(--color-surface)",
                color: "var(--color-foreground)",
                border: "1px solid var(--color-border)",
                borderRadius: "0.75rem",
                fontSize: "0.875rem",
                padding: "12px 16px",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
