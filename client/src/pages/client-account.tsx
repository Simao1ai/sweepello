import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, User, Phone, Save } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@shared/schema";

export default function ClientAccount() {
  const { toast } = useToast();
  const { data: profile, isLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profile) {
      setAddress((profile as any).address || "");
      setCity((profile as any).city || "");
      setZipCode((profile as any).zipCode || "");
      setPhone((profile as any).phone || "");
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (data: object) => {
      const res = await apiRequest("POST", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Account updated", description: "Your address has been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ address, city, zipCode, phone });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-lg space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">My Account</h1>
        <p className="text-muted-foreground">Update your contact info and default property address</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" /> Default Property Address
            </CardTitle>
            <CardDescription>
              This address will be pre-filled when you request a new cleaning service.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="123 Ocean Ave"
                value={address}
                onChange={e => setAddress(e.target.value)}
                data-testid="input-address"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Seaside Heights"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  data-testid="input-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  placeholder="08751"
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value)}
                  data-testid="input-zip"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-500" /> Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                data-testid="input-phone"
              />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full gap-2"
          disabled={updateMutation.isPending}
          data-testid="button-save-account"
        >
          <Save className="h-4 w-4" />
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
