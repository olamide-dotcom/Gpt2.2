import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { strategies, type StrategyId } from "@/content/site";

interface StrategiesProps {
  onSelectStrategy: (strategyId: StrategyId) => void;
}

const Strategies = ({ onSelectStrategy }: StrategiesProps) => (
  <section id="strategies" className="scroll-mt-24 bg-card/50 py-24 px-4">
    <div className="container mx-auto text-center">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Strategy Overview</h2>
      <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
        Choose the signal rhythm that fits you before moving into onboarding and deposit approval.
      </p>

      <div className="mt-16 grid max-w-5xl gap-8 md:grid-cols-3 mx-auto">
        {strategies.map((strategy, index) => (
          <motion.div
            key={strategy.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.15 }}
            className={`rounded-xl border p-8 text-left ${
              strategy.featured ? "border-gold bg-secondary" : "border-border bg-card"
            }`}
          >
            <strategy.icon className="text-gold" size={28} />
            <h3 className="mt-4 font-display text-xl font-bold text-foreground">{strategy.title}</h3>
            <div className="mt-2 text-sm font-semibold text-gold">{strategy.profile}</div>
            <p className="mt-3 text-sm text-muted-foreground">{strategy.desc}</p>
            <p className="mt-4 text-sm text-foreground">
              <span className="font-medium">Review cadence:</span> {strategy.reviewCadence}
            </p>
            <ul className="mt-5 space-y-2">
              {strategy.items.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onSelectStrategy(strategy.id)}
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gold hover:underline"
            >
              Choose this track <ArrowRight size={15} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Strategies;
