import { useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, CheckCircle, Clock, Eye, RefreshCcw, Wallet, XCircle } from "lucide-react";

import { useAccountWorkflow } from "@/hooks/use-account-workflow";
import { formatUsdCurrency, type WorkflowSnapshot } from "@/lib/account-workflow";
import {
  getPendingDepositRequests,
  listenToPendingDepositRequests,
  reviewDepositRequest,
  type DepositRequestData,
} from "@/lib/firebase-deposits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";

interface RealtimeDepositConsoleProps {
  snapshot: WorkflowSnapshot;
}

const statusBadgeClassNames: Record<string, string> = {
  pending_review: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
};

const formatTimestamp = (timestamp: unknown): string => {
  if (!timestamp) return "Not yet recorded";

  try {
    const date =
      typeof timestamp === "object" && timestamp !== null && "toDate" in timestamp && typeof (timestamp as { toDate?: () => Date }).toDate === "function"
        ? (timestamp as { toDate: () => Date }).toDate()
        : new Date(timestamp as string | number | Date);

    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "Invalid date";
  }
};

const RealtimeDepositConsole = ({ snapshot }: RealtimeDepositConsoleProps) => {
  const { applyManualDepositReview, isApplyingDepositReview } = useAccountWorkflow();
  const [pendingRequests, setPendingRequests] = useState<DepositRequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected">("approved");
  const [creditedAmount, setCreditedAmount] = useState("");
  const [approvalMessage, setApprovalMessage] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<DepositRequestData | null>(null);
  const [hasFirebaseError, setHasFirebaseError] = useState(false);

  const localPendingRequests: DepositRequestData[] = snapshot.depositRequests
    .filter((request) => request.status === "pending_review")
    .map((request) => ({
      id: request.id,
      userId: snapshot.userId,
      tokenCode: request.tokenCode,
      tokenName: request.tokenName,
      networkLabel: request.networkLabel,
      address: request.address,
      requestedAmountUsd: request.requestedAmountUsd,
      creditedAmountUsd: request.creditedAmountUsd ?? 0,
      status: request.status,
      submittedAt: request.submittedAt,
      reviewedAt: request.reviewedAt,
      approvalMessage: request.approvalMessage,
      submittedByTelegramId: request.submittedByTelegramId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

  const refreshFromFirebase = async () => {
    try {
      const requests = await getPendingDepositRequests();
      setPendingRequests(requests);
      setHasFirebaseError(false);
    } catch (error) {
      console.error("Failed to fetch pending requests:", error);
      setHasFirebaseError(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setHasFirebaseError(false);

    const unsubscribe = listenToPendingDepositRequests((requests) => {
      setPendingRequests(requests);
      setIsLoading(false);
      setHasFirebaseError(false);
    });

    void refreshFromFirebase();

    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    void refreshFromFirebase();
  };

  const handleReview = async (
    request: DepositRequestData,
    status: "approved" | "rejected",
    options?: { creditedAmountUsd?: number | null; approvalMessage?: string },
  ) => {
    try {
      const creditedAmountUsd =
        status === "approved" ? options?.creditedAmountUsd ?? request.requestedAmountUsd : null;

      await reviewDepositRequest({
        requestId: request.id,
        status,
        creditedAmountUsd,
        approvalMessage:
          options?.approvalMessage ??
          (status === "approved"
            ? "Deposit approved and credited to wallet."
            : "Deposit request rejected."),
      });

      await applyManualDepositReview({
        requestId: request.id,
        status,
        userId: request.userId,
        creditedAmountUsd,
        approvalMessage: options?.approvalMessage,
      });

      toast.success(status === "approved" ? "Deposit approved!" : "Deposit rejected");
      await refreshFromFirebase();
    } catch (error) {
      console.error("Failed to process review:", error);
      toast.error("Failed to process review");
    }
  };

  const openReviewModal = (request: DepositRequestData, status: "approved" | "rejected") => {
    setSelectedRequest(request);
    setReviewStatus(status);
    setCreditedAmount(status === "approved" ? request.requestedAmountUsd.toFixed(2) : "");
    setApprovalMessage(
      status === "approved"
        ? `${request.tokenCode} deposit confirmed manually and ready to credit.`
        : `${request.tokenCode} deposit request rejected during manual review.`,
    );
    setShowReviewModal(true);
  };

  const handleModalSubmit = async () => {
    if (!selectedRequest) return;

    await handleReview(selectedRequest, reviewStatus, {
      creditedAmountUsd: reviewStatus === "approved" ? Number.parseFloat(creditedAmount) || selectedRequest.requestedAmountUsd : null,
      approvalMessage,
    });

    setShowReviewModal(false);
    setSelectedRequest(null);
  };

  const allPendingRequests = pendingRequests.length > 0 ? pendingRequests : localPendingRequests;
  const dataSource = pendingRequests.length > 0 ? "firebase" : localPendingRequests.length > 0 ? "local" : "none";

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge className="bg-gold text-primary-foreground">Real-time Admin Console</Badge>
              {dataSource === "firebase" ? (
                <Badge variant="outline" className="ml-2 border-emerald-500/50 text-emerald-500">
                  <span className="mr-1 h-2 w-2 rounded-full bg-emerald-500" />
                  Live
                </Badge>
              ) : null}
              {dataSource === "local" ? (
                <Badge variant="outline" className="ml-2 border-amber-500/50 text-amber-500">
                  Local Only
                </Badge>
              ) : null}
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCcw size={16} className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
          <CardTitle className="text-xl">Live Deposit Request Queue</CardTitle>
          <CardDescription>
            {dataSource === "firebase"
              ? "Real-time updates active. Changes sync instantly to user interfaces."
              : dataSource === "local"
                ? "Showing local requests only. Firebase sync may not be configured."
                : "Waiting for deposit requests..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={16} />
                Pending Review
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{allPendingRequests.length}</div>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet size={16} />
                Main Wallet
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{formatUsdCurrency(snapshot.mainWalletBalanceUsd)}</div>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BadgeCheck size={16} />
                Bot Wallet
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{formatUsdCurrency(snapshot.botWalletBalanceUsd)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-xl">Pending Deposit Requests</CardTitle>
          <CardDescription>Click on a request to approve or reject it.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <RefreshCcw size={20} className="mr-2 animate-spin" />
              Loading pending requests...
            </div>
          ) : hasFirebaseError && allPendingRequests.length === 0 ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-500">Firebase Connection Issue</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Unable to connect to Firebase for real-time updates. Check your Firebase configuration and ensure
                    Firestore is set up.
                  </p>
                </div>
              </div>
            </div>
          ) : allPendingRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center">
              <Clock className="mx-auto mb-3 h-8 w-8 text-gold" />
              <p className="font-medium text-foreground">No pending deposit requests</p>
              <p className="mt-1 text-sm text-muted-foreground">New requests will appear here when users submit deposits.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allPendingRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-border bg-background/70 p-5 transition-all hover:border-gold/50">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {request.tokenCode}
                        </Badge>
                        <Badge className={statusBadgeClassNames[request.status]}>{request.status.replace(/_/g, " ")}</Badge>
                        {dataSource === "local" ? (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Local
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-2xl font-semibold text-foreground">{formatUsdCurrency(request.requestedAmountUsd)}</div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">User:</span>
                          <span className="font-mono text-xs">{request.userId?.slice(0, 12)}...</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Network:</span>
                          <span>{request.networkLabel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Submitted:</span>
                          <span>{formatTimestamp(request.submittedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => void handleReview(request, "approved")}
                        disabled={isApplyingDepositReview}
                      >
                        <CheckCircle size={16} className="mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-rose-500/50 text-rose-500 hover:bg-rose-500/10"
                        onClick={() => void handleReview(request, "rejected")}
                        disabled={isApplyingDepositReview}
                      >
                        <XCircle size={16} className="mr-1" />
                        Reject
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openReviewModal(request, "approved")}>
                        <Eye size={16} className="mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showReviewModal && selectedRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{reviewStatus === "approved" ? "Approve" : "Reject"} Deposit Request</CardTitle>
              <CardDescription>Review the deposit details and confirm your decision.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-secondary p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Token</span>
                  <span className="font-medium">{selectedRequest.tokenCode}</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{formatUsdCurrency(selectedRequest.requestedAmountUsd)}</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-medium">{selectedRequest.networkLabel}</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-muted-foreground">User</span>
                  <span className="font-mono text-xs">{selectedRequest.userId?.slice(0, 12)}...</span>
                </div>
              </div>

              {reviewStatus === "approved" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Credited Amount (USD)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-border bg-background p-3"
                    value={creditedAmount}
                    onChange={(event) => setCreditedAmount(event.target.value)}
                    step="0.01"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="text-sm font-medium">Approval Message</label>
                <textarea
                  className="w-full rounded-lg border border-border bg-background p-3"
                  value={approvalMessage}
                  onChange={(event) => setApprovalMessage(event.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => void handleModalSubmit()} disabled={isApplyingDepositReview}>
                  {isApplyingDepositReview ? "Processing..." : "Confirm"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowReviewModal(false);
                    setSelectedRequest(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
};

export default RealtimeDepositConsole;
