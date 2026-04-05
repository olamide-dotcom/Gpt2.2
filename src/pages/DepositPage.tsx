import { Navigate, useLocation, useNavigate } from "react-router-dom";

import DepositSection from "@/components/deposits/DepositSection";
import JourneyShell from "@/components/JourneyShell";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";

interface LocationState {
  blockedFromDashboard?: boolean;
}

const DepositPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as LocationState | null) ?? null;
  const { depositUnlocked, isLoading } = useAccountWorkflow();

  // Route guard: deposits stay inaccessible until onboarding has been approved.
  if (!isLoading && !depositUnlocked) {
    return <Navigate to="/onboarding" replace state={{ blockedFromDeposit: true }} />;
  }

  return (
    <JourneyShell
      stage="deposit"
      title="Fund the wallet system with supported tokens"
      description="This deposit workspace is the third stage of the journey. Once onboarding is approved, users can request a deposit, review it locally, then unlock the trading dashboard."
    >
      <div className="space-y-6">
        {locationState?.blockedFromDashboard ? (
          <div className="rounded-2xl border border-gold/30 bg-gold/10 px-5 py-4 text-sm text-foreground">
            The dashboard unlocks after the first approved deposit. Initiate a deposit below, await approval 
            , then continue into the AI trading area.
          </div>
        ) : null}

        <DepositSection
          onContinueOnboarding={() => navigate("/onboarding")}
          onOpenDashboard={() => navigate("/dashboard")}
        />
      </div>
    </JourneyShell>
  );
};

export default DepositPage;
