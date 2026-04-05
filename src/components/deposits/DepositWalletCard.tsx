import { useEffect, useState } from "react";

import { ArrowLeft, ArrowRight, Check, Copy, Send, ShieldCheck } from "lucide-react";

import DepositQrPlaceholderDialog from "@/components/deposits/DepositQrPlaceholderDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import {
  formatUsdCurrency,
  formatWorkflowTimestamp,
  truncateAddress,
  type DepositRequest,
  type DepositWallet,
  type SubmitDepositRequestInput,
} from "@/lib/account-workflow";
import { getTelegramWebAppUserId } from "@/hooks/use-telegram";
import { cn } from "@/lib/utils";

interface DepositWalletCardProps {
  accountId: string;
  isSubmittingRequest: boolean;
  latestRequest?: DepositRequest;
  onSubmitDepositRequest: (input: SubmitDepositRequestInput) => Promise<void>;
  pendingRequestCount: number;
  wallet: DepositWallet;
  onOpenAddress?: (tokenCode: string) => void;
  onCloseAddress?: () => void;
  hidden?: boolean;
}

type DepositCardPhase = "amount" | "address";

const iconToneClasses: Record<DepositWallet["tokenCode"], string> = {
  ETH: "bg-sky-500/15 text-sky-300",
  USDT: "bg-emerald-500/15 text-emerald-300",
  BTC: "bg-amber-500/15 text-amber-300",
};

const requestToneClasses: Record<DepositRequest["status"], string> = {
  pending_review: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
};

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
};

const DepositWalletCard = ({
  accountId,
  isSubmittingRequest,
  latestRequest,
  onSubmitDepositRequest,
  pendingRequestCount,
  wallet,
  onOpenAddress,
  onCloseAddress,
  hidden,
}: DepositWalletCardProps) => {
  const [copied, setCopied] = useState(false);
  const [copiedAt, setCopiedAt] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [phase, setPhase] = useState<DepositCardPhase>("amount");

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 1800);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const amountUsd = Number.parseFloat(depositAmount);
  const hasValidAmount = Number.isFinite(amountUsd) && amountUsd > 0;

  const handleOpenAddress = () => {
    if (!hasValidAmount) {
      toast.error("Enter a valid deposit amount first.");
      return;
    }

    setPhase("address");
    if (onOpenAddress) onOpenAddress(wallet.tokenCode);
  };

  const handleCopyAddress = async () => {
    try {
      await copyText(wallet.address);
      setCopied(true);
      setCopiedAt(new Date().toISOString());
      toast.success(`${wallet.tokenCode} deposit address copied`);
    } catch {
      toast.error("Unable to copy the wallet address right now.");
    }
  };

  const handleBackToAmount = () => {
    setPhase("amount");
    setCopiedAt(null);
    if (onCloseAddress) onCloseAddress();
  };

  const handleSubmitDepositRequest = async () => {
    if (!hasValidAmount) {
      toast.error("Enter a valid deposit amount first.");
      return;
    }

    if (!copiedAt) {
      toast.error("Copy the wallet address before marking the deposit as sent.");
      return;
    }

    try {
      const telegramId = getTelegramWebAppUserId();
      await onSubmitDepositRequest({
        tokenCode: wallet.tokenCode,
        amountUsd,
        copiedAt,
        submittedByTelegramId: telegramId ?? null,
      });

      let sharedQueueSynced = false;

      // Try to mirror the request to the shared server queue for cross-browser admin visibility.
      try {
        const response = await fetch("/api/requests/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: `req-${Date.now()}`,
            account_id: accountId,
            token_code: wallet.tokenCode,
            token_name: wallet.tokenName,
            network_label: wallet.networkLabel,
            address: wallet.address,
            requested_amount_usd: amountUsd,
            copied_at: copiedAt,
            submitted_by_telegram_id: telegramId ?? null,
          }),
        });

        sharedQueueSynced = response.ok;
      } catch {}

      setDepositAmount("");
      setCopied(false);
      setCopiedAt(null);
      setPhase("amount");
      if (sharedQueueSynced) {
        toast.success(`${wallet.tokenCode} deposit request sent for shared review.`);
      } else {
        toast.success(`${wallet.tokenCode} deposit request sent for review.`);
        toast.warning("Shared queue sync failed, so this request may only appear in the current browser.");
      }
    } catch {
      toast.error("Unable to submit the deposit confirmation right now.");
    }
  };

  if (hidden) return null;

  return (
    <div className="relative min-h-[640px] pb-8" style={{ perspective: "1400px" }}>
      <div
        className="relative h-full transition-transform duration-700"
        style={{
          minHeight: "640px",
          transformStyle: "preserve-3d",
          transform: phase === "address" ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <Card
          className="absolute inset-0 border-border/80 bg-card/90"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <CardHeader className="space-y-6 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold",
                    iconToneClasses[wallet.tokenCode],
                  )}
                >
                  {wallet.tokenCode}
                </div>
                <div>
                  <CardTitle className="text-lg">{wallet.tokenName}</CardTitle>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{wallet.networkLabel}</Badge>
                    <Badge variant="secondary">Deposit flow</Badge>
                    {pendingRequestCount > 0 ? <Badge variant="outline">{pendingRequestCount} pending</Badge> : null}
                  </div>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>Linked account</div>
                <div className="mt-1 font-mono text-foreground">{accountId}</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="rounded-xl border border-border bg-background/70 p-6">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Step 1</div>
              <div className="mt-2 text-lg font-semibold text-foreground">How much would you like to deposit?</div>
              <p className="mt-3 text-sm text-muted-foreground">Enter the amount you'd like to deposit. The card will flip to reveal the deposit address.</p>
              <div className="mt-4 flex flex-col gap-3">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(event.target.value)}
                  placeholder="1000.00"
                />
                <Button type="button" onClick={handleOpenAddress}>
                  Continue to address
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>

            {latestRequest ? (
              <div className="rounded-xl border border-border bg-background/70 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Latest request</div>
                    <div className="mt-2 text-lg font-semibold text-foreground">
                      {formatUsdCurrency(latestRequest.requestedAmountUsd)}
                    </div>
                  </div>
                  <Badge className={requestToneClasses[latestRequest.status]}>
                    {latestRequest.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  Submitted {formatWorkflowTimestamp(latestRequest.submittedAt)}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {latestRequest.approvalMessage ?? "No manual review message yet."}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-border bg-background/70 p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 text-gold" size={16} />
                <div className="space-y-2 text-sm text-muted-foreground">
                  {wallet.instructions.map((instruction) => (
                    <p key={instruction}>{instruction}</p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="absolute inset-0 border-border/80 bg-card/90"
          style={{
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <CardHeader className="space-y-6 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold",
                    iconToneClasses[wallet.tokenCode],
                  )}
                >
                  {wallet.tokenCode}
                </div>
                <div>
                  <CardTitle className="text-lg">Send {wallet.tokenName}</CardTitle>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{wallet.networkLabel}</Badge>
                    <Badge variant="secondary">{hasValidAmount ? formatUsdCurrency(amountUsd) : "Amount pending"}</Badge>
                  </div>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleBackToAmount}>
                <ArrowLeft size={16} />
                Back
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="rounded-xl border border-border bg-background/70 p-6">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Step 2</div>
              <div className="mt-2 text-lg font-semibold text-foreground">Copy the  deposit address</div>
              <p className="mt-3 text-sm text-muted-foreground">After you copy the address, confirm that you've sent the deposit. The request will move to review.</p>
            </div>

            <div className="rounded-xl border border-border bg-background/70 p-6">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Deposit address</div>
              <div className="mt-2 font-mono text-sm text-foreground" title={wallet.address}>
                {truncateAddress(wallet.address, 10, 10)}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">The full address is copied to your clipboard when you press Copy.</p>
            </div>

            <div className="rounded-xl border border-border bg-background/70 p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 text-gold" size={16} />
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Planned deposit amount: <span className="font-semibold text-foreground">{hasValidAmount ? formatUsdCurrency(amountUsd) : "Not set"}</span></p>
                  <p>Copied at: <span className="font-medium text-foreground">{formatWorkflowTimestamp(copiedAt)}</span></p>
                  <p>When you click "I've Sent", your deposit awaits approval.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 relative z-10">
              <Button className="w-full sm:w-auto" type="button" onClick={handleCopyAddress}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied!" : "Copy address"}
              </Button>
              <Button
                className="w-full sm:w-auto"
                type="button"
                variant="outline"
                onClick={() => void handleSubmitDepositRequest()}
                disabled={!copiedAt || isSubmittingRequest}
              >
                <Send size={16} />
                {isSubmittingRequest ? "Sending..." : "I've Sent"}
              </Button>
              <div className="w-full sm:w-auto">
                <DepositQrPlaceholderDialog
                  address={wallet.address}
                  networkLabel={wallet.networkLabel}
                  tokenName={wallet.tokenName}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DepositWalletCard;
