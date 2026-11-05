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
    +-- Postgres         Neon, la misma base en local y en Azure
                         cadena pooled para la app
```

El frontend de producción se compila con `VITE_API_URL` apuntando al mismo host. En desarrollo, Vite corre aparte y la API escucha en `http://localhost:5001`. Qué hace cada servicio está en [SERVICIOS-Y-PROCESOS.md](SERVICIOS-Y-PROCESOS.md).

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

1. Si hay `ConnectionStrings:Postgres` o `ConnectionStrings:Neon`, usa Npgsql. Una URI `postgresql://` se convierte a claves (`Host`, `Username`, `Password`, `Database`, `SSL Mode`) porque el proveedor de EF no acepta la URI. `Npgsql.EnableLegacyTimestampBehavior` queda activo para aceptar `DateTime` sin zona. La app usa la cadena pooled, con reintentos.
2. Si esa base no tiene `auth."Users"`, crea las tablas del modelo. No usa `EnsureCreated`: una base Neon puede traer tablas de Neon Auth y EF creería que el esquema ya existe. No usa `Database.Migrate()`: las migraciones del repositorio son de SQL Server.
3. Luego aplica `PostgresSchemaPatch`. Cada cambio tiene un id. La tabla `SchemaPatches` guarda los ya aplicados y no los repite. `001_payments_receipt_and_visit_access_code` agrega el folio de recibo y el código QR de la visita. `002_parking_resident_and_visit_vehicle` agrega `UnitId` y `ResidentId` en `ParkingSpots`, `ResidentId` en `ResidentVehicles` y `ResidentVehicleId` en `Visits`.
4. Si no hay cadena de Postgres y `UseSqlite` es true, crea el directorio del archivo, ejecuta `EnsureCreated` y luego `SqliteSchemaPatch`.
5. Si tampoco hay SQLite, aplica `Database.Migrate()` sobre SQL Server.
6. Siembra catálogo geográfico, permisos, permisos por rol, planes y plantillas de trámites.
7. Si el entorno es Development o `Demo:SeedOnStartup` es true, corre `DemoScenarioSeeder`.

En Postgres los esquemas `auth`, `condo`, `catalog`, `ops` y `billing` sí existen. Los Guid son `uuid`. Los filtros de índice usan comillas dobles, no corchetes de SQL Server. SQLite sigue ignorando el esquema lógico y guarda los Guid como texto en mayúsculas.

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

Mapas, fotos de áreas comunes, adjuntos de avisos y publicaciones del foro, incidencias, comprobantes de pago y suscripción, y documentos del condominio se guardan bajo `ContentRootPath/uploads` y se publican en `/uploads`, con límite de 8 MB por archivo. Cuando un mapa usa un enlace de Google Maps en lugar de una imagen subida, el cliente muestra el iframe de vista previa y resuelve enlaces cortos con `/api/condominiummaps/resolve-link` restringido a dominios de Google. No pasan por Blob Storage. Un deploy que reemplace el contenido del sitio no garantiza conservar esa carpeta si el almacenamiento no está fuera de `wwwroot`.

## Correo y pagos

En Azure el correo sale por Brevo, desde `contacto@domuscond.com`. En local `DisableSending` corta el envío y `CaptureOutbox` guarda el mensaje para las pruebas. REST si la clave empieza con `xkeysib-` y SMTP si empieza con `xsmtpsib-`. Los registros públicos siguen sin confirmar hasta abrir el enlace. El personal creado por un administrador autenticado queda confirmado.

OpenPay cobra la suscripción de la plataforma en sandbox. Las llaves están vacías en el repositorio: local las lee de user-secrets y Azure de App Settings, con `UseSandbox` en true. El cargo solo acepta un token y un `deviceSessionId` producidos en el navegador. Un token falso responde 400. El backend no recibe el PAN.

## Despliegue

El artefacto es un zip del `dotnet publish` más el `dist` de Vite dentro de `wwwroot`. `UseDefaultFiles`, `UseStaticFiles` y el fallback a `index.html` hacen que el mismo host sirva la aplicación. Desde el 4 nov 2026 el sitio usa Neon por `ConnectionStrings__Neon`. `UseSqlite` sigue en true en App Settings, pero la cadena de Postgres gana. El archivo `D:\home\data\novaresidence.db` ya no lo lee este código.

El plan actual es F1. No escala, se suspende por inactividad y el techo de CPU vuelve inútiles las suites largas.

## Frontera de producción

Lista para un piloto de producto. No lista como sistema de registro de un condominio. La deuda que bloquea esa frontera es de plataforma, no de pantallas: local y Azure comparten la misma Neon, el plan F1 se duerme, el seed demo sigue encendido y no hay telemetría. La clave JWT ya está fuera del repositorio. Los cambios de columnas de Postgres quedan en `PostgresSchemaPatch`, no en las migraciones de SQL Server. Qué hace cada servicio está en [SERVICIOS-Y-PROCESOS.md](SERVICIOS-Y-PROCESOS.md). Las reglas están en [BUSINESS-PROCESSES.md](BUSINESS-PROCESSES.md).
