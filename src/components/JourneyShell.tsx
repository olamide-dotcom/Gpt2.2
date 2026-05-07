import { Bot, ClipboardCheck, LayoutDashboard, Settings2, Wallet, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";

import SiteFooter from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppAuth } from "@/hooks/use-app-auth";
import { cn } from "@/lib/utils";

type JourneyStage = "landing" | "onboarding" | "deposit" | "dashboard" | "withdraw" | "admin";

interface JourneyShellProps {
  title: string;
  description: string;
  stage: JourneyStage;
  children: React.ReactNode;
}

type WorkspaceLink = {
  id: Exclude<JourneyStage, "landing">;
  label: string;
  caption: string;
  href: string;
  icon: typeof Bot;
};

const appLinks: WorkspaceLink[] = [
  {
    id: "onboarding",
    label: "Setup",
    caption: "Complete your account and unlock the rest of the app.",
    href: "/onboarding",
    icon: ClipboardCheck,
  },
  {
    id: "deposit",
    label: "Funding",
    caption: "Copy the right address and send your first deposit.",
    href: "/deposit",
    icon: Wallet,
  },
  {
    id: "dashboard",
    label: "AI Trade Room",
    caption: "Watch your AI bot, chart, balances, and session history.",
    href: "/dashboard",
    icon: Bot,
  },
  {
    id: "withdraw",
    label: "Withdraw",
    caption: "See what is available to cash out and what is still locked.",
    href: "/withdraw",
    icon: WalletCards,
  },
];

const adminLink: WorkspaceLink = {
  id: "admin",
  label: "Control Panel",
  caption: "Admin queue, users, and account actions.",
  href: "/controlpanel",
  icon: Settings2,
};

const stageBadgeLabel: Record<JourneyStage, string> = {
  landing: "Workspace",
  onboarding: "Account setup",
  deposit: "Funding",
  dashboard: "AI trade room",
  withdraw: "Withdraw",
  admin: "Admin",
};

const stageTips: Record<JourneyStage, string> = {
  landing: "Start with setup, move into funding when you are ready, and keep your trading activity in one clear space.",
  onboarding: "Finish setup once and your funding page, your $5 starter balance, and your 10% deposit bonus will be ready to use.",
  deposit: "Funding stays simple here: copy the right address, send your deposit, and receive an extra 10% on every approved deposit.",
  dashboard: "This is your AI trade room for chart movement, automatic exits, and session updates.",
  withdraw: "Use this area to see what is back in your wallet, what is ready for cash-out, and what still needs a confirmed deposit first.",
  admin: "Admin tools stay grouped here so they do not clutter the customer-facing workspace.",
};

const JourneyShell = ({ title, description, stage, children }: JourneyShellProps) => {
  const { isAuthenticated, signOut, username } = useAppAuth();
  const workspaceLinks = stage === "admin" ? [...appLinks, adminLink] : appLinks;

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
        <header className="rounded-[2rem] border border-border bg-card/85 p-5 shadow-sm backdrop-blur md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Link to="/" className="inline-flex items-center text-xl font-bold">
                <span className="text-gold">gpt.2</span>
                <span className="text-foreground"> TradeBot</span>
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-gold text-primary-foreground">Your account space</Badge>
                <Badge variant="secondary">{stageBadgeLabel[stage]}</Badge>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">{stageTips[stage]}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isAuthenticated ? <Badge variant="outline">@{username ?? "account"}</Badge> : null}
              {isAuthenticated ? (
                <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>
                  Sign out
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="mt-6 grid flex-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-[1.75rem] border border-border bg-card/80 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <LayoutDashboard size={18} className="text-gold" />
                <div className="font-semibold text-foreground">Move through your account</div>
              </div>
              <div className="mt-4 space-y-2">
                {workspaceLinks.map((item) => {
                  const Icon = item.icon;
                  const active = item.id === stage;

                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      className={cn(
                        "block rounded-2xl border px-4 py-3 transition-colors",
                        active
                          ? "border-gold bg-secondary text-foreground"
                          : "border-border bg-background/60 text-foreground hover:border-gold/40 hover:bg-secondary/60",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 rounded-full border p-2",
                            active ? "border-gold bg-gold/15 text-gold" : "border-border text-muted-foreground",
                          )}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium">{item.label}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{item.caption}</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border bg-card/80 p-4 shadow-sm">
              <div className="text-sm font-semibold text-foreground">Keep it simple</div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>Start with setup, use funding when you are ready to deposit, and keep day-to-day activity inside the AI trade room.</p>
                <p>Every approved deposit adds 10% extra to your main wallet after review.</p>
                <p>Your $5 starter balance is there to help you start the AI bot first, but cash-out stays locked until your first confirmed deposit.</p>
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            <section className="rounded-[2rem] border border-border bg-card/80 p-6 shadow-sm">
              <Badge variant="outline" className="mb-4">
                {stageBadgeLabel[stage]}
              </Badge>
              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
              <p className="mt-3 max-w-3xl text-base text-muted-foreground md:text-lg">{description}</p>
            </section>

            <main>{children}</main>
          </div>
        </div>

        <div className="mt-10">
          <SiteFooter />
        </div>
      </div>
    </div>
  );
};

export default JourneyShell;
