import { motion } from "framer-motion";

import { whyChooseUsItems } from "@/content/site";

const WhyChooseUs = () => (
  <section id="why-choose-us" className="scroll-mt-24 py-24 px-4">
    <div className="container mx-auto">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Why People Start Here</h2>
        <p className="mt-3 text-muted-foreground">
          The whole app is built to feel clear, guided, and easy to move through from setup to funding to bot activity.
        </p>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {whyChooseUsItems.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: index * 0.1 }}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <item.icon className="text-gold" size={26} />
            <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
            <p className="mt-3 text-sm text-muted-foreground">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WhyChooseUs;
