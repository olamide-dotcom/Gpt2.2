import { useMemo, useState } from "react";

import { BadgeCheck, FileText, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import type { IdVerificationRequest, ManualIdReviewInput, WorkflowSnapshot } from "@/lib/account-workflow";

interface IdVerificationConsoleProps {
  snapshot: WorkflowSnapshot;
  isApplyingIdReview: boolean;
  onApplyManualIdReview: (input: ManualIdReviewInput) => Promise<void>;
}

const statusClass: Record<IdVerificationRequest["status"], string> = {
  pending_review: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
};

const IdVerificationConsole = ({ snapshot, isApplyingIdReview, onApplyManualIdReview }: IdVerificationConsoleProps) => {
  const sorted = useMemo(
    () => [...snapshot.idVerificationRequests].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [snapshot.idVerificationRequests],
  );

  const pending = sorted.filter((r) => r.status === "pending_review");
  const [selectedId, setSelectedId] = useState<string | null>(pending[0]?.id ?? sorted[0]?.id ?? null);
  const [message, setMessage] = useState("");

  const selected = sorted.find((r) => r.id === selectedId) ?? null;

  const handleApply = async (status: ManualIdReviewInput["status"]) => {
    if (!selected) return;

    try {
      await onApplyManualIdReview({ requestId: selected.id, status, approvalMessage: message || undefined });
      setMessage("");
      toast.success(status === "approved" ? "ID approved" : "ID rejected");
    } catch {
      toast.error("Unable to apply review");
    }
  };

  return (
    <Card className="border-border/80">
      <CardHeader>
        <div className="flex items-center gap-3">
          <BadgeCheck className="text-gold" />
          <div>
            <CardTitle className="text-xl">ID verification queue</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Approve or reject uploaded identity documents here.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          {sorted.length > 0 ? (
            sorted.map((req) => (
              <div
                key={req.id}
                className={`rounded-2xl border p-4 transition-colors ${selectedId === req.id ? "border-gold bg-secondary/70" : "border-border bg-background/70"}`}
                onClick={() => setSelectedId(req.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="text-gold" />
                    <div>
                      <div className="font-semibold text-foreground">{req.idType}</div>
                      <div className="text-sm text-muted-foreground">Submitted {new Date(req.submittedAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${statusClass[req.status]}`}>
                      {req.status.replaceAll("_", " ")}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">{req.fileName ?? "(no file)"}</div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-sm text-muted-foreground">
              No ID verification requests yet.
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-background/70 p-5">
          {selected ? (
            <>
              <div className="space-y-2">
                <div className="font-semibold text-foreground">{selected.idType}</div>
                <div className="text-sm text-muted-foreground">Submitted {new Date(selected.submittedAt).toLocaleString()}</div>
                {selected.fileDataBase64 ? (
                  <div className="mt-3">
                    <a className="text-primary underline" href={selected.fileDataBase64} target="_blank" rel="noreferrer">
                      View file
                    </a>
                  </div>
                ) : null}
              </div>

              <div>
                <Label htmlFor="adminMsg">Review message (optional)</Label>
                <Textarea id="adminMsg" value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => void handleApply("approved")} disabled={isApplyingIdReview}>
                  Approve
                </Button>
                <Button type="button" variant="ghost" onClick={() => void handleApply("rejected")} disabled={isApplyingIdReview}>
                  Reject
                </Button>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Select a request to review details and approve or reject.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default IdVerificationConsole;
