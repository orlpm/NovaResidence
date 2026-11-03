# Handoff de NovaResidence

Documento para continuar el trabajo en otro chat sin depender del historial. Fecha de corte: 29 de octubre de 2026. El último despliegue conocido a Azure fue el 16 de octubre de 2026.

## Qué es el producto

NovaResidence es un SaaS de administración de condominios. Un solo sitio sirve la API y la aplicación web. El idioma de la interfaz y de las respuestas al usuario es español. El nombre correcto es NovaResidence. La carpeta vieja del escritorio, con el nombre mal escrito, no se toca y no se publica.

## Cómo retomar

Lee, en este orden:

1. Este archivo.
2. [ARCHITECTURE.md](ARCHITECTURE.md) para capas, tenencia, datos y despliegue.
3. [BUSINESS-PROCESSES.md](BUSINESS-PROCESSES.md) para el comportamiento de cada proceso.
4. [PERMISSIONS.md](PERMISSIONS.md) solo si el cambio toca roles o pantallas protegidas.

El código de la rama `main` en el working tree es la fuente de verdad. Casi todo el producto operativo está sin commit encima de `a18f779`. Azure recibió un zip de ese working tree el 16 de octubre de 2026. Si el árbol cambió después de esa fecha, el sitio publicado puede ir atrás.

## Reglas que no se negocian

- No hacer commit ni push salvo que el usuario lo pida.
- No hacer force-push, no cambiar `git config`, no usar `git reset --hard`.
- No imprimir secretos: claves JWT, Brevo, OpenPay ni tokens de Azure.
- No reactivar el envío de correo. `Email:DisableSending` permanece en true hasta que el usuario entregue credenciales de Brevo.
- No completar un cargo real de OpenPay. El backend no acepta el número de tarjeta; tokeniza el navegador.
- No volver a SQL Server LocalDB. Local y Azure usan SQLite.
- No quitar el skip de `tests/record-demo.spec.ts`.
- No crear cuentas con el correo personal del usuario.
- Verificar cambios de interfaz con el flujo real. Playwright es el sustituto cuando no hay navegador.

## Estado de publicación

| Entorno | Estado |
| --- | --- |
| Local | SQLite en `src/Backend/NovaResidence.Api/data/novaresidence.dev.db`. El proceso `dotnet run` usa como directorio de trabajo el proyecto de la API. |
| Azure | App `novaresidence-api`, grupo `NovaResidence-RG`, región `mexicocentral`, plan `novaresidence-plan` SKU F1. URL `https://novaresidence-api.azurewebsites.net`. Una sola app sirve API y SPA desde `wwwroot`. |
| Último deploy | 16 oct 2026, id `8a92ce50b6614b3f89536ae7b6b43363`, `provisioningState` Succeeded. |
| Pruebas de ese deploy | 19 specs de los flujos nuevos, todas verdes, unos 3 minutos. |

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

Timeout remoto: 300000. El SQL remoto de las pruebas sube `tests/e2e/helpers/e2e-remote-sql.py` por Kudu y lo ejecuta con el Python 2.7 del sitio. En local usa `node:sqlite`. Los Guid de SQLite se guardan en mayúsculas y la comparación de llaves foráneas distingue mayúsculas.

Los 19 specs del último pase en Azure fueron: notificaciones, documentos, áreas/mapas/cámaras, limpieza y proveedor, encuestas y asambleas, paquetería, vehículos, pago de cuota, rondas, multas y el demo de Pedregal.

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
- `EnsureCreated` no altera una base SQLite que ya existe. Toda tabla o columna nueva entra por `SqliteSchemaPatch.ApplyAsync`, llamado justo después de `EnsureCreated`.
- Las pantallas nuevas no llevan un `PermissionRoute` con un código que el seeder no otorgue. Si no está sembrado, la ruta responde Acceso Denegado.
- El JWT colapsa `admin`, `condominiumadmin` y `subadmin` a `admin`. Vigilancia sale como `security`. Proveedor sale como `provider`.
- Si `PermissionService` no recibe condominio y el usuario tiene un solo rol de condominio, usa ese rol. Antes caía en Owner y vigilancia veía Acceso Denegado.
- El video de cámaras es un reproductor del URL que ya trae el marcador. No hay integración CCTV. Un URL que no es mp4, webm, ogg o m3u8 se muestra en un iframe titulado `Transmisión en vivo`.
- La campana resuelve el condominio por la prop, por `user.condominiumId` o por `getUserCondominiums`.
- El cargo de cuota del residente ya existía. Lo que se agregó es el folio de recibo `REC-yyyyMMdd-XXXXXXXX` en `Payment.ReceiptNumber`.
- La multa no es una entidad aparte: es un `Charge` con `FeeType.Fine` y un aviso al residente.
- La placa del visitante sigue en la visita. La placa del residente vive en `ResidentVehicle` y el cajón en `ParkingSpot`.

## Qué falta para producción

Correo y OpenPay están fuera de alcance hasta que el usuario lo pida. Aun así, el producto no está listo para un condominio real:

- SQLite de un solo archivo, sin respaldos. En SQL Server sí hay migraciones; en SQLite no. Un zip deploy puede pisar datos si la cadena apunta a `wwwroot`.
- Plan F1.
- La clave JWT de producción está en `appsettings.Production.json` dentro del repositorio. Hay que rotarla y sacarla del repo. No la copies a chats ni a documentos.
- Application Insights está vacío.
- El seed demo no puede quedar encendido.
- No hay commit del working tree. El historial de git no contiene este producto.

## Trabajo explícitamente no hecho

Paquetería de correo postal más allá del registro en caseta, vehículos de visitantes como padrón, pago con tarjeta del residente, bitácora de rondas con checkpoints GPS, conciliación contable de la multa, y CFDI. OpenPay sandbox no tiene un cargo exitoso. Brevo está apagado.
