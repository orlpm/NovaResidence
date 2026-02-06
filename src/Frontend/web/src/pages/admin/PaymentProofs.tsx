import { useState, useEffect, useCallback } from 'react'
import { 
  Receipt, Search, Filter, Eye, Check, X, 
  Download, Calendar, Clock, Building2, 
  CreditCard, FileText, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle, XCircle, Image
} from 'lucide-react'
import { 
  paymentProofService, 
  PaymentProofListDto, 
  PaymentProofDetailDto,
  PaymentProofStatus,
  paymentProofStatusNames,
  paymentMethodNames
} from '../../lib/paymentProofService'
import { condominiumService, CondominiumListDto } from '../../lib/condominiumService'

export default function PaymentProofs() {
  const [condominiums, setCondominiums] = useState<CondominiumListDto[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState<string>('')
  const [paymentProofs, setPaymentProofs] = useState<PaymentProofListDto[]>([])
  const [selectedProof, setSelectedProof] = useState<PaymentProofDetailDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<PaymentProofStatus | ''>('')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 10

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [approveComments, setApproveComments] = useState('')
  const [processing, setProcessing] = useState(false)

  // Load condominiums
  useEffect(() => {
    const loadCondominiums = async () => {
      try {
        const data = await condominiumService.getCondominiums()
        setCondominiums(data)
        if (data.length > 0) {
          setSelectedCondominium(data[0].id)
        }
      } catch (err) {
        console.error('Error loading condominiums:', err)
      }
    }
    loadCondominiums()
  }, [])

  // Load payment proofs
  const loadPaymentProofs = useCallback(async () => {
    if (!selectedCondominium) return
    
    setLoading(true)
    setError(null)
    try {
      const result = await paymentProofService.getCondominiumPaymentProofs(selectedCondominium, {
        status: statusFilter !== '' ? statusFilter : undefined,
        page: currentPage,
        pageSize
      })
      setPaymentProofs(result.items)
      setTotalPages(result.totalPages)
      setTotalCount(result.totalCount)
    } catch (err) {
      console.error('Error loading payment proofs:', err)
      setError('Error al cargar los comprobantes de pago')
    } finally {
      setLoading(false)
    }
  }, [selectedCondominium, statusFilter, currentPage])

  useEffect(() => {
    loadPaymentProofs()
  }, [loadPaymentProofs])

  // View proof details
  const viewProofDetails = async (proofId: string) => {
    try {
      const detail = await paymentProofService.getPaymentProof(proofId)
      setSelectedProof(detail)
      setShowDetailModal(true)
    } catch (err) {
      console.error('Error loading proof details:', err)
      setError('Error al cargar los detalles del comprobante')
    }
  }

  // Approve proof
  const handleApprove = async () => {
    if (!selectedProof) return
    
    setProcessing(true)
    try {
      await paymentProofService.approvePaymentProof(selectedProof.id, approveComments || undefined)
      setSuccess('Comprobante aprobado exitosamente. El pago ha sido registrado.')
      setShowDetailModal(false)
      setApproveComments('')
      loadPaymentProofs()
    } catch (err) {
      console.error('Error approving proof:', err)
      setError('Error al aprobar el comprobante')
    } finally {
      setProcessing(false)
    }
  }

  // Reject proof
  const handleReject = async () => {
    if (!selectedProof || !rejectReason.trim()) return
    
    setProcessing(true)
    try {
      await paymentProofService.rejectPaymentProof(selectedProof.id, rejectReason)
      setSuccess('Comprobante rechazado.')
      setShowRejectModal(false)
      setShowDetailModal(false)
      setRejectReason('')
      loadPaymentProofs()
    } catch (err) {
      console.error('Error rejecting proof:', err)
      setError('Error al rechazar el comprobante')
    } finally {
      setProcessing(false)
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

  // Filter by search
  const filteredProofs = paymentProofs.filter(proof => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      proof.unitNumber.toLowerCase().includes(search) ||
      proof.chargeConcept.toLowerCase().includes(search) ||
      proof.submittedByName.toLowerCase().includes(search) ||
      (proof.referenceNumber?.toLowerCase().includes(search) ?? false)
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
        return <AlertCircle className="w-4 h-4" />
      case PaymentProofStatus.Approved:
        return <CheckCircle className="w-4 h-4" />
      case PaymentProofStatus.Rejected:
        return <XCircle className="w-4 h-4" />
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Receipt className="w-8 h-8 text-sky-500" />
            Comprobantes de Pago
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Revisa y aprueba los comprobantes de pago enviados por los residentes
          </p>
        </div>

        {/* Condominium Selector */}
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-400" />
          <select
            value={selectedCondominium}
            onChange={(e) => {
              setSelectedCondominium(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-sky-500"
          >
            {condominiums.map(condo => (
              <option key={condo.id} value={condo.id}>{condo.name}</option>
            ))}
          </select>
        </div>
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

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por unidad, concepto, residente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value === '' ? '' : parseInt(e.target.value))
                setCurrentPage(1)
              }}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Todos los estados</option>
              <option value={PaymentProofStatus.Pending}>Pendientes</option>
              <option value={PaymentProofStatus.Approved}>Aprobados</option>
              <option value={PaymentProofStatus.Rejected}>Rechazados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                {paymentProofs.filter(p => p.status === PaymentProofStatus.Pending).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">Aprobados</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {paymentProofs.filter(p => p.status === PaymentProofStatus.Approved).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-red-600 dark:text-red-400">Rechazados</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {paymentProofs.filter(p => p.status === PaymentProofStatus.Rejected).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Proofs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            Cargando comprobantes...
          </div>
        ) : filteredProofs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            No hay comprobantes de pago
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Unidad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cargo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Método</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha Pago</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Enviado por</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProofs.map((proof) => (
                  <tr key={proof.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{proof.unitNumber}</p>
                          {proof.buildingName && (
                            <p className="text-xs text-gray-500">{proof.buildingName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white">{proof.chargeConcept}</p>
                      <p className="text-xs text-gray-500">Total: {formatCurrency(proof.chargeAmount)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(proof.amount)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">{proof.paymentMethodName}</span>
                      </div>
                      {proof.referenceNumber && (
                        <p className="text-xs text-gray-500 mt-1">Ref: {proof.referenceNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {new Date(proof.paymentDate).toLocaleDateString('es-MX')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white">{proof.submittedByName}</p>
                      <p className="text-xs text-gray-500">{formatDate(proof.submittedAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proof.status)}`}>
                        {getStatusIcon(proof.status)}
                        {proof.statusName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => viewProofDetails(proof.id)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => downloadFile(proof.id, proof.originalFileName)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Descargar comprobante"
                        >
                          <Download className="w-4 h-4 text-gray-500" />
                        </button>
                        {proof.status === PaymentProofStatus.Pending && (
                          <>
                            <button
                              onClick={() => viewProofDetails(proof.id)}
                              className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                              title="Aprobar"
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => {
                                viewProofDetails(proof.id)
                                setShowRejectModal(true)
                              }}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Rechazar"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Mostrando {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} de {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
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
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedProof && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Detalle del Comprobante</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedProof(null)
                  setApproveComments('')
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex justify-center">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedProof.status)}`}>
                  {getStatusIcon(selectedProof.status)}
                  {selectedProof.statusName}
                </span>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Unidad</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedProof.unitNumber}</p>
                  {selectedProof.buildingName && (
                    <p className="text-sm text-gray-500">{selectedProof.buildingName}</p>
                  )}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Cargo</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedProof.chargeConcept}</p>
                  <p className="text-sm text-gray-500">Total: {formatCurrency(selectedProof.chargeAmount)}</p>
                </div>
                <div className="p-4 bg-sky-50 dark:bg-sky-900/30 rounded-xl">
                  <p className="text-xs text-sky-600 dark:text-sky-400 mb-1">Monto del Pago</p>
                  <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">{formatCurrency(selectedProof.amount)}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Método de Pago</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedProof.paymentMethodName}</p>
                  {selectedProof.bankName && (
                    <p className="text-sm text-gray-500">Banco: {selectedProof.bankName}</p>
                  )}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Fecha del Pago</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Date(selectedProof.paymentDate).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Referencia</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedProof.referenceNumber || 'No especificada'}
                  </p>
                </div>
              </div>

              {/* File Preview */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {selectedProof.contentType.startsWith('image/') ? (
                      <Image className="w-5 h-5 text-gray-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="text-gray-700 dark:text-gray-300">{selectedProof.originalFileName}</span>
                  </div>
                  <button
                    onClick={() => downloadFile(selectedProof.id, selectedProof.originalFileName)}
                    className="flex items-center gap-2 px-3 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-lg hover:bg-sky-200 dark:hover:bg-sky-900/50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Descargar
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Tamaño: {(selectedProof.fileSize / 1024).toFixed(1)} KB · Tipo: {selectedProof.contentType}
                </p>
              </div>

              {/* Notes */}
              {selectedProof.notes && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Notas del Residente</p>
                  <p className="text-gray-700 dark:text-gray-300">{selectedProof.notes}</p>
                </div>
              )}

              {/* Review Info */}
              {selectedProof.reviewedAt && (
                <div className={`p-4 rounded-xl ${
                  selectedProof.status === PaymentProofStatus.Approved 
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}>
                  <p className="text-xs text-gray-500 mb-1">
                    {selectedProof.status === PaymentProofStatus.Approved ? 'Aprobado' : 'Rechazado'} por
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedProof.reviewedByName}</p>
                  <p className="text-sm text-gray-500">{formatDate(selectedProof.reviewedAt)}</p>
                  {selectedProof.reviewComments && (
                    <p className="mt-2 text-gray-700 dark:text-gray-300">{selectedProof.reviewComments}</p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {selectedProof.status === PaymentProofStatus.Pending && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Comentarios (opcional)
                    </label>
                    <textarea
                      value={approveComments}
                      onChange={(e) => setApproveComments(e.target.value)}
                      placeholder="Agregar comentarios sobre la aprobación..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleApprove}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium disabled:opacity-50 transition-colors"
                    >
                      {processing ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                      Aprobar Pago
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium disabled:opacity-50 transition-colors"
                    >
                      <X className="w-5 h-5" />
                      Rechazar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Rechazar Comprobante</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Por favor, indica el motivo del rechazo. El residente será notificado.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Motivo del rechazo *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ej: El comprobante no es legible, el monto no coincide..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectReason('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || processing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium disabled:opacity-50 transition-colors"
                >
                  {processing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <X className="w-5 h-5" />
                  )}
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
