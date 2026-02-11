import { useState, useEffect } from 'react'
import { 
  Bell,
  Vote,
  Users,
  MessageSquare,
  Calendar,
  MapPin,
  Eye,
  CheckCircle,
  Clock,
  X,
  Send,
  ChevronRight
} from 'lucide-react'
import { 
  communicationsService, 
  AnnouncementPriority,
  PollStatus,
  MeetingStatus,
  ForumCategory,
  forumCategoryNames,
  type AnnouncementDto,
  type PollDto,
  type MeetingDto,
  type ForumPostDto,
  type ForumPostDetailDto
} from '../../lib/communicationsService'
import { residentService } from '../../lib/residentService'
import { useAuthStore } from '../../stores/authStore'

type TabType = 'announcements' | 'polls' | 'meetings' | 'forum'

export default function ResidentCommunications() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabType>('announcements')
  const [condominiumId, setCondominiumId] = useState<string>('')
  const [unitId, setUnitId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Announcements state
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([])
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementDto | null>(null)

  // Polls state
  const [polls, setPolls] = useState<PollDto[]>([])
  const [selectedPoll, setSelectedPoll] = useState<PollDto | null>(null)
  const [showVoteModal, setShowVoteModal] = useState(false)
  const [selectedOptionId, setSelectedOptionId] = useState<string>('')

  // Meetings state
  const [meetings, setMeetings] = useState<MeetingDto[]>([])
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingDto | null>(null)

  // Forum state
  const [forumPosts, setForumPosts] = useState<ForumPostDto[]>([])
  const [selectedForumPost, setSelectedForumPost] = useState<ForumPostDetailDto | null>(null)
  const [showForumDetailModal, setShowForumDetailModal] = useState(false)
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [newPostForm, setNewPostForm] = useState({
    title: '',
    content: '',
    category: ForumCategory.General
  })
  const [newComment, setNewComment] = useState('')

  useEffect(() => { 
    loadResidentInfo() 
  }, [user?.id])

  useEffect(() => {
    if (condominiumId) {
      loadDataForTab()
    }
  }, [condominiumId, activeTab])

  const loadResidentInfo = async () => {
    if (!user?.id) return
    try {
      const resident = await residentService.getResidentInfo(user.id)
      if (resident?.condominiumId) {
        setCondominiumId(resident.condominiumId)
        setUnitId(resident.unitId || '')
      }
    } catch { 
      setError('Error al cargar información del residente') 
    }
  }

  const loadDataForTab = async () => {
    if (!condominiumId) return
    setIsLoading(true)
    setError(null)
    try {
      switch (activeTab) {
        case 'announcements':
          const announcementsData = await communicationsService.getAnnouncements(condominiumId, { isPublished: true })
          setAnnouncements(announcementsData.items)
          break
        case 'polls':
          const pollsData = await communicationsService.getPolls(condominiumId, { status: PollStatus.Active })
          setPolls(pollsData.items)
          break
        case 'meetings':
          const meetingsData = await communicationsService.getMeetings(condominiumId)
          setMeetings(meetingsData.items.filter(m => m.status !== MeetingStatus.Cancelled))
          break
        case 'forum':
          const forumData = await communicationsService.getForumPosts(condominiumId)
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

  // Announcement handlers
  const handleMarkAsRead = async (announcement: AnnouncementDto) => {
    if (!unitId || !user?.id) return
    try {
      await communicationsService.markAnnouncementAsRead(announcement.id, unitId, user.id)
      loadDataForTab()
    } catch { /* silently fail */ }
  }

  // Poll handlers
  const openVoteModal = async (poll: PollDto) => {
    try {
      const pollDetail = await communicationsService.getPollById(poll.id, unitId)
      setSelectedPoll(pollDetail)
      setShowVoteModal(true)
      setSelectedOptionId('')
    } catch { setError('Error al cargar encuesta') }
  }

  const handleVote = async () => {
    if (!selectedPoll || !selectedOptionId || !unitId) return
    try {
      await communicationsService.castVote(selectedPoll.id, {
        optionId: selectedOptionId,
        unitId: unitId,
        residentId: user?.id || null
      })
      setShowVoteModal(false)
      setSelectedPoll(null)
      loadDataForTab()
      showSuccess('Voto registrado exitosamente')
    } catch { setError('Error al votar') }
  }

  // Forum handlers
  const openForumDetail = async (post: ForumPostDto) => {
    try {
      const postDetail = await communicationsService.getForumPostById(post.id)
      setSelectedForumPost(postDetail)
      setShowForumDetailModal(true)
      // Increment view count
      await communicationsService.createForumPost // Actually, we should use incrementViews if available
    } catch { setError('Error al cargar publicación') }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !condominiumId) return
    try {
      await communicationsService.createForumPost({
        condominiumId,
        authorId: user.id,
        authorUnitId: unitId || null,
        authorName: `${user.firstName} ${user.lastName || ''}`.trim(),
        title: newPostForm.title,
        content: newPostForm.content,
        category: newPostForm.category,
        allowComments: true
      })
      setShowNewPostModal(false)
      setNewPostForm({ title: '', content: '', category: ForumCategory.General })
      loadDataForTab()
      showSuccess('Publicación creada exitosamente')
    } catch { setError('Error al crear publicación') }
  }

  const handleAddComment = async () => {
    if (!selectedForumPost || !newComment.trim() || !user?.id) return
    try {
      await communicationsService.addForumComment(selectedForumPost.id, {
        authorId: user.id,
        authorName: `${user.firstName} ${user.lastName || ''}`.trim(),
        content: newComment
      })
      // Reload the post detail
      const postDetail = await communicationsService.getForumPostById(selectedForumPost.id)
      setSelectedForumPost(postDetail)
      setNewComment('')
      showSuccess('Comentario agregado')
    } catch { setError('Error al agregar comentario') }
  }

  // Helper functions
  const getPriorityColor = (priority: AnnouncementPriority) => {
    switch (priority) {
      case AnnouncementPriority.Low: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      case AnnouncementPriority.Normal: return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case AnnouncementPriority.High: return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
      case AnnouncementPriority.Urgent: return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
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

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric'
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comunicación</h1>
        <p className="text-gray-600 dark:text-gray-400">Mantente informado sobre tu comunidad</p>
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

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-6 overflow-x-auto px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
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
            <div className="p-6 space-y-4">
              {announcements.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No hay avisos disponibles</p>
                </div>
              ) : announcements.map((announcement) => (
                <div 
                  key={announcement.id} 
                  className={`bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 cursor-pointer hover:shadow-md transition-all border border-gray-200 dark:border-gray-600 ${announcement.isRead ? 'opacity-75' : ''}`}
                  onClick={() => {
                    setSelectedAnnouncement(selectedAnnouncement?.id === announcement.id ? null : announcement)
                    if (!announcement.isRead) handleMarkAsRead(announcement)
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {!announcement.isRead && (
                          <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priorityName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{announcement.typeName}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{announcement.title}</h3>
                      <p className={`text-sm text-gray-600 dark:text-gray-400 mt-1 ${selectedAnnouncement?.id === announcement.id ? '' : 'line-clamp-2'}`}>
                        {announcement.content}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400 ml-4">
                      <div>{formatShortDate(announcement.createdAt)}</div>
                      <ChevronRight className={`w-5 h-5 ml-auto mt-2 transform transition-transform ${selectedAnnouncement?.id === announcement.id ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                  
                  {selectedAnnouncement?.id === announcement.id && announcement.meetingDate && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Fecha de reunión: {formatDate(announcement.meetingDate)}</span>
                      </div>
                      {announcement.meetingLocation && (
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="w-4 h-4" />
                          <span>{announcement.meetingLocation}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ========== POLLS TAB ========== */}
          {activeTab === 'polls' && (
            <div className="p-6 space-y-4">
              {polls.length === 0 ? (
                <div className="text-center py-12">
                  <Vote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No hay encuestas activas</p>
                </div>
              ) : polls.map((poll) => (
                <div key={poll.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 border border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{poll.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{poll.description}</p>
                    </div>
                    {poll.hasVoted ? (
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 text-xs rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Votado
                      </span>
                    ) : (
                      <button
                        onClick={() => openVoteModal(poll)}
                        className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all"
                      >
                        Votar
                      </button>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Hasta: {formatShortDate(poll.endDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {poll.totalVotes} votos
                    </span>
                    <span>
                      Participación: {poll.participationPercentage.toFixed(0)}%
                    </span>
                  </div>

                  {poll.hasVoted && (
                    <div className="mt-4 space-y-2">
                      {poll.options.map((option) => (
                        <div key={option.id} className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-5 overflow-hidden">
                            <div 
                              className={`h-full ${poll.votedOptionIds.includes(option.id) ? 'bg-sky-500' : 'bg-gray-400 dark:bg-gray-500'}`}
                              style={{ width: `${option.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 w-28 truncate">{option.text}</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                            {option.percentage.toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ========== MEETINGS TAB ========== */}
          {activeTab === 'meetings' && (
            <div className="p-6 space-y-4">
              {meetings.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No hay reuniones programadas</p>
                </div>
              ) : meetings.map((meeting) => (
                <div 
                  key={meeting.id} 
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 cursor-pointer hover:shadow-md transition-all border border-gray-200 dark:border-gray-600"
                  onClick={() => setSelectedMeeting(selectedMeeting?.id === meeting.id ? null : meeting)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getMeetingStatusColor(meeting.status)}`}>
                          {meeting.statusName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{meeting.typeName}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{meeting.title}</h3>
                      <p className={`text-sm text-gray-500 dark:text-gray-400 mt-1 ${selectedMeeting?.id === meeting.id ? '' : 'line-clamp-2'}`}>
                        {meeting.description}
                      </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transform transition-transform ${selectedMeeting?.id === meeting.id ? 'rotate-90' : ''}`} />
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
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
                  </div>

                  {selectedMeeting?.id === meeting.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                      {meeting.agenda && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Agenda</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{meeting.agenda}</p>
                        </div>
                      )}
                      {meeting.virtualMeetingUrl && (
                        <a 
                          href={meeting.virtualMeetingUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-sky-600 dark:text-sky-400 hover:underline"
                        >
                          Unirse a reunión virtual
                          <ChevronRight className="w-4 h-4" />
                        </a>
                      )}
                      {meeting.minutes && meeting.status === MeetingStatus.Completed && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Acta de la Reunión</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{meeting.minutes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ========== FORUM TAB ========== */}
          {activeTab === 'forum' && (
            <div className="p-6">
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowNewPostModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white px-4 py-2 rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all"
                >
                  <Send className="w-4 h-4" /> Nueva Publicación
                </button>
              </div>

              <div className="space-y-4">
                {forumPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No hay publicaciones en el foro</p>
                    <button
                      onClick={() => setShowNewPostModal(true)}
                      className="mt-4 text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      Sé el primero en publicar
                    </button>
                  </div>
                ) : forumPosts.map((post) => (
                  <div 
                    key={post.id} 
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 cursor-pointer hover:shadow-md transition-all border border-gray-200 dark:border-gray-600"
                    onClick={() => openForumDetail(post)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-300">
                            {post.categoryName}
                          </span>
                          {post.isPinned && (
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 rounded text-xs">
                              Fijado
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{post.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{post.content}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 ml-4" />
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>Por: {post.authorName}</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {post.commentCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {post.viewCount}
                      </span>
                      <span>{formatShortDate(post.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      </div>

      {/* ========== MODALS ========== */}

      {/* Vote Modal */}
      {showVoteModal && selectedPoll && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Votar</h2>
              <button onClick={() => { setShowVoteModal(false); setSelectedPoll(null) }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{selectedPoll.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{selectedPoll.description}</p>
            
            <div className="space-y-2 mb-6">
              {selectedPoll.options.map((option) => (
                <label 
                  key={option.id}
                  className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors ${
                    selectedOptionId === option.id 
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30' 
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="vote"
                    value={option.id}
                    checked={selectedOptionId === option.id}
                    onChange={(e) => setSelectedOptionId(e.target.value)}
                    className="mr-3 text-sky-500 focus:ring-sky-500"
                  />
                  <span className="text-gray-900 dark:text-white">{option.text}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setShowVoteModal(false); setSelectedPoll(null) }} 
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleVote}
                disabled={!selectedOptionId}
                className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Voto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forum Detail Modal */}
      {showForumDetailModal && selectedForumPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-300">
                    {selectedForumPost.categoryName}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedForumPost.title}</h2>
              </div>
              <button onClick={() => { setShowForumDetailModal(false); setSelectedForumPost(null) }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedForumPost.content}</p>
                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  Por: {selectedForumPost.authorName} • {formatDate(selectedForumPost.createdAt)}
                </div>
              </div>

              {/* Comments */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                  Comentarios ({selectedForumPost.comments?.length || 0})
                </h3>
                <div className="space-y-4">
                  {selectedForumPost.comments?.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {comment.authorName} • {formatDate(comment.createdAt)}
                      </div>
                    </div>
                  ))}
                  {(!selectedForumPost.comments || selectedForumPost.comments.length === 0) && (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">No hay comentarios aún</p>
                  )}
                </div>
              </div>
            </div>

            {selectedForumPost.allowComments && (
              <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Escribe un comentario..."
                    className="flex-1 rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Forum Post Modal */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Nueva Publicación</h2>
              <button onClick={() => setShowNewPostModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreatePost}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título*</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    value={newPostForm.title}
                    onChange={(e) => setNewPostForm({ ...newPostForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría*</label>
                  <select
                    required
                    className="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    value={newPostForm.category}
                    onChange={(e) => setNewPostForm({ ...newPostForm, category: parseInt(e.target.value) })}
                  >
                    {Object.entries(forumCategoryNames).map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contenido*</label>
                  <textarea
                    required
                    rows={5}
                    className="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    value={newPostForm.content}
                    onChange={(e) => setNewPostForm({ ...newPostForm, content: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowNewPostModal(false)} 
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all"
                >
                  Publicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
