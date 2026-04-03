import { Link } from "react-router-dom";

import SiteFooter from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type JourneyStage = "landing" | "onboarding" | "deposit" | "dashboard";

interface JourneyShellProps {
  title: string;
  description: string;
  stage: JourneyStage;
  children: React.ReactNode;
}

const stages: Array<{ id: JourneyStage; label: string; href: string }> = [
  { id: "landing", label: "Landing", href: "/" },
  { id: "onboarding", label: "Onboarding", href: "/onboarding" },
  { id: "deposit", label: "Deposit", href: "/deposit" },
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
];

const stageOrder: Record<JourneyStage, number> = {
  landing: 0,
  onboarding: 1,
  deposit: 2,
  dashboard: 3,
};

const JourneyShell = ({ title, description, stage, children }: JourneyShellProps) => (
  <div className="min-h-screen bg-background px-4 py-8 text-foreground">
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
      <header className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="text-xl font-bold">
            <span className="text-gold">mytrust</span>
            <span className="text-foreground">capital</span>
          </Link>
          <Badge variant="secondary" className="border border-gold/30 bg-secondary text-gold">
            Crypto Trading + Insider Bot Flow
          </Badge>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {stages.map((item) => {
            const current = item.id === stage;
            const completed = stageOrder[item.id] < stageOrder[stage];

            return (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  "inline-flex items-center rounded-full border px-4 py-2 text-sm transition-colors",
                  current
                    ? "border-gold bg-gold text-primary-foreground"
                    : completed
                      ? "border-gold/40 bg-secondary text-foreground"
                      : "border-border bg-background/70 text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-8 max-w-3xl">
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">{description}</p>
        </div>
      </header>

      <main className="mt-8 flex-1">{children}</main>
      <div className="mt-10">
        <SiteFooter />
      </div>
    </div>
  </div>
);

export default JourneyShell;
