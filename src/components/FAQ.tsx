import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqs } from "@/content/site";

const FAQ = () => (
  <section id="faq" className="scroll-mt-24 py-24 px-4">
    <div className="container mx-auto max-w-2xl text-center">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Frequently Asked Questions</h2>
      <p className="text-muted-foreground mt-3">Common questions answered with clearer, less misleading language</p>

      <Accordion type="single" collapsible className="mt-12 text-left">
        {faqs.map((faq, index) => (
          <AccordionItem key={faq.q} value={`item-${index}`} className="border-border">
            <AccordionTrigger className="text-foreground hover:text-gold">{faq.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default FAQ;
