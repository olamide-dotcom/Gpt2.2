import ManualDepositConsole from "@/components/deposits/ManualDepositConsole";
import IdVerificationConsole from "@/components/admin/IdVerificationConsole";
import JourneyShell from "@/components/JourneyShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";
import { useState } from "react";

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

  const [passcode, setPasscode] = useState("");
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem("controlpanel-unlocked") === "1";
    } catch {
      return false;
    }
  });
  const [passError, setPassError] = useState("");

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
          </>
        ) : null}
      </div>
    </JourneyShell>
  );
};

export default ControlPanelPage;
