import { useEffect, useMemo, useState } from "react";

import { ArrowRight, Bot, ShieldCheck, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  formatUsdCurrency,
  MAX_BOT_GAIN_PERCENT,
  MAX_BOT_LOSS_PERCENT,
  type BotLeverage,
  type BotRiskLevel,
  type StartTradingBotInput,
} from "@/lib/account-workflow";

interface BotSetupDialogProps {
  availableBalanceUsd: number;
  defaultStrategyLabel: string;
  isStarting: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (input: StartTradingBotInput) => Promise<void>;
  open: boolean;
}

type SetupStep = "settings" | "allocation";

const BotSetupDialog = ({
  availableBalanceUsd,
  defaultStrategyLabel,
  isStarting,
  onOpenChange,
  onStart,
  open,
}: BotSetupDialogProps) => {
  const [step, setStep] = useState<SetupStep>("settings");
  const [leverage, setLeverage] = useState<BotLeverage>("5x");
  const [stopLossPercent, setStopLossPercent] = useState("8");
  const [takeProfitPercent, setTakeProfitPercent] = useState("12");
  const [riskLevel, setRiskLevel] = useState<BotRiskLevel>("medium");
  const [strategyLabel, setStrategyLabel] = useState(defaultStrategyLabel);
  const [allocationAmountUsd, setAllocationAmountUsd] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("settings");
      setLeverage("5x");
      setStopLossPercent("8");
      setTakeProfitPercent("12");
      setRiskLevel("medium");
      setStrategyLabel(defaultStrategyLabel);
      setAllocationAmountUsd("");
    }
  }, [defaultStrategyLabel, open]);

  const stopLossValue = Number.parseFloat(stopLossPercent);
  const takeProfitValue = Number.parseFloat(takeProfitPercent);
  const allocationValue = Number.parseFloat(allocationAmountUsd);

  const settingsValid =
    strategyLabel.trim().length > 0 &&
    Number.isFinite(stopLossValue) &&
    stopLossValue > 0 &&
    stopLossValue <= MAX_BOT_LOSS_PERCENT &&
    Number.isFinite(takeProfitValue) &&
    takeProfitValue > 0 &&
    takeProfitValue <= MAX_BOT_GAIN_PERCENT;

  const allocationValid =
    Number.isFinite(allocationValue) && allocationValue > 0 && allocationValue <= availableBalanceUsd;

  const summaryBadges = useMemo(
    () => [
      `${leverage} leverage`,
      `${riskLevel} risk`,
      `${stopLossPercent}% stop loss`,
      `${takeProfitPercent}% take profit`,
    ],
    [leverage, riskLevel, stopLossPercent, takeProfitPercent],
  );

  const handleStart = async () => {
    if (!settingsValid || !allocationValid) {
      return;
    }

    await onStart({
      leverage,
      stopLossPercent: stopLossValue,
      takeProfitPercent: takeProfitValue,
      riskLevel,
      strategyLabel: strategyLabel.trim(),
      allocationAmountUsd: allocationValue,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot size={18} className="text-gold" />
            Start AI Trading Bot
          </DialogTitle>
          <DialogDescription>
            Configure the bot first, then decide how much of the main wallet to allocate into the trading engine.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Setup progress</span>
              <span>{step === "settings" ? "Step 1 of 2" : "Step 2 of 2"}</span>
            </div>
            <Progress value={step === "settings" ? 50 : 100} />
          </div>

          {step === "settings" ? (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Leverage</Label>
                  <Select value={leverage} onValueChange={(value) => setLeverage(value as BotLeverage)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose leverage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1x">1x</SelectItem>
                      <SelectItem value="5x">5x</SelectItem>
                      <SelectItem value="10x">10x</SelectItem>
                      <SelectItem value="20x">20x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Risk level</Label>
                  <Select value={riskLevel} onValueChange={(value) => setRiskLevel(value as BotRiskLevel)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose risk level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stopLossPercent">Stop loss (%)</Label>
                  <Input
                    id="stopLossPercent"
                    type="number"
                    min="0.1"
                    max={MAX_BOT_LOSS_PERCENT}
                    step="0.1"
                    value={stopLossPercent}
                    onChange={(event) => setStopLossPercent(event.target.value)}
                    placeholder="8"
                  />
                  <p className="text-xs text-muted-foreground">Loss is capped at {MAX_BOT_LOSS_PERCENT}% of the allocated trade amount.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="takeProfitPercent">Take profit (%)</Label>
                  <Input
                    id="takeProfitPercent"
                    type="number"
                    min="0.1"
                    max={MAX_BOT_GAIN_PERCENT}
                    step="0.1"
                    value={takeProfitPercent}
                    onChange={(event) => setTakeProfitPercent(event.target.value)}
                    placeholder="12"
                  />
                  <p className="text-xs text-muted-foreground">Profit is capped at {MAX_BOT_GAIN_PERCENT}% of the allocated trade amount.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="strategyLabel">Strategy label</Label>
                <Input
                  id="strategyLabel"
                  value={strategyLabel}
                  onChange={(event) => setStrategyLabel(event.target.value)}
                  placeholder="Hybrid Insider Flow"
                />
              </div>

              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 text-gold" size={18} />
                  <div className="space-y-3">
                    <div className="font-medium text-foreground">Bot behavior preview</div>
                    <div className="flex flex-wrap gap-2">
                      {summaryBadges.map((item) => (
                        <Badge key={item} variant="outline">
                          {item}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      The simulation moves more gradually now and stays bounded between -{MAX_BOT_LOSS_PERCENT}% and +
                      {MAX_BOT_GAIN_PERCENT}% of the allocated trade amount.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-background/70 p-5">
                <div className="flex items-start gap-3">
                  <Wallet className="mt-0.5 text-gold" size={18} />
                  <div>
                    <div className="font-medium text-foreground">Fund allocation step</div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Move funds from the main wallet into the trading bot wallet. This is what powers the simulated
                      active trade.
                    </p>
                    <div className="mt-4 text-sm text-muted-foreground">
                      Available main wallet balance:{" "}
                      <span className="font-semibold text-foreground">{formatUsdCurrency(availableBalanceUsd)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allocationAmount">How much do you want to allocate to the trading bot?</Label>
                <Input
                  id="allocationAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={allocationAmountUsd}
                  onChange={(event) => setAllocationAmountUsd(event.target.value)}
                  placeholder="300.00"
                />
              </div>

              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    Main wallet after allocation:{" "}
                    <span className="font-semibold text-foreground">
                      {allocationValid ? formatUsdCurrency(availableBalanceUsd - allocationValue) : formatUsdCurrency(availableBalanceUsd)}
                    </span>
                  </div>
                  <div>
                    Bot wallet allocation:{" "}
                    <span className="font-semibold text-foreground">
                      {allocationValid ? formatUsdCurrency(allocationValue) : formatUsdCurrency(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "allocation" ? (
            <Button type="button" variant="outline" onClick={() => setStep("settings")}>
              Back
            </Button>
          ) : null}

          {step === "settings" ? (
            <Button type="button" disabled={!settingsValid} onClick={() => setStep("allocation")}>
              Continue
              <ArrowRight size={16} />
            </Button>
          ) : (
            <Button type="button" disabled={!allocationValid || isStarting} onClick={() => void handleStart()}>
              {isStarting ? "Starting..." : "Start Bot"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BotSetupDialog;
