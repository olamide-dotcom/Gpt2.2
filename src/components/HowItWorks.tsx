import { motion } from "framer-motion";

import { steps } from "@/content/site";

const HowItWorks = () => (
  <section id="how-it-works" className="scroll-mt-24 py-24 px-4">
    <div className="container mx-auto text-center">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">How It Works</h2>
      <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
        Landing leads into onboarding, and onboarding leads into deposits without breaking the user journey.
      </p>

      <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="relative rounded-xl border border-border bg-card p-8 text-center"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gold text-lg font-bold text-primary-foreground">
              {step.num}
            </div>
            <step.icon className="mx-auto mt-4 text-gold" size={28} />
            <h3 className="mt-4 text-lg font-semibold text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
