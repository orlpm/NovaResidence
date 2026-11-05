import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { documentService, type CondominiumDocumentDto } from '../../lib/operationsService'
import { useAuthStore } from '../../stores/authStore'
import { getApiErrorMessage } from '../../lib/apiErrors'

const documentTypes = [
  { value: 0, label: 'Contrato' },
  { value: 2, label: 'Recibo' },
  { value: 3, label: 'Identificación' },
  { value: 5, label: 'Reglamento' }
]

export default function Documents() {
  const { user } = useAuthStore()
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [condominiumId, setCondominiumId] = useState('')
  const [documents, setDocuments] = useState<CondominiumDocumentDto[]>([])
  const [title, setTitle] = useState('')
  const [documentType, setDocumentType] = useState(5)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async (id: string) => {
    setDocuments(await documentService.getByCondominium(id))
  }

  useEffect(() => {
    condominiumService.getAllCondominiums(user?.id).then(data => {
      setCondominiums(data)
      if (data[0]) setCondominiumId(data[0].id)
    }).catch(() => toast.error('No se pudieron cargar los condominios'))
  }, [user?.id])

  useEffect(() => {
    if (condominiumId) load(condominiumId).catch(() => toast.error('No se pudieron cargar los documentos'))
  }, [condominiumId])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!condominiumId || !file) return
    setSaving(true)
    try {
      const uploaded = await documentService.upload(file)
      await documentService.create({
        condominiumId,
        title,
        documentType,
        fileName: uploaded.fileName,
        fileUrl: uploaded.fileUrl
      })
      toast.success('Documento publicado')
      setTitle('')
      setFile(null)
      await load(condominiumId)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo publicar el documento'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documentos</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Contratos, recibos, identificaciones y reglamento del condominio.</p>
      </div>

      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm text-gray-600 dark:text-gray-300">
          Condominio
          <select className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" value={condominiumId} onChange={event => setCondominiumId(event.target.value)}>
            {condominiums.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-600 dark:text-gray-300">
          Tipo
          <select className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" value={documentType} onChange={event => setDocumentType(Number(event.target.value))}>
            {documentTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-600 dark:text-gray-300">
          Título
          <input className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" value={title} onChange={event => setTitle(event.target.value)} placeholder="Reglamento interno" required />
        </label>
        <label className="text-sm text-gray-600 dark:text-gray-300">
          Archivo
          <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" className="mt-1 w-full" onChange={event => setFile(event.target.files?.[0] ?? null)} required />
        </label>
        <div>
          <button disabled={saving} className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold">Publicar documento</button>
        </div>
      </form>

      <div className="space-y-3">
        {documents.map(item => (
          <a key={item.id} href={item.fileUrl} target="_blank" rel="noreferrer" className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
            <p className="text-sm text-gray-500">{item.typeName} · {item.fileName}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
