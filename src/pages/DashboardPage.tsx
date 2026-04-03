import { Navigate } from "react-router-dom";

import TradingDashboard from "@/components/dashboard/TradingDashboard";
import JourneyShell from "@/components/JourneyShell";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";

const DashboardPage = () => {
  const { dashboardUnlocked, depositUnlocked, isLoading } = useAccountWorkflow();

  if (!isLoading && !depositUnlocked) {
    return <Navigate to="/onboarding" replace state={{ blockedFromDeposit: true }} />;
  }

  // The dashboard only opens after a deposit has funded the main wallet.
  if (!isLoading && !dashboardUnlocked) {
    return <Navigate to="/deposit" replace state={{ blockedFromDashboard: true }} />;
  }

  return (
    <JourneyShell
      stage="dashboard"
      title="Manage wallets and run the AI trading bot"
      description="This is the final stage of the flow. Wallet balances, bot funding, simulated trading activity, and withdrawals all stay connected to the same persisted account state."
    >
      <TradingDashboard />
    </JourneyShell>
  );
};

export default DashboardPage;
