import { motion } from "framer-motion";
import { ArrowRight, Bot } from "lucide-react";

import { heroStats } from "@/content/site";

interface HeroSectionProps {
  onOpenOnboarding: () => void;
}

const HeroSection = ({ onOpenOnboarding }: HeroSectionProps) => (
  <section
    id="home"
    className="scroll-mt-24 relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16 text-center"
  >
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
        backgroundSize: "40px 40px",
      }}
    />

    <motion.h1
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="font-display max-w-4xl text-4xl font-bold leading-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
    >
      AICrypto trading access with insider-bot signals.
    </motion.h1>

    <motion.p
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg"
    >
      See how the platform works, complete the onboarding flow at your own pace, and unlock a clean deposit workspace
      once verification and setup are done. The experience stays simple, fast, and focused on early opportunities.
    </motion.p>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4 }}
      className="mt-10 flex flex-col gap-4 sm:flex-row"
    >
      <button
        type="button"
        onClick={onOpenOnboarding}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-8 py-4 text-base font-semibold text-primary-foreground transition hover:brightness-110"
      >
        <ArrowRight size={18} /> Get Started
      </button>
      <a
        href="#strategies"
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-8 py-4 text-base font-semibold text-foreground transition hover:bg-secondary"
      >
        <Bot size={18} /> View Strategy Overview
      </a>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.6 }}
      className="mt-20 grid w-full max-w-4xl grid-cols-2 gap-4 md:grid-cols-4"
    >
      {heroStats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-border bg-card p-6 text-center">
          <div className="text-3xl font-bold text-gold">{stat.value}</div>
          <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </motion.div>
  </section>
);

export default HeroSection;
