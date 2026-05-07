import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { type User } from "firebase/auth";

import { clearWorkflowStorage } from "@/lib/account-workflow";
import {
  getCurrentUser,
  onAuthStateChange,
} from "@/lib/firebase";
import {
  getUsernameFromUser,
  signInWithUsernamePin,
  signOutAppUser,
  signUpWithUsernamePin,
  type UsernamePinCredentials,
} from "@/lib/app-auth";

interface AppAuthContextValue {
  user: User | null;
  username: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: UsernamePinCredentials) => Promise<User>;
  signUp: (credentials: UsernamePinCredentials) => Promise<User>;
  signOut: () => Promise<void>;
}

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

export const AppAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AppAuthContextValue>(
    () => ({
      user,
      username: getUsernameFromUser(user),
      isLoading,
      isAuthenticated: Boolean(user && !user.isAnonymous),
      signIn: signInWithUsernamePin,
      signUp: signUpWithUsernamePin,
      signOut: async () => {
        await signOutAppUser();
        clearWorkflowStorage();
      },
    }),
    [isLoading, user],
  );

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
};

export const useAppAuth = () => {
  const context = useContext(AppAuthContext);

  if (!context) {
    throw new Error("useAppAuth must be used within AppAuthProvider");
  }

  return context;
};
