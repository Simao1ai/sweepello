import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Star, Clock } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-3">
          <span
            className="text-5xl font-bold sweepello-gradient"
            style={{ fontFamily: "'Pacifico', cursive" }}
          >
            Sweepello
          </span>
          <p className="text-white/50 text-sm mt-3">Professional cleaning, on demand.</p>
        </div>

        <div className="space-y-3 pt-4">
          <a href="/api/login" className="block" data-testid="button-sign-in">
            <Button
              size="lg"
              className="w-full py-6 text-base font-semibold rounded-xl bg-white text-black hover:bg-white/90 gap-2"
            >
              Sign in to continue <ArrowRight className="h-5 w-5" />
            </Button>
          </a>
          <a href="/apply" className="block" data-testid="link-apply-login">
            <Button
              size="lg"
              variant="outline"
              className="w-full py-6 text-base font-semibold rounded-xl border-white/20 text-white bg-white/5 hover:bg-white/10 hover:text-white"
            >
              Apply to join as a cleaner
            </Button>
          </a>
        </div>

        <div className="flex items-center justify-center gap-6 pt-4">
          {[
            { icon: Shield, label: "Vetted pros" },
            { icon: Star, label: "4.9★ rated" },
            { icon: Clock, label: "On demand" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <Icon className="h-5 w-5 text-white/30" />
              <span className="text-xs text-white/30">{label}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-white/20 pt-2">
          By continuing, you agree to Sweepello's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
