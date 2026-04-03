import { ArrowRight, Clock3, LockKeyhole, RefreshCcw, Router, ShieldCheck, WalletCards } from "lucide-react";

import { strategies } from "@/content/site";
import DepositWalletCard from "@/components/deposits/DepositWalletCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";
import { formatUsdCurrency, formatWorkflowTimestamp } from "@/lib/account-workflow";

interface DepositSectionProps {
  onContinueOnboarding: () => void;
  onOpenDashboard: () => void;
}

const DepositSection = ({ onContinueOnboarding, onOpenDashboard }: DepositSectionProps) => {
  const {
    completionPercentage,
    dashboardUnlocked,
    depositUnlocked,
    isLoading,
    isRefreshingTracking,
    isSubmittingDepositRequest,
    refreshTracking,
    remainingSteps,
    submitDepositRequest,
    snapshot,
  } = useAccountWorkflow();

  if (isLoading || !snapshot) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-xl">Loading deposit workspace</CardTitle>
          <CardDescription>Pulling your onboarding and wallet state into the deposit workspace.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!depositUnlocked) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">Deposit locked</Badge>
            <Badge variant="secondary">{completionPercentage}% complete</Badge>
          </div>
          <CardTitle className="text-xl">Finish onboarding before deposits go live</CardTitle>
          <CardDescription>
            Token addresses are only assigned after the onboarding workflow is approved and the account workflows are
            active.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border bg-background/70 p-5">
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 text-gold" size={18} />
              <div>
                <h3 className="font-semibold text-foreground">Remaining steps</h3>
                <div className="mt-4 space-y-3">
                  {remainingSteps.map((step) => (
                    <div key={step.id} className="rounded-xl border border-border bg-card/70 p-4">
                      <div className="font-medium text-foreground">{step.title}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/70 p-5">
            <h3 className="font-semibold text-foreground">What unlocks after approval</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>Per-token deposit addresses linked to the current account reference.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>Clean wallet cards with network labels, copy buttons, and reserved QR placeholders.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>Dashboard access after the first credited deposit lands in the main wallet.</span>
              </li>
            </ul>
            <Button type="button" className="mt-6 w-full" onClick={onContinueOnboarding}>
              Continue onboarding
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedStrategy =
    strategies.find((strategy) => strategy.id === snapshot.selectedStrategyId)?.title ?? "Strategy track pending";
  const pendingRequestCount = snapshot.depositRequests.filter((request) => request.status === "pending_review").length;

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-gold text-primary-foreground">Deposit unlocked</Badge>
            <Badge variant="secondary">Approved {formatWorkflowTimestamp(snapshot.approvedAt)}</Badge>
            {pendingRequestCount > 0 ? <Badge variant="outline">{pendingRequestCount} awaiting review</Badge> : null}
            {dashboardUnlocked ? <Badge variant="outline">Dashboard unlocked</Badge> : null}
          </div>
          <CardTitle className="text-xl">Assigned deposit workspace for {snapshot.userId}</CardTitle>
          <CardDescription>
            Deposit instructions are active, and each submitted deposit request can be reviewed locally before it
            updates the wallet balance used by the dashboard simulation.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4 rounded-2xl border border-border bg-background/70 p-5">
            <div className="flex items-start gap-3">
              <WalletCards className="mt-0.5 text-gold" size={18} />
              <div>
                <h3 className="font-semibold text-foreground">Wallet funding summary</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Strategy track: <span className="font-medium text-foreground">{selectedStrategy}</span>
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card/70 p-4">
                <div className="text-sm text-muted-foreground">Main wallet</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{formatUsdCurrency(snapshot.mainWalletBalanceUsd)}</div>
              </div>
              <div className="rounded-xl border border-border bg-card/70 p-4">
                <div className="text-sm text-muted-foreground">Trading bot wallet</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{formatUsdCurrency(snapshot.botWalletBalanceUsd)}</div>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>Use the exact network label shown on each token card. Cross-network deposits should be held for review.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>Each &quot;I&apos;ve sent now&quot; request stays in the local review queue until it is approved manually.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>After the first credited deposit, the dashboard route unlocks and the AI bot can be funded.</span>
              </li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={onOpenDashboard} disabled={!dashboardUnlocked}>
                Open dashboard
                <ArrowRight size={16} />
              </Button>
              {!dashboardUnlocked ? (
                <div className="flex items-center text-sm text-muted-foreground">
                  Credit at least one deposit to unlock the dashboard.
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-background/70 p-5">
            <div className="flex items-start gap-3">
              <Router className="mt-0.5 text-gold" size={18} />
              <div>
                <h3 className="font-semibold text-foreground">Incoming transaction tracking</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  The project already has persistent structures ready for webhook or polling-based deposit
                  reconciliation.
                </p>
              </div>
            </div>
            <Separator />
            <div className="grid gap-3">
              <div className="rounded-xl border border-border bg-card/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-foreground">Webhook readiness</div>
                  <Badge variant="outline">{snapshot.syncState.webhookReady ? "Ready" : "Pending"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Last webhook heartbeat: {formatWorkflowTimestamp(snapshot.syncState.lastWebhookCheckAt)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-foreground">Polling readiness</div>
                  <Badge variant="outline">{snapshot.syncState.pollingReady ? "Ready" : "Pending"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Last polling heartbeat: {formatWorkflowTimestamp(snapshot.syncState.lastPollingCheckAt)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void refreshTracking("polling")}
              disabled={isRefreshingTracking}
            >
              <RefreshCcw size={16} />
              {isRefreshingTracking ? "Refreshing..." : "Refresh monitoring state"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        {snapshot.depositAddresses.map((wallet) => (
          <DepositWalletCard
            key={wallet.tokenCode}
            accountId={snapshot.userId}
            isSubmittingRequest={isSubmittingDepositRequest}
            latestRequest={snapshot.depositRequests.find((request) => request.tokenCode === wallet.tokenCode)}
            pendingRequestCount={
              snapshot.depositRequests.filter(
                (request) => request.tokenCode === wallet.tokenCode && request.status === "pending_review",
              ).length
            }
            onSubmitDepositRequest={(input) => submitDepositRequest(input)}
            wallet={wallet}
          />
        ))}
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-xl">Deposit activity log</CardTitle>
          <CardDescription>
            Confirmed transactions stay linked to the assigned token address, and approved deposit credits also fund
            the wallet system used by the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {snapshot.transactions.length > 0 ? (
            snapshot.transactions.map((transaction) => (
              <div key={transaction.id} className="rounded-xl border border-border bg-background/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{transaction.tokenCode}</Badge>
                    <Badge variant="outline">{transaction.networkLabel}</Badge>
                  </div>
                  <Badge variant="outline">{transaction.status}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  <div>
                    Amount: <span className="font-medium text-foreground">{formatUsdCurrency(Number(transaction.amount))}</span>
                  </div>
                  <div>
                    Source: <span className="font-medium text-foreground capitalize">{transaction.source}</span>
                  </div>
                  <div className="md:col-span-2">
                    Transaction hash: <span className="font-mono text-foreground">{transaction.txHash}</span>
                  </div>
                  <div className="md:col-span-2">
                    Detected at: <span className="font-medium text-foreground">{formatWorkflowTimestamp(transaction.detectedAt)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 text-gold" size={18} />
                <div>
                  <p className="font-medium text-foreground">No incoming deposits tracked yet</p>
                  <p className="mt-2">
                    Submit a deposit request from one of the token cards, then approve it manually or through another
                    deposit integration to push a confirmed transaction into this activity log.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 text-gold" size={18} />
              <div className="text-sm text-muted-foreground">
                Private keys are never generated or stored in this frontend module. The assigned wallet addresses are
                simulated account references and should be replaced with server-issued addresses in production.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DepositSection;
