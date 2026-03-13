import { lazy, Suspense } from 'react'
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
import ProviderLayout from './layouts/ProviderLayout'
import CleaningLayout from './layouts/CleaningLayout'

// Components
import { PermissionRoute } from './components/routing/PermissionRoute'
import { SubscriptionGuard } from './components/subscription/SubscriptionGuard'

// Pages - Admin (lazy)
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const PermissionManagement = lazy(() => import('./pages/admin/PermissionManagement'))
const AdminOnboarding = lazy(() => import('./pages/admin/Onboarding'))
const Condominiums = lazy(() => import('./pages/admin/Condominiums'))
const CondominiumDetails = lazy(() => import('./pages/admin/CondominiumDetails'))
const CondominiumEdit = lazy(() => import('./pages/admin/CondominiumEdit'))
const CondominiumUnits = lazy(() => import('./pages/admin/CondominiumUnits'))
const Units = lazy(() => import('./pages/admin/Units'))
const Residents = lazy(() => import('./pages/admin/Residents'))
const Amenities = lazy(() => import('./pages/admin/Amenities'))
const Billing = lazy(() => import('./pages/admin/Billing'))
const Incidents = lazy(() => import('./pages/admin/Incidents'))
const AdminVisits = lazy(() => import('./pages/admin/Visits'))
const AdminReservations = lazy(() => import('./pages/admin/Reservations'))
const CommonAreas = lazy(() => import('./pages/admin/CommonAreas'))
const CondominiumMaps = lazy(() => import('./pages/admin/CondominiumMaps'))
const Reports = lazy(() => import('./pages/admin/Reports'))
const Communications = lazy(() => import('./pages/admin/Communications'))
const SubscriptionStatus = lazy(() => import('./pages/admin/SubscriptionStatus'))
const StaffManagement = lazy(() => import('./pages/shared/StaffManagement'))
const AdminProcedures = lazy(() => import('./pages/admin/Procedures'))

// Pages - SuperAdmin (lazy)
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/Dashboard'))
const ClientsManagement = lazy(() => import('./pages/superadmin/ClientsManagement'))
const UsersManagement = lazy(() => import('./pages/superadmin/UsersManagement'))
const RolesManagement = lazy(() => import('./pages/superadmin/RolesManagement'))
const SubscriptionsManagement = lazy(() => import('./pages/superadmin/SubscriptionsManagement'))
const Monitoring = lazy(() => import('./pages/superadmin/Monitoring'))
const SystemSettings = lazy(() => import('./pages/superadmin/SystemSettings'))
const DatabaseManagement = lazy(() => import('./pages/superadmin/DatabaseManagement'))

// Pages - Security (lazy)
const SecurityDashboard = lazy(() => import('./pages/security/Dashboard'))
const SecurityAccessLog = lazy(() => import('./pages/security/AccessLog'))
const SecurityAccessControl = lazy(() => import('./pages/security/AccessControl'))
const SecurityCameras = lazy(() => import('./pages/security/Cameras'))

// Pages - Maintenance (lazy)
const MaintenanceDashboard = lazy(() => import('./pages/maintenance/Dashboard'))
const MaintenanceIncidents = lazy(() => import('./pages/maintenance/Incidents'))

// Pages - Accountant (lazy)
const AccountantDashboard = lazy(() => import('./pages/accountant/Dashboard'))

// Pages - Provider/Cleaning (lazy)
const ProviderDashboard = lazy(() => import('./pages/provider/Dashboard'))
const CleaningDashboard = lazy(() => import('./pages/cleaning/Dashboard'))

// Pages - Resident (lazy)
const ResidentDashboard = lazy(() => import('./pages/resident/Dashboard'))
const MyUnit = lazy(() => import('./pages/resident/MyUnit'))
const Payments = lazy(() => import('./pages/resident/Payments'))
const ReservationsPage = lazy(() => import('./pages/resident/Reservations'))
const MyIncidents = lazy(() => import('./pages/resident/MyIncidents'))
const NewReservation = lazy(() => import('./pages/resident/NewReservation'))
const NewIncident = lazy(() => import('./pages/resident/NewIncident'))
const IncidentDetail = lazy(() => import('./pages/resident/IncidentDetail'))
const MyVisits = lazy(() => import('./pages/resident/MyVisits'))
const NewVisit = lazy(() => import('./pages/resident/NewVisit'))
const VisitDetail = lazy(() => import('./pages/resident/VisitDetail'))
const EditVisit = lazy(() => import('./pages/resident/EditVisit'))
const ResidentCommunications = lazy(() => import('./pages/resident/Communications'))
const ResidentProcedures = lazy(() => import('./pages/resident/Procedures'))
const ResidentCommonAreas = lazy(() => import('./pages/resident/CommonAreas'))
const ResidentCondominiumMap = lazy(() => import('./pages/resident/CondominiumMap'))

// Pages - Auth (lazy)
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const AdminRegistrationPage = lazy(() => import('./pages/auth/AdminRegistration'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const ConfirmEmail = lazy(() => import('./pages/auth/ConfirmEmail'))
const RegisterResident = lazy(() => import('./pages/RegisterResident'))

// Pages - Public (lazy)
const Home = lazy(() => import('./pages/Home'))
const Unauthorized = lazy(() => import('./pages/Unauthorized'))

// Permissions
import { PERMISSIONS } from './config/permissions'

function App() {
  const { isAuthenticated, user } = useAuthStore()
  const normalizedDefaultRole = (user?.defaultRole || '').replace(/[^a-z]/gi, '').toLowerCase()
  const isSubAdminProfile = user?.role === 'subadmin' || normalizedDefaultRole === 'subadmin'
  const isAdminProfile = user?.role === 'admin' && !isSubAdminProfile
  const isMaintenanceProfile = user?.role === 'maintenance' || user?.role === 'cleaning'
  const isCleaningProfile = user?.role === 'cleaning'
  const isProviderProfile = user?.role === 'provider'

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-500">Cargando...</div>}>
    <Routes>
      {/* Public home page */}
      <Route path="/home" element={<Home />} />
      <Route path="/alta-administrador" element={<AdminRegistrationPage />} />
      
      {/* Unauthorized page */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Resident registration with invitation token */}
      <Route path="/invitation/register/:unitId/:token" element={<RegisterResident />} />

      {/* Public routes */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="alta-administrador" element={<AdminRegistrationPage />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="confirm-email" element={<ConfirmEmail />} />
      </Route>

      {/* Protected routes - SuperAdmin */}
      <Route
        path="/superadmin"
        element={
          !isAuthenticated ? (
            <Navigate to="/auth/login" replace />
          ) : user?.role === 'superadmin' ? (
            <SuperAdminLayout />
          ) : (
            <Navigate to="/unauthorized" replace />
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
        <Route path="monitoring" element={<Monitoring />} />
        <Route 
          path="system" 
          element={
            <PermissionRoute permissions={PERMISSIONS.PLATFORM_SYSTEM_SETTINGS}>
              <SystemSettings />
            </PermissionRoute>
          } 
        />
        <Route 
          path="database" 
          element={
            <PermissionRoute permissions={PERMISSIONS.PLATFORM_SYSTEM_SETTINGS}>
              <DatabaseManagement />
            </PermissionRoute>
          } 
        />
      </Route>

      {/* Protected routes - Admin */}
      <Route
        path="/admin"
        element={
          isAuthenticated && isAdminProfile ? (
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
        <Route path="procedures" element={<AdminProcedures />} />
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
          !isAuthenticated ? (
            <Navigate to="/auth/login" replace />
          ) : isSubAdminProfile ? (
            <SubscriptionGuard>
              <SubAdminLayout />
            </SubscriptionGuard>
          ) : (
            <Navigate to="/unauthorized" replace />
          )
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
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
        <Route
          path="procedures"
          element={
            <PermissionRoute permissions={PERMISSIONS.RESIDENTS_VIEW}>
              <AdminProcedures />
            </PermissionRoute>
          }
        />
        <Route 
          path="reservations" 
          element={
            <PermissionRoute permissions={PERMISSIONS.RESERVATIONS_VIEW}>
              <AdminReservations />
            </PermissionRoute>
          } 
        />
        <Route 
          path="visits" 
          element={
            <PermissionRoute permissions={PERMISSIONS.SECURITY_MANAGE_VISITORS}>
              <AdminVisits />
            </PermissionRoute>
          } 
        />
        <Route 
          path="reports" 
          element={
            <PermissionRoute permissions={PERMISSIONS.REPORTS_VIEW}>
              <Reports />
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
        <Route
          path="access-log"
          element={
            <PermissionRoute permissions={PERMISSIONS.SECURITY_VIEW_ACCESS_LOG}>
              <SecurityAccessLog />
            </PermissionRoute>
          }
        />
        <Route
          path="visitors"
          element={
            <PermissionRoute permissions={PERMISSIONS.SECURITY_MANAGE_VISITORS}>
              <AdminVisits />
            </PermissionRoute>
          }
        />
        <Route
          path="access-control"
          element={
            <PermissionRoute permissions={PERMISSIONS.SECURITY_MANAGE_ACCESS_CONTROL}>
              <SecurityAccessControl />
            </PermissionRoute>
          }
        />
        <Route
          path="cameras"
          element={
            <PermissionRoute permissions={PERMISSIONS.SECURITY_VIEW_CAMERAS}>
              <SecurityCameras />
            </PermissionRoute>
          }
        />
        <Route
          path="incidents"
          element={
            <PermissionRoute permissions={[PERMISSIONS.INCIDENTS_VIEW, PERMISSIONS.INCIDENTS_CREATE]}>
              <Incidents />
            </PermissionRoute>
          }
        />
      </Route>

      {/* Protected routes - Maintenance */}
      <Route
        path="/maintenance"
        element={
          !isAuthenticated ? (
            <Navigate to="/auth/login" replace />
          ) : isMaintenanceProfile ? (
            <MaintenanceLayout />
          ) : (
            <Navigate to="/unauthorized" replace />
          )
        }
      >
        <Route index element={<MaintenanceDashboard />} />
        <Route path="dashboard" element={<MaintenanceDashboard />} />
        <Route
          path="incidents"
          element={
            <PermissionRoute permissions={PERMISSIONS.INCIDENTS_VIEW}>
              <MaintenanceIncidents />
            </PermissionRoute>
          }
        />
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

      {/* Protected routes - Provider */}
      <Route
        path="/provider"
        element={
          !isAuthenticated ? (
            <Navigate to="/auth/login" replace />
          ) : isProviderProfile ? (
            <ProviderLayout />
          ) : (
            <Navigate to="/unauthorized" replace />
          )
        }
      >
        <Route index element={<ProviderDashboard />} />
        <Route path="dashboard" element={<ProviderDashboard />} />
      </Route>

      {/* Protected routes - Cleaning */}
      <Route
        path="/cleaning"
        element={
          !isAuthenticated ? (
            <Navigate to="/auth/login" replace />
          ) : isCleaningProfile ? (
            <CleaningLayout />
          ) : (
            <Navigate to="/unauthorized" replace />
          )
        }
      >
        <Route index element={<CleaningDashboard />} />
        <Route path="dashboard" element={<CleaningDashboard />} />
        <Route
          path="incidents"
          element={
            <PermissionRoute permissions={PERMISSIONS.INCIDENTS_VIEW}>
              <MaintenanceIncidents />
            </PermissionRoute>
          }
        />
        <Route path="new-incident" element={<NewIncident />} />
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
        <Route path="visits/:id/edit" element={<EditVisit />} />
        <Route path="procedures" element={<ResidentProcedures />} />
        <Route path="communications" element={<ResidentCommunications />} />
      </Route>

      {/* Root redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            user?.role === 'superadmin' ? (
              <Navigate to="/superadmin" replace />
            ) : isSubAdminProfile ? (
              <Navigate to="/subadmin" replace />
            ) : isAdminProfile ? (
              <Navigate to="/admin" replace />
            ) : user?.role === 'security' ? (
              <Navigate to="/security" replace />
            ) : user?.role === 'maintenance' ? (
              <Navigate to="/maintenance" replace />
            ) : user?.role === 'provider' ? (
              <Navigate to="/provider" replace />
            ) : user?.role === 'cleaning' ? (
              <Navigate to="/cleaning" replace />
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
    </Suspense>
  )
}

export default App
