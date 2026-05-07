/**
 * Firebase configuration and shared user persistence.
 *
 * The app still supports anonymous/Telegram-scoped sessions for admin tooling,
 * but authenticated username + PIN accounts now take priority when present.
 */

import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
  type Firestore,
  updateDoc,
  where,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously, type Auth, type User } from "firebase/auth";

import {
  applyDepositAddressOverridesToSnapshot,
  applyManualDepositReviewToSnapshot,
  applyManualIdReviewToSnapshot,
  applyWalletBalanceOverridesToSnapshot,
  createWorkflowSnapshot,
  type ManualIdReviewInput,
  type DepositAddressOverrideInput,
  type ManualDepositReviewInput,
  type WalletBalanceOverrideInput,
  type WorkflowSnapshot,
} from "./account-workflow";
import { getTelegramWebAppUserId } from "./telegram-webapp";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "your-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project-id.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project-id.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "your-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "your-app-id",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "your-measurement-id",
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  throw error;
}

const USERS_COLLECTION = "users";
const FIREBASE_USER_ID_STORAGE_KEY = "firebase_userId";
const PRE_AUTH_USER_ID_STORAGE_KEY = "firebase_pre_auth_userId";

const getBrowserStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const getStoredFirebaseUserId = () => getBrowserStorage()?.getItem(FIREBASE_USER_ID_STORAGE_KEY) ?? null;

const setStoredFirebaseUserId = (userId: string) => {
  getBrowserStorage()?.setItem(FIREBASE_USER_ID_STORAGE_KEY, userId);
};

const getTelegramScopedUserId = () => {
  const telegramUserId = getTelegramWebAppUserId();
  return telegramUserId ? `tg_${telegramUserId}` : null;
};

const stripUndefinedFields = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedFields(item)) as T;
  }

  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, itemValue]) => itemValue !== undefined)
        .map(([key, itemValue]) => [key, stripUndefinedFields(itemValue)]),
    ) as T;
  }

  return value;
};

export interface UserData {
  userId: string;
  username?: string;
  telegramUserId?: string;
  depositAmount?: number;
  mainWalletBalanceUsd?: number;
  botWalletBalanceUsd?: number;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt?: Date;
  email?: string;
  fullName?: string;
  walletAddress?: string;
  kycStatus?: "pending" | "approved" | "rejected";
  workflowSnapshot?: WorkflowSnapshot;
}

export type UserStatus = "pending" | "approved" | "rejected";

export interface AuthenticatedUserProfileInput {
  username?: string;
  telegramUserId?: string | null;
}

export interface UserProfileDetailsUpdateInput {
  username?: string;
  fullName?: string;
  email?: string;
  walletAddress?: string;
  kycStatus?: "pending" | "approved" | "rejected";
}

export const signInAnonymouslyToFirebase = async (): Promise<User | null> => {
  try {
    const result = await signInAnonymously(auth);
    console.log("Anonymous sign-in successful:", result.user.uid);
    return result.user;
  } catch (error) {
    console.error("Anonymous sign-in failed:", error);
    return null;
  }
};

export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => onAuthStateChanged(auth, callback);

export const getCurrentUser = (): User | null => auth.currentUser;

export const capturePreAuthenticationUserId = () => {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    storage.removeItem(PRE_AUTH_USER_ID_STORAGE_KEY);
    return;
  }

  const preferredLegacyUserId =
    getTelegramScopedUserId() ??
    storage.getItem(FIREBASE_USER_ID_STORAGE_KEY) ??
    auth.currentUser?.uid ??
    null;

  if (preferredLegacyUserId) {
    storage.setItem(PRE_AUTH_USER_ID_STORAGE_KEY, preferredLegacyUserId);
  }
};

export const clearCapturedPreAuthenticationUserId = () => {
  getBrowserStorage()?.removeItem(PRE_AUTH_USER_ID_STORAGE_KEY);
};

export const clearStoredUserSessionId = () => {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(FIREBASE_USER_ID_STORAGE_KEY);
  storage.removeItem(PRE_AUTH_USER_ID_STORAGE_KEY);
};

export const waitForResolvedAuthState = async (): Promise<User | null> => {
  if (typeof (auth as Auth & { authStateReady?: () => Promise<void> }).authStateReady === "function") {
    await (auth as Auth & { authStateReady: () => Promise<void> }).authStateReady();
    return auth.currentUser;
  }

  if (auth.currentUser) {
    return auth.currentUser;
  }

  return await new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const getOrCreateUserId = async (): Promise<string> => {
  await waitForResolvedAuthState();

  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    setStoredFirebaseUserId(auth.currentUser.uid);
    console.log("Using authenticated Firebase userId:", auth.currentUser.uid);
    return auth.currentUser.uid;
  }

  const storedUserId = getStoredFirebaseUserId();
  if (storedUserId) {
    console.log("Using stored userId:", storedUserId);
    return storedUserId;
  }

  const telegramScopedUserId = getTelegramScopedUserId();
  if (telegramScopedUserId) {
    setStoredFirebaseUserId(telegramScopedUserId);
    console.log("Using Telegram userId:", telegramScopedUserId);
    return telegramScopedUserId;
  }

  if (!auth.currentUser) {
    await signInAnonymouslyToFirebase();
  }

  const user = auth.currentUser ?? (await signInAnonymouslyToFirebase());
  if (user) {
    setStoredFirebaseUserId(user.uid);
    console.log("Stored new userId:", user.uid);
    return user.uid;
  }

  const fallbackId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  setStoredFirebaseUserId(fallbackId);
  console.log("Using fallback userId:", fallbackId);
  return fallbackId;
};

export const createUser = async (userId: string, data: Partial<UserData> = {}): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userData = stripUndefinedFields({
      userId,
      status: "pending",
      createdAt: new Date(),
      ...data,
    } satisfies Partial<UserData> & { userId: string; status: UserStatus; createdAt: Date });

    await setDoc(userRef, userData);
    console.log("User created in Firestore:", userId);
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const getUser = async (userId: string): Promise<UserData | null> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserData;
    }

    return null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

export const updateUser = async (userId: string, data: Partial<UserData>): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(
      userRef,
      stripUndefinedFields({
        ...data,
        updatedAt: new Date(),
      }),
    );
    console.log("User updated in Firestore:", userId);
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

export const upsertUser = async (userId: string, data: Partial<UserData>): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(
      userRef,
      stripUndefinedFields({
        userId,
        ...data,
        updatedAt: new Date(),
      }),
      { merge: true },
    );
    console.log("User upserted in Firestore:", userId);
  } catch (error) {
    console.error("Error upserting user:", error);
    throw error;
  }
};

const hasMeaningfulUserData = (userData: UserData | null) =>
  Boolean(
    userData?.fullName ||
      userData?.email ||
      userData?.workflowSnapshot?.completedStepIds.length ||
      userData?.workflowSnapshot?.depositRequests.length ||
      typeof userData?.depositAmount === "number" ||
      typeof userData?.mainWalletBalanceUsd === "number" ||
      typeof userData?.botWalletBalanceUsd === "number",
  );

export const syncAuthenticatedUserProfile = async (
  userId: string,
  profile: AuthenticatedUserProfileInput = {},
) => {
  const existingUser = await getUser(userId);

  await setDoc(
    doc(db, USERS_COLLECTION, userId),
    stripUndefinedFields({
      userId,
      status: existingUser?.status ?? "pending",
      createdAt: existingUser?.createdAt ?? new Date(),
      updatedAt: new Date(),
      username: profile.username ?? existingUser?.username,
      telegramUserId: profile.telegramUserId ?? existingUser?.telegramUserId,
    } satisfies Partial<UserData> & { userId: string; status: UserStatus; createdAt: Date; updatedAt: Date }),
    { merge: true },
  );
};

const buildUserWorkflowPatch = (snapshot: WorkflowSnapshot): Partial<UserData> => ({
  workflowSnapshot: snapshot,
  depositAmount: snapshot.mainWalletBalanceUsd,
  mainWalletBalanceUsd: snapshot.mainWalletBalanceUsd,
  botWalletBalanceUsd: snapshot.botWalletBalanceUsd,
  status: snapshot.approvalStatus === "approved" ? "approved" : "pending",
  email: snapshot.identityChecks.email || undefined,
  fullName: snapshot.identityChecks.fullName || undefined,
});

export const syncUserWorkflow = async (userId: string, snapshot: WorkflowSnapshot): Promise<void> => {
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
            fullName: userData?.fullName ?? "",
            email: userData?.email ?? "",
            country: "",
            idType: "",
            notes: "",
          },
          mainWalletBalanceUsd: userData?.mainWalletBalanceUsd ?? userData?.depositAmount ?? 0,
          botWalletBalanceUsd: userData?.botWalletBalanceUsd ?? 0,
        },
  );

export const migrateCapturedLegacyUserDataToUser = async (
  userId: string,
  profile: AuthenticatedUserProfileInput = {},
): Promise<UserData | null> => {
  const storage = getBrowserStorage();
  const capturedLegacyUserId = storage?.getItem(PRE_AUTH_USER_ID_STORAGE_KEY) ?? null;
  const legacyUserId = capturedLegacyUserId && capturedLegacyUserId !== userId ? capturedLegacyUserId : null;

  try {
    if (!legacyUserId) {
      await syncAuthenticatedUserProfile(userId, profile);
      return await getUser(userId);
    }

    const [legacyUserData, currentUserData] = await Promise.all([getUser(legacyUserId), getUser(userId)]);

    if (!legacyUserData) {
      await syncAuthenticatedUserProfile(userId, profile);
      return currentUserData;
    }

    if (hasMeaningfulUserData(currentUserData)) {
      await syncAuthenticatedUserProfile(userId, {
        username: profile.username ?? currentUserData?.username ?? legacyUserData.username,
        telegramUserId: profile.telegramUserId ?? currentUserData?.telegramUserId ?? legacyUserData.telegramUserId,
      });
      return await getUser(userId);
    }

    const migratedSnapshot = createWorkflowSnapshot(
      legacyUserData.workflowSnapshot
        ? {
            ...legacyUserData.workflowSnapshot,
            userId,
          }
        : {
            userId,
            approvalStatus: legacyUserData.status === "approved" ? "approved" : "draft",
            identityChecks: {
              fullName: legacyUserData.fullName ?? "",
              email: legacyUserData.email ?? "",
              country: "",
              idType: "",
              notes: "",
            },
            mainWalletBalanceUsd: legacyUserData.mainWalletBalanceUsd ?? legacyUserData.depositAmount ?? 0,
            botWalletBalanceUsd: legacyUserData.botWalletBalanceUsd ?? 0,
          },
    );

    await setDoc(
      doc(db, USERS_COLLECTION, userId),
      stripUndefinedFields({
        userId,
        username: profile.username ?? currentUserData?.username ?? legacyUserData.username,
        telegramUserId: profile.telegramUserId ?? currentUserData?.telegramUserId ?? legacyUserData.telegramUserId,
        status: legacyUserData.status,
        createdAt: currentUserData?.createdAt ?? legacyUserData.createdAt ?? new Date(),
        updatedAt: new Date(),
        email: legacyUserData.email,
        fullName: legacyUserData.fullName,
        walletAddress: legacyUserData.walletAddress,
        kycStatus: legacyUserData.kycStatus,
        depositAmount: legacyUserData.depositAmount ?? migratedSnapshot.mainWalletBalanceUsd,
        mainWalletBalanceUsd: legacyUserData.mainWalletBalanceUsd ?? migratedSnapshot.mainWalletBalanceUsd,
        botWalletBalanceUsd: legacyUserData.botWalletBalanceUsd ?? migratedSnapshot.botWalletBalanceUsd,
        workflowSnapshot: migratedSnapshot,
      } satisfies Partial<UserData> & { userId: string; createdAt: Date; updatedAt: Date }),
      { merge: true },
    );

    return await getUser(userId);
  } finally {
    clearCapturedPreAuthenticationUserId();
    setStoredFirebaseUserId(userId);
  }
};

export const applyDepositReviewToUserWorkflow = async (
  userId: string,
  input: ManualDepositReviewInput,
): Promise<WorkflowSnapshot> => {
  const userData = await getUser(userId);
  const nextSnapshot = applyManualDepositReviewToSnapshot(createRemoteWorkflowBase(userId, userData), input);
  await syncUserWorkflow(userId, nextSnapshot);
  return nextSnapshot;
};

export const applyIdReviewToUserWorkflow = async (
  userId: string,
  input: ManualIdReviewInput,
): Promise<WorkflowSnapshot> => {
  const userData = await getUser(userId);
  const nextSnapshot = applyManualIdReviewToSnapshot(createRemoteWorkflowBase(userId, userData), input);
  await syncUserWorkflow(userId, nextSnapshot);
  await upsertUser(userId, {
    kycStatus: input.status === "approved" ? "approved" : "rejected",
  });
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

export const setUserWorkflowDepositAddresses = async (
  userId: string,
  input: DepositAddressOverrideInput,
): Promise<WorkflowSnapshot> => {
  const userData = await getUser(userId);
  const nextSnapshot = applyDepositAddressOverridesToSnapshot(createRemoteWorkflowBase(userId, userData), input);
  await syncUserWorkflow(userId, nextSnapshot);
  return nextSnapshot;
};

export const updateUserStatus = async (userId: string, status: UserStatus): Promise<void> => {
  await updateUser(userId, { status });
};

export const updateUserDepositAmount = async (userId: string, depositAmount: number): Promise<void> => {
  await updateUser(userId, { depositAmount });
};

export const updateUserProfileDetails = async (
  userId: string,
  input: UserProfileDetailsUpdateInput,
): Promise<void> => {
  const existingUser = await getUser(userId);

  const nextWorkflowSnapshot = existingUser?.workflowSnapshot
    ? createWorkflowSnapshot({
        ...existingUser.workflowSnapshot,
        userId,
        identityChecks: {
          ...existingUser.workflowSnapshot.identityChecks,
          fullName: input.fullName ?? existingUser.workflowSnapshot.identityChecks.fullName ?? "",
          email: input.email ?? existingUser.workflowSnapshot.identityChecks.email ?? "",
        },
      })
    : undefined;

  await upsertUser(userId, {
    username: input.username || undefined,
    fullName: input.fullName || undefined,
    email: input.email || undefined,
    walletAddress: input.walletAddress || undefined,
    kycStatus: input.kycStatus,
    workflowSnapshot: nextWorkflowSnapshot,
  });
};

export const listenToUser = (userId: string, callback: (userData: UserData | null) => void): (() => void) => {
  const userRef = doc(db, USERS_COLLECTION, userId);

  return onSnapshot(
    userRef,
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        callback(docSnapshot.data() as UserData);
        return;
      }

      callback(null);
    },
    (error) => {
      console.error("Error listening to user:", error);
      callback(null);
    },
  );
};

export const listenToUserStatus = (userId: string, callback: (status: UserStatus | null) => void): (() => void) =>
  listenToUser(userId, (userData) => {
    callback(userData?.status || null);
  });

export const listenToAllUsers = (callback: (users: UserData[]) => void): (() => void) =>
  onSnapshot(
    collection(db, USERS_COLLECTION),
    (querySnapshot) => {
      const users: UserData[] = [];

      querySnapshot.forEach((userDoc) => {
        users.push(userDoc.data() as UserData);
      });

      callback(users);
    },
    (error) => {
      console.error("Error listening to all users:", error);
      callback([]);
    },
  );

export const getUsersByStatus = async (status: UserStatus): Promise<UserData[]> => {
  try {
    const usersQuery = query(collection(db, USERS_COLLECTION), where("status", "==", status));
    const querySnapshot = await getDocs(usersQuery);
    const users: UserData[] = [];

    querySnapshot.forEach((userDoc) => {
      users.push(userDoc.data() as UserData);
    });

    return users;
  } catch (error) {
    console.error("Error fetching users by status:", error);
    return [];
  }
};

export const getAllUsers = async (): Promise<UserData[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    const users: UserData[] = [];

    querySnapshot.forEach((userDoc) => {
      users.push(userDoc.data() as UserData);
    });

    return users;
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
};

export const approveUserDeposit = async (userId: string): Promise<void> => {
  await updateUserStatus(userId, "approved");
};

export const rejectUserDeposit = async (userId: string): Promise<void> => {
  await updateUserStatus(userId, "rejected");
};

export const initializeUserSession = async (): Promise<{
  userId: string;
  userData: UserData | null;
  unsubscribe: (() => void) | null;
}> => {
  try {
    const userId = await getOrCreateUserId();
    const telegramUserId = getTelegramWebAppUserId();
    const isAuthenticatedAccount = Boolean(auth.currentUser && !auth.currentUser.isAnonymous);

    let userData = isAuthenticatedAccount
      ? await migrateCapturedLegacyUserDataToUser(userId, {
          username: auth.currentUser?.displayName ?? undefined,
          telegramUserId,
        })
      : await getUser(userId);

    if (!userData) {
      await createUser(userId, {
        username: auth.currentUser?.displayName ?? undefined,
        telegramUserId: telegramUserId ?? undefined,
      });
      userData = await getUser(userId);
    } else if (isAuthenticatedAccount || telegramUserId) {
      await upsertUser(userId, {
        username: auth.currentUser?.displayName ?? userData.username,
        telegramUserId: telegramUserId ?? userData.telegramUserId,
      });
      userData = await getUser(userId);
    }

    const unsubscribe = listenToUser(userId, (updatedData) => {
      console.log("User data updated in real time:", updatedData);
    });

    return { userId, userData, unsubscribe };
  } catch (error) {
    console.error("Error initializing user session:", error);
    throw error;
  }
};

export const cleanupFirebase = (unsubscribe?: () => void) => {
  if (unsubscribe) {
    unsubscribe();
  }
};

export { app, auth, db };

export default {
  db,
  auth,
  app,
  signInAnonymouslyToFirebase,
  onAuthStateChange,
  getCurrentUser,
  capturePreAuthenticationUserId,
  clearCapturedPreAuthenticationUserId,
  clearStoredUserSessionId,
  waitForResolvedAuthState,
  getOrCreateUserId,
  createUser,
  getUser,
  updateUser,
  upsertUser,
  syncAuthenticatedUserProfile,
  migrateCapturedLegacyUserDataToUser,
  updateUserStatus,
  updateUserDepositAmount,
  updateUserProfileDetails,
  syncUserWorkflow,
  applyDepositReviewToUserWorkflow,
  applyIdReviewToUserWorkflow,
  setUserWorkflowWalletBalances,
  setUserWorkflowDepositAddresses,
  listenToUser,
  listenToUserStatus,
  listenToAllUsers,
  getUsersByStatus,
  getAllUsers,
  approveUserDeposit,
  rejectUserDeposit,
  initializeUserSession,
  cleanupFirebase,
};
