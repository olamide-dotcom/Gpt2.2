import { useEffect, useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
  getOrCreateUserId,
  initializeUserSession,
  listenToUser,
  updateUser,
  createUser,
  getUser,
  type UserData,
} from "@/lib/firebase";

// Real-time deposit sync imports
import {
  createDepositRequest as firebaseCreateDepositRequest,
  reviewDepositRequest as firebaseReviewDepositRequest,
  listenToUserDepositRequests,
  type DepositRequestData,
} from "@/lib/firebase-deposits";
import type { DepositRequest } from "@/lib/account-workflow";

const workflowQueryKey = ["account-workflow"];

// Convert Firebase UserData to WorkflowSnapshot
const convertUserDataToSnapshot = (userData: UserData | null, existingSnapshot?: WorkflowSnapshot): WorkflowSnapshot => {
  // If we have existing snapshot, preserve most fields and only update what's in Firebase
  if (existingSnapshot) {
    return {
      ...existingSnapshot,
      // Override with Firebase data
      approvalStatus: userData?.status === 'approved' ? 'approved' : (userData?.status === 'rejected' ? 'draft' : 'draft'),
      mainWalletBalanceUsd: userData?.depositAmount || existingSnapshot.mainWalletBalanceUsd,
      updatedAt: new Date().toISOString(),
    };
  }

  // Create a new snapshot from Firebase data
  return {
    userId: userData?.userId || "unknown",
    currentStepId: "review-access-requirements" as any,
    completedStepIds: [],
    approvalStatus: userData?.status === 'approved' ? 'approved' : 'draft',
    approvedAt: null,
    selectedStrategyId: null,
    reviewRequirements: {
      residenceCountry: "",
      investorProfile: "",
      acknowledgements: {
        disclosures: false,
        eligibility: false,
        communications: false,
      },
    },
    identityChecks: {
      fullName: userData?.fullName || "",
      email: userData?.email || "",
      country: "",
      idType: "",
      notes: "",
    },
    activation: {
      supportChannel: "email",
      reportingCadence: "weekly",
      alertsEnabled: true,
      fundingAcknowledgement: false,
    },
    depositAddresses: [],
    depositRequests: [],
    transactions: [],
    syncState: {
      webhookReady: true,
      pollingReady: true,
      lastWebhookCheckAt: null,
      lastPollingCheckAt: null,
    },
    simulatedDeposits: [],
    mainWalletBalanceUsd: userData?.depositAmount || 0,
    botWalletBalanceUsd: 0,
    bonusUsd: 0,
    bonusLocked: true,
    idVerificationRequests: [],
    dashboardUnlocked: false,
    bot: {
      status: "idle",
      active: false,
      allocatedAmountUsd: 0,
      startingBalanceUsd: 0,
      currentBalanceUsd: 0,
      profitUsd: 0,
      profitLossPercent: 0,
      tradingSettings: null,
      activeTradeLabel: null,
      startedAt: null,
      stoppedAt: null,
      lastUpdatedAt: null,
      sessionId: null,
      tickCount: 0,
    },
    updatedAt: new Date().toISOString(),
  };
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
      const depositAmount = snapshot.mainWalletBalanceUsd || snapshot.botWalletBalanceUsd;
      const status = snapshot.approvalStatus === 'approved' ? 'approved' : 
                     snapshot.depositRequests.some(r => r.status === 'pending_review') ? 'pending' : 'draft';
      
      updateUser(firebaseUserId, {
        depositAmount,
        status: status as any,
        email: snapshot.identityChecks?.email,
        fullName: snapshot.identityChecks?.fullName,
      }).catch(console.error);
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
    onSuccess: (snapshot) => {
      syncSnapshot(snapshot);
      // Also update Firebase with identity info
      if (firebaseUserId) {
        updateUser(firebaseUserId, {
          email: snapshot.identityChecks.email,
          fullName: snapshot.identityChecks.fullName,
        }).catch(console.error);
      }
    },
  });

  const strategyTrackMutation = useMutation({
    mutationFn: saveStrategyTrack,
    onSuccess: syncSnapshot,
  });

  const activationMutation = useMutation({
    mutationFn: activateAccountWorkflows,
    onSuccess: (snapshot) => {
      syncSnapshot(snapshot);
      // Update Firebase status to approved
      if (firebaseUserId) {
        updateUser(firebaseUserId, {
          status: 'approved',
        }).catch(console.error);
      }
    },
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
      // First, update in Firebase (this will trigger real-time update for user)
      if (firebaseUserId && firebaseInitialized) {
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
      
      // Then update locally
      return applyManualDepositReview(input);
    },
    onSuccess: (data) => {
      syncSnapshot(data);

      try {
        const now = Date.now();
        const recentlyReviewed = (data.depositRequests || []).filter((r: any) => {
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
    mutationFn: setWalletBalances,
    onSuccess: (snapshot) => {
      syncSnapshot(snapshot);
      // Update Firebase with new balance
      if (firebaseUserId) {
        const balance = snapshot.mainWalletBalanceUsd || snapshot.botWalletBalanceUsd;
        updateUser(firebaseUserId, {
          depositAmount: balance,
        }).catch(console.error);
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