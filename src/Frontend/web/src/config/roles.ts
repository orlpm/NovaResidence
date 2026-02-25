import { Home, Building2, Shield, Wrench, Briefcase, Calculator, Users } from 'lucide-react';
import { PERMISSIONS } from './permissions';

export enum UserRole {
  SuperAdmin = 0,
  CondominiumAdmin = 1,
  SubAdmin = 2,
  Owner = 3,
  Tenant = 4,
  SecurityGuard = 5,
  Maintenance = 6,
  ServiceProvider = 7,
  Accountant = 8,
  Cleaning = 9
}

export const ROLE_CONFIG = {
  [UserRole.SuperAdmin]: {
    name: 'Super Administrador',
    icon: Shield,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    layout: '/admin'
  },
  [UserRole.CondominiumAdmin]: {
    name: 'Administrador',
    icon: Building2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    layout: '/admin'
  },
  [UserRole.SubAdmin]: {
    name: 'Sub-Administrador',
    icon: Users,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/20',
    layout: '/subadmin'
  },
  [UserRole.Owner]: {
    name: 'Propietario',
    icon: Home,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    layout: '/resident'
  },
  [UserRole.Tenant]: {
    name: 'Inquilino',
    icon: Home,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 dark:bg-teal-900/20',
    layout: '/resident'
  },
  [UserRole.SecurityGuard]: {
    name: 'Vigilancia',
    icon: Shield,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    layout: '/security'
  },
  [UserRole.Maintenance]: {
    name: 'Mantenimiento',
    icon: Wrench,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    layout: '/maintenance'
  },
  [UserRole.ServiceProvider]: {
    name: 'Proveedor',
    icon: Briefcase,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/20',
    layout: '/provider'
  },
  [UserRole.Accountant]: {
    name: 'Contador',
    icon: Calculator,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
    layout: '/accountant'
  },
  [UserRole.Cleaning]: {
    name: 'Limpieza',
    icon: Briefcase,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/20',
    layout: '/maintenance'
  }
};

// Navigation items per role
export const ROLE_NAVIGATION = {
  [UserRole.SuperAdmin]: [
    { name: 'Dashboard', path: '/admin/dashboard', icon: 'LayoutDashboard', permission: null },
    { name: 'Clientes', path: '/admin/clients', icon: 'Building2', permission: PERMISSIONS.PLATFORM_MANAGE_CLIENTS },
    { name: 'Permisos', path: '/admin/permissions', icon: 'Shield', permission: PERMISSIONS.PLATFORM_MANAGE_PERMISSIONS },
    { name: 'Configuración', path: '/admin/settings', icon: 'Settings', permission: PERMISSIONS.PLATFORM_SYSTEM_SETTINGS }
  ],
  [UserRole.CondominiumAdmin]: [
    { name: 'Dashboard', path: '/admin/dashboard', icon: 'LayoutDashboard', permission: null },
    { name: 'Residentes', path: '/admin/residents', icon: 'Users', permission: PERMISSIONS.RESIDENTS_VIEW },
    { name: 'Unidades', path: '/admin/units', icon: 'Home', permission: PERMISSIONS.SETTINGS_MANAGE_UNITS },
    { name: 'Facturación', path: '/admin/billing', icon: 'DollarSign', permission: PERMISSIONS.BILLING_VIEW },
    { name: 'Incidencias', path: '/admin/incidents', icon: 'AlertCircle', permission: PERMISSIONS.INCIDENTS_VIEW },
    { name: 'Comunicados', path: '/admin/communications', icon: 'MessageSquare', permission: PERMISSIONS.COMMUNICATIONS_VIEW_ANNOUNCEMENTS },
    { name: 'Reservaciones', path: '/admin/reservations', icon: 'Calendar', permission: PERMISSIONS.RESERVATIONS_VIEW },
    { name: 'Reportes', path: '/admin/reports', icon: 'FileText', permission: PERMISSIONS.REPORTS_VIEW },
    { name: 'Configuración', path: '/admin/settings', icon: 'Settings', permission: PERMISSIONS.SETTINGS_VIEW }
  ],
  [UserRole.SubAdmin]: [
    { name: 'Dashboard', path: '/subadmin/dashboard', icon: 'LayoutDashboard', permission: null },
    { name: 'Residentes', path: '/subadmin/residents', icon: 'Users', permission: PERMISSIONS.RESIDENTS_VIEW },
    { name: 'Facturación', path: '/subadmin/billing', icon: 'DollarSign', permission: PERMISSIONS.BILLING_VIEW },
    { name: 'Incidencias', path: '/subadmin/incidents', icon: 'AlertCircle', permission: PERMISSIONS.INCIDENTS_VIEW },
    { name: 'Comunicados', path: '/subadmin/communications', icon: 'MessageSquare', permission: PERMISSIONS.COMMUNICATIONS_VIEW_ANNOUNCEMENTS }
  ],
  [UserRole.SecurityGuard]: [
    { name: 'Dashboard', path: '/security/dashboard', icon: 'LayoutDashboard', permission: null },
    { name: 'Registro de Accesos', path: '/security/access-log', icon: 'ClipboardList', permission: PERMISSIONS.SECURITY_VIEW_ACCESS_LOG },
    { name: 'Visitantes', path: '/security/visitors', icon: 'Users', permission: PERMISSIONS.SECURITY_MANAGE_VISITORS },
    { name: 'Incidencias', path: '/security/incidents', icon: 'AlertCircle', permission: PERMISSIONS.INCIDENTS_CREATE }
  ],
  [UserRole.Maintenance]: [
    { name: 'Dashboard', path: '/maintenance/dashboard', icon: 'LayoutDashboard', permission: null },
    { name: 'Mis Incidencias', path: '/maintenance/incidents', icon: 'AlertCircle', permission: PERMISSIONS.INCIDENTS_VIEW },
    { name: 'Reportar Incidencia', path: '/maintenance/new-incident', icon: 'Plus', permission: PERMISSIONS.INCIDENTS_CREATE }
  ],
  [UserRole.Accountant]: [
    { name: 'Dashboard', path: '/accountant/dashboard', icon: 'LayoutDashboard', permission: null },
    { name: 'Facturación', path: '/accountant/billing', icon: 'DollarSign', permission: PERMISSIONS.BILLING_VIEW },
    { name: 'Reportes Financieros', path: '/accountant/reports', icon: 'FileText', permission: PERMISSIONS.REPORTS_FINANCIAL },
    { name: 'Cargos', path: '/accountant/charges', icon: 'Receipt', permission: PERMISSIONS.BILLING_CREATE_CHARGES }
  ],
  [UserRole.Cleaning]: [
    { name: 'Dashboard', path: '/maintenance/dashboard', icon: 'LayoutDashboard', permission: null },
    { name: 'Mis Incidencias', path: '/maintenance/incidents', icon: 'AlertCircle', permission: PERMISSIONS.INCIDENTS_VIEW },
    { name: 'Reportar Incidencia', path: '/maintenance/new-incident', icon: 'Plus', permission: PERMISSIONS.INCIDENTS_CREATE }
  ]
};
