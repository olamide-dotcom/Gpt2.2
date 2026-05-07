import { type ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAppAuth } from "@/hooks/use-app-auth";
import { hasRememberedAppAccount } from "@/lib/app-auth";

const RequireAppAuth = ({ children }: { children: ReactElement }) => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAppAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card/90 p-8 text-center shadow-sm">
          <div className="text-lg font-semibold">Checking session</div>
          <p className="mt-3 text-sm text-muted-foreground">
            Restoring the signed-in account before we open the next page.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const nextPath = `${location.pathname}${location.search}${location.hash}`;
    const authMode = hasRememberedAppAccount() ? "signin" : "signup";
    return <Navigate to={`/auth?mode=${authMode}&next=${encodeURIComponent(nextPath)}`} replace state={{ nextState: location.state }} />;
  }

  return children;
};

export default RequireAppAuth;
