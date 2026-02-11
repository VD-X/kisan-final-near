import { createClient, SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null
let resolvedUrl: string | null = null
let resolvedAnonKey: string | null = null

const DEFAULT_FETCH_TIMEOUT_MS = 15000

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
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

  return fetch(input, baseInit).finally(() => clearTimeout(timeoutId))
}

export function getSupabaseConfig() {
  if (!resolvedUrl || !resolvedAnonKey) return null
  return { url: resolvedUrl, anonKey: resolvedAnonKey }
}

export function getSupabase(): SupabaseClient | null {
  if (cached) return cached
  
  // Try to get from environment
  let url = (import.meta as any)?.env?.VITE_SUPABASE_URL
  let key = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY

  // Fallback to hardcoded values if env is missing (Debug Fix)
  if (!url) url = "https://ykvatttsnpjrwqfhhysu.supabase.co"
  if (!key) key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrdmF0dHRzbnBqcndxZmhoeXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTk5NjQsImV4cCI6MjA4NjA3NTk2NH0.5Njnh8NBEcPDddHjwv3CoUpCcAHu-ALNUQHQVdAdq-Y"
  
  if (!url || !key) {
    console.error("Supabase Config Missing. Env:", (import.meta as any)?.env);
    return null
  }
  
  resolvedUrl = url
  resolvedAnonKey = key
  cached = createClient(url, key, { global: { fetch: fetchWithTimeout } })
  return cached
}
