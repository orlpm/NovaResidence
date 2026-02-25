import { useEffect, useMemo, useState } from 'react'
import { Shield, Wrench, Sparkles, Plus, RefreshCw, Pencil, Trash2, UserCheck, UserX, X } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import {
  userManagementService,
  type StaffUserItem,
  type CreateStaffUserRequest,
  type UpdateStaffUserRequest
} from '../../lib/userManagementService'

type StaffRole = CreateStaffUserRequest['role']
type FormState = {
  email: string
  password: string
  firstName: string
  lastName: string
  phoneNumber: string
  role: '' | StaffRole
  condominiumId: string
}

const STAFF_ROLES: Array<{ value: StaffRole; label: string; icon: React.ElementType }> = [
  { value: 'Maintenance', label: 'Mantenimiento', icon: Wrench },
  { value: 'SecurityGuard', label: 'Vigilancia', icon: Shield },
  { value: 'Cleaning', label: 'Limpieza', icon: Sparkles }
]

const ROLE_LABELS: Record<string, string> = {
  Maintenance: 'Mantenimiento',
  SecurityGuard: 'Vigilancia',
  Cleaning: 'Limpieza'
}

const EMPTY_FORM: FormState = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  role: '',
  condominiumId: ''
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidPhone(phone: string) {
  if (!phone.trim()) return true
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

export default function StaffManagement() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'superadmin' || user?.defaultRole === 'SuperAdmin'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [staffUsers, setStaffUsers] = useState<StaffUserItem[]>([])
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominiumId, setSelectedCondominiumId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingUser, setEditingUser] = useState<StaffUserItem | null>(null)

  const loadCondominiums = async () => {
    try {
      const data = isSuperAdmin
        ? await condominiumService.getAllCondominiums()
        : await condominiumService.getAllCondominiums(user?.id)

      setCondominiums(data)
    } catch {
      setError('Error al cargar condominios')
    }
  }

  const loadStaffUsers = async (condominiumId?: string) => {
    try {
      const data = await userManagementService.getStaffUsers(condominiumId)
      setStaffUsers(data)
    } catch {
      setError('Error al cargar personal operativo')
    }
  }

  useEffect(() => {
    const initialize = async () => {
      setLoading(true)
      await loadCondominiums()
      setLoading(false)
    }
    initialize()
  }, [user?.id])

  useEffect(() => {
    if (!selectedCondominiumId) {
      setStaffUsers([])
      return
    }
    loadStaffUsers(selectedCondominiumId)
  }, [selectedCondominiumId])

  const validateForm = (currentForm: FormState, isEdit = false) => {
    if (!currentForm.firstName.trim() || !currentForm.lastName.trim()) {
      setError('Nombre y apellido son obligatorios')
      return false
    }

    if (!isEdit) {
      if (!currentForm.email.trim()) {
        setError('El correo es obligatorio')
        return false
      }

      if (!EMAIL_REGEX.test(currentForm.email.trim())) {
        setError('Ingresa un correo válido')
        return false
      }

      if (!currentForm.password.trim() || currentForm.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres')
        return false
      }
    }

    if (!isValidPhone(currentForm.phoneNumber)) {
      setError('Ingresa un número de teléfono válido (10 a 15 dígitos)')
      return false
    }

    if (!currentForm.role) {
      setError('Selecciona un rol operativo')
      return false
    }

    const effectiveCondoId = isSuperAdmin ? currentForm.condominiumId : (currentForm.condominiumId || selectedCondominiumId)
    if (!effectiveCondoId) {
      setError('Selecciona un condominio')
      return false
    }

    return true
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingUser(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!validateForm(form, false)) return

    const payload: CreateStaffUserRequest = {
      email: form.email.trim(),
      password: form.password,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phoneNumber: form.phoneNumber.trim() || undefined,
      role: form.role as StaffRole,
      condominiumId: isSuperAdmin ? form.condominiumId : (form.condominiumId || selectedCondominiumId)
    }

    setSaving(true)
    try {
      const result = await userManagementService.createStaffUser(payload)
      setSuccess(result.message)
      resetForm()
      await loadStaffUsers(selectedCondominiumId || payload.condominiumId)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo crear el usuario')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (staff: StaffUserItem) => {
    const firstRole = staff.condominiumRoles[0]
    setEditingUser(staff)
    setForm({
      email: staff.email,
      password: '',
      firstName: staff.firstName,
      lastName: staff.lastName,
      phoneNumber: staff.phoneNumber || '',
      role: (staff.defaultRole as StaffRole) || '',
      condominiumId: firstRole?.condominiumId || selectedCondominiumId
    })
    setError(null)
    setSuccess(null)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setError(null)
    setSuccess(null)

    if (!validateForm(form, true)) return

    const payload: UpdateStaffUserRequest = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phoneNumber: form.phoneNumber.trim() || undefined,
      role: form.role as StaffRole,
      condominiumId: isSuperAdmin ? form.condominiumId : (form.condominiumId || selectedCondominiumId)
    }

    setSaving(true)
    try {
      const result = await userManagementService.updateStaffUser(editingUser.id, payload)
      setSuccess(result.message)
      resetForm()
      await loadStaffUsers(selectedCondominiumId || payload.condominiumId)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo actualizar el usuario')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (staff: StaffUserItem) => {
    setError(null)
    setSuccess(null)
    try {
      const result = staff.isActive
        ? await userManagementService.deactivateStaffUser(staff.id)
        : await userManagementService.activateStaffUser(staff.id)
      setSuccess(result.message)
      await loadStaffUsers(selectedCondominiumId)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo actualizar el estado')
    }
  }

  const handleDelete = async (staff: StaffUserItem) => {
    const confirmed = window.confirm(`¿Eliminar a ${staff.firstName} ${staff.lastName}?`)
    if (!confirmed) return

    setError(null)
    setSuccess(null)
    try {
      const result = await userManagementService.deleteStaffUser(staff.id)
      setSuccess(result.message)
      await loadStaffUsers(selectedCondominiumId)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el usuario')
    }
  }

  const staffCountByRole = useMemo(() => ({
    maintenance: staffUsers.filter((s) => s.defaultRole === 'Maintenance').length,
    security: staffUsers.filter((s) => s.defaultRole === 'SecurityGuard').length,
    cleaning: staffUsers.filter((s) => s.defaultRole === 'Cleaning').length
  }), [staffUsers])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Personal Operativo</h1>
          <p className="text-gray-600 dark:text-gray-400">Alta de mantenimiento, vigilancia y limpieza</p>
        </div>
        <button
          onClick={() => loadStaffUsers(selectedCondominiumId)}
          disabled={!selectedCondominiumId}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {error && <div className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">{error}</div>}
      {success && <div className="p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">{success}</div>}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Condominio</label>
        <select
          value={selectedCondominiumId}
          onChange={(e) => setSelectedCondominiumId(e.target.value)}
          className="w-full md:w-96 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Selecciona un condominio</option>
          {condominiums.map((condo) => (
            <option key={condo.id} value={condo.id}>{condo.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Mantenimiento" value={staffCountByRole.maintenance} icon={Wrench} />
        <StatCard label="Vigilancia" value={staffCountByRole.security} icon={Shield} />
        <StatCard label="Limpieza" value={staffCountByRole.cleaning} icon={Sparkles} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingUser ? 'Editar personal operativo' : 'Dar de alta personal'}
          </h2>
          {editingUser && (
            <button onClick={resetForm} className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              <X className="w-4 h-4" /> Cancelar edición
            </button>
          )}
        </div>
        <form onSubmit={editingUser ? handleUpdate : handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input placeholder="Nombre" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          <input placeholder="Apellido" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          {!editingUser && (
            <>
              <input type="email" placeholder="Correo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <input type="password" autoComplete="new-password" placeholder="Contraseña temporal" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </>
          )}
          <input placeholder="Teléfono" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as FormState['role'] })} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">Selecciona rol</option>
            {STAFF_ROLES.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>

          {(isSuperAdmin || editingUser) && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condominio para este usuario</label>
              <select value={form.condominiumId} onChange={(e) => setForm({ ...form, condominiumId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="">Selecciona un condominio</option>
                {condominiums.map((condo) => (
                  <option key={condo.id} value={condo.id}>{condo.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg disabled:opacity-50">
              <Plus className="w-4 h-4" /> {saving ? 'Guardando...' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Personal registrado</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Cargando...</div>
        ) : !selectedCondominiumId ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Selecciona un condominio para ver el personal</div>
        ) : staffUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No hay personal registrado para este condominio</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Correo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Asignaciones</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {staffUsers.map((staff) => (
                  <tr key={staff.id}>
                    <td className="px-6 py-3 text-sm text-gray-900 dark:text-gray-100">{staff.firstName} {staff.lastName}</td>
                    <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">{staff.email}</td>
                    <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">{ROLE_LABELS[staff.defaultRole] || staff.defaultRole}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${staff.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {staff.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {staff.assignedTasksCount > 0
                        ? `${staff.assignedTasksCount} ${staff.assignedTasksCount === 1 ? 'tarea asignada' : 'tareas asignadas'}`
                        : 'Sin tareas asignadas'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => startEdit(staff)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Editar">
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </button>
                        <button onClick={() => handleToggleActive(staff)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title={staff.isActive ? 'Dar de baja' : 'Dar de alta'}>
                          {staff.isActive ? <UserX className="w-4 h-4 text-orange-600" /> : <UserCheck className="w-4 h-4 text-green-600" />}
                        </button>
                        <button onClick={() => handleDelete(staff)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Eliminar">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <Icon className="w-6 h-6 text-sky-500" />
      </div>
    </div>
  )
}
