import { useEffect, useState } from 'react'
import { Save, Server, RefreshCw } from 'lucide-react'
import { superAdminService, type SystemSettingsDto } from '../../lib/superAdminService'

export default function SystemSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState<SystemSettingsDto | null>(null)

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await superAdminService.getSystemSettings()
      setForm(data)
    } catch {
      setError('No se pudo cargar la configuración del sistema')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async () => {
    if (!form) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      const updated = await superAdminService.updateSystemSettings({
        maintenanceMode: form.maintenanceMode,
        enableNewRegistrations: form.enableNewRegistrations,
        sessionTimeoutMinutes: Number(form.sessionTimeoutMinutes),
        supportEmail: form.supportEmail,
        defaultTimeZone: form.defaultTimeZone,
        announcementBanner: form.announcementBanner
      })
      setForm(updated)
      setSuccess('Configuración guardada correctamente')
    } catch {
      setError('No se pudo guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Server className="w-8 h-8 text-blue-400" />
            Configuración del Sistema
          </h1>
          <p className="text-gray-400 mt-1">Parámetros globales operativos de la plataforma</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadSettings}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Recargar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300">{error}</div>}
      {success && <div className="p-3 rounded-lg bg-green-900/30 border border-green-700 text-green-300">{success}</div>}

      {loading && <div className="text-gray-300">Cargando configuración...</div>}

      {form && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm text-gray-300 space-y-1">
              <span>Email de soporte</span>
              <input
                type="email"
                value={form.supportEmail}
                onChange={e => setForm(prev => prev ? { ...prev, supportEmail: e.target.value } : prev)}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
              />
            </label>

            <label className="text-sm text-gray-300 space-y-1">
              <span>Zona horaria por defecto</span>
              <input
                type="text"
                value={form.defaultTimeZone}
                onChange={e => setForm(prev => prev ? { ...prev, defaultTimeZone: e.target.value } : prev)}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                placeholder="America/Mexico_City"
              />
            </label>

            <label className="text-sm text-gray-300 space-y-1">
              <span>Timeout de sesión (min)</span>
              <input
                type="number"
                min={5}
                max={1440}
                value={form.sessionTimeoutMinutes}
                onChange={e => setForm(prev => prev ? { ...prev, sessionTimeoutMinutes: Number(e.target.value) } : prev)}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
              />
            </label>

            <label className="text-sm text-gray-300 space-y-1">
              <span>Banner global</span>
              <input
                type="text"
                value={form.announcementBanner || ''}
                onChange={e => setForm(prev => prev ? { ...prev, announcementBanner: e.target.value } : prev)}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                placeholder="Mensaje opcional para todo el sistema"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.maintenanceMode}
                onChange={e => setForm(prev => prev ? { ...prev, maintenanceMode: e.target.checked } : prev)}
              />
              Modo mantenimiento
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.enableNewRegistrations}
                onChange={e => setForm(prev => prev ? { ...prev, enableNewRegistrations: e.target.checked } : prev)}
              />
              Permitir nuevos registros
            </label>
          </div>

          <div className="text-xs text-gray-500">
            Última actualización: {new Date(form.updatedAt).toLocaleString('es-MX')}
          </div>
        </div>
      )}
    </div>
  )
}
