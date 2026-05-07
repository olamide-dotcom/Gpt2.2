import { useEffect, useState } from "react";
import { CheckCircle, Clock, XCircle, RefreshCcw, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculateDepositBonusUsd,
  DEPOSIT_BONUS_PERCENT,
  formatUsdCurrency,
  getDepositTotalWithBonusUsd,
  type DepositRequest,
} from "@/lib/account-workflow";
import {
  listenToUserDepositRequests,
  type DepositRequestData,
} from "@/lib/firebase-deposits";

interface RealtimeDepositStatusProps {
  userId: string | null | undefined;
  existingRequests: DepositRequest[];
}

const convertToLocaleRequest = (data: DepositRequestData): DepositRequest => ({
  id: data.id,
  tokenCode: data.tokenCode,
  tokenName: data.tokenName,
  networkLabel: data.networkLabel,
  address: data.address,
  requestedAmountUsd: data.requestedAmountUsd,
  creditedAmountUsd: data.creditedAmountUsd,
  depositBonusUsd: data.depositBonusUsd ?? null,
  totalCreditedAmountUsd: data.totalCreditedAmountUsd ?? null,
  status: data.status,
  copiedAt: null,
  submittedAt: data.submittedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  reviewedAt: data.reviewedAt?.toDate?.()?.toISOString() || null,
  approvalMessage: data.approvalMessage,
  submittedByTelegramId: data.submittedByTelegramId,
});

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending_review: {
    icon: Clock,
    color: "text-amber-500",
    label: "Waiting",
  },
  approved: {
    icon: CheckCircle,
    color: "text-emerald-500",
    label: "Approved",
  },
  rejected: {
    icon: XCircle,
    color: "text-rose-500",
    label: "Rejected",
  },
};

const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return "Not yet recorded";
  try {
    const date = timestamp.toDate?.() || new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "Invalid date";
  }
};

const RealtimeDepositStatus = ({ userId, existingRequests }: RealtimeDepositStatusProps) => {
  const [requests, setRequests] = useState<DepositRequest[]>(existingRequests);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Set up real-time listener for user's deposit requests
  useEffect(() => {
    if (!userId) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = listenToUserDepositRequests(userId, (firebaseRequests) => {
      const localRequests = firebaseRequests.map(convertToLocaleRequest);
      setRequests(localRequests);
      setLastUpdate(new Date());
      setIsLoading(false);
      setIsOnline(true);
    });

    // Handle connection issues
    const handleOffline = () => setIsOnline(false);
    const handleOnline = () => setIsOnline(true);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      unsubscribe();
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [userId]);

  const pendingCount = requests.filter((r) => r.status === "pending_review").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  return (
    <Card className="border-border/80">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-gold text-primary-foreground">Live funding status</Badge>
            {isOnline ? (
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/50">
                <span className="mr-1 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                Reconnecting...
              </Badge>
            )}
          </div>
          {lastUpdate && (
            <div className="text-xs text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
        <CardTitle className="text-xl">Your funding updates</CardTitle>
        <CardDescription>
          Follow every funding request here and see updates without leaving the page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Status Summary */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2 text-amber-500">
              <Clock size={16} />
              <span className="text-sm font-medium">Waiting</span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {pendingCount}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle size={16} />
              <span className="text-sm font-medium">Approved</span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {approvedCount}
            </div>
          </div>
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
            <div className="flex items-center gap-2 text-rose-500">
              <XCircle size={16} />
              <span className="text-sm font-medium">Rejected</span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {rejectedCount}
            </div>
          </div>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCcw size={20} className="animate-spin mr-2" />
            Loading your funding updates...
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center">
            <Clock className="mx-auto mb-3 h-8 w-8 text-gold" />
            <p className="font-medium text-foreground">No funding requests yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              As soon as you send a funding request, it will appear here and update automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const status = statusConfig[request.status] || statusConfig.pending_review;
              const StatusIcon = status.icon;
              const approvedDepositAmountUsd =
                request.creditedAmountUsd ?? (request.status === "approved" ? request.requestedAmountUsd : null);
              const depositBonusUsd =
                request.depositBonusUsd ??
                (approvedDepositAmountUsd != null ? calculateDepositBonusUsd(approvedDepositAmountUsd) : null);
              const totalCreditedAmountUsd =
                request.totalCreditedAmountUsd ??
                (approvedDepositAmountUsd != null ? getDepositTotalWithBonusUsd(approvedDepositAmountUsd) : null);

              return (
                <div
                  key={request.id}
                  className={`rounded-xl border p-5 transition-all ${
                    request.status === "pending_review"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : request.status === "approved"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-rose-500/30 bg-rose-500/5"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {request.tokenCode}
                        </Badge>
                        <Badge
                          className={`${
                            request.status === "pending_review"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : request.status === "approved"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          }`}
                        >
                          <StatusIcon size={12} className="mr-1" />
                          {status.label}
                        </Badge>
                      </div>

                      <div className="text-2xl font-semibold text-foreground">
                        {formatUsdCurrency(request.requestedAmountUsd)}
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Network:</span>
                          <span>{request.networkLabel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Submitted:</span>
                          <span>{formatTimestamp(request.submittedAt)}</span>
                        </div>
                        {request.reviewedAt && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {request.status === "approved" ? "Approved" : "Rejected"}:
                            </span>
                            <span>{formatTimestamp(request.reviewedAt)}</span>
                          </div>
                        )}
                        {approvedDepositAmountUsd != null && request.status === "approved" ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Deposit received:</span>
                              <span className="font-semibold text-foreground">
                                {formatUsdCurrency(approvedDepositAmountUsd)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{DEPOSIT_BONUS_PERCENT}% bonus:</span>
                              <span className="font-semibold text-emerald-500">
                                {formatUsdCurrency(depositBonusUsd ?? 0)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Total added to balance:</span>
                              <span className="font-semibold text-emerald-500">
                                {formatUsdCurrency(totalCreditedAmountUsd ?? approvedDepositAmountUsd)}
                              </span>
                            </div>
                          </>
                        ) : null}
                      </div>

                      {request.approvalMessage && request.reviewedAt && (
                        <div className="rounded-lg bg-secondary p-3 text-sm">
                          <div className="flex items-start gap-2">
                            {request.status === "approved" ? (
                              <CheckCircle size={16} className="mt-0.5 text-emerald-500 shrink-0" />
                            ) : (
                              <AlertCircle size={16} className="mt-0.5 text-rose-500 shrink-0" />
                            )}
                            <p className="text-muted-foreground">{request.approvalMessage}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Real-time indicator for pending requests */}
                    {request.status === "pending_review" && (
                      <div className="flex items-center gap-2 text-sm text-amber-500">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>Waiting for review</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-6 rounded-xl border border-gold/30 bg-gold/10 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-gold animate-pulse" />
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Live tracking is on</span>
              <p className="mt-1">
                When your funding request is checked, this page updates automatically and shows the extra {DEPOSIT_BONUS_PERCENT}% on every approved deposit.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealtimeDepositStatus;
