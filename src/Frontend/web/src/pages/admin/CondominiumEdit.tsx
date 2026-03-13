import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Building2, MapPin, FileText } from 'lucide-react'
import { condominiumService } from '../../lib/condominiumService'
import { geoCatalogService, type CountryCatalogItem, type StateCatalogItem } from '../../lib/geoCatalogService'

function getApiErrorMessage(error: any): string {
  const payload = error?.response?.data
  const directMessage = payload?.message || payload?.error || error?.message

  if (directMessage && typeof directMessage === 'string') {
    return directMessage
  }

  if (payload?.errors && typeof payload.errors === 'object') {
    const first = Object.values(payload.errors).flat()[0]
    if (typeof first === 'string' && first.trim()) {
      return first
    }
  }

  return 'Error al guardar cambios'
}

export default function CondominiumEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [countries, setCountries] = useState<CountryCatalogItem[]>([])
  const [states, setStates] = useState<StateCatalogItem[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [condoName, setCondoName] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    street: '',
    city: '',
    state: '',
    stateId: '',
    postalCode: '',
    country: 'México',
    countryId: ''
  })

  useEffect(() => {
    loadCountries()
  }, [])

  useEffect(() => {
    if (id) {
      loadCondominium()
    }
  }, [id])

  useEffect(() => {
    const loadStates = async () => {
      if (!formData.countryId) {
        setStates([])
        return
      }

      try {
        const response = await geoCatalogService.getStates(formData.countryId)
        setStates(response)
      } catch {
        setStates([])
      }
    }

    loadStates()
  }, [formData.countryId])

  const loadCountries = async () => {
    try {
      const response = await geoCatalogService.getCountries()
      setCountries(response)
    } catch {
      setCountries([])
    }
  }

  const loadCondominium = async () => {
    try {
      const data = await condominiumService.getCondominiumById(id!)
      setCondoName(data.name)
      setFormData({
        name: data.name,
        description: data.description || '',
        street: data.street,
        city: data.city,
        state: data.state,
        stateId: data.stateId || '',
        postalCode: data.postalCode,
        country: data.country || 'México',
        countryId: data.countryId || ''
      })
    } catch (error) {
      console.error('Failed to load condominium', error)
      setFormError('Error cargando el condominio')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    if (!formData.countryId) {
      setFormError('Selecciona un país válido')
      return false
    }

    if (states.length > 0 && !formData.stateId) {
      setFormError('Selecciona un estado para el país elegido')
      return false
    }

    if (!formData.state.trim()) {
      setFormError('El estado o provincia es obligatorio')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!validateForm()) {
      return
    }

    setSaving(true)
    try {
      await condominiumService.updateCondominium(id!, {
        name: formData.name,
        description: formData.description || undefined,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        stateId: formData.stateId || undefined,
        postalCode: formData.postalCode,
        country: formData.country,
        countryId: formData.countryId
      })
      navigate(`/admin/condominiums/${id}`)
    } catch (error: any) {
      console.error('Failed to update condominium', error)
      setFormError(getApiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleCountryChange = (value: string) => {
    const selected = countries.find(c => c.id === value)
    setFormData(prev => ({
      ...prev,
      countryId: value,
      country: selected?.name || prev.country,
      state: '',
      stateId: ''
    }))
    setFormError(null)
  }

  const handleStateChange = (value: string) => {
    const selected = states.find(s => s.id === value)
    setFormData(prev => ({
      ...prev,
      stateId: value,
      state: selected?.name || ''
    }))
    setFormError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(`/admin/condominiums/${id}`)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Editar Condominio</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{condoName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 px-4 py-3">
            {formError}
          </div>
        )}

        {/* Basic Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Información General</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Datos básicos del condominio</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nombre del Condominio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej: Residencial Las Palmas"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  Descripción
                </div>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Descripción opcional del condominio..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* Address Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Ubicación</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Dirección completa del condominio</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Calle y Número <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="street"
                required
                value={formData.street}
                onChange={handleChange}
                placeholder="Ej: Av. Paseo de la Reforma 500"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ciudad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Ej: Ciudad de México"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  País <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.countryId}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">Selecciona país</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.id}>{country.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estado / Provincia <span className="text-red-500">*</span>
                </label>
                {states.length > 0 ? (
                  <select
                    required
                    value={formData.stateId}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Selecciona estado</option>
                    {states.map(state => (
                      <option key={state.id} value={state.id}>{state.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="state"
                    required
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Ej: CDMX"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                )}
              </div>
            </div>

            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Código Postal <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="postalCode"
                required
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="Ej: 06600"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(`/admin/condominiums/${id}`)}
            className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
