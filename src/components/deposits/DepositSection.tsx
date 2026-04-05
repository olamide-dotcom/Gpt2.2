import { ArrowRight, Clock3, LockKeyhole, RefreshCcw, Router, ShieldCheck, WalletCards } from "lucide-react";
import { useState } from "react";

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

  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  if (isLoading || !snapshot) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-xl">Loading your deposit workspace</CardTitle>
          <CardDescription>Bringing your onboarding and wallet state into the deposit area.</CardDescription>
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
          <CardTitle className="text-xl">Finish onboarding to enable deposits</CardTitle>
          <CardDescription>
            Your deposit addresses would be created once your onboarding is approved and your account is active.
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
                <span>You will receive per-token deposit addresses linked to your account.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>Clear wallet cards with network labels, copy buttons, and QR placeholders for easy deposits.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>Your dashboard unlocks after your first credited deposit lands in the main wallet.</span>
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
            {pendingRequestCount > 0 ? <Badge variant="outline">{pendingRequestCount} awaiting apporval</Badge> : null}
            {dashboardUnlocked ? <Badge variant="outline">Dashboard unlocked</Badge> : null}
          </div>
          <CardTitle className="text-xl">Your deposit workspace</CardTitle>
          <CardDescription>
            Deposit instructions are active. 
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6 rounded-2xl border border-border bg-background/70 p-6">
            <div className="flex items-start gap-3">
              <WalletCards className="mt-0.5 text-gold" size={18} />
              <div>
                <h3 className="font-semibold text-foreground">Wallet funding summary</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Strategy track: <span className="font-medium text-foreground">{selectedStrategy}</span>
                </p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card/70 p-6">
                <div className="text-sm text-muted-foreground">Main wallet</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{formatUsdCurrency(snapshot.mainWalletBalanceUsd)}</div>
              </div>
              <div className="rounded-xl border border-border bg-card/70 p-6">
                <div className="text-sm text-muted-foreground">Trading bot wallet</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{formatUsdCurrency(snapshot.botWalletBalanceUsd)}</div>
              </div>
            </div>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>Use the exact network label shown on each token card. Cross-network deposits may require review.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>After you confirm a deposit, the request stays in a review queue until it's approved.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>After your first credited deposit, the dashboard unlocks and the AI bot can be funded.</span>
              </li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={onOpenDashboard} disabled={!dashboardUnlocked}>
                Open dashboard
                <ArrowRight size={16} />
              </Button>
              {!dashboardUnlocked ? (
                <div className="flex items-center text-sm text-muted-foreground">
                  Credit at least one deposit to access the dashboard.
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6 rounded-2xl border border-border bg-background/70 p-6">
            <div className="flex items-start gap-3">
              <Router className="mt-0.5 text-gold" size={18} />
              <div>
                <h3 className="font-semibold text-foreground">Incoming transaction tracking</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  We track incoming transactions so your deposits can be matched and reconciled. Use Refresh to check the latest state.
                </p>
              </div>
            </div>
            <Separator />
            <div className="grid gap-4">
              <div className="rounded-xl border border-border bg-card/70 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-foreground">Webhook readiness</div>
                  <Badge variant="outline">{snapshot.syncState.webhookReady ? "Ready" : "Pending"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Last webhook heartbeat: {formatWorkflowTimestamp(snapshot.syncState.lastWebhookCheckAt)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card/70 p-6">
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

      <div className={selectedToken ? "grid gap-8 grid-cols-1" : "grid gap-8 xl:grid-cols-3"}>
        {/** When a token is selected to show its address, hide other cards and show only the selected one. */}
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
            onOpenAddress={(tokenCode) => setSelectedToken(tokenCode)}
            onCloseAddress={() => setSelectedToken(null)}
            hidden={selectedToken !== null && selectedToken !== wallet.tokenCode}
          />
        ))}
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-xl">Deposit activity log</CardTitle>
          <CardDescription>
            Confirmed transactions stay linked to your assigned token address, and approved deposits fund your wallet.
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
                    Make a deposit  from one of the token addresses, then await approval or confirmation of transaction.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-background/60 p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 text-gold" size={18} />
              <div className="text-sm text-muted-foreground">
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DepositSection;
