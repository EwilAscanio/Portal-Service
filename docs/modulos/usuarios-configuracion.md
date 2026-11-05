# Usuarios, roles y configuración

> Vigente · revisión estática: 22 de octubre de 2026. [Índice](../README.md)

## Usuarios y acceso

Fuentes: `auth.js`, `lib/permissions.js`, `lib/repositories/user.repository.js`, `lib/validators/user.schema.js`, `app/api/user/`, `app/api/roles/route.js`, `scripts/assign-super-administrator.mjs`.

| Etapa | Actor / condición | Persistencia y consecuencia |
|---|---|---|
| Crear | Administrador o Superadministrador; datos válidos | Usuario, hash de contraseña, rol y estado |
| Cambiar datos/rol | Autorización y validadores | Afecta accesos en revalidación de sesión |
| Inactivar/reactivar | Restricciones de gestión de usuarios | Inactivo no inicia sesión ni conserva permisos al revalidar |
| Iniciar sesión | Credentials, contraseña válida y estado Activo | JWT con identidad, rol y estado; último acceso actualizado sin bloquear login |
| Revalidar | Callback posterior de JWT | Consulta usuario; si no existe, está inactivo o falla lectura, elimina rol y marca inactivo |
| Cerrar sesión | Flujo de autenticación | Finaliza sesión del navegador |

El identificador de usuario es UUID y el de rol es numérico. Los validadores de usuario se usan en las APIs; no son esquemas descartados.

Administrador no puede asignar Superadministrador; el catálogo de roles y la gestión aplican restricciones. Se protege la existencia del último Superadministrador activo. El script de concesión es una operación administrativa explícita, no parte del inicio de sesión ni de la instalación automática.

La sesión revalida rol/estado; eso no convierte todos los demás campos de perfil en datos actualizados en tiempo real. No enviar hashes ni credenciales al cliente.

La matriz de rutas y permisos por acción tiene su ubicación principal en [seguridad](../arquitectura/seguridad-permisos.md).

## Configuración de empresa

Fuentes: `lib/repositories/configuration.repository.js`, `app/api/configuration/`, `app/(dashboard)/configuracion/page.jsx`, `db/schema.sql`.

Flujo: consultar registro único → editar datos de empresa/tasa → validar → actualizar → consumidores leen o copian según su uso.

`configuration` es un singleton (id 1), protegido contra eliminación. No tiene aprobación ni historial de versiones automático.

| Dato | Consumidor | Comportamiento |
|---|---|---|
| Tasa de cambio | Nuevo PAR / preparación del documento | Se copia a la cabecera; cambios globales no revalorizan PAR anteriores |
| Identidad y contacto de empresa | Encabezados de documentos y reportes | Lectura de configuración al generar |
| Logo configurado | Consumidores que lo usan | No asumir que todos usan esa ruta |
| Logo de reportes PDF | public/Logo.png | Ruta local fija; PDF no descarga logo configurable remoto |

La ventana y API general de configuración admiten Supervisor y Superadministrador. La API específica de lectura de tasa admite además Administrador y Coordinador. No extender por esa excepción el permiso de edición de toda la configuración.

La misma ventana sincroniza países, estados, ciudades y vendedores desde Saint. Sincronizar vendedores llama a `POST /api/vendor/sync` y lo pueden ejecutar Administrador, Supervisor y Superadministrador. El catálogo resultante se consulta en [vendedores](dashboard-busqueda-perfil.md#vendedores).

## Dependencias y límites

Roles alimentan navegación, proxy, acciones de aprobación/cierre y agenda propia. Usuarios también identifican autores, aprobadores y eventos. El técnico vinculado es otra entidad; no igualar usuario y técnico por nombre.

Configuración afecta representación y nuevos valores copiados. Modificarla no ejecuta un proceso comercial sobre órdenes. Los formularios de perfil tienen implementación parcial descrita en [módulos de apoyo](dashboard-busqueda-perfil.md).
