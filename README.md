# Maquitech — Portal de servicios

Portal interno para servicios industriales. **PAR y Órdenes de Servicio son sus documentos centrales**: el PAR define alcance y presupuesto; la O/S programa técnicos, registra ejecución y reúne el expediente de cierre.

## Documentación

- [AI_CONTEXT.md](AI_CONTEXT.md): contexto para IA y nuevos colaboradores.
- [APP_DEPENDENCIES.md](APP_DEPENDENCIES.md): relaciones e impacto entre módulos.
- [Índice de documentación](docs/README.md): flujo, módulos, datos, permisos y operación.
- [Flujo del negocio](docs/negocio/flujo-general.md): recorrido completo PAR → O/S → cierre.
- [Guía de operación](docs/operacion/despliegue-respaldo-migraciones.md): instalación, migraciones y respaldo conjunto.

Antes de modificar el proyecto, leer [AGENTS.md](AGENTS.md) y las guías del área.

## Stack y desarrollo

Next.js App Router, React, JavaScript, PostgreSQL mediante pg y NextAuth Credentials/JWT. UI compartida con Tailwind; agenda FullCalendar, importación ExcelJS y PDFs con @react-pdf/renderer. Versiones en package.json y package-lock.json.

Requisitos: Node compatible con el Next instalado y PostgreSQL disponible.

```powershell
npm ci
npm run dev
```

Preparar .env.local a partir de .env.example: conexión de base, AUTH_SECRET y, cuando corresponda, integración Saint y carpeta privada de documentos. No publicar valores.

Base nueva usa db/schema.sql; una base existente requiere revisar/aplicar migraciones pendientes individualmente. Leer la guía operativa antes de ejecutar SQL.

## Comandos

| Comando | Uso |
|---|---|
| npm run dev | Desarrollo |
| npm run build / npm start | Construcción y servicio de producción |
| npm run lint | ESLint |
| npm test / npm run test:coverage | Comprobaciones existentes / cobertura |
| npm run verify | Pruebas + lint + build |
| npm run db:migrate -- nombre.sql | Una migración explícita; sin argumento usa 031 |
| npm run db:validate | Validación de base mediante script |
| npm run db:test-schema | Comprobación del esquema en transacción temporal |

La lista describe herramientas disponibles; no implica que se ejecutaron ni certifica sus resultados actuales.

## Estructura

```text
app/                   pantallas y Route Handlers
components/            UI compartida y módulos
hooks/                 lógica de interacción
lib/api.js             contrato frontend/API
lib/validators/        esquemas Zod
lib/repositories/      SQL parametrizado y transacciones
auth.js / proxy.js     sesión y protección de acceso
db/                    esquema, migraciones y validación
scripts/ / spec/       operación y comprobaciones
docs/                  documentación organizada
```

## Reglas centrales

- O/S pertenece a un PAR aprobado; un PAR admite varias órdenes.
- PAR aprobado solo se edita por Superadministrador, Administrador o Supervisor y sin O/S no canceladas.
- Las horas de mano de obra proceden de cantidades PAR, se reparten en O/S y se confirman al cerrar.
- Los documentos de cierre se guardan por equipo en almacenamiento privado.
- Los reportes los generan usuarios del sistema y permiten vista previa/descarga PDF.
- Clientes y vendedores Saint usan estados '1'/'0'; otros catálogos tienen sus estados propios. El vendedor se consulta y no se edita en el portal.
- Rutas desconocidas se deniegan; la matriz completa está en [seguridad](docs/arquitectura/seguridad-permisos.md).

Revisión documental: 22 de octubre de 2026. [Límites observados](docs/pendientes-documentados.md) y [archivo histórico](docs/historico/README.md).
