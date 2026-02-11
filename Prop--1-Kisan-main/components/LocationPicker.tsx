import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

export type PickedLocation = {
  lat: number;
  lng: number;
  address: string;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

export const LocationPicker: React.FC<{
  open: boolean;
  title: string;
  initial?: { lat: number; lng: number; address?: string };
  onCancel: () => void;
  onConfirm: (location: PickedLocation) => void;
}> = ({ open, title, initial, onCancel, onConfirm }) => {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const initialLatLng = useMemo(() => {
    if (initial?.lat != null && initial?.lng != null) return { lat: initial.lat, lng: initial.lng };
    return { lat: 20.5937, lng: 78.9629 };
  }, [initial?.lat, initial?.lng]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [picked, setPicked] = useState<PickedLocation>({
    lat: initialLatLng.lat,
    lng: initialLatLng.lng,
    address: initial?.address || ''
  });

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setPicked({
      lat: initialLatLng.lat,
      lng: initialLatLng.lng,
      address: initial?.address || ''
    });
  }, [open, initial?.address, initialLatLng.lat, initialLatLng.lng]);

  useEffect(() => {
    if (!open) return;
    if (!mapElRef.current) return;
    if (mapRef.current) return;

    const map = L.map(mapElRef.current, {
      center: [initialLatLng.lat, initialLatLng.lng],
      zoom: 6,
      zoomControl: true
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    const marker = L.marker([initialLatLng.lat, initialLatLng.lng], { draggable: true }).addTo(map);
    markerRef.current = marker;

    const setMarkerLatLng = (lat: number, lng: number, shouldReverse: boolean) => {
      marker.setLatLng([lat, lng]);
      map.panTo([lat, lng], { animate: true });
      setPicked(prev => ({ ...prev, lat, lng }));
      if (shouldReverse) void reverseGeocode(lat, lng);
    };

    marker.on('dragend', () => {
      const ll = marker.getLatLng();
      setMarkerLatLng(ll.lat, ll.lng, true);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      setMarkerLatLng(e.latlng.lat, e.latlng.lng, true);
    });

    if (!initial?.address) void reverseGeocode(initialLatLng.lat, initialLatLng.lng);

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [open, initial?.address, initialLatLng.lat, initialLatLng.lng]);

  const useCurrentLocation = async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Geolocation is not available in this browser.');
      return;
    }
    setGeoError(null);
    setGeoLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('geo_timeout')), 12000);
        navigator.geolocation.getCurrentPosition(
          (p) => {
            clearTimeout(timer);
            resolve(p);
          },
          (e) => {
            clearTimeout(timer);
            reject(e);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
      const lat = Number(pos.coords.latitude);
      const lng = Number(pos.coords.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('geo_invalid');
      mapRef.current?.setView([lat, lng], 16, { animate: true });
      markerRef.current?.setLatLng([lat, lng]);
      setPicked(prev => ({ ...prev, lat, lng }));
      await reverseGeocode(lat, lng);
    } catch (e: any) {
      const code = e?.code;
      if (code === 1) setGeoError('Location permission denied. Please allow location access and retry.');
      else if (code === 2) setGeoError('Location unavailable. Please turn on GPS/Wi‑Fi and retry.');
      else if (code === 3 || String(e?.message || '').includes('timeout')) setGeoError('Location request timed out. Please retry.');
      else setGeoError('Failed to read current location.');
    } finally {
      setGeoLoading(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setReverseLoading(true);
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lng));
      url.searchParams.set('addressdetails', '1');
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) throw new Error(`Reverse geocode failed: ${res.status}`);
      const data: any = await res.json();
      setPicked(prev => ({ ...prev, address: String(data?.display_name || '') }));
    } catch {
      setPicked(prev => ({ ...prev, address: prev.address || '' }));
    } finally {
      setReverseLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('format', 'json');
        url.searchParams.set('q', q);
        url.searchParams.set('limit', '6');
        url.searchParams.set('addressdetails', '1');
        const res = await fetch(url.toString(), {
          signal: controller.signal,
          headers: { Accept: 'application/json' }
        });
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const data: any = await res.json();
        setResults(Array.isArray(data) ? (data as NominatimResult[]) : []);
      } catch {
        setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 450);

    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [open, query]);

  const applyResult = (r: NominatimResult) => {
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setPicked({ lat, lng, address: r.display_name });
    setResults([]);
    setQuery(r.display_name);
    mapRef.current?.setView([lat, lng], 14, { animate: true });
    markerRef.current?.setLatLng([lat, lng]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-slate-400 font-black uppercase tracking-widest">Location</div>
            <div className="text-lg font-black text-slate-900 truncate">{title}</div>
          </div>
          <button
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
            onClick={onCancel}
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-0">
          <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-200">
            <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Search</div>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type a place (e.g., Pune, Nashik, Azadpur Mandi)"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />

            <div className="mt-3 flex gap-2">
              <button
                className="flex-1 h-11 rounded-2xl bg-slate-900 hover:bg-slate-800 font-black text-white disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={geoLoading}
                onClick={useCurrentLocation}
              >
                {geoLoading ? 'Locating…' : 'Use Current Location'}
              </button>
              <button
                className="h-11 px-4 rounded-2xl border border-slate-200 text-slate-700 font-black hover:bg-slate-50"
                onClick={() => reverseGeocode(picked.lat, picked.lng)}
                disabled={reverseLoading}
              >
                Refresh Address
              </button>
            </div>
            {geoError && (
              <div className="mt-2 text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                {geoError}
              </div>
            )}

            <div className="mt-3">
              {searchLoading && <div className="text-sm text-slate-500 font-medium">Searching…</div>}
              {!searchLoading && results.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {results.map(r => (
                    <button
                      key={r.place_id}
                      className="w-full text-left px-4 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50"
                      onClick={() => applyResult(r)}
                    >
                      <div className="text-sm font-bold text-slate-900 line-clamp-2">{r.display_name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Selected</div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-sm font-bold text-slate-900">{picked.address || (reverseLoading ? 'Resolving address…' : 'Tap/drag pin to pick a location')}</div>
                <div className="mt-2 text-xs text-slate-500 font-bold">
                  {picked.lat.toFixed(6)}, {picked.lng.toFixed(6)}
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                className="flex-1 h-11 rounded-2xl border border-slate-200 font-black text-slate-700 hover:bg-slate-50"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                className="flex-1 h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black text-white disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!picked.address}
                onClick={() => onConfirm(picked)}
              >
                Confirm
              </button>
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Map</div>
            <div ref={mapElRef} className="w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200" />
            <div className="mt-3 text-xs text-slate-500 font-bold">
              Tip: click the map to move the pin, or drag the pin to fine-tune.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
