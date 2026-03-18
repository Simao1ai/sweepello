import { useEffect, useRef, useCallback } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import type { Cleaner } from "@shared/schema";

interface MapMarker {
  cleanerId: string;
  name: string;
  lat: number;
  lng: number;
  isOnline?: boolean;
  eta?: string;
}

interface LiveMapProps {
  height?: string;
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  onCleanerLocation?: (cleanerId: string, lat: number, lng: number) => void;
  className?: string;
}

declare global {
  interface Window {
    L: any;
  }
}

function haversineEta(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const mins = Math.round((dist / 30) * 60);
  if (mins < 2) return "< 2 min";
  if (mins < 60) return `~${mins} min`;
  return `~${Math.round(mins / 60)}h ${mins % 60}min`;
}

export default function LiveMap({ height = "300px", markers = [], center, zoom = 11, onCleanerLocation, className = "" }: LiveMapProps) {
  const mapRef = useRef<any>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const leafletMarkersRef = useRef<Map<string, any>>(new Map());

  const NJ_CENTER: [number, number] = center || [39.9, -74.2];

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const existingLink = document.getElementById("leaflet-css");
    if (!existingLink) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById("leaflet-js");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else if (window.L) {
      initMap();
    }
  }, []);

  const initMap = () => {
    if (!mapDivRef.current || mapRef.current || !window.L) return;
    mapRef.current = window.L.map(mapDivRef.current).setView(NJ_CENTER, zoom);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapRef.current);
    updateMarkers();
  };

  const updateMarkers = () => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;

    const currentIds = new Set(markers.map(m => m.cleanerId));
    leafletMarkersRef.current.forEach((lMarker, id) => {
      if (!currentIds.has(id)) {
        mapRef.current.removeLayer(lMarker);
        leafletMarkersRef.current.delete(id);
      }
    });

    markers.forEach(m => {
      const iconHtml = `
        <div style="
          background: ${m.isOnline !== false ? '#10b981' : '#6b7280'};
          border: 3px solid white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          font-size: 16px;
        ">🧹</div>
      `;
      const icon = L.divIcon({ html: iconHtml, className: "", iconSize: [32, 32], iconAnchor: [16, 16] });

      const etaText = m.eta || "";
      const popupContent = `
        <div style="font-family: sans-serif; font-size: 13px; min-width: 120px;">
          <strong>${m.name}</strong><br/>
          ${etaText ? `ETA: <span style="color:#10b981">${etaText}</span>` : "Online"}
        </div>
      `;

      if (leafletMarkersRef.current.has(m.cleanerId)) {
        const existing = leafletMarkersRef.current.get(m.cleanerId);
        existing.setLatLng([m.lat, m.lng]);
        existing.setPopupContent(popupContent);
      } else {
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(mapRef.current).bindPopup(popupContent);
        leafletMarkersRef.current.set(m.cleanerId, marker);
      }
    });
  };

  useEffect(() => {
    if (window.L && mapRef.current) updateMarkers();
  }, [markers]);

  const handleWsMessage = useCallback((msg: any) => {
    if (msg.type === "cleaner_location" && onCleanerLocation) {
      onCleanerLocation(msg.cleanerId, msg.lat, msg.lng);
    }
    if ((msg.type === "cleaner_location" || msg.type === "cleaner_online") && mapRef.current && window.L) {
      updateMarkers();
    }
  }, [onCleanerLocation]);

  useWebSocket(handleWsMessage);

  return (
    <div
      ref={mapDivRef}
      className={`rounded-lg overflow-hidden border ${className}`}
      style={{ height, width: "100%" }}
      data-testid="live-map"
    />
  );
}

export { haversineEta };
