import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

import {
  auth,
  capturePreAuthenticationUserId,
  clearStoredUserSessionId,
  migrateCapturedLegacyUserDataToUser,
  syncAuthenticatedUserProfile,
} from "@/lib/firebase";
import { getTelegramWebAppUserId } from "@/lib/telegram-webapp";

export interface UsernamePinCredentials {
  username: string;
  pin: string;
}

const AUTH_HINT_STORAGE_KEY = "gpt2.returning-account.v1";
const USERNAME_REGEX = /^[a-z0-9._-]{3,24}$/;
const PIN_REGEX = /^\d{4,8}$/;
const PRIMARY_AUTH_DOMAIN = "gpt2tradebot.app";
const LEGACY_AUTH_DOMAIN = "gpt2-tradebot.local";

interface StoredAuthHint {
  username: string | null;
  lastUsedAt: string;
}

export const normalizeUsername = (value: string) => value.trim().toLowerCase();

const readStoredAuthHint = (): StoredAuthHint | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(AUTH_HINT_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<StoredAuthHint>;
    const username = typeof parsedValue.username === "string" && parsedValue.username.trim().length > 0
      ? parsedValue.username.trim()
      : null;
    const lastUsedAt = typeof parsedValue.lastUsedAt === "string" && parsedValue.lastUsedAt.trim().length > 0
      ? parsedValue.lastUsedAt
      : new Date().toISOString();

    return {
      username,
      lastUsedAt,
    };
  } catch {
    return null;
  }
};

const writeStoredAuthHint = (username: string) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      AUTH_HINT_STORAGE_KEY,
      JSON.stringify({
        username,
        lastUsedAt: new Date().toISOString(),
      } satisfies StoredAuthHint),
    );
  } catch {
    // Ignore storage failures so sign-in is never blocked by browser storage.
  }
};

export const hasRememberedAppAccount = () => readStoredAuthHint() !== null;

export const getRememberedUsername = () => readStoredAuthHint()?.username ?? null;

export const validateUsername = (value: string) => {
  const normalized = normalizeUsername(value);

  if (!USERNAME_REGEX.test(normalized)) {
    throw new Error("Please choose a username with 3-24 letters, numbers, dots, underscores, or dashes.");
  }

  return normalized;
};

export const validatePin = (value: string) => {
  const normalized = value.trim();

  if (!PIN_REGEX.test(normalized)) {
    throw new Error("Please use a PIN with 4-8 digits.");
  }

  return normalized;
};

export const usernameToAuthEmail = (username: string, domain = PRIMARY_AUTH_DOMAIN) => `${username}@${domain}`;

const pinToAuthPassword = (pin: string) => `gpt2-pin-${pin}`;

const isPatternMismatchError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.toLowerCase().includes("did not match the expected pattern");
};

export const getUsernameFromUser = (user: Pick<User, "displayName" | "email"> | null) => {
  if (!user) {
    return null;
  }

  if (user.displayName?.trim()) {
    return user.displayName.trim();
  }

  const emailPrefix = user.email?.split("@")[0]?.trim();
  return emailPrefix || null;
};

const syncSignedInUser = async (user: User, username: string) => {
  if (user.displayName !== username) {
    await updateProfile(user, { displayName: username });
  }

  const telegramUserId = getTelegramWebAppUserId();

  await syncAuthenticatedUserProfile(user.uid, {
    username,
    telegramUserId,
  });

  await migrateCapturedLegacyUserDataToUser(user.uid, {
    username,
    telegramUserId,
  });

  writeStoredAuthHint(username);
};

export const signUpWithUsernamePin = async ({ username, pin }: UsernamePinCredentials) => {
  const normalizedUsername = validateUsername(username);
  const normalizedPin = validatePin(pin);

  capturePreAuthenticationUserId();

  const result = await createUserWithEmailAndPassword(
    auth,
    usernameToAuthEmail(normalizedUsername),
    pinToAuthPassword(normalizedPin),
  );

  await syncSignedInUser(result.user, normalizedUsername);
  return result.user;
};

export const signInWithUsernamePin = async ({ username, pin }: UsernamePinCredentials) => {
  const normalizedUsername = validateUsername(username);
  const normalizedPin = validatePin(pin);
  const password = pinToAuthPassword(normalizedPin);

  capturePreAuthenticationUserId();

  let lastError: unknown;
  const candidateDomains = [PRIMARY_AUTH_DOMAIN, LEGACY_AUTH_DOMAIN];
  let result: Awaited<ReturnType<typeof signInWithEmailAndPassword>> | null = null;

  for (const domain of candidateDomains) {
    try {
      result = await signInWithEmailAndPassword(
        auth,
        usernameToAuthEmail(normalizedUsername, domain),
        password,
      );
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!result) {
    throw lastError;
  }

  await syncSignedInUser(result.user, normalizedUsername);
  return result.user;
};

export const signOutAppUser = async () => {
  await signOut(auth);
  clearStoredUserSessionId();
};

export const getFriendlyAuthErrorMessage = (error: unknown) => {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "That username is already taken.";
    case "auth/invalid-email":
      return "Please choose a different username.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "The username or PIN is not correct.";
    case "auth/weak-password":
      return "Please use a PIN with 4-8 digits.";
    case "auth/operation-not-allowed":
      return "Sign-in is not available right now. Please try again in a little while.";
    case "auth/too-many-requests":
      return "Too many attempts right now. Please wait a moment and try again.";
    default:
      if (isPatternMismatchError(error)) {
        return "That username could not be used. Please try letters, numbers, dots, underscores, or dashes.";
      }

      return error instanceof Error ? error.message : "We couldn't sign you in right now. Please try again.";
  }
};
