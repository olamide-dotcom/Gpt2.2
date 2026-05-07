import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface CTASectionProps {
  onOpenOnboarding: () => void;
}

const CTASection = ({ onOpenOnboarding }: CTASectionProps) => (
  <section id="cta" className="scroll-mt-24 bg-card/50 py-24 px-4">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="container mx-auto max-w-2xl text-center"
    >
      <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Ready to open your trade room?</h2>
      <p className="text-muted-foreground mt-4">
        Start your setup now. Once your account is approved, your funding page opens, your $5 starter balance is
        ready to start the AI bot, and every approved deposit gets an extra 10%.
      </p>
      <button
        type="button"
        onClick={onOpenOnboarding}
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-10 py-4 text-lg font-semibold text-primary-foreground transition hover:brightness-110"
      >
        <ArrowRight size={20} /> Get Started
      </button>
    </motion.div>
  </section>
);

export default CTASection;
