import { useState } from 'react'
import { Link2, Mail, User, Check, ChevronLeft, Copy, CheckCircle, Loader2, AlertCircle } from 'lucide-react'

interface Building {
  id: string
  name: string
  type: 'vertical' | 'horizontal'
  section?: string
  numberOfUnits: number
  units: Array<{
    number: string
    floor?: number
    isCommercial: boolean
  }>
}

interface Resident {
  unitId: string
  email: string
  firstName: string
  lastName: string
  isOwner: boolean
}

interface ResidentInvitationStepProps {
  buildings: Building[]
  invitationMethod: 'manual' | 'link'
  residents?: Resident[]
  onUpdate: (data: { invitationMethod: 'manual' | 'link'; residents?: Resident[] }) => void
  onFinish: () => void
  onBack: () => void
  isSubmitting?: boolean
  submitError?: string | null
}

export default function ResidentInvitationStep({
  buildings,
  invitationMethod,
  residents,
  onUpdate,
  onFinish,
  onBack,
  isSubmitting = false,
  submitError = null
}: ResidentInvitationStepProps) {
  const [method, setMethod] = useState<'manual' | 'link'>(invitationMethod)
  const [residentsList, setResidentsList] = useState<Resident[]>(residents || [])
  const [showAddResident, setShowAddResident] = useState(false)
  const [newResident, setNewResident] = useState({
    unitId: '',
    email: '',
    firstName: '',
    lastName: '',
    isOwner: true
  })
  const [linkCopied, setLinkCopied] = useState(false)

  // Generate registration link
  const registrationLink = `${window.location.origin}/register/resident?token=CONDOMINIO_TOKEN_123`

  const copyLink = () => {
    navigator.clipboard.writeText(registrationLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const allUnits = buildings.flatMap(building =>
    building.units.map(unit => ({
      id: `${building.id}-${unit.number}`,
      label: `${building.name} - Unidad ${unit.number}${unit.isCommercial ? ' (Comercial)' : ''}`,
      buildingId: building.id,
      unitNumber: unit.number
    }))
  )

  const addResident = () => {
    if (!newResident.unitId || !newResident.email || !newResident.firstName || !newResident.lastName) {
      alert('Por favor completa todos los campos')
      return
    }

    setResidentsList([...residentsList, newResident])
    setNewResident({
      unitId: '',
      email: '',
      firstName: '',
      lastName: '',
      isOwner: true
    })
    setShowAddResident(false)
  }

  const removeResident = (index: number) => {
    setResidentsList(residentsList.filter((_, i) => i !== index))
  }

  const handleMethodChange = (newMethod: 'manual' | 'link') => {
    setMethod(newMethod)
    onUpdate({ invitationMethod: newMethod, residents: residentsList })
  }

  const handleFinish = () => {
    onUpdate({ invitationMethod: method, residents: method === 'manual' ? residentsList : [] })
    onFinish()
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Invitar Residentes
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Elige cómo deseas que los residentes se registren en la plataforma
        </p>
      </div>

      {/* Method Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onClick={() => handleMethodChange('link')}
          className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
            method === 'link'
              ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 shadow-lg shadow-sky-500/30'
              : 'border-gray-200 dark:border-gray-700 hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              method === 'link'
                ? 'bg-gradient-to-br from-sky-500 to-blue-600'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <Link2 className={`w-6 h-6 ${method === 'link' ? 'text-white' : 'text-gray-400'}`} />
            </div>
            {method === 'link' && (
              <div className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Link de Auto-registro
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Comparte un enlace único para que los residentes se registren por sí mismos
          </p>
        </div>

        <div
          onClick={() => handleMethodChange('manual')}
          className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
            method === 'manual'
              ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 shadow-lg shadow-sky-500/30'
              : 'border-gray-200 dark:border-gray-700 hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              method === 'manual'
                ? 'bg-gradient-to-br from-sky-500 to-blue-600'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <Mail className={`w-6 h-6 ${method === 'manual' ? 'text-white' : 'text-gray-400'}`} />
            </div>
            {method === 'manual' && (
              <div className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Invitación Manual
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Registra manualmente a los residentes y envía invitaciones por correo
          </p>
        </div>
      </div>

      {/* Link Method */}
      {method === 'link' && (
        <div className="p-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            Tu Link de Auto-registro
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Comparte este enlace con tus residentes. Ellos podrán registrarse y seleccionar su unidad.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={registrationLink}
              readOnly
              className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-mono text-sm"
            />
            <button
              onClick={copyLink}
              className="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center space-x-2"
            >
              {linkCopied ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            <strong>Nota:</strong> Los residentes deberán verificar su identidad y seleccionar su unidad durante el registro.
          </p>
        </div>
      )}

      {/* Manual Method */}
      {method === 'manual' && (
        <div className="space-y-4">
          {residentsList.length > 0 && (
            <div className="space-y-3">
              {residentsList.map((resident, index) => {
                const unit = allUnits.find(u => u.id === resident.unitId)
                return (
                  <div
                    key={index}
                    className="p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {resident.firstName} {resident.lastName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {resident.email} • {unit?.label} • {resident.isOwner ? 'Propietario' : 'Inquilino'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeResident(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {showAddResident ? (
            <div className="p-6 bg-sky-50 dark:bg-sky-900/20 border-2 border-sky-200 dark:border-sky-800 rounded-2xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={newResident.firstName}
                    onChange={(e) => setNewResident({ ...newResident, firstName: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    value={newResident.lastName}
                    onChange={(e) => setNewResident({ ...newResident, lastName: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Pérez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={newResident.email}
                  onChange={(e) => setNewResident({ ...newResident, email: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="residente@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unidad *
                </label>
                <select
                  value={newResident.unitId}
                  onChange={(e) => setNewResident({ ...newResident, unitId: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Selecciona una unidad</option>
                  {allUnits.map(unit => (
                    <option key={unit.id} value={unit.id}>{unit.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isOwner"
                  checked={newResident.isOwner}
                  onChange={(e) => setNewResident({ ...newResident, isOwner: e.target.checked })}
                  className="w-4 h-4 text-sky-500 border-gray-300 rounded focus:ring-sky-500"
                />
                <label htmlFor="isOwner" className="text-sm text-gray-700 dark:text-gray-300">
                  Es propietario (desmarcar si es inquilino)
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={addResident}
                  className="flex-1 px-4 py-2 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition-colors"
                >
                  Agregar Residente
                </button>
                <button
                  onClick={() => setShowAddResident(false)}
                  className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:border-gray-400 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddResident(true)}
              className="w-full px-6 py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-2xl font-semibold hover:border-sky-500 hover:text-sky-600 transition-all flex items-center justify-center space-x-2"
            >
              <Mail className="w-5 h-5" />
              <span>Agregar Residente</span>
            </button>
          )}
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-600 dark:text-red-400 text-sm">{submitError}</p>
        </div>
      )}

      <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center space-x-2 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Atrás</span>
        </button>
        <button
          onClick={handleFinish}
          disabled={isSubmitting}
          className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all flex items-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Finalizar Configuración</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
