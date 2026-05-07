import { Navigate } from "react-router-dom";

import TradingDashboard from "@/components/dashboard/TradingDashboard";
import JourneyShell from "@/components/JourneyShell";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";

const DashboardPage = () => {
  const { dashboardUnlocked, depositUnlocked, isLoading } = useAccountWorkflow();

  if (!isLoading && !depositUnlocked) {
    return <Navigate to="/onboarding" replace state={{ blockedFromDeposit: true }} />;
  }

  if (!isLoading && !dashboardUnlocked) {
    return <Navigate to="/deposit" replace state={{ blockedFromDashboard: true }} />;
  }

  return (
    <JourneyShell
      stage="dashboard"
      title="Your AI trade room"
      description="Run the AI bot, watch the live-style chart, follow automatic exits, and see what is back in your wallet or ready for cash-out."
    >
      <TradingDashboard />
    </JourneyShell>
  );
};

export default DashboardPage;
