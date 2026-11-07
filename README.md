# DomusCond

SaaS de administración de condominios. La marca y el correo público son DomusCond (`contacto@domuscond.com`). El repositorio, los proyectos de código y la app de Azure siguen llamándose NovaResidence. Un App Service sirve la API y la aplicación web. El piloto cubre la operación diaria del edificio y la suscripción de la plataforma. No es todavía un sistema de producción para un condominio real.

El mapa de servicios, con un diagrama por proceso, está en [docs/SERVICIOS-Y-PROCESOS.md](docs/SERVICIOS-Y-PROCESOS.md). La arquitectura está en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Las reglas de cada proceso, en [docs/BUSINESS-PROCESSES.md](docs/BUSINESS-PROCESSES.md). Para continuar el trabajo en otro chat, empieza por [docs/HANDOFF.md](docs/HANDOFF.md).

## Forma del sistema

```
Navegador  -->  App Service (.NET 10)
                 |-- /api          Clean Architecture, CQRS donde el módulo ya lo usa
                 |-- wwwroot       React 18 + Vite + TypeScript
                 |-- /uploads      mapas, comprobantes, documentos
                 +-- Postgres      Neon, compartida por local y Azure
```

Capas del backend: `Domain`, `Application`, `Infrastructure`, `Api`, `Shared`. El dominio no referencia a EF ni a HTTP. El backend corre en .NET 10 LTS con EF Core 10 y Npgsql. Los casos de uso pasan por Mediator, que genera el despacho en compilación, y se validan con FluentValidation. No usa dependencias con licencia comercial: AutoMapper, MediatR y FluentAssertions se reemplazaron por Mapperly, Mediator y AwesomeAssertions. La tenencia es el condominio. Cada request de datos pasa por `ITenantAccessService` y, en las pantallas ya protegidas, por permisos de rol.

Dos dineros conviven y no se mezclan:

- La suscripción la paga el administrador a DomusCond. La opera el SuperAdmin.
- La cuota la paga el residente al condominio. Vive en su estado de cuenta, igual que la multa.

## Qué hace hoy

| Proceso | Resultado de negocio |
| --- | --- |
| Alta | Condominio, torres, unidades, residentes invitados y personal por rol. |
| Caseta | Visita del día, aprobación, entrada, salida, rechazo y pase QR. Aviso a vigilancia y al residente cuando la visita llega. |
| Rondas | Bitácora aparte del libro de visitas. |
| Paquetería | Registro en caseta y aviso al residente de la unidad. |
| Cámaras | Marcador del plano con reproductor del URL configurado. |
| Cuotas | Cargo del administrador, pago del residente y recibo con folio. |
| Multas | Cargo de tipo multa dentro del mismo estado de cuenta. |
| Incidencias | Asignación a mantenimiento, limpieza o proveedor, y cierre con notas. |
| Agenda | El administrador cita al proveedor; el panel deja de mostrar cero fijo. |
| Áreas | Alta con fotos (hasta 8 MB), baja lógica y reservación aprobada por administración. |
| Amenidades | Reservación propia, distinta de las áreas comunes. |
| Mapas | Plano como archivo de imagen o enlace de Google Maps con vista previa embebida y marcadores. |
| Gobierno | Aviso, encuesta, voto, asamblea, asistencia, acta y adjuntos en avisos y foro. |
| Documentos | Contrato, recibo, identificación y reglamento (hasta 8 MB), publicados y consultables. |
| Vehículos | Cajón asignable a un residente, vehículo ligado a unidad/residente y uso directo al registrar visitas. |
| Plataforma | Cambio de plan, cancelación, condonación de suscripción y tablero de superadmin con monitoreo real (sin datos dummy). |

El recorrido de cada servicio está en [docs/SERVICIOS-Y-PROCESOS.md](docs/SERVICIOS-Y-PROCESOS.md). Los estados y las excepciones, en [docs/BUSINESS-PROCESSES.md](docs/BUSINESS-PROCESSES.md).

El correo de confirmación y de restablecimiento sale en Azure por Brevo, desde `contacto@domuscond.com`. En local el envío está apagado y las pruebas leen el mensaje capturado.

## Qué no hace

- El cobro con tarjeta de la suscripción de la plataforma sale por OpenPay en sandbox. La tarjeta se tokeniza en el navegador y el servidor solo recibe el token. No cobra la cuota del residente y no usa un comercio de producción.
- No emite CFDI, no concilia bancos y no lleva libro mayor.
- No graba video ni se conecta a un NVR. La cámara es el URL del marcador.
- No está listo para un condominio real: local y Azure comparten la misma Neon, el plan es F1 y el seed demo sigue encendido. La clave JWT no está en el repositorio.

## Roles

`SuperAdmin`, `CondominiumAdmin`, `SubAdmin`, `Owner`, `Tenant`, `SecurityGuard`, `Maintenance`, `ServiceProvider`, `Accountant`, `Cleaning`.

El token colapsa varios roles de administrador a `admin`, vigilancia a `security` y limpieza junto con mantenimiento a `maintenance`. La pantalla correcta la elige el cliente según el rol de condominio. Los permisos finos se resuelven en [docs/PERMISSIONS.md](docs/PERMISSIONS.md).

## Entornos

| | Local | Azure |
| --- | --- | --- |
| API | `http://localhost:5001` | `https://novaresidence-api.azurewebsites.net` |
| Web de desarrollo | `http://localhost:3000` o `3001` si la levanta Playwright | el mismo host que la API |
| Base | Postgres. `ConnectionStrings:Postgres` o, si no existe, `ConnectionStrings:Neon` | la misma Neon, por `ConnectionStrings__Neon` |
| Esquema nuevo | `CreateTables` la primera vez y después `PostgresSchemaPatch`, con historial en `SchemaPatches` | igual |

La cadena pooled la usa la aplicación. La directa la usan las pruebas. Una URI `postgresql://` se convierte al formato de claves de Npgsql. No volver a SQL Server LocalDB. Las migraciones del repositorio son de SQL Server y no se ejecutan contra Postgres. `UseSqlite` puede seguir en true: si hay cadena de Postgres, esa gana.

## Demo

Residencial Pedregal Demo. Contraseña de todas las cuentas: `Pass123.` Correos `superadmin`, `admin`, `subadmin`, `accountant`, `resident`, `resident2`, `tenant`, `security`, `maintenance`, `cleaning` y `provider`, todos en `@novaresidence.com`. Áreas, plano y cámara del lobby se siembran al arrancar. En un sitio real ese seed se apaga.

## Pruebas

Playwright está en `tests/e2e`, un worker, Chromium. Local levanta la API en 5001 y Vite en 3001. Contra Azure se definen `E2E_BASE_URL` y `E2E_API_BASE`, y no se levantan servidores. La última corrida local completa, del 5 de noviembre de 2026 sobre .NET 10, dejó 114 aprobadas y 2 omitidas. No hay proyecto de pruebas unitarias .NET. Los comandos están en [QUICKSTART.md](QUICKSTART.md).

El sitio publicado en Azure lleva el deploy del 5 de noviembre de 2026 (`a13c1d9ce67e4804b8a2125201991ffe`), que todavía es el código en .NET 8. La migración a .NET 10 no está publicada.

## Documentos

- [docs/SERVICIOS-Y-PROCESOS.md](docs/SERVICIOS-Y-PROCESOS.md) — qué se vende y el flujo de cada servicio.
- [docs/HANDOFF.md](docs/HANDOFF.md) — estado, reglas y cómo publicar.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — capas, tenencia, arranque, datos.
- [docs/BUSINESS-PROCESSES.md](docs/BUSINESS-PROCESSES.md) — reglas y excepciones de cada proceso.
- [docs/PERMISSIONS.md](docs/PERMISSIONS.md) — resolución de permisos.
- [ROADMAP.md](ROADMAP.md) — lo cerrado y lo que falta para producción.
