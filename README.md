# Maquitech — Panel administrativo

Panel administrativo para la gestión industrial de Maquitech, construido con Next.js App Router, React, PostgreSQL y NextAuth.

## Stack

- Next.js 16.3.4 y React 19.
- JavaScript, sin TypeScript.
- PostgreSQL mediante `pg` y repositorios parametrizados.
- NextAuth v5 con JWT y Credentials.
- Tailwind CSS 4, Framer Motion, Recharts y Lucide.

## Desarrollo

Requisitos: Node.js compatible con Next.js 16 y PostgreSQL disponible para las APIs.

```bash
npm install
npm run dev
```

Copia `.env.example` a `.env.local` y define `AUTH_SECRET`, `DATABASE_URL` (o las variables `DB_*`) y la configuración de Saint si usarás la sincronización.

## Scripts

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Servir el build |
| `npm run lint` | ESLint |
| `npm test` | Pruebas de permisos, regresión, PAR, validadores y migraciones |
| `npm run test:coverage` | Cobertura nativa de Node |
| `npm run verify` | Pruebas + lint + build |
| `npm run db:migrate` | Aplicar migraciones mediante el runner del proyecto |
| `npm run db:test-schema` | Probar `db/schema.sql` en un esquema temporal con rollback |

## Estructura

```text
app/                 rutas App Router y Route Handlers
components/ui/       sistema visual compartido
components/par/      componentes PAR
components/par/sections/  secciones visuales PAR
components/par/modals/    modales PAR
hooks/par/            hooks específicos de PAR
lib/api.js            contrato frontend ↔ API
lib/repositories/     acceso parametrizado a PostgreSQL
lib/validators/       esquemas Zod
lib/par/              constantes y mapeos de dominio PAR
lib/ui-errors.js      mensajes públicos de errores HTTP
proxy.js              autenticación y RBAC
db/schema.sql         esquema consolidado para instalaciones nuevas
db/migrations/        migraciones incrementales; 031 es idempotente
spec/                 pruebas automatizadas
```

## Seguridad y reglas principales

- La autorización se deniega por defecto y se aplica en `proxy.js` y `lib/permissions.js`.
- Configuración está restringida al rol Supervisor.
- Solo Administrador y Supervisor pueden aprobar o rechazar PAR.
- Las órdenes solo pueden vincularse a PAR con estado `Aprobado`.
- Los clientes provienen de Saint y sus estados persistidos son `'1'` y `'0'`.
- `schema_migrations` solo registra migraciones; no es una dependencia funcional del runtime.

Consulta [AI_CONTEXT.md](AI_CONTEXT.md) y [APP_DEPENDENCIES.md](APP_DEPENDENCIES.md) antes de modificar autenticación, permisos, PAR, SQL o contratos de API.

## Reportes PDF

Reportes de PAR por cliente y horas estimadas/reales por técnico de órdenes cerradas, con filtros, vista previa y descarga. Requiere las migraciones 051/052. Consulta [la guía de reportes](docs/reportes.md) para uso, permisos y despliegue.
