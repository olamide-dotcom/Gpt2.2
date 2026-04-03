import { type FormEvent, useEffect, useMemo, useState } from "react";

import { ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronRight, Lock, Save, ShieldCheck } from "lucide-react";

import { strategies, type StrategyId } from "@/content/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAccountWorkflow } from "@/hooks/use-account-workflow";
import {
  formatWorkflowTimestamp,
  isDepositUnlocked,
  onboardingSteps,
  type ActivationInput,
  type IdentityChecksInput,
  type OnboardingStepId,
  type ReviewRequirementsInput,
} from "@/lib/account-workflow";
import { cn } from "@/lib/utils";

interface OnboardingWorkflowProps {
  onOpenFunding: () => void;
  onBackToLanding?: () => void;
  onComplete?: () => void;
  preferredStrategyId?: StrategyId;
}

const createDefaultReviewRequirements = (): ReviewRequirementsInput => ({
  residenceCountry: "",
  investorProfile: "",
  acknowledgements: {
    disclosures: false,
    eligibility: false,
    communications: false,
  },
});

const createDefaultIdentityChecks = (): IdentityChecksInput => ({
  fullName: "",
  email: "",
  country: "",
  idType: "",
  notes: "",
});

const createDefaultActivation = (): ActivationInput => ({
  supportChannel: "email",
  reportingCadence: "weekly",
  alertsEnabled: true,
  fundingAcknowledgement: false,
});

const OnboardingWorkflow = ({
  onOpenFunding,
  onBackToLanding,
  onComplete,
  preferredStrategyId,
}: OnboardingWorkflowProps) => {
  const {
    activateAccountWorkflows,
    completionPercentage,
    depositUnlocked,
    isActivatingAccountWorkflows,
    isChangingStep,
    isLoading,
    isSavingIdentityChecks,
    isSavingReviewRequirements,
    isSavingStrategyTrack,
    remainingSteps,
    saveIdentityChecks,
    saveReviewRequirements,
    saveStrategyTrack,
    setCurrentStep,
    snapshot,
  } = useAccountWorkflow();

  const [reviewRequirements, setReviewRequirements] = useState(createDefaultReviewRequirements());
  const [identityChecks, setIdentityChecks] = useState(createDefaultIdentityChecks());
  const [selectedStrategyId, setSelectedStrategyId] = useState<StrategyId>(preferredStrategyId ?? "balanced-portfolio");
  const [activationSettings, setActivationSettings] = useState(createDefaultActivation());

  useEffect(() => {
    if (!snapshot?.reviewRequirements) {
      return;
    }

    setReviewRequirements(snapshot.reviewRequirements);
  }, [snapshot?.reviewRequirements]);

  useEffect(() => {
    if (!snapshot?.identityChecks) {
      return;
    }

    setIdentityChecks(snapshot.identityChecks);
  }, [snapshot?.identityChecks]);

  useEffect(() => {
    if (snapshot?.selectedStrategyId) {
      setSelectedStrategyId(snapshot.selectedStrategyId);
      return;
    }

    if (preferredStrategyId) {
      setSelectedStrategyId(preferredStrategyId);
    }
  }, [snapshot?.selectedStrategyId, preferredStrategyId]);

  useEffect(() => {
    if (!snapshot?.activation) {
      return;
    }

    setActivationSettings(snapshot.activation);
  }, [snapshot?.activation]);

  const activeStepId = snapshot?.currentStepId ?? onboardingSteps[0].id;
  const activeStepIndex = onboardingSteps.findIndex((step) => step.id === activeStepId);

  const stepStates = useMemo(
    () =>
      onboardingSteps.map((step) => {
        const completed = snapshot?.completedStepIds.includes(step.id) ?? false;
        const accessible =
          completed ||
          onboardingSteps
            .slice(0, onboardingSteps.findIndex((item) => item.id === step.id))
            .every((item) => snapshot?.completedStepIds.includes(item.id));

        return {
          ...step,
          completed,
          accessible,
          current: step.id === activeStepId,
        };
      }),
    [activeStepId, snapshot?.completedStepIds],
  );

  const activeStep = stepStates.find((step) => step.current) ?? stepStates[0];
  const previousStep = activeStepIndex > 0 ? onboardingSteps[activeStepIndex - 1] : null;
  const nextStep = activeStepIndex < onboardingSteps.length - 1 ? onboardingSteps[activeStepIndex + 1] : null;
  const nextStepAccessible = nextStep ? (stepStates.find((step) => step.id === nextStep.id)?.accessible ?? false) : false;

  const reviewRequirementsValid =
    reviewRequirements.residenceCountry.trim().length > 0 &&
    reviewRequirements.investorProfile.trim().length > 0 &&
    Object.values(reviewRequirements.acknowledgements).every(Boolean);

  const identityChecksValid =
    identityChecks.fullName.trim().length > 0 &&
    identityChecks.email.trim().length > 0 &&
    identityChecks.country.trim().length > 0 &&
    identityChecks.idType.trim().length > 0;

  const activationValid =
    activationSettings.supportChannel.trim().length > 0 &&
    activationSettings.reportingCadence.trim().length > 0 &&
    activationSettings.fundingAcknowledgement;

  if (isLoading || !snapshot) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-xl">Loading onboarding workflow</CardTitle>
          <CardDescription>Restoring any saved progress so the user can continue where they left off.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const selectedStrategy = strategies.find((strategy) => strategy.id === selectedStrategyId) ?? strategies[0];

  const openStep = async (stepId: OnboardingStepId) => {
    await setCurrentStep(stepId);
  };

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!reviewRequirementsValid) {
      return;
    }

    await saveReviewRequirements(reviewRequirements);
  };

  const handleIdentitySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!identityChecksValid) {
      return;
    }

    await saveIdentityChecks(identityChecks);
  };

  const handleStrategySubmit = async () => {
    await saveStrategyTrack(selectedStrategyId);
  };

  const handleActivationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activationValid) {
      return;
    }

    const updatedSnapshot = await activateAccountWorkflows(activationSettings);

    if (isDepositUnlocked(updatedSnapshot)) {
      onComplete?.();
    }
  };

  const stepButtonIcon = (step: (typeof stepStates)[number]) => {
    if (step.completed) {
      return <Check size={14} />;
    }

    if (!step.accessible) {
      return <Lock size={14} />;
    }

    return <ChevronRight size={14} />;
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-gold text-primary-foreground">Onboarding workflow</Badge>
            <Badge variant="secondary">{completionPercentage}% complete</Badge>
            {depositUnlocked ? <Badge variant="outline">Continue To Deposit </Badge> : null}
          </div>
          <CardTitle className="text-xl">Progress is saved {snapshot.userId}</CardTitle>
          <CardDescription>
            You can move between completed steps, save crypto KYC, and
            continue to deposits once onboarding is approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={completionPercentage} />
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <div>Last saved {formatWorkflowTimestamp(snapshot.updatedAt)}</div>
            <div>
              Remaining steps:{" "}
              <span className="font-medium text-foreground">{remainingSteps.length === 0 ? "None" : remainingSteps.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
        <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-xl">Workflow </CardTitle>
          <CardDescription>
            Completed steps stay open, and the next crypto onboarding step becomes available as soon as the current one
            is saved.
          </CardDescription>
        </CardHeader>
          <CardContent className="space-y-3">
            {stepStates.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => void openStep(step.id)}
                disabled={!step.accessible || isChangingStep}
                className={cn(
                  "w-full rounded-2xl border px-4 py-4 text-left transition-colors",
                  step.current
                    ? "border-gold bg-secondary text-foreground"
                    : "border-border bg-background/70 text-muted-foreground hover:text-foreground",
                  !step.accessible && "cursor-not-allowed opacity-70",
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                      step.completed
                        ? "border-gold bg-gold text-primary-foreground"
                        : step.current
                          ? "border-gold text-gold"
                          : "border-border text-muted-foreground",
                    )}
                  >
                    {step.completed ? <Check size={16} /> : index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-foreground">{step.title}</div>
                      <div className="flex items-center gap-2 text-xs">
                        {step.completed ? <Badge variant="secondary">Completed</Badge> : null}
                        {step.current ? <Badge variant="outline">Active</Badge> : null}
                        {!step.accessible ? <Badge variant="outline">Locked</Badge> : null}
                        {stepButtonIcon(step)}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </button>
            ))}

            {depositUnlocked ? (
              <div className="rounded-2xl border border-gold/30 bg-gold/10 p-4">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 text-gold" size={18} />
                  <div>
                    <div className="font-semibold text-foreground">Deposit access approved</div>
                    <p className="mt-1 text-sm text-muted-foreground">You can now proceed to the deposit workspace.</p>
                    <Button type="button" className="mt-4" onClick={onOpenFunding}>
                      Deposit
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl">{activeStep.title}</CardTitle>
                <CardDescription className="mt-2">{activeStep.description}</CardDescription>
              </div>
              <Badge variant="outline">
                Step {activeStepIndex + 1} of {onboardingSteps.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {activeStepId === "review-access-requirements" ? (
              <form className="space-y-5" onSubmit={handleReviewSubmit}>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="residenceCountry">Operating country </Label>
                    <Input
                      id="residenceCountry"
                      value={reviewRequirements.residenceCountry}
                      onChange={(event) =>
                        setReviewRequirements((current) => ({
                          ...current,
                          residenceCountry: event.target.value,
                        }))
                      }
                      placeholder="United States"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Crypto Profile</Label>
                    <Select
                      value={reviewRequirements.investorProfile}
                      onValueChange={(value) =>
                        setReviewRequirements((current) => ({
                          ...current,
                          investorProfile: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select crypto profile" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">Spot / swing trader</SelectItem>
                        <SelectItem value="crypto-desk">OTC / prop </SelectItem>
                        <SelectItem value="treasury">Stablecoin </SelectItem>
                        <SelectItem value="signal-partner">Signal copy-trading </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="font-medium text-foreground">Required acknowledgements</div>
                  <div className="space-y-4 rounded-2xl border border-border bg-background/70 p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="ack-disclosures"
                        checked={reviewRequirements.acknowledgements.disclosures}
                        onCheckedChange={(checked) =>
                          setReviewRequirements((current) => ({
                            ...current,
                            acknowledgements: {
                              ...current.acknowledgements,
                              disclosures: checked === true,
                            },
                          }))
                        }
                      />
                      <Label htmlFor="ack-disclosures" className="leading-6">
                        I understand only approved wallet networks and supported token routes will be credited after
                        onboarding approval.
                      </Label>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="ack-eligibility"
                        checked={reviewRequirements.acknowledgements.eligibility}
                        onCheckedChange={(checked) =>
                          setReviewRequirements((current) => ({
                            ...current,
                            acknowledgements: {
                              ...current.acknowledgements,
                              eligibility: checked === true,
                            },
                          }))
                        }
                      />
                      <Label htmlFor="ack-eligibility" className="leading-6">
                        I confirm that Users must allocate a minimum trading balance to activate the AI trading bot. Funds remaining in the user's wallet 
            
                      </Label>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="ack-communications"
                        checked={reviewRequirements.acknowledgements.communications}
                        onCheckedChange={(checked) =>
                          setReviewRequirements((current) => ({
                            ...current,
                            acknowledgements: {
                              ...current.acknowledgements,
                              communications: checked === true,
                            },
                          }))
                        }
                      />
                      <Label htmlFor="ack-communications" className="leading-6">
                        I agree that wallet alerts, deposit confirmations, and trading workflow updates can be sent
                        through the selected contact path.
                      </Label>
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={!reviewRequirementsValid || isSavingReviewRequirements}>
                  <Save size={16} />
                  {isSavingReviewRequirements ? "Saving..." : "Save and continue"}
                </Button>
              </form>
            ) : null}

            {activeStepId === "complete-identity-checks" ? (
              <form className="space-y-5" onSubmit={handleIdentitySubmit}>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Legal name for KYC</Label>
                    <Input
                      id="fullName"
                      value={identityChecks.fullName}
                      onChange={(event) =>
                        setIdentityChecks((current) => ({
                          ...current,
                          fullName: event.target.value,
                        }))
                      }
                      placeholder="Ada Okafor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={identityChecks.email}
                      onChange={(event) =>
                        setIdentityChecks((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="arnold@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Select a wallet </Label>
                    <Input
                      id="wallet"
                      value={identityChecks.country}
                      onChange={(event) =>
                        setIdentityChecks((current) => ({
                          ...current,
                          country: event.target.value,
                        }))
                      }
                      placeholder="Phantom, MetaMask, Coinbase Wallet......."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>KYC document type</Label>
                    <Select
                      value={identityChecks.idType}
                      onValueChange={(value) =>
                        setIdentityChecks((current) => ({
                          ...current,
                          idType: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a verification document" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="drivers-license">Driver&apos;s licence</SelectItem>
                        <SelectItem value="national-id">National ID</SelectItem>
                        <SelectItem value="corporate-documents">Corporate registration pack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="identityNotes">Wallet and compliance notes</Label>
                  <Textarea
                    id="identityNotes"
                    value={identityChecks.notes}
                    onChange={(event) =>
                      setIdentityChecks((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Funds review, exchange UID, preferred settlement wallet, or OTC handling."
                  />
                </div>

                <Button type="submit" disabled={!identityChecksValid || isSavingIdentityChecks}>
                  <Save size={16} />
                  {isSavingIdentityChecks ? "Saving..." : "Save identity step"}
                </Button>
              </form>
            ) : null}

            {activeStepId === "choose-strategy-track" ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  {strategies.map((strategy) => (
                    <button
                      key={strategy.id}
                      type="button"
                      onClick={() => setSelectedStrategyId(strategy.id)}
                      className={cn(
                        "rounded-2xl border p-5 text-left transition-colors",
                        selectedStrategyId === strategy.id
                          ? "border-gold bg-secondary text-foreground"
                          : "border-border bg-background/70 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <strategy.icon className="text-gold" size={22} />
                      <div className="mt-4 font-semibold text-foreground">{strategy.title}</div>
                      <div className="mt-2 text-xs uppercase tracking-wide text-gold">{strategy.profile}</div>
                      <p className="mt-3 text-sm text-muted-foreground">{strategy.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-border bg-background/70 p-5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 text-gold" size={18} />
                    <div>
                      <h3 className="font-semibold text-foreground">{selectedStrategy.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{selectedStrategy.fit}</p>
                      <p className="mt-3 text-sm text-foreground">
                        <span className="font-medium">Review cadence:</span> {selectedStrategy.reviewCadence}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedStrategy.items.map((item) => (
                          <Badge key={item} variant="outline">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <Button type="button" disabled={isSavingStrategyTrack} onClick={() => void handleStrategySubmit()}>
                  <ArrowRight size={16} />
                  {isSavingStrategyTrack ? "Saving..." : "Save selected strategy"}
                </Button>
              </div>
            ) : null}

            {activeStepId === "activate-account-workflows" ? (
              <form className="space-y-5" onSubmit={handleActivationSubmit}>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Primary crypto ops channel</Label>
                    <Select
                      value={activationSettings.supportChannel}
                      onValueChange={(value) =>
                        setActivationSettings((current) => ({
                          ...current,
                          supportChannel: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose the main ops route" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Others</SelectItem>
                        <SelectItem value="relationship-manager">Cwc manager</SelectItem>
                        <SelectItem value="ops-desk">Operations desk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Market recap cadence</Label>
                    <Select
                      value={activationSettings.reportingCadence}
                      onValueChange={(value) =>
                        setActivationSettings((current) => ({
                          ...current,
                          reportingCadence: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a security review checkup" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="alertsEnabled"
                      checked={activationSettings.alertsEnabled}
                      onCheckedChange={(checked) =>
                        setActivationSettings((current) => ({
                          ...current,
                          alertsEnabled: checked === true,
                        }))
                      }
                      />
                      <Label htmlFor="alertsEnabled" className="leading-6">
                        Enable wallet and execution alerts so on-chain deposits, confirmations, and strategy 
                        is initialized.
                      </Label>
                    </div>
                    <div className="flex items-start gap-3">
                    <Checkbox
                      id="fundingAcknowledgement"
                      checked={activationSettings.fundingAcknowledgement}
                      onCheckedChange={(checked) =>
                        setActivationSettings((current) => ({
                          ...current,
                          fundingAcknowledgement: checked === true,
                        }))
                      }
                      />
                      <Label htmlFor="fundingAcknowledgement" className="leading-6">
                        I understand this Dapp approves the crypto account locally and unlocks deposit wallets
                        after submission. Wallet-screening and treasury management approval flow.
                      </Label>
                    </div>
                </div>

                {depositUnlocked ? (
                  <div className="rounded-2xl border border-gold/30 bg-gold/10 p-4">
                    <div className="flex items-start gap-3">
                      <BadgeCheck className="mt-0.5 text-gold" size={18} />
                      <div>
                        <div className="font-semibold text-foreground">Account active</div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Approval completed {formatWorkflowTimestamp(snapshot.approvedAt)}. Deposit addresses are ready
                          .
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={!activationValid || isActivatingAccountWorkflows}>
                    <BadgeCheck size={16} />
                    {isActivatingAccountWorkflows ? "Activating..." : "Approve and unlock deposit"}
                  </Button>
                  {depositUnlocked ? (
                    <Button type="button" variant="outline" onClick={onOpenFunding}>
                      Continue to deposit 
                    </Button>
                  ) : null}
                </div>
              </form>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <div className="flex flex-wrap gap-3">
                {onBackToLanding ? (
                  <Button type="button" variant="ghost" onClick={onBackToLanding}>
                    <ArrowLeft size={16} />
                    Back to landing
                  </Button>
                ) : null}
                {previousStep ? (
                  <Button type="button" variant="outline" onClick={() => void openStep(previousStep.id)}>
                    <ArrowLeft size={16} />
                    Previous step
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                {nextStep ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void openStep(nextStep.id)}
                    disabled={!nextStepAccessible || isChangingStep}
                  >
                    Next step
                    <ArrowRight size={16} />
                  </Button>
                ) : null}
                {depositUnlocked ? (
                  <Button type="button" onClick={onOpenFunding}>
                    Continue to deposit 
                    <ArrowRight size={16} />
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingWorkflow;
