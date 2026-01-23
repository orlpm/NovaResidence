import { useState, useEffect } from 'react'
import { User, UserPlus, Mail, Phone, Edit, Trash2, Send, X, Check, Copy } from 'lucide-react'
import { residentService, ResidentDto, CreateResidentRequest } from '../lib/residentService'

interface ResidentsSectionProps {
  unitId: string
  unitNumber: string
  buildingName?: string
  condominiumName?: string
}

type ResidentType = 'Owner' | 'Tenant' | 'FamilyMember' | 'Authorized'

const RESIDENT_TYPE_LABELS: Record<ResidentType, string> = {
  Owner: 'Propietario',
  Tenant: 'Inquilino',
  FamilyMember: 'Familiar',
  Authorized: 'Autorizado'
}

const RESIDENT_TYPE_COLORS: Record<ResidentType, string> = {
  Owner: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300',
  Tenant: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
  FamilyMember: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300',
  Authorized: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300'
}

export default function ResidentsSection({ unitId, unitNumber, buildingName, condominiumName }: ResidentsSectionProps) {
  const [residents, setResidents] = useState<ResidentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedResident, setSelectedResident] = useState<ResidentDto | null>(null)
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null)
  const [formData, setFormData] = useState<{
    firstName: string
    lastName: string
    email: string
    phoneNumber: string
    type: ResidentType
  }>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    type: 'Owner'
  })

  useEffect(() => {
    loadResidents()
  }, [unitId])

  const loadResidents = async () => {
    try {
      setLoading(true)
      const data = await residentService.getResidentsByUnit(unitId)
      setResidents(data)
    } catch (error) {
      console.error('Error loading residents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddResident = async () => {
    try {
      await residentService.createResident({
        unitId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber || undefined,
        type: formData.type
      })
      await loadResidents()
      setShowAddModal(false)
      resetForm()
    } catch (error) {
      console.error('Error creating resident:', error)
      alert('Error al crear el residente')
    }
  }

  const handleUpdateResident = async () => {
    if (!selectedResident) return
    try {
      await residentService.updateResident(selectedResident.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        type: formData.type
      })
      await loadResidents()
      setShowEditModal(false)
      setSelectedResident(null)
      resetForm()
    } catch (error) {
      console.error('Error updating resident:', error)
      alert('Error al actualizar el residente')
    }
  }

  const handleDeleteResident = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este residente?')) return
    try {
      await residentService.deleteResident(id)
      await loadResidents()
    } catch (error) {
      console.error('Error deleting resident:', error)
      alert('Error al eliminar el residente')
    }
  }

  const handleSendInvitation = async (resident: ResidentDto) => {
    try {
      const result = await residentService.sendInvitation(resident.id)
      // Backend already returns full URL
      setInvitationUrl(result.invitationUrl)
    } catch (error) {
      console.error('Error sending invitation:', error)
      alert('Error al generar la invitación')
    }
  }

  const copyInvitationUrl = () => {
    if (invitationUrl) {
      navigator.clipboard.writeText(invitationUrl)
      alert('Enlace copiado al portapapeles')
    }
  }

  const openEditModal = (resident: ResidentDto) => {
    setSelectedResident(resident)
    setFormData({
      firstName: resident.firstName,
      lastName: resident.lastName,
      email: resident.email,
      phoneNumber: resident.phoneNumber,
      type: resident.type as ResidentType
    })
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      type: 'Owner'
    })
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <User className="w-5 h-5" />
          Residentes
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Agregar</span>
        </button>
      </div>

      {/* Residents List */}
      {residents.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-3">No hay residentes registrados</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            + Agregar primer residente
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {residents.map(resident => (
            <div 
              key={resident.id}
              className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {resident.firstName} {resident.lastName}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${RESIDENT_TYPE_COLORS[resident.type as ResidentType]}`}>
                      {RESIDENT_TYPE_LABELS[resident.type as ResidentType]}
                    </span>
                    {resident.isRegistered && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded-full">
                        <Check className="w-3 h-3" />
                        Registrado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {resident.email}
                    </span>
                    {resident.phoneNumber && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {resident.phoneNumber}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!resident.isRegistered && (
                    <button
                      onClick={() => handleSendInvitation(resident)}
                      className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                      title="Enviar invitación"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(resident)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteResident(resident.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {showAddModal ? 'Agregar Residente' : 'Editar Residente'}
              </h3>
              <button 
                onClick={() => { setShowAddModal(false); setShowEditModal(false); setSelectedResident(null); resetForm(); }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Juan"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Apellido <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Pérez"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Correo electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="juan@ejemplo.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="55 1234 5678"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de residente <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ResidentType })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Owner">Propietario</option>
                  <option value="Tenant">Inquilino</option>
                  <option value="FamilyMember">Familiar</option>
                  <option value="Authorized">Autorizado</option>
                </select>
              </div>

              {/* Info box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>💡 Tip:</strong> Después de agregar el residente, podrás enviarle una invitación 
                  para que se registre en la plataforma. Solo necesitarás compartir el enlace.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); setSelectedResident(null); resetForm(); }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={showAddModal ? handleAddResident : handleUpdateResident}
                disabled={!formData.firstName || !formData.lastName || !formData.email}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
              >
                {showAddModal ? 'Agregar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitation URL Modal */}
      {invitationUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Enlace de Invitación
              </h3>
              <button 
                onClick={() => setInvitationUrl(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Comparte este enlace con el residente para que pueda registrarse:
              </p>
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={invitationUrl}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                <button
                  onClick={copyInvitationUrl}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </button>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>⚠️ Importante:</strong> Este enlace expira en 7 días. 
                  El residente deberá completar su registro usando sus datos de contacto.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
              <button
                onClick={() => setInvitationUrl(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
