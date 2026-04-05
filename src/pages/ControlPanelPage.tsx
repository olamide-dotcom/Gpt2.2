import ManualDepositConsole from "@/components/deposits/ManualDepositConsole";
import IdVerificationConsole from "@/components/admin/IdVerificationConsole";
import JourneyShell from "@/components/JourneyShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";
import { useEffect, useState } from "react";

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
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem("controlpanel-unlocked") === "1";
    } catch {
      return false;
    }
  });
  const [serverRequests, setServerRequests] = useState<any[]>([]);
  const [loadingServerRequests, setLoadingServerRequests] = useState(false);

  const fetchServerRequests = async () => {
    setLoadingServerRequests(true);
    try {
      const res = await fetch('/api/requests/list');
      const json = await res.json();
      if (json?.ok && Array.isArray(json.data)) setServerRequests(json.data);
    } catch (e) {
      console.error('fetch server requests failed', e);
    } finally {
      setLoadingServerRequests(false);
    }
  };

  useEffect(() => {
    if (unlocked) fetchServerRequests();
  }, [unlocked]);
  const [passError, setPassError] = useState("");

  if (isLoading || !snapshot) {
    return (
      <JourneyShell
        stage="deposit"
        title="Load local deposit control panel"
        description="Preparing the hidden review tools for deposit approvals and wallet balance edits."
      >
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-xl">Loading control panel</CardTitle>
            <CardDescription>Bringing the local deposit request queue and wallet state into view.</CardDescription>
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
      } catch {}
      setUnlocked(true);
    } else {
      setPassError("Incorrect passcode. Try again.");
    }
  };

  const pendingRequests = snapshot.depositRequests.filter((request) => request.status === "pending_review");

  return (
    <JourneyShell
      stage="deposit"
      title="Review deposit requests and edit wallet balances"
      description="This hidden control route keeps the JSON approval tools away from the user-facing deposit page while still using the same local wallet state."
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
                  onChange={(e) => setPasscode(e.target.value)}
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
              <Badge variant="secondary">{pendingRequests.length} pending request{pendingRequests.length === 1 ? "" : "s"}</Badge>
            </div>
            <CardTitle className="text-xl">Local approval queue</CardTitle>
            <CardDescription>
              This page is not linked in the normal flow. It lets you approve or reject deposit requests from JSON and
              manually patch wallet balances when needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Route hiding only reduces visibility. If you need real protection later, we should add authentication or a
            passcode on top of this page.
          </CardContent>
        </Card>

        {unlocked ? (
          <>
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

            <div className="space-y-4">
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-lg">Server review queue</CardTitle>
                  <CardDescription>Requests submitted from Telegram or other clients.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingServerRequests ? (
                    <div>Loading server queue...</div>
                  ) : serverRequests.length === 0 ? (
                    <div>No server-side requests</div>
                  ) : (
                    serverRequests.map((r) => (
                      <div key={r.id} className="rounded-xl border border-border p-3 mb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{r.token_code} — {r.requested_amount_usd}</div>
                            <div className="text-sm text-muted-foreground">Submitted by: {r.submitted_by_telegram_id ?? r.account_id}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                await fetch('/api/requests/review', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ requestId: r.id, status: 'approved', creditedAmountUsd: r.requested_amount_usd, approvalMessage: 'Approved by control panel' }) });
                                await fetchServerRequests();
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                await fetch('/api/requests/review', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ requestId: r.id, status: 'rejected', approvalMessage: 'Rejected by control panel' }) });
                                await fetchServerRequests();
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
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
