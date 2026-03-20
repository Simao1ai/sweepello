import { useEffect, useRef, useState, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Navigation, MapPin, Clock, Loader2 } from "lucide-react";
declare global {
  interface Window { L: any; }
}

function haversineEta(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const miles = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const mins = Math.round((miles / 25) * 60);
  if (mins < 2) return "< 2 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

interface TrackingData {
  jobStatus: string;
  jobId?: string;
  propertyAddress: string;
  scheduledDate?: string;
  cleanerName?: string;
  cleanerId?: string;
  cleanerLat?: number | null;
  cleanerLng?: number | null;
}

const statusLabels: Record<string, string> = {
  confirmed: "Cleaner Assigned",
  in_route: "Cleaner On The Way",
  in_progress: "Cleaning In Progress",
  completed: "Cleaning Complete",
};

const statusColors: Record<string, string> = {
  confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  in_route: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  in_progress: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
};

async function geocodeAddress(address: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us`,
      { headers: { "User-Agent": "Sweepello/1.0" } }
    );
    const results = await res.json();
    if (results[0]) return [parseFloat(results[0].lat), parseFloat(results[0].lon)];
  } catch {}
  return null;
}

export default function Tracking() {
  const [, params] = useRoute("/tracking/:id");
  const [, navigate] = useLocation();
  const mapRef = useRef<any>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const cleanerMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [cleanerPos, setCleanerPos] = useState<[number, number] | null>(null);
  const [destPos, setDestPos] = useState<[number, number] | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const { data: tracking, isLoading } = useQuery<TrackingData>({
    queryKey: ["/api/service-requests", params?.id, "tracking"],
    queryFn: async () => {
      const res = await fetch(`/api/service-requests/${params?.id}/tracking`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load tracking");
      return res.json();
    },
    enabled: !!params?.id,
    refetchInterval: 15000,
  });

  const initMap = useCallback((cLat?: number, cLng?: number, dLat?: number, dLng?: number) => {
    if (!mapDivRef.current || mapRef.current || !window.L) return;
    const center: [number, number] = cLat && cLng ? [cLat, cLng] : dLat && dLng ? [dLat, dLng] : [40.0, -74.5];
    mapRef.current = window.L.map(mapDivRef.current).setView(center, 13);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(mapRef.current);
    setMapReady(true);
  }, []);

  useEffect(() => {
    const loadLeaflet = () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      if (!document.getElementById("leaflet-js")) {
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => initMap();
        document.head.appendChild(script);
      } else if (window.L) {
        initMap();
      }
    };
    loadLeaflet();
  }, [initMap]);

  useEffect(() => {
    if (!tracking || !window.L || !mapRef.current) return;

    if (tracking.cleanerLat && tracking.cleanerLng) {
      const pos: [number, number] = [tracking.cleanerLat, tracking.cleanerLng];
      setCleanerPos(pos);
    }

    if (tracking.propertyAddress) {
      geocodeAddress(tracking.propertyAddress).then(pos => {
        if (pos) setDestPos(pos);
      });
    }
  }, [tracking, mapReady]);

  useEffect(() => {
    if (!window.L || !mapRef.current) return;
    const L = window.L;

    if (cleanerPos) {
      const cleanerIcon = L.divIcon({
        html: `<div style="background:#0891b2;border:3px solid white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:18px;">🧹</div>`,
        className: "", iconSize: [36, 36], iconAnchor: [18, 18],
      });
      if (cleanerMarkerRef.current) {
        cleanerMarkerRef.current.setLatLng(cleanerPos);
      } else {
        cleanerMarkerRef.current = L.marker(cleanerPos, { icon: cleanerIcon })
          .addTo(mapRef.current)
          .bindPopup(`<strong>${tracking?.cleanerName || "Your cleaner"}</strong><br/>En route to you`);
      }
    }

    if (destPos) {
      const destIcon = L.divIcon({
        html: `<div style="background:#7c3aed;border:3px solid white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:18px;">🏠</div>`,
        className: "", iconSize: [36, 36], iconAnchor: [18, 18],
      });
      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker(destPos, { icon: destIcon })
          .addTo(mapRef.current)
          .bindPopup(`<strong>Your property</strong><br/>${tracking?.propertyAddress || ""}`);
      }
    }

    if (cleanerPos && destPos) {
      const etaStr = haversineEta(cleanerPos[0], cleanerPos[1], destPos[0], destPos[1]);
      setEta(etaStr);
      const bounds = L.latLngBounds([cleanerPos, destPos]);
      mapRef.current.fitBounds(bounds, { padding: [60, 60] });
    } else if (cleanerPos) {
      mapRef.current.setView(cleanerPos, 14);
    } else if (destPos) {
      mapRef.current.setView(destPos, 14);
    }
  }, [cleanerPos, destPos, mapReady, tracking]);

  const handleWsMessage = useCallback((msg: any) => {
    if (msg.type === "cleaner_location" && tracking?.cleanerId && msg.cleanerId === tracking.cleanerId) {
      setCleanerPos([msg.lat, msg.lng]);
    }
    if (msg.type === "job_status_update" && msg.jobId === tracking?.jobId) {
      window.location.reload();
    }
  }, [tracking]);

  useWebSocket(handleWsMessage);

  const isLive = tracking?.jobStatus === "in_route" || tracking?.jobStatus === "in_progress";

  return (
    <div className="flex flex-col h-full" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
      <div className="p-4 flex items-center justify-between border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/my-bookings")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-base font-semibold" data-testid="text-tracking-title">
              {tracking?.cleanerName ? `${tracking.cleanerName} is on the way` : "Tracking"}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-48">{tracking?.propertyAddress}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400">
              <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
              Live
            </span>
          )}
          <Badge className={statusColors[tracking?.jobStatus || ""] || "bg-muted"} data-testid="badge-status">
            {statusLabels[tracking?.jobStatus || ""] || tracking?.jobStatus || "Loading..."}
          </Badge>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        <div ref={mapDivRef} className="w-full h-full" data-testid="tracking-map" />
      </div>

      {(eta || tracking?.scheduledDate) && (
        <div className="p-4 border-t bg-background shrink-0 flex items-center justify-between" data-testid="tracking-footer">
          {eta && isLive ? (
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-cyan-600" />
              <div>
                <p className="text-xs text-muted-foreground">Estimated arrival</p>
                <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400" data-testid="text-eta">{eta}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Navigation className="h-4 w-4" />
              <p className="text-sm">Waiting for cleaner to go en route</p>
            </div>
          )}
          {tracking?.scheduledDate && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Scheduled</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(tracking.scheduledDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
