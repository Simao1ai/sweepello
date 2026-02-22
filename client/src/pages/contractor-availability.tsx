import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Save } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CleanerAvailability } from "@shared/schema";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export default function ContractorAvailability() {
  const { toast } = useToast();
  const [hasChanges, setHasChanges] = useState(false);

  const { data: availability, isLoading } = useQuery<CleanerAvailability[]>({
    queryKey: ["/api/contractor/availability"],
  });

  const defaultSlots: AvailabilitySlot[] = DAYS.map((_, i) => ({
    dayOfWeek: i,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: i >= 1 && i <= 5,
  }));

  const [slots, setSlots] = useState<AvailabilitySlot[]>(defaultSlots);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (availability && availability.length > 0 && !hasChanges && !initializedRef.current) {
      const mapped = DAYS.map((_, i) => {
        const existing = availability.find(a => a.dayOfWeek === i);
        return existing
          ? { dayOfWeek: i, startTime: existing.startTime, endTime: existing.endTime, isAvailable: existing.isAvailable }
          : { dayOfWeek: i, startTime: "08:00", endTime: "18:00", isAvailable: false };
      });
      setSlots(mapped);
      initializedRef.current = true;
    }
  }, [availability, hasChanges]);

  const saveMutation = useMutation({
    mutationFn: async (slotsData: AvailabilitySlot[]) => {
      const res = await apiRequest("POST", "/api/contractor/availability", { slots: slotsData });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/availability"] });
      setHasChanges(false);
      toast({ title: "Availability saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleDay = (dayIndex: number) => {
    setSlots(prev => prev.map(s =>
      s.dayOfWeek === dayIndex ? { ...s, isAvailable: !s.isAvailable } : s
    ));
    setHasChanges(true);
  };

  const updateTime = (dayIndex: number, field: "startTime" | "endTime", value: string) => {
    setSlots(prev => prev.map(s =>
      s.dayOfWeek === dayIndex ? { ...s, [field]: value } : s
    ));
    setHasChanges(true);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">My Availability</h1>
          <p className="text-muted-foreground text-sm">Set your weekly working schedule</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => saveMutation.mutate(slots)}
          disabled={saveMutation.isPending || !hasChanges}
          data-testid="button-save-availability"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Weekly Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {slots.map((slot) => (
              <div
                key={slot.dayOfWeek}
                className={`flex items-center gap-4 p-3 rounded-lg border ${
                  slot.isAvailable ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" : "bg-muted/30 border-transparent"
                }`}
                data-testid={`row-day-${slot.dayOfWeek}`}
              >
                <Switch
                  checked={slot.isAvailable}
                  onCheckedChange={() => toggleDay(slot.dayOfWeek)}
                  data-testid={`switch-day-${slot.dayOfWeek}`}
                />
                <span className="font-medium w-28 text-sm">{DAYS[slot.dayOfWeek]}</span>
                {slot.isAvailable ? (
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateTime(slot.dayOfWeek, "startTime", e.target.value)}
                      className="border rounded px-2 py-1 text-xs bg-background"
                      data-testid={`input-start-${slot.dayOfWeek}`}
                    />
                    <span className="text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateTime(slot.dayOfWeek, "endTime", e.target.value)}
                      className="border rounded px-2 py-1 text-xs bg-background"
                      data-testid={`input-end-${slot.dayOfWeek}`}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Unavailable</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
