import { useEffect, useRef, useState, type FormEvent } from 'react'
import jsQR from 'jsqr'
import { Camera, CameraOff, Upload, LogIn, LogOut, QrCode, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { visitService, type VisitAccessScanDto } from '../../lib/visitService'

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const apiMessage = (error: any, fallback: string) => error?.response?.data?.message || fallback

function decodeImageData(canvas: HTMLCanvasElement, source: CanvasImageSource, width: number, height: number) {
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(source, 0, 0, width, height)
  const image = context.getImageData(0, 0, width, height)
  return jsQR(image.data, width, height)?.data ?? null
}

export default function QrAccess() {
  const [manualCode, setManualCode] = useState('')
  const [scannedCode, setScannedCode] = useState<string | null>(null)
  const [result, setResult] = useState<VisitAccessScanDto | null>(null)
  const [busy, setBusy] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)

  const stopCamera = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  useEffect(() => stopCamera, [])

  const validate = async (rawCode: string) => {
    const code = rawCode.trim()
    if (!code) return
    setBusy(true)
    try {
      const scan = await visitService.scanAccessCode(code)
      setScannedCode(code)
      setResult(scan)
    } catch (error: any) {
      setScannedCode(null)
      setResult(null)
      toast.error(apiMessage(error, 'No se pudo validar el código'))
    } finally {
      setBusy(false)
    }
  }

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Este dispositivo no permite usar la cámara; sube una foto del QR')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setCameraOn(true)
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()

      const tick = () => {
        const canvas = canvasRef.current
        if (canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
          const code = decodeImageData(canvas, video, video.videoWidth, video.videoHeight)
          if (code) {
            stopCamera()
            void validate(code)
            return
          }
        }
        frameRef.current = requestAnimationFrame(tick)
      }
      frameRef.current = requestAnimationFrame(tick)
    } catch {
      stopCamera()
      toast.error('No se pudo abrir la cámara; sube una foto del QR')
    }
  }

  const handlePhoto = (file: File | undefined) => {
    if (!file || !canvasRef.current) return
    const canvas = canvasRef.current
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const code = decodeImageData(canvas, image, image.naturalWidth, image.naturalHeight)
      URL.revokeObjectURL(url)
      if (code) void validate(code)
      else toast.error('No se encontró un código QR en la imagen')
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      toast.error('No se pudo leer la imagen')
    }
    image.src = url
  }

  const handleManualSubmit = (event: FormEvent) => {
    event.preventDefault()
    void validate(manualCode)
  }

  const register = async (action: 'in' | 'out') => {
    if (!scannedCode) return
    setBusy(true)
    try {
      const updated = action === 'in'
        ? await visitService.checkInWithAccessCode(scannedCode)
        : await visitService.checkOutWithAccessCode(scannedCode)
      setResult(updated)
      toast.success(action === 'in' ? 'Entrada registrada' : 'Salida registrada')
    } catch (error: any) {
      toast.error(apiMessage(error, 'No se pudo registrar el acceso'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <QrCode className="w-7 h-7 text-orange-600" />
          Acceso con QR
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Escanea el pase del visitante para validar y registrar su acceso.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          {cameraOn ? (
            <button onClick={stopCamera} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold">
              <CameraOff className="w-4 h-4" /> Detener cámara
            </button>
          ) : (
            <button onClick={startCamera} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700">
              <Camera className="w-4 h-4" /> Escanear con cámara
            </button>
          )}
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-600 text-orange-600 font-semibold cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20">
            <Upload className="w-4 h-4" /> Subir foto del QR
            <input
              type="file"
              accept="image/*"
              aria-label="Foto del código QR"
              className="hidden"
              onChange={event => {
                handlePhoto(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </label>
        </div>

        <video ref={videoRef} muted playsInline className={cameraOn ? 'w-full max-w-md rounded-lg bg-black' : 'hidden'} />
        <canvas ref={canvasRef} className="hidden" />

        <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            value={manualCode}
            onChange={event => setManualCode(event.target.value)}
            placeholder="NRV-XXXX-XXXX-XXXX"
            aria-label="Código de acceso"
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 font-mono uppercase"
          />
          <button type="submit" disabled={busy || !manualCode.trim()} className="px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold disabled:opacity-50">
            Validar código
          </button>
        </form>
      </div>

      {result && (
        <section aria-label="Resultado del pase" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{result.visitorName}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {result.unitNumber ? `Unidad ${result.unitNumber} · ` : ''}{result.visitorCount} persona(s)
                {result.vehiclePlate ? ` · Placa ${result.vehiclePlate}` : ''}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
              {result.statusName}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Llegada esperada {formatDateTime(result.expectedArrival)}
            {result.expectedDeparture ? ` · salida ${formatDateTime(result.expectedDeparture)}` : ''}
          </p>
          {result.purpose && <p className="text-sm text-gray-600 dark:text-gray-300">Motivo: {result.purpose}</p>}

          {result.canCheckIn && (
            <p className="text-green-700 dark:text-green-400 font-semibold">Pase válido</p>
          )}
          {!result.canCheckIn && result.message && (
            <p className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
              <XCircle className="w-5 h-5" /> {result.message}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {result.canCheckIn && (
              <button onClick={() => register('in')} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50">
                <LogIn className="w-4 h-4" /> Registrar entrada
              </button>
            )}
            {result.canCheckOut && (
              <button onClick={() => register('out')} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
                <LogOut className="w-4 h-4" /> Registrar salida
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
