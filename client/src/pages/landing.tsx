import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  MapPin,
  Calendar,
  Star,
  Shield,
  Clock,
  ArrowRight,
} from "lucide-react";
import heroImage from "../assets/images/hero-clean.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">CleanSlate</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
          </div>
          <a href="/api/login" data-testid="button-login-nav">
            <Button>Get Started</Button>
          </a>
        </div>
      </nav>

      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                Serving the NJ Shore
              </div>
              <h1 className="text-4xl font-serif font-bold tracking-tight md:text-5xl lg:text-6xl">
                Sparkling Clean{" "}
                <span className="text-primary">Vacation Rentals</span>,
                Every Time
              </h1>
              <p className="text-lg text-muted-foreground max-w-md">
                Professional Airbnb turnover cleaning for the NJ Shore market. 
                Book trusted cleaners, track your service, and rate your experience — all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="/api/login" data-testid="button-get-started">
                  <Button size="lg" className="gap-2 w-full sm:w-auto">
                    Book a Cleaning <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Vetted Cleaners</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-primary" />
                  <span>4.9 Avg Rating</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src={heroImage}
                alt="Clean vacation rental"
                className="rounded-xl ring-1 ring-black/5 shadow-2xl transition-transform duration-500 hover:scale-[1.02]"
                data-testid="img-hero"
              />
              <div className="absolute -bottom-4 -left-4 rounded-lg border bg-background p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-sm font-medium">500+ 5-star reviews</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 md:py-24 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold">Why Choose CleanSlate?</h2>
            <p className="mt-3 text-muted-foreground">Professional cleaning made simple</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-background/50 hover:bg-background transition-colors border-0 shadow-sm">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Location Matched</h3>
                <p className="text-sm text-muted-foreground">
                  We connect you with cleaners in your area for fast, reliable service right when you need it.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background/50 hover:bg-background transition-colors border-0 shadow-sm">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Easy Scheduling</h3>
                <p className="text-sm text-muted-foreground">
                  Pick your date and time, and we'll find the perfect cleaner available for your property.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background/50 hover:bg-background transition-colors border-0 shadow-sm">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Rate & Review</h3>
                <p className="text-sm text-muted-foreground">
                  After each cleaning, rate your experience and help us maintain top-quality service.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold">How It Works</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: "1", title: "Create Your Account", desc: "Sign up in seconds with your Google, GitHub, or email." },
              { step: "2", title: "Request a Cleaning", desc: "Enter your property details, pick a date, and submit your request." },
              { step: "3", title: "Sit Back & Rate", desc: "We match you with a local cleaner. After the job, leave a review." },
            ].map(item => (
              <div key={item.step} className="text-center space-y-3">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <a href="/api/login" data-testid="button-get-started-bottom">
              <Button size="lg" className="gap-2">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <p className="mt-3 text-xs text-muted-foreground">No credit card required</p>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">CleanSlate</span>
          </div>
          <p className="text-xs text-muted-foreground">&copy; 2026 CleanSlate. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
