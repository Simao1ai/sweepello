import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  Home,
  HardHat,
  ArrowRight,
  CheckCircle,
  Calendar,
  DollarSign,
  Star,
  Briefcase,
  Clock,
  Shield,
  MapPin,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function RoleSelection() {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<"client" | "contractor" | null>(null);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");

  const createProfileMutation = useMutation({
    mutationFn: async (payload: object) => {
      const res = await apiRequest("POST", "/api/profile", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Welcome to Sweepello!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleContinue = () => {
    if (!selectedRole) return;
    const payload: Record<string, string> = { role: selectedRole };
    if (selectedRole === "client") {
      if (!address || !city || !zipCode) {
        toast({ title: "Address required", description: "Please fill in your property address.", variant: "destructive" });
        return;
      }
      payload.address = address;
      payload.city = city;
      payload.zipCode = zipCode;
      if (phone) payload.phone = phone;
    }
    createProfileMutation.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center mb-2">
            <span
              className="text-4xl font-bold sweepello-gradient"
              style={{ fontFamily: "'Pacifico', cursive" }}
            >
              Sweepello
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-role-title">
            Welcome! How would you like to join?
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Choose your role to get started on the platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedRole === "client"
                ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                : "hover:border-blue-300 dark:hover:border-blue-800"
            }`}
            onClick={() => setSelectedRole("client")}
            data-testid="card-role-client"
          >
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
                  <Home className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
                {selectedRole === "client" && (
                  <CheckCircle className="h-6 w-6 text-blue-500" data-testid="icon-client-selected" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">I Need Cleaning</h3>
                <p className="text-sm text-muted-foreground">
                  Book professional cleaning services for your home, rental, or business property
                </p>
              </div>
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span>Schedule cleanings on your terms</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                  <span>Transparent pricing, no hidden fees</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 text-blue-500" />
                  <span>Rate & review your cleaners</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedRole === "contractor"
                ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                : "hover:border-emerald-300 dark:hover:border-emerald-800"
            }`}
            onClick={() => setSelectedRole("contractor")}
            data-testid="card-role-contractor"
          >
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                  <HardHat className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                {selectedRole === "contractor" && (
                  <CheckCircle className="h-6 w-6 text-emerald-500" data-testid="icon-contractor-selected" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">I'm a Cleaner</h3>
                <p className="text-sm text-muted-foreground">
                  Join our network of professional cleaners and start earning on your schedule
                </p>
              </div>
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4 text-emerald-500" />
                  <span>Receive job offers in your area</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-emerald-500" />
                  <span>Set your own availability</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span>Direct deposit via Stripe Connect</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedRole === "client" && (
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-blue-500" />
                <h3 className="font-semibold text-sm">Your Property Address</h3>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                This will be saved to your account and pre-filled when booking services.
              </p>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm">Street Address *</Label>
                <Input
                  id="address"
                  placeholder="123 Ocean Ave"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  data-testid="input-client-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm">City *</Label>
                  <Input
                    id="city"
                    placeholder="Seaside Heights"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    data-testid="input-client-city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip" className="text-sm">ZIP Code *</Label>
                  <Input
                    id="zip"
                    placeholder="08751"
                    value={zipCode}
                    onChange={e => setZipCode(e.target.value)}
                    data-testid="input-client-zip"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm">Phone (optional)</Label>
                <Input
                  id="phone"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  data-testid="input-client-phone"
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center">
          <Button
            size="lg"
            className="gap-2 px-8"
            disabled={!selectedRole || createProfileMutation.isPending}
            onClick={handleContinue}
            data-testid="button-continue"
          >
            {createProfileMutation.isPending ? "Setting up..." : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          This choice determines your experience. Contact support if you need to change later.
        </p>
      </div>
    </div>
  );
}
