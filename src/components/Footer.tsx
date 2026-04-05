interface FooterProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onOpenSupport: () => void;
}

const Footer = ({ onOpenPrivacy, onOpenTerms, onOpenSupport }: FooterProps) => (
  <footer className="border-t border-border py-8 px-4">
    <div className="container mx-auto flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
      <span>
        Copyright {new Date().getFullYear()} <span className="text-gold">gpt.2</span> TradeBot. All rights reserved.
      </span>
      <div className="flex gap-6">
        <button type="button" onClick={onOpenPrivacy} className="transition-colors hover:text-foreground">
          Privacy Policy
        </button>
        <button type="button" onClick={onOpenTerms} className="transition-colors hover:text-foreground">
          Terms of Service
        </button>
        <button type="button" onClick={onOpenSupport} className="transition-colors hover:text-foreground">
          Contact
        </button>
      </div>
    </div>
  </footer>
);

export default Footer;
