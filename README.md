# DomusCond

SaaS de administración de condominios. La marca y el correo público son DomusCond (`contacto@domuscond.com`). El repositorio, los proyectos de código y la app de Azure siguen llamándose NovaResidence. Un App Service sirve la API y la aplicación web. El piloto cubre la operación diaria del edificio y la suscripción de la plataforma. No es todavía un sistema de producción para un condominio real.

La arquitectura está en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Los procesos, en [docs/BUSINESS-PROCESSES.md](docs/BUSINESS-PROCESSES.md). Para continuar el trabajo en otro chat, empieza por [docs/HANDOFF.md](docs/HANDOFF.md).

## Forma del sistema

```
Navegador  -->  App Service (.NET 8)
                 |-- /api          Clean Architecture, CQRS donde el módulo ya lo usa
                 |-- wwwroot       React 18 + Vite + TypeScript
                 |-- /uploads      mapas, comprobantes, documentos
                 +-- SQLite        un archivo por entorno
```

Capas del backend: `Domain`, `Application`, `Infrastructure`, `Api`, `Shared`. El dominio no referencia a EF ni a HTTP. La tenencia es el condominio. Cada request de datos pasa por `ITenantAccessService` y, en las pantallas ya protegidas, por permisos de rol.

Dos dineros conviven y no se mezclan:

- La suscripción la paga el administrador a NovaResidence. La opera el SuperAdmin.
- La cuota la paga el residente al condominio. Vive en su estado de cuenta, igual que la multa.

## Qué hace hoy

| Proceso | Resultado de negocio |
| --- | --- |
| Alta | Condominio, torres, unidades, residentes invitados y personal por rol. |
| Caseta | Visita del día, aprobación, entrada, salida y rechazo. Aviso a vigilancia. |
| Rondas | Bitácora aparte del libro de visitas. |
| Paquetería | Registro en caseta y aviso al residente de la unidad. |
| Cámaras | Marcador del plano con reproductor del URL configurado. |
| Cuotas | Cargo del administrador, pago del residente y recibo con folio. |
| Multas | Cargo de tipo multa dentro del mismo estado de cuenta. |
| Incidencias | Asignación a mantenimiento, limpieza o proveedor, y cierre con notas. |
| Agenda | El administrador cita al proveedor; el panel deja de mostrar cero fijo. |
| Áreas | Alta, baja lógica y reservación aprobada por administración. |
| Amenidades | Reservación propia, distinta de las áreas comunes. |
| Gobierno | Aviso, encuesta, voto, asamblea, asistencia y acta. |
| Documentos | Contrato, recibo, identificación y reglamento, publicados y consultables. |
| Vehículos | Cajón del condominio y placa del residente. |
| Plataforma | Cambio de plan, cancelación y condonación de la suscripción. |

El detalle de estados, actores y excepciones está en el documento de procesos.

## Qué no hace

- No envía correo. Brevo está implementado y el envío está apagado.
- No cobra con tarjeta. OpenPay tokeniza en el navegador y no hay un cargo de piloto cerrado.
- No emite CFDI, no concilia bancos y no lleva libro mayor.
- No graba video ni se conecta a un NVR. La cámara es el URL del marcador.
- No corre en producción: la base es SQLite, el plan de Azure es F1 y el secreto JWT está en el repositorio.

## Roles

`SuperAdmin`, `CondominiumAdmin`, `SubAdmin`, `Owner`, `Tenant`, `SecurityGuard`, `Maintenance`, `ServiceProvider`, `Accountant`, `Cleaning`.

El token colapsa varios roles de administrador a `admin`, vigilancia a `security` y limpieza junto con mantenimiento a `maintenance`. La pantalla correcta la elige el cliente según el rol de condominio. Los permisos finos se resuelven en [docs/PERMISSIONS.md](docs/PERMISSIONS.md).

## Entornos

| | Local | Azure |
| --- | --- | --- |
| API | `http://localhost:5001` | `https://novaresidence-api.azurewebsites.net` |
| Web de desarrollo | `http://localhost:3000` o `3001` si la levanta Playwright | el mismo host que la API |
| Base | `src/Backend/NovaResidence.Api/data/novaresidence.dev.db` | `D:\home\data\novaresidence.db` |
| Esquema nuevo | `EnsureCreated` y después `SqliteSchemaPatch` | igual |

`UseSqlite` está activo. No volver a LocalDB. En SQL Server el arranque usa migraciones; las tablas operativas nuevas todavía no tienen migración.

## Demo

Residencial Pedregal Demo. Contraseña de todas las cuentas: `Pass123.` Correos `superadmin`, `admin`, `subadmin`, `accountant`, `resident`, `resident2`, `tenant`, `security`, `maintenance`, `cleaning` y `provider`, todos en `@novaresidence.com`. Áreas, plano y cámara del lobby se siembran al arrancar. En un sitio real ese seed se apaga.

## Pruebas

Playwright está en `tests/e2e`, un worker, Chromium. Local levanta la API en 5001 y Vite en 3001. Contra Azure se definen `E2E_BASE_URL` y `E2E_API_BASE`, y no se levantan servidores. El último pase publicado, el 16 de octubre de 2026, dejó 19 pruebas verdes sobre los flujos de esta versión. Los comandos están en [QUICKSTART.md](QUICKSTART.md).

## Documentos

- [docs/HANDOFF.md](docs/HANDOFF.md) — estado, reglas y cómo publicar.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — capas, tenencia, arranque, datos.
- [docs/BUSINESS-PROCESSES.md](docs/BUSINESS-PROCESSES.md) — procesos y reglas ya fijadas.
- [docs/PERMISSIONS.md](docs/PERMISSIONS.md) — resolución de permisos.
- [ROADMAP.md](ROADMAP.md) — lo cerrado y lo que falta para producción.
