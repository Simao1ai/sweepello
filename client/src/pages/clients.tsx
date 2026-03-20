import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  Star,
  Crown,
  ChevronRight,
  CalendarDays,
  Briefcase,
  StickyNote,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, ServiceRequest, Job } from "@shared/schema";

const propertyTypes = [
  { value: "airbnb", label: "Airbnb" },
  { value: "vrbo", label: "VRBO" },
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
];

const srStatusVariant: Record<string, string> = {
  confirmed: "default",
  completed: "default",
  in_progress: "secondary",
  matching: "secondary",
  broadcasting: "secondary",
  pending: "outline",
  cancelled: "destructive",
};

const jobStatusVariant: Record<string, string> = {
  completed: "default",
  in_progress: "secondary",
  assigned: "secondary",
  pending: "outline",
  cancelled: "destructive",
};

interface ClientDetailData {
  client: Client;
  serviceRequests: ServiceRequest[];
  jobs: Job[];
}

function ClientDetailSheet({
  clientId,
  open,
  onClose,
}: {
  clientId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [adminNote, setAdminNote] = useState("");
  const [editingNote, setEditingNote] = useState(false);

  const { data, isLoading } = useQuery<ClientDetailData>({
    queryKey: ["/api/admin/clients", clientId],
    enabled: !!clientId && open,
    staleTime: 0,
  });

  const updateClient = useMutation({
    mutationFn: async (updates: Partial<Client>) => {
      const res = await apiRequest("PATCH", `/api/admin/clients/${clientId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setEditingNote(false);
      toast({ title: "Client updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const client = data?.client;
  const serviceRequests = [...(data?.serviceRequests || [])].sort(
    (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
  );
  const jobs = [...(data?.jobs || [])].sort(
    (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading || !client ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-base font-bold text-blue-600 dark:text-blue-400">
                  {client.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <SheetTitle className="flex items-center gap-2">
                    {client.name}
                    {client.isVip && (
                      <Crown className="h-4 w-4 text-amber-500" />
                    )}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground capitalize">{client.propertyType}</p>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-6">
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</h3>
                {client.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{client.phone}</span>
                  </div>
                )}
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>{client.propertyAddress}</span>
                </div>
                {client.clientRating && (
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{Number(client.clientRating).toFixed(1)}</span>
                    <span className="text-muted-foreground">({client.clientRatingCount} reviews)</span>
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-card p-4 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin Controls</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Active</p>
                    <p className="text-xs text-muted-foreground">Can book services</p>
                  </div>
                  <Switch
                    checked={client.isActive}
                    onCheckedChange={(v) => updateClient.mutate({ isActive: v })}
                    data-testid="switch-client-active"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Crown className="h-3.5 w-3.5 text-amber-500" /> VIP
                    </p>
                    <p className="text-xs text-muted-foreground">Priority matching</p>
                  </div>
                  <Switch
                    checked={client.isVip || false}
                    onCheckedChange={(v) => updateClient.mutate({ isVip: v })}
                    data-testid="switch-client-vip"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <StickyNote className="h-3.5 w-3.5" /> Admin Note
                  </Label>
                  {editingNote ? (
                    <div className="space-y-2">
                      <Textarea
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="Internal notes..."
                        className="text-sm min-h-[80px]"
                        data-testid="input-admin-note"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateClient.mutate({ adminNote })}
                          disabled={updateClient.isPending}
                          data-testid="button-save-note"
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingNote(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-sm text-muted-foreground cursor-pointer hover:text-foreground rounded border border-dashed p-2 transition-colors"
                      onClick={() => {
                        setAdminNote(client.adminNote || "");
                        setEditingNote(true);
                      }}
                      data-testid="text-admin-note"
                    >
                      {client.adminNote || <span className="italic">Click to add note…</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> Service History ({serviceRequests.length})
                </h3>
                {serviceRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No service requests yet</p>
                ) : (
                  <div className="space-y-2">
                    {serviceRequests.map((sr) => (
                      <div key={sr.id} className="rounded-lg border bg-card p-3 space-y-1.5" data-testid={`card-sr-${sr.id}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{sr.propertyAddress}</span>
                          <Badge variant={srStatusVariant[sr.status] as any || "outline"} className="text-xs flex-shrink-0">
                            {sr.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="capitalize">{sr.serviceType} clean</span>
                          <span>·</span>
                          <span>
                            {new Date(sr.requestedDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          {sr.estimatedPrice && (
                            <>
                              <span>·</span>
                              <span className="font-medium text-foreground">${Number(sr.estimatedPrice).toFixed(0)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> Jobs ({jobs.length})
                </h3>
                {jobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No jobs yet</p>
                ) : (
                  <div className="space-y-2">
                    {jobs.map((job) => (
                      <div key={job.id} className="rounded-lg border bg-card p-3 space-y-1.5" data-testid={`card-job-${job.id}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{job.propertyAddress}</span>
                          <Badge variant={jobStatusVariant[job.status] as any || "outline"} className="text-xs flex-shrink-0">
                            {job.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {new Date(job.scheduledDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          {job.price && (
                            <>
                              <span>·</span>
                              <span className="font-medium text-foreground">${Number(job.price).toFixed(0)}</span>
                            </>
                          )}
                          {job.profit && (
                            <>
                              <span>·</span>
                              <span className="text-green-600 dark:text-green-400">+${Number(job.profit).toFixed(0)} margin</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function Clients() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const createClient = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setDialogOpen(false);
      toast({ title: "Client added", description: "New client has been added." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filteredClients = clients?.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createClient.mutate({
      name: formData.get("name") as string,
      email: formData.get("email") as string || null,
      phone: formData.get("phone") as string || null,
      propertyAddress: formData.get("propertyAddress") as string,
      propertyType: formData.get("propertyType") as string,
      notes: formData.get("notes") as string || null,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Clients</h1>
          <p className="text-muted-foreground">Manage property owners and their locations</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-client">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input name="name" required placeholder="John Smith" data-testid="input-client-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input name="email" type="email" placeholder="john@email.com" data-testid="input-client-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input name="phone" placeholder="(555) 123-4567" data-testid="input-client-phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyAddress">Property Address</Label>
                <Input name="propertyAddress" required placeholder="123 Ocean Ave, Seaside Heights, NJ" data-testid="input-property-address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyType">Property Type</Label>
                <Select name="propertyType" defaultValue="airbnb">
                  <SelectTrigger data-testid="select-property-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea name="notes" placeholder="Any special instructions..." data-testid="input-client-notes" />
              </div>
              <Button type="submit" className="w-full" disabled={createClient.isPending} data-testid="button-submit-client">
                {createClient.isPending ? "Adding..." : "Add Client"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients or addresses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-clients"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : filteredClients?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow
                      key={client.id}
                      data-testid={`row-client-${client.id}`}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedClientId(client.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          {client.isVip && <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                          {client.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="max-w-[180px] truncate">{client.propertyAddress}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{client.propertyType}</Badge>
                      </TableCell>
                      <TableCell>
                        {client.clientRating ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{Number(client.clientRating).toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">({client.clientRatingCount})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">–</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {client.email && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />{client.email}
                            </span>
                          )}
                          {client.phone && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />{client.phone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.isActive ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <XCircle className="h-3.5 w-3.5" /> Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No clients found</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first property owner</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ClientDetailSheet
        clientId={selectedClientId}
        open={!!selectedClientId}
        onClose={() => setSelectedClientId(null)}
      />
    </div>
  );
}
