import { Navigate, useLocation, useNavigate } from "react-router-dom";

import DepositSection from "@/components/deposits/DepositSection";
import RealtimeDepositStatus from "@/components/deposits/RealtimeDepositStatus";
import JourneyShell from "@/components/JourneyShell";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";
import { DEPOSIT_BONUS_PERCENT } from "@/lib/account-workflow";

interface LocationState {
  blockedFromDashboard?: boolean;
}

const DepositPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as LocationState | null) ?? null;
  const { depositUnlocked, isLoading, firebaseUserId, snapshot } = useAccountWorkflow();

  // Route guard: deposits stay inaccessible until onboarding has been approved.
  if (!isLoading && !depositUnlocked) {
    return <Navigate to="/onboarding" replace state={{ blockedFromDeposit: true }} />;
  }

  return (
    <JourneyShell
      stage="deposit"
      title="Funding"
      description={`Use the right wallet address, send your funding request, and receive an extra ${DEPOSIT_BONUS_PERCENT}% on every approved deposit.`}
    >
      <div className="space-y-6">
        {locationState?.blockedFromDashboard ? (
          <div className="rounded-2xl border border-gold/30 bg-gold/10 px-5 py-4 text-sm text-foreground">
            Your AI trade room is already open once your starter balance is added. Every approved deposit also gets an extra {DEPOSIT_BONUS_PERCENT}% when it hits your balance, and a confirmed deposit unlocks cash-out eligibility for the balances your AI bot returns to your main wallet.
          </div>
        ) : null}

        <DepositSection
          onContinueOnboarding={() => navigate("/onboarding")}
          onOpenDashboard={() => navigate("/dashboard")}
        />

        <RealtimeDepositStatus
          userId={firebaseUserId}
          existingRequests={snapshot?.depositRequests || []}
        />
      </div>
    </JourneyShell>
  );
};

export default DepositPage;
