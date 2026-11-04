# SuperAdmin - Chrome DevTools Test Checklist

Lista manual del plano de control de la plataforma. Qué hace cada servicio está en [docs/SERVICIOS-Y-PROCESOS.md](../../docs/SERVICIOS-Y-PROCESOS.md). El proceso de suscripción y el resto de la operación están en [docs/BUSINESS-PROCESSES.md](../../docs/BUSINESS-PROCESSES.md). El estado del producto, en [docs/HANDOFF.md](../../docs/HANDOFF.md).

## Preconditions
- Backend running on `http://localhost:5001`
- Frontend running on `http://localhost:3001` (or active Vite port)
- Logged in as SuperAdmin

## Scope
- `/superadmin/monitoring`
- `/superadmin/system`
- `/superadmin/database`

## 1) Network Validation (DevTools > Network)

### Monitoring page
1. Open `/superadmin/monitoring`
2. Filter by `Fetch/XHR`
3. Verify request:
   - `GET /api/superadmin/monitoring`
   - Status `200`
   - Response JSON includes: `totalUsers`, `databaseConnected`, `generatedAt`
4. Click **Actualizar** and verify request repeats with `200`.

### System settings page
1. Open `/superadmin/system`
2. Verify request:
   - `GET /api/superadmin/system/settings`
   - Status `200`
3. Modify one field (e.g. banner) and click **Guardar**
4. Verify request:
   - `PUT /api/superadmin/system/settings`
   - Status `200`
   - Request payload contains edited fields

### Database page
1. Open `/superadmin/database`
2. Verify request:
   - `GET /api/superadmin/database`
   - Status `200`
3. Click **Recargar** and verify another `GET` request with status `200`.
4. Click **Aplicar migraciones** (confirm modal) and verify:
   - `POST /api/superadmin/database/migrate`
   - Status `200`

## 2) Console Validation (DevTools > Console)
1. Clear console.
2. Navigate through the three pages.
3. Ensure no red errors are thrown during load or actions.
4. Perform save settings + apply migrations and ensure no unhandled promise errors.

## 3) Performance Validation (DevTools > Performance)
1. Record while loading `/superadmin/monitoring`.
2. Stop after metrics render.
3. Check for long tasks > 200ms spikes.
4. Repeat for `/superadmin/database`.

## 4) Accessibility Spot-Check (DevTools > Elements + Lighthouse optional)
1. Verify each page has one main heading (`h1`).
2. Verify buttons are keyboard focusable and labels are visible.
3. Optional: run Lighthouse quick audit for Best Practices + Accessibility.

## 5) Pass Criteria
- All endpoint calls return 200.
- No console errors on primary interactions.
- UI updates after save/refresh actions.
- No blocking performance regressions on initial render.
