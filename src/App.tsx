import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import RequireAppAuth from "@/components/auth/RequireAppAuth";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AutoSave from "./components/AutoSave";
import { AppAuthProvider } from "./hooks/use-app-auth";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage.tsx";
import ControlPanelPage from "./pages/ControlPanelPage.tsx";
import DepositPage from "./pages/DepositPage.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import OnboardingPage from "./pages/OnboardingPage.tsx";
import WithdrawPage from "./pages/WithdrawPage";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppAuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AutoSave />
        <BrowserRouter>
          {/* Route changes should feel like one guided journey, not stitched-together scroll positions. */}
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/onboarding"
              element={
                <RequireAppAuth>
                  <OnboardingPage />
                </RequireAppAuth>
              }
            />
            <Route
              path="/deposit"
              element={
                <RequireAppAuth>
                  <DepositPage />
                </RequireAppAuth>
              }
            />
            <Route
              path="/withdraw"
              element={
                <RequireAppAuth>
                  <WithdrawPage />
                </RequireAppAuth>
              }
            />
            <Route path="/controlpanel" element={<ControlPanelPage />} />
            <Route
              path="/dashboard"
              element={
                <RequireAppAuth>
                  <DashboardPage />
                </RequireAppAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppAuthProvider>
  </QueryClientProvider>
);

export default App;
