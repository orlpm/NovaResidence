import { useState, useEffect } from 'react'
import { 
  Plus, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Eye,
  Bell,
  Vote,
  Users,
  MessageSquare,
  X,
  Send,
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  Archive,
  Pin,
  Play,
  Square
} from 'lucide-react'
import { 
  communicationsService, 
  AnnouncementType,
  AnnouncementPriority,
  PollType,
  PollStatus,
  MeetingType,
  MeetingStatus,
  ForumCategory,
  ForumPostStatus,
  announcementTypeNames,
  announcementPriorityNames,
  pollTypeNames,
  meetingTypeNames,
  forumCategoryNames,
  type AnnouncementDto,
  type PollDto,
  type MeetingDto,
  type ForumPostDto,
  type CreateAnnouncementRequest,
  type CreatePollRequest,
  type CreateMeetingRequest,
  type CreateForumPostRequest,
  type MeetingQuorumDto
} from '../../lib/communicationsService'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { useAuthStore } from '../../stores/authStore'

type TabType = 'announcements' | 'polls' | 'meetings' | 'forum'

export default function Communications() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabType>('announcements')
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Announcements state
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([])
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [showDeleteAnnouncementModal, setShowDeleteAnnouncementModal] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementDto | null>(null)
  const [announcementForm, setAnnouncementForm] = useState<CreateAnnouncementRequest>({
    condominiumId: '',
    title: '',
    content: '',
    type: AnnouncementType.General,
    priority: AnnouncementPriority.Normal
  })

  // Polls state
  const [polls, setPolls] = useState<PollDto[]>([])
  const [showPollModal, setShowPollModal] = useState(false)
  const [showDeletePollModal, setShowDeletePollModal] = useState(false)
  const [showPollResultsModal, setShowPollResultsModal] = useState(false)
  const [selectedPoll, setSelectedPoll] = useState<PollDto | null>(null)
  const [pollForm, setPollForm] = useState<CreatePollRequest>({
    condominiumId: '',
    title: '',
    description: '',
    type: PollType.Survey,
    startDate: '',
    endDate: '',
    options: ['', '']
  })

  // Meetings state
  const [meetings, setMeetings] = useState<MeetingDto[]>([])
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [showDeleteMeetingModal, setShowDeleteMeetingModal] = useState(false)
  const [showMeetingDetailModal, setShowMeetingDetailModal] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingDto | null>(null)
  const [meetingQuorum, setMeetingQuorum] = useState<MeetingQuorumDto | null>(null)
  const [meetingForm, setMeetingForm] = useState<CreateMeetingRequest>({
    condominiumId: '',
    title: '',
    description: '',
    type: MeetingType.Ordinary,
    scheduledDate: '',
    requiredQuorumPercentage: 50
  })

  // Forum state
  const [forumPosts, setForumPosts] = useState<ForumPostDto[]>([])
  const [showForumModal, setShowForumModal] = useState(false)
  const [showDeleteForumModal, setShowDeleteForumModal] = useState(false)
  const [selectedForumPost, setSelectedForumPost] = useState<ForumPostDto | null>(null)
  const [forumForm, setForumForm] = useState<CreateForumPostRequest>({
    condominiumId: '',
    authorId: '',
    authorName: '',
    title: '',
    content: '',
    category: ForumCategory.General,
    allowComments: true
  })

  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  useEffect(() => { loadCondominiums() }, [])

  useEffect(() => {
    if (selectedCondominium) {
      loadDataForTab()
    }
  }, [selectedCondominium, activeTab])

  const loadCondominiums = async () => {
    try {
      const data = await condominiumService.getAllCondominiums(user?.id)
      setCondominiums(data)
      if (data.length > 0) setSelectedCondominium(data[0].id)
    } catch { setError('Error al cargar condominios') }
  }

  const loadDataForTab = async () => {
    if (!selectedCondominium) return
    setIsLoading(true)
    setError(null)
    try {
      switch (activeTab) {
        case 'announcements':
          const announcementsData = await communicationsService.getAnnouncements(selectedCondominium)
          setAnnouncements(announcementsData.items)
          break
        case 'polls':
          const pollsData = await communicationsService.getPolls(selectedCondominium)
          setPolls(pollsData.items)
          break
        case 'meetings':
          const meetingsData = await communicationsService.getMeetings(selectedCondominium)
          setMeetings(meetingsData.items)
          break
        case 'forum':
          const forumData = await communicationsService.getForumPosts(selectedCondominium)
          setForumPosts(forumData.items)
          break
      }
    } catch { setError('Error al cargar datos') }
    finally { setIsLoading(false) }
  }

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // ========== ANNOUNCEMENT HANDLERS ==========
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await communicationsService.createAnnouncement({
        ...announcementForm,
        condominiumId: selectedCondominium
      })
      setShowAnnouncementModal(false)
      resetAnnouncementForm()
      loadDataForTab()
      showSuccess('Aviso creado exitosamente')
    } catch { setError('Error al crear aviso') }
  }

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAnnouncement) return
    try {
      await communicationsService.updateAnnouncement(selectedAnnouncement.id, {
        title: announcementForm.title,
        content: announcementForm.content,
        type: announcementForm.type,
        priority: announcementForm.priority,
        expiresAt: announcementForm.expiresAt,
        meetingDate: announcementForm.meetingDate,
        meetingLocation: announcementForm.meetingLocation
      })
      setShowAnnouncementModal(false)
      resetAnnouncementForm()
      loadDataForTab()
      showSuccess('Aviso actualizado exitosamente')
    } catch { setError('Error al actualizar aviso') }
  }

  const handleDeleteAnnouncement = async () => {
    if (!selectedAnnouncement) return
    try {
      await communicationsService.deleteAnnouncement(selectedAnnouncement.id)
      setShowDeleteAnnouncementModal(false)
      setSelectedAnnouncement(null)
      loadDataForTab()
      showSuccess('Aviso eliminado exitosamente')
    } catch { setError('Error al eliminar aviso') }
  }

  const handlePublishAnnouncement = async (announcement: AnnouncementDto) => {
    try {
      await communicationsService.publishAnnouncement(announcement.id)
      loadDataForTab()
      showSuccess('Aviso publicado')
    } catch { setError('Error al publicar aviso') }
    setOpenDropdown(null)
  }

  const handleUnpublishAnnouncement = async (announcement: AnnouncementDto) => {
    try {
      await communicationsService.unpublishAnnouncement(announcement.id)
      loadDataForTab()
      showSuccess('Aviso despublicado')
    } catch { setError('Error al despublicar aviso') }
    setOpenDropdown(null)
  }

  const resetAnnouncementForm = () => {
    setAnnouncementForm({
      condominiumId: '',
      title: '',
      content: '',
      type: AnnouncementType.General,
      priority: AnnouncementPriority.Normal
    })
    setSelectedAnnouncement(null)
  }

  // ========== POLL HANDLERS ==========
  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await communicationsService.createPoll({
        ...pollForm,
        condominiumId: selectedCondominium,
        options: pollForm.options.filter(o => o.trim() !== '')
      })
      setShowPollModal(false)
      resetPollForm()
      loadDataForTab()
      showSuccess('Encuesta creada exitosamente')
    } catch { setError('Error al crear encuesta') }
  }

  const handleUpdatePoll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPoll) return
    try {
      await communicationsService.updatePoll(selectedPoll.id, {
        title: pollForm.title,
        description: pollForm.description,
        startDate: pollForm.startDate,
        endDate: pollForm.endDate
      })
      setShowPollModal(false)
      resetPollForm()
      loadDataForTab()
      showSuccess('Encuesta actualizada exitosamente')
    } catch { setError('Error al actualizar encuesta') }
  }

  const handleDeletePoll = async () => {
    if (!selectedPoll) return
    try {
      await communicationsService.deletePoll(selectedPoll.id)
      setShowDeletePollModal(false)
      setSelectedPoll(null)
      loadDataForTab()
      showSuccess('Encuesta eliminada exitosamente')
    } catch { setError('Error al eliminar encuesta') }
  }

  const handlePublishPoll = async (poll: PollDto) => {
    try {
      await communicationsService.publishPoll(poll.id)
      loadDataForTab()
      showSuccess('Encuesta publicada')
    } catch { setError('Error al publicar encuesta') }
    setOpenDropdown(null)
  }

  const handleClosePoll = async (poll: PollDto) => {
    try {
      await communicationsService.closePoll(poll.id)
      loadDataForTab()
      showSuccess('Encuesta cerrada')
    } catch { setError('Error al cerrar encuesta') }
    setOpenDropdown(null)
  }

  const handleCancelPoll = async (poll: PollDto) => {
    try {
      await communicationsService.cancelPoll(poll.id)
      loadDataForTab()
      showSuccess('Encuesta cancelada')
    } catch { setError('Error al cancelar encuesta') }
    setOpenDropdown(null)
  }

  const openPollResults = async (poll: PollDto) => {
    setSelectedPoll(poll)
    setShowPollResultsModal(true)
  }

  const resetPollForm = () => {
    setPollForm({
      condominiumId: '',
      title: '',
      description: '',
      type: PollType.Survey,
      startDate: '',
      endDate: '',
      options: ['', '']
    })
    setSelectedPoll(null)
  }

  const addPollOption = () => {
    setPollForm(prev => ({ ...prev, options: [...prev.options, ''] }))
  }

  const removePollOption = (index: number) => {
    if (pollForm.options.length <= 2) return
    setPollForm(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }))
  }

  const updatePollOption = (index: number, value: string) => {
    setPollForm(prev => ({
      ...prev,
      options: prev.options.map((o, i) => i === index ? value : o)
    }))
  }

  // ========== MEETING HANDLERS ==========
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await communicationsService.createMeeting({
        ...meetingForm,
        condominiumId: selectedCondominium
      })
      setShowMeetingModal(false)
      resetMeetingForm()
      loadDataForTab()
      showSuccess('Reunión creada exitosamente')
    } catch { setError('Error al crear reunión') }
  }

  const handleUpdateMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMeeting) return
    try {
      await communicationsService.updateMeeting(selectedMeeting.id, {
        title: meetingForm.title,
        description: meetingForm.description,
        scheduledDate: meetingForm.scheduledDate,
        location: meetingForm.location,
        virtualMeetingUrl: meetingForm.virtualMeetingUrl,
        agenda: meetingForm.agenda
      })
      setShowMeetingModal(false)
      resetMeetingForm()
      loadDataForTab()
      showSuccess('Reunión actualizada exitosamente')
    } catch { setError('Error al actualizar reunión') }
  }

  const handleDeleteMeeting = async () => {
    if (!selectedMeeting) return
    try {
      await communicationsService.deleteMeeting(selectedMeeting.id)
      setShowDeleteMeetingModal(false)
      setSelectedMeeting(null)
      loadDataForTab()
      showSuccess('Reunión eliminada exitosamente')
    } catch { setError('Error al eliminar reunión') }
  }

  const handleStartMeeting = async (meeting: MeetingDto) => {
    try {
      await communicationsService.startMeeting(meeting.id)
      loadDataForTab()
      showSuccess('Reunión iniciada')
    } catch { setError('Error al iniciar reunión') }
    setOpenDropdown(null)
  }

  const handleEndMeeting = async (meeting: MeetingDto) => {
    try {
      await communicationsService.endMeeting(meeting.id)
      loadDataForTab()
      showSuccess('Reunión finalizada')
    } catch { setError('Error al finalizar reunión') }
    setOpenDropdown(null)
  }

  const handleCancelMeeting = async (meeting: MeetingDto) => {
    try {
      await communicationsService.cancelMeeting(meeting.id)
      loadDataForTab()
      showSuccess('Reunión cancelada')
    } catch { setError('Error al cancelar reunión') }
    setOpenDropdown(null)
  }

  const openMeetingDetail = async (meeting: MeetingDto) => {
    try {
      const [meetingData, quorumData] = await Promise.all([
        communicationsService.getMeetingById(meeting.id),
        communicationsService.getMeetingQuorum(meeting.id)
      ])
      setSelectedMeeting(meetingData)
      setMeetingQuorum(quorumData)
      setShowMeetingDetailModal(true)
    } catch { setError('Error al cargar detalle de reunión') }
  }

  const resetMeetingForm = () => {
    setMeetingForm({
      condominiumId: '',
      title: '',
      description: '',
      type: MeetingType.Ordinary,
      scheduledDate: '',
      requiredQuorumPercentage: 50
    })
    setSelectedMeeting(null)
  }

  // ========== FORUM HANDLERS ==========
  const handleCreateForumPost = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await communicationsService.createForumPost({
        ...forumForm,
        condominiumId: selectedCondominium,
        authorId: user?.id || '',
        authorName: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Admin'
      })
      setShowForumModal(false)
      resetForumForm()
      loadDataForTab()
      showSuccess('Publicación creada exitosamente')
    } catch { setError('Error al crear publicación') }
  }

  const handleUpdateForumPost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedForumPost) return
    try {
      await communicationsService.updateForumPost(selectedForumPost.id, {
        title: forumForm.title,
        content: forumForm.content,
        category: forumForm.category,
        allowComments: forumForm.allowComments ?? true
      })
      setShowForumModal(false)
      resetForumForm()
      loadDataForTab()
      showSuccess('Publicación actualizada exitosamente')
    } catch { setError('Error al actualizar publicación') }
  }

  const handleDeleteForumPost = async () => {
    if (!selectedForumPost) return
    try {
      await communicationsService.deleteForumPost(selectedForumPost.id)
      setShowDeleteForumModal(false)
      setSelectedForumPost(null)
      loadDataForTab()
      showSuccess('Publicación eliminada exitosamente')
    } catch { setError('Error al eliminar publicación') }
  }

  const handlePinForumPost = async (post: ForumPostDto) => {
    try {
      await communicationsService.pinForumPost(post.id)
      loadDataForTab()
      showSuccess('Publicación fijada')
    } catch { setError('Error al fijar publicación') }
    setOpenDropdown(null)
  }

  const handleUnpinForumPost = async (post: ForumPostDto) => {
    try {
      await communicationsService.unpinForumPost(post.id)
      loadDataForTab()
      showSuccess('Publicación desfijada')
    } catch { setError('Error al desfijar publicación') }
    setOpenDropdown(null)
  }

  const handleArchiveForumPost = async (post: ForumPostDto) => {
    try {
      await communicationsService.archiveForumPost(post.id)
      loadDataForTab()
      showSuccess('Publicación archivada')
    } catch { setError('Error al archivar publicación') }
    setOpenDropdown(null)
  }

  const handleHideForumPost = async (post: ForumPostDto) => {
    try {
      await communicationsService.hideForumPost(post.id)
      loadDataForTab()
      showSuccess('Publicación ocultada')
    } catch { setError('Error al ocultar publicación') }
    setOpenDropdown(null)
  }

  const handleRestoreForumPost = async (post: ForumPostDto) => {
    try {
      await communicationsService.restoreForumPost(post.id)
      loadDataForTab()
      showSuccess('Publicación restaurada')
    } catch { setError('Error al restaurar publicación') }
    setOpenDropdown(null)
  }

  const resetForumForm = () => {
    setForumForm({
      condominiumId: '',
      authorId: '',
      authorName: '',
      title: '',
      content: '',
      category: ForumCategory.General,
      allowComments: true
    })
    setSelectedForumPost(null)
  }

  // ========== HELPER FUNCTIONS ==========
  const getPriorityColor = (priority: AnnouncementPriority) => {
    switch (priority) {
      case AnnouncementPriority.Low: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      case AnnouncementPriority.Normal: return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case AnnouncementPriority.High: return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
      case AnnouncementPriority.Urgent: return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getPollStatusColor = (status: PollStatus) => {
    switch (status) {
      case PollStatus.Draft: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      case PollStatus.Active: return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      case PollStatus.Closed: return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case PollStatus.Cancelled: return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getMeetingStatusColor = (status: MeetingStatus) => {
    switch (status) {
      case MeetingStatus.Scheduled: return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case MeetingStatus.InProgress: return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      case MeetingStatus.Completed: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      case MeetingStatus.Cancelled: return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const tabs = [
    { id: 'announcements' as TabType, label: 'Avisos', icon: Bell },
    { id: 'polls' as TabType, label: 'Encuestas', icon: Vote },
    { id: 'meetings' as TabType, label: 'Reuniones', icon: Users },
    { id: 'forum' as TabType, label: 'Foro', icon: MessageSquare }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comunicación y Gobernanza</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestiona avisos, encuestas, reuniones y el foro del condominio</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <Bell className="w-5 h-5 text-red-500" />
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

      {/* Condominium Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Seleccionar Condominio</label>
        <select
          className="w-full md:w-96 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          value={selectedCondominium}
          onChange={(e) => setSelectedCondominium(e.target.value)}
          disabled={condominiums.length === 0}
        >
          {condominiums.length === 0 ? (
            <option value="">No hay condominios disponibles</option>
          ) : (
            condominiums.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))
          )}
        </select>
      </div>

      {/* No Condominiums Warning */}
      {condominiums.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center">
                <Bell className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
                No tienes condominios registrados
              </h3>
              <p className="text-amber-800 dark:text-amber-200 mb-4">
                Para utilizar los módulos de Comunicación y Gobernanza (Avisos, Encuestas, Reuniones y Foro), 
                es necesario crear al menos un condominio con sus edificios y unidades.
              </p>
              <a
                href="/admin/condominiums"
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear mi primer condominio
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {condominiums.length > 0 && (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
        <>
          {/* ========== ANNOUNCEMENTS TAB ========== */}
          {activeTab === 'announcements' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Avisos y Circulares</h2>
                <button
                  onClick={() => { resetAnnouncementForm(); setShowAnnouncementModal(true) }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all"
                >
                  <Plus className="w-5 h-5" /> Nuevo Aviso
                </button>
              </div>

              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Título</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Prioridad</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {announcements.map((announcement) => (
                      <tr key={announcement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-white">{announcement.title}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{announcement.content}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-300">{announcement.typeName}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(announcement.priority)}`}>
                            {announcement.priorityName}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {announcement.isPublished ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Publicado</span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">Borrador</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(announcement.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="relative">
                            <button
                              onClick={() => setOpenDropdown(openDropdown === announcement.id ? null : announcement.id)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-5 h-5 text-gray-400" />
                            </button>
                            {openDropdown === announcement.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                                <button
                                  onClick={() => {
                                    setSelectedAnnouncement(announcement)
                                    setAnnouncementForm({
                                      condominiumId: selectedCondominium,
                                      title: announcement.title,
                                      content: announcement.content,
                                      type: announcement.type,
                                      priority: announcement.priority,
                                      expiresAt: announcement.expiresAt,
                                      meetingDate: announcement.meetingDate,
                                      meetingLocation: announcement.meetingLocation
                                    })
                                    setShowAnnouncementModal(true)
                                    setOpenDropdown(null)
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Edit2 className="w-4 h-4" /> Editar
                                </button>
                                {!announcement.isPublished && (
                                  <button
                                    onClick={() => handlePublishAnnouncement(announcement)}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Send className="w-4 h-4" /> Publicar
                                  </button>
                                )}
                                {announcement.isPublished && (
                                  <button
                                    onClick={() => handleUnpublishAnnouncement(announcement)}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <XCircle className="w-4 h-4" /> Despublicar
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedAnnouncement(announcement)
                                    setShowDeleteAnnouncementModal(true)
                                    setOpenDropdown(null)
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Trash2 className="w-4 h-4" /> Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {announcements.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          <Bell className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                          No hay avisos registrados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========== POLLS TAB ========== */}
          {activeTab === 'polls' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Encuestas y Votaciones</h2>
                <button
                  onClick={() => { resetPollForm(); setShowPollModal(true) }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all"
                >
                  <Plus className="w-5 h-5" /> Nueva Encuesta
                </button>
              </div>

              <div className="grid gap-4">
                {polls.map((poll) => (
                  <div key={poll.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{poll.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{poll.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPollStatusColor(poll.status)}`}>
                          {poll.statusName}
                        </span>
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === poll.id ? null : poll.id)}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-400" />
                          </button>
                          {openDropdown === poll.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                              <button
                                onClick={() => openPollResults(poll)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Eye className="w-4 h-4" /> Ver Resultados
                              </button>
                              {poll.status === PollStatus.Draft && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedPoll(poll)
                                      setPollForm({
                                        condominiumId: selectedCondominium,
                                        title: poll.title,
                                        description: poll.description,
                                        type: poll.type,
                                        startDate: poll.startDate.split('T')[0],
                                        endDate: poll.endDate.split('T')[0],
                                        options: poll.options.map(o => o.text)
                                      })
                                      setShowPollModal(true)
                                      setOpenDropdown(null)
                                    }}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Edit2 className="w-4 h-4" /> Editar
                                  </button>
                                  <button
                                    onClick={() => handlePublishPoll(poll)}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Send className="w-4 h-4" /> Publicar
                                  </button>
                                </>
                              )}
                              {poll.status === PollStatus.Active && (
                                <button
                                  onClick={() => handleClosePoll(poll)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Square className="w-4 h-4" /> Cerrar
                                </button>
                              )}
                              {(poll.status === PollStatus.Draft || poll.status === PollStatus.Active) && (
                                <button
                                  onClick={() => handleCancelPoll(poll)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <XCircle className="w-4 h-4" /> Cancelar
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedPoll(poll)
                                  setShowDeletePollModal(true)
                                  setOpenDropdown(null)
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Trash2 className="w-4 h-4" /> Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(poll.startDate)} - {formatDate(poll.endDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {poll.totalVotes} votos
                      </span>
                      <span>
                        Participación: {poll.participationPercentage.toFixed(1)}%
                      </span>
                      {poll.requiresQuorum && (
                        <span className={poll.hasQuorum ? 'text-green-600' : 'text-orange-600'}>
                          {poll.hasQuorum ? '✓ Quórum alcanzado' : `Quórum requerido: ${poll.quorumPercentage}%`}
                        </span>
                      )}
                    </div>

                    {/* Poll options preview */}
                    <div className="mt-4 space-y-2">
                      {poll.options.slice(0, 3).map((option) => (
                        <div key={option.id} className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-6 overflow-hidden">
                            <div 
                              className="bg-sky-500 h-full"
                              style={{ width: `${option.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-300 w-32 truncate">{option.text}</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">
                            {option.percentage.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                      {poll.options.length > 3 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">+{poll.options.length - 3} opciones más</p>
                      )}
                    </div>
                  </div>
                ))}
                {polls.length === 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-12 text-center text-gray-500 dark:text-gray-400">
                    <Vote className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    No hay encuestas registradas
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== MEETINGS TAB ========== */}
          {activeTab === 'meetings' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reuniones y Juntas</h2>
                <button
                  onClick={() => { resetMeetingForm(); setShowMeetingModal(true) }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all"
                >
                  <Plus className="w-5 h-5" /> Nueva Reunión
                </button>
              </div>

              <div className="grid gap-4">
                {meetings.map((meeting) => (
                  <div key={meeting.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{meeting.title}</h3>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getMeetingStatusColor(meeting.status)}`}>
                            {meeting.statusName}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{meeting.description}</p>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === meeting.id ? null : meeting.id)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>
                        {openDropdown === meeting.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                            <button
                              onClick={() => { openMeetingDetail(meeting); setOpenDropdown(null) }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Eye className="w-4 h-4" /> Ver Detalle
                            </button>
                            {meeting.status === MeetingStatus.Scheduled && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedMeeting(meeting)
                                    setMeetingForm({
                                      condominiumId: selectedCondominium,
                                      title: meeting.title,
                                      description: meeting.description,
                                      type: meeting.type,
                                      scheduledDate: meeting.scheduledDate.split('T')[0] + 'T' + meeting.scheduledDate.split('T')[1]?.substring(0,5),
                                      location: meeting.location,
                                      virtualMeetingUrl: meeting.virtualMeetingUrl,
                                      agenda: meeting.agenda,
                                      requiredQuorumPercentage: meeting.requiredQuorumPercentage
                                    })
                                    setShowMeetingModal(true)
                                    setOpenDropdown(null)
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Edit2 className="w-4 h-4" /> Editar
                                </button>
                                <button
                                  onClick={() => handleStartMeeting(meeting)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Play className="w-4 h-4" /> Iniciar
                                </button>
                                <button
                                  onClick={() => handleCancelMeeting(meeting)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <XCircle className="w-4 h-4" /> Cancelar
                                </button>
                              </>
                            )}
                            {meeting.status === MeetingStatus.InProgress && (
                              <button
                                onClick={() => handleEndMeeting(meeting)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Square className="w-4 h-4" /> Finalizar
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedMeeting(meeting)
                                setShowDeleteMeetingModal(true)
                                setOpenDropdown(null)
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(meeting.scheduledDate)}
                      </span>
                      {meeting.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {meeting.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {meeting.attendees?.length || 0} asistentes
                      </span>
                      <span>
                        Quórum requerido: {meeting.requiredQuorumPercentage}%
                      </span>
                    </div>
                  </div>
                ))}
                {meetings.length === 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-12 text-center text-gray-500 dark:text-gray-400">
                    <Users className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    No hay reuniones registradas
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== FORUM TAB ========== */}
          {activeTab === 'forum' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Foro de la Comunidad</h2>
                <button
                  onClick={() => { resetForumForm(); setShowForumModal(true) }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all"
                >
                  <Plus className="w-5 h-5" /> Nueva Publicación
                </button>
              </div>

              <div className="space-y-4">
                {forumPosts.map((post) => (
                  <div key={post.id} className={`bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 ${post.isPinned ? 'ring-2 ring-yellow-400 dark:ring-yellow-500' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {post.isPinned && <Pin className="w-4 h-4 text-yellow-500" />}
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{post.title}</h3>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{post.content}</p>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === post.id ? null : post.id)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>
                        {openDropdown === post.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                            <button
                              onClick={() => {
                                setSelectedForumPost(post)
                                setForumForm({
                                  condominiumId: selectedCondominium,
                                  authorId: post.authorId,
                                  authorName: post.authorName,
                                  title: post.title,
                                  content: post.content,
                                  category: post.category,
                                  allowComments: post.allowComments
                                })
                                setShowForumModal(true)
                                setOpenDropdown(null)
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Edit2 className="w-4 h-4" /> Editar
                            </button>
                            {post.isPinned ? (
                              <button
                                onClick={() => handleUnpinForumPost(post)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Pin className="w-4 h-4" /> Desfijar
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePinForumPost(post)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Pin className="w-4 h-4" /> Fijar
                              </button>
                            )}
                            {post.status === ForumPostStatus.Active && (
                              <>
                                <button
                                  onClick={() => handleHideForumPost(post)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <XCircle className="w-4 h-4" /> Ocultar
                                </button>
                                <button
                                  onClick={() => handleArchiveForumPost(post)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Archive className="w-4 h-4" /> Archivar
                                </button>
                              </>
                            )}
                            {(post.status === ForumPostStatus.Hidden || post.status === ForumPostStatus.Archived) && (
                              <button
                                onClick={() => handleRestoreForumPost(post)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <CheckCircle className="w-4 h-4" /> Restaurar
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedForumPost(post)
                                setShowDeleteForumModal(true)
                                setOpenDropdown(null)
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300">{post.categoryName}</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {post.commentCount} comentarios
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {post.viewCount} vistas
                      </span>
                      <span>Por: {post.authorName}</span>
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                  </div>
                ))}
                {forumPosts.length === 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-12 text-center text-gray-500 dark:text-gray-400">
                    <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    No hay publicaciones en el foro
                  </div>
                )}
              </div>
            </div>
          )}
        </>
        )}
      </div>
      )}

      {/* ========== MODALS ========== */}
      
      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedAnnouncement ? 'Editar Aviso' : 'Nuevo Aviso'}
              </h2>
              <button onClick={() => { setShowAnnouncementModal(false); resetAnnouncementForm() }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={selectedAnnouncement ? handleUpdateAnnouncement : handleCreateAnnouncement}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título*</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contenido*</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo*</label>
                    <select
                      required
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                      value={announcementForm.type}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, type: parseInt(e.target.value) })}
                    >
                      {Object.entries(announcementTypeNames).map(([key, name]) => (
                        <option key={key} value={key}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridad*</label>
                    <select
                      required
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                      value={announcementForm.priority}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, priority: parseInt(e.target.value) })}
                    >
                      {Object.entries(announcementPriorityNames).map(([key, name]) => (
                        <option key={key} value={key}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Expiración</label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    value={announcementForm.expiresAt?.split('.')[0] || ''}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, expiresAt: e.target.value || null })}
                  />
                </div>
                {announcementForm.type === AnnouncementType.MeetingMinutes && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Reunión</label>
                      <input
                        type="datetime-local"
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                        value={announcementForm.meetingDate?.split('.')[0] || ''}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, meetingDate: e.target.value || null })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación de Reunión</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                        value={announcementForm.meetingLocation || ''}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, meetingLocation: e.target.value || null })}
                      />
                    </div>
                  </>
                )}
                {!selectedAnnouncement && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="publishImmediately"
                      className="rounded border-gray-300 dark:border-gray-600 text-sky-500 focus:ring-sky-500"
                      checked={announcementForm.publishImmediately || false}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, publishImmediately: e.target.checked })}
                    />
                    <label htmlFor="publishImmediately" className="text-sm text-gray-700 dark:text-gray-300">Publicar inmediatamente</label>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => { setShowAnnouncementModal(false); resetAnnouncementForm() }} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all">
                  {selectedAnnouncement ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Poll Modal */}
      {showPollModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedPoll ? 'Editar Encuesta' : 'Nueva Encuesta'}
              </h2>
              <button onClick={() => { setShowPollModal(false); resetPollForm() }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={selectedPoll ? handleUpdatePoll : handleCreatePoll}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título*</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    value={pollForm.title}
                    onChange={(e) => setPollForm({ ...pollForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    value={pollForm.description}
                    onChange={(e) => setPollForm({ ...pollForm, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo*</label>
                    <select
                      required
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                      value={pollForm.type}
                      onChange={(e) => setPollForm({ ...pollForm, type: parseInt(e.target.value) })}
                      disabled={!!selectedPoll}
                    >
                      {Object.entries(pollTypeNames).map(([key, name]) => (
                        <option key={key} value={key}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quórum (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                      value={pollForm.quorumPercentage || ''}
                      onChange={(e) => setPollForm({ ...pollForm, quorumPercentage: e.target.value ? parseInt(e.target.value) : null, requiresQuorum: !!e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio*</label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                      value={pollForm.startDate.split('T')[0]}
                      onChange={(e) => setPollForm({ ...pollForm, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Fin*</label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                      value={pollForm.endDate.split('T')[0]}
                      onChange={(e) => setPollForm({ ...pollForm, endDate: e.target.value })}
                    />
                  </div>
                </div>
                {!selectedPoll && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Opciones*</label>
                      {pollForm.options.map((option, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            required
                            placeholder={`Opción ${index + 1}`}
                            className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                            value={option}
                            onChange={(e) => updatePollOption(index, e.target.value)}
                          />
                          {pollForm.options.length > 2 && (
                            <button type="button" onClick={() => removePollOption(index)} className="text-red-500 hover:text-red-700 p-2">
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={addPollOption} className="text-sky-600 dark:text-sky-400 text-sm hover:underline">
                        + Agregar opción
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 dark:border-gray-600 text-sky-500 focus:ring-sky-500"
                          checked={pollForm.allowMultipleVotes || false}
                          onChange={(e) => setPollForm({ ...pollForm, allowMultipleVotes: e.target.checked })}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Permitir múltiples votos</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 dark:border-gray-600 text-sky-500 focus:ring-sky-500"
                          checked={pollForm.isAnonymous || false}
                          onChange={(e) => setPollForm({ ...pollForm, isAnonymous: e.target.checked })}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Votación anónima</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => { setShowPollModal(false); resetPollForm() }} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all">
                  {selectedPoll ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Meeting Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedMeeting ? 'Editar Reunión' : 'Nueva Reunión'}
              </h2>
              <button onClick={() => { setShowMeetingModal(false); resetMeetingForm() }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={selectedMeeting ? handleUpdateMeeting : handleCreateMeeting}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título*</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    value={meetingForm.title}
                    onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    value={meetingForm.description}
                    onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo*</label>
                    <select
                      required
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                      value={meetingForm.type}
                      onChange={(e) => setMeetingForm({ ...meetingForm, type: parseInt(e.target.value) })}
                      disabled={!!selectedMeeting}
                    >
                      {Object.entries(meetingTypeNames).map(([key, name]) => (
                        <option key={key} value={key}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quórum (%)*</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                      value={meetingForm.requiredQuorumPercentage}
                      onChange={(e) => setMeetingForm({ ...meetingForm, requiredQuorumPercentage: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha y Hora*</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    value={meetingForm.scheduledDate}
                    onChange={(e) => setMeetingForm({ ...meetingForm, scheduledDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    placeholder="Ej: Salón de eventos"
                    value={meetingForm.location || ''}
                    onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value || null })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL Reunión Virtual</label>
                  <input
                    type="url"
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    placeholder="Ej: https://zoom.us/j/..."
                    value={meetingForm.virtualMeetingUrl || ''}
                    onChange={(e) => setMeetingForm({ ...meetingForm, virtualMeetingUrl: e.target.value || null })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agenda</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    placeholder="Puntos a tratar en la reunión..."
                    value={meetingForm.agenda || ''}
                    onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value || null })}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => { setShowMeetingModal(false); resetMeetingForm() }} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all">
                  {selectedMeeting ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forum Post Modal */}
      {showForumModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedForumPost ? 'Editar Publicación' : 'Nueva Publicación'}
              </h2>
              <button onClick={() => { setShowForumModal(false); resetForumForm() }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={selectedForumPost ? handleUpdateForumPost : handleCreateForumPost}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título*</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    value={forumForm.title}
                    onChange={(e) => setForumForm({ ...forumForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contenido*</label>
                  <textarea
                    required
                    rows={5}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    value={forumForm.content}
                    onChange={(e) => setForumForm({ ...forumForm, content: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría*</label>
                  <select
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    value={forumForm.category}
                    onChange={(e) => setForumForm({ ...forumForm, category: parseInt(e.target.value) })}
                  >
                    {Object.entries(forumCategoryNames).map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowComments"
                    className="rounded border-gray-300 dark:border-gray-600 text-sky-500 focus:ring-sky-500"
                    checked={forumForm.allowComments}
                    onChange={(e) => setForumForm({ ...forumForm, allowComments: e.target.checked })}
                  />
                  <label htmlFor="allowComments" className="text-sm text-gray-700 dark:text-gray-300">Permitir comentarios</label>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => { setShowForumModal(false); resetForumForm() }} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all">
                  {selectedForumPost ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modals */}
      {showDeleteAnnouncementModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Eliminar Aviso</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">¿Estás seguro de que deseas eliminar este aviso? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteAnnouncementModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={handleDeleteAnnouncement} className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeletePollModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Eliminar Encuesta</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">¿Estás seguro de que deseas eliminar esta encuesta? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeletePollModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={handleDeletePoll} className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteMeetingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Eliminar Reunión</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">¿Estás seguro de que deseas eliminar esta reunión? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteMeetingModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={handleDeleteMeeting} className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteForumModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Eliminar Publicación</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteForumModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={handleDeleteForumPost} className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Poll Results Modal */}
      {showPollResultsModal && selectedPoll && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Resultados de Encuesta</h2>
              <button onClick={() => setShowPollResultsModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white">{selectedPoll.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{selectedPoll.description}</p>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-4 text-center">
              <div className="bg-sky-50 dark:bg-sky-900/30 p-3 rounded-xl">
                <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{selectedPoll.totalVotes}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Votos totales</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-xl">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedPoll.participationPercentage.toFixed(1)}%</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Participación</p>
              </div>
              <div className={`p-3 rounded-xl ${selectedPoll.hasQuorum ? 'bg-green-50 dark:bg-green-900/30' : 'bg-orange-50 dark:bg-orange-900/30'}`}>
                <p className={`text-2xl font-bold ${selectedPoll.hasQuorum ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {selectedPoll.hasQuorum ? '✓' : '✗'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Quórum</p>
              </div>
            </div>
            <div className="space-y-3">
              {selectedPoll.options.map((option, index) => (
                <div key={option.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{option.text}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{option.voteCount} votos ({option.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full ${index === 0 ? 'bg-sky-500' : index === 1 ? 'bg-green-500' : index === 2 ? 'bg-yellow-500' : 'bg-purple-500'}`}
                      style={{ width: `${option.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowPollResultsModal(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Detail Modal */}
      {showMeetingDetailModal && selectedMeeting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Detalle de Reunión</h2>
              <button onClick={() => setShowMeetingDetailModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{selectedMeeting.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedMeeting.description}</p>
              
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(selectedMeeting.scheduledDate)}
                </span>
                {selectedMeeting.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {selectedMeeting.location}
                  </span>
                )}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMeetingStatusColor(selectedMeeting.status)}`}>
                  {selectedMeeting.statusName}
                </span>
              </div>
            </div>

            {meetingQuorum && (
              <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Quórum</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{meetingQuorum.totalUnits}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Unidades totales</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-sky-600 dark:text-sky-400">{meetingQuorum.invitedUnits}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Invitados</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{meetingQuorum.attendedUnits}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Asistentes</p>
                  </div>
                  <div>
                    <p className={`text-xl font-bold ${meetingQuorum.hasQuorum ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {meetingQuorum.currentQuorumPercentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Quórum actual ({meetingQuorum.requiredQuorumPercentage}% req.)
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${meetingQuorum.hasQuorum ? 'bg-green-500' : 'bg-orange-500'}`}
                      style={{ width: `${Math.min(meetingQuorum.currentQuorumPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {selectedMeeting.agenda && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Agenda</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">{selectedMeeting.agenda}</p>
              </div>
            )}

            {selectedMeeting.minutes && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Acta de Reunión</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">{selectedMeeting.minutes}</p>
              </div>
            )}

            {selectedMeeting.attendees && selectedMeeting.attendees.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Asistentes ({selectedMeeting.attendees.length})</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Unidad</th>
                        <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Nombre</th>
                        <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Estado</th>
                        <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Representante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {selectedMeeting.attendees.map((attendee) => (
                        <tr key={attendee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{attendee.unitNumber}</td>
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{attendee.residentName}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              attendee.status === 3 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 
                              attendee.status === 1 ? 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300' : 
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {attendee.statusName}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{attendee.hasProxy ? attendee.proxyName : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowMeetingDetailModal(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
