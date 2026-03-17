import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, Users, Building2, CheckCircle } from "lucide-react";

const TARGETS = [
  { value: "contractor", label: "All Contractors", icon: Users, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", desc: "Send to all active contractors in the system" },
  { value: "client", label: "All Clients", icon: Building2, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", desc: "Send to all registered clients" },
];

const TEMPLATES = [
  { label: "Holiday Reminder", title: "Holiday Availability Update", message: "As the holiday season approaches, please update your availability schedule to reflect any days you'll be unavailable. This helps us ensure smooth scheduling for our clients." },
  { label: "Expansion Announcement", title: "We're Expanding!", message: "Exciting news! Sweepello is expanding to new areas in the NJ Shore market. Stay tuned for more job opportunities coming your way." },
  { label: "Policy Update", title: "Important Policy Update", message: "We've updated our service policies. Please log in to your portal to review the latest changes. Questions? Reply to any notification or contact us directly." },
  { label: "Quality Reminder", title: "Quality Service Reminder", message: "Thank you for your continued professionalism. As a reminder, our clients expect top-quality service. Please ensure you're following all cleaning checklists and communicating any issues promptly." },
];

export default function Broadcast() {
  const { toast } = useToast();
  const [targetRole, setTargetRole] = useState("contractor");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [lastResult, setLastResult] = useState<{ sent: number } | null>(null);

  const broadcastMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/notifications/broadcast", { title, message, targetRole }),
    onSuccess: async (res) => {
      const data = await res.json();
      setLastResult(data);
      toast({ title: "Broadcast sent!", description: `Sent to ${data.sent} user${data.sent !== 1 ? "s" : ""}` });
      setTitle("");
      setMessage("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    setTitle(template.title);
    setMessage(template.message);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Broadcast Notifications</h1>
        <p className="text-muted-foreground">Send announcements to all contractors or all clients at once</p>
      </div>

      {lastResult && (
        <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" data-testid="card-broadcast-success">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                Last broadcast sent to <strong>{lastResult.sent}</strong> user{lastResult.sent !== 1 ? "s" : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Compose Broadcast</CardTitle>
              <CardDescription>This message will appear as an in-app notification for all selected users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Send To</Label>
                <div className="flex gap-3">
                  {TARGETS.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTargetRole(t.value)}
                      data-testid={`button-target-${t.value}`}
                      className={`flex-1 rounded-lg border-2 p-3 text-left transition-all ${targetRole === t.value ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" : "border-border hover:border-indigo-200"}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <t.icon className="h-4 w-4 text-indigo-600" />
                        <span className="font-medium text-sm">{t.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="title">Notification Title</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Holiday Schedule Reminder" data-testid="input-broadcast-title" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your announcement..." rows={5} data-testid="textarea-broadcast-message" />
                <p className="text-xs text-muted-foreground">{message.length} characters</p>
              </div>

              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={!title || !message || broadcastMutation.isPending}
                onClick={() => broadcastMutation.mutate()}
                data-testid="button-send-broadcast"
              >
                <Send className="h-4 w-4 mr-2" />
                {broadcastMutation.isPending ? "Sending..." : `Send to All ${targetRole === "contractor" ? "Contractors" : "Clients"}`}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Templates</CardTitle>
              <CardDescription className="text-xs">Click to fill in the message form</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {TEMPLATES.map(t => (
                <Button key={t.label} variant="outline" size="sm" className="w-full justify-start text-left" onClick={() => applyTemplate(t)} data-testid={`button-template-${t.label.toLowerCase().replace(/\s/g, "-")}`}>
                  {t.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-4 pb-4 text-sm text-amber-800 dark:text-amber-200 space-y-1">
              <p className="font-semibold">Heads up</p>
              <p>This sends a notification to <strong>every</strong> user with the selected role. Use sparingly for important announcements.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
