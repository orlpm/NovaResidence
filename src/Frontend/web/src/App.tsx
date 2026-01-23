import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// Layouts
import AdminLayout from './layouts/AdminLayout'
import ResidentLayout from './layouts/ResidentLayout'
import AuthLayout from './layouts/AuthLayout'

// Pages - Admin
import AdminDashboard from './pages/admin/Dashboard'
import AdminOnboarding from './pages/admin/Onboarding'
import Condominiums from './pages/admin/Condominiums'
import CondominiumDetails from './pages/admin/CondominiumDetails'
import CondominiumEdit from './pages/admin/CondominiumEdit'
import CondominiumUnits from './pages/admin/CondominiumUnits'
import Units from './pages/admin/Units'
import Residents from './pages/admin/Residents'
import Billing from './pages/admin/Billing'
import Incidents from './pages/admin/Incidents'
import Reports from './pages/admin/Reports'

// Pages - Resident
import ResidentDashboard from './pages/resident/Dashboard'
import MyUnit from './pages/resident/MyUnit'
import Payments from './pages/resident/Payments'
import ReservationsPage from './pages/resident/Reservations'
import MyIncidents from './pages/resident/MyIncidents'

// Pages - Auth
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import RegisterResident from './pages/RegisterResident'

// Pages - Public
import Home from './pages/Home'

function App() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <Routes>
      {/* Public home page */}
      <Route path="/home" element={<Home />} />
      
      {/* Resident registration with invitation token */}
      <Route path="/invitation/register/:unitId/:token" element={<RegisterResident />} />

      {/* Public routes */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>

      {/* Protected routes - Admin */}
      <Route
        path="/admin"
        element={
          isAuthenticated && user?.role === 'admin' ? (
            <AdminLayout />
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
        <Route path="billing" element={<Billing />} />
        <Route path="incidents" element={<Incidents />} />
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
        <Route path="incidents" element={<MyIncidents />} />
      </Route>

      {/* Root redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            user?.role === 'admin' ? (
              <Navigate to="/admin" replace />
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
