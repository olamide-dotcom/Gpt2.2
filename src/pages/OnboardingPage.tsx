import { useLocation, useNavigate } from "react-router-dom";

import JourneyShell from "@/components/JourneyShell";
import OnboardingWorkflow from "@/components/onboarding/OnboardingWorkflow";
import { DEPOSIT_BONUS_PERCENT } from "@/lib/account-workflow";

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
      title="Set up your account"
      description={`Complete the short setup once, keep your progress saved automatically, and unlock funding, your $5 starter balance, and a ${DEPOSIT_BONUS_PERCENT}% bonus on every approved deposit.`}
    >
      <div className="space-y-6">
        {locationState?.blockedFromDeposit ? (
          <div className="rounded-2xl border border-gold/30 bg-gold/10 px-5 py-4 text-sm text-foreground">
            Funding opens after your setup is approved. Finish the steps below and your funding page, starter
            balance, and {DEPOSIT_BONUS_PERCENT}% approved-deposit bonus will be ready.
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
