import { useEffect, useState, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  activateAccountWorkflows,
  applyManualDepositReview,
  calculateDepositBonusUsd,
  createWorkflowSnapshot,
  DEPOSIT_BONUS_PERCENT,
  getCompletionPercentage,
  getDepositTotalWithBonusUsd,
  getIncompleteSteps,
  getTotalWalletBalance,
  getWorkflowSnapshot,
  isDashboardUnlocked,
  isDepositUnlocked,
  recordIncomingDeposit,
  refreshDepositTracking,
  rebaseWorkflowSnapshot,
  replaceWorkflowSnapshot,
  setDepositAddresses as setLocalDepositAddresses,
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
  applyIdReviewToUserWorkflow,
  setUserWorkflowDepositAddresses,
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
      let seededSnapshot: WorkflowSnapshot | null = null;

      try {
        const { userId, userData, unsubscribe: unsubscribeSession } = await initializeUserSession();
        const cachedSnapshot = await getWorkflowSnapshot();
        setFirebaseUserId(userId);
        setFirebaseUserData(userData);

        seededSnapshot = userData
          ? convertUserDataToSnapshot(userData, rebaseWorkflowSnapshot(cachedSnapshot, userId))
          : rebaseWorkflowSnapshot(cachedSnapshot, userId);

        replaceWorkflowSnapshot(seededSnapshot);
        queryClient.setQueryData(workflowQueryKey, seededSnapshot);

        if (!userData?.workflowSnapshot) {
          try {
            await syncUserWorkflow(userId, seededSnapshot);
          } catch (syncError) {
            console.error("Failed to sync initial workflow to Firebase:", syncError);
          }
        }

        // Set up real-time listener for Firebase data
        const unsubscribeFromUpdates = listenToUser(userId, (updatedData) => {
          setFirebaseUserData(updatedData);
          const currentSnapshot = queryClient.getQueryData<WorkflowSnapshot>(workflowQueryKey) ?? seededSnapshot;
          const nextSnapshot = updatedData
            ? convertUserDataToSnapshot(updatedData, currentSnapshot)
            : rebaseWorkflowSnapshot(currentSnapshot, userId);

          replaceWorkflowSnapshot(nextSnapshot);
          queryClient.setQueryData(workflowQueryKey, nextSnapshot);
        });

        setFirebaseInitialized(true);
        setIsLoadingFirebase(false);

        return () => {
          unsubscribeSession?.();
          unsubscribeFromUpdates();
        };
      } catch (error) {
        console.error('Failed to initialize Firebase:', error);
        if (seededSnapshot) {
          queryClient.setQueryData(workflowQueryKey, seededSnapshot);
        } else {
          try {
            const initialSnapshot = await getWorkflowSnapshot();
            queryClient.setQueryData(workflowQueryKey, initialSnapshot);
          } catch (e) {
            console.error('Failed to load fallback snapshot:', e);
          }
        }
        setIsLoadingFirebase(false);
        setFirebaseInitialized(true);
      }
    };

    let unsubscribe: (() => void) | undefined;

    void initFirebase().then((cleanup) => {
      unsubscribe = cleanup ?? undefined;
    });

    return () => {
      unsubscribe?.();
    };
  }, [queryClient]);

  const syncSnapshot = useCallback((snapshot: WorkflowSnapshot) => {
    const sharedSnapshot = replaceWorkflowSnapshot(
      firebaseUserId ? rebaseWorkflowSnapshot(snapshot, firebaseUserId) : snapshot,
    );
    queryClient.setQueryData(workflowQueryKey, sharedSnapshot);
    
    // Also sync to Firebase if available
    if (firebaseUserId && firebaseInitialized) {
      syncUserWorkflow(firebaseUserId, sharedSnapshot).catch(console.error);
    }
  }, [firebaseUserId, firebaseInitialized, queryClient]);

  useEffect(() => {
    if (!firebaseUserId) {
      return;
    }

    const cachedSnapshot = queryClient.getQueryData<WorkflowSnapshot>(workflowQueryKey);
    if (!cachedSnapshot || cachedSnapshot.userId === firebaseUserId) {
      return;
    }

    const rebasedSnapshot = replaceWorkflowSnapshot(rebaseWorkflowSnapshot(cachedSnapshot, firebaseUserId));
    queryClient.setQueryData(workflowQueryKey, rebasedSnapshot);

    if (firebaseInitialized) {
      syncUserWorkflow(firebaseUserId, rebasedSnapshot).catch(console.error);
    }
  }, [firebaseInitialized, firebaseUserId, queryClient]);

  const cachedSnapshot = queryClient.getQueryData<WorkflowSnapshot>(workflowQueryKey);

  const resolvedSnapshot = useMemo(() => {
    if (!cachedSnapshot) {
      return cachedSnapshot;
    }

    return firebaseUserId ? rebaseWorkflowSnapshot(cachedSnapshot, firebaseUserId) : cachedSnapshot;
  }, [cachedSnapshot, firebaseUserId]);

  // Use getWorkflowSnapshot for initial data (falls back to localStorage if Firebase not ready)
  const query = {
    data: resolvedSnapshot,
    isLoading: isLoadingFirebase,
    isError: false,
    error: null,
    refetch: () => getWorkflowSnapshot().then(snapshot => {
      const nextSnapshot = firebaseUserId ? rebaseWorkflowSnapshot(snapshot, firebaseUserId) : snapshot;
      queryClient.setQueryData(workflowQueryKey, nextSnapshot);
      return nextSnapshot;
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
                depositBonusUsd: null,
                totalCreditedAmountUsd: null,
                status: 'pending_review',
                submittedAt: new Date(),
                reviewedAt: null,
                approvalMessage: `Awaiting manual review. Approved deposits receive a ${DEPOSIT_BONUS_PERCENT}% bonus.`,
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
          const depositBonusUsd =
            req.depositBonusUsd ?? (req.creditedAmountUsd != null ? calculateDepositBonusUsd(req.creditedAmountUsd) : null);
          const totalCreditedAmountUsd =
            req.totalCreditedAmountUsd ?? (req.creditedAmountUsd != null ? getDepositTotalWithBonusUsd(req.creditedAmountUsd) : null);
          const approvedBreakdown =
            req.status === "approved" && req.creditedAmountUsd != null && depositBonusUsd != null && totalCreditedAmountUsd != null
              ? `\nDeposit: ${req.creditedAmountUsd.toFixed(2)} USD\nBonus: ${depositBonusUsd.toFixed(2)} USD\nTotal added: ${totalCreditedAmountUsd.toFixed(2)} USD`
              : "";
          const text = `Your deposit request *${req.id}* for *${req.requestedAmountUsd.toFixed(2)} USD* was *${req.status}*.
${approvedBreakdown}${req.approvalMessage ? '\nMessage: ' + req.approvalMessage : ''}`;

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
    mutationFn: async (input: Parameters<typeof applyManualIdReview>[0] & { userId?: string }) => {
      if (input.userId && input.userId !== firebaseUserId) {
        return applyIdReviewToUserWorkflow(input.userId, input);
      }

      return applyManualIdReview(input);
    },
    onSuccess: (snapshot, variables) => {
      if (!variables.userId || variables.userId === firebaseUserId) {
        syncSnapshot(snapshot);
      }
    },
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

  const depositAddressMutation = useMutation({
    mutationFn: async (input: { userId?: string; addresses: Parameters<typeof setLocalDepositAddresses>[0] }) => {
      if (input.userId && input.userId !== firebaseUserId) {
        return setUserWorkflowDepositAddresses(input.userId, input.addresses);
      }

      return setLocalDepositAddresses(input.addresses);
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
    setDepositAddresses: depositAddressMutation.mutateAsync,
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
    isSavingDepositAddresses: depositAddressMutation.isPending,
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
