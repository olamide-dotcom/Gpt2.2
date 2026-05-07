import { useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { KeyRound, ShieldCheck, UserRound } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppAuth } from "@/hooks/use-app-auth";
import { getFriendlyAuthErrorMessage, getRememberedUsername } from "@/lib/app-auth";

interface AuthLocationState {
  nextState?: unknown;
}

const DEFAULT_SIGNIN_PATH = "/dashboard";
const DEFAULT_SIGNUP_PATH = "/onboarding";

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, signIn, signUp } = useAppAuth();
  const rememberedUsername = getRememberedUsername();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedMode = searchParams.get("mode") === "signin" ? "signin" : searchParams.get("mode") === "signup" ? "signup" : null;
  const defaultTab: "signup" | "signin" = requestedMode ?? (rememberedUsername ? "signin" : "signup");

  const [tab, setTab] = useState<"signup" | "signin">(defaultTab);
  const [signInUsername, setSignInUsername] = useState(rememberedUsername ?? "");
  const [signInPin, setSignInPin] = useState("");
  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpPin, setSignUpPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestedNextPath = searchParams.get("next");
  const forwardedState = ((location.state as AuthLocationState | null) ?? null)?.nextState;

  if (!isLoading && isAuthenticated) {
    return <Navigate to={requestedNextPath || DEFAULT_SIGNIN_PATH} replace state={forwardedState} />;
  }

  const handleSuccess = (targetPath: string) => {
    navigate(targetPath, forwardedState ? { replace: true, state: forwardedState } : { replace: true });
  };

  const handleSignIn = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signIn({
        username: signInUsername,
        pin: signInPin,
      });
      handleSuccess(requestedNextPath || DEFAULT_SIGNIN_PATH);
    } catch (error) {
      setErrorMessage(getFriendlyAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    setErrorMessage(null);

    if (signUpPin.trim() !== confirmPin.trim()) {
      setErrorMessage("The PIN and confirm PIN fields need to match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await signUp({
        username: signUpUsername,
        pin: signUpPin,
      });
      handleSuccess(requestedNextPath || DEFAULT_SIGNUP_PATH);
    } catch (error) {
      setErrorMessage(getFriendlyAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-border/80 bg-card/90 shadow-sm">
            <CardHeader className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-gold text-primary-foreground">Your account</Badge>
                <Badge variant="outline">Username + PIN</Badge>
              </div>
              <div className="space-y-3">
                <Link to="/" className="inline-flex text-xl font-bold">
                  <span className="text-gold">gpt.2</span>
                  <span className="text-foreground"> TradeBot</span>
                </Link>
                <CardTitle className="text-3xl">Welcome back to your trading space.</CardTitle>
                <CardDescription className="max-w-2xl text-base">
                  Sign in with your username and PIN to pick up where you left off. Your setup, funding progress, and
                  trade room stay connected to the same account across your devices.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <UserRound className="text-gold" size={20} />
                <div className="mt-3 font-medium">Choose your username</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pick something simple you will remember. You can use letters, numbers, dots, underscores, or dashes.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <KeyRound className="text-gold" size={20} />
                <div className="mt-3 font-medium">Create a quick PIN</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use a 4-8 digit PIN so signing in stays fast and easy whenever you come back.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <ShieldCheck className="text-gold" size={20} />
                <div className="mt-3 font-medium">Keep your progress</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Once you sign in, your details, balances, and activity stay tied to the same account every time
                  you return.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Sign in or create your account</CardTitle>
              <CardDescription>
                Create your account in a moment, or sign back in and continue with your setup and trading flow.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={tab} onValueChange={(value) => setTab(value as "signup" | "signin")} className="space-y-5">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                </TabsList>

                {errorMessage ? (
                  <Alert variant="destructive">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                ) : null}

                <TabsContent value="signup" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Create your account once, then use the same username and PIN whenever you want to come back.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username</Label>
                    <Input
                      id="signup-username"
                      value={signUpUsername}
                      onChange={(event) => setSignUpUsername(event.target.value)}
                      placeholder="marketmaker01"
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-pin">PIN</Label>
                    <Input
                      id="signup-pin"
                      type="password"
                      inputMode="numeric"
                      value={signUpPin}
                      onChange={(event) => setSignUpPin(event.target.value)}
                      placeholder="1234"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-pin">Confirm PIN</Label>
                    <Input
                      id="signup-confirm-pin"
                      type="password"
                      inputMode="numeric"
                      value={confirmPin}
                      onChange={(event) => setConfirmPin(event.target.value)}
                      placeholder="1234"
                      autoComplete="new-password"
                    />
                  </div>
                  <Button type="button" className="w-full" disabled={isSubmitting} onClick={() => void handleSignUp()}>
                    {isSubmitting ? "Creating account..." : "Create account"}
                  </Button>
                </TabsContent>

                <TabsContent value="signin" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Enter your username and PIN to continue from where you stopped.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="signin-username">Username</Label>
                    <Input
                      id="signin-username"
                      value={signInUsername}
                      onChange={(event) => setSignInUsername(event.target.value)}
                      placeholder="marketmaker01"
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-pin">PIN</Label>
                    <Input
                      id="signin-pin"
                      type="password"
                      inputMode="numeric"
                      value={signInPin}
                      onChange={(event) => setSignInPin(event.target.value)}
                      placeholder="1234"
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="button" className="w-full" disabled={isSubmitting} onClick={() => void handleSignIn()}>
                    {isSubmitting ? "Signing in..." : "Sign in"}
                  </Button>
                </TabsContent>
              </Tabs>

              <p className="mt-6 text-sm text-muted-foreground">
                If you have trouble signing in, double-check your username and PIN, then try again.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
