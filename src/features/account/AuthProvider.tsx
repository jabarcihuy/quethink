import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase, requireSupabase } from "@/lib/supabase/client";
import { accountRepository, type Profile } from "./repository";

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: unknown;
  recovery: boolean;
  refresh: () => Promise<Profile | null>;
  finishRecovery: () => void;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [starting, setStarting] = useState(Boolean(supabase)),
    [fetching, setFetching] = useState(false);
  const currentUser = useRef<string | undefined>(undefined),
    request = useRef(0),
    mounted = useRef(true);
  const [error, setError] = useState<unknown>(() =>
      supabase ? null : new Error("SUPABASE_NOT_CONFIGURED"),
    ),
    [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    mounted.current = true;
    let active = true,
      eventSeen = false;
    function update(next: Session | null) {
      if (currentUser.current !== next?.user.id) {
        currentUser.current = next?.user.id;
        request.current++;
        setProfile(null);
        setError(null);
        setFetching(false);
      }
      setSession(next);
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      eventSeen = true;
      if (!active) return;
      update(next);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") {
        setRecovery(false);
        setProfile(null);
      }
      setStarting(false);
    });
    supabase.auth
      .getSession()
      .then(({ data, error: failure }) => {
        if (active && !eventSeen) {
          update(data.session);
          if (failure) setError(failure);
          setStarting(false);
        }
      })
      .catch((failure) => {
        if (active) {
          setError(failure);
          setStarting(false);
        }
      });
    if (AppState.currentState === "active") supabase.auth.startAutoRefresh();
    const state = AppState.addEventListener("change", (next) => {
      if (next === "active") supabase?.auth.startAutoRefresh();
      else supabase?.auth.stopAutoRefresh();
    });
    return () => {
      active = false;
      mounted.current = false;
      subscription.unsubscribe();
      state.remove();
      supabase?.auth.stopAutoRefresh();
    };
  }, []);
  const userId = session?.user.id;
  const loadProfile = useCallback(async () => {
    const uid = currentUser.current,
      version = ++request.current;
    if (!uid) return null;
    try {
      const next = await accountRepository.profile();
      if (
        mounted.current &&
        currentUser.current === uid &&
        request.current === version
      ) {
        setProfile(next);
        return next;
      }
    } catch (failure) {
      if (
        mounted.current &&
        currentUser.current === uid &&
        request.current === version
      )
        setError(failure);
    } finally {
      if (mounted.current && request.current === version) setFetching(false);
    }
    return null;
  }, []);
  function refresh() {
    setFetching(true);
    setError(null);
    return loadProfile();
  }
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const version = ++request.current;
    accountRepository
      .profile()
      .then((next) => {
        if (
          active &&
          currentUser.current === userId &&
          request.current === version
        )
          setProfile(next);
      })
      .catch((failure) => {
        if (
          active &&
          currentUser.current === userId &&
          request.current === version
        )
          setError(failure);
      })
      .finally(() => {
        if (active && request.current === version) setFetching(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);
  async function signOut() {
    const { error: failure } = await requireSupabase().auth.signOut({
      scope: "local",
    });
    if (failure) {
      setError(failure);
      throw failure;
    }
    setSession(null);
    setProfile(null);
    setError(null);
    setRecovery(false);
  }
  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading: starting || fetching || Boolean(session && !profile && !error),
        error,
        recovery,
        refresh,
        finishRecovery: () => setRecovery(false),
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider missing");
  return context;
}
