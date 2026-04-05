import { motion } from "framer-motion";

import { fundingItems } from "@/content/site";

interface CryptoFundingProps {
  onOpenFundingChecklist: () => void;
}

const CryptoFunding = ({ onOpenFundingChecklist }: CryptoFundingProps) => (
  <section id="funding" className="scroll-mt-24 py-24 px-4">
    <div className="container mx-auto text-center">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Global Crypto Funding</h2>
      <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
        Funding routes now open a real checklist before any live transfer flow is implied
      </p>

      <div className="mt-16 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4 mx-auto">
        {fundingItems.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
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
        onClick={onOpenFundingChecklist}
        className="mt-10 inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-8 py-4 font-semibold text-primary-foreground transition hover:brightness-110"
      >
        Review Funding Checklist
      </button>
    </div>
  </section>
);

export default CryptoFunding;
