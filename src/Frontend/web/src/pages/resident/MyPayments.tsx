import { useState, useEffect, useCallback } from 'react'
import { 
  Receipt, Upload, Search, Eye, Download, Calendar, 
  CreditCard, FileText, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle, XCircle, Image, X, Plus,
  Building2, DollarSign, Clock
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { 
  paymentProofService, 
  PaymentProofListDto, 
  PaymentProofStatus,
  PaymentMethod,
  paymentProofStatusNames,
  paymentMethodNames
} from '../../lib/paymentProofService'
import { 
  billingService, 
  ChargeListDto, 
  ChargeStatus
} from '../../lib/billingService'
import { residentService, ResidentWithUnitDto } from '../../lib/residentService'

export default function MyPayments() {
  const { user } = useAuthStore()
  const [residentInfo, setResidentInfo] = useState<ResidentWithUnitDto | null>(null)
  const [charges, setCharges] = useState<ChargeListDto[]>([])
  const [paymentProofs, setPaymentProofs] = useState<PaymentProofListDto[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingResident, setLoadingResident] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Active tab
  const [activeTab, setActiveTab] = useState<'charges' | 'proofs'>('charges')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 10

  // Modal for uploading proof
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedCharge, setSelectedCharge] = useState<ChargeListDto | null>(null)
  const [uploadForm, setUploadForm] = useState({
    amount: 0,
    paymentMethod: PaymentMethod.BankTransfer,
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    bankName: '',
    notes: '',
    file: null as File | null
  })
  const [uploading, setUploading] = useState(false)

  // Load resident info to get unitId
  useEffect(() => {
    const loadResidentInfo = async () => {
      if (!user?.id) return
      setLoadingResident(true)
      try {
        const info = await residentService.getResidentInfo(user.id)
        setResidentInfo(info)
      } catch (err) {
        console.error('Error loading resident info:', err)
      } finally {
        setLoadingResident(false)
      }
    }
    loadResidentInfo()
  }, [user?.id])

  // Get user's unit
  const unitId = residentInfo?.unitId
  const condominiumId = residentInfo?.condominiumId

  // Load pending charges
  const loadCharges = useCallback(async () => {
    if (!unitId) return
    
    setLoading(true)
    try {
      const result = await billingService.getUnitCharges(unitId)
      // Filter to show only pending/overdue charges
      const pendingCharges = result.filter(c => 
        c.status === ChargeStatus.Pending || 
        c.status === ChargeStatus.Overdue ||
        c.status === ChargeStatus.PartiallyPaid
      )
      setCharges(pendingCharges)
    } catch (err) {
      console.error('Error loading charges:', err)
      setError('Error al cargar los cargos pendientes')
    } finally {
      setLoading(false)
    }
  }, [unitId])

  // Load payment proofs
  const loadPaymentProofs = useCallback(async () => {
    if (!unitId) return
    
    setLoading(true)
    try {
      const result = await paymentProofService.getUnitPaymentProofs(unitId, {
        page: currentPage,
        pageSize
      })
      setPaymentProofs(result.items)
      setTotalPages(result.totalPages)
    } catch (err) {
      console.error('Error loading payment proofs:', err)
      setError('Error al cargar los comprobantes')
    } finally {
      setLoading(false)
    }
  }, [unitId, currentPage])

  useEffect(() => {
    if (activeTab === 'charges') {
      loadCharges()
    } else {
      loadPaymentProofs()
    }
  }, [activeTab, loadCharges, loadPaymentProofs])

  // Open upload modal for a charge
  const openUploadModal = (charge: ChargeListDto) => {
    setSelectedCharge(charge)
    setUploadForm({
      amount: charge.balance,
      paymentMethod: PaymentMethod.BankTransfer,
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      bankName: '',
      notes: '',
      file: null
    })
    setShowUploadModal(true)
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        setError('Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, GIF) y PDF.')
        return
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo excede el límite de 10MB')
        return
      }
      setUploadForm({ ...uploadForm, file })
    }
  }

  // Submit payment proof
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCharge || !uploadForm.file || !user || !unitId || !condominiumId) return

    setUploading(true)
    setError(null)
    try {
      await paymentProofService.submitPaymentProof({
        condominiumId: condominiumId,
        unitId: unitId,
        chargeId: selectedCharge.id,
        amount: uploadForm.amount,
        paymentMethod: uploadForm.paymentMethod,
        paymentDate: uploadForm.paymentDate,
        referenceNumber: uploadForm.referenceNumber || undefined,
        bankName: uploadForm.bankName || undefined,
        notes: uploadForm.notes || undefined,
        file: uploadForm.file
      })
      setSuccess('Comprobante enviado exitosamente. El administrador lo revisará pronto.')
      setShowUploadModal(false)
      setSelectedCharge(null)
      loadCharges()
      loadPaymentProofs()
    } catch (err) {
      console.error('Error submitting proof:', err)
      setError('Error al enviar el comprobante. Por favor intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  // Download file
  const downloadFile = (proofId: string, fileName: string) => {
    const url = paymentProofService.getFileUrl(proofId)
    const token = localStorage.getItem('token')
    
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.blob())
    .then(blob => {
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    })
    .catch(err => {
      console.error('Error downloading file:', err)
      setError('Error al descargar el archivo')
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const getStatusColor = (status: PaymentProofStatus) => {
    switch (status) {
      case PaymentProofStatus.Pending:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case PaymentProofStatus.Approved:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case PaymentProofStatus.Rejected:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status: PaymentProofStatus) => {
    switch (status) {
      case PaymentProofStatus.Pending:
        return <Clock className="w-4 h-4" />
      case PaymentProofStatus.Approved:
        return <CheckCircle className="w-4 h-4" />
      case PaymentProofStatus.Rejected:
        return <XCircle className="w-4 h-4" />
    }
  }

  const getChargeStatusColor = (status: ChargeStatus) => {
    switch (status) {
      case ChargeStatus.Pending:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case ChargeStatus.Overdue:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case ChargeStatus.PartiallyPaid:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  if (loadingResident) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Cargando información...</p>
        </div>
      </div>
    )
  }

  if (!unitId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
            Sin unidad asignada
          </h2>
          <p className="text-yellow-600 dark:text-yellow-400">
            No tienes una unidad asignada. Contacta al administrador.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Receipt className="w-8 h-8 text-sky-500" />
          Mis Pagos
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Consulta tus cargos pendientes y envía comprobantes de pago
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 flex items-center gap-2">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('charges')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'charges'
                  ? 'text-sky-600 border-b-2 border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <DollarSign className="w-5 h-5" />
                Cargos Pendientes
                {charges.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {charges.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('proofs')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'proofs'
                  ? 'text-sky-600 border-b-2 border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Receipt className="w-5 h-5" />
                Mis Comprobantes
              </div>
            </button>
          </nav>
        </div>

        {/* Charges Tab */}
        {activeTab === 'charges' && (
          <div className="p-6">
            {loading ? (
              <div className="py-12 text-center text-gray-500">
                <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                Cargando...
              </div>
            ) : charges.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  ¡Estás al corriente!
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  No tienes cargos pendientes de pago.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {charges.map((charge) => (
                  <div
                    key={charge.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {charge.concept}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getChargeStatusColor(charge.status)}`}>
                            {charge.statusName}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Vence: {formatDate(charge.dueDate)}
                          </span>
                          <span>Tipo: {charge.feeTypeName}</span>
                        </div>
                      </div>
                      <div className="flex flex-col md:items-end gap-2">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Saldo pendiente</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(charge.balance)}
                          </p>
                          {charge.paidAmount > 0 && (
                            <p className="text-xs text-green-600">
                              Pagado: {formatCurrency(charge.paidAmount)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => openUploadModal(charge)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all"
                        >
                          <Upload className="w-4 h-4" />
                          Subir Comprobante
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payment Proofs Tab */}
        {activeTab === 'proofs' && (
          <div className="p-6">
            {loading ? (
              <div className="py-12 text-center text-gray-500">
                <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                Cargando...
              </div>
            ) : paymentProofs.length === 0 ? (
              <div className="py-12 text-center">
                <Receipt className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Sin comprobantes
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Aún no has enviado ningún comprobante de pago.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentProofs.map((proof) => (
                  <div
                    key={proof.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {proof.chargeConcept}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proof.status)}`}>
                            {getStatusIcon(proof.status)}
                            {proof.statusName}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-4 h-4" />
                            {proof.paymentMethodName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(proof.paymentDate)}
                          </span>
                          {proof.referenceNumber && (
                            <span>Ref: {proof.referenceNumber}</span>
                          )}
                        </div>
                        {proof.status === PaymentProofStatus.Rejected && proof.reviewComments && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <p className="text-sm text-red-700 dark:text-red-300">
                              <strong>Motivo de rechazo:</strong> {proof.reviewComments}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col md:items-end gap-2">
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(proof.amount)}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => downloadFile(proof.id, proof.originalFileName)}
                            className="flex items-center gap-1 px-3 py-1 text-sm text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Descargar
                          </button>
                        </div>
                        <p className="text-xs text-gray-400">
                          Enviado: {formatDate(proof.submittedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && selectedCharge && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Enviar Comprobante de Pago
              </h2>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setSelectedCharge(null)
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitProof} className="p-6 space-y-4">
              {/* Charge Info */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Cargo a pagar</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedCharge.concept}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Saldo: <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(selectedCharge.balance)}</span>
                </p>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Monto del pago *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedCharge.balance}
                    value={uploadForm.amount}
                    onChange={(e) => setUploadForm({ ...uploadForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Método de pago *
                </label>
                <select
                  value={uploadForm.paymentMethod}
                  onChange={(e) => setUploadForm({ ...uploadForm, paymentMethod: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  required
                >
                  {Object.entries(paymentMethodNames).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha del pago *
                </label>
                <input
                  type="date"
                  value={uploadForm.paymentDate}
                  onChange={(e) => setUploadForm({ ...uploadForm, paymentDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Banco
                </label>
                <input
                  type="text"
                  value={uploadForm.bankName}
                  onChange={(e) => setUploadForm({ ...uploadForm, bankName: e.target.value })}
                  placeholder="Ej: BBVA, Banorte, Santander..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Número de referencia / Folio
                </label>
                <input
                  type="text"
                  value={uploadForm.referenceNumber}
                  onChange={(e) => setUploadForm({ ...uploadForm, referenceNumber: e.target.value })}
                  placeholder="Número de operación o folio"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Comprobante (imagen o PDF) *
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-sky-400 transition-colors">
                  {uploadForm.file ? (
                    <div className="flex items-center justify-center gap-3">
                      {uploadForm.file.type.startsWith('image/') ? (
                        <Image className="w-8 h-8 text-sky-500" />
                      ) : (
                        <FileText className="w-8 h-8 text-sky-500" />
                      )}
                      <div className="text-left">
                        <p className="font-medium text-gray-900 dark:text-white">{uploadForm.file.name}</p>
                        <p className="text-sm text-gray-500">{(uploadForm.file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadForm({ ...uploadForm, file: null })}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <X className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Haz clic para seleccionar o arrastra tu archivo
                      </p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF o PDF (máx. 10MB)</p>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notas adicionales
                </label>
                <textarea
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  placeholder="Información adicional sobre el pago..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false)
                    setSelectedCharge(null)
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!uploadForm.file || uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 disabled:opacity-50 transition-all"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  Enviar Comprobante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
