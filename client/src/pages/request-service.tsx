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
import { MapPin, Calendar, Home, ArrowLeft, Star, Zap, Building2, Hotel } from "lucide-react";

const PROPERTY_TYPE_INFO: Record<string, { label: string; icon: typeof Home; description: string }> = {
  residential: { label: "Residential", icon: Home, description: "Private homes and apartments" },
  commercial: { label: "Commercial", icon: Building2, description: "Office spaces and commercial properties" },
  airbnb: { label: "Airbnb / Vacation Rental", icon: Hotel, description: "Short-term rental turnovers" },
};

export default function RequestService() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    propertyAddress: "",
    city: "",
    zipCode: "",
    propertyType: "airbnb",
    bedrooms: 2,
    bathrooms: 1,
    squareFootage: 0,
    requestedDate: "",
    preferredTime: "morning",
    specialInstructions: "",
    preferredCleanerId: "",
  });

  const [estimatedPrice, setEstimatedPrice] = useState(150);

  const { data: previousCleaners } = useQuery<{ id: string; name: string; rating: string }[]>({
    queryKey: ["/api/client/previous-cleaners"],
  });

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          `/api/pricing-estimate?propertyType=${formData.propertyType}&bedrooms=${formData.bedrooms}&bathrooms=${formData.bathrooms}&squareFootage=${formData.squareFootage}`
        );
        const data = await res.json();
        setEstimatedPrice(data.estimatedPrice);
      } catch {
        const base = formData.propertyType === "commercial" ? 150 : formData.propertyType === "residential" ? 80 : 100;
        setEstimatedPrice(base + formData.bedrooms * 25 + formData.bathrooms * 20);
      }
    };
    fetchPrice();
  }, [formData.propertyType, formData.bedrooms, formData.bathrooms, formData.squareFootage]);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const body: Record<string, unknown> = {
        ...data,
        requestedDate: new Date(data.requestedDate).toISOString(),
      };
      if (!data.preferredCleanerId) delete body.preferredCleanerId;
      if (!data.squareFootage) delete body.squareFootage;
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
                <MapPin className="h-4 w-4 text-primary" /> Property Details
              </h3>
              <div className="space-y-2">
                <Label htmlFor="address">Property Address</Label>
                <Input
                  id="address"
                  data-testid="input-address"
                  placeholder="123 Ocean Ave"
                  required
                  value={formData.propertyAddress}
                  onChange={e => setFormData({ ...formData, propertyAddress: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    data-testid="input-city"
                    placeholder="Point Pleasant"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">Zip Code</Label>
                  <Input
                    id="zip"
                    data-testid="input-zip"
                    placeholder="08742"
                    value={formData.zipCode}
                    onChange={e => setFormData({ ...formData, zipCode: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Property Type</Label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(PROPERTY_TYPE_INFO).map(([key, info]) => {
                    const Icon = info.icon;
                    const isSelected = formData.propertyType === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, propertyType: key })}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/30"
                        }`}
                        data-testid={`button-type-${key}`}
                      >
                        <Icon className={`h-5 w-5 mb-1 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="text-sm font-medium">{info.label}</p>
                        <p className="text-xs text-muted-foreground">{info.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="sqft">Sq Ft (optional)</Label>
                  <Input
                    id="sqft"
                    type="number"
                    data-testid="input-sqft"
                    placeholder="1500"
                    value={formData.squareFootage || ""}
                    onChange={e => setFormData({ ...formData, squareFootage: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-primary" /> Schedule
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Preferred Date</Label>
                  <Input
                    id="date"
                    type="date"
                    data-testid="input-date"
                    required
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

            <Card className="bg-muted/50 border-dashed">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-muted-foreground">Estimated Price</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {PROPERTY_TYPE_INFO[formData.propertyType]?.label || formData.propertyType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formData.bedrooms}BR / {formData.bathrooms}BA
                      </span>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-primary" data-testid="text-estimated-price">
                    ${estimatedPrice}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Final price may vary based on property condition
                </p>
              </CardContent>
            </Card>

            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 flex items-start gap-2">
              <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Your request will be automatically sent to available cleaners in your area, prioritized by rating. 
                {formData.preferredCleanerId ? " Your preferred cleaner will get first priority." : ""}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={mutation.isPending}
              data-testid="button-submit-request"
            >
              {mutation.isPending ? "Submitting..." : "Submit Cleaning Request"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
