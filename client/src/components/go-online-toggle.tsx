import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, MapPin, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { sendWsMessage } from "@/hooks/use-websocket";

interface OnlineStatus {
  isOnline: boolean;
  currentLat: string | null;
  currentLng: string | null;
}

interface GoOnlineToggleProps {
  cleanerId?: string;
  cleanerName?: string;
}

export default function GoOnlineToggle({ cleanerId, cleanerName }: GoOnlineToggleProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const watchRef = useRef<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const { data: status } = useQuery<OnlineStatus>({
    queryKey: ["/api/contractor/online-status"],
    refetchInterval: 30000,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ isOnline, lat, lng }: { isOnline: boolean; lat?: number; lng?: number }) => {
      const res = await apiRequest("PATCH", "/api/contractor/online-status", { isOnline, lat, lng });
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/contractor/online-status"] });
      toast({
        title: vars.isOnline ? "You're now online!" : "You're now offline",
        description: vars.isOnline
          ? "You'll receive job offers as they come in."
          : "You won't receive new job offers until you go back online.",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("GPS not supported on this device");
      return;
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGpsError(null);
        sendWsMessage({ type: "location_update", lat, lng });
        apiRequest("PATCH", "/api/contractor/online-status", { isOnline: true, lat, lng }).catch(() => {});
      },
      (err) => {
        if (err.code === 1) setGpsError("Location access denied. Enable GPS to share your location.");
        else setGpsError("Unable to get location.");
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
    );
  }, []);

  const stopLocationTracking = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (status?.isOnline) {
      startLocationTracking();
    }
    return () => stopLocationTracking();
  }, [status?.isOnline, startLocationTracking, stopLocationTracking]);

  const handleToggle = () => {
    const goingOnline = !status?.isOnline;

    if (goingOnline) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            toggleMutation.mutate({ isOnline: true, lat, lng });
            startLocationTracking();
          },
          () => {
            toggleMutation.mutate({ isOnline: true });
            startLocationTracking();
          }
        );
      } else {
        toggleMutation.mutate({ isOnline: true });
      }
    } else {
      stopLocationTracking();
      toggleMutation.mutate({ isOnline: false });
    }
  };

  const isOnline = status?.isOnline ?? false;

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleToggle}
        disabled={toggleMutation.isPending}
        size="lg"
        data-testid="button-go-online-toggle"
        className={`gap-2 h-14 text-base font-semibold transition-all ${
          isOnline
            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30"
            : "bg-muted text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 border"
        }`}
      >
        {toggleMutation.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isOnline ? (
          <Wifi className="h-5 w-5" />
        ) : (
          <WifiOff className="h-5 w-5" />
        )}
        {isOnline ? "Online – Receiving Jobs" : "Go Online"}
      </Button>

      {isOnline && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <MapPin className="h-3 w-3" />
            <span>
              {status?.currentLat
                ? `Location shared (${Number(status.currentLat).toFixed(4)}, ${Number(status.currentLng).toFixed(4)})`
                : "Acquiring location..."}
            </span>
          </div>
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      )}

      {gpsError && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{gpsError}</p>
      )}
    </div>
  );
}
