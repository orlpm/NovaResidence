import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Eye,
  AlertCircle,
  CheckCircle,
  DollarSign,
  X,
  Ban,
  Gift,
  CreditCard,
  Settings,
  FileText,
  Calendar,
  TrendingUp,
  Edit2,
  Trash2,
  Clock,
  ImageIcon,
  ShieldCheck
} from 'lucide-react'
import { ActionMenu } from '../../components/ActionMenu'
import { 
  billingService, 
  FeeType,
  ChargeStatus,
  PaymentMethod,
  feeTypeNames,
  chargeStatusNames,
  paymentMethodNames,
  type ChargeListDto,
  type ChargeDetailDto,
  type PaymentDto,
  type UnitBalanceDto,
  type BillingSummaryDto,
  type FeeConfigurationDto,
  type CreateChargeRequest,
  type RecordPaymentRequest,
  type CreateFeeConfigurationRequest,
  type UpdateFeeConfigurationRequest
} from '../../lib/billingService'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { useAuthStore } from '../../stores/authStore'

type TabType = 'charges' | 'balances' | 'summary' | 'config' | 'pending'

export default function Billing() {
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const linkedPaymentId = searchParams.get('paymentId')
  const requestedTab = searchParams.get('tab')
  const scrolledPayment = useRef<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>(linkedPaymentId ? 'pending' : requestedTab === 'pending' || requestedTab === 'balances' || requestedTab === 'summary' || requestedTab === 'config' ? requestedTab : 'charges')
  const [charges, setCharges] = useState<ChargeListDto[]>([])
  const [balances, setBalances] = useState<UnitBalanceDto[]>([])
  const [summary, setSummary] = useState<BillingSummaryDto | null>(null)
  const [feeConfigs, setFeeConfigs] = useState<FeeConfigurationDto[]>([])
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState<string>('')
  const [units, setUnits] = useState<Array<{ id: string; unitNumber: string; buildingName: string }>>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<ChargeStatus | null>(null)
  const [filterFeeType, setFilterFeeType] = useState<FeeType | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [showCreateChargeModal, setShowCreateChargeModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showForgiveModal, setShowForgiveModal] = useState(false)
  const [showCreateConfigModal, setShowCreateConfigModal] = useState(false)
  const [showEditConfigModal, setShowEditConfigModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showBulkCancelModal, setShowBulkCancelModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [showDeleteConfigModal, setShowDeleteConfigModal] = useState(false)
  const [showDeleteAllConfigsModal, setShowDeleteAllConfigsModal] = useState(false)
  const [selectedCharge, setSelectedCharge] = useState<ChargeListDto | null>(null)
  const [selectedConfig, setSelectedConfig] = useState<FeeConfigurationDto | null>(null)
  const [selectedCharges, setSelectedCharges] = useState<Set<string>>(new Set())
  const [chargeDetail, setChargeDetail] = useState<ChargeDetailDto | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const [chargeForm, setChargeForm] = useState<Partial<CreateChargeRequest>>({
    feeType: FeeType.MonthlyMaintenance,
    amount: 0,
    applyLateFee: true
  })

  const [paymentForm, setPaymentForm] = useState<Partial<RecordPaymentRequest>>({
    amount: 0,
    paymentMethod: PaymentMethod.BankTransfer
  })

  const [configForm, setConfigForm] = useState<Partial<CreateFeeConfigurationRequest>>({
    feeType: FeeType.MonthlyMaintenance,
    defaultAmount: 0,
    isRecurring: true,
    recurringDay: 1,
    dueDayOffset: 10,
    applyLateFee: true,
    lateFeePercentage: 5,
    gracePeriodDays: 5
  })

  const [cancelReason, setCancelReason] = useState('')
  const [forgiveReason, setForgiveReason] = useState('')
  const [pendingPayments, setPendingPayments] = useState<PaymentDto[]>([])
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null)
  const [showProofModal, setShowProofModal] = useState(false)
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null)
  const [confirmVerifyPaymentId, setConfirmVerifyPaymentId] = useState<string | null>(null)

  useEffect(() => { loadCondominiums() }, [])

  useEffect(() => {
    if (linkedPaymentId) {
      setActiveTab('pending')
      return
    }

    if (requestedTab === 'pending' || requestedTab === 'charges' || requestedTab === 'balances' || requestedTab === 'summary' || requestedTab === 'config') {
      setActiveTab(requestedTab)
    }
  }, [linkedPaymentId, requestedTab])

  useEffect(() => {
    if (!linkedPaymentId || activeTab !== 'pending' || isLoading || scrolledPayment.current === linkedPaymentId) return
    const node = document.getElementById(`payment-${linkedPaymentId}`)
    if (!node) return
    scrolledPayment.current = linkedPaymentId
    node.scrollIntoView({ block: 'center' })
  }, [linkedPaymentId, pendingPayments, activeTab, isLoading])

  useEffect(() => {
    if (selectedCondominium) {
      loadData()
      loadUnits(selectedCondominium)
    }
  }, [selectedCondominium, activeTab, filterStatus, filterFeeType, selectedMonth, selectedYear])

  const loadCondominiums = async () => {
    try {
      const data = await condominiumService.getAllCondominiums(user?.id)
      setCondominiums(data)
      if (data.length > 0) {
        setSelectedCondominium(data[0].id)
        await loadUnits(data[0].id)
      }
    } catch { setError('Error al cargar condominios') }
  }

  const loadUnits = async (condominiumId: string) => {
    try {
      const condoDetails = await condominiumService.getCondominiumById(condominiumId)
      const allUnits: Array<{ id: string; unitNumber: string; buildingName: string }> = []
      
      condoDetails.buildings.forEach(building => {
        building.units.forEach(unit => {
          allUnits.push({
            id: unit.id,
            unitNumber: unit.unitNumber,
            buildingName: building.name
          })
        })
      })
      
      setUnits(allUnits.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber)))
    } catch { setError('Error al cargar unidades') }
  }

  const loadData = async () => {
    if (!selectedCondominium) return
    setIsLoading(true)
    setError(null)
    try {
      switch (activeTab) {
        case 'charges':
          const chargesData = await billingService.getCondominiumCharges(selectedCondominium, {
            month: selectedMonth,
            year: selectedYear,
            status: filterStatus ?? undefined,
            feeType: filterFeeType ?? undefined
          })
          setCharges(chargesData)
          break
        case 'balances':
          const balancesData = await billingService.getCondominiumBalances(selectedCondominium)
          setBalances(balancesData)
          break
        case 'summary':
          const summaryData = await billingService.getBillingSummary(selectedCondominium, selectedMonth, selectedYear)
          setSummary(summaryData)
          break
        case 'config':
          const configsData = await billingService.getFeeConfigurations(selectedCondominium)
          setFeeConfigs(configsData)
          break
        case 'pending':
          const pendingData = await billingService.getPendingPayments(selectedCondominium)
          setPendingPayments(pendingData)
          break
      }
    } catch { setError('Error al cargar datos') }
    finally { setIsLoading(false) }
  }

  const loadChargeDetail = async (id: string) => {
    try {
      const detail = await billingService.getCharge(id)
      setChargeDetail(detail)
      setShowDetailModal(true)
    } catch { setError('Error al cargar detalle de cargo') }
  }

  const handleVerifyPayment = (paymentId: string) => {
    setConfirmVerifyPaymentId(paymentId)
  }

  const confirmVerifyPayment = async () => {
    if (!user?.id || !confirmVerifyPaymentId) return
    const paymentId = confirmVerifyPaymentId
    setConfirmVerifyPaymentId(null)
    setVerifyingPaymentId(paymentId)
    try {
      await billingService.verifyPayment(paymentId, { verifiedById: user.id })
      showSuccess('Pago verificado exitosamente')
      if (selectedCondominium) {
        const pendingData = await billingService.getPendingPayments(selectedCondominium)
        setPendingPayments(pendingData)
      }
    } catch {
      setError('Error al verificar el pago')
    } finally {
      setVerifyingPaymentId(null)
    }
  }

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Si se seleccionó "all", crear cargo para todas las unidades
      if (chargeForm.unitId === 'all') {
        const promises = units.map(unit => 
          billingService.createCharge({
            unitId: unit.id,
            concept: chargeForm.concept!,
            feeType: chargeForm.feeType!,
            amount: chargeForm.amount!,
            dueDate: chargeForm.dueDate!,
            condominiumId: selectedCondominium,
            billingPeriodMonth: selectedMonth,
            billingPeriodYear: selectedYear
          })
        )
        await Promise.all(promises)
        showSuccess(`${units.length} cargos creados exitosamente`)
      } else {
        // Crear cargo individual
        await billingService.createCharge({
          ...chargeForm as CreateChargeRequest,
          condominiumId: selectedCondominium,
          billingPeriodMonth: selectedMonth,
          billingPeriodYear: selectedYear
        })
        showSuccess('Cargo creado exitosamente')
      }
      setShowCreateChargeModal(false)
      resetChargeForm()
      loadData()
    } catch { setError('Error al crear cargo') }
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCharge) return
    try {
      await billingService.recordPayment({
        chargeId: selectedCharge.id,
        amount: paymentForm.amount!,
        paymentMethod: paymentForm.paymentMethod!,
        referenceNumber: paymentForm.referenceNumber,
        notes: paymentForm.notes
      })
      setShowPaymentModal(false)
      resetPaymentForm()
      loadData()
      showSuccess('Pago registrado exitosamente')
    } catch { setError('Error al registrar pago') }
  }

  const handleCancelCharge = async () => {
    if (!selectedCharge) return
    try {
      await billingService.cancelCharge(selectedCharge.id, { reason: cancelReason })
      setShowCancelModal(false)
      setCancelReason('')
      loadData()
      showSuccess('Cargo cancelado exitosamente')
    } catch { setError('Error al cancelar cargo') }
  }

  const handleToggleChargeSelection = (chargeId: string) => {
    setSelectedCharges(prev => {
      const newSet = new Set(prev)
      if (newSet.has(chargeId)) {
        newSet.delete(chargeId)
      } else {
        newSet.add(chargeId)
      }
      return newSet
    })
  }

  const handleSelectAllCharges = () => {
    if (selectedCharges.size === filteredCharges.length) {
      setSelectedCharges(new Set())
    } else {
      setSelectedCharges(new Set(filteredCharges.map(c => c.id)))
    }
  }

  const handleBulkCancel = async () => {
    try {
      const promises = Array.from(selectedCharges).map(chargeId => 
        billingService.cancelCharge(chargeId, { reason: cancelReason || 'Cancelación masiva' })
      )
      await Promise.all(promises)
      setShowBulkCancelModal(false)
      setSelectedCharges(new Set())
      setCancelReason('')
      loadData()
      showSuccess(`${promises.length} cargos cancelados exitosamente`)
    } catch { setError('Error al cancelar cargos') }
  }

  const handleDeleteCharge = async () => {
    if (!selectedCharge) return
    try {
      await billingService.deleteCharge(selectedCharge.id)
      setShowDeleteModal(false)
      setSelectedCharge(null)
      loadData()
      showSuccess('Cargo eliminado exitosamente')
    } catch { setError('Error al eliminar cargo') }
  }

  const handleBulkDelete = async () => {
    try {
      const promises = Array.from(selectedCharges).map(chargeId => 
        billingService.deleteCharge(chargeId)
      )
      await Promise.all(promises)
      setShowBulkDeleteModal(false)
      setSelectedCharges(new Set())
      loadData()
      showSuccess(`${promises.length} cargos eliminados exitosamente`)
    } catch { setError('Error al eliminar cargos') }
  }

  const handleDeleteAllCharges = async () => {
    try {
      const count = await billingService.deleteChargesByCondominium(selectedCondominium, {
        month: selectedMonth,
        year: selectedYear
      })
      setShowDeleteAllModal(false)
      loadData()
      showSuccess(`${count} cargos eliminados exitosamente`)
    } catch { setError('Error al eliminar cargos') }
  }

  const handleForgiveCharge = async () => {
    if (!selectedCharge) return
    try {
      await billingService.forgiveCharge(selectedCharge.id, { reason: forgiveReason })
      setShowForgiveModal(false)
      setForgiveReason('')
      loadData()
      showSuccess('Cargo condonado exitosamente')
    } catch { setError('Error al condonar cargo') }
  }

  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await billingService.createFeeConfiguration({
        ...configForm as CreateFeeConfigurationRequest,
        condominiumId: selectedCondominium
      })
      setShowCreateConfigModal(false)
      resetConfigForm()
      loadData()
      showSuccess('Configuración creada exitosamente')
    } catch { setError('Error al crear configuración') }
  }

  const handleToggleConfig = async (id: string) => {
    try {
      await billingService.toggleFeeConfiguration(id)
      loadData()
      showSuccess('Estado actualizado')
    } catch { setError('Error al actualizar estado') }
  }

  const handleEditConfig = (config: FeeConfigurationDto) => {
    setSelectedConfig(config)
    setConfigForm({
      name: config.name,
      feeType: config.feeType,
      defaultAmount: config.defaultAmount,
      isRecurring: config.isRecurring,
      recurringDay: config.recurringDay,
      dueDayOffset: config.dueDayOffset,
      applyLateFee: config.applyLateFee,
      lateFeePercentage: config.lateFeePercentage,
      gracePeriodDays: config.gracePeriodDays,
      description: config.description
    })
    setShowEditConfigModal(true)
  }

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedConfig) return
    try {
      await billingService.updateFeeConfiguration(selectedConfig.id, configForm as UpdateFeeConfigurationRequest)
      setShowEditConfigModal(false)
      setSelectedConfig(null)
      resetConfigForm()
      loadData()
      showSuccess('Configuración actualizada exitosamente')
    } catch { setError('Error al actualizar configuración') }
  }

  const handleDeleteConfig = async () => {
    if (!selectedConfig) return
    try {
      await billingService.deleteFeeConfiguration(selectedConfig.id)
      setShowDeleteConfigModal(false)
      setSelectedConfig(null)
      loadData()
      showSuccess('Configuración eliminada exitosamente')
    } catch { setError('Error al eliminar configuración') }
  }

  const handleDeleteAllConfigs = async () => {
    try {
      const count = await billingService.deleteAllFeeConfigurations(selectedCondominium)
      setShowDeleteAllConfigsModal(false)
      loadData()
      showSuccess(`${count} configuraciones eliminadas exitosamente`)
    } catch { setError('Error al eliminar configuraciones') }
  }

  const handleGenerateMonthly = async () => {
    try {
      // First check if there are any active recurring configs
      if (feeConfigs.length === 0) {
        setShowGenerateModal(false)
        setError('No hay configuraciones de cuotas. Crea una configuración primero en la pestaña "Configuración".')
        return
      }
      
      const recurringConfigs = feeConfigs.filter(c => c.isRecurring && c.isActive)
      if (recurringConfigs.length === 0) {
        setShowGenerateModal(false)
        setError('No hay configuraciones recurrentes activas. Asegúrate de marcar "Es recurrente (mensual)" al crear la configuración.')
        return
      }
      
      const count = await billingService.generateMonthlyCharges({
        condominiumId: selectedCondominium,
        month: selectedMonth,
        year: selectedYear
      })
      setShowGenerateModal(false)
      
      if (count === 0) {
        setError('No se generaron cargos. Es posible que ya existan cargos para este período.')
        return
      }
      
      await loadData()
      showSuccess(`Se generaron ${count} cargos exitosamente`)
    } catch (err: any) { 
      console.error('Error generating charges:', err)
      setShowGenerateModal(false)
      setError(`Error al generar cargos: ${err.response?.data?.message || err.message || 'Error desconocido'}`) 
    }
  }

  const resetChargeForm = () => setChargeForm({ feeType: FeeType.MonthlyMaintenance, amount: 0, applyLateFee: true })
  const resetPaymentForm = () => setPaymentForm({ amount: 0, paymentMethod: PaymentMethod.BankTransfer })
  const resetConfigForm = () => setConfigForm({ feeType: FeeType.MonthlyMaintenance, defaultAmount: 0, isRecurring: true, recurringDay: 1, dueDayOffset: 10, applyLateFee: true, lateFeePercentage: 5, gracePeriodDays: 5 })

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const openPaymentModal = (charge: ChargeListDto) => {
    setSelectedCharge(charge)
    setPaymentForm({ ...paymentForm, amount: charge.balance })
    setShowPaymentModal(true)
    setOpenDropdown(null)
  }

  const getStatusColor = (status: ChargeStatus) => {
    switch (status) {
      case ChargeStatus.Pending: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
      case ChargeStatus.PartiallyPaid: return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case ChargeStatus.Paid: return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      case ChargeStatus.Overdue: return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      case ChargeStatus.Cancelled: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      case ChargeStatus.Forgiven: return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)

  const filteredCharges = charges.filter(charge =>
    charge.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    charge.concept.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const tabs = [
    { id: 'charges' as TabType, label: 'Cargos', icon: FileText },
    { id: 'pending' as TabType, label: 'Pagos Pendientes', icon: Clock },
    { id: 'balances' as TabType, label: 'Saldos', icon: DollarSign },
    { id: 'summary' as TabType, label: 'Resumen', icon: TrendingUp },
    { id: 'config' as TabType, label: 'Configuración', icon: Settings }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Facturación</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestiona cargos, pagos y configuración de cuotas</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'charges' && (
            <>
              {selectedCharges.size > 0 && (
                <>
                  <button onClick={() => setShowBulkDeleteModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all">
                    <Trash2 className="w-5 h-5" /> Eliminar ({selectedCharges.size})
                  </button>
                  <button onClick={() => setShowBulkCancelModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-all">
                    <Ban className="w-5 h-5" /> Cancelar ({selectedCharges.size})
                  </button>
                </>
              )}
              <button onClick={() => setShowDeleteAllModal(true)} disabled={!selectedCondominium || charges.length === 0} className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <Trash2 className="w-5 h-5" /> Eliminar Todos
              </button>
              <button onClick={() => setShowGenerateModal(true)} disabled={!selectedCondominium} className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <Calendar className="w-5 h-5" /> Generar Mensuales
              </button>
              <button onClick={() => setShowCreateChargeModal(true)} disabled={!selectedCondominium} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <Plus className="w-5 h-5" /> Nuevo Cargo
              </button>
            </>
          )}
          {activeTab === 'config' && (
            <>
              <button onClick={() => setShowDeleteAllConfigsModal(true)} disabled={!selectedCondominium || feeConfigs.length === 0} className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <Trash2 className="w-5 h-5" /> Eliminar Todas
              </button>
              <button onClick={() => setShowCreateConfigModal(true)} disabled={!selectedCondominium} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <Plus className="w-5 h-5" /> Nueva Configuración
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-5 h-5 text-red-500" /></button>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-green-700 dark:text-green-300">{successMessage}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Condominio</label>
            <select value={selectedCondominium} onChange={(e) => setSelectedCondominium(e.target.value)} className="w-full md:w-96 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent">
              <option value="">Selecciona un condominio</option>
              {condominiums.map(condo => (<option key={condo.id} value={condo.id}>{condo.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Período</label>
            <div className="flex gap-2">
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('es', { month: 'long' })}</option>))}
              </select>
              <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                {Array.from({ length: 5 }, (_, i) => (<option key={selectedYear - 2 + i} value={selectedYear - 2 + i}>{selectedYear - 2 + i}</option>))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}>
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Cargando...</p>
            </div>
          ) : (
            <>
              {activeTab === 'charges' && (
                <>
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type="text" placeholder="Buscar por unidad o concepto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
                    </div>
                    <select value={filterStatus ?? ''} onChange={(e) => setFilterStatus(e.target.value ? Number(e.target.value) as ChargeStatus : null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="">Todos los estados</option>
                      {Object.entries(chargeStatusNames).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                    </select>
                    <select value={filterFeeType ?? ''} onChange={(e) => setFilterFeeType(e.target.value ? Number(e.target.value) as FeeType : null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="">Todos los tipos</option>
                      {Object.entries(feeTypeNames).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                    </select>
                  </div>

                  {filteredCharges.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No hay cargos para este período</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left">
                              <input 
                                type="checkbox" 
                                checked={selectedCharges.size === filteredCharges.length && filteredCharges.length > 0}
                                onChange={handleSelectAllCharges}
                                className="rounded border-gray-300 dark:border-gray-600"
                              />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Unidad</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Concepto</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tipo</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Monto</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Pagado</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Saldo</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vencimiento</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {filteredCharges.map((charge) => (
                            <tr key={charge.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${charge.isOverdue ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                              <td className="px-4 py-3">
                                <input 
                                  type="checkbox" 
                                  checked={selectedCharges.has(charge.id)}
                                  onChange={() => handleToggleChargeSelection(charge.id)}
                                  className="rounded border-gray-300 dark:border-gray-600"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{charge.unitNumber}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{charge.concept}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{charge.feeTypeName}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">{formatCurrency(charge.amount)}</td>
                              <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 text-right">{formatCurrency(charge.paidAmount)}</td>
                              <td className="px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 text-right">{formatCurrency(charge.balance)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(charge.status)}`}>{charge.statusName}</span>
                                  {charge.isOverdue && <span title="Vencido"><AlertCircle className="w-4 h-4 text-red-500" /></span>}
                                </div>
                              </td>
                              <td className={`px-4 py-3 text-sm ${charge.isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                                {new Date(charge.dueDate).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <ActionMenu
                                  open={openDropdown === charge.id}
                                  onOpenChange={(next) => setOpenDropdown(next ? charge.id : null)}
                                >
                                      <button onClick={() => { loadChargeDetail(charge.id); setOpenDropdown(null); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><Eye className="w-4 h-4" /> Ver Detalle</button>
                                      {(charge.status === ChargeStatus.Pending || charge.status === ChargeStatus.PartiallyPaid || charge.status === ChargeStatus.Overdue || charge.isOverdue) && (
                                        <button onClick={() => openPaymentModal(charge)} className="w-full px-4 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Registrar Pago</button>
                                      )}
                                      {(charge.status === ChargeStatus.Pending || charge.isOverdue) && (
                                        <>
                                          <button onClick={() => { setSelectedCharge(charge); setShowCancelModal(true); setOpenDropdown(null); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><Ban className="w-4 h-4" /> Cancelar</button>
                                          <button onClick={() => { setSelectedCharge(charge); setShowForgiveModal(true); setOpenDropdown(null); }} className="w-full px-4 py-2 text-left text-sm text-purple-600 dark:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><Gift className="w-4 h-4" /> Condonar</button>
                                        </>
                                      )}
                                      <button onClick={() => { setSelectedCharge(charge); setShowDeleteModal(true); setOpenDropdown(null); }} className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Eliminar</button>
                                </ActionMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'balances' && (
                <div className="overflow-x-auto">
                  {balances.length === 0 ? (
                    <div className="text-center py-8">
                      <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No hay datos de saldos</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Unidad</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Cargado</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Pagado</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Saldo</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vencido</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cargos Pend.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {balances.map((balance) => (
                          <tr key={balance.unitId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{balance.unitNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">{formatCurrency(balance.totalCharged)}</td>
                            <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 text-right">{formatCurrency(balance.totalPaid)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-right">{balance.balance > 0 ? <span className="text-red-600 dark:text-red-400">{formatCurrency(balance.balance)}</span> : <span className="text-green-600">{formatCurrency(balance.balance)}</span>}</td>
                            <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400 text-right">{formatCurrency(balance.overdueAmount)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">{balance.pendingCharges}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'summary' && summary && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                      <p className="text-sm text-blue-600 dark:text-blue-400">Total Cargado</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(summary.totalCharged)}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                      <p className="text-sm text-green-600 dark:text-green-400">Total Cobrado</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(summary.totalCollected)}</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">Total Pendiente</p>
                      <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{formatCurrency(summary.totalPending)}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                      <p className="text-sm text-red-600 dark:text-red-400">Total Vencido</p>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrency(summary.totalOverdue)}</p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl p-6 text-white">
                    <p className="text-lg">Tasa de Cobranza</p>
                    <p className="text-4xl font-bold">{summary.collectionRate.toFixed(1)}%</p>
                  </div>
                </div>
              )}

              {activeTab === 'config' && (
                <>
                  {feeConfigs.length === 0 ? (
                    <div className="text-center py-8">
                      <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No hay configuraciones de cuotas</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {feeConfigs.map((config) => (
                        <div key={config.id} className={`border rounded-xl p-4 ${config.isActive ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{config.name}</h3>
                            <div className="flex gap-2">
                              <button onClick={() => handleEditConfig(config)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Editar">
                                <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              </button>
                              <button onClick={() => { setSelectedConfig(config); setShowDeleteConfigModal(true); }} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Eliminar">
                                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </button>
                              <button onClick={() => handleToggleConfig(config.id)} className={`px-3 py-1 text-xs font-medium rounded-full ${config.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                {config.isActive ? 'Activo' : 'Inactivo'}
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{config.feeTypeName}</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(config.defaultAmount)}</p>
                          {config.isRecurring && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Día de cobro: {config.recurringDay} | Vence: +{config.dueDayOffset} días</p>
                          )}
                          {config.applyLateFee && (
                            <p className="text-xs text-orange-600 dark:text-orange-400">Recargo: {config.lateFeePercentage}% (gracia: {config.gracePeriodDays} días)</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'pending' && (
                <>
                  {pendingPayments.length === 0 ? (
                    <div className="text-center py-12">
                      <ShieldCheck className="w-16 h-16 text-green-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">No hay pagos pendientes de verificación</p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Todos los pagos han sido revisados</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <p className="text-sm text-amber-800 dark:text-amber-300">
                          <strong>{pendingPayments.length}</strong> pago(s) pendiente(s) de verificación. Revisa los comprobantes y confirma los pagos.
                        </p>
                      </div>
                      {pendingPayments.map((payment) => (
                        <div id={`payment-${payment.id}`} key={payment.id} className={`bg-white dark:bg-gray-800 border rounded-xl p-5 hover:shadow-lg transition-all ${linkedPaymentId === payment.id ? 'border-sky-500 ring-2 ring-sky-500' : 'border-gray-200 dark:border-gray-700'}`}>
                          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-5 h-5 text-amber-500" />
                                <h3 className="font-bold text-gray-900 dark:text-white truncate">{payment.chargeConcept}</h3>
                                <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">Pendiente</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Monto</p>
                                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(payment.amount)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Método</p>
                                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{payment.paymentMethodName}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Unidad</p>
                                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{payment.unitNumber} - {payment.buildingName}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Fecha de pago</p>
                                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {new Date(payment.paymentDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                              {payment.referenceNumber && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  Ref: <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{payment.referenceNumber}</span>
                                </p>
                              )}
                              {payment.notes && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">"{payment.notes}"</p>
                              )}
                            </div>

                            {/* Proof Image & Actions */}
                            <div className="flex flex-col items-center gap-3 lg:w-48 flex-shrink-0">
                              {payment.proofImageUrl ? (
                                <button
                                  onClick={() => { setProofImageUrl(`http://localhost:5001${payment.proofImageUrl}`); setShowProofModal(true); }}
                                  className="w-full border-2 border-dashed border-sky-300 dark:border-sky-700 rounded-xl p-3 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors text-center"
                                >
                                  {payment.proofImageUrl.endsWith('.pdf') ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <FileText className="w-8 h-8 text-sky-500" />
                                      <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">Ver PDF</span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-1">
                                      <img
                                        src={`http://localhost:5001${payment.proofImageUrl}`}
                                        alt="Comprobante"
                                        className="w-full max-h-24 object-contain rounded-lg"
                                      />
                                      <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">Ver comprobante</span>
                                    </div>
                                  )}
                                </button>
                              ) : (
                                <div className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
                                  <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Sin comprobante</p>
                                </div>
                              )}
                              <button
                                onClick={() => handleVerifyPayment(payment.id)}
                                disabled={verifyingPaymentId === payment.id}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {verifyingPaymentId === payment.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Verificando...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    Confirmar Pago
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Charge Modal */}
      {showCreateChargeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nuevo Cargo</h2>
              <button onClick={() => { setShowCreateChargeModal(false); resetChargeForm(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleCreateCharge} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidad *</label>
                <select 
                  value={chargeForm.unitId || ''} 
                  onChange={(e) => setChargeForm({ ...chargeForm, unitId: e.target.value })} 
                  required 
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Selecciona una unidad</option>
                  <option value="all" className="font-bold bg-blue-50 dark:bg-blue-900">🏢 Todas las unidades ({units.length})</option>
                  <option disabled>―――――――――――――――</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.buildingName} - Unidad {unit.unitNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Concepto *</label>
                <input type="text" value={chargeForm.concept || ''} onChange={(e) => setChargeForm({ ...chargeForm, concept: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
                  <select value={chargeForm.feeType} onChange={(e) => setChargeForm({ ...chargeForm, feeType: Number(e.target.value) as FeeType })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                    {Object.entries(feeTypeNames).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto *</label>
                  <input type="number" step="0.01" value={chargeForm.amount} onChange={(e) => setChargeForm({ ...chargeForm, amount: parseFloat(e.target.value) })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Vencimiento *</label>
                <input type="date" value={chargeForm.dueDate || ''} onChange={(e) => setChargeForm({ ...chargeForm, dueDate: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="applyLateFee" checked={chargeForm.applyLateFee} onChange={(e) => setChargeForm({ ...chargeForm, applyLateFee: e.target.checked })} className="rounded border-gray-300" />
                <label htmlFor="applyLateFee" className="text-sm text-gray-700 dark:text-gray-300">Aplicar recargo por mora</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowCreateChargeModal(false); resetChargeForm(); }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium">Crear Cargo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedCharge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Registrar Pago</h2>
              <button onClick={() => { setShowPaymentModal(false); resetPaymentForm(); setSelectedCharge(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Cargo: {selectedCharge.concept}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Saldo pendiente: <span className="font-bold text-red-600">{formatCurrency(selectedCharge.balance)}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto del Pago *</label>
                <input type="number" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })} required max={selectedCharge.balance} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de Pago *</label>
                <select value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: Number(e.target.value) as PaymentMethod })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                  {Object.entries(paymentMethodNames).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Referencia</label>
                <input type="text" value={paymentForm.referenceNumber || ''} onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" placeholder="Número de referencia" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
                <textarea value={paymentForm.notes || ''} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" rows={2} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowPaymentModal(false); resetPaymentForm(); setSelectedCharge(null); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600">Registrar Pago</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedCharge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Cancelar Cargo</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">¿Estás seguro de cancelar el cargo "{selectedCharge.concept}"?</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Razón de cancelación *</label>
                <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" rows={3} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowCancelModal(false); setCancelReason(''); setSelectedCharge(null); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">No, mantener</button>
                <button onClick={handleCancelCharge} disabled={!cancelReason} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium disabled:opacity-50">Sí, cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Cancel Modal */}
      {showBulkCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Cancelar Múltiples Cargos</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">¿Estás seguro de cancelar <span className="font-bold">{selectedCharges.size} cargo(s)</span>?</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Razón de cancelación</label>
                <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Opcional" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" rows={3} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowBulkCancelModal(false); setCancelReason(''); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">No, mantener</button>
                <button onClick={handleBulkCancel} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium">Sí, cancelar todos</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forgive Modal */}
      {showForgiveModal && selectedCharge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Condonar Cargo</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">¿Estás seguro de condonar el cargo "{selectedCharge.concept}" por {formatCurrency(selectedCharge.amount)}?</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Razón de condonación *</label>
                <textarea value={forgiveReason} onChange={(e) => setForgiveReason(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" rows={3} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowForgiveModal(false); setForgiveReason(''); setSelectedCharge(null); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">Cancelar</button>
                <button onClick={handleForgiveCharge} disabled={!forgiveReason} className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium disabled:opacity-50">Condonar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Monthly Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Generar Cargos Mensuales</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Se generarán cargos para todas las unidades según las configuraciones activas para el período:</p>
              <p className="text-lg font-bold text-center text-gray-900 dark:text-white mb-6">{new Date(selectedYear, selectedMonth - 1).toLocaleString('es', { month: 'long', year: 'numeric' })}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowGenerateModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">Cancelar</button>
                <button onClick={handleGenerateMonthly} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium">Generar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Config Modal */}
      {showCreateConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nueva Configuración de Cuota</h2>
              <button onClick={() => { setShowCreateConfigModal(false); resetConfigForm(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleCreateConfig} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                <input type="text" value={configForm.name || ''} onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" placeholder="Ej: Cuota de Mantenimiento" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
                  <select value={configForm.feeType} onChange={(e) => setConfigForm({ ...configForm, feeType: Number(e.target.value) as FeeType })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                    {Object.entries(feeTypeNames).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto Default *</label>
                  <input type="number" step="0.01" value={configForm.defaultAmount} onChange={(e) => setConfigForm({ ...configForm, defaultAmount: parseFloat(e.target.value) })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isRecurring" checked={configForm.isRecurring} onChange={(e) => setConfigForm({ ...configForm, isRecurring: e.target.checked })} className="rounded border-gray-300" />
                <label htmlFor="isRecurring" className="text-sm text-gray-700 dark:text-gray-300">Es recurrente (mensual)</label>
              </div>
              {configForm.isRecurring && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Día de cobro</label>
                    <input type="number" min={1} max={28} value={configForm.recurringDay || 1} onChange={(e) => setConfigForm({ ...configForm, recurringDay: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Días para vencer</label>
                    <input type="number" min={1} value={configForm.dueDayOffset || 10} onChange={(e) => setConfigForm({ ...configForm, dueDayOffset: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="applyLateFeeConfig" checked={configForm.applyLateFee} onChange={(e) => setConfigForm({ ...configForm, applyLateFee: e.target.checked })} className="rounded border-gray-300" />
                <label htmlFor="applyLateFeeConfig" className="text-sm text-gray-700 dark:text-gray-300">Aplicar recargo por mora</label>
              </div>
              {configForm.applyLateFee && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">% de recargo</label>
                    <input type="number" step="0.1" min={0} value={configForm.lateFeePercentage || 5} onChange={(e) => setConfigForm({ ...configForm, lateFeePercentage: parseFloat(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Días de gracia</label>
                    <input type="number" min={0} value={configForm.gracePeriodDays || 5} onChange={(e) => setConfigForm({ ...configForm, gracePeriodDays: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                <textarea value={configForm.description || ''} onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" rows={2} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowCreateConfigModal(false); resetConfigForm(); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium">Crear Configuración</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Config Modal */}
      {showEditConfigModal && selectedConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Editar Configuración de Cuota</h2>
              <button onClick={() => { setShowEditConfigModal(false); setSelectedConfig(null); resetConfigForm(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleUpdateConfig} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                <input type="text" value={configForm.name || ''} onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" placeholder="Ej: Cuota de Mantenimiento" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
                  <select value={configForm.feeType} onChange={(e) => setConfigForm({ ...configForm, feeType: Number(e.target.value) as FeeType })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                    {Object.entries(feeTypeNames).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto Default *</label>
                  <input type="number" step="0.01" value={configForm.defaultAmount} onChange={(e) => setConfigForm({ ...configForm, defaultAmount: parseFloat(e.target.value) })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isRecurringEdit" checked={configForm.isRecurring} onChange={(e) => setConfigForm({ ...configForm, isRecurring: e.target.checked })} className="rounded border-gray-300" />
                <label htmlFor="isRecurringEdit" className="text-sm text-gray-700 dark:text-gray-300">Es recurrente (mensual)</label>
              </div>
              {configForm.isRecurring && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Día de cobro</label>
                    <input type="number" min={1} max={28} value={configForm.recurringDay || 1} onChange={(e) => setConfigForm({ ...configForm, recurringDay: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Días para vencer</label>
                    <input type="number" min={1} value={configForm.dueDayOffset || 10} onChange={(e) => setConfigForm({ ...configForm, dueDayOffset: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="applyLateFeeConfigEdit" checked={configForm.applyLateFee} onChange={(e) => setConfigForm({ ...configForm, applyLateFee: e.target.checked })} className="rounded border-gray-300" />
                <label htmlFor="applyLateFeeConfigEdit" className="text-sm text-gray-700 dark:text-gray-300">Aplicar recargo por mora</label>
              </div>
              {configForm.applyLateFee && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">% de recargo</label>
                    <input type="number" step="0.1" min={0} value={configForm.lateFeePercentage || 5} onChange={(e) => setConfigForm({ ...configForm, lateFeePercentage: parseFloat(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Días de gracia</label>
                    <input type="number" min={0} value={configForm.gracePeriodDays || 5} onChange={(e) => setConfigForm({ ...configForm, gracePeriodDays: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                <textarea value={configForm.description || ''} onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" rows={2} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowEditConfigModal(false); setSelectedConfig(null); resetConfigForm(); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && chargeDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Detalle de Cargo</h2>
              <button onClick={() => { setShowDetailModal(false); setChargeDetail(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{chargeDetail.concept}</h3>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(chargeDetail.status)}`}>{chargeDetail.statusName}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><p className="text-sm text-gray-500">Unidad</p><p className="font-medium text-gray-900 dark:text-white">{chargeDetail.unitNumber}</p></div>
                <div><p className="text-sm text-gray-500">Tipo</p><p className="font-medium text-gray-900 dark:text-white">{chargeDetail.feeTypeName}</p></div>
                <div><p className="text-sm text-gray-500">Período</p><p className="font-medium text-gray-900 dark:text-white">{chargeDetail.billingPeriodMonth}/{chargeDetail.billingPeriodYear}</p></div>
                <div><p className="text-sm text-gray-500">Monto</p><p className="font-medium text-gray-900 dark:text-white">{formatCurrency(chargeDetail.amount)}</p></div>
                <div><p className="text-sm text-gray-500">Pagado</p><p className="font-medium text-green-600">{formatCurrency(chargeDetail.paidAmount)}</p></div>
                <div><p className="text-sm text-gray-500">Saldo</p><p className="font-medium text-red-600">{formatCurrency(chargeDetail.balance)}</p></div>
                <div><p className="text-sm text-gray-500">Vencimiento</p><p className="font-medium text-gray-900 dark:text-white">{new Date(chargeDetail.dueDate).toLocaleDateString()}</p></div>
                {chargeDetail.lateFeeAmount && <div><p className="text-sm text-gray-500">Recargo</p><p className="font-medium text-orange-600">{formatCurrency(chargeDetail.lateFeeAmount)}</p></div>}
              </div>
              {chargeDetail.payments.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Pagos Registrados</h4>
                  <div className="space-y-2">
                    {chargeDetail.payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div>
                          <p className="font-medium text-green-600">{formatCurrency(payment.amount)}</p>
                          <p className="text-sm text-gray-500">{payment.paymentMethodName} - {new Date(payment.paymentDate).toLocaleDateString()}</p>
                          {payment.referenceNumber && <p className="text-xs text-gray-400">Ref: {payment.referenceNumber}</p>}
                        </div>
                        {payment.isVerified && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {payment.isRefunded && <span className="text-xs text-red-500">Reembolsado</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Charge Modal */}
      {showDeleteModal && selectedCharge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Eliminar Cargo</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <p className="text-red-700 dark:text-red-300">Esta acción no se puede deshacer.</p>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                ¿Estás seguro de que deseas eliminar el cargo <span className="font-semibold">"{selectedCharge.concept}"</span> de la unidad <span className="font-semibold">{selectedCharge.unitNumber}</span>?
              </p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { setShowDeleteModal(false); setSelectedCharge(null); }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
                <button onClick={handleDeleteCharge} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Eliminar Cargos Seleccionados</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <p className="text-red-700 dark:text-red-300">Esta acción no se puede deshacer.</p>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                ¿Estás seguro de que deseas eliminar <span className="font-semibold">{selectedCharges.size} cargos</span> seleccionados?
              </p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowBulkDeleteModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
                <button onClick={handleBulkDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Eliminar Todos</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Charges Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Eliminar Todos los Cargos</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <p className="text-red-700 dark:text-red-300">¡Advertencia! Esta acción es irreversible.</p>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                ¿Estás seguro de que deseas eliminar <span className="font-semibold">todos los cargos ({charges.length})</span> del período <span className="font-semibold">{new Date(2000, selectedMonth - 1).toLocaleString('es', { month: 'long' })} {selectedYear}</span>?
              </p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowDeleteAllModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
                <button onClick={handleDeleteAllCharges} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Eliminar Todos</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Config Modal */}
      {showDeleteConfigModal && selectedConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Eliminar Configuración</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <p className="text-red-700 dark:text-red-300">Esta acción no se puede deshacer.</p>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                ¿Estás seguro de que deseas eliminar la configuración <span className="font-semibold">"{selectedConfig.name}"</span>?
              </p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { setShowDeleteConfigModal(false); setSelectedConfig(null); }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
                <button onClick={handleDeleteConfig} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Configs Modal */}
      {showDeleteAllConfigsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Eliminar Todas las Configuraciones</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <p className="text-red-700 dark:text-red-300">¡Advertencia! Esta acción es irreversible.</p>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                ¿Estás seguro de que deseas eliminar <span className="font-semibold">todas las configuraciones ({feeConfigs.length})</span> de este condominio?
              </p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowDeleteAllConfigsModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
                <button onClick={handleDeleteAllConfigs} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Eliminar Todas</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Verify Payment Modal */}
      {confirmVerifyPaymentId && (() => {
        const payment = pendingPayments.find(p => p.id === confirmVerifyPaymentId)
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">¿Confirmar verificación de pago?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Esta acción marcará el pago como verificado y no se puede deshacer.</p>
                {payment && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6 text-left">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Monto</p>
                        <p className="font-bold text-gray-900 dark:text-white">${payment.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Método</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{payment.paymentMethodName}</p>
                      </div>
                      {payment.unitNumber && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">Unidad</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{payment.unitNumber}</p>
                        </div>
                      )}
                      {payment.referenceNumber && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">Referencia</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{payment.referenceNumber}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 p-6 pt-0">
                <button
                  onClick={() => setConfirmVerifyPaymentId(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmVerifyPayment}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  Sí, Verificar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Proof Image Modal */}
      {showProofModal && proofImageUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowProofModal(false)}>
          <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowProofModal(false)}
              className="absolute -top-10 right-0 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            {proofImageUrl.endsWith('.pdf') ? (
              <iframe src={proofImageUrl} className="w-full h-[80vh] rounded-2xl bg-white" />
            ) : (
              <img src={proofImageUrl} alt="Comprobante de pago" className="w-full max-h-[85vh] object-contain rounded-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
