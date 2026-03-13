# NovaResidence - Plataforma SaaS de Administración de Condominios

## 🏗️ Arquitectura

Este proyecto sigue **Clean Architecture** con separación clara entre capas:

```
NovaResidence/
├── src/
│   ├── Backend/
│   │   ├── NovaResidence.Api          # Capa de Presentación (REST API)
│   │   ├── NovaResidence.Application  # Casos de uso (CQRS + MediatR)
│   │   ├── NovaResidence.Domain       # Entidades y lógica de negocio
│   │   ├── NovaResidence.Infrastructure # Implementaciones (EF Core, Azure)
│   │   └── NovaResidence.Shared       # Utilidades compartidas
│   └── Frontend/
│       ├── web/                       # React Web (Vite + TypeScript)
│       ├── mobile/                    # React Native (TODO)
│       └── shared/                    # Código compartido (TODO)
└── NovaResidence.sln
```

## 🚀 Stack Tecnológico

### Backend
- **.NET 8** - Framework principal
- **ASP.NET Core Web API** - API REST
- **Entity Framework Core 8** - ORM con SQL Server
- **MediatR** - Patrón CQRS
- **FluentValidation** - Validación de datos
- **AutoMapper** - Mapeo de objetos
- **Azure SDK** - Servicios en la nube

### Frontend
- **React 18** - Librería UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool
- **TailwindCSS** - Estilos
- **React Router** - Navegación
- **Zustand** - State management
- **React Query** - Data fetching
- **Axios** - Cliente HTTP

### Azure Services
- **Azure SQL Database** - Base de datos
- **Azure Blob Storage** - Almacenamiento de archivos
- **Azure Service Bus** - Mensajería asíncrona
- **Azure Key Vault** - Gestión de secretos
- **Azure Application Insights** - Monitoreo
- **Azure App Service** - Hosting API
- **Azure Static Web Apps** - Hosting Frontend

## 📋 Requisitos Previos

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/)
- [SQL Server](https://www.microsoft.com/sql-server) o Azure SQL
- [Visual Studio 2022](https://visualstudio.microsoft.com/) o [VS Code](https://code.visualstudio.com/)
- [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli) (opcional)

## 🛠️ Instalación y Configuración

### Backend

1. **Restaurar dependencias**
   ```bash
   dotnet restore
   ```

2. **Configurar connection string**
   
   Edita `src/Backend/NovaResidence.Api/appsettings.json`:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=NovaResidenceDb;Trusted_Connection=true;"
     }
   }
   ```

3. **Crear base de datos**
   ```bash
   cd src/Backend/NovaResidence.Infrastructure
   dotnet ef migrations add InitialCreate --startup-project ../NovaResidence.Api
   dotnet ef database update --startup-project ../NovaResidence.Api
   ```

4. **Configurar validación de correo y recuperación de contraseña**
   
    Completa estos valores en `src/Backend/NovaResidence.Api/appsettings.Development.json` o vía secretos/variables de entorno:
    ```json
    {
       "Auth": {
          "FrontendBaseUrl": "http://localhost:5173",
          "RequireConfirmedEmailForLogin": true
       },
       "Email": {
          "BrevoApiKey": "TU_API_KEY_O_SMTP_KEY_DE_BREVO",
          "SmtpUsername": "tu-login-smtp-brevo-si-usas-xsmtpsib",
          "FromEmail": "no-reply@tu-dominio.com",
          "FromName": "NovaResidence"
       }
    }
    ```
   
    `FrontendBaseUrl` se usa para construir los enlaces de confirmación de correo y restablecimiento de contraseña. El proyecto ya exige confirmación de correo antes del login.

    Si `BrevoApiKey` empieza con `xkeysib-`, se usa la API REST de Brevo.
    Si `BrevoApiKey` empieza con `xsmtpsib-`, se usa SMTP relay y debes completar `SmtpUsername` con el usuario SMTP real de tu cuenta de Brevo. No siempre coincide con `FromEmail`.

5. **Ejecutar API**
   ```bash
   cd src/Backend/NovaResidence.Api
   dotnet run
   ```
   
   La API estará disponible en: `https://localhost:7001`

### Frontend

1. **Instalar dependencias**
   ```bash
   cd src/Frontend
   npm install
   ```

2. **Configurar variables de entorno**
   
   Crea `.env` en `src/Frontend/web/`:
   ```env
   VITE_API_URL=https://localhost:7001/api
   ```

3. **Ejecutar aplicación web**
   ```bash
   npm run web
   ```
   
   La aplicación estará disponible en: `http://localhost:3000`

## 🏛️ Arquitectura del Backend

### Domain Layer (Núcleo)
- **Entities**: Modelos de dominio (User, Condominium, Unit, etc.)
- **Value Objects**: Objetos inmutables (Address)
- **Enums**: Enumeraciones de dominio
- **Domain Events**: Eventos de dominio

### Application Layer
- **Features**: Casos de uso organizados por módulo (CQRS)
  - Commands: Operaciones que modifican estado
  - Queries: Operaciones de lectura
  - Validators: Validaciones con FluentValidation
- **Interfaces**: Contratos para infraestructura
- **Behaviors**: MediatR pipelines (logging, validación)

### Infrastructure Layer
- **Persistence**: EF Core DbContext, Repositories
- **Services**: Implementaciones de Azure (Blob, Service Bus, Email)
- **Configurations**: Configuraciones de EF Core

### API Layer
- **Controllers**: Endpoints REST
- **Middleware**: Exception handling, tenant resolution
- **Configuration**: Startup, DI, Swagger

## 🎯 Módulos Principales

### 1. Authentication (Auth)
- Registro y login de usuarios
- JWT tokens y refresh tokens
- Gestión de roles multi-tenant

### 2. Condominium Management
- CRUD de condominios, edificios, unidades
- Gestión de áreas comunes
- Asignación de propietarios e inquilinos

### 3. Billing & Payments (TODO)
- Generación de cuotas
- Integración con pasarelas de pago
- Facturación electrónica

### 4. Incidents & Maintenance (TODO)
- Reporte de incidencias
- Asignación a proveedores
- Seguimiento y SLA

### 5. Reservations (TODO)
- Reservación de áreas comunes
- Calendario de disponibilidad
- Aprobación automática/manual

### 6. Communication (TODO)
- Avisos y circulares
- Notificaciones push/email/SMS
- Juntas y votaciones

### 7. Reports & Analytics (TODO)
- Dashboards financieros
- Reportes de morosidad
- Métricas de operación

## 🔐 Seguridad

- **JWT Authentication**: Bearer tokens con expiración
- **Role-Based Authorization**: Múltiples roles por tenant
- **Multi-tenancy**: Aislamiento de datos por condominio
- **HTTPS**: Requerido en producción
- **Azure Key Vault**: Gestión de secretos
- **SQL Injection Protection**: EF Core parametrizado
- **CORS**: Configurado para dominios específicos

## 🗄️ Base de Datos

### Esquemas

- `auth`: Usuarios y autenticación
- `condo`: Condominios, edificios, unidades
- `billing`: Facturación y pagos (TODO)
- `maintenance`: Incidencias (TODO)
- `communication`: Notificaciones (TODO)

### Migraciones

```bash
# Crear migración
dotnet ef migrations add MigrationName --project src/Backend/NovaResidence.Infrastructure --startup-project src/Backend/NovaResidence.Api

# Aplicar migración
dotnet ef database update --project src/Backend/NovaResidence.Infrastructure --startup-project src/Backend/NovaResidence.Api

# Revertir migración
dotnet ef database update PreviousMigrationName --project src/Backend/NovaResidence.Infrastructure --startup-project src/Backend/NovaResidence.Api
```

## 🚢 Despliegue en Azure

### Backend (Azure App Service)

```bash
# Publicar localmente
dotnet publish -c Release -o ./publish

# Desplegar con Azure CLI
az webapp up --name novaresidence-api --resource-group NovaResidence-RG --runtime "DOTNETCORE:8.0"
```

### Frontend (Azure Static Web Apps)

```bash
# Build
cd src/Frontend/web
npm run build

# Desplegar con Azure CLI
az staticwebapp create --name novaresidence-web --resource-group NovaResidence-RG --source ./dist
```

## 📝 Estructura de Carpetas Detallada

```
NovaResidence/
├── src/Backend/
│   ├── NovaResidence.Api/
│   │   ├── Controllers/          # REST endpoints
│   │   ├── Middleware/           # Custom middleware
│   │   ├── Program.cs            # Application startup
│   │   └── appsettings.json      # Configuration
│   ├── NovaResidence.Application/
│   │   ├── Common/
│   │   │   ├── Behaviors/        # MediatR behaviors
│   │   │   └── Interfaces/       # Application contracts
│   │   └── Features/             # Use cases (CQRS)
│   │       ├── Authentication/
│   │       ├── Condominiums/
│   │       └── [Other Modules]/
│   ├── NovaResidence.Domain/
│   │   ├── Common/               # Base classes
│   │   ├── Entities/             # Domain models
│   │   ├── Enums/                # Enumerations
│   │   └── ValueObjects/         # Value objects
│   ├── NovaResidence.Infrastructure/
│   │   ├── Persistence/
│   │   │   ├── Configurations/   # EF configurations
│   │   │   ├── Repositories/     # Repository implementations
│   │   │   └── ApplicationDbContext.cs
│   │   └── Services/             # External services
│   └── NovaResidence.Shared/
│       ├── Constants/            # Application constants
│       ├── Exceptions/           # Custom exceptions
│       └── Models/               # DTOs and responses
└── src/Frontend/
    └── web/
        ├── src/
        │   ├── components/       # Reusable UI components
        │   ├── layouts/          # Page layouts
        │   ├── pages/            # Route pages
        │   ├── stores/           # Zustand stores
        │   ├── lib/              # Utilities
        │   └── App.tsx           # Main app component
        ├── index.html
        └── vite.config.ts
```

## 🧪 Testing (Pendiente)

```bash
# Backend
dotnet test

# Frontend
npm test --workspace=web
```

## 📚 Recursos Adicionales

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
- [Azure Architecture Center](https://learn.microsoft.com/azure/architecture/)
- [React Best Practices](https://react.dev/)

## 🤝 Contribución

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Proyecto privado - NovaResidence © 2026

## 👥 Equipo

- Desarrollo Backend: .NET + Azure
- Desarrollo Frontend: React + React Native
- Arquitectura: Clean Architecture + CQRS + Multi-tenancy

---

**Nota**: Este es un MVP (Minimum Viable Product) preparado para evolucionar a una arquitectura de microservicios.
