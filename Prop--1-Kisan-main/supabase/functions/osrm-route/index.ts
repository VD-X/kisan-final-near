import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OSRM_BASE_URLS = [
  "https://routing.openstreetmap.de/routed-car",
  "https://router.project-osrm.org",
] as const;

type LatLng = { lat: number; lng: number };

function isValidLatLng(p: any): p is LatLng {
  const lat = Number(p?.lat);
  const lng = Number(p?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

function buildOsrmUrl(baseUrl: string, pickup: LatLng, drop: LatLng, overview: "false" | "simplified" | "full") {
  const url = new URL(`${baseUrl}/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}`);
  url.searchParams.set("overview", overview);
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("steps", "false");
  url.searchParams.set("geometries", "geojson");
  return url;
}

async function fetchFirstOk(urls: URL[], timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (const url of urls) {
      try {
        const res = await fetch(url.toString(), {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (res.ok) return res;
      } catch (e: any) {
        if (e?.name === "AbortError") return null;
        continue;
      }
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => null);
    const pickup = body?.pickup;
    const drop = body?.drop;
    const overview = (body?.overview === "full" ? "full" : body?.overview === "false" ? "false" : "simplified") as "false" | "simplified" | "full";
    if (!isValidLatLng(pickup) || !isValidLatLng(drop)) {
      return new Response(JSON.stringify({ error: "invalid_coordinates" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const urls = OSRM_BASE_URLS.map((base) => buildOsrmUrl(base, pickup, drop, overview));
    const res = await fetchFirstOk(urls, 15000);
    if (!res) return new Response(JSON.stringify({ error: "route_unavailable" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const data: any = await res.json().catch(() => null);
    const coords: any[] | undefined = data?.routes?.[0]?.geometry?.coordinates;
    const meters = Number(data?.routes?.[0]?.distance);
    if (!Array.isArray(coords) || coords.length < 2) {
      return new Response(JSON.stringify({ error: "bad_route_response" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const pts = coords
      .map((c: any) => ({ lng: Number(c?.[0]), lat: Number(c?.[1]) }))
      .filter((p: any) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (pts.length < 2) {
      return new Response(JSON.stringify({ error: "bad_route_response" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const distanceKm = Number.isFinite(meters) ? Math.max(0, Math.round((meters / 1000) * 10) / 10) : null;

    return new Response(JSON.stringify({ code: "Ok", distanceKm, geometry: pts }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "internal_error", message: String(e?.message || e || "") }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

