import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MapPin, Calendar, Home, ArrowLeft, Star, Zap, Sparkles, Truck, TrendingUp } from "lucide-react";
import { AddressSearch } from "@/components/address-search";

interface SurgeData {
  multiplier: number;
  onlineCount: number;
  activeRequests: number;
}

const SERVICE_TYPE_INFO: Record<string, { label: string; icon: typeof Home; description: string; rate: string }> = {
  standard: { label: "Standard Clean", icon: Sparkles, description: "Regular maintenance cleaning", rate: "$0.15/sqft" },
  deep: { label: "Deep Clean", icon: Home, description: "Thorough top-to-bottom cleaning", rate: "$0.21/sqft" },
  "move-out": { label: "Move-Out / Turnover", icon: Truck, description: "Complete move-out or rental turnover", rate: "$0.26/sqft" },
};

interface PricingData {
  estimatedPrice: number;
  subcontractorCost: number;
  platformFee: number;
  marginPercent: number;
}

export default function RequestService() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOnDemand, setIsOnDemand] = useState(false);

  const [formData, setFormData] = useState({
    propertyAddress: "",
    city: "",
    zipCode: "",
    propertyType: "residential",
    serviceType: "standard",
    bedrooms: 2,
    bathrooms: 1,
    squareFootage: 1500,
    basement: false,
    requestedDate: "",
    preferredTime: "morning",
    specialInstructions: "",
    preferredCleanerId: "",
  });

  const [pricing, setPricing] = useState<PricingData>({
    estimatedPrice: 0,
    subcontractorCost: 0,
    platformFee: 0,
    marginPercent: 0,
  });

  const { data: surge } = useQuery<SurgeData>({
    queryKey: ["/api/surge"],
    refetchInterval: 30000,
  });

  const { data: previousCleaners } = useQuery<{ id: string; name: string; rating: string }[]>({
    queryKey: ["/api/client/previous-cleaners"],
  });

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          `/api/pricing-estimate?serviceType=${formData.serviceType}&bedrooms=${formData.bedrooms}&bathrooms=${formData.bathrooms}&squareFootage=${formData.squareFootage}&basement=${formData.basement}`
        );
        const data = await res.json();
        setPricing(data);
      } catch {
        setPricing({ estimatedPrice: 150, subcontractorCost: 105, platformFee: 45, marginPercent: 30 });
      }
    };
    fetchPrice();
  }, [formData.serviceType, formData.bedrooms, formData.bathrooms, formData.squareFootage, formData.basement]);

  const surgeMultiplier = surge?.multiplier ?? 1.0;
  const surgeLabel = surgeMultiplier >= 1.5 ? "High Demand" : surgeMultiplier >= 1.25 ? "Moderate Demand" : null;
  const effectivePrice = Math.round((pricing.estimatedPrice * surgeMultiplier) / 5) * 5;

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const requestedDate = isOnDemand ? new Date().toISOString() : new Date(data.requestedDate).toISOString();
      const body: Record<string, unknown> = {
        ...data,
        requestedDate,
        isOnDemand,
      };
      if (!data.preferredCleanerId) delete body.preferredCleanerId;
      const res = await apiRequest("POST", "/api/service-requests", body);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Request submitted!",
        description: "We're notifying available cleaners in your area. You'll be matched shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/mine"] });
      navigate("/my-bookings");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/my-bookings")} data-testid="button-back">
        <ArrowLeft className="h-4 w-4" /> Back to Bookings
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Request a Cleaning
          </CardTitle>
          <CardDescription>Fill in your property details and preferred schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" /> Service Type
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(SERVICE_TYPE_INFO).map(([key, info]) => {
                  const Icon = info.icon;
                  const isSelected = formData.serviceType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData({ ...formData, serviceType: key })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/30"
                      }`}
                      data-testid={`button-service-${key}`}
                    >
                      <Icon className={`h-5 w-5 mb-1 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="text-sm font-medium">{info.label}</p>
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                      <Badge variant="outline" className="mt-1 text-xs">{info.rate}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" /> Property Details
              </h3>
              <div className="space-y-2">
                <Label htmlFor="address">Property Address</Label>
                <AddressSearch
                  id="address"
                  data-testid="input-address"
                  placeholder="Search your property address..."
                  value={formData.propertyAddress}
                  onChange={(full, parts) => setFormData({
                    ...formData,
                    propertyAddress: full,
                    city: parts.city || formData.city,
                    zipCode: parts.zip || formData.zipCode,
                  })}
                />
                <p className="text-xs text-muted-foreground">City and ZIP will auto-fill when you select an address</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    data-testid="input-city"
                    placeholder="Auto-filled"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">Zip Code</Label>
                  <Input
                    id="zip"
                    data-testid="input-zip"
                    placeholder="Auto-filled"
                    value={formData.zipCode}
                    onChange={e => setFormData({ ...formData, zipCode: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Select
                      value={String(formData.bedrooms)}
                      onValueChange={v => setFormData({ ...formData, bedrooms: Number(v) })}
                    >
                      <SelectTrigger data-testid="select-bedrooms">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Select
                      value={String(formData.bathrooms)}
                      onValueChange={v => setFormData({ ...formData, bathrooms: Number(v) })}
                    >
                      <SelectTrigger data-testid="select-bathrooms">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sqft">Square Footage</Label>
                  <Input
                    id="sqft"
                    type="number"
                    data-testid="input-sqft"
                    placeholder="1500"
                    required
                    min={500}
                    value={formData.squareFootage || ""}
                    onChange={e => setFormData({ ...formData, squareFootage: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label htmlFor="basement" className="text-sm font-medium cursor-pointer">Include Basement</Label>
                  <p className="text-xs text-muted-foreground">Additional cost for basement cleaning</p>
                </div>
                <Switch
                  id="basement"
                  checked={formData.basement}
                  onCheckedChange={v => setFormData({ ...formData, basement: v })}
                  data-testid="switch-basement"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-primary" /> Schedule
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsOnDemand(false)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${!isOnDemand ? "border-primary bg-primary/5" : "border-muted hover:border-primary/30"}`}
                  data-testid="button-schedule-mode"
                >
                  <Calendar className={`h-5 w-5 mb-1 ${!isOnDemand ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium">Schedule</p>
                  <p className="text-xs text-muted-foreground">Pick a date & time</p>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOnDemand(true)}
                  className={`p-4 rounded-lg border-2 text-left transition-all relative ${isOnDemand ? "border-amber-500 bg-amber-500/5" : "border-muted hover:border-amber-500/30"}`}
                  data-testid="button-ondemand-mode"
                >
                  <Zap className={`h-5 w-5 mb-1 ${isOnDemand ? "text-amber-500" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium">Book Now</p>
                  <p className="text-xs text-muted-foreground">ASAP – online cleaners only</p>
                  {surgeLabel && isOnDemand && (
                    <Badge className="absolute top-2 right-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px]">
                      {surgeLabel}
                    </Badge>
                  )}
                </button>
              </div>

              {isOnDemand ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    We'll contact all online cleaners in your area right now. <strong>ETA: 30–90 minutes</strong>
                    {surge && ` · ${surge.onlineCount} cleaner${surge.onlineCount !== 1 ? "s" : ""} available`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Preferred Date</Label>
                    <Input
                      id="date"
                      type="date"
                      data-testid="input-date"
                      required={!isOnDemand}
                      value={formData.requestedDate}
                      onChange={e => setFormData({ ...formData, requestedDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Time</Label>
                    <Select
                      value={formData.preferredTime}
                      onValueChange={v => setFormData({ ...formData, preferredTime: v })}
                    >
                      <SelectTrigger data-testid="select-time">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning (8am-12pm)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (12pm-4pm)</SelectItem>
                        <SelectItem value="evening">Evening (4pm-8pm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {previousCleaners && previousCleaners.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-primary" /> Preferred Cleaner (Optional)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Request a cleaner you've worked with before. They'll get priority for this job.
                </p>
                <Select
                  value={formData.preferredCleanerId}
                  onValueChange={v => setFormData({ ...formData, preferredCleanerId: v === "none" ? "" : v })}
                >
                  <SelectTrigger data-testid="select-preferred-cleaner">
                    <SelectValue placeholder="No preference - best available" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No preference - best available</SelectItem>
                    {previousCleaners.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({Number(c.rating).toFixed(1)} stars)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="instructions">Special Instructions</Label>
              <Textarea
                id="instructions"
                data-testid="input-instructions"
                placeholder="Any special requests or access instructions..."
                value={formData.specialInstructions}
                onChange={e => setFormData({ ...formData, specialInstructions: e.target.value })}
              />
            </div>

            <Card className={`border-dashed ${surgeLabel && isOnDemand ? "bg-orange-50/50 dark:bg-orange-950/10 border-orange-300 dark:border-orange-700" : "bg-muted/50"}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Your Quote</span>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {SERVICE_TYPE_INFO[formData.serviceType]?.label || formData.serviceType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formData.bedrooms}BR / {formData.bathrooms}BA / {formData.squareFootage || "—"} sqft
                        {formData.basement ? " + Basement" : ""}
                      </span>
                      {surgeLabel && isOnDemand && (
                        <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs gap-1">
                          <TrendingUp className="h-3 w-3" /> {surgeMultiplier.toFixed(2)}x {surgeLabel}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {surgeMultiplier > 1.0 && isOnDemand && (
                      <div className="text-sm text-muted-foreground line-through">${pricing.estimatedPrice}</div>
                    )}
                    <span className={`text-2xl font-bold ${surgeLabel && isOnDemand ? "text-orange-600 dark:text-orange-400" : "text-primary"}`} data-testid="text-estimated-price">
                      ${surgeMultiplier > 1.0 && isOnDemand ? effectivePrice : pricing.estimatedPrice}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 border-t pt-2">
                  <p>Competitive NJ market rate based on your property details.</p>
                  {surgeLabel && isOnDemand && (
                    <p className="text-orange-600 dark:text-orange-400">
                      Surge pricing applied due to high demand. Price will normalize when more cleaners become available.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 flex items-start gap-2">
              <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {isOnDemand
                  ? "All available online cleaners will be contacted immediately. The first to accept gets the job."
                  : `Your request will be automatically sent to available cleaners in your area, prioritized by rating. ${formData.preferredCleanerId ? "Your preferred cleaner will get first priority." : ""}`
                }
              </p>
            </div>

            <Button
              type="submit"
              className={`w-full ${isOnDemand ? "bg-amber-500 hover:bg-amber-600" : ""}`}
              size="lg"
              disabled={mutation.isPending}
              data-testid="button-submit-request"
            >
              {mutation.isPending
                ? (isOnDemand ? "Finding Cleaners..." : "Submitting...")
                : (isOnDemand ? "⚡ Book Now – Find a Cleaner ASAP" : "Submit Cleaning Request")
              }
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
