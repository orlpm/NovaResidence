# Arquitectura de NovaResidence

## Contexto

NovaResidence es un monolito modular. Un App Service de Windows con .NET 8 hospeda la API y el SPA. El navegador habla solo con `/api`. No hay API Gateway, ni bus, ni almacenamiento de objetos en el entorno actual: Blob Storage, Service Bus, Key Vault y Application Insights están previstos en configuración y vacíos.

```
Navegador
    |
    |  HTTPS, JWT
    v
App Service novaresidence-api
    |-- wwwroot          SPA de Vite
    |-- /api             ASP.NET Core
    |-- /uploads         archivos locales
    |
    +-- SQLite           local: data/novaresidence.dev.db
                         Azure: D:\home\data\novaresidence.db
```

El frontend de producción se compila con `VITE_API_URL` apuntando al mismo host. En desarrollo, Vite corre aparte y la API escucha en `http://localhost:5001`.

## Capas

La dependencia apunta hacia el dominio.

| Proyecto | Responsabilidad |
| --- | --- |
| `NovaResidence.Domain` | Entidades, enums, objetos de valor. Sin EF ni HTTP. |
| `NovaResidence.Application` | Casos de uso CQRS con MediatR, validadores, contratos. |
| `NovaResidence.Infrastructure` | EF Core, JWT, correo, OpenPay, permisos, notificador, seeders. |
| `NovaResidence.Api` | Controladores, tenant access, arranque, archivos estáticos. |
| `NovaResidence.Shared` | `ApiResponse` y modelos compartidos. |
| `src/Frontend/web` | React 18, TypeScript, Vite, Tailwind, Zustand, Axios. |

Hay dos estilos de escritura conviviendo. Facturación, comunicaciones, incidencias y condominios pasan por comandos MediatR. Paquetería, cajones, rondas, documentos, citas de proveedor y reservaciones de área escriben el `DbContext` desde el controlador. Un cambio nuevo debe seguir el estilo del módulo que toca, no mezclar los dos en el mismo flujo.

`IApplicationDbContext` es el contrato que ven los handlers. Los controladores nuevos reciben `ApplicationDbContext` y `ITenantAccessService`.

## Tenencia y acceso

El agregado de tenencia es el condominio. El usuario puede tener varios `UserCondominiumRole`. El rol de plataforma (`DefaultRole`) y el rol dentro del condominio no son lo mismo.

`ITenantAccessService` autoriza el dato, no solo el rol del token. Antes de leer o escribir, el controlador pregunta si el llamador puede ver ese condominio, esa unidad, ese usuario o esa visita. Un residente entra por su fila en `Residents` cuando no tiene rol de condominio. Un administrador entra por `CondominiumRoles`.

El token lleva `userId`, correo y un rol colapsado:

| DefaultRole | Claim de rol |
| --- | --- |
| superadmin | superadmin |
| admin, condominiumadmin, subadmin | admin |
| securityguard | security |
| maintenance, cleaning | maintenance |
| accountant | accountant |
| serviceprovider, provider | provider |
| resto | resident |

Ese colapso importa. Un `[Authorize(Roles = "security")]` no acepta la cadena `SecurityGuard`. Limpieza y mantenimiento comparten el claim `maintenance`; la pantalla se distingue por la ruta a la que los manda el cliente.

Los permisos finos son otra capa. `PermissionService` resuelve en este orden: permiso directo del usuario, override del condominio, permiso base del rol. El caché es por usuario. `PermissionRoute` en el cliente niega la pantalla si el código no está en esa lista. Por eso una pantalla nueva no debe inventar un código de permiso sin sembrarlo.

Cuando el condominio del token viene vacío y el usuario tiene exactamente un rol de condominio, el servicio usa ese rol. Si no, interpreta `DefaultRole`. El defecto anterior, tratarlo como Owner, mandaba a vigilancia a Acceso Denegado.

## Arranque y esquema

Al iniciar:

1. Si `UseSqlite` es true, crea el directorio del archivo, ejecuta `EnsureCreated` y luego `SqliteSchemaPatch`.
2. Si es false, aplica `Database.Migrate()`.
3. Siembra catálogo geográfico, permisos, permisos por rol, planes y plantillas de trámites.
4. Si el entorno es Development o `Demo:SeedOnStartup` es true, corre `DemoScenarioSeeder`.

`EnsureCreated` no modifica una base que ya existe. Las tablas operativas agregadas después del primer arranque solo aparecen porque el parche ejecuta `CREATE TABLE IF NOT EXISTS`. La columna `Payments.ReceiptNumber` se agrega con `ALTER TABLE` y se ignora el error si ya existe. En SQL Server esas tablas no están en una migración. Cambiar de motor exige generar esa migración antes de apagar SQLite.

SQLite ignora el esquema lógico (`condo`, `auth`) que algunas configuraciones de EF declaran. El nombre físico es el de la tabla, sin prefijo. Los Guid se persisten como texto en mayúsculas.

## Módulos y dueños de datos

| Módulo | Escritura principal | Lectura de negocio |
| --- | --- | --- |
| Identidad | `AuthController`, registros públicos y de personal | JWT, roles, confirmación de correo |
| Condominio | condominios, edificios, unidades, residentes | árbol Torre → Unidad → Residente |
| Suscripción de plataforma | `SubscriptionsController` | plan del administrador, acceso al panel |
| Cuotas del condominio | `BillingController`, `FinesController` | estado de cuenta del residente |
| Incidencias | comandos de incidencias | paneles de mantenimiento, limpieza y proveedor |
| Visitas | `VisitsController` | control de acceso, pase QR (`access-pass`, `access/scan`, `access/check-in`, `access/check-out`) y bitácora de caseta |
| Comunicaciones | comandos de avisos, encuestas, asambleas, foro | pantallas de admin y residente |
| Áreas y mapas | `CommonAreasController`, `CondominiumMapsController`, `AreaReservationsController` | catálogo, plano, reservación |
| Operación de campo | `CommunityOperationsController`, `DocumentsController`, `ProviderAppointmentsController` | paquetería, cajones, rondas, documentos, agenda |
| Avisos in-app | `OperationalNotifier` y facturación | campana |

## Notificaciones

`Notification` no hereda `BaseEntity`. La crea `IOperationalNotifier` o el comando de facturación. Tres alcances:

- `NotifyUsersAsync`: usuarios concretos.
- `NotifyRoleAsync`: miembros con ese `UserRole` en el condominio.
- `NotifyResidentsAsync`: residentes activos del condominio que ya tienen `UserId`.

No hay un tipo de notificación para visitas. La visita usa `General`. Encuesta, asamblea, incidencia, reservación y multa usan los tipos ya existentes. El título es estable porque las pruebas lo buscan: «Nueva visita», «Nueva encuesta», «Invitación a asamblea», «Incidencia asignada», «Paquete recibido», «Nueva multa», «Tu visita llegó».

La campana no recibe siempre el condominio. Lo resuelve con la propiedad, con el usuario o consultando sus condominios. Si no lo resuelve, el menú dice que las notificaciones no están disponibles.

## Archivos

Mapas, comprobantes de pago y documentos del condominio se guardan bajo `ContentRootPath/uploads` y se publican en `/uploads`. No pasan por Blob Storage. Un deploy que reemplace el contenido del sitio no garantiza conservar esa carpeta si el almacenamiento no está fuera de `wwwroot`.

## Integraciones apagadas

El correo sale por Brevo, REST si la clave empieza con `xkeysib-` y SMTP si empieza con `xsmtpsib-`. `DisableSending` corta `SendEmailAsync` antes de la red. Los registros públicos siguen sin confirmar hasta que un proceso de prueba confirme la fila en SQLite. El personal creado por un administrador autenticado queda confirmado.

OpenPay está deshabilitado en la configuración de producción del repositorio y, cuando se enciende, solo acepta un token y un `deviceSessionId` producidos en el navegador. Un token falso responde 400. El backend no recibe el PAN.

## Despliegue

El artefacto es un zip del `dotnet publish` más el `dist` de Vite dentro de `wwwroot`. `UseDefaultFiles`, `UseStaticFiles` y el fallback a `index.html` hacen que el mismo host sirva la aplicación. La cadena de conexión de Azure apunta a `D:\home\data\novaresidence.db`, fuera de `wwwroot`, para que un zip no borre la base. La cadena escrita en `appsettings.Production.json` apunta a `wwwroot\data`; la variable del App Service debe seguir ganando.

El plan actual es F1. No escala, se suspende por inactividad y el techo de CPU vuelve inútiles las suites largas.

## Frontera de producción

Lista para un piloto de producto. No lista como sistema de registro de un condominio. La deuda que bloquea esa frontera es de plataforma, no de pantallas: motor de base de datos con migraciones y respaldos, plan con más de una instancia, secreto JWT fuera del repositorio, seed demo apagado, y telemetría. El detalle de procesos que ya cubre el piloto está en [BUSINESS-PROCESSES.md](BUSINESS-PROCESSES.md).
