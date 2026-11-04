# Handoff de NovaResidence

Documento para continuar el trabajo en otro chat sin depender del historial. Fecha de corte: 3 de noviembre de 2026. El último despliegue a Azure fue el 3 de noviembre de 2026 y corresponde al commit `6059c34` de `main`.

## Qué es el producto

DomusCond es un SaaS de administración de condominios. Un solo sitio sirve la API y la aplicación web. El idioma de la interfaz y de las respuestas al usuario es español. La marca visible y los correos usan DomusCond, con remitente `contacto@domuscond.com`. El repositorio, los namespaces y la app de Azure conservan el nombre NovaResidence. La carpeta vieja del escritorio, con el nombre mal escrito, no se toca y no se publica.

## Cómo retomar

Lee, en este orden:

1. Este archivo.
2. [ARCHITECTURE.md](ARCHITECTURE.md) para capas, tenencia, datos y despliegue.
3. [BUSINESS-PROCESSES.md](BUSINESS-PROCESSES.md) para el comportamiento de cada proceso.
4. [PERMISSIONS.md](PERMISSIONS.md) solo si el cambio toca roles o pantallas protegidas.

La rama `main` de [orlpm/NovaResidence](https://github.com/orlpm/NovaResidence) es la fuente de verdad. El commit `6059c34` (3 nov 2026) subió todo el producto operativo y el acceso con QR; antes de él, el historial terminaba en `a18f779`. Azure tiene publicado exactamente ese commit. Si hay cambios sin commit o commits posteriores, el sitio publicado va atrás.

## Entorno de desarrollo

- Node.js 24.22.1 LTS y npm 11, instalados con winget (`OpenJS.NodeJS.LTS`). `winget upgrade` ofrecerá Node 26; no hace falta.
- .NET 8 SDK. El frontend es un workspace de npm: instalar dependencias desde `src/Frontend` con `--workspace=web`.
- Los skills de Neon están en `.agents/skills` del repositorio (instalados con el CLI `skills`). No se usan en el producto; NovaResidence no corre en Neon.

## Reglas que no se negocian

- No hacer commit, push ni despliegue a Azure salvo que el usuario lo pida.
- No hacer force-push, no cambiar `git config`, no usar `git reset --hard`.
- No imprimir secretos: claves JWT, Brevo, OpenPay ni tokens de Azure.
- En Azure el correo ya sale por Brevo, desde `contacto@domuscond.com`, con el nombre DomusCond. La API key vive solo en App Settings. En local `Email:DisableSending` sigue en true y `Email:CaptureOutbox` guarda el mensaje en `data/email-outbox` para que las pruebas abran el enlace real. No enviar a dominios reservados (`.test`, `example.com`). No imprimir la API key.
- No completar un cargo real de OpenPay. El backend no acepta el número de tarjeta; tokeniza el navegador.
- No volver a SQL Server LocalDB. Local usa Postgres. Hoy la cadena es la de Neon (`ConnectionStrings:Neon` y `ConnectionStrings:NeonDirect` en user-secrets). Mañana puede ser Azure u otro Postgres con `ConnectionStrings:Postgres`, que gana sobre Neon. No imprimir la cadena. Azure sigue en SQLite hasta que se despliegue este código; no apagar `UseSqlite` allá antes de ese despliegue.
- No quitar el skip de `tests/record-demo.spec.ts`.
- No crear cuentas con el correo personal del usuario.
- Verificar cambios de interfaz con el flujo real. Playwright es el sustituto cuando no hay navegador.

## Estado de publicación

| Entorno | Estado |
| --- | --- |
| Local | Postgres. La app usa la cadena pooled (`ConnectionStrings:Postgres` o, si no existe, `ConnectionStrings:Neon`). Las pruebas usan la directa. El proceso `dotnet run` usa como directorio de trabajo el proyecto de la API. |
| Azure | App `novaresidence-api`, grupo `NovaResidence-RG`, región `mexicocentral`, plan `novaresidence-plan` SKU F1. URL `https://novaresidence-api.azurewebsites.net`. Una sola app sirve API y SPA desde `wwwroot`. |
| Último deploy | 3 nov 2026, marca DomusCond, id `58f54b6caba04e82a6ae79ce230499e7`, `provisioningState` Succeeded. Ese sitio sigue en SQLite. El cambio a Postgres no está desplegado. |
| Pruebas de ese deploy | Suite completa contra Azure: 98 aprobadas, 1 omitida (`record-demo`), 1 intermitente en 7.7 min. La intermitente fue `polls-meetings` «el residente vota y confirma la asamblea desde su pantalla»: falló el registro del administrador al preparar el escenario y pasó al repetirla. |
| Pruebas de correo | En local, confirmación y restablecimiento abren el enlace real del mensaje capturado. En Azure, Brevo entregó el correo de DomusCond a `contacto@domuscond.com`. |
| Pruebas locales | 99 aprobadas y 2 omitidas el 4 nov 2026, contra Postgres. Omitidas: `record-demo` y la entrega Brevo, que solo corre con `E2E_TARGET=azure`. |

El plan F1 se duerme y tiene unos 60 minutos de CPU al día. Un arranque en frío más una suite grande agota la cuota.

## Cómo publicar de nuevo

Desde la raíz del repositorio, con la CLI de Azure ya autenticada:

1. `npm run build` en `src/Frontend/web`. El build de producción apunta a `https://novaresidence-api.azurewebsites.net/api` por `.env.production`.
2. `dotnet publish` en Release hacia una carpeta temporal.
3. Copiar `src/Frontend/web/dist` dentro de `wwwroot` de esa carpeta. El SPA no vive en el `wwwroot` del repositorio.
4. Comprimir el contenido de la publicación y desplegar con `az webapp deploy --resource-group NovaResidence-RG --name novaresidence-api --src-path <zip> --type zip`.

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

El último pase en Azure corrió la suite completa (100 pruebas). El acceso con QR se cubre en `tests/e2e/visit-qr-access.spec.ts`: la prueba toma una captura del QR del residente y vigilancia la sube como foto, así que valida la decodificación real, no solo la API.

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
- En Postgres no se corre `Database.Migrate()`: esas migraciones son de SQL Server. Si falta `auth."Users"`, el arranque llama `CreateTables`. Neon Auth ya tiene tablas en `neon_auth`, así que `EnsureCreated` no sirve: vería el esquema ajeno y no crearía el de la app. Columnas nuevas entran por `PostgresSchemaPatch`. El camino SQLite y su `SqliteSchemaPatch` siguen en el código por si no hay cadena de Postgres.
- Las pantallas nuevas no llevan un `PermissionRoute` con un código que el seeder no otorgue. Si no está sembrado, la ruta responde Acceso Denegado.
- El JWT colapsa `admin`, `condominiumadmin` y `subadmin` a `admin`. Vigilancia sale como `security`. Proveedor sale como `provider`.
- Si `PermissionService` no recibe condominio y el usuario tiene un solo rol de condominio, usa ese rol. Antes caía en Owner y vigilancia veía Acceso Denegado.
- El video de cámaras es un reproductor del URL que ya trae el marcador. No hay integración CCTV. Un URL que no es mp4, webm, ogg o m3u8 se muestra en un iframe titulado `Transmisión en vivo`.
- La campana resuelve el condominio por la prop, por `user.condominiumId` o por `getUserCondominiums`.
- El cargo de cuota del residente ya existía. Lo que se agregó es el folio de recibo `REC-yyyyMMdd-XXXXXXXX` en `Payment.ReceiptNumber`.
- La multa no es una entidad aparte: es un `Charge` con `FeeType.Fine` y un aviso al residente.
- La placa del visitante sigue en la visita. La placa del residente vive en `ResidentVehicle` y el cajón en `ParkingSpot`.
- El pase QR de visita es `Visit.AccessCode`: 12 caracteres aleatorios de un alfabeto sin 0/O/1/I, mostrados como `NRV-XXXX-XXXX-XXXX`. El QR contiene solo ese texto, no un URL ni datos del visitante. La columna y su índice único entran por `PostgresSchemaPatch` (y por `SqliteSchemaPatch` si no hay Postgres); las visitas viejas reciben código al pedir su pase. Las reglas de vigencia viven en `Visit.GetEntryDenialReason`, no en el controlador. Vigilancia lee el QR con `jsqr` (cámara o foto) en `/security/qr-access`; la pantalla no lleva `PermissionRoute` y el backend exige rol `admin`, `superadmin` o `security`. Un código de otro condominio responde 404, igual que uno inexistente.

## Qué falta para producción

Correo y OpenPay están fuera de alcance hasta que el usuario lo pida. Aun así, el producto no está listo para un condominio real:

- Azure sigue en el archivo SQLite hasta el próximo despliegue. Local ya está en Postgres, pero no hay migraciones de ese motor: el esquema nace con `CreateTables` y el parche. Un zip deploy del sitio viejo puede pisar datos si la cadena apunta a `wwwroot`.
- Plan F1.
- La clave JWT de producción está en `appsettings.Production.json` dentro del repositorio. Hay que rotarla y sacarla del repo. No la copies a chats ni a documentos.
- Application Insights está vacío.
- El seed demo no puede quedar encendido.
- .NET 8 deja de recibir parches de seguridad el 10 de noviembre de 2026. Hay que migrar a .NET 10 LTS.
- `dotnet list package --vulnerable --include-transitive` reporta paquetes con vulnerabilidades altas (entre ellos `AutoMapper`, `System.Text.Json`, `System.Security.Cryptography.Xml`, `SQLitePCLRaw`, `Microsoft.Data.SqlClient`) y `MailKit` moderada. `npm audit` en el frontend reporta altas en `form-data`, `follow-redirects` y `zod`. Varias se cierran con la migración a .NET 10 y con `npm audit fix`; `zod` requiere cambio de versión mayor.
- No hay rate limiting en login ni en la validación de códigos QR. El código QR tiene 60 bits de entropía, pero conviene limitar intentos por usuario.

## Trabajo explícitamente no hecho

Paquetería de correo postal más allá del registro en caseta, vehículos de visitantes como padrón, pago con tarjeta del residente, bitácora de rondas con checkpoints GPS, conciliación contable de la multa, y CFDI. OpenPay sandbox no tiene un cargo exitoso. Brevo está apagado.
