# Permisos de DomusCond

Permisos dinámicos por rol para el SaaS de condominios. El producto visible es DomusCond. Los proyectos siguen llamándose NovaResidence. Qué hace cada servicio está en [SERVICIOS-Y-PROCESOS.md](SERVICIOS-Y-PROCESOS.md). Las reglas de negocio y la tenencia están en [BUSINESS-PROCESSES.md](BUSINESS-PROCESSES.md) y [ARCHITECTURE.md](ARCHITECTURE.md). Este archivo solo describe la resolución de permisos.

Hay un décimo rol, `Cleaning` (valor 9). El token lo colapsa junto con mantenimiento a `maintenance`; el permiso y la ruta deciden la pantalla. Las pantallas de documentos, agenda de proveedor, paquetería, rondas, cajones y multas no usan un código nuevo: un `PermissionRoute` con un código sin sembrar responde Acceso Denegado.

## Características

- 66 permisos organizados en 9 categorías
- 10 roles con permisos predefinidos (SuperAdmin, CondominiumAdmin, SubAdmin, Owner, Tenant, SecurityGuard, Maintenance, ServiceProvider, Accountant, Cleaning)
- ✅ **3 niveles de resolución** jerárquica de permisos
- ✅ **Caché inteligente** (15 minutos) para optimizar consultas
- ✅ **Permisos temporales** con fecha de expiración
- ✅ **Personalización por condominio** anulando configuraciones globales
- ✅ **Componentes React** listos para usar (PermissionGate, PermissionRoute)
- ✅ **Layouts específicos** por rol

## 🏗️ Arquitectura

### Backend (.NET 8)

```
NovaResidence.Domain
├── Entities/
│   ├── Permission.cs              # Definición de permisos
│   ├── RolePermission.cs          # Permisos por rol globales
│   ├── UserPermission.cs          # Permisos específicos de usuario
│   └── CondominiumRolePermission.cs # Overrides por condominio
└── Constants/
    └── PermissionCodes.cs         # 66 constantes de permisos

NovaResidence.Application
├── Permissions/
│   ├── Commands/
│   │   ├── GrantRolePermissionCommand.cs
│   │   ├── GrantUserPermissionCommand.cs
│   │   ├── RevokeUserPermissionCommand.cs
│   │   └── SetCondominiumRolePermissionCommand.cs
│   └── Queries/
│       ├── GetAllPermissionsQuery.cs
│       ├── GetUserPermissionsQuery.cs
│       └── GetRolePermissionsQuery.cs
└── Services/
    └── PermissionService.cs       # Lógica de resolución 3-tier

NovaResidence.API
└── Controllers/
    └── PermissionsController.cs   # 8 endpoints REST
```

### Frontend (React + TypeScript)

```
src/
├── config/
│   ├── permissions.ts             # Constantes de permisos (66)
│   └── roles.ts                   # Configuración de roles
├── hooks/
│   └── usePermissions.ts          # 4 hooks de permisos
├── lib/
│   └── permissionService.ts       # Cliente API
├── components/
│   ├── shared/
│   │   └── PermissionGate.tsx     # Renderizado condicional
│   └── routing/
│       └── PermissionRoute.tsx    # Protección de rutas
├── layouts/
│   ├── SubAdminLayout.tsx         # Layout para SubAdmin
│   ├── SecurityLayout.tsx         # Layout para Vigilancia
│   ├── MaintenanceLayout.tsx      # Layout para Mantenimiento
│   └── AccountantLayout.tsx       # Layout para Contador
└── pages/
    ├── admin/
    │   └── PermissionManagement.tsx # Panel de administración
    ├── security/
    │   └── Dashboard.tsx
    ├── maintenance/
    │   └── Dashboard.tsx
    └── accountant/
        └── Dashboard.tsx
```

## 🎯 Resolución de Permisos (3 Niveles)

```
1. UserPermission (Highest Priority)
   └─> Grants/revocations específicos de usuario
       ├─ Global: aplica a todos los condominios
       ├─ Scoped: solo para un condominio
       └─ Expirable: con fecha de vencimiento

2. CondominiumRolePermission (Middle Priority)
   └─> Overrides configurados por el admin del condominio
       └─ Permite personalizar permisos de roles

3. RolePermission (Base Priority)
   └─> Permisos predeterminados del rol
       └─ Configuración global del sistema
```

### Ejemplos de Resolución

```csharp
// Ejemplo 1: SuperAdmin tiene TODOS los permisos
if (user.DefaultRole == "SuperAdmin") 
    return AllPermissions;

// Ejemplo 2: Usuario con override temporal
UserPermission: { userId: "123", permission: "billing.view", expires: "2024-12-31" }
→ Usuario TIENE permiso hasta el 31/12/2024

// Ejemplo 3: Condominio personaliza permisos de SubAdmin
CondominiumRolePermission: { condominiumId: "A", role: SubAdmin, permission: "billing.edit", isGranted: true }
→ SubAdmins del Condominio A PUEDEN editar facturación

// Ejemplo 4: Rol base sin overrides
RolePermission: { role: Owner, permission: "billing.view" }
→ Todos los Owners PUEDEN ver facturación
```

## 📊 Permisos por Categoría

### Platform (5)
- `platform.manage_clients` - Gestionar clientes (solo SuperAdmin)
- `platform.view_all_data` - Ver datos de todos los condominios
- `platform.manage_permissions` - Gestionar sistema de permisos
- `platform.manage_roles` - Asignar roles
- `platform.system_settings` - Configuración del sistema

### Billing (9)
- `billing.view` - Ver facturación
- `billing.create_charges` - Crear cargos
- `billing.edit_charges` - Editar cargos
- `billing.delete_charges` - Eliminar cargos
- `billing.record_payments` - Registrar pagos
- `billing.cancel_charges` - Cancelar cargos
- `billing.forgive_charges` - Condonar cargos
- `billing.export` - Exportar datos
- `billing.view_all_units` - Ver todas las unidades

### Residents (6), Communications (13), Incidents (7), Security (4), Reservations (6), Settings (8), Reports (5)

[Ver archivo completo en `src/config/permissions.ts`]

## 🔐 Configuración de Roles

| Rol | Permisos | Descripción |
|-----|----------|-------------|
| **SuperAdmin** | 66/66 (100%) | Control total de la plataforma |
| **CondominiumAdmin** | 54/66 (82%) | Gestión completa del condominio |
| **SubAdmin** | 18/66 (27%) | Gestión limitada (residentes, facturación, comunicados, incidencias) |
| **Owner/Tenant** | 10/66 (15%) | Permisos básicos de residente |
| **SecurityGuard** | 6/66 (9%) | Accesos, visitantes, incidencias |
| **Maintenance** | 5/66 (8%) | Gestión de incidencias |
| **ServiceProvider** | 2/66 (3%) | Ver/crear incidencias |
| **Accountant** | 8/66 (12%) | Facturación y reportes financieros |

## 🚀 Uso en Frontend

### Hook usePermissions

```tsx
import { usePermissions, PERMISSIONS } from '@/permissions';

function MyComponent() {
  const { 
    permissions, 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    loading 
  } = usePermissions(condominiumId);

  if (loading) return <Loader />;

  return (
    <div>
      {hasPermission(PERMISSIONS.BILLING_VIEW) && (
        <button>Ver Facturación</button>
      )}
      
      {hasAnyPermission([
        PERMISSIONS.BILLING_CREATE_CHARGES,
        PERMISSIONS.BILLING_EDIT_CHARGES
      ]) && (
        <button>Gestionar Cargos</button>
      )}
    </div>
  );
}
```

### Componente PermissionGate

```tsx
import { PermissionGate, PERMISSIONS } from '@/permissions';

function AdminPanel() {
  return (
    <div>
      {/* Renderizar solo si tiene permiso */}
      <PermissionGate permissions={PERMISSIONS.RESIDENTS_VIEW}>
        <ResidentsTable />
      </PermissionGate>

      {/* Múltiples permisos con OR */}
      <PermissionGate 
        permissions={[PERMISSIONS.BILLING_VIEW, PERMISSIONS.REPORTS_VIEW]}
      >
        <FinancialWidget />
      </PermissionGate>

      {/* Múltiples permisos con AND */}
      <PermissionGate 
        permissions={[PERMISSIONS.BILLING_VIEW, PERMISSIONS.BILLING_EDIT_CHARGES]}
        requireAll={true}
      >
        <EditChargesButton />
      </PermissionGate>

      {/* Mostrar mensaje de denegado */}
      <PermissionGate 
        permissions={PERMISSIONS.PLATFORM_MANAGE_PERMISSIONS}
        showDenied={true}
      >
        <PermissionManager />
      </PermissionGate>
    </div>
  );
}
```

### Protección de Rutas

```tsx
import { PermissionRoute, PERMISSIONS } from '@/permissions';

<Route
  path="/admin/permissions"
  element={
    <PermissionRoute permissions={PERMISSIONS.PLATFORM_MANAGE_PERMISSIONS}>
      <PermissionManagement />
    </PermissionRoute>
  }
/>

{/* Múltiples rutas con mismo permiso */}
<Route path="/billing">
  <Route
    path="view"
    element={
      <PermissionRoute permissions={PERMISSIONS.BILLING_VIEW}>
        <BillingList />
      </PermissionRoute>
    }
  />
  <Route
    path="create"
    element={
      <PermissionRoute 
        permissions={[
          PERMISSIONS.BILLING_VIEW,
          PERMISSIONS.BILLING_CREATE_CHARGES
        ]}
        requireAll={true}
      >
        <CreateCharge />
      </PermissionRoute>
    }
  />
</Route>
```

### Navegación con Permisos

```tsx
import { PermissionGate, PERMISSIONS } from '@/permissions';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { 
    name: 'Permisos', 
    href: '/admin/permissions', 
    icon: Shield,
    permission: PERMISSIONS.PLATFORM_MANAGE_PERMISSIONS
  },
];

return navigation.map((item) => {
  const NavItem = <Link to={item.href}>{item.name}</Link>;
  
  if (item.permission) {
    return (
      <PermissionGate key={item.name} permissions={item.permission}>
        {NavItem}
      </PermissionGate>
    );
  }
  
  return NavItem;
});
```

## 🛠️ API Endpoints

### GET /api/permissions
Lista todos los permisos disponibles
```json
{
  "id": "guid",
  "code": "billing.view",
  "name": "Ver Facturación",
  "description": "Permite ver información de facturación",
  "category": "Billing",
  "isSystem": false,
  "isActive": true
}
```

### GET /api/permissions/user/{userId}?condominiumId={id}
Obtiene permisos efectivos de un usuario
```json
["billing.view", "residents.view", "communications.view_announcements"]
```

### GET /api/permissions/user/{userId}/check/{permissionCode}
Verifica si un usuario tiene un permiso específico
```json
{ "hasPermission": true }
```

### POST /api/permissions/user/{userId}/grant
Otorga un permiso a un usuario
```json
{
  "permissionCode": "billing.edit_charges",
  "condominiumId": "guid", // opcional
  "expiresAt": "2024-12-31T23:59:59Z", // opcional
  "reason": "Acceso temporal para auditoría" // opcional
}
```

### POST /api/permissions/user/{userId}/revoke
Revoca un permiso de un usuario
```json
{
  "permissionCode": "billing.edit_charges",
  "condominiumId": "guid", // opcional
  "reason": "Fin del período de auditoría"
}
```

### GET /api/permissions/role/{role}
Obtiene permisos de un rol
```json
["billing.view", "residents.view", ...]
```

### POST /api/permissions/role/{role}/grant
Asigna permiso a un rol globalmente
```json
{
  "permissionCode": "billing.view",
  "canOverride": true
}
```

### POST /api/permissions/condominium/{condominiumId}/role/{role}/set
Configura permiso de rol para un condominio
```json
{
  "permissionCode": "billing.edit_charges",
  "isGranted": true
}
```

## 📦 Migraciones

```bash
# Backend ya tiene la migración aplicada
dotnet ef migrations add AddPermissionSystem --project Infrastructure --startup-project API
dotnet ef database update --project Infrastructure --startup-project API
```

### Tablas Creadas
- `auth.Permissions` - 66 permisos predefinidos
- `auth.RolePermissions` - ~150 asignaciones rol-permiso
- `auth.UserPermissions` - Permisos individuales
- `auth.CondominiumRolePermissions` - Overrides por condominio

## 🧪 Testing

### Backend (Swagger)
```
1. Navigate to https://localhost:7001/swagger
2. Authorize with JWT token
3. Test endpoints:
   - GET /api/permissions → Ver 66 permisos
   - GET /api/permissions/role/1 → Ver permisos de CondominiumAdmin
   - GET /api/permissions/user/{userId} → Ver permisos efectivos
```

### Frontend (Browser)
```
1. npm run dev
2. Login as different roles
3. Verify navigation items show/hide based on permissions
4. Try accessing restricted routes → should redirect to /unauthorized
```

## 🔄 Flujo de Trabajo Típico

### 1. Admin del Condominio Personaliza Permisos
```tsx
// En PermissionManagement.tsx
const handleCustomizeRole = async () => {
  await permissionService.setCondominiumRolePermission(
    condominiumId,
    UserRole.SubAdmin,
    PERMISSIONS.BILLING_EDIT_CHARGES,
    true // grant
  );
};
```

### 2. Admin Otorga Permiso Temporal
```tsx
const grantTemporaryAccess = async (userId: string) => {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 mes
  
  await permissionService.grantUserPermission(
    userId,
    PERMISSIONS.BILLING_EXPORT,
    condominiumId,
    expiresAt,
    "Acceso temporal para reporte trimestral"
  );
};
```

### 3. Usuario Accede a Funcionalidad
```tsx
// El sistema verifica automáticamente
const { hasPermission } = usePermissions(condominiumId);

return (
  <button 
    onClick={exportBilling}
    disabled={!hasPermission(PERMISSIONS.BILLING_EXPORT)}
  >
    Exportar
  </button>
);
```

## ⚡ Performance

- **Caché en Backend**: 15 minutos en IMemoryCache
- **Caché en Frontend**: 15 minutos en memoria del servicio
- **Optimización**: Solo 1 consulta por usuario por sesión
- **Índices DB**: Composite unique indexes en todas las tablas

## 🔐 Seguridad

- ✅ Todos los endpoints requieren autenticación (`[Authorize]`)
- ✅ SuperAdmin bypass solo valida DefaultRole string
- ✅ Permisos expirados no se consideran válidos
- ✅ Soft delete en todas las entidades
- ✅ Audit trail con CreatedBy, UpdatedBy, DeletedBy

## 📝 TODO / Mejoras Futuras

- [ ] Audit log de cambios de permisos
- [ ] Templates de permisos (quick-apply)
- [ ] Bulk operations (grant/revoke múltiples)
- [ ] Permission reports (quién tiene qué)
- [ ] UI para gestión de usuarios en PermissionManagement
- [ ] UI para personalizaciones de condominio
- [ ] Notificaciones cuando se otorgan/revocan permisos
- [ ] Dashboard de SuperAdmin con estadísticas de permisos

## 🎨 Estilos de Roles

Cada rol tiene colores y estilos únicos:

| Rol | Color | Ícono |
|-----|-------|-------|
| SuperAdmin | Purple (`text-purple-600`) | Shield |
| CondominiumAdmin | Blue (`text-blue-600`) | Building2 |
| SubAdmin | Indigo (`text-indigo-600`) | Users |
| Owner | Green (`text-green-600`) | Home |
| Tenant | Teal (`text-teal-600`) | Home |
| SecurityGuard | Orange (`text-orange-600`) | Shield |
| Maintenance | Yellow (`text-yellow-600`) | Wrench |
| ServiceProvider | Gray (`text-gray-600`) | Briefcase |
| Accountant | Emerald (`text-emerald-600`) | Calculator |

## 📚 Referencias

- [Backend: PermissionService.cs](../src/Backend/NovaResidence.Application/Services/PermissionService.cs)
- [Frontend: usePermissions.ts](../src/Frontend/web/src/hooks/usePermissions.ts)
- [Seeder: RolePermissionSeeder.cs](../src/Backend/NovaResidence.Infrastructure/Data/Seeders/RolePermissionSeeder.cs)
- [API: PermissionsController.cs](../src/Backend/NovaResidence.API/Controllers/PermissionsController.cs)

---

**Sistema implementado completamente** ✅
- Backend: 100% funcional
- Frontend: 100% funcional
- Base de datos: Migrada y seeded
- Documentación: Completa
