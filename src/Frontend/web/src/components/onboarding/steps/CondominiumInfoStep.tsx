import { useEffect, useState } from 'react'
import { Building2, MapPin, Plus, X, ChevronLeft, AlertCircle } from 'lucide-react'
import { geoCatalogService, type CountryCatalogItem, type StateCatalogItem } from '../../../lib/geoCatalogService'

interface CondominiumInfoStepProps {
  data: {
    name: string
    address: string
    city: string
    state: string
    stateId?: string
    zipCode: string
    country?: string
    countryId?: string
    sections?: string[]
  }
  onUpdate: (data: any) => void
  onNext: () => void
  onBack?: () => void
}

export default function CondominiumInfoStep({ data, onUpdate, onNext, onBack }: CondominiumInfoStepProps) {
  const [formData, setFormData] = useState(data)
  const [newSection, setNewSection] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [countries, setCountries] = useState<CountryCatalogItem[]>([])
  const [states, setStates] = useState<StateCatalogItem[]>([])

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const result = await geoCatalogService.getCountries()
        setCountries(result)

        if (!formData.countryId && result.length > 0) {
          const mexico = result.find(c => c.code === 'MX') || result[0]
          setFormData(prev => ({ ...prev, countryId: mexico.id, country: mexico.name }))
        }
      } catch {
        setCountries([])
      }
    }

    loadCountries()
  }, [])

  useEffect(() => {
    const loadStates = async () => {
      if (!formData.countryId) {
        setStates([])
        return
      }

      try {
        const result = await geoCatalogService.getStates(formData.countryId)
        setStates(result)
      } catch {
        setStates([])
      }
    }

    loadStates()
  }, [formData.countryId])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const addSection = () => {
    if (newSection.trim()) {
      setFormData(prev => ({
        ...prev,
        sections: [...(prev.sections || []), newSection.trim()]
      }))
      setNewSection('')
    }
  }

  const removeSection = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections?.filter((_, i) => i !== index)
    }))
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name) newErrors.name = 'Nombre del condominio requerido'
    if (!formData.address) newErrors.address = 'Dirección requerida'
    if (!formData.city) newErrors.city = 'Ciudad requerida'
    if (!formData.countryId) newErrors.country = 'País requerido'
    if (states.length > 0 && !formData.stateId) newErrors.state = 'Estado requerido'
    if (states.length === 0 && !formData.state?.trim()) newErrors.state = 'Estado / provincia requerido'
    if (!formData.zipCode) newErrors.zipCode = 'Código postal requerido'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onUpdate(formData)
      onNext()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Información del Condominio
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Proporciona los datos básicos de tu condominio
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Nombre del Condominio *
        </label>
        <div className="relative">
          <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
            placeholder="Ej: Residencial Los Pinos"
          />
        </div>
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Dirección *
        </label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
            placeholder="Calle, número, colonia"
          />
        </div>
        {errors.address && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.address}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ciudad *
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
            placeholder="Ciudad"
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.city}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            País *
          </label>
          <select
            value={formData.countryId || ''}
            onChange={(e) => {
              const selected = countries.find(c => c.id === e.target.value)
              const nextCountryId = e.target.value
              setFormData(prev => ({
                ...prev,
                countryId: nextCountryId,
                country: selected?.name || prev.country || 'México',
                stateId: '',
                state: ''
              }))
              setErrors(prev => ({ ...prev, country: '', state: '' }))
            }}
            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
          >
            <option value="">Selecciona país</option>
            {countries.map(country => (
              <option key={country.id} value={country.id}>{country.name}</option>
            ))}
          </select>
          {errors.country && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.country}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Estado {states.length > 0 ? '*' : ''}
          </label>
          {states.length > 0 ? (
            <select
              value={formData.stateId || ''}
              onChange={(e) => {
                const selected = states.find(s => s.id === e.target.value)
                setFormData(prev => ({ ...prev, stateId: e.target.value, state: selected?.name || '' }))
                setErrors(prev => ({ ...prev, state: '' }))
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
              disabled={!formData.countryId}
            >
              <option value="">Selecciona estado</option>
              {states.map(state => (
                <option key={state.id} value={state.id}>{state.name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={formData.state || ''}
              onChange={(e) => handleChange('state', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
              placeholder="Estado / provincia"
              disabled={!formData.countryId}
            />
          )}
          {errors.state && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.state}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            C.P. *
          </label>
          <input
            type="text"
            value={formData.zipCode}
            onChange={(e) => handleChange('zipCode', e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
            placeholder="00000"
          />
          {errors.zipCode && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.zipCode}
            </p>
          )}
        </div>
      </div>

      {/* Sections (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Secciones (Opcional)
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Si tu condominio tiene secciones o etapas, agrégalas aquí
        </p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSection())}
            className="flex-1 px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
            placeholder="Ej: Sección A, Etapa 1, Torre Norte"
          />
          <button
            type="button"
            onClick={addSection}
            className="px-4 py-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {formData.sections && formData.sections.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.sections.map((section, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 px-3 py-1.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-lg"
              >
                <span className="text-sm font-medium">{section}</span>
                <button
                  type="button"
                  onClick={() => removeSection(index)}
                  className="text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center space-x-2 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:border-gray-400 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Atrás</span>
        </button>
        <button
          type="submit"
          className="px-8 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-sky-500/30 transition-all"
        >
          Continuar
        </button>
      </div>
    </form>
  )
}
