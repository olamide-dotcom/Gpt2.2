import { ArrowRight, FileText, LifeBuoy, LockKeyhole, ShieldCheck, WalletCards } from "lucide-react";

import DepositSection from "@/components/deposits/DepositSection";
import OnboardingWorkflow from "@/components/onboarding/OnboardingWorkflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { securityItems, strategies, type StrategyId } from "@/content/site";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";
import { cn } from "@/lib/utils";

export type ActionCenterTab = "get-started" | "strategies" | "funding" | "security" | "legal" | "support";
export type LegalView = "privacy" | "terms";

interface ActionCenterProps {
  activeTab: ActionCenterTab;
  onActiveTabChange: (tab: ActionCenterTab) => void;
  selectedStrategyId: StrategyId;
  onSelectedStrategyChange: (strategyId: StrategyId) => void;
  legalView: LegalView;
  onLegalViewChange: (view: LegalView) => void;
  onJumpToFaq: () => void;
}

const legalPanels: Record<LegalView, { title: string; intro: string; bullets: string[] }> = {
  privacy: {
    title: "Privacy at a glance",
    intro: "Collect only the information needed to verify identity, maintain security, and support the client relationship.",
    bullets: [
      "Use onboarding data only for account setup, compliance reviews, and support operations.",
      "Limit internal access to verified team roles and keep an audit trail for sensitive changes.",
      "Review retention periods regularly so personal data is not held longer than required.",
      "Explain how clients can request updates, exports, or deletion where regulations allow.",
    ],
  },
  terms: {
    title: "Terms at a glance",
    intro: "Set expectations before account access is granted so investors understand approvals, risks, and operating rules.",
    bullets: [
      "Platform access should follow identity checks, suitability review, and acceptance of current disclosures.",
      "Funding instructions, supported assets, and withdrawal requirements should be documented before use.",
      "Service terms should reserve the right to pause activity when security or compliance concerns appear.",
      "Any promotional statements should avoid guarantees and stay aligned with what the platform can actually support.",
    ],
  },
};

const securityChecklist = [
  "Enforce 2FA on sign-in, device changes, and high-risk approvals.",
  "Separate operational roles so one compromised account cannot complete every critical action.",
  "Maintain an incident process for unusual withdrawals, access changes, and wallet updates.",
];

const supportChecklist = [
  "Keep a clear handoff between onboarding, funding review, and client support.",
  "Route account-sensitive requests through the same verified channel used during approval.",
  "Link users back to disclosures and FAQs when they need policy or timing context.",
];

const tabs = [
  { value: "get-started", label: "Onboarding", icon: ArrowRight },
  { value: "strategies", label: "Strategies", icon: LockKeyhole },
  { value: "funding", label: "Deposit", icon: WalletCards },
  { value: "security", label: "Security", icon: ShieldCheck },
  { value: "legal", label: "Policies", icon: FileText },
  { value: "support", label: "Support", icon: LifeBuoy },
] as const;

const ActionCenter = ({
  activeTab,
  onActiveTabChange,
  selectedStrategyId,
  onSelectedStrategyChange,
  legalView,
  onLegalViewChange,
  onJumpToFaq,
}: ActionCenterProps) => {
  const { isSavingStrategyTrack, saveStrategyTrack, snapshot } = useAccountWorkflow();
  const selectedStrategy = strategies.find((strategy) => strategy.id === selectedStrategyId) ?? strategies[0];
  const legalPanel = legalPanels[legalView];
  const canApplyStrategy = snapshot?.completedStepIds.includes("complete-identity-checks") ?? false;
  const activeWorkflowStrategy = snapshot?.selectedStrategyId
    ? strategies.find((strategy) => strategy.id === snapshot.selectedStrategyId)
    : null;

  return (
    <section id="action-center" className="scroll-mt-24 bg-card/50 py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        <Badge variant="secondary" className="border border-gold/30 bg-secondary text-gold">
          Workflow Hub
        </Badge>
        <h2 className="mt-4 font-display text-3xl md:text-4xl font-bold text-foreground">
          Onboarding and deposit now run as one connected module
        </h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          The onboarding flow, strategy selection, and deposit funding workspace now share the same persistent account
          state, so users can continue later and only unlock deposits after approval.
        </p>

        <Tabs value={activeTab} onValueChange={(value) => onActiveTabChange(value as ActionCenterTab)} className="mt-12">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-secondary/70 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-xl px-4 py-2 data-[state=active]:bg-background"
                >
                  <Icon size={16} />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="get-started" className="mt-6">
            <OnboardingWorkflow
              onOpenFunding={() => onActiveTabChange("funding")}
              preferredStrategyId={selectedStrategyId}
            />
          </TabsContent>

          <TabsContent value="strategies" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-xl">Compare strategy tracks</CardTitle>
                  <CardDescription>
                    Select a strategy to review its fit, then push it directly into the onboarding flow once identity
                    checks are complete.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {strategies.map((strategy) => (
                    <button
                      key={strategy.id}
                      type="button"
                      onClick={() => onSelectedStrategyChange(strategy.id)}
                      className={cn(
                        "w-full rounded-xl border px-4 py-4 text-left transition-colors",
                        selectedStrategy.id === strategy.id
                          ? "border-gold bg-secondary text-foreground"
                          : "border-border bg-background/70 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <strategy.icon className="text-gold" size={20} />
                        <div>
                          <div className="font-semibold">{strategy.title}</div>
                          <div className="text-xs uppercase tracking-wide">{strategy.profile}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/80">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="text-xl">{selectedStrategy.title}</CardTitle>
                    {activeWorkflowStrategy?.id === selectedStrategy.id ? (
                      <Badge variant="secondary">Current onboarding track</Badge>
                    ) : null}
                  </div>
                  <CardDescription>{selectedStrategy.desc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-xl border border-border bg-background/70 p-5">
                    <div className="text-sm font-semibold text-gold">{selectedStrategy.profile}</div>
                    <p className="mt-2 text-sm text-muted-foreground">{selectedStrategy.fit}</p>
                  </div>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {selectedStrategy.items.map((item) => (
                      <li key={item} className="rounded-xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="rounded-xl border border-border bg-background/70 p-5">
                    <h3 className="font-semibold text-foreground">Review cadence</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedStrategy.reviewCadence}</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      disabled={!canApplyStrategy || isSavingStrategyTrack}
                      onClick={async () => {
                        await saveStrategyTrack(selectedStrategy.id);
                        onSelectedStrategyChange(selectedStrategy.id);
                        onActiveTabChange("get-started");
                      }}
                    >
                      {isSavingStrategyTrack ? "Saving…" : "Use this track in onboarding"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => onActiveTabChange("get-started")}>
                      Return to workflow
                    </Button>
                  </div>

                  {!canApplyStrategy ? (
                    <div className="rounded-xl border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground">
                      Complete the identity checks step first, then this button will save the chosen strategy into the
                      onboarding workflow.
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="funding" className="mt-6">
            <DepositSection
              onContinueOnboarding={() => onActiveTabChange("get-started")}
              onOpenDashboard={() => onActiveTabChange("support")}
            />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-xl">Security practices</CardTitle>
                  <CardDescription>
                    The deposit and onboarding module now references concrete control areas instead of placeholder copy.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {securityItems.map((item) => (
                    <div key={item.title} className="rounded-xl border border-border bg-background/70 p-5">
                      <item.icon className="text-gold" size={24} />
                      <h3 className="mt-4 font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-xl">Operational safeguards</CardTitle>
                  <CardDescription>These are the checks worth having in place before a live onboarding system goes public.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {securityChecklist.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button type="button" variant="outline" className="w-full" onClick={onJumpToFaq}>
                    Review FAQs
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="legal" className="mt-6">
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="text-xl">Policies and disclosures</CardTitle>
                <CardDescription>The footer policy links now open a working summary here.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-3">
                  {(["privacy", "terms"] as LegalView[]).map((view) => (
                    <Button
                      key={view}
                      type="button"
                      variant={legalView === view ? "secondary" : "outline"}
                      onClick={() => onLegalViewChange(view)}
                    >
                      {view === "privacy" ? "Privacy" : "Terms"}
                    </Button>
                  ))}
                </div>

                <div className="rounded-2xl border border-border bg-background/70 p-6">
                  <h3 className="text-lg font-semibold text-foreground">{legalPanel.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{legalPanel.intro}</p>
                  <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                    {legalPanel.bullets.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-xl">Support flow</CardTitle>
                  <CardDescription>The contact link now points to an onboarding-aware support guidance panel.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {supportChecklist.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="secondary" onClick={() => onActiveTabChange("get-started")}>
                      See onboarding steps
                    </Button>
                    <Button type="button" variant="outline" onClick={onJumpToFaq}>
                      Open FAQs
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-xl">Publishing checklist</CardTitle>
                  <CardDescription>Helpful guardrails for the next step when you connect a live backend later.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    Keep login, funding, and withdrawal actions disabled until they point to verified backend flows with
                    audit logging, approvals, and support coverage behind them.
                  </p>
                  <p>
                    This implementation keeps the UI honest by locking deposit access until the onboarding workflow
                    completes and by avoiding any private-key handling in the client.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onActiveTabChange("legal");
                      onLegalViewChange("terms");
                    }}
                  >
                    Review terms guidance
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default ActionCenter;
