import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRightLeft,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, Scatter, XAxis, YAxis } from "recharts";

import BotSetupDialog from "@/components/dashboard/BotSetupDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/sonner";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";
import {
  canMoveBotBalanceToMainWallet,
  formatUsdCurrency,
  formatWorkflowTimestamp,
  getBotExecutionCadenceMs,
  getBotExecutionSpeedLabel,
  getWithdrawableBalance,
  hasConfirmedDepositCredit,
  VERIFICATION_BONUS_USD,
  type StartTradingBotInput,
} from "@/lib/account-workflow";

const chartConfig = {
  close: {
    label: "Price",
    color: "#34d399",
  },
  volume: {
    label: "Volume",
    color: "#1e3a8a",
  },
} satisfies ChartConfig;

const formatShortTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const formatCloseReason = (value: string) => {
  switch (value) {
    case "take_profit_hit":
      return "Take profit hit";
    case "stop_loss_hit":
      return "Stop loss hit";
    case "withdrawn_to_main_wallet":
      return "Returned to main wallet";
    case "manual_stop":
      return "Stopped by you";
    default:
      return value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
  }
};

const formatCompactUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatCadence = (value: number) => `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}s`;

const getSignalConfidence = (settings: StartTradingBotInput | null | undefined, profitLossPercent: number) => {
  if (!settings) {
    return 0;
  }

  const leverageValue = Number.parseInt(settings.leverage, 10) || 1;
  const riskBonus = settings.riskLevel === "high" ? 10 : settings.riskLevel === "medium" ? 6 : 2;
  const momentumBonus = Math.min(12, Math.abs(profitLossPercent) * 0.45);

  return Math.max(56, Math.min(97, Math.round(58 + leverageValue * 1.2 + riskBonus + momentumBonus)));
};

const getSignalMode = (settings: StartTradingBotInput | null | undefined) => {
  if (!settings) {
    return "Standby";
  }

  if (settings.riskLevel === "high" || settings.leverage === "20x") {
    return "Release Breakout";
  }

  if (settings.riskLevel === "low" || settings.leverage === "1x") {
    return "Filtered Launch Scout";
  }

  return "Hype Rotation";
};

const CandleShape = (props: {
  cx?: number;
  payload?: {
    close: number;
    high: number;
    low: number;
    open: number;
  };
  xAxis?: {
    scale?: {
      bandwidth?: () => number;
    };
  };
  yAxis?: {
    scale?: (value: number) => number;
  };
}) => {
  const { cx, payload, xAxis, yAxis } = props;

  if (typeof cx !== "number" || !payload || !yAxis?.scale) {
    return null;
  }

  const bullish = payload.close >= payload.open;
  const stroke = bullish ? "#34d399" : "#fb7185";
  const fill = bullish ? "rgba(52,211,153,0.3)" : "rgba(251,113,133,0.28)";
  const candleWidth = Math.max(8, Math.min(16, (xAxis?.scale?.bandwidth?.() ?? 18) * 0.56));
  const openY = yAxis.scale(payload.open);
  const closeY = yAxis.scale(payload.close);
  const highY = yAxis.scale(payload.high);
  const lowY = yAxis.scale(payload.low);
  const bodyTop = Math.min(openY, closeY);
  const bodyHeight = Math.max(2, Math.abs(openY - closeY));

  return (
    <g>
      <line x1={cx} x2={cx} y1={highY} y2={lowY} stroke={stroke} strokeWidth={1.5} />
      <rect
        x={cx - candleWidth / 2}
        y={bodyTop}
        width={candleWidth}
        height={bodyHeight}
        rx={2}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.4}
      />
    </g>
  );
};

const TradingDashboard = () => {
  const {
    completionPercentage,
    dashboardUnlocked,
    depositUnlocked,
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
  const defaultStrategyLabel = snapshot?.bot.tradingSettings?.strategyLabel ?? "Hybrid Insider Flow";

  useEffect(() => {
    if (!snapshot?.bot.active || !snapshot.bot.tradingSettings) {
      return;
    }

    const cadenceMs = getBotExecutionCadenceMs(snapshot.bot.tradingSettings);
    const interval = window.setInterval(() => {
      void syncTradingBot().catch(() => undefined);
    }, cadenceMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [snapshot?.bot.active, snapshot?.bot.tradingSettings, syncTradingBot]);

  if (isLoading || !snapshot) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-xl">Loading your AI trade room</CardTitle>
          <CardDescription>Bringing your balances, chart, and bot activity into view.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!dashboardUnlocked) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-xl">Finish setup to open your AI trade room</CardTitle>
          <CardDescription>Your AI trade room opens as soon as your setup and starter balance are ready.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const bot = snapshot.bot;
  const withdrawable = getWithdrawableBalance(snapshot);
  const canMoveToMainWallet = canMoveBotBalanceToMainWallet(snapshot);
  const hasConfirmedDeposit = hasConfirmedDepositCredit(snapshot);
  const cadenceMs = getBotExecutionCadenceMs(bot.tradingSettings);
  const executionSpeed = getBotExecutionSpeedLabel(bot.tradingSettings);
  const signalConfidence = getSignalConfidence(bot.tradingSettings, bot.profitLossPercent);
  const signalMode = getSignalMode(bot.tradingSettings);
  const pendingDepositRequests = snapshot.depositRequests.filter((request) => request.status === "pending_review");
  const approvedDepositRequests = snapshot.depositRequests.filter((request) => request.status === "approved");
  const approvedIdRequests = snapshot.idVerificationRequests.filter((request) => request.status === "approved");
  const pendingIdRequests = snapshot.idVerificationRequests.filter((request) => request.status === "pending_review");
  const latestTrade = bot.tradeHistory[0] ?? null;

  const takeProfitProgress =
    bot.tradingSettings && bot.profitLossPercent > 0
      ? Math.min(100, (bot.profitLossPercent / bot.tradingSettings.takeProfitPercent) * 100)
      : 0;
  const stopLossProgress =
    bot.tradingSettings && bot.profitLossPercent < 0
      ? Math.min(100, (Math.abs(bot.profitLossPercent) / bot.tradingSettings.stopLossPercent) * 100)
      : 0;

  const chartData = (bot.equityHistory.length
    ? bot.equityHistory
    : bot.lastUpdatedAt
      ? [
          {
            id: "current",
            timestamp: bot.lastUpdatedAt,
            balanceUsd: bot.currentBalanceUsd,
            profitUsd: bot.profitUsd,
            profitLossPercent: bot.profitLossPercent,
            status: bot.status,
          },
        ]
      : []
  ).map((point) => ({
    id: point.id,
    label: formatShortTime(point.timestamp),
    fullLabel: formatWorkflowTimestamp(point.timestamp),
    balance: point.balanceUsd,
    profit: point.profitUsd,
    profitLossPercent: point.profitLossPercent,
    status: point.status.replaceAll("_", " "),
  }));
  const referenceEntryBalance = bot.startingBalanceUsd || latestTrade?.entryBalanceUsd || 0;
  const cryptoChartData = chartData.map((point, index) => {
    const previousBalance = index === 0 ? point.balance : chartData[index - 1]!.balance;
    const candleRange = Math.max(0.28, Math.abs(point.balance - previousBalance) * 0.55 + 0.12);
    const wickStretch = 0.2 + Math.abs(point.profitLossPercent) * 0.03 + (index % 3) * 0.06;

    return {
      ...point,
      open: previousBalance,
      close: point.balance,
      high: Math.max(previousBalance, point.balance) + candleRange + wickStretch,
      low: Math.max(0, Math.min(previousBalance, point.balance) - candleRange * 0.7 - wickStretch),
      volume: Math.max(40, Math.round(Math.abs(point.profitLossPercent) * 140 + (index + 1) * 10)),
    };
  });
  const chartTrendPositive =
    (cryptoChartData.at(-1)?.close ?? bot.currentBalanceUsd) >= (cryptoChartData[0]?.open ?? bot.currentBalanceUsd);
  const chartLineColor = chartTrendPositive ? "#34d399" : "#fb7185";
  const takeProfitBalance =
    bot.tradingSettings && referenceEntryBalance > 0
      ? referenceEntryBalance * (1 + bot.tradingSettings.takeProfitPercent / 100)
      : null;
  const stopLossBalance =
    bot.tradingSettings && referenceEntryBalance > 0
      ? Math.max(0, referenceEntryBalance * (1 - bot.tradingSettings.stopLossPercent / 100))
      : null;

  const handleStartBot = async (input: Parameters<typeof startTradingBot>[0]) => {
    try {
      await startTradingBot(input);
      toast.success("Your AI bot is now running.");
    } catch {
      toast.error("We could not start the AI bot right now.");
    }
  };

  const handleStopBot = async () => {
    try {
      await stopTradingBot();
      toast.success("Your session is paused.");
    } catch {
      toast.error("We could not pause the AI bot right now.");
    }
  };

  const handleWithdrawBotBalance = async () => {
    try {
      await withdrawBotBalance();
      toast.success("Your stopped session is back in your main wallet.");
    } catch {
      toast.error("We could not return that session right now.");
    }
  };

  const handleSyncBot = async () => {
    try {
      await syncTradingBot();
      toast.success("Your trade room is up to date.");
    } catch {
      toast.error("We could not refresh your trade room right now.");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-gold text-primary-foreground">AI launch bot</Badge>
                <Badge variant={bot.active ? "secondary" : "outline"}>
                  {bot.active ? "Bot running" : bot.status.replaceAll("_", " ")}
                </Badge>
                <Badge variant="outline">{depositUnlocked ? "Funding ready" : "Funding locked"}</Badge>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-foreground md:text-3xl">Your bot, chart, balance, and exits stay together here</h2>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
                  This AI bot tracks newly launched coins, buys into release momentum, reacts to
                  pullbacks, and sending the session back to your main wallet as soon as your take profit or stop loss is reached.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Setup {completionPercentage}% complete</Badge>
                {pendingDepositRequests.length > 0 ? <Badge variant="outline">{pendingDepositRequests.length} funding update waiting</Badge> : null}
                {pendingIdRequests.length > 0 ? <Badge variant="outline">{pendingIdRequests.length} document check waiting</Badge> : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => navigate("/deposit")}>
                <CreditCard size={16} />
                Funding
              </Button>
              <Button variant="outline" onClick={() => navigate("/withdraw")}>
                <ArrowRightLeft size={16} />
                Withdraw
              </Button>
              <Button onClick={() => setBotModalOpen(true)} disabled={snapshot.mainWalletBalanceUsd <= 0 || bot.active}>
                <PlayCircle size={16} />
                Start AI bot
              </Button>
              <Button variant="outline" onClick={() => void handleStopBot()} disabled={!bot.active || isStoppingTradingBot}>
                <PauseCircle size={16} />
                {isStoppingTradingBot ? "Stopping..." : "Stop AI bot"}
              </Button>
              <Button variant="ghost" onClick={() => void handleSyncBot()} disabled={isSyncingTradingBot}>
                <RefreshCcw size={16} />
                {isSyncingTradingBot ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <CircleDollarSign className="text-gold" size={18} />
              <div className="text-sm text-muted-foreground">Total portfolio</div>
            </div>
            <div className="mt-4 text-3xl font-semibold text-foreground">{formatUsdCurrency(totalWalletBalance)}</div>
            <p className="mt-2 text-sm text-muted-foreground">Your available balance and live bot balance together.</p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Wallet className="text-gold" size={18} />
              <div className="text-sm text-muted-foreground">Main wallet</div>
            </div>
            <div className="mt-4 text-3xl font-semibold text-foreground">{formatUsdCurrency(snapshot.mainWalletBalanceUsd)}</div>
            <p className="mt-2 text-sm text-muted-foreground">Ready for your next bot session or waiting after an auto-return.</p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Bot className="text-gold" size={18} />
              <div className="text-sm text-muted-foreground">Session balance</div>
            </div>
            <div className="mt-4 text-3xl font-semibold text-foreground">{formatUsdCurrency(snapshot.botWalletBalanceUsd)}</div>
            <p className="mt-2 text-sm text-muted-foreground">Only the amount currently inside a live or stopped session.</p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <ArrowUpRight className="text-gold" size={18} />
              <div className="text-sm text-muted-foreground">Cash-out eligible</div>
            </div>
            <div className="mt-4 text-3xl font-semibold text-foreground">{formatUsdCurrency(withdrawable)}</div>
            <p className="mt-2 text-sm text-muted-foreground">Cash-out stays locked until your first confirmed deposit is on the account.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl">Bot controls</CardTitle>
                <CardDescription>Set the AI bot once, then let the session watch launch momentum and auto-close itself.</CardDescription>
              </div>
              <Badge variant={bot.active ? "secondary" : "outline"}>
                {bot.active ? "Live session" : "Session idle"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-2xl border border-border bg-background/70 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Active setup</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {bot.activeTradeLabel ?? latestTrade?.tradeLabel ?? "No trade active yet"}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {latestTrade?.strategyLabel ?? defaultStrategyLabel}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Profit / Loss</div>
                  <div className={`mt-1 text-2xl font-semibold ${bot.profitUsd >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
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
                  <Badge variant="outline">{executionSpeed} cadence</Badge>
                  <Badge variant="outline">Auto-return enabled</Badge>
                </div>
              ) : null}
            </div>

            {bot.tradingSettings ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="text-sm text-muted-foreground">Execution speed</div>
                  <div className="mt-2 text-lg font-semibold text-foreground">{executionSpeed}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{formatCadence(cadenceMs)} cadence</div>
                </div>
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="text-sm text-muted-foreground">Bot focus</div>
                  <div className="mt-2 text-lg font-semibold text-foreground">{signalMode}</div>
                  <div className="mt-1 text-sm text-muted-foreground">Fresh listings, early entries, and exits before the bearish fade grows.</div>
                </div>
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="text-sm text-muted-foreground">Move strength</div>
                  <div className="mt-2 text-lg font-semibold text-foreground">{signalConfidence}%</div>
                  <div className="mt-1 text-sm text-muted-foreground">Leverage and risk change how quickly the session reacts and swings.</div>
                </div>
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="text-sm text-muted-foreground">Auto exit</div>
                  <div className="mt-2 text-lg font-semibold text-foreground">
                    TP {bot.tradingSettings.takeProfitPercent}% / SL {bot.tradingSettings.stopLossPercent}%
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">Hit either level and the session returns to your main wallet automatically.</div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target size={16} />
                  Take profit progress
                </div>
                <div className="mt-3">
                  <Progress value={takeProfitProgress} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Once this reaches 100%, the bot closes the session and sends the result back to your main wallet.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldAlert size={16} />
                  Stop loss exposure
                </div>
                <div className="mt-3">
                  <Progress value={stopLossProgress} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  If drawdown reaches your stop loss, the session closes and the remaining balance returns to your main wallet.
                </p>
              </div>
            </div>

            {snapshot.bonusUsd > 0 && !hasConfirmedDeposit ? (
              <div className="rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">Starter balance rule</div>
                <p className="mt-2">
                  Your {formatUsdCurrency(snapshot.bonusUsd || VERIFICATION_BONUS_USD)} starter balance can keep cycling
                  through bot sessions. You still need one confirmed deposit before any amount becomes cash-out eligible.
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setBotModalOpen(true)} disabled={snapshot.mainWalletBalanceUsd <= 0 || bot.active}>
                <PlayCircle size={16} />
                Start AI bot
              </Button>
              <Button variant="outline" onClick={() => void handleStopBot()} disabled={!bot.active || isStoppingTradingBot}>
                <PauseCircle size={16} />
                {isStoppingTradingBot ? "Stopping..." : "Stop AI bot"}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleWithdrawBotBalance()}
                disabled={bot.active || snapshot.botWalletBalanceUsd <= 0 || isWithdrawingBotBalance || !canMoveToMainWallet}
              >
                <ArrowUpRight size={16} />
                {isWithdrawingBotBalance ? "Returning..." : "Return stopped session"}
              </Button>
              <Button variant="ghost" onClick={() => void handleSyncBot()} disabled={isSyncingTradingBot}>
                <RefreshCcw size={16} />
                {isSyncingTradingBot ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 text-gold" size={18} />
                <div>
                  <div className="font-medium text-foreground">How the AI bot works</div>
                  <p className="mt-2">
                    The bot scans newly launched coins, enters around release, rides the
                    early hype, showing real pullbacks on the chart, and exiting before the move turns too bearish. Your
                    take profit and stop loss are the rules that decide when the session closes and returns to your main wallet.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-xl">Quick status</CardTitle>
            <CardDescription>See the pieces that matter before you start another session or request a cash-out.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className={bot.active ? "text-emerald-300" : "text-muted-foreground"} size={16} />
                Bot status
              </div>
              <div className="mt-2 font-medium capitalize text-foreground">{bot.status.replaceAll("_", " ")}</div>
            </div>

            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 size={16} />
                Last update
              </div>
              <div className="mt-2 font-medium text-foreground">{formatWorkflowTimestamp(bot.lastUpdatedAt)}</div>
            </div>

            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck size={16} />
                ID checks approved
              </div>
              <div className="mt-2 font-medium text-foreground">
                {approvedIdRequests.length} approved
                {pendingIdRequests.length > 0 ? ` / ${pendingIdRequests.length} pending` : ""}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 size={16} />
                Funding approvals
              </div>
              <div className="mt-2 font-medium text-foreground">
                {approvedDepositRequests.length} approved
                {pendingDepositRequests.length > 0 ? ` / ${pendingDepositRequests.length} pending` : ""}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="text-sm text-muted-foreground">Last amount used</div>
              <div className="mt-2 font-medium text-foreground">
                {latestTrade ? formatUsdCurrency(latestTrade.allocatedAmountUsd) : "No session started yet"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-secondary text-foreground">aitradechat</Badge>
                  {bot.active ? <Badge variant="secondary">Live</Badge> : null}
                </div>
                <CardTitle className="mt-3 text-xl">Live chart</CardTitle>
                <CardDescription>
                  Follow the session like a live crypto chart: release entry, hype push, pullback, and exit before the bearish fade deepens.
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Current session balance</div>
                <div className="mt-1 text-2xl font-semibold text-foreground">{formatUsdCurrency(bot.currentBalanceUsd)}</div>
                <div className={`text-sm ${bot.profitUsd >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {bot.profitUsd >= 0 ? "+" : ""}
                  {formatUsdCurrency(bot.profitUsd)}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {cryptoChartData.length > 0 ? (
              <div className="rounded-[1.75rem] border border-slate-800 bg-[#07101d] p-4 text-slate-100">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Aitradechat / launch feed</div>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-3xl font-semibold">{formatUsdCurrency(cryptoChartData.at(-1)?.close ?? 0)}</span>
                      <span className={chartTrendPositive ? "text-emerald-400" : "text-rose-400"}>
                        {bot.profitLossPercent >= 0 ? "+" : ""}
                        {bot.profitLossPercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                    <Badge className="border border-slate-700 bg-slate-900 text-slate-100">1D</Badge>
                    <Badge className="border border-slate-700 bg-slate-900 text-slate-100">{bot.active ? "Live" : "Paused"}</Badge>
                    <Badge className="border border-slate-700 bg-slate-900 text-slate-100">{executionSpeed}</Badge>
                  </div>
                </div>

                <ChartContainer
                  config={chartConfig}
                  className="aspect-auto h-[320px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-slate-400 [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-slate-800/80"
                >
                  <ComposedChart accessibilityLayer data={cryptoChartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="aitradechat-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartLineColor} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={chartLineColor} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={24} tickMargin={8} />
                    <YAxis
                      yAxisId="price"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      width={72}
                      tickFormatter={(value) => formatCompactUsd(Number(value))}
                    />
                    <YAxis
                      yAxisId="volume"
                      hide
                      axisLine={false}
                      tickLine={false}
                      domain={[0, "dataMax + 40"]}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideIndicator
                          indicator="line"
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ""}
                          formatter={(_, __, item) => (
                            <div className="min-w-[190px] space-y-2">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Open</span>
                                <span className="font-medium text-foreground">
                                  {formatUsdCurrency(Number(item.payload?.open ?? 0))}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">High</span>
                                <span className="font-medium text-foreground">
                                  {formatUsdCurrency(Number(item.payload?.high ?? 0))}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Low</span>
                                <span className="font-medium text-foreground">
                                  {formatUsdCurrency(Number(item.payload?.low ?? 0))}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Close</span>
                                <span className="font-medium text-foreground">
                                  {formatUsdCurrency(Number(item.payload?.close ?? item.value))}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Volume</span>
                                <span className="font-medium text-foreground">
                                  {Number(item.payload?.volume ?? 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}
                        />
                      }
                    />
                    <Bar yAxisId="volume" dataKey="volume" fill="rgba(59,130,246,0.18)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                    {takeProfitBalance ? (
                      <ReferenceLine yAxisId="price" y={takeProfitBalance} stroke="#fbbf24" strokeDasharray="5 5" />
                    ) : null}
                    {stopLossBalance ? (
                      <ReferenceLine yAxisId="price" y={stopLossBalance} stroke="#fb7185" strokeDasharray="5 5" />
                    ) : null}
                    <Area
                      yAxisId="price"
                      dataKey="close"
                      type="monotone"
                      stroke={chartLineColor}
                      fill="url(#aitradechat-fill)"
                      strokeWidth={3}
                    />
                    <Scatter yAxisId="price" dataKey="close" shape={CandleShape} fill="transparent" />
                    <Line yAxisId="price" dataKey="close" type="monotone" stroke={chartLineColor} strokeWidth={2.25} dot={false} />
                    <ReferenceLine
                      yAxisId="price"
                      y={cryptoChartData.at(-1)?.close}
                      stroke={chartLineColor}
                      strokeDasharray="4 4"
                    />
                  </ComposedChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-sm text-muted-foreground">
                Start the AI bot to generate the first aitradechat candles.
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <div className="text-sm text-muted-foreground">Started</div>
                <div className="mt-2 font-medium text-foreground">{formatWorkflowTimestamp(bot.startedAt)}</div>
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <div className="text-sm text-muted-foreground">Last heartbeat</div>
                <div className="mt-2 font-medium text-foreground">{formatWorkflowTimestamp(bot.lastUpdatedAt)}</div>
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <div className="text-sm text-muted-foreground">Auto return</div>
                <div className="mt-2 font-medium text-foreground">
                  {latestTrade?.settledToMainWalletAt
                    ? `Returned ${formatWorkflowTimestamp(latestTrade.settledToMainWalletAt)}`
                    : bot.active
                      ? "Will return on take profit or stop loss"
                      : canMoveToMainWallet
                        ? "Ready to return now"
                        : "Waiting for your next session"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-gold" size={18} />
              <div>
                <CardTitle className="text-xl">Trade history</CardTitle>
                <CardDescription>Each session saves its launch idea, swings, exit rule, and wallet return.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {bot.tradeHistory.length > 0 ? (
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {bot.tradeHistory.map((trade) => (
                  <div key={trade.id} className="rounded-2xl border border-border bg-background/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-foreground">{trade.tradeLabel}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{trade.strategyLabel}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={trade.status === "running" ? "secondary" : "outline"}>
                          {trade.status === "running" ? "Live" : "Closed"}
                        </Badge>
                        <Badge variant="outline">{trade.leverage}</Badge>
                        <Badge variant="outline">{trade.riskLevel} risk</Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/80 bg-card/70 p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Allocated</div>
                        <div className="mt-1 font-semibold text-foreground">{formatUsdCurrency(trade.allocatedAmountUsd)}</div>
                      </div>
                      <div className="rounded-xl border border-border/80 bg-card/70 p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Current balance</div>
                        <div className="mt-1 font-semibold text-foreground">{formatUsdCurrency(trade.currentBalanceUsd)}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <TrendingUp size={14} className={trade.profitUsd >= 0 ? "text-emerald-300" : "text-rose-300"} />
                      <span className={trade.profitUsd >= 0 ? "text-emerald-300" : "text-rose-300"}>
                        {trade.profitUsd >= 0 ? "+" : ""}
                        {formatUsdCurrency(trade.profitUsd)} ({trade.profitLossPercent.toFixed(2)}%)
                      </span>
                    </div>

                    {trade.settledToMainWalletAt ? (
                      <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-50/10 p-3 text-sm text-muted-foreground">
                        Returned to main wallet:{" "}
                        <span className="font-medium text-foreground">{formatUsdCurrency(trade.settledAmountUsd ?? trade.currentBalanceUsd)}</span>
                        {" - "}
                        {formatWorkflowTimestamp(trade.settledToMainWalletAt)}
                      </div>
                    ) : null}

                    <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                      <div>Opened: {formatWorkflowTimestamp(trade.openedAt)}</div>
                      <div>Updated: {formatWorkflowTimestamp(trade.lastUpdatedAt)}</div>
                      {trade.closedAt ? <div>Closed: {formatWorkflowTimestamp(trade.closedAt)}</div> : null}
                      {trade.closeReason !== "active" ? <div>Exit rule: {formatCloseReason(trade.closeReason)}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-sm text-muted-foreground">
                Start one session and the full story of the run will appear here.
              </div>
            )}
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
