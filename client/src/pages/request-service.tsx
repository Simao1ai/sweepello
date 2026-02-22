import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Calendar, Home, ArrowLeft } from "lucide-react";

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
    requestedDate: "",
    preferredTime: "morning",
    specialInstructions: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/service-requests", {
        ...data,
        requestedDate: new Date(data.requestedDate).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request submitted!", description: "We'll match you with a cleaner shortly." });
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

  const estimatedPrice = 100 + (formData.bedrooms * 25);

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
                <Select
                  value={formData.propertyType}
                  onValueChange={v => setFormData({ ...formData, propertyType: v })}
                >
                  <SelectTrigger data-testid="select-property-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="airbnb">Airbnb</SelectItem>
                    <SelectItem value="vrbo">VRBO</SelectItem>
                    <SelectItem value="direct">Direct Rental</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                  <span className="text-sm text-muted-foreground">Estimated Price</span>
                  <span className="text-2xl font-bold text-primary" data-testid="text-estimated-price">
                    ${estimatedPrice}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Final price may vary based on property condition
                </p>
              </CardContent>
            </Card>

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
