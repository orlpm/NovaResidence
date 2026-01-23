# Guía de Inicio Rápido - NovaResidence

## ⚡ Iniciar Desarrollo

### 1. Backend (API)

```bash
# Terminal 1 - API
cd src/Backend/NovaResidence.Api
dotnet run
```

Acceso:
- API: https://localhost:7001
- Swagger: https://localhost:7001/swagger
- Scalar API Docs: https://localhost:7001/scalar/v1

### 2. Frontend (Web)

```bash
# Terminal 2 - Web App
cd src/Frontend
npm install
npm run web
```

Acceso: http://localhost:3000

## 🗄️ Base de Datos

### Primera vez

```bash
cd src/Backend/NovaResidence.Infrastructure

# Crear migración inicial
dotnet ef migrations add InitialCreate --startup-project ../NovaResidence.Api

# Aplicar a base de datos
dotnet ef database update --startup-project ../NovaResidence.Api
```

### Agregar nuevas migraciones

```bash
# Desde Infrastructure project
dotnet ef migrations add NombreDeLaMigracion --startup-project ../NovaResidence.Api
dotnet ef database update --startup-project ../NovaResidence.Api
```

## 📦 Paquetes Útiles

### Backend - Agregar paquetes

```bash
# En Directory.Packages.props agregar:
<PackageVersion Include="NombrePaquete" Version="X.X.X" />

# En el .csproj del proyecto:
<PackageReference Include="NombrePaquete" />
```

### Frontend - Agregar paquetes

```bash
cd src/Frontend/web
npm install nombre-paquete
```

## 🔍 Endpoints Principales

### Authentication
- POST `/api/auth/register` - Registro de usuario
- POST `/api/auth/login` - Login
- POST `/api/auth/refresh` - Refresh token

### Condominiums
- GET `/api/condominiums` - Listar condominios
- GET `/api/condominiums/{id}` - Obtener condominio
- POST `/api/condominiums` - Crear condominio
- PUT `/api/condominiums/{id}` - Actualizar condominio
- DELETE `/api/condominiums/{id}` - Eliminar condominio (soft delete)

## 🎨 Estructura de Módulos

Cada módulo sigue el patrón CQRS:

```
Features/
└── [ModuleName]/
    ├── Commands/
    │   └── [CommandName]/
    │       ├── CommandName.cs
    │       ├── CommandNameHandler.cs
    │       └── CommandNameValidator.cs
    └── Queries/
        └── [QueryName]/
            ├── QueryName.cs
            └── QueryNameHandler.cs
```

## 🚀 Próximos Pasos

1. ✅ Estructura base creada
2. ⏳ Implementar autenticación JWT completa
3. ⏳ Agregar módulo de Billing
4. ⏳ Agregar módulo de Incidents
5. ⏳ Agregar módulo de Reservations
6. ⏳ Implementar React Native (Mobile)
7. ⏳ Configurar Azure DevOps CI/CD
8. ⏳ Implementar tests unitarios e integración

## 🐛 Troubleshooting

### Error: No se puede conectar a la base de datos

**Solución**: Verifica que SQL Server esté corriendo:
```bash
# Para LocalDB
sqllocaldb start mssqllocaldb
```

### Error: Puerto en uso

**API**: Cambia el puerto en `launchSettings.json`
**Web**: Cambia el puerto en `vite.config.ts`

### Error: CORS

Verifica que el origen del frontend esté en `appsettings.json`:
```json
{
  "Cors": {
    "AllowedOrigins": ["http://localhost:3000"]
  }
}
```

## 📞 Contacto

Para dudas o problemas, contacta al equipo de desarrollo.
