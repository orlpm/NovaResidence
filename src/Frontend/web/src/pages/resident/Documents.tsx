import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { documentService, type CondominiumDocumentDto } from '../../lib/operationsService'
import { residentService } from '../../lib/residentService'
import { useAuthStore } from '../../stores/authStore'

export default function ResidentDocuments() {
  const { user } = useAuthStore()
  const [documents, setDocuments] = useState<CondominiumDocumentDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const resident = await residentService.getResidentInfo(user.id)
        if (!resident?.condominiumId) {
          setDocuments([])
          return
        }
        setDocuments(await documentService.getByCondominium(resident.condominiumId))
      } catch {
        toast.error('No se pudieron cargar los documentos')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documentos</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Contrato, recibos, identificación y reglamento publicados por la administración.</p>
      </div>
      {loading ? (
        <p className="text-gray-500">Cargando documentos...</p>
      ) : documents.length === 0 ? (
        <p className="text-gray-500">No hay documentos publicados.</p>
      ) : (
        <div className="space-y-3">
          {documents.map(item => (
            <a key={item.id} href={item.fileUrl} target="_blank" rel="noreferrer" className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
              <p className="text-sm text-gray-500">{item.typeName}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
