import { useNavigate } from "react-router-dom";

import CTASection from "@/components/CTASection";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import Strategies from "@/components/Strategies";
import WhyChooseUs from "@/components/WhyChooseUs";
import type { StrategyId } from "@/content/site";

const Index = () => {
  const navigate = useNavigate();

  const openOnboarding = (preferredStrategyId?: StrategyId) => {
    navigate("/onboarding", preferredStrategyId ? { state: { preferredStrategyId } } : undefined);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar onOpenDeposit={() => navigate("/deposit")} onOpenOnboarding={() => openOnboarding()} />
      <HeroSection onOpenOnboarding={() => openOnboarding()} />
      <HowItWorks />
      <WhyChooseUs />
      {/* Carry the strategy choice into onboarding so the flow feels continuous, not disconnected. */}
      <Strategies onSelectStrategy={(strategyId) => openOnboarding(strategyId)} />
      <CTASection onOpenOnboarding={() => openOnboarding()} />
      <SiteFooter />
    </div>
  );
};

export default Index;
