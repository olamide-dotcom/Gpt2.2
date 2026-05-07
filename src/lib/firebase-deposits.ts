/**
 * Firebase Deposit Requests Management
 * 
 * This file handles real-time deposit request synchronization between
 * users and admin control panel using Firebase Firestore.
 */

import { 
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import {
  calculateDepositBonusUsd,
  DEPOSIT_BONUS_PERCENT,
  getDepositTotalWithBonusUsd,
  type DepositTokenCode,
  type DepositRequestStatus,
} from './account-workflow';

// ============================================
// Firestore Collection References
// ============================================

const DEPOSITS_COLLECTION = 'deposit_requests';

const toTimestampMs = (value: any): number => {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortBySubmittedAtDesc = <T extends { submittedAt: any }>(requests: T[]): T[] =>
  [...requests].sort((a, b) => toTimestampMs(b.submittedAt) - toTimestampMs(a.submittedAt));

// ============================================
// Types
// ============================================

export interface DepositRequestData {
  id: string;
  userId: string;
  tokenCode: DepositTokenCode;
  tokenName: string;
  networkLabel: string;
  address: string;
  requestedAmountUsd: number;
  creditedAmountUsd: number | null;
  depositBonusUsd?: number | null;
  totalCreditedAmountUsd?: number | null;
  status: DepositRequestStatus;
  submittedAt: any; // serverTimestamp or Date
  reviewedAt: any; // serverTimestamp or Date | null
  approvalMessage: string | null;
  submittedByTelegramId?: string | null;
  txHash?: string;
  createdAt: any;
  updatedAt: any;
}

export interface ReviewDepositInput {
  requestId: string;
  status: 'approved' | 'rejected';
  creditedAmountUsd?: number | null;
  approvalMessage?: string;
}

// ============================================
// Create Deposit Request
// ============================================

/**
 * Create a new deposit request in Firestore
 * Optionally accepts a custom ID for consistency with local state
 */
export const createDepositRequest = async (
  data: Omit<DepositRequestData, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> => {
  try {
    // Use provided ID or generate a new one
    const requestRef = data.id 
      ? doc(db, DEPOSITS_COLLECTION, data.id)
      : doc(collection(db, DEPOSITS_COLLECTION));
    
    const { id, ...restData } = data;
    const depositData: Omit<DepositRequestData, 'id'> = {
      ...restData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(requestRef, depositData);
    console.log('✅ Deposit request created:', requestRef.id);
    return requestRef.id;
  } catch (error) {
    console.error('❌ Error creating deposit request:', error);
    throw error;
  }
};

// ============================================
// Get Deposit Requests for User
// ============================================

/**
 * Get all deposit requests for a specific user
 */
export const getUserDepositRequests = async (userId: string): Promise<DepositRequestData[]> => {
  try {
    const depositsQuery = query(
      collection(db, DEPOSITS_COLLECTION),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(depositsQuery);
    const requests: DepositRequestData[] = [];
    
    querySnapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() } as DepositRequestData);
    });
    
    console.log(`✅ Fetched ${requests.length} deposit requests for user:`, userId);
    return sortBySubmittedAtDesc(requests);
  } catch (error) {
    console.error('❌ Error fetching user deposit requests:', error);
    return [];
  }
};

// ============================================
// Real-time Listener for User's Deposit Requests
// ============================================

/**
 * Listen to real-time changes for a user's deposit requests
 * Returns an unsubscribe function
 */
export const listenToUserDepositRequests = (
  userId: string,
  callback: (requests: DepositRequestData[]) => void
): (() => void) => {
  try {
    const depositsQuery = query(
      collection(db, DEPOSITS_COLLECTION),
      where('userId', '==', userId)
    );
    
    const unsubscribe = onSnapshot(depositsQuery, (querySnapshot) => {
      const requests: DepositRequestData[] = [];
      
      querySnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() } as DepositRequestData);
      });
      
      console.log('🔄 Real-time deposit requests update:', requests.length, 'requests');
      callback(sortBySubmittedAtDesc(requests));
    }, (error) => {
      console.error('❌ Error listening to deposit requests:', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up deposit requests listener:', error);
    return () => {};
  }
};

// ============================================
// Admin Functions - Get All Pending Requests
// ============================================

/**
 * Get all pending deposit requests (for admin panel)
 */
export const getPendingDepositRequests = async (): Promise<DepositRequestData[]> => {
  try {
    const depositsQuery = query(
      collection(db, DEPOSITS_COLLECTION),
      where('status', '==', 'pending_review')
    );
    
    const querySnapshot = await getDocs(depositsQuery);
    const requests: DepositRequestData[] = [];
    
    querySnapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() } as DepositRequestData);
    });
    
    console.log(`✅ Fetched ${requests.length} pending deposit requests`);
    return sortBySubmittedAtDesc(requests);
  } catch (error) {
    console.error('❌ Error fetching pending deposit requests:', error);
    return [];
  }
};

/**
 * Listen to real-time changes for pending deposit requests (for admin panel)
 * Returns an unsubscribe function
 */
export const listenToPendingDepositRequests = (
  callback: (requests: DepositRequestData[]) => void
): (() => void) => {
  try {
    const depositsQuery = query(
      collection(db, DEPOSITS_COLLECTION),
      where('status', '==', 'pending_review')
    );
    
    const unsubscribe = onSnapshot(depositsQuery, (querySnapshot) => {
      const requests: DepositRequestData[] = [];
      
      querySnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() } as DepositRequestData);
      });
      
      console.log('🔄 Real-time pending requests update:', requests.length, 'pending');
      callback(sortBySubmittedAtDesc(requests));
    }, (error) => {
      console.error('❌ Error listening to pending deposit requests:', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up pending requests listener:', error);
    return () => {};
  }
};

// ============================================
// Admin Functions - Review Deposit Request
// ============================================

/**
 * Update a deposit request with admin review decision
 */
export const reviewDepositRequest = async (input: ReviewDepositInput): Promise<void> => {
  try {
    const requestRef = doc(db, DEPOSITS_COLLECTION, input.requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Deposit request not found');
    }
    
    const updateData: Partial<DepositRequestData> = {
      status: input.status,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      approvalMessage: input.approvalMessage || (
        input.status === 'approved'
          ? `Deposit confirmed manually. ${DEPOSIT_BONUS_PERCENT}% bonus added to your balance.`
          : 'Deposit request rejected during manual review.'
      ),
    };

    if (input.status === 'approved') {
      const requestData = requestSnap.data() as Partial<DepositRequestData>;
      const creditedAmountUsd =
        typeof input.creditedAmountUsd === 'number' && Number.isFinite(input.creditedAmountUsd)
          ? input.creditedAmountUsd
          : typeof requestData.requestedAmountUsd === 'number'
            ? requestData.requestedAmountUsd
            : 0;

      updateData.creditedAmountUsd = creditedAmountUsd;
      updateData.depositBonusUsd = calculateDepositBonusUsd(creditedAmountUsd);
      updateData.totalCreditedAmountUsd = getDepositTotalWithBonusUsd(creditedAmountUsd);
    } else {
      updateData.creditedAmountUsd = null;
      updateData.depositBonusUsd = null;
      updateData.totalCreditedAmountUsd = null;
    }
    
    await updateDoc(requestRef, updateData);
    console.log('✅ Deposit request reviewed:', input.requestId, input.status);
  } catch (error) {
    console.error('❌ Error reviewing deposit request:', error);
    throw error;
  }
};

// ============================================
// Get Single Deposit Request
// ============================================

/**
 * Get a single deposit request by ID
 */
export const getDepositRequest = async (requestId: string): Promise<DepositRequestData | null> => {
  try {
    const requestRef = doc(db, DEPOSITS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (requestSnap.exists()) {
      return { id: requestSnap.id, ...requestSnap.data() } as DepositRequestData;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error fetching deposit request:', error);
    return null;
  }
};

// ============================================
// Listen to Single Deposit Request
// ============================================

/**
 * Listen to real-time changes for a single deposit request
 */
export const listenToDepositRequest = (
  requestId: string,
  callback: (request: DepositRequestData | null) => void
): (() => void) => {
  const requestRef = doc(db, DEPOSITS_COLLECTION, requestId);
  
  const unsubscribe = onSnapshot(requestRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      callback({ id: docSnapshot.id, ...docSnapshot.data() } as DepositRequestData);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('❌ Error listening to deposit request:', error);
    callback(null);
  });
  
  return unsubscribe;
};

// ============================================
// Utility Functions
// ============================================

/**
 * Convert Firestore timestamp to Date
 */
export const fromFirestoreTimestamp = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  return new Date(timestamp);
};

/**
 * Format timestamp for display
 */
export const formatTimestamp = (timestamp: any): string => {
  const date = fromFirestoreTimestamp(timestamp);
  if (!date) return 'Not yet recorded';
  
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

// ============================================
// Exports
// ============================================

export default {
  createDepositRequest,
  getUserDepositRequests,
  listenToUserDepositRequests,
  getPendingDepositRequests,
  listenToPendingDepositRequests,
  reviewDepositRequest,
  getDepositRequest,
  listenToDepositRequest,
  fromFirestoreTimestamp,
  formatTimestamp,
};
