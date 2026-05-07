import { useState } from "react";
import { useNavigate } from "react-router-dom";

import JourneyShell from "@/components/JourneyShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";
import {
  DEPOSIT_BONUS_PERCENT,
  VERIFICATION_BONUS_USD,
  formatWorkflowTimestamp,
  formatUsdCurrency,
  getWithdrawableBalance,
  hasConfirmedDepositCredit,
} from "@/lib/account-workflow";

const WithdrawPage = () => {
  const navigate = useNavigate();
  const { snapshot, submitIdVerification, isSubmittingIdVerification } = useAccountWorkflow();
  const [idType, setIdType] = useState<string>("passport");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);

  const mainBalance = snapshot?.mainWalletBalanceUsd ?? 0;
  const bonusUsd = snapshot?.bonusUsd ?? VERIFICATION_BONUS_USD;
  const approvedRequests = snapshot?.idVerificationRequests?.filter((request) => request.status === "approved") ?? [];
  const pendingRequests = snapshot?.idVerificationRequests?.filter((request) => request.status === "pending_review") ?? [];
  const hasConfirmedDeposit = snapshot ? hasConfirmedDepositCredit(snapshot) : false;
  const withdrawableBalance = snapshot ? getWithdrawableBalance(snapshot) : 0;
  const maxPending = pendingRequests.length >= 5;

  const handleFile = (file?: File | null) => {
    if (!file) {
      setFileName(null);
      setFileData(null);
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!idType) {
      return;
    }

    if (maxPending) {
      toast.error("You already have 5 verification requests waiting. Please wait for a decision first.");
      return;
    }

    try {
      await submitIdVerification({ idType, fileName, fileDataBase64: fileData ?? null });
      toast.success("Your document has been sent for review.");
    } catch {
      toast.error("We could not send your document right now.");
    }
  };

  return (
    <JourneyShell
      stage="withdraw"
      title="Withdraw"
      description="See what has returned to your main wallet, what is cash-out eligible, and what still needs a confirmed deposit first."
    >
      <div className="space-y-6">
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-gold text-primary-foreground">Withdrawal status</Badge>
              {hasConfirmedDeposit ? <Badge variant="secondary">Deposit confirmed</Badge> : <Badge variant="outline">Deposit needed first</Badge>}
            </div>
            <CardTitle className="text-xl">What you can withdraw right now</CardTitle>
            <CardDescription>
              Your bot sessions can return to your main wallet automatically. Every approved deposit adds {DEPOSIT_BONUS_PERCENT}% extra, and a confirmed deposit is still required before any amount becomes ready for cash-out.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="text-sm text-muted-foreground">Main wallet</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{formatUsdCurrency(mainBalance)}</div>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="text-sm text-muted-foreground">Starter balance</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{formatUsdCurrency(bonusUsd)}</div>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="text-sm text-muted-foreground">Withdrawable now</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{formatUsdCurrency(withdrawableBalance)}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-5 text-sm text-muted-foreground">
              {hasConfirmedDeposit ? (
                <p>
                  Your account has a confirmed deposit, so balances already back in your main wallet can become available for withdrawal once your review is approved.
                </p>
              ) : (
                <p>
                  Your {formatUsdCurrency(bonusUsd)} starter balance is there to get you started with the AI bot. It can keep cycling through sessions, but you still need your first confirmed deposit before any amount can be cashed out.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => navigate("/dashboard")}>
                Back to trade room
              </Button>
              {!hasConfirmedDeposit ? (
                <Button type="button" variant="outline" onClick={() => navigate("/deposit")}>
                  Go to funding
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-xl">Withdrawal verification</CardTitle>
            <CardDescription>Send your document once so your cash-out request can be checked and approved.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Document type</Label>
              <select value={idType} onChange={(event) => setIdType(event.target.value)} className="w-full rounded-md border p-2">
                <option value="passport">Passport</option>
                <option value="drivers-license">Driver&apos;s license</option>
                <option value="national-id">National ID</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Upload document</Label>
              <Input type="file" onChange={(event) => handleFile(event.target.files?.[0] ?? null)} />
              {fileName ? <div className="text-sm text-muted-foreground">Selected: {fileName}</div> : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmittingIdVerification}>
                {isSubmittingIdVerification ? "Sending..." : "Send for review"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                Back to trade room
              </Button>
            </div>

            {pendingRequests.length > 0 ? (
              <div className="rounded-2xl border border-amber-300/30 bg-amber-50/10 p-4 text-sm">
                <div className="font-semibold text-foreground">Verification in progress</div>
                <div className="text-muted-foreground">Your document is being reviewed right now.</div>
                <div className="mt-3 space-y-2">
                  {pendingRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">{request.idType}</div>
                        <div className="text-xs text-muted-foreground">Sent {formatWorkflowTimestamp(request.submittedAt)}</div>
                      </div>
                      <div className="text-sm capitalize text-muted-foreground">{request.status.replaceAll("_", " ")}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {approvedRequests.length > 0 ? (
              <div className="rounded-2xl border border-emerald-300/30 bg-emerald-50/10 p-4 text-sm">
                <div className="font-semibold text-foreground">Verification approved</div>
                <div className="text-muted-foreground">Your document has already been approved for withdrawals.</div>
                <div className="mt-3 space-y-2">
                  {approvedRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">{request.idType}</div>
                        <div className="text-xs text-muted-foreground">
                          Approved {request.reviewedAt ? formatWorkflowTimestamp(request.reviewedAt) : "recently"}
                        </div>
                      </div>
                      <Badge variant="secondary">Approved</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </JourneyShell>
  );
};

export default WithdrawPage;
