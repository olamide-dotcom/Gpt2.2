import { ArrowRight, Clock3, LockKeyhole, RefreshCcw, Router, ShieldCheck, WalletCards } from "lucide-react";
import { useState } from "react";

import { strategies } from "@/content/site";
import DepositWalletCard from "@/components/deposits/DepositWalletCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";
import { DEPOSIT_BONUS_PERCENT, formatUsdCurrency, formatWorkflowTimestamp } from "@/lib/account-workflow";

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

  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  if (isLoading || !snapshot) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-xl">Loading your funding page</CardTitle>
          <CardDescription>Bringing your account, wallet balances, and funding details into view.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!depositUnlocked) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">Funding locked</Badge>
            <Badge variant="secondary">{completionPercentage}% complete</Badge>
          </div>
          <CardTitle className="text-xl">Finish setup to open funding</CardTitle>
          <CardDescription>
            Your funding addresses appear as soon as your account setup is approved.
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

          <div className="rounded-2xl border border-border bg-background/70 p-6">
            <h3 className="font-semibold text-foreground">What unlocks after approval</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>You will receive funding addresses for each supported token.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>Every approved deposit adds an extra {DEPOSIT_BONUS_PERCENT}% bonus when it lands in your main wallet.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>Your $5 starter balance will be ready so you can start the AI bot before making your first deposit.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>Your trade room will already be open, and a confirmed deposit unlocks cash-out eligibility after bot sessions return to your main wallet.</span>
              </li>
            </ul>
            <Button type="button" className="mt-6 w-full" onClick={onContinueOnboarding}>
              Continue setup
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedStrategy =
    strategies.find((strategy) => strategy.id === snapshot.selectedStrategyId)?.title ?? "Your style will appear here";
  const pendingRequestCount = snapshot.depositRequests.filter((request) => request.status === "pending_review").length;
  const approvedRequestCount = snapshot.depositRequests.filter((request) => request.status === "approved").length;

  return (
    <div className="space-y-6">
      <Card className="border-gold/40 bg-gold/10">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-gold">Deposit bonus active</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">Every approved deposit gets an extra {DEPOSIT_BONUS_PERCENT}%</div>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              If you deposit {formatUsdCurrency(1000)}, your balance receives {formatUsdCurrency(1100)} after approval.
            </p>
          </div>
          <Badge className="bg-gold text-primary-foreground">+{DEPOSIT_BONUS_PERCENT}% on every approved deposit</Badge>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-gold text-primary-foreground">Funding ready</Badge>
            <Badge variant="secondary">Approved {formatWorkflowTimestamp(snapshot.approvedAt)}</Badge>
            <Badge variant="outline">+{DEPOSIT_BONUS_PERCENT}% bonus active</Badge>
            {pendingRequestCount > 0 ? <Badge variant="outline">{pendingRequestCount} waiting for review</Badge> : null}
            {dashboardUnlocked ? <Badge variant="outline">Trade room open</Badge> : null}
          </div>
          <CardTitle className="text-xl">Your funding page</CardTitle>
          <CardDescription>Choose a token, copy the right address, and send your funding request. Every approved deposit receives an extra {DEPOSIT_BONUS_PERCENT}%.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6 rounded-2xl border border-border bg-background/70 p-6">
            <div className="flex items-start gap-3">
              <WalletCards className="mt-0.5 text-gold" size={18} />
              <div>
                <h3 className="font-semibold text-foreground">Funding summary</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your selected trading style: <span className="font-medium text-foreground">{selectedStrategy}</span>
                </p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card/70 p-6">
                <div className="text-sm text-muted-foreground">Main wallet</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{formatUsdCurrency(snapshot.mainWalletBalanceUsd)}</div>
              </div>
              <div className="rounded-xl border border-border bg-card/70 p-6">
                <div className="text-sm text-muted-foreground">Session balance</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{formatUsdCurrency(snapshot.botWalletBalanceUsd)}</div>
              </div>
            </div>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>Use the exact network shown on each token card so your funding reaches the right wallet.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>After you confirm a transfer, your funding request stays visible until it is checked.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>Every approved deposit receives a {DEPOSIT_BONUS_PERCENT}% bonus before it lands in your main wallet.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>Your $5 starter balance is already there to get you started. A confirmed deposit unlocks cash-out once your bot sessions have returned to your main wallet.</span>
              </li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={onOpenDashboard} disabled={!dashboardUnlocked}>
                Open trade room
                <ArrowRight size={16} />
              </Button>
              {!dashboardUnlocked ? (
                <div className="flex items-center text-sm text-muted-foreground">
                  Your trade room opens as soon as your starter balance is ready.
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6 rounded-2xl border border-border bg-background/70 p-6">
            <div className="flex items-start gap-3">
              <Router className="mt-0.5 text-gold" size={18} />
              <div>
                <h3 className="font-semibold text-foreground">Funding status</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Follow your funding progress here. If you have already sent money, refresh this panel to check the latest update.
                </p>
              </div>
            </div>
            <Separator />
            <div className="grid gap-4">
              <div className="rounded-xl border border-border bg-card/70 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-foreground">Waiting</div>
                  <Badge variant="outline">{pendingRequestCount}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Funding requests still waiting for approval.</p>
              </div>
              <div className="rounded-xl border border-border bg-card/70 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-foreground">Approved</div>
                  <Badge variant="outline">{approvedRequestCount}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Last update: {formatWorkflowTimestamp(snapshot.updatedAt)}
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
              {isRefreshingTracking ? "Refreshing..." : "Refresh funding status"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className={selectedToken ? "grid gap-8 grid-cols-1" : "grid gap-8 xl:grid-cols-3"}>
        {/** When a token is selected to show its address, hide other cards and show only the selected one. */}
        {snapshot.depositAddresses.map((wallet) => (
          <DepositWalletCard
            key={wallet.tokenCode}
            isSubmittingRequest={isSubmittingDepositRequest}
            latestRequest={snapshot.depositRequests.find((request) => request.tokenCode === wallet.tokenCode)}
            pendingRequestCount={
              snapshot.depositRequests.filter(
                (request) => request.tokenCode === wallet.tokenCode && request.status === "pending_review",
              ).length
            }
            onSubmitDepositRequest={(input) => submitDepositRequest(input)}
            wallet={wallet}
            onOpenAddress={(tokenCode) => setSelectedToken(tokenCode)}
            onCloseAddress={() => setSelectedToken(null)}
            hidden={selectedToken !== null && selectedToken !== wallet.tokenCode}
          />
        ))}
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-xl">Funding activity</CardTitle>
          <CardDescription>
            Every confirmed transfer stays linked to your funding page so you can follow what has already landed.
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
                    Status: <span className="font-medium text-foreground capitalize">{transaction.source}</span>
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
                    Use one of the funding cards above, then check back here once your transfer has been checked or confirmed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DepositSection;
