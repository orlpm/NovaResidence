import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { visitService, type VisitAccessPassDto } from '../../lib/visitService'

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function VisitAccessPassCard({ visitId }: { visitId: string }) {
  const [pass, setPass] = useState<VisitAccessPassDto | null>(null)

  useEffect(() => {
    visitService.getAccessPass(visitId)
      .then(setPass)
      .catch(() => toast.error('No se pudo cargar el pase de acceso'))
  }, [visitId])

  if (!pass) return null

  const handleShare = async () => {
    const text = `Pase de acceso para ${pass.visitorName}: ${pass.accessCode}. Válido de ${formatDateTime(pass.validFrom)} a ${formatDateTime(pass.validUntil)}.`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Pase de acceso', text })
      } else {
        await navigator.clipboard.writeText(text)
        toast.success('Pase copiado al portapapeles')
      }
    } catch {
      // The user closed the share sheet.
    }
  }

  return (
    <section
      aria-label="Pase de acceso QR"
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-6"
    >
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <QrCode className="w-5 h-5 text-sky-500" />
        Pase de acceso QR
      </h2>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div data-testid="visit-access-qr" className="bg-white p-2 rounded-xl">
          <QRCodeSVG value={pass.accessCode} size={220} marginSize={4} level="M" />
        </div>
        <div className="text-center sm:text-left space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">Código de acceso</p>
          <p data-testid="visit-access-code" className="font-mono text-xl font-bold tracking-wider text-gray-900 dark:text-white">
            {pass.accessCode}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Válido de {formatDateTime(pass.validFrom)} a {formatDateTime(pass.validUntil)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Comparte este pase solo con tu visitante. Vigilancia lo escanea en la entrada.
          </p>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl font-semibold hover:bg-sky-700"
          >
            <Share2 className="w-4 h-4" />
            Compartir pase
          </button>
        </div>
      </div>
    </section>
  )
}
