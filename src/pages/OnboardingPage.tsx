import { useLocation, useNavigate } from "react-router-dom";

import JourneyShell from "@/components/JourneyShell";
import OnboardingWorkflow from "@/components/onboarding/OnboardingWorkflow";

import type { StrategyId } from "@/content/site";

interface LocationState {
  blockedFromDeposit?: boolean;
  preferredStrategyId?: StrategyId;
}

const OnboardingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as LocationState | null) ?? null;

  return (
    <JourneyShell
      stage="onboarding"
      title="Complete onboarding to unlock deposits"
      description="Follow the same guided path introduced on the landing page: review access, complete checks, choose a strategy, and activate the workflow. Progress is saved so users can return later."
    >
      <div className="space-y-6">
        {locationState?.blockedFromDeposit ? (
          <div className="rounded-2xl border border-gold/30 bg-gold/10 px-5 py-4 text-sm text-foreground">
            Deposit stays locked until onboarding is approved. Finish the steps below and the deposit page will open as
            soon as activation completes.
          </div>
        ) : null}

        {/* Preferred strategy selections from the landing page are handed into onboarding here. */}
        <OnboardingWorkflow
          preferredStrategyId={locationState?.preferredStrategyId}
          onBackToLanding={() => navigate("/")}
          onOpenFunding={() => navigate("/deposit")}
          onComplete={() => navigate("/deposit")}
        />
      </div>
    </JourneyShell>
  );
};

export default OnboardingPage;
