# Inicio rápido

Qué hace la plataforma está en [docs/SERVICIOS-Y-PROCESOS.md](docs/SERVICIOS-Y-PROCESOS.md). El estado para retomar el trabajo, en [docs/HANDOFF.md](docs/HANDOFF.md). Esta página solo dice cómo levantarlo y cómo probarlo.

## Local

Terminal de la API, desde la raíz del repositorio:

```bash
dotnet run --project src/Backend/NovaResidence.Api/NovaResidence.Api.csproj --urls http://localhost:5001
```

Hace falta `Jwt:SecretKey` en user-secrets y la cadena de Postgres (`ConnectionStrings:Postgres` o `ConnectionStrings:Neon`). El script `scripts/set-neon-connection.ps1` guarda la cadena sin mostrarla. No hace falta SQL Server ni `dotnet ef database update`. El arranque crea las tablas si faltan, aplica los parches pendientes de `PostgresSchemaPatch` y, en Development, siembra el demo.

Terminal del web:

```bash
cd src/Frontend/web
npm install
npm run dev
```

Vite usa el puerto 3000. `src/Frontend/web/.env` debe apuntar a `http://localhost:5001/api`. Playwright levanta el mismo Vite en el puerto 3001. Swagger solo aparece en Development: `http://localhost:5001/swagger`.

Cuentas del demo: cualquier correo de la tabla del README, contraseña `Pass123.`

## Correo

En local el envío está apagado y `Email:CaptureOutbox` guarda el mensaje en `data/email-outbox`. En Azure el correo sale por Brevo, desde `contacto@domuscond.com`. No imprimas la API key. `xkeysib-` usa la API REST y `xsmtpsib-` usa SMTP con `SmtpUsername`. `Auth:FrontendBaseUrl` arma los enlaces de confirmación y de restablecimiento. Los registros públicos no confirman solos. El personal creado por un administrador sí queda confirmado. No se envía a dominios reservados (`.test`, `example.com`).

## Pruebas de extremo a extremo

Desde la raíz, con los puertos 5001 y 3001 libres para que Playwright no reutilice un API viejo:

```bash
npx playwright test tests/e2e/notifications-events.spec.ts tests/e2e/documents.spec.ts tests/e2e/common-areas-maps.spec.ts tests/e2e/cleaning-provider-work.spec.ts tests/e2e/polls-meetings.spec.ts tests/e2e/packages.spec.ts tests/e2e/vehicles-parking.spec.ts tests/e2e/resident-fee-payment.spec.ts tests/e2e/security-rounds.spec.ts tests/e2e/fines.spec.ts tests/e2e/demo-pedregal-showcase.spec.ts
```

Antes de esa corrida local, `E2E_TARGET`, `E2E_BASE_URL` y `E2E_API_BASE` tienen que estar vacíos.

Contra el sitio publicado:

```bash
set E2E_TARGET=azure
set E2E_BASE_URL=https://novaresidence-api.azurewebsites.net
set E2E_API_BASE=https://novaresidence-api.azurewebsites.net/api
npx playwright test tests/e2e/<spec>.spec.ts
```

En PowerShell se asignan con `$env:`. El sitio F1 puede tardar en despertar. No reactivar `tests/record-demo.spec.ts`.

## Publicar

1. `npm run build` en `src/Frontend/web`.
2. `dotnet publish` en Release a una carpeta temporal.
3. Copiar `dist` dentro del `wwwroot` de esa carpeta.
4. `az webapp deploy --resource-group NovaResidence-RG --name novaresidence-api --src-path <zip> --type zip`.

La raíz del sitio debe responder 200. Swagger en Azure responde 404 y eso es esperado.

## Si una columna nueva no aparece

`CreateTables` no altera una base que ya tiene `auth."Users"`. La columna entra como un id nuevo en `PostgresSchemaPatch`. Al reiniciar, la tabla `SchemaPatches` anota ese id y no lo repite. Las migraciones de SQL Server no se corren contra Postgres.

## Si una pantalla dice Acceso Denegado

El rol del token no coincide con la ruta, o `PermissionRoute` exige un código que el seeder no dio a ese rol. Vigilancia se evalúa con su rol de condominio, no como propietario. No protejas una pantalla nueva con un permiso que no esté sembrado.
