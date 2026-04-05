import { useEffect, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  activateAccountWorkflows,
  applyManualDepositReview,
  createWorkflowSnapshot,
  getCompletionPercentage,
  getIncompleteSteps,
  getTotalWalletBalance,
  getWorkflowSnapshot,
  isDashboardUnlocked,
  isDepositUnlocked,
  recordIncomingDeposit,
  refreshDepositTracking,
  submitIdVerification,
  saveIdentityChecks,
  saveReviewAccessRequirements,
  saveStrategyTrack,
  setWalletBalances,
  setCurrentWorkflowStep,
  simulateDepositCredit,
  startTradingBot,
  stopTradingBot,
  submitDepositRequest as localSubmitDepositRequest,
  syncTradingBotSimulation,
  withdrawBotBalanceToMainWallet,
  applyManualIdReview,
  type WorkflowSnapshot,
  type SubmitDepositRequestInput,
} from "@/lib/account-workflow";

// Firebase imports
import {
  initializeUserSession,
  listenToUser,
  applyDepositReviewToUserWorkflow,
  setUserWorkflowWalletBalances,
  syncUserWorkflow,
  type UserData,
} from "@/lib/firebase";

// Real-time deposit sync imports
import {
  createDepositRequest as firebaseCreateDepositRequest,
  reviewDepositRequest as firebaseReviewDepositRequest,
} from "@/lib/firebase-deposits";

const workflowQueryKey = ["account-workflow"];

// Convert Firebase UserData to WorkflowSnapshot
const convertUserDataToSnapshot = (userData: UserData | null, existingSnapshot?: WorkflowSnapshot): WorkflowSnapshot => {
  const baseSnapshot = userData?.workflowSnapshot
    ? {
        ...userData.workflowSnapshot,
        userId: userData.userId,
      }
    : existingSnapshot
      ? {
          ...existingSnapshot,
          userId: userData?.userId ?? existingSnapshot.userId,
        }
      : {
          userId: userData?.userId || "unknown",
        };

  return createWorkflowSnapshot({
    ...baseSnapshot,
    approvalStatus: userData?.status === "approved" ? "approved" : baseSnapshot.approvalStatus,
    identityChecks: {
      ...baseSnapshot.identityChecks,
      fullName: userData?.fullName ?? baseSnapshot.identityChecks?.fullName ?? "",
      email: userData?.email ?? baseSnapshot.identityChecks?.email ?? "",
    },
    mainWalletBalanceUsd:
      userData?.mainWalletBalanceUsd ?? userData?.depositAmount ?? baseSnapshot.mainWalletBalanceUsd ?? 0,
    botWalletBalanceUsd: userData?.botWalletBalanceUsd ?? baseSnapshot.botWalletBalanceUsd ?? 0,
  });
};

export const useAccountWorkflow = () => {
  const queryClient = useQueryClient();
  
  // Firebase state
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(null);
  const [firebaseUserData, setFirebaseUserData] = useState<UserData | null>(null);
  const [isLoadingFirebase, setIsLoadingFirebase] = useState(true);

  // Initialize Firebase on mount
  useEffect(() => {
    const initFirebase = async () => {
      try {
        // First, get the workflow snapshot from localStorage (fallback)
        const initialSnapshot = await getWorkflowSnapshot();
        queryClient.setQueryData(workflowQueryKey, initialSnapshot);

        // Then initialize Firebase
        const { userId, userData, unsubscribe } = await initializeUserSession();
        setFirebaseUserId(userId);
        setFirebaseUserData(userData);
        setFirebaseInitialized(true);
        setIsLoadingFirebase(false);

        // Set up real-time listener for Firebase data
        const unsubscribeFromUpdates = listenToUser(userId, (updatedData) => {
          setFirebaseUserData(updatedData);
          // Update the query cache with new data
          const currentSnapshot = queryClient.getQueryData<WorkflowSnapshot>(workflowQueryKey);
          if (currentSnapshot && updatedData) {
            const newSnapshot = convertUserDataToSnapshot(updatedData, currentSnapshot);
            queryClient.setQueryData(workflowQueryKey, newSnapshot);
          }
        });

        return () => {
          unsubscribe();
          unsubscribeFromUpdates();
        };
      } catch (error) {
        console.error('Failed to initialize Firebase:', error);
        // Fall back to local storage
        try {
          const initialSnapshot = await getWorkflowSnapshot();
          queryClient.setQueryData(workflowQueryKey, initialSnapshot);
        } catch (e) {
          console.error('Failed to load fallback snapshot:', e);
        }
        setIsLoadingFirebase(false);
        setFirebaseInitialized(true);
      }
    };

    initFirebase();
  }, [queryClient]);

  const syncSnapshot = useCallback((snapshot: WorkflowSnapshot) => {
    queryClient.setQueryData(workflowQueryKey, snapshot);
    
    // Also sync to Firebase if available
    if (firebaseUserId && firebaseInitialized) {
      syncUserWorkflow(firebaseUserId, snapshot).catch(console.error);
    }
  }, [firebaseUserId, firebaseInitialized, queryClient]);

  // Use getWorkflowSnapshot for initial data (falls back to localStorage if Firebase not ready)
  const query = {
    data: queryClient.getQueryData<WorkflowSnapshot>(workflowQueryKey),
    isLoading: isLoadingFirebase,
    isError: false,
    error: null,
    refetch: () => getWorkflowSnapshot().then(snapshot => {
      queryClient.setQueryData(workflowQueryKey, snapshot);
      return snapshot;
    }),
  };

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

  const submitIdVerificationMutation = useMutation({
    mutationFn: submitIdVerification,
    onSuccess: syncSnapshot,
  });

  const submitDepositRequestMutation = useMutation({
    mutationFn: async (input: SubmitDepositRequestInput) => {
      // First, create locally for immediate UI feedback
      const localSnapshot = await localSubmitDepositRequest(input);
      
      // Then sync to Firebase for real-time admin visibility
      if (firebaseUserId && firebaseInitialized) {
        const snapshot = queryClient.getQueryData<WorkflowSnapshot>(workflowQueryKey);
        if (snapshot) {
          const wallet = snapshot.depositAddresses.find(w => w.tokenCode === input.tokenCode);
          if (wallet) {
            // Find the newly created request (most recent pending one for this token)
            const newRequest = localSnapshot.depositRequests.find(
              r => r.tokenCode === input.tokenCode && r.status === 'pending_review'
            );
            
            if (newRequest) {
              await firebaseCreateDepositRequest({
                userId: firebaseUserId,
                id: newRequest.id, // Use the same ID for consistency
                tokenCode: input.tokenCode,
                tokenName: wallet.tokenName,
                networkLabel: wallet.networkLabel,
                address: wallet.address,
                requestedAmountUsd: input.amountUsd,
                creditedAmountUsd: null,
                status: 'pending_review',
                submittedAt: new Date(),
                reviewedAt: null,
                approvalMessage: 'Awaiting manual review.',
                submittedByTelegramId: input.submittedByTelegramId,
              }).catch(err => {
                console.error('Failed to sync deposit request to Firebase:', err);
                // Don't throw - local operation succeeded
              });
            }
          }
        }
      }
      
      return localSnapshot;
    },
    onSuccess: syncSnapshot,
  });

  const applyManualDepositReviewMutation = useMutation({
    mutationFn: async (input: Parameters<typeof applyManualDepositReview>[0]) => {
      const targetUserId = (input as Parameters<typeof applyManualDepositReview>[0] & { userId?: string }).userId ?? firebaseUserId;

      if (targetUserId && firebaseInitialized) {
        await firebaseReviewDepositRequest({
          requestId: input.requestId,
          status: input.status,
          creditedAmountUsd: input.creditedAmountUsd,
          approvalMessage: input.approvalMessage,
        }).catch(err => {
          console.error('Failed to sync review to Firebase:', err);
          // Continue with local operation
        });
      }

      if (targetUserId && targetUserId !== firebaseUserId) {
        return applyDepositReviewToUserWorkflow(targetUserId, input);
      }

      return applyManualDepositReview(input);
    },
    onSuccess: (data, variables) => {
      const targetUserId = (variables as typeof variables & { userId?: string }).userId ?? firebaseUserId;
      if (!targetUserId || targetUserId === firebaseUserId) {
        syncSnapshot(data);
      }

      try {
        const now = Date.now();
        const recentlyReviewed = (data.depositRequests || []).filter((r) => {
          if (!r.reviewedAt) return false;
          const reviewedMs = new Date(r.reviewedAt).getTime();
          return now - reviewedMs < 5000; // reviewed in last ~5s
        });

        for (const req of recentlyReviewed) {
          if (!req.submittedByTelegramId) continue;
          const chatId = req.submittedByTelegramId;
          const text = `Your deposit request *${req.id}* for *${req.requestedAmountUsd.toFixed(2)} USD* was *${req.status}*.
${req.approvalMessage ? '\nMessage: ' + req.approvalMessage : ''}`;

          void fetch('/api/notify-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, text }),
          }).catch((e) => console.error('notify-telegram failed', e));
        }
      } catch (err) {
        console.error('Error sending telegram notifications', err);
      }
    },
  });

  const applyManualIdReviewMutation = useMutation({
    mutationFn: applyManualIdReview,
    onSuccess: syncSnapshot,
  });

  const walletBalanceMutation = useMutation({
    mutationFn: async (input: Parameters<typeof setWalletBalances>[0] & { userId?: string }) => {
      if (input.userId && input.userId !== firebaseUserId) {
        return setUserWorkflowWalletBalances(input.userId, input);
      }

      return setWalletBalances(input);
    },
    onSuccess: (snapshot, variables) => {
      if (!variables.userId || variables.userId === firebaseUserId) {
        syncSnapshot(snapshot);
      }
    },
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
    submitIdVerification: submitIdVerificationMutation.mutateAsync,
    applyManualIdReview: applyManualIdReviewMutation.mutateAsync,
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
    isSubmittingIdVerification: submitIdVerificationMutation.isPending,
    isApplyingDepositReview: applyManualDepositReviewMutation.isPending,
    isApplyingIdReview: applyManualIdReviewMutation.isPending,
    isSavingWalletBalances: walletBalanceMutation.isPending,
    isSimulatingDeposit: simulateDepositMutation.isPending,
    isStartingTradingBot: startTradingBotMutation.isPending,
    isSyncingTradingBot: syncTradingBotMutation.isPending,
    isStoppingTradingBot: stopTradingBotMutation.isPending,
    isWithdrawingBotBalance: withdrawBotBalanceMutation.isPending,
    // Firebase state
    firebaseUserId,
    firebaseInitialized,
    firebaseUserData,
  };
};
