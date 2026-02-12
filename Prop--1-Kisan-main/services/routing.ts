export type LatLng = { lat: number; lng: number };

async function getSupabaseOsrmRoute(pickup: LatLng, drop: LatLng, opts?: { signal?: AbortSignal; overview?: 'false' | 'simplified' | 'full' }) {
  try {
    const mod: any = await import('../supabaseClient');
    const cfg = mod?.getSupabaseConfig?.();
    if (!cfg?.url || !cfg?.anonKey) return null;
    const url = `${cfg.url}/functions/v1/osrm-route`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`
      },
      body: JSON.stringify({ pickup, drop, overview: opts?.overview || 'simplified' }),
      signal: opts?.signal
    });
    if (!res.ok) return null;
    const data: any = await res.json().catch(() => null);
    const pts = Array.isArray(data?.geometry) ? data.geometry : null;
    if (!pts || pts.length < 2) return null;
    const clean = pts
      .map((p: any) => ({ lat: Number(p?.lat), lng: Number(p?.lng) }))
      .filter((p: any) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (clean.length < 2) return null;
    return { geometry: clean as LatLng[], distanceKm: data?.distanceKm != null ? Number(data.distanceKm) : null };
  } catch {
    return null;
  }
}

const OSRM_BASE_URLS = [
  'https://routing.openstreetmap.de/routed-car',
  'https://router.project-osrm.org'
] as const;

function buildOsrmRouteUrl(baseUrl: string, pickup: LatLng, drop: LatLng) {
  const aLat = Number(pickup.lat);
  const aLng = Number(pickup.lng);
  const bLat = Number(drop.lat);
  const bLng = Number(drop.lng);
  const url = new URL(`${baseUrl}/route/v1/driving/${aLng},${aLat};${bLng},${bLat}`);
  return url;
}

async function fetchFirstOk(urls: URL[], opts?: { signal?: AbortSignal; timeoutMs?: number }) {
  const timeoutMs = Math.max(2000, Math.min(Number(opts?.timeoutMs || 12000), 30000));
  let abortedByOuter = false;
  const controller = new AbortController();

  const onAbort = () => {
    abortedByOuter = true;
    controller.abort();
  };
  if (opts?.signal) {
    if (opts.signal.aborted) onAbort();
    else opts.signal.addEventListener('abort', onAbort, { once: true });
  }

  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (const url of urls) {
      try {
        const res = await fetch(url.toString(), { headers: { Accept: 'application/json' }, signal: controller.signal });
        if (res.ok) return res;
      } catch (e: any) {
        if (abortedByOuter || e?.name === 'AbortError') return null;
        continue;
      }
    }
    return null;
  } catch (e: any) {
    if (abortedByOuter || e?.name === 'AbortError') return null;
    return null;
  } finally {
    clearTimeout(timer);
    if (opts?.signal) opts.signal.removeEventListener('abort', onAbort as any);
  }
}

export async function getOsrmDrivingDistanceKm(pickup: LatLng, drop: LatLng): Promise<number | null> {
  const aLat = Number(pickup.lat);
  const aLng = Number(pickup.lng);
  const bLat = Number(drop.lat);
  const bLng = Number(drop.lng);
  if (![aLat, aLng, bLat, bLng].every(Number.isFinite)) return null;

  try {
    const viaFn = await getSupabaseOsrmRoute(pickup, drop, { overview: 'false' });
    if (viaFn?.distanceKm != null && Number.isFinite(viaFn.distanceKm)) return Math.max(0, viaFn.distanceKm);

    const urls = OSRM_BASE_URLS.map(base => {
      const url = buildOsrmRouteUrl(base, pickup, drop);
      url.searchParams.set('overview', 'false');
      url.searchParams.set('alternatives', 'false');
      url.searchParams.set('steps', 'false');
      return url;
    });
    const res = await fetchFirstOk(urls);
    if (!res) return null;
    const data: any = await res.json();
    const meters = Number(data?.routes?.[0]?.distance);
    if (!Number.isFinite(meters)) return null;
    return Math.max(0, Math.round((meters / 1000) * 10) / 10);
  } catch {
    return null;
  }
}

type CacheEntry<T> = { expiresAt: number; value: T };
const routeCache = new Map<string, CacheEntry<LatLng[]>>();
const ROUTE_CACHE_TTL_MS = 5 * 60 * 1000;
const ROUTE_CACHE_MAX = 50;

function routeKey(a: LatLng, b: LatLng) {
  const ax = Math.round(Number(a.lat) * 1e5) / 1e5;
  const ay = Math.round(Number(a.lng) * 1e5) / 1e5;
  const bx = Math.round(Number(b.lat) * 1e5) / 1e5;
  const by = Math.round(Number(b.lng) * 1e5) / 1e5;
  return `${ax},${ay}|${bx},${by}`;
}

function getCachedRoute(key: string) {
  const e = routeCache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    routeCache.delete(key);
    return null;
  }
  return e.value;
}

function setCachedRoute(key: string, value: LatLng[]) {
  routeCache.set(key, { value, expiresAt: Date.now() + ROUTE_CACHE_TTL_MS });
  if (routeCache.size <= ROUTE_CACHE_MAX) return;
  const firstKey = routeCache.keys().next().value;
  if (firstKey) routeCache.delete(firstKey);
}

export async function getOsrmDrivingRouteGeometry(pickup: LatLng, drop: LatLng, opts?: { signal?: AbortSignal }): Promise<LatLng[] | null> {
  const aLat = Number(pickup.lat);
  const aLng = Number(pickup.lng);
  const bLat = Number(drop.lat);
  const bLng = Number(drop.lng);
  if (![aLat, aLng, bLat, bLng].every(Number.isFinite)) return null;

  const key = routeKey(pickup, drop);
  const cached = getCachedRoute(key);
  if (cached) return cached;

  try {
    const viaFn = await getSupabaseOsrmRoute(pickup, drop, { signal: opts?.signal, overview: 'simplified' });
    if (viaFn?.geometry && viaFn.geometry.length >= 2) {
      setCachedRoute(key, viaFn.geometry);
      return viaFn.geometry;
    }

    const urls = OSRM_BASE_URLS.map(base => {
      const url = buildOsrmRouteUrl(base, pickup, drop);
      url.searchParams.set('overview', 'simplified');
      url.searchParams.set('alternatives', 'false');
      url.searchParams.set('steps', 'false');
      url.searchParams.set('geometries', 'geojson');
      return url;
    });
    const res = await fetchFirstOk(urls, { signal: opts?.signal, timeoutMs: 15000 });
    if (!res) return null;
    const data: any = await res.json();
    const coords: any[] | undefined = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const pts: LatLng[] = coords
      .map((c: any) => ({ lng: Number(c?.[0]), lat: Number(c?.[1]) }))
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (pts.length < 2) return null;
    setCachedRoute(key, pts);
    return pts;
  } catch {
    return null;
  }
}
