export type LatLng = { lat: number; lng: number };

export async function getOsrmDrivingDistanceKm(pickup: LatLng, drop: LatLng): Promise<number | null> {
  const aLat = Number(pickup.lat);
  const aLng = Number(pickup.lng);
  const bLat = Number(drop.lat);
  const bLng = Number(drop.lng);
  if (![aLat, aLng, bLat, bLng].every(Number.isFinite)) return null;

  const url = new URL(`https://router.project-osrm.org/route/v1/driving/${aLng},${aLat};${bLng},${bLat}`);
  url.searchParams.set('overview', 'false');
  url.searchParams.set('alternatives', 'false');
  url.searchParams.set('steps', 'false');

  try {
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
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

  const url = new URL(`https://router.project-osrm.org/route/v1/driving/${aLng},${aLat};${bLng},${bLat}`);
  url.searchParams.set('overview', 'full');
  url.searchParams.set('alternatives', 'false');
  url.searchParams.set('steps', 'false');
  url.searchParams.set('geometries', 'geojson');

  try {
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' }, signal: opts?.signal });
    if (!res.ok) return null;
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
