import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// Layouts
import AdminLayout from './layouts/AdminLayout'
import ResidentLayout from './layouts/ResidentLayout'
import AuthLayout from './layouts/AuthLayout'
import SubAdminLayout from './layouts/SubAdminLayout'
import SecurityLayout from './layouts/SecurityLayout'
import MaintenanceLayout from './layouts/MaintenanceLayout'
import AccountantLayout from './layouts/AccountantLayout'
import SuperAdminLayout from './layouts/SuperAdminLayout'

// Components
import { PermissionRoute } from './components/routing/PermissionRoute'
import { SubscriptionGuard } from './components/subscription/SubscriptionGuard'

// Pages - Admin
import AdminDashboard from './pages/admin/Dashboard'
import PermissionManagement from './pages/admin/PermissionManagement'
import AdminOnboarding from './pages/admin/Onboarding'
import Condominiums from './pages/admin/Condominiums'
import CondominiumDetails from './pages/admin/CondominiumDetails'
import CondominiumEdit from './pages/admin/CondominiumEdit'
import CondominiumUnits from './pages/admin/CondominiumUnits'
import Units from './pages/admin/Units'
import Residents from './pages/admin/Residents'
import Amenities from './pages/admin/Amenities'
import Billing from './pages/admin/Billing'
import Incidents from './pages/admin/Incidents'
import AdminVisits from './pages/admin/Visits'
import AdminReservations from './pages/admin/Reservations'
import CommonAreas from './pages/admin/CommonAreas'
import CondominiumMaps from './pages/admin/CondominiumMaps'
import Reports from './pages/admin/Reports'
import Communications from './pages/admin/Communications'
import SubscriptionStatus from './pages/admin/SubscriptionStatus'
import StaffManagement from './pages/shared/StaffManagement'

// Pages - SuperAdmin
import SuperAdminDashboard from './pages/superadmin/Dashboard'
import ClientsManagement from './pages/superadmin/ClientsManagement'
import UsersManagement from './pages/superadmin/UsersManagement'
import RolesManagement from './pages/superadmin/RolesManagement'
import SubscriptionsManagement from './pages/superadmin/SubscriptionsManagement'

// Pages - Security
import SecurityDashboard from './pages/security/Dashboard'

// Pages - Maintenance
import MaintenanceDashboard from './pages/maintenance/Dashboard'

// Pages - Accountant
import AccountantDashboard from './pages/accountant/Dashboard'

// Pages - Resident
import ResidentDashboard from './pages/resident/Dashboard'
import MyUnit from './pages/resident/MyUnit'
import Payments from './pages/resident/Payments'
import ReservationsPage from './pages/resident/Reservations'
import MyIncidents from './pages/resident/MyIncidents'
import NewReservation from './pages/resident/NewReservation'
import NewIncident from './pages/resident/NewIncident'
import IncidentDetail from './pages/resident/IncidentDetail'
import MyVisits from './pages/resident/MyVisits'
import NewVisit from './pages/resident/NewVisit'
import VisitDetail from './pages/resident/VisitDetail'
import ResidentCommunications from './pages/resident/Communications'
import ResidentCommonAreas from './pages/resident/CommonAreas'
import ResidentCondominiumMap from './pages/resident/CondominiumMap'

// Pages - Auth
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import RegisterResident from './pages/RegisterResident'

// Pages - Public
import Home from './pages/Home'
import Unauthorized from './pages/Unauthorized'

// Permissions
import { PERMISSIONS } from './config/permissions'

function App() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <Routes>
      {/* Public home page */}
      <Route path="/home" element={<Home />} />
      
      {/* Unauthorized page */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Resident registration with invitation token */}
      <Route path="/invitation/register/:unitId/:token" element={<RegisterResident />} />

      {/* Public routes */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>

      {/* Protected routes - SuperAdmin */}
      <Route
        path="/superadmin"
        element={
          isAuthenticated && (user?.role === 'admin' || user?.role === 'superadmin') ? (
            <SuperAdminLayout />
          ) : (
            <Navigate to="/auth/login" replace />
          )
        }
      >
        <Route index element={<SuperAdminDashboard />} />
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route 
          path="clients" 
          element={
            <PermissionRoute permissions={PERMISSIONS.PLATFORM_MANAGE_CLIENTS}>
              <ClientsManagement />
            </PermissionRoute>
          } 
        />
        <Route 
          path="users" 
          element={
            <PermissionRoute permissions={PERMISSIONS.PLATFORM_VIEW_ALL_DATA}>
              <UsersManagement />
            </PermissionRoute>
          } 
        />
        <Route 
          path="permissions" 
          element={
            <PermissionRoute permissions={PERMISSIONS.PLATFORM_MANAGE_PERMISSIONS}>
              <PermissionManagement />
            </PermissionRoute>
          } 
        />
        <Route 
          path="roles" 
          element={
            <PermissionRoute permissions={PERMISSIONS.PLATFORM_MANAGE_ROLES}>
              <RolesManagement />
            </PermissionRoute>
          } 
        />
        <Route path="staff" element={<StaffManagement />} />
        <Route path="subscriptions" element={<SubscriptionsManagement />} />
        <Route path="monitoring" element={<div className="text-white">Monitoreo del Sistema - Coming Soon</div>} />
        <Route 
          path="system" 
          element={
            <PermissionRoute permissions={PERMISSIONS.PLATFORM_SYSTEM_SETTINGS}>
              <div className="text-white">Configuración del Sistema - Coming Soon</div>
            </PermissionRoute>
          } 
        />
        <Route 
          path="database" 
          element={
            <PermissionRoute permissions={PERMISSIONS.PLATFORM_SYSTEM_SETTINGS}>
              <div className="text-white">Base de Datos - Coming Soon</div>
            </PermissionRoute>
          } 
        />
      </Route>

      {/* Protected routes - Admin */}
      <Route
        path="/admin"
        element={
          isAuthenticated && user?.role === 'admin' ? (
            <SubscriptionGuard>
              <AdminLayout />
            </SubscriptionGuard>
          ) : (
            <Navigate to="/auth/login" replace />
          )
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="onboarding" element={<AdminOnboarding />} />
        <Route path="condominiums" element={<Condominiums />} />
        <Route path="condominiums/:id" element={<CondominiumDetails />} />
        <Route path="condominiums/:id/edit" element={<CondominiumEdit />} />
        <Route path="condominiums/:id/units" element={<CondominiumUnits />} />
        <Route path="units" element={<Units />} />
        <Route path="residents" element={<Residents />} />
        <Route path="amenities" element={<Amenities />} />
        <Route 
          path="common-areas" 
          element={
            <PermissionRoute permissions={[PERMISSIONS.COMMON_AREAS_VIEW, PERMISSIONS.COMMON_AREAS_MANAGE]}>
              <CommonAreas />
            </PermissionRoute>
          }
        />
        <Route 
          path="maps" 
          element={
            <PermissionRoute permissions={[PERMISSIONS.MAPS_VIEW, PERMISSIONS.MAPS_MANAGE]}>
              <CondominiumMaps />
            </PermissionRoute>
          }
        />
        <Route path="reservations" element={<AdminReservations />} />
        <Route path="billing" element={<Billing />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="visits" element={<AdminVisits />} />
        <Route path="communications" element={<Communications />} />
        <Route path="reports" element={<Reports />} />
        <Route path="subscription" element={<SubscriptionStatus />} />
        <Route path="staff" element={<StaffManagement />} />
        <Route 
          path="permissions" 
          element={
            <PermissionRoute permissions={PERMISSIONS.PLATFORM_MANAGE_PERMISSIONS}>
              <PermissionManagement />
            </PermissionRoute>
          } 
        />
      </Route>

      {/* Protected routes - SubAdmin */}
      <Route
        path="/subadmin"
        element={
          isAuthenticated ? (
            <SubscriptionGuard>
              <SubAdminLayout />
            </SubscriptionGuard>
          ) : (
            <Navigate to="/auth/login" replace />
          )
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route 
          path="residents" 
          element={
            <PermissionRoute permissions={PERMISSIONS.RESIDENTS_VIEW}>
              <Residents />
            </PermissionRoute>
          } 
        />
        <Route 
          path="billing" 
          element={
            <PermissionRoute permissions={PERMISSIONS.BILLING_VIEW}>
              <Billing />
            </PermissionRoute>
          } 
        />
        <Route 
          path="incidents" 
          element={
            <PermissionRoute permissions={PERMISSIONS.INCIDENTS_VIEW}>
              <Incidents />
            </PermissionRoute>
          } 
        />
        <Route 
          path="communications" 
          element={
            <PermissionRoute permissions={PERMISSIONS.COMMUNICATIONS_VIEW_ANNOUNCEMENTS}>
              <Communications />
            </PermissionRoute>
          } 
        />
      </Route>

      {/* Protected routes - Security */}
      <Route
        path="/security"
        element={
          isAuthenticated ? <SecurityLayout /> : <Navigate to="/auth/login" replace />
        }
      >
        <Route index element={<SecurityDashboard />} />
        <Route path="dashboard" element={<SecurityDashboard />} />
        <Route path="access-log" element={<div className="text-white">Access Log - Coming Soon</div>} />
        <Route path="visitors" element={<AdminVisits />} />
        <Route path="incidents" element={<Incidents />} />
      </Route>

      {/* Protected routes - Maintenance */}
      <Route
        path="/maintenance"
        element={
          isAuthenticated ? <MaintenanceLayout /> : <Navigate to="/auth/login" replace />
        }
      >
        <Route index element={<MaintenanceDashboard />} />
        <Route path="dashboard" element={<MaintenanceDashboard />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="new-incident" element={<NewIncident />} />
      </Route>

      {/* Protected routes - Accountant */}
      <Route
        path="/accountant"
        element={
          isAuthenticated ? <AccountantLayout /> : <Navigate to="/auth/login" replace />
        }
      >
        <Route index element={<AccountantDashboard />} />
        <Route path="dashboard" element={<AccountantDashboard />} />
        <Route 
          path="billing" 
          element={
            <PermissionRoute permissions={PERMISSIONS.BILLING_VIEW}>
              <Billing />
            </PermissionRoute>
          } 
        />
        <Route 
          path="charges" 
          element={
            <PermissionRoute permissions={PERMISSIONS.BILLING_CREATE_CHARGES}>
              <Billing />
            </PermissionRoute>
          } 
        />
        <Route 
          path="reports" 
          element={
            <PermissionRoute permissions={PERMISSIONS.REPORTS_FINANCIAL}>
              <Reports />
            </PermissionRoute>
          } 
        />
        <Route path="incidents" element={<Incidents />} />
        <Route path="communications" element={<Communications />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* Protected routes - Resident */}
      <Route
        path="/resident"
        element={
          isAuthenticated ? <ResidentLayout /> : <Navigate to="/auth/login" replace />
        }
      >
        <Route index element={<ResidentDashboard />} />
        <Route path="my-unit" element={<MyUnit />} />
        <Route path="payments" element={<Payments />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route 
          path="common-areas" 
          element={
            <PermissionRoute permissions={PERMISSIONS.COMMON_AREAS_VIEW}>
              <ResidentCommonAreas />
            </PermissionRoute>
          }
        />
        <Route 
          path="map" 
          element={
            <PermissionRoute permissions={PERMISSIONS.MAPS_VIEW}>
              <ResidentCondominiumMap />
            </PermissionRoute>
          }
        />
        <Route path="reservations/new" element={<NewReservation />} />
        <Route path="incidents" element={<MyIncidents />} />
        <Route path="incidents/new" element={<NewIncident />} />
        <Route path="incidents/:id" element={<IncidentDetail />} />
        <Route path="visits" element={<MyVisits />} />
        <Route path="visits/new" element={<NewVisit />} />
        <Route path="visits/:id" element={<VisitDetail />} />
        <Route path="communications" element={<ResidentCommunications />} />
      </Route>

      {/* Root redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            user?.role === 'superadmin' ? (
              <Navigate to="/superadmin" replace />
            ) : user?.role === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : user?.role === 'security' ? (
              <Navigate to="/security" replace />
            ) : user?.role === 'maintenance' ? (
              <Navigate to="/maintenance" replace />
            ) : user?.role === 'accountant' ? (
              <Navigate to="/accountant" replace />
            ) : (
              <Navigate to="/resident" replace />
            )
          ) : (
            <Home />
          )
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
