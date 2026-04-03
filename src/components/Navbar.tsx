import { useState } from "react";
import { ArrowRight, Menu, Wallet, X } from "lucide-react";

import { navLinks } from "@/content/site";

interface NavbarProps {
  onOpenDeposit: () => void;
  onOpenOnboarding: () => void;
}

const Navbar = ({ onOpenDeposit, onOpenOnboarding }: NavbarProps) => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <a href="#home" className="text-xl font-bold">
          <span className="text-gold">gpt.2</span>
          <span className="text-foreground"> TradeBot</span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={onOpenDeposit}
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Wallet size={14} /> Deposit
          </button>
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowRight size={14} /> Get Started
          </button>
        </div>

        <button
          type="button"
          className="text-foreground md:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="space-y-3 border-b border-border bg-background px-4 pb-4 md:hidden">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenDeposit();
            }}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Wallet size={14} /> Deposit
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenOnboarding();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-foreground"
          >
            <ArrowRight size={14} /> Get Started
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
