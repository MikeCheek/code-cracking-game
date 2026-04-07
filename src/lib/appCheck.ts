import { CustomProvider, initializeAppCheck } from 'firebase/app-check'
import { app } from './firebase'

type AppCheckExchangeResponse = {
  token: string
  expireTimeMillis: number
}

type MtCaptchaApi = {
  getToken?: () => string | Promise<string>
  getVerifiedToken?: () => string | Promise<string>
  getResponseToken?: () => string | Promise<string>
}

declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean
    mtcaptcha?: MtCaptchaApi
  }
}

let appCheckInitialized = false

async function getMtCaptchaToken(): Promise<string> {
  const mtcaptcha = window.mtcaptcha
  if (!mtcaptcha) {
    throw new Error('MT-Captcha is not loaded. Include the MT-Captcha script before app startup.')
  }

  const getTokenFn = mtcaptcha.getVerifiedToken ?? mtcaptcha.getToken ?? mtcaptcha.getResponseToken
  if (!getTokenFn) {
    throw new Error('MT-Captcha token getter was not found on window.mtcaptcha.')
  }

  const token = await getTokenFn()
  if (!token || typeof token !== 'string') {
    throw new Error('MT-Captcha did not return a valid token.')
  }

  return token
}

export function initializeFirebaseAppCheck(): void {
  if (typeof window === 'undefined' || appCheckInitialized) return

  const debugToken = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN?.trim()
  if (debugToken) {
    window.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === 'true' ? true : debugToken
  }

  const exchangeEndpoint = import.meta.env.VITE_APPCHECK_EXCHANGE_ENDPOINT?.trim()
  const mtcaptchaSiteKey = import.meta.env.VITE_APPCHECK_MTCAPTCHA_SITE_KEY?.trim()

  if (!exchangeEndpoint || !mtcaptchaSiteKey) {
    // App Check is optional in local/dev. Provide env vars to enable MT-Captcha exchange.
    return
  }

  const provider = new CustomProvider({
    getToken: async () => {
      const mtcaptchaToken = await getMtCaptchaToken()

      const response = await fetch(exchangeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mtcaptchaToken,
          siteKey: mtcaptchaSiteKey,
        }),
      })

      if (!response.ok) {
        throw new Error('App Check exchange failed.')
      }

      const data = (await response.json()) as Partial<AppCheckExchangeResponse>
      if (typeof data.token !== 'string' || typeof data.expireTimeMillis !== 'number') {
        throw new Error('App Check exchange returned an invalid payload.')
      }

      return {
        token: data.token,
        expireTimeMillis: data.expireTimeMillis,
      }
    },
  })

  initializeAppCheck(app, {
    provider,
    isTokenAutoRefreshEnabled: true,
  })

  appCheckInitialized = true
}
