/**
 * Custom React Hook for Firebase Admin Operations
 * 
 * This hook provides admin functionality for managing user deposits,
 * including approving/rejecting deposits and viewing all pending users.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getUsersByStatus,
  getAllUsers,
  approveUserDeposit,
  rejectUserDeposit,
  getUser,
  type UserData,
  type UserStatus
} from '@/lib/firebase';

interface UseFirebaseAdminReturn {
  // User lists
  pendingUsers: UserData[];
  approvedUsers: UserData[];
  rejectedUsers: UserData[];
  allUsers: UserData[];
  
  // Loading and error states
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  
  // Actions
  refreshPendingUsers: () => Promise<void>;
  refreshApprovedUsers: () => Promise<void>;
  refreshRejectedUsers: () => Promise<void>;
  refreshAllUsers: () => Promise<void>;
  approveDeposit: (userId: string) => Promise<void>;
  rejectDeposit: (userId: string) => Promise<void>;
  getUserById: (userId: string) => Promise<UserData | null>;
  
  // Stats
  stats: {
    totalUsers: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    totalDeposits: number;
  };
}

/**
 * Custom hook for Firebase admin operations
 * Provides functions to manage user deposits and view statistics
 */
export const useFirebaseAdmin = (): UseFirebaseAdminReturn => {
  // State
  const [pendingUsers, setPendingUsers] = useState<UserData[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<UserData[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<UserData[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load all user data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [pending, approved, rejected, all] = await Promise.all([
        getUsersByStatus('pending'),
        getUsersByStatus('approved'),
        getUsersByStatus('rejected'),
        getAllUsers()
      ]);

      setPendingUsers(pending);
      setApprovedUsers(approved);
      setRejectedUsers(rejected);
      setAllUsers(all);

      console.log('✅ Admin data loaded successfully');
    } catch (err) {
      console.error('❌ Failed to load admin data:', err);
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to load admin data'));
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh functions
  const refreshPendingUsers = useCallback(async () => {
    try {
      const pending = await getUsersByStatus('pending');
      setPendingUsers(pending);
      console.log('✅ Pending users refreshed');
    } catch (err) {
      console.error('❌ Failed to refresh pending users:', err);
      throw err;
    }
  }, []);

  const refreshApprovedUsers = useCallback(async () => {
    try {
      const approved = await getUsersByStatus('approved');
      setApprovedUsers(approved);
      console.log('✅ Approved users refreshed');
    } catch (err) {
      console.error('❌ Failed to refresh approved users:', err);
      throw err;
    }
  }, []);

  const refreshRejectedUsers = useCallback(async () => {
    try {
      const rejected = await getUsersByStatus('rejected');
      setRejectedUsers(rejected);
      console.log('✅ Rejected users refreshed');
    } catch (err) {
      console.error('❌ Failed to refresh rejected users:', err);
      throw err;
    }
  }, []);

  const refreshAllUsers = useCallback(async () => {
    try {
      const all = await getAllUsers();
      setAllUsers(all);
      console.log('✅ All users refreshed');
    } catch (err) {
      console.error('❌ Failed to refresh all users:', err);
      throw err;
    }
  }, []);

  // Approve deposit
  const approveDeposit = useCallback(async (userId: string): Promise<void> => {
    try {
      await approveUserDeposit(userId);
      console.log('✅ Deposit approved for user:', userId);
      
      // Refresh the lists
      await Promise.all([
        refreshPendingUsers(),
        refreshApprovedUsers(),
        refreshAllUsers()
      ]);
    } catch (err) {
      console.error('❌ Failed to approve deposit:', err);
      throw err;
    }
  }, [refreshPendingUsers, refreshApprovedUsers, refreshAllUsers]);

  // Reject deposit
  const rejectDeposit = useCallback(async (userId: string): Promise<void> => {
    try {
      await rejectUserDeposit(userId);
      console.log('✅ Deposit rejected for user:', userId);
      
      // Refresh the lists
      await Promise.all([
        refreshPendingUsers(),
        refreshRejectedUsers(),
        refreshAllUsers()
      ]);
    } catch (err) {
      console.error('❌ Failed to reject deposit:', err);
      throw err;
    }
  }, [refreshPendingUsers, refreshRejectedUsers, refreshAllUsers]);

  // Get user by ID
  const getUserById = useCallback(async (userId: string): Promise<UserData | null> => {
    try {
      const user = await getUser(userId);
      return user;
    } catch (err) {
      console.error('❌ Failed to get user:', err);
      return null;
    }
  }, []);

  // Calculate stats
  const stats = {
    totalUsers: allUsers.length,
    pendingCount: pendingUsers.length,
    approvedCount: approvedUsers.length,
    rejectedCount: rejectedUsers.length,
    totalDeposits: allUsers.reduce((sum, user) => sum + (user.depositAmount || 0), 0)
  };

  return {
    // User lists
    pendingUsers,
    approvedUsers,
    rejectedUsers,
    allUsers,
    
    // Loading and error states
    isLoading,
    isError,
    error,
    
    // Actions
    refreshPendingUsers,
    refreshApprovedUsers,
    refreshRejectedUsers,
    refreshAllUsers,
    approveDeposit,
    rejectDeposit,
    getUserById,
    
    // Stats
    stats
  };
};

export default useFirebaseAdmin;