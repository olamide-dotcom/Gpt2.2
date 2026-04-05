import { useMemo, useState } from "react";

import {
  Activity,
  ArrowUpRight,
  Bot,
  CircleDollarSign,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

import BotSetupDialog from "@/components/dashboard/BotSetupDialog";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/sonner";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";
import { formatUsdCurrency, formatWorkflowTimestamp, MAX_BOT_GAIN_PERCENT, MAX_BOT_LOSS_PERCENT } from "@/lib/account-workflow";

const TradingDashboard = () => {
  const {
    dashboardUnlocked,
    isLoading,
    isStartingTradingBot,
    isStoppingTradingBot,
    isSyncingTradingBot,
    isWithdrawingBotBalance,
    snapshot,
    startTradingBot,
    stopTradingBot,
    syncTradingBot,
    totalWalletBalance,
    withdrawBotBalance,
  } = useAccountWorkflow();

  const [botModalOpen, setBotModalOpen] = useState(false);
  const navigate = useNavigate();

  const defaultStrategyLabel = useMemo(() => snapshot?.bot.tradingSettings?.strategyLabel ?? "Hybrid Insider Flow", [snapshot]);

  if (isLoading || !snapshot) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-xl">Loading dashboard</CardTitle>
          <CardDescription>Bringing wallet balances and bot state into the trading dashboard.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!dashboardUnlocked) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-xl">Dashboard locked</CardTitle>
          <CardDescription>Credit the first deposit on the previous step to unlock the wallet dashboard.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const bot = snapshot.bot;
  const takeProfitProgress =
    bot.tradingSettings && bot.profitLossPercent > 0
      ? Math.min(100, (bot.profitLossPercent / bot.tradingSettings.takeProfitPercent) * 100)
      : 0;
  const stopLossProgress =
    bot.tradingSettings && bot.profitLossPercent < 0
      ? Math.min(100, (Math.abs(bot.profitLossPercent) / bot.tradingSettings.stopLossPercent) * 100)
      : 0;

  const handleStartBot = async (
    input: Parameters<typeof startTradingBot>[0],
  ) => {
    try {
      await startTradingBot(input);
      toast.success("AI trading bot started.");
    } catch {
      toast.error("Unable to start the trading bot right now.");
    }
  };

  const handleStopBot = async () => {
    try {
      await stopTradingBot();
      toast.success("Trading bot stopped.");
    } catch {
      toast.error("Unable to stop the trading bot right now.");
    }
  };

  const handleWithdrawBotBalance = async () => {
    try {
      await withdrawBotBalance();
      toast.success("Bot balance moved back to the main wallet.");
    } catch {
      toast.error("Unable to withdraw the bot balance right now.");
    }
  };

  const handleSyncBot = async () => {
    try {
      await syncTradingBot();
    } catch {
      toast.error("Unable to refresh the trading engine right now.");
    }
  };

  const withdrawable = snapshot.mainWalletBalanceUsd - (snapshot.bonusLocked ? snapshot.bonusUsd ?? 0 : 0);

  return (
    <div className="space-y-6">
      {withdrawable > 0 ? (
        <div className="rounded-2xl border border-gold/30 bg-gold/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-foreground">You have withdrawable balance</div>
              <div className="text-sm text-muted-foreground">Withdraw funds back to your external wallet.</div>
            </div>
            <div>
              <button
                type="button"
                onClick={() => navigate("/withdraw")}
                className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-foreground"
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Wallet className="text-gold" size={20} />
              <div>
                <CardTitle className="text-xl">Main Wallet</CardTitle>
                <CardDescription>Your deposits appear here before any funds are allocated to the bot.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-foreground">{formatUsdCurrency(snapshot.mainWalletBalanceUsd)}</div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bot className="text-gold" size={20} />
              <div>
                <CardTitle className="text-xl">Trading Bot Balance</CardTitle>
                <CardDescription>Allocated funds move here while the Tradebot is active.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-foreground">{formatUsdCurrency(snapshot.botWalletBalanceUsd)}</div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CircleDollarSign className="text-gold" size={20} />
              <div>
                <CardTitle className="text-xl">Total Portfolio</CardTitle>
                <CardDescription>Main wallet plus bot wallet in one snapshot.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-foreground">{formatUsdCurrency(totalWalletBalance)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl">AI Trading Bot Controls</CardTitle>
                <CardDescription>Configure, fund, start, stop, and withdraw without leaving the dashboard.</CardDescription>
              </div>
              <Badge variant={bot.active ? "secondary" : "outline"}>{bot.active ? "Running" : bot.status.replaceAll("_", " ")}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-2xl border border-border bg-background/70 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">Active trade</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{bot.activeTradeLabel ?? "No trade active yet"}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Profit / Loss</div>
                  <div className={`mt-1 text-lg font-semibold ${bot.profitUsd >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {bot.profitUsd >= 0 ? "+" : ""}
                    {formatUsdCurrency(bot.profitUsd)}
                  </div>
                  <div className={`text-sm ${bot.profitLossPercent >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {bot.profitLossPercent >= 0 ? "+" : ""}
                    {bot.profitLossPercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              {bot.tradingSettings ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline">{bot.tradingSettings.leverage}</Badge>
                  <Badge variant="outline">{bot.tradingSettings.riskLevel} risk</Badge>
                  <Badge variant="outline">SL {bot.tradingSettings.stopLossPercent}%</Badge>
                  <Badge variant="outline">TP {bot.tradingSettings.takeProfitPercent}%</Badge>
                </div>
              ) : null}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="text-sm text-muted-foreground">Take profit progress</div>
                <div className="mt-3">
                  <Progress value={takeProfitProgress} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Bot closes automatically when gains reach the configured target.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="text-sm text-muted-foreground">Stop loss exposure</div>
                <div className="mt-3">
                  <Progress value={stopLossProgress} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Risk stays controlled by stopping the bot at the configured downside level.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => setBotModalOpen(true)} disabled={snapshot.mainWalletBalanceUsd <= 0 || bot.active}>
                <PlayCircle size={16} />
                Start AI Trading Bot
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleStopBot()} disabled={!bot.active || isStoppingTradingBot}>
                <PauseCircle size={16} />
                {isStoppingTradingBot ? "Stopping..." : "Stop Bot"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleWithdrawBotBalance()}
                disabled={bot.active || snapshot.botWalletBalanceUsd <= 0 || isWithdrawingBotBalance}
              >
                <ArrowUpRight size={16} />
                {isWithdrawingBotBalance ? "Withdrawing..." : "Withdraw to Main Wallet"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => void handleSyncBot()} disabled={isSyncingTradingBot}>
                <RefreshCcw size={16} />
                {isSyncingTradingBot ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 text-gold" size={18} />
                <div>
                  <div className="font-medium text-foreground">Aitradebot earnings engine</div>
                  <p className="mt-2">
                    While the bot is running, balances move gradually with controlled fluctuations. The dashboard
                    refreshes against the persisted snapshot so the wallet, bot status, and P/L stay in sync without
                    sudden spikes.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-xl">Bot Runtime</CardTitle>
            <CardDescription>Quick view of status, timestamps, and current strategy settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="mt-2 flex items-center gap-2 text-foreground">
                <Activity className={bot.active ? "text-emerald-300" : "text-muted-foreground"} size={16} />
                <span className="font-medium capitalize">{bot.status.replaceAll("_", " ")}</span>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="text-sm text-muted-foreground">Started</div>
              <div className="mt-2 font-medium text-foreground">{formatWorkflowTimestamp(bot.startedAt)}</div>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="text-sm text-muted-foreground">Last update</div>
              <div className="mt-2 font-medium text-foreground">{formatWorkflowTimestamp(bot.lastUpdatedAt)}</div>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="text-sm text-muted-foreground">Stopped</div>
              <div className="mt-2 font-medium text-foreground">{formatWorkflowTimestamp(bot.stoppedAt)}</div>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="text-sm text-muted-foreground">Allocated capital</div>
              <div className="mt-2 font-medium text-foreground">{formatUsdCurrency(bot.allocatedAmountUsd)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-xl">Recent Deposits</CardTitle>
            <CardDescription>This view shows the same funding history from your deposit page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.simulatedDeposits.length > 0 ? (
              snapshot.simulatedDeposits.slice(0, 4).map((deposit) => (
                <div key={deposit.id} className="rounded-xl border border-border bg-background/70 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{deposit.tokenCode}</Badge>
                      <Badge variant="outline">{deposit.networkLabel}</Badge>
                    </div>
                    <div className="font-semibold text-foreground">{formatUsdCurrency(deposit.amountUsd)}</div>
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground">
                    Credited {formatWorkflowTimestamp(deposit.creditedAt)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
                No deposit credits yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-xl">AITradebot Rules</CardTitle>
            <CardDescription>.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 text-gold" size={18} />
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Deposits credit the main wallet first, then the bot allocation deducts from the main wallet and
                    moves into the trading bot balance.
                  </p>
                  <p>
                    Profit and loss update over time using deterministic fluctuations, with the bot bounded between -
                    {MAX_BOT_LOSS_PERCENT}% and +{MAX_BOT_GAIN_PERCENT}% of the allocated trade amount.
                  </p>
                  <p>
                    Withdrawing the bot balance moves funds back to the main wallet instantly and resets the bot for the
                    next run.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BotSetupDialog
        open={botModalOpen}
        onOpenChange={setBotModalOpen}
        availableBalanceUsd={snapshot.mainWalletBalanceUsd}
        defaultStrategyLabel={defaultStrategyLabel}
        isStarting={isStartingTradingBot}
        onStart={handleStartBot}
      />
    </div>
  );
};

export default TradingDashboard;
