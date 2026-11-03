declare global {
  interface Window {
    OpenPay?: {
      setId: (merchantId: string) => void
      setApiKey: (publicKey: string) => void
      setSandboxMode: (enabled: boolean) => void
      token: {
        create: (
          payload: {
            holder_name: string
            card_number: string
            expiration_month: string
            expiration_year: string
            cvv2: string
          },
          onSuccess: (response: { data?: { id?: string } }) => void,
          onError: (response: { data?: { description?: string } }) => void,
        ) => void
      }
      deviceData: {
        setup: (formId: string, hiddenFieldName?: string) => string
      }
    }
  }
}

export interface OpenPayBrowserConfig {
  enabled: boolean
  merchantId: string
  publicKey: string
  useSandbox: boolean
  mode: 'sandbox' | 'production'
}

export interface OpenPayCardData {
  holderName: string
  cardNumber: string
  expirationMonth: string
  expirationYear: string
  cvv2: string
}

const OPENPAY_SCRIPT_ID = 'openpay-sdk-script'
const OPENPAY_DATA_SCRIPT_ID = 'openpay-sdk-data-script'
const OPENPAY_SCRIPT_URL = 'https://openpay.s3.amazonaws.com/openpay.v1.min.js'
const OPENPAY_DATA_SCRIPT_URL = 'https://openpay.s3.amazonaws.com/openpay-data.v1.min.js'

const loadScript = (id: string, src: string) =>
  new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }

      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`No se pudo cargar ${src}`)), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`))
    document.head.appendChild(script)
  })

const ensureOpenPaySdk = async () => {
  await loadScript(OPENPAY_SCRIPT_ID, OPENPAY_SCRIPT_URL)
  await loadScript(OPENPAY_DATA_SCRIPT_ID, OPENPAY_DATA_SCRIPT_URL)

  if (!window.OpenPay) {
    throw new Error('El SDK de OpenPay no quedó disponible en el navegador')
  }

  return window.OpenPay
}

export const createOpenPayCardToken = async (
  config: OpenPayBrowserConfig,
  formId: string,
  cardData: OpenPayCardData,
) => {
  if (!config.enabled) {
    throw new Error('OpenPay no está habilitado para este entorno')
  }

  const openPay = await ensureOpenPaySdk()
  openPay.setId(config.merchantId)
  openPay.setApiKey(config.publicKey)
  openPay.setSandboxMode(config.useSandbox)

  const deviceSessionId = openPay.deviceData.setup(formId, 'openpay-device-session-id')

  const tokenId = await new Promise<string>((resolve, reject) => {
    openPay.token.create(
      {
        holder_name: cardData.holderName,
        card_number: cardData.cardNumber.replace(/\s+/g, ''),
        expiration_month: cardData.expirationMonth.padStart(2, '0').slice(-2),
        expiration_year: cardData.expirationYear.slice(-2),
        cvv2: cardData.cvv2,
      },
      (response) => {
        const nextTokenId = response?.data?.id
        if (!nextTokenId) {
          reject(new Error('OpenPay no devolvió un token de pago'))
          return
        }

        resolve(nextTokenId)
      },
      (response) => {
        reject(new Error(response?.data?.description || 'No se pudo tokenizar la tarjeta con OpenPay'))
      },
    )
  })

  if (!deviceSessionId) {
    throw new Error('OpenPay no devolvió un identificador de dispositivo')
  }

  return { tokenId, deviceSessionId }
}