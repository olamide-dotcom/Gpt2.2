import { Link } from "react-router-dom";

const SiteFooter = () => (
  <footer className="border-t border-border py-8 px-4">
    <div className="container mx-auto flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
      <span>
        Copyright {new Date().getFullYear()} <span className="text-gold">mytrust</span>capital. Crypto trading and
        insider-bot workflow demo.
      </span>
      <div className="flex flex-wrap gap-6">
        <Link to="/" className="transition-colors hover:text-foreground">
          Landing
        </Link>
        <Link to="/onboarding" className="transition-colors hover:text-foreground">
          Onboarding
        </Link>
        <Link to="/deposit" className="transition-colors hover:text-foreground">
          Deposit
        </Link>
        <Link to="/dashboard" className="transition-colors hover:text-foreground">
          Dashboard
        </Link>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
