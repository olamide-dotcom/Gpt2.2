import { Navigate, useNavigate } from "react-router-dom";

import CTASection from "@/components/CTASection";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import Strategies from "@/components/Strategies";
import WhyChooseUs from "@/components/WhyChooseUs";
import type { StrategyId } from "@/content/site";
import { useAppAuth } from "@/hooks/use-app-auth";
import { hasRememberedAppAccount } from "@/lib/app-auth";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAppAuth();
  const isReturningVisitor = hasRememberedAppAccount();

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isLoading && isReturningVisitor) {
    return <Navigate to="/auth?mode=signin&next=%2Fdashboard" replace />;
  }

  const openAuth = (preferredMode?: "signin" | "signup", nextPath?: string, nextState?: unknown) => {
    const mode = preferredMode ?? (isReturningVisitor ? "signin" : "signup");
    const targetPath =
      nextPath ??
      (mode === "signin" ? "/dashboard" : "/onboarding");

    navigate(
      `/auth?mode=${mode}&next=${encodeURIComponent(targetPath)}`,
      nextState ? { state: { nextState } } : undefined,
    );
  };

  const openProtectedRoute = (path: string, nextState?: unknown) => {
    if (isAuthenticated) {
      navigate(path, nextState ? { state: nextState } : undefined);
      return;
    }

    openAuth(undefined, path, nextState);
  };

  const openPrimaryFlow = (preferredStrategyId?: StrategyId) => {
    if (isAuthenticated) {
      navigate("/dashboard");
      return;
    }

    if (isReturningVisitor) {
      openAuth("signin", "/dashboard");
      return;
    }

    openAuth("signup", "/onboarding", preferredStrategyId ? { preferredStrategyId } : undefined);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar
        onOpenAuth={() => openAuth()}
        onOpenDeposit={() => openProtectedRoute("/deposit")}
        onOpenOnboarding={() => openPrimaryFlow()}
      />
      <HeroSection onOpenOnboarding={() => openPrimaryFlow()} />
      <HowItWorks />
      <WhyChooseUs />
      {/* Carry the strategy choice into onboarding so the flow feels continuous, not disconnected. */}
      <Strategies onSelectStrategy={(strategyId) => openPrimaryFlow(strategyId)} />
      <CTASection onOpenOnboarding={() => openPrimaryFlow()} />
      <SiteFooter />
    </div>
  );
};

export default Index;
