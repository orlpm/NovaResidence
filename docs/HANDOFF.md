# Handoff de NovaResidence

Documento para continuar el trabajo en otro chat sin depender del historial. Fecha de corte: 6 de noviembre de 2026. El sitio publicado ese día es el deploy `30a5d17c9db54445a749e9b7b76f9c17`, en .NET 10.

## Qué es el producto

DomusCond es un SaaS de administración de condominios. Un solo sitio sirve la API y la aplicación web. El idioma de la interfaz y de las respuestas al usuario es español. La marca visible y los correos usan DomusCond, con remitente `contacto@domuscond.com`. El repositorio, los namespaces y la app de Azure conservan el nombre NovaResidence. La carpeta vieja del escritorio, con el nombre mal escrito, no se toca y no se publica.

## Cómo retomar

Lee, en este orden:

1. Este archivo.
2. [SERVICIOS-Y-PROCESOS.md](SERVICIOS-Y-PROCESOS.md) para qué hace la plataforma, servicio por servicio.
3. [ARCHITECTURE.md](ARCHITECTURE.md) para capas, tenencia, datos y despliegue.
4. [BUSINESS-PROCESSES.md](BUSINESS-PROCESSES.md) para las reglas y excepciones de cada proceso.
5. [PERMISSIONS.md](PERMISSIONS.md) solo si el cambio toca roles o pantallas protegidas.

La rama `main` de [orlpm/NovaResidence](https://github.com/orlpm/NovaResidence) y el sitio publicado en Azure comparten el corte del 6 de noviembre de 2026 (deploy `30a5d17c9db54445a749e9b7b76f9c17`): .NET 10 LTS, Mediator y Mapperly.

## Entorno de desarrollo

- Node.js 24.22.1 LTS y npm 11, instalados con winget (`OpenJS.NodeJS.LTS`). `winget upgrade` ofrecerá Node 26; no hace falta.
- .NET 10 SDK 10.0.403, instalado con winget (`Microsoft.DotNet.SDK.10`). También queda el SDK 9.0.102, pero el repositorio apunta a `net10.0` y necesita el 10. El frontend es un workspace de npm: instalar dependencias desde `src/Frontend` con `--workspace=web`.
- Los skills de Neon están en `.agents/skills` del repositorio. La base del producto es Postgres y hoy apunta a Neon, tanto en local como en Azure.

## Reglas que no se negocian

- No hacer commit, push ni despliegue a Azure salvo que el usuario lo pida.
- No hacer force-push, no cambiar `git config`, no usar `git reset --hard`.
- No imprimir secretos: claves JWT, Brevo, OpenPay ni tokens de Azure.
- En Azure el correo ya sale por Brevo, desde `contacto@domuscond.com`, con el nombre DomusCond. La API key vive solo en App Settings. En local `Email:DisableSending` sigue en true y `Email:CaptureOutbox` guarda el mensaje en `data/email-outbox` para que las pruebas abran el enlace real. No enviar a dominios reservados (`.test`, `example.com`). No imprimir la API key.
- No completar un cargo real de OpenPay. El backend no acepta el número de tarjeta; tokeniza el navegador.
- No volver a SQL Server LocalDB. Local y Azure usan Postgres. Hoy la cadena es la de Neon. `ConnectionStrings:Postgres` gana sobre `ConnectionStrings:Neon`, para poder cambiar de proveedor sin tocar código. No imprimir la cadena. `UseSqlite` puede seguir en true: si hay cadena de Postgres, esa gana. No borres `ConnectionStrings__Neon` en Azure si el paquete todavía puede caer al archivo SQLite.
- No quitar el skip de `tests/record-demo.spec.ts`.
- No crear cuentas con el correo personal del usuario.
- Verificar cambios de interfaz con el flujo real. Playwright es el sustituto cuando no hay navegador.

## Estado de publicación

| Entorno | Estado |
| --- | --- |
| Local | Postgres. La app usa la cadena pooled (`ConnectionStrings:Postgres` o, si no existe, `ConnectionStrings:Neon`). Las pruebas usan la directa. Para que cargue user-secrets (`Jwt:SecretKey`), arrancar sin `--no-launch-profile`: `dotnet run --project "./src/Backend/NovaResidence.Api/NovaResidence.Api.csproj" --urls "http://localhost:5001"`. |
| Azure | App `novaresidence-api`, grupo `NovaResidence-RG`, región `mexicocentral`, plan `novaresidence-plan` SKU F1. URL `https://novaresidence-api.azurewebsites.net`. Una sola app sirve API y SPA desde `wwwroot`. Desde el 4 nov 2026 el sitio usa la misma Postgres de Neon que local, porque `ConnectionStrings__Neon` ya estaba en App Settings y gana sobre `UseSqlite`. |
| Último deploy | 6 nov 2026, id `30a5d17c9db54445a749e9b7b76f9c17`, Succeeded. Migración a .NET 10 LTS, cambio de AutoMapper, MediatR y FluentAssertions por Mapperly, Mediator y AwesomeAssertions, y aviso al activar o desactivar áreas comunes. Después del deploy respondieron 200 la raíz, `/health` (Healthy, con Neon) y el login del residente demo. El deploy anterior, `a13c1d9ce67e4804b8a2125201991ffe` del 5 nov 2026 en .NET 8, incluía tableros y campana por condominio (`cc8aa39`), subida de archivos y fotos de hasta 8 MB, vista previa de Google Maps en mapas, menús de tres puntos por portal, skill `.cursor/skills/visual-ui`, tablero de superadmin sin datos dummy, y cajones/vehículos relacionados con residentes y visitas (parche `002_parking_resident_and_visit_vehicle`). La raíz respondió 200. |
| Git | `main` en GitHub coincide con el deploy. `playwright-report/index.html` y `test-results` no se comitean. |
| Runtime de Azure | `netFrameworkVersion` `v10.0`, worker de 32 bits (F1). |
| Pruebas contra Azure | La suite no se volvió a correr después de pasar a Postgres ni después de sacar la clave JWT del paquete. El pase anterior, todavía sobre el código de SQLite, dejó 98 aprobadas, 1 omitida (`record-demo`) y 1 intermitente en `polls-meetings`, que pasó al repetirla. |
| Pruebas de correo | En local, confirmación y restablecimiento abren el enlace real del mensaje capturado. En Azure, Brevo entregó el correo de DomusCond a `contacto@domuscond.com`. |
| Pruebas locales | 114 aprobadas y 2 omitidas el 5 nov 2026, sobre .NET 10 y Mediator, contra Postgres. Omitidas: `record-demo` y la entrega Brevo, que solo corre con `E2E_TARGET=azure`. No hay proyecto de pruebas unitarias .NET. |

El plan F1 se duerme y tiene unos 60 minutos de CPU al día. Un arranque en frío más una suite grande agota la cuota.

## Cómo publicar de nuevo

Desde la raíz del repositorio, con la CLI de Azure ya autenticada:

1. `npm run build` en `src/Frontend/web`. El build de producción apunta a `https://novaresidence-api.azurewebsites.net/api` por `.env.production`.
2. `dotnet publish` en Release hacia una carpeta temporal.
3. Copiar `src/Frontend/web/dist` dentro de `wwwroot` de esa carpeta. El SPA no vive en el `wwwroot` del repositorio.
4. Comprimir el contenido de la publicación y desplegar con `az webapp deploy --resource-group NovaResidence-RG --name novaresidence-api --src-path <zip> --type zip --clean false`. Sin `--clean false`, el deploy borra `uploads` del servidor con los archivos de los usuarios.

El App Service ya corre .NET 10 (`netFrameworkVersion` `v10.0`). El proyecto de la API excluye `data/` de la publicación para que no viaje el buzón de correo capturado en local.

Swagger no existe fuera de Development. La raíz del sitio debe responder 200.

## Cómo correr las pruebas

Playwright usa un worker, Chromium, y no levanta servidores si `E2E_BASE_URL` está definido.

Local:

- API `http://localhost:5001`, Vite `http://localhost:3001`.
- Hay que limpiar `E2E_TARGET`, `E2E_BASE_URL` y `E2E_API_BASE`.
- Si el puerto 5001 o 3001 sigue ocupado, `reuseExistingServer` reutiliza el proceso viejo y las pruebas pegan contra código anterior.
- Timeout de Vite en `playwright.config.ts`: 120000. Timeout de prueba local: 60 segundos.

Azure:

```
E2E_TARGET=azure
E2E_BASE_URL=https://novaresidence-api.azurewebsites.net
E2E_API_BASE=https://novaresidence-api.azurewebsites.net/api
```

Timeout remoto: 300000. El SQL de las pruebas corre en local con `pg`, contra la cadena directa, y usa esquemas (`auth."Users"`, `condo."Residents"`). Si `E2E_TARGET=azure`, ese helper se detiene: no se corrigen las pruebas contra App Service.

El acceso con QR se cubre en `tests/e2e/visit-qr-access.spec.ts`: la prueba toma una captura del QR del residente y vigilancia la sube como foto, así que valida la decodificación real, no solo la API. Esa suite no se volvió a correr contra Azure después del cambio a Postgres.

Pruebas que dependen de la fecha o del entorno:

- `accountant-dashboard` «API endpoints…» crea un cargo que vence en 5 días y lo busca en el reporte del mes, que filtra por `DueDate`. En los últimos 5 días de cada mes falla. Hay que corregir la prueba.
- Las que crean escenario registran administradores con `uniqueEmail`, que usa los últimos 4 dígitos de `Date.now()`. En Azure F1 un registro falló una vez y pasó al repetir.

## Cuentas demo

Condominio: Residencial Pedregal Demo. Contraseña compartida: `Pass123.` El seeder es idempotente si ya existe `admin@novaresidence.com`, y después llama `EnsureShowcaseAsync` para áreas, plano y cámara aunque el condominio ya existiera.

| Correo | Rol |
| --- | --- |
| superadmin@novaresidence.com | SuperAdmin |
| admin@novaresidence.com | Administrador del condominio |
| subadmin@novaresidence.com | SubAdmin |
| accountant@novaresidence.com | Contador |
| resident@novaresidence.com | Propietario, Javier Morales, unidad A-101 |
| resident2@novaresidence.com | Propietaria con adeudo, Carla Méndez, A-102 |
| tenant@novaresidence.com | Inquilino, Luis Ortega, A-201 |
| security@novaresidence.com | Vigilancia |
| maintenance@novaresidence.com | Mantenimiento |
| cleaning@novaresidence.com | Limpieza |
| provider@novaresidence.com | Proveedor |

En Azure, `Demo:SeedOnStartup` está activo. En un sitio real hay que apagarlo: la contraseña es pública.

## Decisiones que no hay que reabrir

- Las áreas de la interfaz son `CondominiumCommonArea`. La reservación nueva es `CondominiumAreaReservation`. No reutilizar `CommonAreaReservation`: su llave apunta a la entidad vieja `CommonArea`.
- En Postgres no se corre `Database.Migrate()`: esas migraciones son de SQL Server. Si falta `auth."Users"`, el arranque llama `CreateTables`. Neon Auth ya tiene tablas en `neon_auth`, así que `EnsureCreated` no sirve. Cada cambio de columnas posterior es una entrada nueva de `PostgresSchemaPatch`, con id propio. La tabla `SchemaPatches` guarda los ids ya aplicados y no los repite. El camino SQLite y su `SqliteSchemaPatch` siguen en el código por si no hay cadena de Postgres.
- Las pantallas nuevas no llevan un `PermissionRoute` con un código que el seeder no otorgue. Si no está sembrado, la ruta responde Acceso Denegado.
- El JWT colapsa `admin`, `condominiumadmin` y `subadmin` a `admin`. Vigilancia sale como `security`. Proveedor sale como `provider`.
- Si `PermissionService` no recibe condominio y el usuario tiene un solo rol de condominio, usa ese rol. Antes caía en Owner y vigilancia veía Acceso Denegado.
- El video de cámaras es un reproductor del URL que ya trae el marcador. No hay integración CCTV. Un URL que no es mp4, webm, ogg o m3u8 se muestra en un iframe titulado `Transmisión en vivo`.
- En mapas del condominio, una imagen se guarda como archivo subido (JPG, PNG, WEBP, hasta 8 MB). Cuando el fondo es un enlace de Google Maps, el formulario y el mapa guardado muestran la vista previa embebida; los enlaces cortos (`maps.app.goo.gl`, `goo.gl/maps`) se resuelven en `GET /api/condominiummaps/resolve-link` validando que el host final siga siendo de Google. No volver a poner la opción de pegar un URL de imagen.
- Los archivos y fotos subidos por el usuario tienen tope de 8 MB en cliente (`uploadLimits.ts`) y servidor: áreas comunes, adjuntos de avisos y foro, documentos, incidencias, comprobantes de pago y suscripción, y fondos de mapa.
- Los menús de acciones de tres puntos usan `ActionMenu.tsx` con portal a `document.body` y `position: fixed`, para que ningún contenedor con `overflow` los recorte. Las reglas visuales y las clases por familia de panel viven en `.cursor/skills/visual-ui/SKILL.md`.
- Ninguna pantalla autenticada muestra métricas inventadas. Los datos de demostración solo viven en la landing (`Home.tsx`). El tablero de superadmin consume `/api/superadmin/monitoring` y la lista real de usuarios.
- La campana resuelve el condominio por la prop, por `user.condominiumId` o por `getUserCondominiums`. Los tableros de admin y subadmin filtran por `CondominiumId` o `CondominiumIds`, y cada actividad o notificación abre su recurso.
- El backend no vuelve a AutoMapper, MediatR ni FluentAssertions: cambiaron a licencia comercial. Los casos de uso usan Mediator (`Mediator.Abstractions` y `Mediator.SourceGenerator`), con handlers que devuelven `ValueTask<T>` y registro Scoped en `AddApplication`; como Singleton capturarían un `DbContext` ya liberado. Un mapeo nuevo se escribe con Mapperly (`[Mapper]`). Las pruebas unitarias, si se agregan, usan AwesomeAssertions.
- Swagger usa Swashbuckle 10 sobre Microsoft.OpenApi 2. Un parámetro `IFormFile` va sin `[FromForm]`: `[ApiController]` ya lo lee del formulario, y con el atributo Swashbuckle no genera `swagger.json`.
- Toda acción que cambia estado en una pantalla confirma con `toast.success` y avisa el fallo con `toast.error`. Las pruebas buscan esos textos, por ejemplo «Área desactivada» y «Área activada».
- El cargo de cuota del residente ya existía. Lo que se agregó es el folio de recibo `REC-yyyyMMdd-XXXXXXXX` en `Payment.ReceiptNumber`.
- La multa no es una entidad aparte: es un `Charge` con `FeeType.Fine` y un aviso al residente.
- Cajones, vehículos, residentes y visitas están relacionados: `ParkingSpot` guarda `UnitId`, `ResidentId` y `AssignedPlate` (`PUT /api/parking/spots/{id}/assign`); `ResidentVehicle` guarda `ResidentId`, `UnitId`, placa, marca, color y `SpotCode`; `Visit` guarda `ResidentVehicleId` opcional y, si se elige un vehículo registrado de la unidad al crear o editar la visita, toma su placa y descripción. También se puede seguir capturando la placa libre de un visitante externo. En la lista de visitas del administrador, si la placa coincide con un vehículo del condominio, se muestra el nombre del residente dueño.
- El pase QR de visita es `Visit.AccessCode`: 12 caracteres aleatorios de un alfabeto sin 0/O/1/I, mostrados como `NRV-XXXX-XXXX-XXXX`. El QR contiene solo ese texto, no un URL ni datos del visitante. La columna y su índice único entran por `PostgresSchemaPatch` (y por `SqliteSchemaPatch` si no hay Postgres); las visitas viejas reciben código al pedir su pase. Las reglas de vigencia viven en `Visit.GetEntryDenialReason`, no en el controlador. Vigilancia lee el QR con `jsqr` (cámara o foto) en `/security/qr-access`; la pantalla no lleva `PermissionRoute` y el backend exige rol `admin`, `superadmin` o `security`. Un código de otro condominio responde 404, igual que uno inexistente.

## Qué falta para producción

El correo de Azure y el sandbox de OpenPay ya están conectados. Aun así, el producto no está listo para un condominio real:

- Local y Azure comparten la misma base Neon. El esquema nace con `CreateTables` y cada columna nueva queda en `SchemaPatches`. El archivo SQLite de Azure quedó atrás y no se copió. Si se quita `ConnectionStrings__Neon`, la app vuelve al SQLite de `wwwroot` y un zip puede pisarlo.
- Plan F1.
- `Jwt:SecretKey` no vive en el repositorio. Producción la lee de App Settings (`Jwt__SecretKey`). Local la lee de user-secrets. Si falta o tiene menos de 32 caracteres, el proceso no arranca. No la copies a chats ni a documentos.
- Application Insights está vacío.
- El seed demo no puede quedar encendido.
- 11 de los 26 controladores no tienen `[Authorize]`. Entre ellos, `GET /api/condominiums` responde sin token con la lista completa de condominios. Hay que revisar controlador por controlador qué endpoint debe ser público (registro, catálogos) y cerrar el resto sin romper el alta pública.
- `dotnet list package --vulnerable --include-transitive` no reporta paquetes vulnerables. AutoMapper, MediatR y FluentAssertions se retiraron por su cambio a licencia comercial; los reemplazan Mapperly, Mediator y AwesomeAssertions. `npm audit` en el frontend reporta altas en `form-data`, `follow-redirects` y `zod`. Las dos primeras se cierran con `npm audit fix`; `zod` requiere cambio de versión mayor.
- No hay rate limiting en login ni en la validación de códigos QR. El código QR tiene 60 bits de entropía, pero conviene limitar intentos por usuario.

## Trabajo explícitamente no hecho

Paquetería de correo postal más allá del registro en caseta, pago con tarjeta del residente, bitácora de rondas con checkpoints GPS, conciliación contable de la multa, y CFDI. OpenPay sandbox sí cobró la suscripción de la plataforma: un mes de `admin@novaresidence.com` por 343 MXN quedó `completed` y el periodo pasó al 4 de enero de 2027. Las llaves no están en el repositorio. Brevo sí entrega en Azure. En local el envío está apagado.
