/**
 * Custom React Hook for Firebase User Management
 * 
 * This hook provides Firebase integration for React components,
 * handling authentication, real-time data sync, and user state management.
 * Compatible with Telegram WebApp webview.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initializeUserSession,
  cleanupFirebase,
  listenToUser,
  updateUserDepositAmount,
  updateUserStatus,
  createUser,
  getUser,
  type UserData,
  type UserStatus
} from '@/lib/firebase';

interface UseFirebaseUserReturn {
  // User data
  userId: string | null;
  userData: UserData | null;
  
  // Loading and error states
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  
  // Status helpers
  isPending: boolean;
  isApproved: boolean;
  isRejected: boolean;
  
  // Actions
  submitDeposit: (amount: number) => Promise<void>;
  refreshUserData: () => Promise<void>;
  
  // Real-time listener
  unsubscribe: (() => void) | null;
}

/**
 * Custom hook for Firebase user management
 * Handles authentication, real-time sync, and user data operations
 */
export const useFirebaseUser = (): UseFirebaseUserReturn => {
  // State
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Ref for unsubscribe function
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize user session on mount
  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { 
          userId: newUserId, 
          userData: newUserData, 
          unsubscribe 
        } = await initializeUserSession();

        if (!isMounted) return;

        setUserId(newUserId);
        setUserData(newUserData);
        unsubscribeRef.current = unsubscribe;

        console.log('✅ Firebase user session initialized');
      } catch (err) {
        if (!isMounted) return;

        console.error('❌ Failed to initialize Firebase session:', err);
        setIsError(true);
        setError(err instanceof Error ? err : new Error('Failed to initialize Firebase'));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initSession();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (unsubscribeRef.current) {
        cleanupFirebase(unsubscribeRef.current);
      }
    };
  }, []);

  // Set up real-time listener when userId changes
  useEffect(() => {
    if (!userId) return;

    // Unsubscribe from previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Set up new real-time listener
    const unsubscribe = listenToUser(userId, (updatedUserData) => {
      setUserData(updatedUserData);
      console.log('🔄 Real-time user data updated:', updatedUserData);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
    };
  }, [userId]);

  // Submit deposit - creates/updates user document with pending status
  const submitDeposit = useCallback(async (amount: number): Promise<void> => {
    if (!userId) {
      throw new Error('No user ID available');
    }

    try {
      // Check if user exists
      const existingUser = await getUser(userId);
      
      if (existingUser) {
        // Update existing user with new deposit amount and pending status
        await updateUserDepositAmount(userId, amount);
        await updateUserStatus(userId, 'pending');
      } else {
        // Create new user with deposit amount
        await createUser(userId, {
          depositAmount: amount,
          status: 'pending'
        });
      }

      // Update local state immediately for better UX
      setUserData(prev => prev ? {
        ...prev,
        depositAmount: amount,
        status: 'pending' as UserStatus
      } : null);

      console.log('✅ Deposit submitted successfully');
    } catch (err) {
      console.error('❌ Failed to submit deposit:', err);
      throw err;
    }
  }, [userId]);

  // Refresh user data from Firestore
  const refreshUserData = useCallback(async (): Promise<void> => {
    if (!userId) return;

    try {
      const freshUserData = await getUser(userId);
      setUserData(freshUserData);
      console.log('✅ User data refreshed');
    } catch (err) {
      console.error('❌ Failed to refresh user data:', err);
      throw err;
    }
  }, [userId]);

  // Computed status helpers
  const isPending = userData?.status === 'pending';
  const isApproved = userData?.status === 'approved';
  const isRejected = userData?.status === 'rejected';

  return {
    // User data
    userId,
    userData,
    
    // Loading and error states
    isLoading,
    isError,
    error,
    
    // Status helpers
    isPending,
    isApproved,
    isRejected,
    
    // Actions
    submitDeposit,
    refreshUserData,
    
    // Real-time listener
    unsubscribe: unsubscribeRef.current
  };
};

export default useFirebaseUser;