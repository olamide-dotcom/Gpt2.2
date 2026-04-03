import { useNavigate } from "react-router-dom";

import JourneyShell from "@/components/JourneyShell";

const WithdrawPage = () => {
  const navigate = useNavigate();

  return (
    <JourneyShell
      stage="dashboard"
      title="Withdrawals are not available yet"
      description="Withdrawals will be enabled after deposits and bot activation. Continue to onboarding or the dashboard to get started."
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card/60 p-6 text-foreground">
          <p className="text-base">Withdrawals are not available in this demo.</p>
          <p className="mt-3 text-sm text-muted-foreground">You can proceed to onboarding to finish setup or visit the dashboard to start the trading bot.</p>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/onboarding")}
              className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-foreground"
            >
              Continue Onboarding
            </button>

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </JourneyShell>
  );
};

export default WithdrawPage;
