import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  activateAccountWorkflows,
  applyManualDepositReview,
  getCompletionPercentage,
  getIncompleteSteps,
  getTotalWalletBalance,
  getWorkflowSnapshot,
  isDashboardUnlocked,
  isDepositUnlocked,
  recordIncomingDeposit,
  refreshDepositTracking,
  saveIdentityChecks,
  saveReviewAccessRequirements,
  saveStrategyTrack,
  setWalletBalances,
  setCurrentWorkflowStep,
  simulateDepositCredit,
  startTradingBot,
  stopTradingBot,
  submitDepositRequest,
  syncTradingBotSimulation,
  withdrawBotBalanceToMainWallet,
} from "@/lib/account-workflow";

const workflowQueryKey = ["account-workflow"];

export const useAccountWorkflow = () => {
  const queryClient = useQueryClient();

  const syncSnapshot = (snapshot: Awaited<ReturnType<typeof getWorkflowSnapshot>>) => {
    queryClient.setQueryData(workflowQueryKey, snapshot);
  };

  const query = useQuery({
    queryKey: workflowQueryKey,
    queryFn: getWorkflowSnapshot,
    // Keep the dashboard simulation fresh while still using the same persisted snapshot everywhere.
    refetchInterval: 4000,
    refetchIntervalInBackground: true,
  });

  const reviewRequirementsMutation = useMutation({
    mutationFn: saveReviewAccessRequirements,
    onSuccess: syncSnapshot,
  });

  const identityChecksMutation = useMutation({
    mutationFn: saveIdentityChecks,
    onSuccess: syncSnapshot,
  });

  const strategyTrackMutation = useMutation({
    mutationFn: saveStrategyTrack,
    onSuccess: syncSnapshot,
  });

  const activationMutation = useMutation({
    mutationFn: activateAccountWorkflows,
    onSuccess: syncSnapshot,
  });

  const currentStepMutation = useMutation({
    mutationFn: setCurrentWorkflowStep,
    onSuccess: syncSnapshot,
  });

  const refreshTrackingMutation = useMutation({
    mutationFn: refreshDepositTracking,
    onSuccess: syncSnapshot,
  });

  const recordIncomingDepositMutation = useMutation({
    mutationFn: recordIncomingDeposit,
    onSuccess: syncSnapshot,
  });

  const submitDepositRequestMutation = useMutation({
    mutationFn: submitDepositRequest,
    onSuccess: syncSnapshot,
  });

  const applyManualDepositReviewMutation = useMutation({
    mutationFn: applyManualDepositReview,
    onSuccess: syncSnapshot,
  });

  const walletBalanceMutation = useMutation({
    mutationFn: setWalletBalances,
    onSuccess: syncSnapshot,
  });

  const simulateDepositMutation = useMutation({
    mutationFn: simulateDepositCredit,
    onSuccess: syncSnapshot,
  });

  const startTradingBotMutation = useMutation({
    mutationFn: startTradingBot,
    onSuccess: syncSnapshot,
  });

  const syncTradingBotMutation = useMutation({
    mutationFn: syncTradingBotSimulation,
    onSuccess: syncSnapshot,
  });

  const stopTradingBotMutation = useMutation({
    mutationFn: stopTradingBot,
    onSuccess: syncSnapshot,
  });

  const withdrawBotBalanceMutation = useMutation({
    mutationFn: withdrawBotBalanceToMainWallet,
    onSuccess: syncSnapshot,
  });

  return {
    ...query,
    snapshot: query.data,
    completionPercentage: query.data ? getCompletionPercentage(query.data) : 0,
    remainingSteps: query.data ? getIncompleteSteps(query.data) : [],
    depositUnlocked: query.data ? isDepositUnlocked(query.data) : false,
    dashboardUnlocked: query.data ? isDashboardUnlocked(query.data) : false,
    totalWalletBalance: query.data ? getTotalWalletBalance(query.data) : 0,
    saveReviewRequirements: reviewRequirementsMutation.mutateAsync,
    saveIdentityChecks: identityChecksMutation.mutateAsync,
    saveStrategyTrack: strategyTrackMutation.mutateAsync,
    activateAccountWorkflows: activationMutation.mutateAsync,
    setCurrentStep: currentStepMutation.mutateAsync,
    refreshTracking: refreshTrackingMutation.mutateAsync,
    recordIncomingDeposit: recordIncomingDepositMutation.mutateAsync,
    submitDepositRequest: submitDepositRequestMutation.mutateAsync,
    applyManualDepositReview: applyManualDepositReviewMutation.mutateAsync,
    setWalletBalances: walletBalanceMutation.mutateAsync,
    simulateDeposit: simulateDepositMutation.mutateAsync,
    startTradingBot: startTradingBotMutation.mutateAsync,
    syncTradingBot: syncTradingBotMutation.mutateAsync,
    stopTradingBot: stopTradingBotMutation.mutateAsync,
    withdrawBotBalance: withdrawBotBalanceMutation.mutateAsync,
    isSavingReviewRequirements: reviewRequirementsMutation.isPending,
    isSavingIdentityChecks: identityChecksMutation.isPending,
    isSavingStrategyTrack: strategyTrackMutation.isPending,
    isActivatingAccountWorkflows: activationMutation.isPending,
    isChangingStep: currentStepMutation.isPending,
    isRefreshingTracking: refreshTrackingMutation.isPending,
    isSubmittingDepositRequest: submitDepositRequestMutation.isPending,
    isApplyingDepositReview: applyManualDepositReviewMutation.isPending,
    isSavingWalletBalances: walletBalanceMutation.isPending,
    isSimulatingDeposit: simulateDepositMutation.isPending,
    isStartingTradingBot: startTradingBotMutation.isPending,
    isSyncingTradingBot: syncTradingBotMutation.isPending,
    isStoppingTradingBot: stopTradingBotMutation.isPending,
    isWithdrawingBotBalance: withdrawBotBalanceMutation.isPending,
  };
};
