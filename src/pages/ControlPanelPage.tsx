import { useEffect, useMemo, useState } from "react";

import JourneyShell from "@/components/JourneyShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";
import {
  calculateDepositBonusUsd,
  DEPOSIT_BONUS_PERCENT,
  formatUsdCurrency,
  getDepositTotalWithBonusUsd,
  type IdVerificationRequest,
} from "@/lib/account-workflow";
import {
  getPendingDepositRequests,
  listenToPendingDepositRequests,
  reviewDepositRequest,
  type DepositRequestData,
} from "@/lib/firebase-deposits";
import {
  getAllUsers,
  listenToAllUsers,
  updateUserProfileDetails,
  updateUserStatus,
  type UserData,
  type UserStatus,
} from "@/lib/firebase";
import { cn } from "@/lib/utils";

type AddressDraft = {
  ETH: string;
  USDT: string;
  BTC: string;
  SOL: string;
};

type UserEditorDraft = {
  username: string;
  fullName: string;
  email: string;
  walletAddress: string;
  kycStatus: "pending" | "approved" | "rejected";
  mainWalletBalanceUsd: string;
  botWalletBalanceUsd: string;
  addresses: AddressDraft;
};

type PendingIdReviewItem = {
  userId: string;
  request: IdVerificationRequest;
};

const toTimestampMs = (value: unknown): number => {
  if (!value) return 0;
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  const parsed = new Date(value as string | number | Date).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatTimestamp = (value: unknown) => {
  const timestampMs = toTimestampMs(value);
  if (!timestampMs) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestampMs);
};

const formatStepLabel = (value: string | undefined) =>
  value
    ? value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Not started";

const sortUsersForControlPanel = (users: UserData[]) =>
  [...users].sort((left, right) => {
    const leftLabel = (left.username || left.fullName || left.email || left.userId).toLowerCase();
    const rightLabel = (right.username || right.fullName || right.email || right.userId).toLowerCase();
    return leftLabel.localeCompare(rightLabel);
  });

const getUserPrimaryLabel = (user: UserData | undefined | null) =>
  user?.fullName || (user?.username ? `@${user.username}` : null) || user?.email || user?.userId || "Unknown user";

const getUserSecondaryLabel = (user: UserData) =>
  user.email || (user.username ? `@${user.username}` : null) || user.userId;

const shouldShowInControlPanel = (user: UserData) => {
  const snapshotIdentity = user.workflowSnapshot?.identityChecks;
  const hasWorkflowActivity =
    (user.workflowSnapshot?.completedStepIds.length ?? 0) > 0 ||
    (user.workflowSnapshot?.depositRequests.length ?? 0) > 0 ||
    (user.workflowSnapshot?.idVerificationRequests.length ?? 0) > 0 ||
    (user.workflowSnapshot?.depositAddresses.length ?? 0) > 0;

  return Boolean(
    user.username ||
      user.fullName ||
      user.email ||
      user.walletAddress ||
      user.telegramUserId ||
      snapshotIdentity?.fullName ||
      snapshotIdentity?.email ||
      hasWorkflowActivity ||
      typeof user.depositAmount === "number" ||
      typeof user.mainWalletBalanceUsd === "number" ||
      typeof user.botWalletBalanceUsd === "number",
  );
};

const createAddressDraft = (user: UserData): AddressDraft => {
  const walletMap = Object.fromEntries(
    (user.workflowSnapshot?.depositAddresses ?? []).map((wallet) => [wallet.tokenCode, wallet.address]),
  );

  return {
    ETH: typeof walletMap.ETH === "string" ? walletMap.ETH : "",
    USDT: typeof walletMap.USDT === "string" ? walletMap.USDT : "",
    BTC: typeof walletMap.BTC === "string" ? walletMap.BTC : "",
    SOL: typeof walletMap.SOL === "string" ? walletMap.SOL : "",
  };
};

const createUserEditorDraft = (user: UserData): UserEditorDraft => ({
  username: user.username ?? "",
  fullName: user.fullName ?? user.workflowSnapshot?.identityChecks.fullName ?? "",
  email: user.email ?? user.workflowSnapshot?.identityChecks.email ?? "",
  walletAddress: user.walletAddress ?? "",
  kycStatus: user.kycStatus ?? "pending",
  mainWalletBalanceUsd: String(user.mainWalletBalanceUsd ?? user.depositAmount ?? 0),
  botWalletBalanceUsd: String(user.botWalletBalanceUsd ?? 0),
  addresses: createAddressDraft(user),
});

const matchesUserSearch = (user: UserData, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [user.userId, user.username, user.fullName, user.email, user.telegramUserId]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalizedQuery));
};

const getDepositReviewPreview = (amountUsd: number) => ({
  depositAmountUsd: amountUsd,
  depositBonusUsd: calculateDepositBonusUsd(amountUsd),
  totalCreditedAmountUsd: getDepositTotalWithBonusUsd(amountUsd),
});

const ControlPanelPage = () => {
  const {
    applyManualDepositReview,
    applyManualIdReview,
    isApplyingDepositReview,
    isApplyingIdReview,
    isLoading,
    isSavingDepositAddresses,
    isSavingWalletBalances,
    setDepositAddresses,
    setWalletBalances,
    snapshot,
  } = useAccountWorkflow();

  const [passcode, setPasscode] = useState("");
  const [passError, setPassError] = useState("");
  const [firebaseRequests, setFirebaseRequests] = useState<DepositRequestData[]>([]);
  const [sharedUsers, setSharedUsers] = useState<UserData[]>([]);
  const [loadingFirebaseRequests, setLoadingFirebaseRequests] = useState(false);
  const [loadingSharedUsers, setLoadingSharedUsers] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);
  const [reviewingIdRequestId, setReviewingIdRequestId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [savingProfileUserId, setSavingProfileUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserDraft, setSelectedUserDraft] = useState<UserEditorDraft | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem("controlpanel-unlocked") === "1";
    } catch {
      return false;
    }
  });

  const applyUsersSnapshot = (users: UserData[]) => {
    setSharedUsers(sortUsersForControlPanel(users));
    setLoadingSharedUsers(false);
  };

  const refreshPanelData = async () => {
    setLoadingSharedUsers(true);
    setLoadingFirebaseRequests(true);

    try {
      const [users, requests] = await Promise.all([getAllUsers(), getPendingDepositRequests()]);
      applyUsersSnapshot(users);
      setFirebaseRequests(requests);
    } catch (error) {
      console.error("refresh control panel data failed", error);
      toast.error("Could not refresh the control panel right now");
    } finally {
      setLoadingSharedUsers(false);
      setLoadingFirebaseRequests(false);
    }
  };

  useEffect(() => {
    if (!unlocked) {
      return;
    }

    setLoadingSharedUsers(true);
    setLoadingFirebaseRequests(true);
    void refreshPanelData();

    const unsubscribeUsers = listenToAllUsers((users) => {
      applyUsersSnapshot(users);
    });

    const unsubscribeFirebaseRequests = listenToPendingDepositRequests((requests) => {
      setFirebaseRequests(requests);
      setLoadingFirebaseRequests(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeFirebaseRequests();
    };
  }, [unlocked]);

  const pendingRequestUserIds = useMemo(() => new Set(firebaseRequests.map((request) => request.userId)), [firebaseRequests]);

  const controlPanelUsers = useMemo(
    () =>
      sortUsersForControlPanel(
        sharedUsers.filter((user) => shouldShowInControlPanel(user) || pendingRequestUserIds.has(user.userId)),
      ),
    [pendingRequestUserIds, sharedUsers],
  );

  const filteredUsers = useMemo(
    () => controlPanelUsers.filter((user) => matchesUserSearch(user, userSearch)),
    [controlPanelUsers, userSearch],
  );

  useEffect(() => {
    if (!unlocked) {
      setSelectedUserId(null);
      setSelectedUserDraft(null);
      return;
    }

    if (filteredUsers.length === 0) {
      setSelectedUserId(null);
      setSelectedUserDraft(null);
      return;
    }

    setSelectedUserId((current) => (current && filteredUsers.some((user) => user.userId === current) ? current : filteredUsers[0].userId));
  }, [filteredUsers, unlocked]);

  const selectedUser = useMemo(
    () => controlPanelUsers.find((user) => user.userId === selectedUserId) ?? null,
    [controlPanelUsers, selectedUserId],
  );

  useEffect(() => {
    if (!selectedUser) {
      setSelectedUserDraft(null);
      return;
    }

    setSelectedUserDraft(createUserEditorDraft(selectedUser));
  }, [selectedUser]);

  const usersById = useMemo(
    () => new Map(controlPanelUsers.map((user) => [user.userId, user])),
    [controlPanelUsers],
  );

  const pendingIdReviews = useMemo<PendingIdReviewItem[]>(
    () =>
      controlPanelUsers
        .flatMap((user) =>
          (user.workflowSnapshot?.idVerificationRequests ?? [])
            .filter((request) => request.status === "pending_review")
            .map((request) => ({
              userId: user.userId,
              request,
            })),
        )
        .sort((left, right) => toTimestampMs(right.request.submittedAt) - toTimestampMs(left.request.submittedAt)),
    [controlPanelUsers],
  );

  const pendingReviewCountByUserId = useMemo(() => {
    const counts = new Map<string, number>();

    for (const request of firebaseRequests) {
      counts.set(request.userId, (counts.get(request.userId) ?? 0) + 1);
    }

    for (const review of pendingIdReviews) {
      counts.set(review.userId, (counts.get(review.userId) ?? 0) + 1);
    }

    return counts;
  }, [firebaseRequests, pendingIdReviews]);

  const selectedUserPendingRequests = useMemo(
    () => (selectedUser ? firebaseRequests.filter((request) => request.userId === selectedUser.userId) : []),
    [firebaseRequests, selectedUser],
  );
  const selectedUserPendingIdReviews = useMemo(
    () =>
      selectedUser
        ? (selectedUser.workflowSnapshot?.idVerificationRequests ?? []).filter((request) => request.status === "pending_review")
        : [],
    [selectedUser],
  );

  const approvedUserCount = controlPanelUsers.filter((user) => user.status === "approved").length;
  const pendingUserCount = controlPanelUsers.filter((user) => user.status === "pending").length;
  const rejectedUserCount = controlPanelUsers.filter((user) => user.status === "rejected").length;

  const handleUnlock = () => {
    setPassError("");

    if (passcode === "0803") {
      try {
        sessionStorage.setItem("controlpanel-unlocked", "1");
      } catch {
        // Session storage can be unavailable in restricted browser contexts.
      }

      setUnlocked(true);
      return;
    }

    setPassError("Incorrect passcode. Try again.");
  };

  const openUser = (userId: string) => {
    setUserSearch("");
    setSelectedUserId(userId);
    const user = usersById.get(userId);
    if (user) {
      setSelectedUserDraft(createUserEditorDraft(user));
    }
  };

  const handleFirebaseRequestReview = async (request: DepositRequestData, status: "approved" | "rejected") => {
    setReviewingRequestId(request.id);

    try {
      const creditedAmountUsd = status === "approved" ? request.requestedAmountUsd : null;
      const approvalMessage =
        status === "approved"
          ? `Approved by control panel. Deposit amount plus ${DEPOSIT_BONUS_PERCENT}% bonus credited to wallet.`
          : "Rejected by control panel";

      await reviewDepositRequest({
        requestId: request.id,
        status,
        creditedAmountUsd,
        approvalMessage,
      });

      await applyManualDepositReview({
        requestId: request.id,
        status,
        userId: request.userId,
        creditedAmountUsd,
        approvalMessage,
      });

      setFirebaseRequests((current) => current.filter((item) => item.id !== request.id));
      toast.success(status === "approved" ? "Deposit approved" : "Deposit rejected");
    } catch (error) {
      console.error("review firebase request failed", error);
      toast.error("Failed to update deposit request");
      void refreshPanelData();
    } finally {
      setReviewingRequestId(null);
    }
  };

  const handleIdVerificationReview = async (
    userId: string,
    request: IdVerificationRequest,
    status: "approved" | "rejected",
  ) => {
    setReviewingIdRequestId(request.id);

    try {
      await applyManualIdReview({
        userId,
        requestId: request.id,
        status,
        approvalMessage:
          status === "approved"
            ? "Withdrawal verification approved by control panel"
            : "Withdrawal verification rejected by control panel",
      });

      toast.success(status === "approved" ? "Verification approved" : "Verification rejected");
    } catch (error) {
      console.error("review id verification failed", error);
      toast.error("Failed to update verification review");
      void refreshPanelData();
    } finally {
      setReviewingIdRequestId(null);
    }
  };

  const handleSelectedUserStatusUpdate = async (status: UserStatus) => {
    if (!selectedUser) {
      return;
    }

    setUpdatingUserId(selectedUser.userId);

    try {
      await updateUserStatus(selectedUser.userId, status);
      toast.success(`User marked ${status}`);
    } catch (error) {
      console.error("update shared user status failed", error);
      toast.error("Failed to update user status");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleSelectedUserProfileSave = async () => {
    if (!selectedUser || !selectedUserDraft) {
      return;
    }

    setSavingProfileUserId(selectedUser.userId);

    try {
      await updateUserProfileDetails(selectedUser.userId, {
        username: selectedUserDraft.username.trim() || undefined,
        fullName: selectedUserDraft.fullName.trim() || undefined,
        email: selectedUserDraft.email.trim() || undefined,
        walletAddress: selectedUserDraft.walletAddress.trim() || undefined,
        kycStatus: selectedUserDraft.kycStatus,
      });

      toast.success("User details updated");
    } catch (error) {
      console.error("update selected user profile failed", error);
      toast.error("Failed to update user details");
    } finally {
      setSavingProfileUserId(null);
    }
  };

  const handleSelectedUserBalancesSave = async () => {
    if (!selectedUser || !selectedUserDraft) {
      return;
    }

    try {
      await setWalletBalances({
        userId: selectedUser.userId,
        mainWalletBalanceUsd: Number.parseFloat(selectedUserDraft.mainWalletBalanceUsd) || 0,
        botWalletBalanceUsd: Number.parseFloat(selectedUserDraft.botWalletBalanceUsd) || 0,
      });

      toast.success("Wallet balances updated");
    } catch (error) {
      console.error("update selected user balances failed", error);
      toast.error("Failed to update wallet balances");
    }
  };

  const handleSelectedUserAddressesSave = async () => {
    if (!selectedUser || !selectedUserDraft) {
      return;
    }

    try {
      await setDepositAddresses({
        userId: selectedUser.userId,
        addresses: selectedUserDraft.addresses,
      });

      toast.success("Deposit addresses updated");
    } catch (error) {
      console.error("update selected user addresses failed", error);
      toast.error("Failed to update deposit addresses");
    }
  };

  if (isLoading || !snapshot) {
    return (
      <JourneyShell stage="admin" title="Load control panel" description="Preparing the live request queue and user controls.">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-xl">Loading control panel</CardTitle>
            <CardDescription>Bringing the approval tools into view.</CardDescription>
          </CardHeader>
        </Card>
      </JourneyShell>
    );
  }

  return (
    <JourneyShell
      stage="admin"
      title="Control panel"
      description="Track pending reviews, open any user, and manage account details from one clean workspace."
    >
      <div className="space-y-6">
        {!unlocked ? (
          <Card className="border-border/80">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-gold text-primary-foreground">Passcode required</Badge>
              </div>
              <CardTitle className="text-xl">Enter control panel passcode</CardTitle>
              <CardDescription>Enter the passcode to open the admin workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-sm space-y-3">
                <Input
                  type="password"
                  placeholder="Enter passcode"
                  value={passcode}
                  onChange={(event) => setPasscode(event.target.value)}
                />
                {passError ? <div className="text-sm text-rose-400">{passError}</div> : null}
                <Button onClick={handleUnlock}>Unlock</Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {unlocked ? (
          <>
            <Card className="border-border/80">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">Admin overview</CardTitle>
                    <CardDescription>Everything is arranged around the live queue and one selected user at a time.</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => void refreshPanelData()}>
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Badge className="bg-gold text-primary-foreground">
                  {firebaseRequests.length} pending review{firebaseRequests.length === 1 ? "" : "s"}
                </Badge>
                <Badge variant="secondary">
                  {pendingIdReviews.length} withdrawal review{pendingIdReviews.length === 1 ? "" : "s"}
                </Badge>
                <Badge variant="secondary">
                  {controlPanelUsers.length} user{controlPanelUsers.length === 1 ? "" : "s"}
                </Badge>
                <Badge variant="outline">{approvedUserCount} approved</Badge>
                <Badge variant="outline">{pendingUserCount} pending</Badge>
                <Badge variant="outline">{rejectedUserCount} rejected</Badge>
              </CardContent>
            </Card>

            <Card className="border-border/80">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-gold text-primary-foreground">Pending reviews</Badge>
                    <CardTitle className="text-lg">Deposit review queue</CardTitle>
                  </div>
                  <Badge variant="secondary">{firebaseRequests.length} waiting</Badge>
                </div>
                <CardDescription>
                  Only pending reviews stay here. Once you approve or reject one, it leaves this queue.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingFirebaseRequests ? (
                  <div className="text-sm text-muted-foreground">Loading pending reviews...</div>
                ) : firebaseRequests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No deposits are waiting for review right now.
                  </div>
                ) : (
                  firebaseRequests.map((request) => {
                    const requestUser = usersById.get(request.userId);
                    const requestPreview = getDepositReviewPreview(request.requestedAmountUsd);

                    return (
                      <div key={request.id} className="rounded-2xl border border-border bg-background/60 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-1">
                            <div className="font-semibold text-foreground">
                              {request.tokenCode} deposit for {request.requestedAmountUsd.toFixed(2)} USD
                            </div>
                            <div className="text-sm text-muted-foreground">{getUserPrimaryLabel(requestUser)}</div>
                            <div className="text-sm text-muted-foreground">
                              {request.networkLabel} - Submitted {formatTimestamp(request.submittedAt)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Bonus on approval: {formatUsdCurrency(requestPreview.depositBonusUsd)}. Total added: {formatUsdCurrency(requestPreview.totalCreditedAmountUsd)}.
                            </div>
                            <div className="text-xs text-muted-foreground">User ID: {request.userId}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => openUser(request.userId)}>
                              Open user
                            </Button>
                            <Button
                              size="sm"
                              disabled={reviewingRequestId === request.id || isApplyingDepositReview}
                              onClick={() => void handleFirebaseRequestReview(request, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={reviewingRequestId === request.id || isApplyingDepositReview}
                              onClick={() => void handleFirebaseRequestReview(request, "rejected")}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-gold text-primary-foreground">Withdrawal reviews</Badge>
                    <CardTitle className="text-lg">Verification queue</CardTitle>
                  </div>
                  <Badge variant="secondary">{pendingIdReviews.length} waiting</Badge>
                </div>
                <CardDescription>
                  Review submitted withdrawal details here. Once you approve or reject one, it leaves this queue.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingSharedUsers ? (
                  <div className="text-sm text-muted-foreground">Loading verification reviews...</div>
                ) : pendingIdReviews.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No withdrawal verification details are waiting right now.
                  </div>
                ) : (
                  pendingIdReviews.map(({ userId, request }) => {
                    const requestUser = usersById.get(userId);

                    return (
                      <div key={request.id} className="rounded-2xl border border-border bg-background/60 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-1">
                            <div className="font-semibold text-foreground">{request.idType} verification review</div>
                            <div className="text-sm text-muted-foreground">{getUserPrimaryLabel(requestUser)}</div>
                            <div className="text-sm text-muted-foreground">
                              {request.fileName ? `${request.fileName} - ` : ""}
                              Submitted {formatTimestamp(request.submittedAt)}
                            </div>
                            <div className="text-xs text-muted-foreground">User ID: {userId}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => openUser(userId)}>
                              Open user
                            </Button>
                            <Button
                              size="sm"
                              disabled={reviewingIdRequestId === request.id || isApplyingIdReview}
                              onClick={() => void handleIdVerificationReview(userId, request, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={reviewingIdRequestId === request.id || isApplyingIdReview}
                              onClick={() => void handleIdVerificationReview(userId, request, "rejected")}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-lg">Users</CardTitle>
                  <CardDescription>Select a user to open their full details and edit from one place.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Search by name, username, email, or user ID"
                  />

                  {loadingSharedUsers ? (
                    <div className="text-sm text-muted-foreground">Loading users...</div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No users match this search yet.
                    </div>
                  ) : (
                    <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                      {filteredUsers.map((user) => {
                        const isSelected = user.userId === selectedUserId;
                        const pendingReviews = pendingReviewCountByUserId.get(user.userId) ?? 0;

                        return (
                          <button
                            key={user.userId}
                            type="button"
                            onClick={() => openUser(user.userId)}
                            className={cn(
                              "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                              isSelected
                                ? "border-gold bg-secondary text-foreground"
                                : "border-border bg-background/60 text-foreground hover:border-gold/40 hover:bg-secondary/60",
                            )}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate font-medium">{getUserPrimaryLabel(user)}</div>
                                <div className="truncate text-sm text-muted-foreground">{getUserSecondaryLabel(user)}</div>
                                <div className="truncate text-xs text-muted-foreground">{user.userId}</div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant={user.status === "approved" ? "secondary" : "outline"}>{user.status}</Badge>
                                {pendingReviews > 0 ? <Badge className="bg-gold text-primary-foreground">{pendingReviews} review</Badge> : null}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/80">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedUser ? getUserPrimaryLabel(selectedUser) : "Select a user"}
                      </CardTitle>
                      <CardDescription>
                        {selectedUser
                          ? `Open account: ${selectedUser.userId}`
                          : "Choose a user from the list to review and edit their details."}
                      </CardDescription>
                    </div>
                    {selectedUser ? <Badge variant="outline">{selectedUser.status}</Badge> : null}
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedUser || !selectedUserDraft ? (
                    <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                      Pick a user on the left and their details will open here.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-2xl border border-border bg-background/60 p-4">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Created</div>
                          <div className="mt-2 text-sm text-foreground">{formatTimestamp(selectedUser.createdAt)}</div>
                        </div>
                        <div className="rounded-2xl border border-border bg-background/60 p-4">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Last update</div>
                          <div className="mt-2 text-sm text-foreground">{formatTimestamp(selectedUser.updatedAt)}</div>
                        </div>
                        <div className="rounded-2xl border border-border bg-background/60 p-4">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Current step</div>
                          <div className="mt-2 text-sm text-foreground">
                            {formatStepLabel(selectedUser.workflowSnapshot?.currentStepId)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-border bg-background/60 p-4">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Funding reviews</div>
                          <div className="mt-2 text-sm text-foreground">{selectedUserPendingRequests.length}</div>
                        </div>
                        <div className="rounded-2xl border border-border bg-background/60 p-4">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Withdrawal checks</div>
                          <div className="mt-2 text-sm text-foreground">{selectedUserPendingIdReviews.length}</div>
                        </div>
                      </div>

                      {selectedUserPendingRequests.length > 0 ? (
                        <div className="space-y-3">
                          <div>
                            <div className="font-medium text-foreground">Pending reviews for this user</div>
                            <div className="text-sm text-muted-foreground">Approve or reject directly without leaving the user record.</div>
                          </div>
                          {selectedUserPendingRequests.map((request) => {
                            const requestPreview = getDepositReviewPreview(request.requestedAmountUsd);

                            return (
                              <div key={request.id} className="rounded-2xl border border-border bg-background/60 p-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                  <div>
                                    <div className="font-medium text-foreground">
                                      {request.tokenCode} deposit for {request.requestedAmountUsd.toFixed(2)} USD
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {request.networkLabel} - Submitted {formatTimestamp(request.submittedAt)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      Bonus on approval: {formatUsdCurrency(requestPreview.depositBonusUsd)}. Total added: {formatUsdCurrency(requestPreview.totalCreditedAmountUsd)}.
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      disabled={reviewingRequestId === request.id || isApplyingDepositReview}
                                      onClick={() => void handleFirebaseRequestReview(request, "approved")}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={reviewingRequestId === request.id || isApplyingDepositReview}
                                      onClick={() => void handleFirebaseRequestReview(request, "rejected")}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {selectedUserPendingIdReviews.length > 0 ? (
                        <div className="space-y-3">
                          <div>
                            <div className="font-medium text-foreground">Pending withdrawal checks for this user</div>
                            <div className="text-sm text-muted-foreground">Approve or reject submitted verification details directly from the user record.</div>
                          </div>
                          {selectedUserPendingIdReviews.map((request) => (
                            <div key={request.id} className="rounded-2xl border border-border bg-background/60 p-4">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                  <div className="font-medium text-foreground">{request.idType} verification review</div>
                                  <div className="text-sm text-muted-foreground">
                                    {request.fileName ? `${request.fileName} - ` : ""}
                                    Submitted {formatTimestamp(request.submittedAt)}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    disabled={reviewingIdRequestId === request.id || isApplyingIdReview}
                                    onClick={() => void handleIdVerificationReview(selectedUser.userId, request, "approved")}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={reviewingIdRequestId === request.id || isApplyingIdReview}
                                    onClick={() => void handleIdVerificationReview(selectedUser.userId, request, "rejected")}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-border bg-background/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-medium text-foreground">User details</div>
                            <div className="text-sm text-muted-foreground">Edit the saved identity and account profile details here.</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant={selectedUser.status === "approved" ? "secondary" : "default"}
                              disabled={updatingUserId === selectedUser.userId}
                              onClick={() => void handleSelectedUserStatusUpdate("approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updatingUserId === selectedUser.userId}
                              onClick={() => void handleSelectedUserStatusUpdate("pending")}
                            >
                              Pending
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={updatingUserId === selectedUser.userId}
                              onClick={() => void handleSelectedUserStatusUpdate("rejected")}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="control-username">Username</Label>
                            <Input
                              id="control-username"
                              value={selectedUserDraft.username}
                              onChange={(event) =>
                                setSelectedUserDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        username: event.target.value,
                                      }
                                    : current,
                                )
                              }
                              placeholder="username"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="control-full-name">Full name</Label>
                            <Input
                              id="control-full-name"
                              value={selectedUserDraft.fullName}
                              onChange={(event) =>
                                setSelectedUserDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        fullName: event.target.value,
                                      }
                                    : current,
                                )
                              }
                              placeholder="Full name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="control-email">Email</Label>
                            <Input
                              id="control-email"
                              value={selectedUserDraft.email}
                              onChange={(event) =>
                                setSelectedUserDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        email: event.target.value,
                                      }
                                    : current,
                                )
                              }
                              placeholder="user@example.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="control-wallet">Wallet address</Label>
                            <Input
                              id="control-wallet"
                              value={selectedUserDraft.walletAddress}
                              onChange={(event) =>
                                setSelectedUserDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        walletAddress: event.target.value,
                                      }
                                    : current,
                                )
                              }
                              placeholder="Wallet address"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>KYC status</Label>
                            <Select
                              value={selectedUserDraft.kycStatus}
                              onValueChange={(value: "pending" | "approved" | "rejected") =>
                                setSelectedUserDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        kycStatus: value,
                                      }
                                    : current,
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="control-country">Onboarding country</Label>
                            <Input
                              id="control-country"
                              value={selectedUser.workflowSnapshot?.identityChecks.country ?? ""}
                              readOnly
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <Button
                            disabled={savingProfileUserId === selectedUser.userId}
                            onClick={() => void handleSelectedUserProfileSave()}
                          >
                            Save user details
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-background/60 p-4">
                        <div>
                          <div className="font-medium text-foreground">Wallet balances</div>
                          <div className="text-sm text-muted-foreground">Update the shared balances that appear across devices.</div>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                          <div className="space-y-2">
                            <Label htmlFor="control-main-balance">Main wallet USD</Label>
                            <Input
                              id="control-main-balance"
                              value={selectedUserDraft.mainWalletBalanceUsd}
                              onChange={(event) =>
                                setSelectedUserDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        mainWalletBalanceUsd: event.target.value,
                                      }
                                    : current,
                                )
                              }
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="control-bot-balance">Bot wallet USD</Label>
                            <Input
                              id="control-bot-balance"
                              value={selectedUserDraft.botWalletBalanceUsd}
                              onChange={(event) =>
                                setSelectedUserDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        botWalletBalanceUsd: event.target.value,
                                      }
                                    : current,
                                )
                              }
                              placeholder="0"
                            />
                          </div>
                          <Button
                            className="md:self-end"
                            disabled={isSavingWalletBalances}
                            onClick={() => void handleSelectedUserBalancesSave()}
                          >
                            Save balances
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-background/60 p-4">
                        <div>
                          <div className="font-medium text-foreground">Deposit addresses</div>
                          <div className="text-sm text-muted-foreground">These are the addresses the user copies from their token cards.</div>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                          <div className="space-y-2">
                            <Label htmlFor="control-eth-address">ETH</Label>
                            <Input
                              id="control-eth-address"
                              value={selectedUserDraft.addresses.ETH}
                              onChange={(event) =>
                                setSelectedUserDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        addresses: {
                                          ...current.addresses,
                                          ETH: event.target.value,
                                        },
                                      }
                                    : current,
                                )
                              }
                              placeholder="ETH address"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="control-usdt-address">USDT</Label>
                            <Input
                              id="control-usdt-address"
                              value={selectedUserDraft.addresses.USDT}
                              onChange={(event) =>
                                setSelectedUserDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        addresses: {
                                          ...current.addresses,
                                          USDT: event.target.value,
                                        },
                                      }
                                    : current,
                                )
                              }
                              placeholder="USDT address"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="control-btc-address">BTC</Label>
                            <Input
                              id="control-btc-address"
                              value={selectedUserDraft.addresses.BTC}
                              onChange={(event) =>
                                setSelectedUserDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        addresses: {
                                          ...current.addresses,
                                          BTC: event.target.value,
                                        },
                                      }
                                    : current,
                                )
                              }
                              placeholder="BTC address"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="control-sol-address">SOL</Label>
                            <Input
                              id="control-sol-address"
                              value={selectedUserDraft.addresses.SOL}
                              onChange={(event) =>
                                setSelectedUserDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        addresses: {
                                          ...current.addresses,
                                          SOL: event.target.value,
                                        },
                                      }
                                    : current,
                                )
                              }
                              placeholder="SOL address"
                            />
                          </div>
                          <Button
                            className="xl:self-end"
                            disabled={isSavingDepositAddresses}
                            onClick={() => void handleSelectedUserAddressesSave()}
                          >
                            Save addresses
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </JourneyShell>
  );
};

export default ControlPanelPage;
