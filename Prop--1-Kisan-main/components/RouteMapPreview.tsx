import React, { useEffect, useMemo, useRef } from 'react';
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

export const RouteMapPreview: React.FC<{
  pickup: { lat: number; lng: number };
  drop: { lat: number; lng: number };
  className?: string;
}> = ({ pickup, drop, className }) => {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const bounds = useMemo(() => {
    const b = L.latLngBounds([pickup.lat, pickup.lng], [drop.lat, drop.lng]);
    return b.isValid() ? b : null;
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

    const pickupMarker = L.marker([pickup.lat, pickup.lng]).addTo(map);
    const dropMarker = L.marker([drop.lat, drop.lng]).addTo(map);
    const line = L.polyline([[pickup.lat, pickup.lng], [drop.lat, drop.lng]], { color: '#2563eb', weight: 4, opacity: 0.8 }).addTo(map);

    if (bounds) map.fitBounds(bounds.pad(0.2));
    else map.setView([pickup.lat, pickup.lng], 12);

    return () => {
      pickupMarker.remove();
      dropMarker.remove();
      line.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [bounds, drop.lat, drop.lng, pickup.lat, pickup.lng]);

  return <div ref={mapElRef} className={className || 'w-full h-[420px] rounded-2xl overflow-hidden border border-slate-200'} />;
};

