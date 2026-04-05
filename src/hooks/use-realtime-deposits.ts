/**
 * Real-time Deposit Requests Hook
 * 
 * This hook provides real-time synchronization of deposit requests
 * between users and admin control panel using Firebase Firestore.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createDepositRequest,
  reviewDepositRequest,
  listenToUserDepositRequests,
  listenToPendingDepositRequests,
  type DepositRequestData,
  type ReviewDepositInput,
} from '@/lib/firebase-deposits';
import type { DepositRequest, SubmitDepositRequestInput, ManualDepositReviewInput, WorkflowSnapshot, DepositWallet } from '@/lib/account-workflow';
import {
  applyManualDepositReview as localApplyManualDepositReview,
  submitDepositRequest as localSubmitDepositRequest,
  getWorkflowSnapshot,
} from '@/lib/account-workflow';

// Convert Firebase DepositRequestData to local DepositRequest
const convertToLocaleDepositRequest = (data: DepositRequestData): DepositRequest => ({
  id: data.id,
  tokenCode: data.tokenCode,
  tokenName: data.tokenName,
  networkLabel: data.networkLabel,
  address: data.address,
  requestedAmountUsd: data.requestedAmountUsd,
  creditedAmountUsd: data.creditedAmountUsd,
  status: data.status,
  copiedAt: null,
  submittedAt: data.submittedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  reviewedAt: data.reviewedAt?.toDate?.()?.toISOString() || null,
  approvalMessage: data.approvalMessage,
  submittedByTelegramId: data.submittedByTelegramId,
});

// ============================================
// Hook for Users - Listen to own deposit requests
// ============================================

export const useUserDepositRequests = (userId: string | null | undefined) => {
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId) {
      setDepositRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Set up real-time listener
    const unsubscribe = listenToUserDepositRequests(userId, (requests) => {
      const localRequests = requests.map(convertToLocaleDepositRequest);
      setDepositRequests(localRequests);
      setIsLoading(false);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
    };
  }, [userId]);

  // Submit deposit request mutation
  const submitMutation = useMutation({
    mutationFn: async (input: SubmitDepositRequestInput & { userId: string }) => {
      const { userId, ...requestData } = input;
      
      // Get wallet info from local snapshot for Firebase sync
      const snapshot = await getWorkflowSnapshot();
      const wallet = snapshot.depositAddresses.find(w => w.tokenCode === requestData.tokenCode);
      
      // First, create locally for immediate UI feedback
      await localSubmitDepositRequest(requestData);
      
      // Then sync to Firebase for real-time admin visibility
      if (wallet) {
        const requestId = await createDepositRequest({
          userId,
          tokenCode: requestData.tokenCode,
          tokenName: wallet.tokenName,
          networkLabel: wallet.networkLabel,
          address: wallet.address,
          requestedAmountUsd: requestData.amountUsd,
          creditedAmountUsd: null,
          status: 'pending_review',
          submittedAt: new Date(),
          reviewedAt: null,
          approvalMessage: 'Awaiting manual review.',
          submittedByTelegramId: requestData.submittedByTelegramId,
        });
        return requestId;
      }
      
      throw new Error('Wallet not found for token: ' + requestData.tokenCode);
    },
  });

  return {
    depositRequests,
    isLoading,
    error,
    submitDepositRequest: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
  };
};

// ============================================
// Hook for Admin - Listen to all pending requests
// ============================================

export const usePendingDepositRequests = () => {
  const [pendingRequests, setPendingRequests] = useState<DepositRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Set up real-time listener for pending requests
    const unsubscribe = listenToPendingDepositRequests((requests) => {
      const localRequests = requests.map(convertToLocaleDepositRequest);
      setPendingRequests(localRequests);
      setIsLoading(false);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
    };
  }, []);

  // Review deposit request mutation
  const reviewMutation = useMutation({
    mutationFn: async (input: ReviewDepositInput) => {
      // Update in Firebase (this will trigger real-time update for user)
      await reviewDepositRequest(input);
      
      // Also update local state for immediate admin UI feedback
      await localApplyManualDepositReview({
        requestId: input.requestId,
        status: input.status,
        creditedAmountUsd: input.creditedAmountUsd,
        approvalMessage: input.approvalMessage,
      });
      
      return input;
    },
    onSuccess: () => {
      // Refetch to get latest state
      queryClient.invalidateQueries({ queryKey: ['pending-deposits'] });
    },
  });

  return {
    pendingRequests,
    isLoading,
    error,
    reviewDepositRequest: reviewMutation.mutateAsync,
    isReviewing: reviewMutation.isPending,
  };
};

// ============================================
// Enhanced hook that integrates with existing account-workflow
// ============================================

export const useRealtimeDepositSync = (
  userId: string | null | undefined,
  onDepositRequestUpdate?: (requests: DepositRequest[]) => void
) => {
  const [syncedRequests, setSyncedRequests] = useState<DepositRequest[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId) {
      setSyncedRequests([]);
      return;
    }

    const unsubscribe = listenToUserDepositRequests(userId, (requests) => {
      const localRequests = requests.map(convertToLocaleDepositRequest);
      setSyncedRequests(localRequests);
      setLastSyncTime(new Date());
      
      if (onDepositRequestUpdate) {
        onDepositRequestUpdate(localRequests);
      }
    });

    unsubscribeRef.current = unsubscribe;

    return () => unsubscribe();
  }, [userId, onDepositRequestUpdate]);

  return {
    syncedRequests,
    lastSyncTime,
    hasPendingRequests: syncedRequests.some(r => r.status === 'pending_review'),
    pendingCount: syncedRequests.filter(r => r.status === 'pending_review').length,
    approvedCount: syncedRequests.filter(r => r.status === 'approved').length,
    rejectedCount: syncedRequests.filter(r => r.status === 'rejected').length,
  };
};

export default {
  useUserDepositRequests,
  usePendingDepositRequests,
  useRealtimeDepositSync,
};