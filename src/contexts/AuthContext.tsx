/**
 * AuthContext.tsx
 *
 * Single source of truth for Firebase Auth state across the entire dashboard.
 * Replaces 4 separate onAuthStateChanged() subscriptions that were running
 * simultaneously on different dashboard pages — now there's exactly one.
 *
 * Usage:
 *   const { user, loading } = useAuth();
 */
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  /** True until the first auth state is resolved (prevents flash of redirect) */
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ONE subscription for the entire app lifetime inside this provider
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
