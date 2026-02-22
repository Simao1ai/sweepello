import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Star, Clock, DollarSign, TrendingUp, Phone, Mail, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Cleaner } from "@shared/schema";

function CleanerCard({ cleaner }: { cleaner: Cleaner }) {
  return (
    <Card className="hover-elevate" data-testid={`card-cleaner-${cleaner.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {cleaner.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-semibold" data-testid={`text-cleaner-name-${cleaner.id}`}>{cleaner.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {cleaner.phone && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />{cleaner.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Badge variant={cleaner.status === "active" ? "default" : "secondary"}>
            {cleaner.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3" /> Rating
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{Number(cleaner.rating).toFixed(1)}</span>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < Math.round(Number(cleaner.rating))
                        ? "text-amber-500 fill-amber-500"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> On-Time
            </div>
            <div className="space-y-1">
              <span className="text-lg font-bold">{cleaner.onTimePercent}%</span>
              <Progress value={cleaner.onTimePercent || 0} className="h-1.5" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" /> Total Jobs
            </div>
            <span className="text-lg font-bold">{cleaner.totalJobs}</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" /> Revenue
            </div>
            <span className="text-lg font-bold">${Number(cleaner.totalRevenue).toLocaleString()}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Pay rate: {cleaner.payRate}%</span>
            {cleaner.email && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />{cleaner.email}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Cleaners() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: cleaners, isLoading } = useQuery<Cleaner[]>({
    queryKey: ["/api/cleaners"],
  });

  const createCleaner = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/cleaners", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaners"] });
      setDialogOpen(false);
      toast({ title: "Cleaner added", description: "New cleaner has been added to your team." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filteredCleaners = cleaners?.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createCleaner.mutate({
      name: formData.get("name") as string,
      email: formData.get("email") as string || null,
      phone: formData.get("phone") as string,
      payRate: parseInt(formData.get("payRate") as string) || 70,
      status: "active",
      rating: "5.00",
      onTimePercent: 100,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Cleaners</h1>
          <p className="text-muted-foreground">Manage your cleaning team and track performance</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-cleaner">
              <Plus className="mr-2 h-4 w-4" />
              Add Cleaner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Cleaner</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input name="name" required placeholder="Maria Garcia" data-testid="input-cleaner-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input name="phone" required placeholder="(555) 123-4567" data-testid="input-cleaner-phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input name="email" type="email" placeholder="maria@email.com" data-testid="input-cleaner-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payRate">Pay Rate (%)</Label>
                <Input
                  name="payRate"
                  type="number"
                  defaultValue="70"
                  min="0"
                  max="100"
                  data-testid="input-pay-rate"
                />
                <p className="text-xs text-muted-foreground">Percentage of job price paid to cleaner</p>
              </div>
              <Button type="submit" className="w-full" disabled={createCleaner.isPending} data-testid="button-submit-cleaner">
                {createCleaner.isPending ? "Adding..." : "Add Cleaner"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search cleaners..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-cleaners"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCleaners?.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCleaners.map((cleaner) => (
            <CleanerCard key={cleaner.id} cleaner={cleaner} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No cleaners found</p>
          <p className="text-xs text-muted-foreground mt-1">Add cleaners to build your team</p>
        </div>
      )}
    </div>
  );
}
