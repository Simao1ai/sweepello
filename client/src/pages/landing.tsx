import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Star,
  Shield,
  Clock,
  CheckCircle,
  Sparkles,
  MapPin,
  LogIn,
  ChevronRight,
} from "lucide-react";
import heroImage from "../assets/images/hero-clean.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span
            className="text-2xl font-bold sweepello-gradient"
            style={{ fontFamily: "'Pacifico', cursive" }}
          >
            Sweepello
          </span>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#for-cleaners" className="hover:text-white transition-colors">For cleaners</a>
            <a href="#safety" className="hover:text-white transition-colors">Safety</a>
          </div>
          <a href="/login" data-testid="button-login-nav">
            <Button variant="outline" className="gap-2 border-white/20 text-white bg-white/5 hover:bg-white/10 hover:text-white">
              <LogIn className="h-4 w-4" /> Sign in
            </Button>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-black min-h-[92vh] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-32 w-full">
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs text-white/70 backdrop-blur-sm">
              <Sparkles className="h-3 w-3" />
              On-demand cleaning, nationwide
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.05]">
              Spotless.{" "}
              <span className="sweepello-gradient bg-clip-text text-transparent">On demand.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 max-w-lg leading-relaxed">
              Book a vetted professional cleaner in minutes. Residential, commercial, and Airbnb turnovers — wherever you are.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <a href="/login" data-testid="button-get-started">
                <Button size="lg" className="gap-2 text-base px-8 py-6 rounded-xl font-semibold bg-white text-black hover:bg-white/90">
                  Book a cleaning <ArrowRight className="h-5 w-5" />
                </Button>
              </a>
              <a href="#for-cleaners">
                <Button size="lg" variant="outline" className="gap-2 text-base px-8 py-6 rounded-xl font-semibold border-white/20 text-white bg-white/5 hover:bg-white/10 hover:text-white">
                  Earn by cleaning <ChevronRight className="h-5 w-5" />
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Floating stat card */}
        <div className="absolute bottom-8 right-6 md:right-12 z-10 hidden md:flex gap-4">
          <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 text-white text-center">
            <p className="text-3xl font-extrabold">4.9</p>
            <div className="flex justify-center gap-0.5 mt-1">
              {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
            </div>
            <p className="text-xs text-white/50 mt-1">Avg cleaner rating</p>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 text-white text-center">
            <p className="text-3xl font-extrabold">&lt;5 min</p>
            <p className="text-xs text-white/50 mt-3">Average booking time</p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-black border-b border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "500K+", label: "Cleanings completed" },
            { value: "10K+", label: "Verified cleaners" },
            { value: "50 states", label: "Nationwide coverage" },
            { value: "30%", label: "Avg savings vs traditional" },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl md:text-4xl font-extrabold text-white">{stat.value}</p>
              <p className="text-sm text-white/40 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — Client */}
      <section id="how-it-works" className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">For property owners</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Clean in 3 taps.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                step: "01",
                title: "Tell us about your space",
                desc: "Enter your property type, size, and the service you need — standard, deep clean, or Airbnb turnover.",
              },
              {
                step: "02",
                title: "We match you instantly",
                desc: "Our algorithm finds the best available cleaner near you, ranked by rating and on-time performance.",
              },
              {
                step: "03",
                title: "Track, then rate",
                desc: "Watch your cleaner on a live map. After the job, leave a star rating to keep quality high.",
              },
            ].map(item => (
              <div key={item.step} className="group space-y-4">
                <p className="text-6xl font-extrabold text-muted-foreground/20 group-hover:text-primary/30 transition-colors">{item.step}</p>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <a href="/login" data-testid="button-book-now">
              <Button size="lg" className="gap-2 px-8 py-6 rounded-xl text-base font-semibold">
                Book now <ArrowRight className="h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Service types */}
      <section className="py-20 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-12">What we clean.</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                label: "Residential",
                desc: "Homes, apartments, condos. Regular maintenance or one-off deep cleans.",
                items: ["Standard & deep cleaning", "Move-out / move-in prep", "Large homes & basements"],
                accent: "bg-primary/10 text-primary",
              },
              {
                label: "Commercial",
                desc: "Offices, retail, and commercial spaces. After-hours teams that work around you.",
                items: ["Office & retail spaces", "After-hours availability", "Recurring schedules"],
                accent: "bg-blue-500/10 text-blue-500",
              },
              {
                label: "Vacation Rentals",
                desc: "Airbnb, VRBO, short-term rentals. Guest-ready between every booking, coast to coast.",
                items: ["Fast turnovers", "Linen & restocking", "Photo-ready finish"],
                accent: "bg-amber-500/10 text-amber-500",
              },
            ].map(s => (
              <div
                key={s.label}
                className="rounded-2xl border bg-background p-8 space-y-5 hover:shadow-lg transition-shadow"
                data-testid={`card-service-${s.label.toLowerCase().replace(" ", "-")}`}
              >
                <h3 className="text-xl font-bold">{s.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                <ul className="space-y-2">
                  {s.items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`h-4 w-4 flex-shrink-0 ${s.accent.split(" ")[1]}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety / Trust */}
      <section id="safety" className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <p className="text-sm font-semibold text-primary uppercase tracking-widest">Safety first</p>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Every cleaner, vetted.</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                We don't let just anyone through the door. Every contractor on Sweepello completes a multi-step onboarding, background verification, and insurance check before their first job.
              </p>
              <ul className="space-y-4">
                {[
                  { icon: Shield, text: "Background & identity verified" },
                  { icon: CheckCircle, text: "Liability insurance confirmed" },
                  { icon: Star, text: "Rated after every job" },
                  { icon: Clock, text: "On-time performance tracked" },
                  { icon: MapPin, text: "Live GPS during active jobs" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm font-medium">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-muted/40 border p-10 space-y-6">
              <p className="text-5xl font-extrabold">4.9 ★</p>
              <p className="text-muted-foreground">Average cleaner rating across all completed jobs</p>
              <div className="h-px bg-border" />
              <div className="grid grid-cols-2 gap-6">
                {[
                  { val: "98%", label: "Jobs completed on time" },
                  { val: "< 2%", label: "Complaints rate" },
                  { val: "92%", label: "Repeat booking rate" },
                  { val: "24/7", label: "Support available" },
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-2xl font-extrabold">{s.val}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For cleaners */}
      <section id="for-cleaners" className="py-24 md:py-32 bg-black text-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <p className="text-sm font-semibold text-primary uppercase tracking-widest">For cleaning professionals</p>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Earn on your schedule.</h2>
              <p className="text-white/60 text-lg leading-relaxed">
                Join thousands of cleaning professionals who use Sweepello to fill their calendar, get paid fast via direct deposit, and grow their business — on their own terms.
              </p>
              <ul className="space-y-4">
                {[
                  "Set your own availability and zip codes",
                  "Accept or decline jobs — you're always in control",
                  "Get paid directly via Stripe after every job",
                  "Build a reputation with client reviews",
                ].map(text => (
                  <li key={text} className="flex items-center gap-3 text-sm text-white/70">
                    <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>
              <div className="flex gap-4">
                <a href="/apply" data-testid="button-apply-contractor">
                  <Button size="lg" className="gap-2 px-8 py-6 rounded-xl text-base font-semibold bg-white text-black hover:bg-white/90">
                    Apply to clean <ArrowRight className="h-5 w-5" />
                  </Button>
                </a>
                <a href="/login" data-testid="button-login-contractor">
                  <Button size="lg" variant="outline" className="gap-2 px-8 py-6 rounded-xl text-base font-semibold border-white/20 text-white bg-white/5 hover:bg-white/10 hover:text-white">
                    Sign in
                  </Button>
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: "10K+", label: "Active cleaners" },
                { val: "$28/hr", label: "Average earnings" },
                { val: "2-day", label: "Payout speed" },
                { val: "Free", label: "To join" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-1 hover:bg-white/10 transition-colors">
                  <p className="text-3xl font-extrabold text-white">{s.val}</p>
                  <p className="text-sm text-white/40">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-32 text-center">
        <div className="mx-auto max-w-3xl px-6 space-y-8">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Ready for a{" "}
            <span className="sweepello-gradient bg-clip-text text-transparent">cleaner space?</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Join thousands of homeowners and property managers who trust Sweepello nationwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/login" data-testid="button-get-started-bottom">
              <Button size="lg" className="gap-2 text-base px-10 py-6 rounded-xl font-semibold">
                Get started free <ArrowRight className="h-5 w-5" />
              </Button>
            </a>
            <a href="/apply" data-testid="button-apply-bottom">
              <Button size="lg" variant="outline" className="gap-2 text-base px-10 py-6 rounded-xl font-semibold">
                Join as a cleaner
              </Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span
            className="text-xl font-bold sweepello-gradient"
            style={{ fontFamily: "'Pacifico', cursive" }}
          >
            Sweepello
          </span>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#for-cleaners" className="hover:text-foreground transition-colors">For cleaners</a>
            <a href="#safety" className="hover:text-foreground transition-colors">Safety</a>
            <a href="/apply" className="hover:text-foreground transition-colors">Apply</a>
          </div>
          <p className="text-xs text-muted-foreground">&copy; 2026 Sweepello. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
