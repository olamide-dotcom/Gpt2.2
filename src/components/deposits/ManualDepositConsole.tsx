import { useEffect, useMemo, useState } from "react";

import { BadgeCheck, Code2, RotateCcw, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import {
  formatUsdCurrency,
  formatWorkflowTimestamp,
  type DepositRequest,
  type ManualDepositReviewInput,
  type WalletBalanceOverrideInput,
  type WorkflowSnapshot,
} from "@/lib/account-workflow";

interface ManualDepositConsoleProps {
  isApplyingReview: boolean;
  isSavingWalletBalances: boolean;
  onApplyManualDepositReview: (input: ManualDepositReviewInput) => Promise<void>;
  onSetWalletBalances: (input: WalletBalanceOverrideInput) => Promise<void>;
  snapshot: WorkflowSnapshot;
}

const buildReviewDraft = (request: DepositRequest, status: ManualDepositReviewInput["status"]) =>
  JSON.stringify(
    {
      requestId: request.id,
      status,
      creditedAmountUsd: request.requestedAmountUsd,
      approvalMessage:
        status === "approved"
          ? `${request.tokenCode} deposit confirmed manually and ready to credit.`
          : `${request.tokenCode} deposit request rejected during manual review.`,
      walletBalanceOverrides: {
        mainWalletBalanceUsd: null,
        botWalletBalanceUsd: null,
      },
    },
    null,
    2,
  );

const buildBalanceDraft = (snapshot: WorkflowSnapshot) =>
  JSON.stringify(
    {
      mainWalletBalanceUsd: snapshot.mainWalletBalanceUsd,
      botWalletBalanceUsd: snapshot.botWalletBalanceUsd,
    },
    null,
    2,
  );

const parseOptionalNumber = (value: unknown, label: string) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsedValue = typeof value === "string" ? Number.parseFloat(value) : Number(value);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${label} must be a valid number.`);
  }

  return parsedValue;
};

const statusBadgeClassNames: Record<DepositRequest["status"], string> = {
  pending_review: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
};

const ManualDepositConsole = ({
  isApplyingReview,
  isSavingWalletBalances,
  onApplyManualDepositReview,
  onSetWalletBalances,
  snapshot,
}: ManualDepositConsoleProps) => {
  const sortedRequests = useMemo(
    () =>
      [...snapshot.depositRequests].sort(
        (left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
      ),
    [snapshot.depositRequests],
  );
  const pendingRequests = sortedRequests.filter((request) => request.status === "pending_review");
  const [editorMode, setEditorMode] = useState<"request" | "balance">(pendingRequests.length > 0 ? "request" : "balance");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(pendingRequests[0]?.id ?? sortedRequests[0]?.id ?? null);
  const [jsonDraft, setJsonDraft] = useState("");

  useEffect(() => {
    setSelectedRequestId((currentRequestId) => {
      if (editorMode === "balance") {
        return null;
      }

      if (currentRequestId && sortedRequests.some((request) => request.id === currentRequestId)) {
        return currentRequestId;
      }

      return pendingRequests[0]?.id ?? sortedRequests[0]?.id ?? null;
    });
  }, [editorMode, pendingRequests, sortedRequests]);

  useEffect(() => {
    if (editorMode === "balance") {
      return;
    }

    if (selectedRequestId) {
      return;
    }

    if (pendingRequests[0] || sortedRequests[0]) {
      setEditorMode("request");
    }
  }, [editorMode, pendingRequests, selectedRequestId, sortedRequests]);

  useEffect(() => {
    if (jsonDraft.trim().length > 0) {
      return;
    }

    if (editorMode === "request" && pendingRequests[0]) {
      setJsonDraft(buildReviewDraft(pendingRequests[0], "approved"));
      return;
    }

    setJsonDraft(buildBalanceDraft(snapshot));
  }, [editorMode, jsonDraft, pendingRequests, snapshot]);

  const selectedRequest = sortedRequests.find((request) => request.id === selectedRequestId) ?? null;

  const loadApprovalDraft = (request: DepositRequest, status: ManualDepositReviewInput["status"]) => {
    setEditorMode("request");
    setSelectedRequestId(request.id);
    setJsonDraft(buildReviewDraft(request, status));
  };

  const loadBalanceDraft = () => {
    setEditorMode("balance");
    setSelectedRequestId(null);
    setJsonDraft(buildBalanceDraft(snapshot));
  };

  const handleApplyJson = async () => {
    try {
      const parsedPayload = JSON.parse(jsonDraft) as Record<string, unknown>;

      if (parsedPayload && typeof parsedPayload === "object" && typeof parsedPayload.requestId === "string") {
        const status = parsedPayload.status;

        if (status !== "approved" && status !== "rejected") {
          throw new Error('Review JSON must set "status" to "approved" or "rejected".');
        }

        const walletBalanceOverrides =
          parsedPayload.walletBalanceOverrides &&
          typeof parsedPayload.walletBalanceOverrides === "object" &&
          !Array.isArray(parsedPayload.walletBalanceOverrides)
            ? {
                mainWalletBalanceUsd: parseOptionalNumber(
                  (parsedPayload.walletBalanceOverrides as Record<string, unknown>).mainWalletBalanceUsd,
                  "walletBalanceOverrides.mainWalletBalanceUsd",
                ),
                botWalletBalanceUsd: parseOptionalNumber(
                  (parsedPayload.walletBalanceOverrides as Record<string, unknown>).botWalletBalanceUsd,
                  "walletBalanceOverrides.botWalletBalanceUsd",
                ),
              }
            : undefined;

        await onApplyManualDepositReview({
          requestId: parsedPayload.requestId,
          status,
          creditedAmountUsd: parseOptionalNumber(parsedPayload.creditedAmountUsd, "creditedAmountUsd"),
          approvalMessage: typeof parsedPayload.approvalMessage === "string" ? parsedPayload.approvalMessage : undefined,
          walletBalanceOverrides,
        });

        setJsonDraft("");
        toast.success(status === "approved" ? "Deposit review approved." : "Deposit request rejected.");
        return;
      }

      const mainWalletBalanceUsd = parseOptionalNumber(parsedPayload.mainWalletBalanceUsd, "mainWalletBalanceUsd");
      const botWalletBalanceUsd = parseOptionalNumber(parsedPayload.botWalletBalanceUsd, "botWalletBalanceUsd");

      if (mainWalletBalanceUsd === undefined && botWalletBalanceUsd === undefined) {
        throw new Error(
          'JSON must either include "requestId" and "status" for a manual review or a wallet balance patch.',
        );
      }

      await onSetWalletBalances({
        mainWalletBalanceUsd,
        botWalletBalanceUsd,
      });

      setJsonDraft("");
      toast.success("Wallet balances updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to apply the JSON payload.");
    }
  };

  return (
    <Card className="border-border/80">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-gold text-primary-foreground">Manual review console</Badge>
          <Badge variant="secondary">{pendingRequests.length} pending</Badge>
        </div>
        <CardTitle className="text-xl">Approve deposits from local JSON</CardTitle>
        <CardDescription>
          Each deposit request stays in local state until you review it here. You can approve or reject the request,
          then optionally override wallet balances in the same JSON payload.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet size={16} className="text-gold" />
                Main wallet
              </div>
              <div className="mt-3 text-2xl font-semibold text-foreground">
                {formatUsdCurrency(snapshot.mainWalletBalanceUsd)}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BadgeCheck size={16} className="text-gold" />
                Bot wallet
              </div>
              <div className="mt-3 text-2xl font-semibold text-foreground">
                {formatUsdCurrency(snapshot.botWalletBalanceUsd)}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {sortedRequests.length > 0 ? (
              sortedRequests.map((request) => (
                <div
                  key={request.id}
                  className={`rounded-2xl border p-4 transition-colors ${
                    selectedRequestId === request.id
                      ? "border-gold bg-secondary/70"
                      : "border-border bg-background/70"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{request.tokenCode}</Badge>
                        <Badge className={statusBadgeClassNames[request.status]}>
                          {request.status.replaceAll("_", " ")}
                        </Badge>
                      </div>
                      <div className="text-lg font-semibold text-foreground">
                        {formatUsdCurrency(request.requestedAmountUsd)}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>Submitted {formatWorkflowTimestamp(request.submittedAt)}</div>
                      <div>Copied {formatWorkflowTimestamp(request.copiedAt)}</div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-muted-foreground">
                    {request.approvalMessage ?? "No review message added yet."}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loadApprovalDraft(request, "approved")}
                    >
                      Load approval JSON
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => loadApprovalDraft(request, "rejected")}
                    >
                      Load rejection JSON
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-sm text-muted-foreground">
                No deposit requests yet. Once a user clicks &quot;I&apos;ve sent now&quot; on a token card, the review payload will appear
                here.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-background/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Code2 size={16} className="text-gold" />
                Editable JSON payload
              </div>
              <div className="mt-2 font-semibold text-foreground">
                {selectedRequest ? `Review request ${selectedRequest.tokenCode}` : "Wallet balance patch"}
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={loadBalanceDraft}>
              <RotateCcw size={16} />
              Load balance JSON
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manualReviewJson">JSON payload</Label>
            <Textarea
              id="manualReviewJson"
              className="min-h-[320px] font-mono text-xs"
              value={jsonDraft}
              onChange={(event) => setJsonDraft(event.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-4 text-sm text-muted-foreground">
            Use `requestId` and `status` to review a deposit request. Use `walletBalanceOverrides` in the same payload
            if you want to set a final wallet number manually. For direct balance edits, load the balance JSON instead.
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => void handleApplyJson()}
              disabled={isApplyingReview || isSavingWalletBalances}
            >
              {isApplyingReview || isSavingWalletBalances ? "Applying..." : "Apply JSON"}
            </Button>
            {selectedRequest ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => loadApprovalDraft(selectedRequest, "approved")}
              >
                Reload approval JSON
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ManualDepositConsole;
