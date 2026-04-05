/**
 * Firebase Configuration and Initialization
 * 
 * This file sets up Firebase for the React web app that runs inside Telegram bot webview.
 * It configures Firestore Database and Firebase Authentication (anonymous auth).
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  type Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import { 
  getAuth, 
  type Auth,
  signInAnonymously,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import {
  applyManualDepositReviewToSnapshot,
  applyWalletBalanceOverridesToSnapshot,
  createWorkflowSnapshot,
  type ManualDepositReviewInput,
  type WalletBalanceOverrideInput,
  type WorkflowSnapshot,
} from './account-workflow';

// Firebase configuration - replace with your actual Firebase project config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "your-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project-id.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project-id.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "your-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "your-app-id",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "your-measurement-id"
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

// ============================================
// Firestore Collection References
// ============================================

const USERS_COLLECTION = 'users';

// ============================================
// Types
// ============================================

export interface UserData {
  userId: string;
  depositAmount?: number;
  mainWalletBalanceUsd?: number;
  botWalletBalanceUsd?: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt?: Date;
  email?: string;
  fullName?: string;
  walletAddress?: string;
  kycStatus?: 'pending' | 'approved' | 'rejected';
  workflowSnapshot?: WorkflowSnapshot;
}

export type UserStatus = 'pending' | 'approved' | 'rejected';

// ============================================
// Authentication Functions
// ============================================

/**
 * Sign in anonymously to Firebase
 * Returns the authenticated user
 */
export const signInAnonymouslyToFirebase = async (): Promise<User | null> => {
  try {
    const result = await signInAnonymously(auth);
    console.log('✅ Anonymous sign-in successful, userId:', result.user.uid);
    return result.user;
  } catch (error) {
    console.error('❌ Anonymous sign-in failed:', error);
    return null;
  }
};

/**
 * Listen to authentication state changes
 * Callback receives the user object or null if signed out
 */
export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Get or create a userId - uses Firebase anonymous auth
 * Stores the userId in localStorage for persistence
 */
export const getOrCreateUserId = async (): Promise<string> => {
  // Check if we already have a userId in localStorage
  const storedUserId = localStorage.getItem('firebase_userId');
  if (storedUserId) {
    console.log('📱 Using stored userId:', storedUserId);
    return storedUserId;
  }

  // Sign in anonymously to get a new userId
  const user = await signInAnonymouslyToFirebase();
  if (user) {
    const userId = user.uid;
    localStorage.setItem('firebase_userId', userId);
    console.log('💾 Stored new userId:', userId);
    return userId;
  }

  // Fallback: generate a random ID if auth fails
  const fallbackId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('firebase_userId', fallbackId);
  console.log('⚠️ Using fallback userId:', fallbackId);
  return fallbackId;
};

// ============================================
// Firestore User Functions
// ============================================

/**
 * Create a new user document in Firestore
 */
export const createUser = async (
  userId: string, 
  data: Partial<UserData> = {}
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userData: UserData = {
      userId,
      status: 'pending',
      createdAt: new Date(),
      ...data
    };
    
    await setDoc(userRef, userData);
    console.log('✅ User created in Firestore:', userId);
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  }
};

/**
 * Get a user document from Firestore
 */
export const getUser = async (userId: string): Promise<UserData | null> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      console.log('✅ User fetched from Firestore:', userId);
      return userSnap.data() as UserData;
    }
    
    console.log('ℹ️ No user found with ID:', userId);
    return null;
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    return null;
  }
};

/**
 * Update a user document in Firestore
 */
export const updateUser = async (
  userId: string, 
  data: Partial<UserData>
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date()
    });
    console.log('✅ User updated in Firestore:', userId);
  } catch (error) {
    console.error('❌ Error updating user:', error);
    throw error;
  }
};

export const upsertUser = async (
  userId: string,
  data: Partial<UserData>
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(
      userRef,
      {
        userId,
        ...data,
        updatedAt: new Date(),
      },
      { merge: true },
    );
    console.log('✅ User upserted in Firestore:', userId);
  } catch (error) {
    console.error('❌ Error upserting user:', error);
    throw error;
  }
};

const buildUserWorkflowPatch = (snapshot: WorkflowSnapshot): Partial<UserData> => ({
  workflowSnapshot: snapshot,
  depositAmount: snapshot.mainWalletBalanceUsd,
  mainWalletBalanceUsd: snapshot.mainWalletBalanceUsd,
  botWalletBalanceUsd: snapshot.botWalletBalanceUsd,
  status: snapshot.approvalStatus === 'approved' ? 'approved' : 'pending',
  email: snapshot.identityChecks.email || undefined,
  fullName: snapshot.identityChecks.fullName || undefined,
});

export const syncUserWorkflow = async (
  userId: string,
  snapshot: WorkflowSnapshot,
): Promise<void> => {
  await upsertUser(userId, buildUserWorkflowPatch(snapshot));
};

const createRemoteWorkflowBase = (userId: string, userData: UserData | null) =>
  createWorkflowSnapshot(
    userData?.workflowSnapshot
      ? {
          ...userData.workflowSnapshot,
          userId,
        }
      : {
          userId,
          identityChecks: {
            fullName: userData?.fullName ?? '',
            email: userData?.email ?? '',
            country: '',
            idType: '',
            notes: '',
          },
          mainWalletBalanceUsd: userData?.mainWalletBalanceUsd ?? userData?.depositAmount ?? 0,
          botWalletBalanceUsd: userData?.botWalletBalanceUsd ?? 0,
        },
  );

export const applyDepositReviewToUserWorkflow = async (
  userId: string,
  input: ManualDepositReviewInput,
): Promise<WorkflowSnapshot> => {
  const userData = await getUser(userId);
  const nextSnapshot = applyManualDepositReviewToSnapshot(createRemoteWorkflowBase(userId, userData), input);
  await syncUserWorkflow(userId, nextSnapshot);
  return nextSnapshot;
};

export const setUserWorkflowWalletBalances = async (
  userId: string,
  input: WalletBalanceOverrideInput,
): Promise<WorkflowSnapshot> => {
  const userData = await getUser(userId);
  const nextSnapshot = applyWalletBalanceOverridesToSnapshot(createRemoteWorkflowBase(userId, userData), input);
  await syncUserWorkflow(userId, nextSnapshot);
  return nextSnapshot;
};

/**
 * Update user's deposit status
 */
export const updateUserStatus = async (
  userId: string, 
  status: UserStatus
): Promise<void> => {
  try {
    await updateUser(userId, { status });
    console.log('✅ User status updated to:', status);
  } catch (error) {
    console.error('❌ Error updating user status:', error);
    throw error;
  }
};

/**
 * Update user's deposit amount
 */
export const updateUserDepositAmount = async (
  userId: string, 
  depositAmount: number
): Promise<void> => {
  try {
    await updateUser(userId, { depositAmount });
    console.log('✅ User deposit amount updated to:', depositAmount);
  } catch (error) {
    console.error('❌ Error updating deposit amount:', error);
    throw error;
  }
};

// ============================================
// Real-time Listener Functions
// ============================================

/**
 * Listen to real-time changes for a specific user
 * Returns an unsubscribe function
 */
export const listenToUser = (
  userId: string, 
  callback: (userData: UserData | null) => void
): (() => void) => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  
  const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const userData = docSnapshot.data() as UserData;
      console.log('🔄 Real-time update received for user:', userId);
      callback(userData);
    } else {
      console.log('🔄 User document no longer exists:', userId);
      callback(null);
    }
  }, (error) => {
    console.error('❌ Error listening to user:', error);
    callback(null);
  });
  
  return unsubscribe;
};

/**
 * Listen to real-time changes for user's status
 * Returns an unsubscribe function
 */
export const listenToUserStatus = (
  userId: string, 
  callback: (status: UserStatus | null) => void
): (() => void) => {
  return listenToUser(userId, (userData) => {
    callback(userData?.status || null);
  });
};

// ============================================
// Admin Functions
// ============================================

/**
 * Fetch all users with a specific status
 * Useful for admin dashboard to see pending approvals
 */
export const getUsersByStatus = async (status: UserStatus): Promise<UserData[]> => {
  try {
    const usersQuery = query(
      collection(db, USERS_COLLECTION),
      where('status', '==', status)
    );
    
    const querySnapshot = await getDocs(usersQuery);
    const users: UserData[] = [];
    
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as UserData);
    });
    
    console.log(`✅ Fetched ${users.length} users with status: ${status}`);
    return users;
  } catch (error) {
    console.error('❌ Error fetching users by status:', error);
    return [];
  }
};

/**
 * Fetch all users (admin function)
 */
export const getAllUsers = async (): Promise<UserData[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    const users: UserData[] = [];
    
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as UserData);
    });
    
    console.log(`✅ Fetched ${users.length} total users`);
    return users;
  } catch (error) {
    console.error('❌ Error fetching all users:', error);
    return [];
  }
};

/**
 * Approve a user's deposit (admin function)
 */
export const approveUserDeposit = async (userId: string): Promise<void> => {
  try {
    await updateUserStatus(userId, 'approved');
    console.log('✅ User deposit approved:', userId);
  } catch (error) {
    console.error('❌ Error approving user deposit:', error);
    throw error;
  }
};

/**
 * Reject a user's deposit (admin function)
 */
export const rejectUserDeposit = async (userId: string): Promise<void> => {
  try {
    await updateUserStatus(userId, 'rejected');
    console.log('✅ User deposit rejected:', userId);
  } catch (error) {
    console.error('❌ Error rejecting user deposit:', error);
    throw error;
  }
};

// ============================================
// Utility Functions
// ============================================

/**
 * Initialize user session - call this on app startup
 * Ensures user is authenticated and has a Firestore document
 */
export const initializeUserSession = async (): Promise<{
  userId: string;
  userData: UserData | null;
  unsubscribe: (() => void) | null;
}> => {
  try {
    // Get or create userId
    const userId = await getOrCreateUserId();
    
    // Check if user document exists, create if not
    let userData = await getUser(userId);
    if (!userData) {
      await createUser(userId);
      userData = await getUser(userId);
    }
    
    // Set up real-time listener
    const unsubscribe = listenToUser(userId, (updatedData) => {
      console.log('🔄 User data updated in real-time:', updatedData);
      // You can dispatch an action or update state here
    });
    
    console.log('✅ User session initialized:', userId);
    return { userId, userData, unsubscribe };
  } catch (error) {
    console.error('❌ Error initializing user session:', error);
    throw error;
  }
};

/**
 * Clean up Firebase resources
 */
export const cleanupFirebase = (unsubscribe?: () => void) => {
  if (unsubscribe) {
    unsubscribe();
  }
  console.log('🧹 Firebase cleanup completed');
};

// ============================================
// Exports
// ============================================

export { db, auth, app };
export default {
  db,
  auth,
  app,
  signInAnonymouslyToFirebase,
  onAuthStateChange,
  getCurrentUser,
  getOrCreateUserId,
  createUser,
  getUser,
  updateUser,
  upsertUser,
  updateUserStatus,
  updateUserDepositAmount,
  syncUserWorkflow,
  applyDepositReviewToUserWorkflow,
  setUserWorkflowWalletBalances,
  listenToUser,
  listenToUserStatus,
  getUsersByStatus,
  getAllUsers,
  approveUserDeposit,
  rejectUserDeposit,
  initializeUserSession,
  cleanupFirebase
};
