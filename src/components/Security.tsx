import { motion } from "framer-motion";

import { securityItems } from "@/content/site";

interface SecurityProps {
  onOpenSecuritySummary: () => void;
}

const Security = ({ onOpenSecuritySummary }: SecurityProps) => (
  <section id="security" className="scroll-mt-24 bg-card/50 py-24 px-4">
    <div className="container mx-auto text-center">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Enterprise-Grade Security</h2>
      <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
        Security controls now point to a working summary instead of a blank placeholder
      </p>

      <div className="mt-16 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4 mx-auto">
        {securityItems.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="rounded-xl border border-border bg-card p-6 text-center"
          >
            <item.icon className="mx-auto text-gold" size={32} />
            <h3 className="mt-4 font-semibold text-foreground">{item.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpenSecuritySummary}
        className="mt-10 inline-flex items-center justify-center gap-2 rounded-lg border border-border px-8 py-4 font-semibold text-foreground transition hover:bg-secondary"
      >
        Review Security Summary
      </button>
    </div>
  </section>
);

export default Security;
