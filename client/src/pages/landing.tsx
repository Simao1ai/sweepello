import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  MapPin,
  Calendar,
  Star,
  Shield,
  ArrowRight,
  Home,
  Building2,
  Hotel,
  CheckCircle,
  Users,
  HardHat,
  LayoutDashboard,
  LogIn,
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
            <a href="#services" className="hover:text-foreground transition-colors">Services</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#portals" className="hover:text-foreground transition-colors">Login</a>
          </div>
          <a href="/api/login" data-testid="button-login-nav">
            <Button className="gap-2"><LogIn className="h-4 w-4" /> Sign In</Button>
          </a>
        </div>
      </nav>

      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                Serving All of New Jersey
              </div>
              <h1 className="text-4xl font-serif font-bold tracking-tight md:text-5xl lg:text-6xl">
                Professional{" "}
                <span className="text-primary">Cleaning Services</span>{" "}
                You Can Trust
              </h1>
              <p className="text-lg text-muted-foreground max-w-md">
                Residential, commercial, and vacation rental cleaning across New Jersey. 
                Book vetted professionals, get instant quotes, and enjoy spotless spaces — every time.
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
                  <span>Insured & Vetted</span>
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
                alt="Professional cleaning service"
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

      <section id="services" className="py-16 md:py-24 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold">Our Services</h2>
            <p className="mt-3 text-muted-foreground">Cleaning solutions for every property type</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-background hover:shadow-md transition-shadow border relative overflow-hidden" data-testid="card-service-residential">
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
              <CardContent className="pt-8 space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Home className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-xl">Residential</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Keep your home spotless with regular maintenance, deep cleans, or move-out services. Perfect for homeowners and renters across NJ.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /> Standard & deep cleaning</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /> Move-out / move-in prep</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /> Basements & large homes</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-background hover:shadow-md transition-shadow border relative overflow-hidden" data-testid="card-service-commercial">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
              <CardContent className="pt-8 space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10">
                  <Building2 className="h-7 w-7 text-blue-500" />
                </div>
                <h3 className="font-semibold text-xl">Commercial</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Professional cleaning for offices, retail spaces, and commercial properties. Reliable teams that work around your business schedule.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" /> Office & retail cleaning</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" /> After-hours availability</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" /> Recurring schedules</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-background hover:shadow-md transition-shadow border relative overflow-hidden" data-testid="card-service-rental">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <CardContent className="pt-8 space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10">
                  <Hotel className="h-7 w-7 text-amber-500" />
                </div>
                <h3 className="font-semibold text-xl">Vacation Rentals</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Fast turnovers for Airbnb, VRBO, and short-term rentals. Guest-ready properties between every booking at the Jersey Shore and beyond.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-amber-500 flex-shrink-0" /> Quick turnovers</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-amber-500 flex-shrink-0" /> Linen & restocking</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-amber-500 flex-shrink-0" /> Photo-ready finish</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold">Why Choose CleanSlate?</h2>
            <p className="mt-3 text-muted-foreground">Built for reliability, transparency, and quality</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-muted/30 hover:bg-muted/50 transition-colors border-0 shadow-sm">
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
            <Card className="bg-muted/30 hover:bg-muted/50 transition-colors border-0 shadow-sm">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Instant Quotes</h3>
                <p className="text-sm text-muted-foreground">
                  Get a transparent price estimate based on your property size and service type — no surprises.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30 hover:bg-muted/50 transition-colors border-0 shadow-sm">
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

      <section id="how-it-works" className="py-16 md:py-24 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold">How It Works</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: "1", title: "Create Your Account", desc: "Sign up in seconds with your Google, GitHub, or email." },
              { step: "2", title: "Request a Cleaning", desc: "Tell us your property details, choose a service type, and pick a date." },
              { step: "3", title: "Sit Back & Rate", desc: "We match you with a top-rated local cleaner. After the job, leave a review." },
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

      <section id="portals" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold">Log In to Your Portal</h2>
            <p className="mt-3 text-muted-foreground">One account, three experiences — sign in and you'll be directed to your dashboard</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <a href="/api/login" data-testid="portal-client">
              <Card className="bg-background hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer border-2 h-full">
                <CardContent className="pt-8 pb-6 text-center space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl">Client Portal</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Request cleaning services, track your bookings, view quotes, and rate your cleaners.
                  </p>
                  <Button variant="outline" className="gap-2 w-full">
                    <LogIn className="h-4 w-4" /> Sign In as Client
                  </Button>
                </CardContent>
              </Card>
            </a>
            <div className="flex flex-col gap-3">
              <a href="/api/login" data-testid="portal-contractor">
                <Card className="bg-background hover:shadow-lg hover:border-emerald-500/40 transition-all cursor-pointer border-2 h-full">
                  <CardContent className="pt-8 pb-6 text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                      <HardHat className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-xl">Contractor Portal</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      View and accept job offers, manage your availability, update job progress, and get paid.
                    </p>
                    <Button variant="outline" className="gap-2 w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950">
                      <LogIn className="h-4 w-4" /> Sign In as Contractor
                    </Button>
                  </CardContent>
                </Card>
              </a>
              <a href="/apply" data-testid="link-apply-contractor">
                <Card className="bg-emerald-50 dark:bg-emerald-950/40 hover:shadow-md transition-all cursor-pointer border border-emerald-200 dark:border-emerald-800">
                  <CardContent className="py-4 text-center">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">New to CleanSlate?</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Apply to join our contractor network →</p>
                  </CardContent>
                </Card>
              </a>
            </div>
            <a href="/api/login" data-testid="portal-admin">
              <Card className="bg-background hover:shadow-lg hover:border-blue-500/40 transition-all cursor-pointer border-2 h-full">
                <CardContent className="pt-8 pb-6 text-center space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
                    <LayoutDashboard className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-xl">Admin Portal</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Manage dispatch, track jobs and payments, view analytics, and oversee cleaner performance.
                  </p>
                  <Button variant="outline" className="gap-2 w-full border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950">
                    <LogIn className="h-4 w-4" /> Sign In as Admin
                  </Button>
                </CardContent>
              </Card>
            </a>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            All portals use the same sign-in. Your role determines which dashboard you see.
          </p>
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
