import { useEffect, useState } from "react";

import IdVerificationConsole from "@/components/admin/IdVerificationConsole";
import ReviewModerationConsole from "@/components/admin/ReviewModerationConsole";
import JourneyShell from "@/components/JourneyShell";
import ManualDepositConsole from "@/components/deposits/ManualDepositConsole";
import RealtimeDepositConsole from "@/components/deposits/RealtimeDepositConsole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPendingDepositRequests, listenToPendingDepositRequests, type DepositRequestData } from "@/lib/firebase-deposits";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";
import { getAllUsers, type UserData } from "@/lib/firebase";

interface SharedServerRequest {
  id: string;
  account_id?: string | null;
  token_code: string;
  token_name?: string | null;
  network_label?: string | null;
  address?: string | null;
  requested_amount_usd: number;
  status: string;
  submitted_at?: string | null;
  submitted_by_telegram_id?: string | null;
}

const ControlPanelPage = () => {
  const {
    applyManualDepositReview,
    isApplyingDepositReview,
    isLoading,
    isSavingWalletBalances,
    setWalletBalances,
    snapshot,
    applyManualIdReview,
    isApplyingIdReview,
  } = useAccountWorkflow();
  const [passcode, setPasscode] = useState("");
  const [passError, setPassError] = useState("");
  const [serverRequests, setServerRequests] = useState<SharedServerRequest[]>([]);
  const [firebaseRequests, setFirebaseRequests] = useState<DepositRequestData[]>([]);
  const [sharedUsers, setSharedUsers] = useState<UserData[]>([]);
  const [loadingServerRequests, setLoadingServerRequests] = useState(false);
  const [loadingFirebaseRequests, setLoadingFirebaseRequests] = useState(false);
  const [loadingSharedUsers, setLoadingSharedUsers] = useState(false);
  const [balanceDrafts, setBalanceDrafts] = useState<Record<string, { mainWalletBalanceUsd: string; botWalletBalanceUsd: string }>>({});
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem("controlpanel-unlocked") === "1";
    } catch {
      return false;
    }
  });

  const fetchServerRequests = async () => {
    setLoadingServerRequests(true);

    try {
      const res = await fetch("/api/requests/list");
      const json = await res.json();

      if (json?.ok && Array.isArray(json.data)) {
        setServerRequests(json.data as SharedServerRequest[]);
      }
    } catch (error) {
      console.error("fetch server requests failed", error);
    } finally {
      setLoadingServerRequests(false);
    }
  };

  const fetchFirebaseRequests = async () => {
    setLoadingFirebaseRequests(true);

    try {
      const requests = await getPendingDepositRequests();
      setFirebaseRequests(requests);
    } catch (error) {
      console.error("fetch firebase requests failed", error);
    } finally {
      setLoadingFirebaseRequests(false);
    }
  };

  const fetchSharedUsers = async () => {
    setLoadingSharedUsers(true);

    try {
      const users = await getAllUsers();
      setSharedUsers(users);
      setBalanceDrafts((current) => {
        const next = { ...current };

        for (const user of users) {
          next[user.userId] = next[user.userId] ?? {
            mainWalletBalanceUsd: String(user.mainWalletBalanceUsd ?? user.depositAmount ?? 0),
            botWalletBalanceUsd: String(user.botWalletBalanceUsd ?? 0),
          };
        }

        return next;
      });
    } catch (error) {
      console.error("fetch shared users failed", error);
    } finally {
      setLoadingSharedUsers(false);
    }
  };

  useEffect(() => {
    if (!unlocked) {
      return;
    }

    void fetchServerRequests();
    void fetchFirebaseRequests();
    void fetchSharedUsers();

    const unsubscribeFirebaseRequests = listenToPendingDepositRequests((requests) => {
      setFirebaseRequests(requests);
      setLoadingFirebaseRequests(false);
    });

    const intervalId = window.setInterval(() => {
      void fetchServerRequests();
      void fetchFirebaseRequests();
      void fetchSharedUsers();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
      unsubscribeFirebaseRequests();
    };
  }, [unlocked]);

  if (isLoading || !snapshot) {
    return (
      <JourneyShell
        stage="deposit"
        title="Load control panel"
        description="Preparing the shared request queue and browser-local fallback tools."
      >
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-xl">Loading control panel</CardTitle>
            <CardDescription>Bringing the approval tools into view.</CardDescription>
          </CardHeader>
        </Card>
      </JourneyShell>
    );
  }

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

  const pendingRequests = snapshot.depositRequests.filter((request) => request.status === "pending_review");
  const sharedPendingRequests = serverRequests.filter((request) => request.status === "pending_review");
  const combinedSharedRequestCount = sharedPendingRequests.length + firebaseRequests.length;

  return (
    <JourneyShell
      stage="deposit"
      title="Review deposit requests and edit wallet balances"
      description="The shared server queue appears first here so cross-browser requests are easy to verify. Browser-local tools remain available below as fallback."
    >
      <div className="space-y-6">
        {!unlocked ? (
          <Card className="border-border/80">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-gold text-primary-foreground">Passcode required</Badge>
              </div>
              <CardTitle className="text-xl">Enter control panel passcode</CardTitle>
              <CardDescription>Enter the passcode to access the hidden review tools.</CardDescription>
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
                <div className="flex gap-3">
                  <Button onClick={handleUnlock}>Unlock</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border/80">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-gold text-primary-foreground">Hidden route</Badge>
              <Badge variant="secondary">
                {combinedSharedRequestCount} shared pending request{combinedSharedRequestCount === 1 ? "" : "s"}
              </Badge>
              {pendingRequests.length > 0 ? (
                <Badge variant="outline">
                  {pendingRequests.length} local request{pendingRequests.length === 1 ? "" : "s"}
                </Badge>
              ) : null}
            </div>
            <CardTitle className="text-xl">Shared approval queue</CardTitle>
            <CardDescription>
              Requests from other browsers should appear in the shared server queue. The local tools below only show
              data saved in this browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Route hiding only reduces visibility. If you need real protection later, we should add authentication on
            top of this page.
          </CardContent>
        </Card>

        {unlocked ? (
          <>
            <Card className="border-border/80">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Badge className="bg-gold text-primary-foreground">Primary</Badge>
                <CardTitle className="text-lg">Shared server review queue</CardTitle>
                </div>
                <CardDescription>
                  Watch this queue when testing Chrome against Edge. Firestore requests appear live here, and the older
                  server mirror remains visible when available.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingServerRequests || loadingFirebaseRequests ? (
                  <div>Loading shared queue...</div>
                ) : combinedSharedRequestCount === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No shared requests yet. If Firestore already contains a pending deposit but it is not listed here,
                    refresh once more and check the browser console for Firestore query errors.
                  </div>
                ) : (
                  <>
                    {firebaseRequests.length > 0 ? (
                      <div className="mb-4 space-y-3">
                        <div className="text-sm font-medium text-foreground">Firestore live queue</div>
                        {firebaseRequests.map((request) => (
                          <div key={request.id} className="rounded-xl border border-border p-3">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <div className="font-medium">
                                  {request.tokenCode} - {request.requestedAmountUsd}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Submitted by: {request.submittedByTelegramId ?? request.userId}
                                </div>
                                <div className="text-sm text-muted-foreground">Network: {request.networkLabel}</div>
                                <div className="text-sm text-muted-foreground">Status: {request.status}</div>
                              </div>
                              <Badge variant="outline">Firestore</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {serverRequests.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-foreground">Server mirror queue</div>
                        {serverRequests.map((request) => (
                          <div key={request.id} className="rounded-xl border border-border p-3">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <div className="font-medium">
                                  {request.token_code} - {request.requested_amount_usd}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Submitted by: {request.submitted_by_telegram_id ?? request.account_id}
                                </div>
                                <div className="text-sm text-muted-foreground">Status: {request.status}</div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    await fetch("/api/requests/review", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        requestId: request.id,
                                        status: "approved",
                                        creditedAmountUsd: request.requested_amount_usd,
                                        approvalMessage: "Approved by control panel",
                                      }),
                                    });
                                    await fetchServerRequests();
                                  }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={async () => {
                                    await fetch("/api/requests/review", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        requestId: request.id,
                                        status: "rejected",
                                        approvalMessage: "Rejected by control panel",
                                      }),
                                    });
                                    await fetchServerRequests();
                                  }}
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>

            <RealtimeDepositConsole snapshot={snapshot} />

            <Card className="border-border/80">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Badge className="bg-gold text-primary-foreground">Shared balances</Badge>
                  <CardTitle className="text-lg">Multi-user wallet controls</CardTitle>
                </div>
                <CardDescription>
                  These balances are saved against each user record, so approvals and edits stay attached to the right
                  account across browsers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingSharedUsers ? (
                  <div className="text-sm text-muted-foreground">Loading shared users...</div>
                ) : sharedUsers.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No shared users found yet. A user record appears after someone opens the app.
                  </div>
                ) : (
                  sharedUsers.map((user) => {
                    const draft = balanceDrafts[user.userId] ?? {
                      mainWalletBalanceUsd: String(user.mainWalletBalanceUsd ?? user.depositAmount ?? 0),
                      botWalletBalanceUsd: String(user.botWalletBalanceUsd ?? 0),
                    };

                    return (
                      <div key={user.userId} className="rounded-xl border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-medium text-foreground">{user.fullName || user.email || user.userId}</div>
                            <div className="text-sm text-muted-foreground">User ID: {user.userId}</div>
                            <div className="text-sm text-muted-foreground">Status: {user.status}</div>
                          </div>
                          <Badge variant="outline">
                            Main {user.mainWalletBalanceUsd ?? user.depositAmount ?? 0} / Bot {user.botWalletBalanceUsd ?? 0}
                          </Badge>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                          <Input
                            value={draft.mainWalletBalanceUsd}
                            onChange={(event) =>
                              setBalanceDrafts((current) => ({
                                ...current,
                                [user.userId]: {
                                  ...draft,
                                  mainWalletBalanceUsd: event.target.value,
                                },
                              }))
                            }
                            placeholder="Main wallet USD"
                          />
                          <Input
                            value={draft.botWalletBalanceUsd}
                            onChange={(event) =>
                              setBalanceDrafts((current) => ({
                                ...current,
                                [user.userId]: {
                                  ...draft,
                                  botWalletBalanceUsd: event.target.value,
                                },
                              }))
                            }
                            placeholder="Bot wallet USD"
                          />
                          <Button
                            disabled={isSavingWalletBalances}
                            onClick={async () => {
                              await setWalletBalances({
                                userId: user.userId,
                                mainWalletBalanceUsd: Number.parseFloat(draft.mainWalletBalanceUsd) || 0,
                                botWalletBalanceUsd: Number.parseFloat(draft.botWalletBalanceUsd) || 0,
                              });
                              await fetchSharedUsers();
                            }}
                          >
                            Save Balances
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Legacy</Badge>
                  <CardTitle className="text-lg">This Browser Only</CardTitle>
                </div>
                <CardDescription>
                  These tools still read the current browser snapshot. They are useful as a fallback, but they will not
                  show requests that exist only in another browser.
                </CardDescription>
              </CardHeader>
            </Card>

            <ManualDepositConsole
              isApplyingReview={isApplyingDepositReview}
              isSavingWalletBalances={isSavingWalletBalances}
              onApplyManualDepositReview={applyManualDepositReview}
              onSetWalletBalances={setWalletBalances}
              snapshot={snapshot}
            />

            <IdVerificationConsole
              snapshot={snapshot}
              isApplyingIdReview={isApplyingIdReview}
              onApplyManualIdReview={applyManualIdReview}
            />

            <ReviewModerationConsole />
          </>
        ) : null}
      </div>
    </JourneyShell>
  );
};

export default ControlPanelPage;
