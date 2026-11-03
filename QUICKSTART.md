# Inicio rápido

Para el contexto del producto lee [docs/HANDOFF.md](docs/HANDOFF.md). Esta página solo dice cómo levantarlo y cómo probarlo.

## Local

Terminal de la API, desde la raíz del repositorio:

```bash
dotnet run --project src/Backend/NovaResidence.Api/NovaResidence.Api.csproj --urls http://localhost:5001
```

El directorio de trabajo del proceso debe ser el proyecto de la API si se arranca desde ahí. La base SQLite queda en `src/Backend/NovaResidence.Api/data/novaresidence.dev.db`. No hace falta SQL Server ni `dotnet ef database update` mientras `UseSqlite` sea true. El arranque crea el archivo, aplica `SqliteSchemaPatch` y, en Development, siembra el demo.

Terminal del web:

```bash
cd src/Frontend/web
npm install
npm run dev
```

Vite usa el puerto 3000. `src/Frontend/web/.env` debe apuntar a `http://localhost:5001/api`. Playwright levanta el mismo Vite en el puerto 3001. Swagger solo aparece en Development: `http://localhost:5001/swagger`.

Cuentas del demo: cualquier correo de la tabla del README, contraseña `Pass123.`

## Correo

El envío está apagado. No lo enciendas sin una clave de Brevo dada por el usuario. Si más adelante se enciende, `xkeysib-` usa la API REST y `xsmtpsib-` usa SMTP con `SmtpUsername`. `Auth:FrontendBaseUrl` arma los enlaces de confirmación y de restablecimiento. Los registros públicos no confirman solos. El personal creado por un administrador sí queda confirmado.

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

## Si algo no aparece en una base que ya existe

`EnsureCreated` no agrega tablas a un SQLite viejo. La tabla o la columna nueva tiene que estar en `SqliteSchemaPatch` y el proceso tiene que reiniciar. Borrar la base solo es válido en local y pierde el demo.

## Si una pantalla dice Acceso Denegado

El rol del token no coincide con la ruta, o `PermissionRoute` exige un código que el seeder no dio a ese rol. Vigilancia se evalúa con su rol de condominio, no como propietario. No protejas una pantalla nueva con un permiso que no esté sembrado.
