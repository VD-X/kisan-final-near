import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { getOsrmDrivingRouteGeometry } from '../services/routing';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

export const RouteMapPreview: React.FC<{
  pickup: { lat: number; lng: number };
  drop: { lat: number; lng: number };
  className?: string;
}> = ({ pickup, drop, className }) => {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropMarkerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const [routePts, setRoutePts] = useState<{ lat: number; lng: number }[] | null>(null);

  const bounds = useMemo(() => {
    const pts: [number, number][] = (routePts && routePts.length >= 2)
      ? routePts.map(p => [p.lat, p.lng] as [number, number])
      : [
          [pickup.lat, pickup.lng],
          [drop.lat, drop.lng]
        ];
    const b = L.latLngBounds(pts as any);
    return b.isValid() ? b : null;
  }, [drop.lat, drop.lng, pickup.lat, pickup.lng, routePts]);

  useEffect(() => {
    const controller = new AbortController();
    setRoutePts(null);
    void (async () => {
      const route = await getOsrmDrivingRouteGeometry(pickup, drop, { signal: controller.signal });
      if (!controller.signal.aborted && route && route.length >= 2) setRoutePts(route);
    })();
    return () => controller.abort();
  }, [drop.lat, drop.lng, pickup.lat, pickup.lng]);

  useEffect(() => {
    if (!mapElRef.current) return;
    if (mapRef.current) return;

    const map = L.map(mapElRef.current, { zoomControl: true, attributionControl: false });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng]).addTo(map);
    dropMarkerRef.current = L.marker([drop.lat, drop.lng]).addTo(map);
    const linePts = (routePts && routePts.length >= 2)
      ? routePts.map(p => [p.lat, p.lng] as [number, number])
      : [[pickup.lat, pickup.lng], [drop.lat, drop.lng]];
    lineRef.current = L.polyline(linePts as any, { color: '#2563eb', weight: 4, opacity: 0.85 }).addTo(map);

    if (bounds) map.fitBounds(bounds.pad(0.2));
    else map.setView([pickup.lat, pickup.lng], 12);

    return () => {
      map.remove();
      mapRef.current = null;
      pickupMarkerRef.current = null;
      dropMarkerRef.current = null;
      lineRef.current = null;
    };
  }, [bounds, drop.lat, drop.lng, pickup.lat, pickup.lng, routePts]);

  useEffect(() => {
    if (!mapRef.current) return;
    pickupMarkerRef.current?.setLatLng([pickup.lat, pickup.lng]);
    dropMarkerRef.current?.setLatLng([drop.lat, drop.lng]);
    const linePts = (routePts && routePts.length >= 2)
      ? routePts.map(p => [p.lat, p.lng] as [number, number])
      : [[pickup.lat, pickup.lng], [drop.lat, drop.lng]];
    lineRef.current?.setLatLngs(linePts as any);
    if (bounds) mapRef.current.fitBounds(bounds.pad(0.2));
  }, [bounds, drop.lat, drop.lng, pickup.lat, pickup.lng, routePts]);

  return <div ref={mapElRef} className={className || 'w-full h-[420px] rounded-2xl overflow-hidden border border-slate-200'} />;
};
