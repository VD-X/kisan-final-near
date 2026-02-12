import { createClient, SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null
let resolvedUrl: string | null = null
let resolvedAnonKey: string | null = null

const DEFAULT_FETCH_TIMEOUT_MS = 60000

type SupabaseNetworkEvent = {
  ts: string
  url: string
  method: string
  durationMs: number
  ok?: boolean
  status?: number
  error?: string
}

const networkLog: SupabaseNetworkEvent[] = []

function pushNetworkEvent(ev: SupabaseNetworkEvent) {
  networkLog.push(ev)
  if (networkLog.length > 50) networkLog.splice(0, networkLog.length - 50)
}

export function getSupabaseNetworkLog() {
  return [...networkLog]
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const startedAt = Date.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS)

  const baseInit: RequestInit = init ? { ...init } : {}

  if (baseInit.signal) {
    const signalAny = (AbortSignal as any)?.any
    if (typeof signalAny === 'function') {
      baseInit.signal = signalAny([baseInit.signal, controller.signal])
    } else {
      const originalSignal = baseInit.signal
      originalSignal.addEventListener('abort', () => controller.abort(), { once: true } as any)
      baseInit.signal = controller.signal
    }
  } else {
    baseInit.signal = controller.signal
  }

  const url = typeof input === 'string' ? input : String((input as any)?.url || input)
  const method = String((baseInit as any)?.method || 'GET')
  try {
    const res = await fetch(input, baseInit)
    pushNetworkEvent({ ts: new Date().toISOString(), url, method, durationMs: Date.now() - startedAt, ok: res.ok, status: res.status })
    return res
  } catch (e: any) {
    const name = e?.name || 'Error'
    const message = e?.message || 'unknown_error'
    pushNetworkEvent({ ts: new Date().toISOString(), url, method, durationMs: Date.now() - startedAt, ok: false, error: `${name}: ${message}` })
    throw e
  } finally {
    clearTimeout(timeoutId)
  }
}

export function getSupabaseConfig() {
  if (!resolvedUrl || !resolvedAnonKey) return null
  return { url: resolvedUrl, anonKey: resolvedAnonKey }
}

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function clearSupabaseAuthStorage() {
  if (!canUseBrowserStorage()) return
  const cfg = getSupabaseConfig()
  if (!cfg?.url) return
  let ref: string | null = null
  try {
    ref = new URL(cfg.url).hostname.split('.')[0] || null
  } catch {
    ref = null
  }
  if (!ref) return
  const prefix = `sb-${ref}-`
  const toRemove: string[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)
    if (!k) continue
    if (k.startsWith(prefix)) toRemove.push(k)
  }
  for (const k of toRemove) {
    try { window.localStorage.removeItem(k) } catch { }
  }
}

export function resetSupabaseClient() {
  cached = null
}

export function getSupabase(): SupabaseClient | null {
  if (cached) return cached
  
  // Try to get from environment
  let url = (import.meta as any)?.env?.VITE_SUPABASE_URL
  let key = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error("Supabase Config Missing. Env:", (import.meta as any)?.env);
    return null
  }
  
  resolvedUrl = url
  resolvedAnonKey = key
  cached = createClient(url, key, { global: { fetch: fetchWithTimeout } })
  return cached
}
