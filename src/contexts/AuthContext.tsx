import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  onIdTokenChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { auth, BOOTSTRAP_OWNER_EMAIL, type UserRole } from '@/lib/firebase';
import { isPrimaryOwnerEmail } from '@/lib/permissions';

/**
 * `expiresAt` em milissegundos (epoch). `null` = sem expiração (apenas para owner).
 */
export type ExpiresAt = number | null;

export interface AuthClaims {
  role: UserRole;
  expiresAt: ExpiresAt;
}

interface AuthContextType {
  user: User | null;
  claims: AuthClaims;
  isAuthenticated: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isPrimaryOwner: boolean;
  isCheckingAuth: boolean;
  isSigningIn: boolean;
  isExpired: boolean;
  expiresInDays: number | null;
  error: string | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  sendReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  refreshClaims: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_CLAIMS: AuthClaims = { role: 'user', expiresAt: null };

const MS_IN_DAY = 1000 * 60 * 60 * 24;

function formatAuthError(err: unknown): string {
  if (!(err instanceof FirebaseError)) {
    return 'Falha no login. Verifique seu usuário e senha.';
  }

  switch (err.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E-mail ou senha inválidos neste projeto Firebase.';
    case 'auth/user-disabled':
      return 'Este usuário está desativado no Firebase Auth.';
    case 'auth/operation-not-allowed':
      return 'Login por e-mail/senha não está habilitado no Firebase Auth.';
    case 'auth/unauthorized-domain':
      return 'Domínio da Vercel não autorizado no Firebase Auth.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    case 'auth/network-request-failed':
      return 'Falha de rede ao conectar ao Firebase Auth.';
    default:
      return `Falha no login (${err.code}).`;
  }
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'owner' || value === 'admin' || value === 'user';
}

function parseExpiresAt(value: unknown): ExpiresAt {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
    const dateMs = Date.parse(value);
    if (Number.isFinite(dateMs)) return dateMs;
  }
  return null;
}

async function readClaimsFromUser(currentUser: User): Promise<AuthClaims> {
  const tokenResult = await currentUser.getIdTokenResult();
  const rawRole = tokenResult.claims.role;
  const rawExpires = tokenResult.claims.expiresAt;

  const role: UserRole = isUserRole(rawRole)
    ? rawRole
    // Fallback transicional: enquanto a Cloud Function `bootstrapOwner` não
    // foi rodada, reconhecemos o e-mail do owner inicial localmente.
    : (currentUser.email?.toLowerCase() === BOOTSTRAP_OWNER_EMAIL ? 'owner' : 'user');

  return { role, expiresAt: parseExpiresAt(rawExpires) };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<AuthClaims>(DEFAULT_CLAIMS);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userRef = useRef<User | null>(null);

  const applyUser = useCallback(async (nextUser: User | null) => {
    userRef.current = nextUser;
    setUser(nextUser);

    if (!nextUser) {
      setClaims(DEFAULT_CLAIMS);
      return;
    }

    try {
      const nextClaims = await readClaimsFromUser(nextUser);
      setClaims(nextClaims);
    } catch {
      setClaims(DEFAULT_CLAIMS);
    }
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      void applyUser(currentUser).finally(() => setIsCheckingAuth(false));
    });

    const unsubscribeIdToken = onIdTokenChanged(auth, (currentUser) => {
      if (!currentUser) return;
      void applyUser(currentUser);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeIdToken();
    };
  }, [applyUser]);

  const refreshClaims = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    // Força refresh do token (puxa claims novas do servidor).
    await currentUser.getIdToken(true);
    const nextClaims = await readClaimsFromUser(currentUser);
    setClaims(nextClaims);
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean) => {
    setIsSigningIn(true);
    setError(null);

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (err) {
      setError(formatAuthError(err));
      return false;
    } finally {
      setIsSigningIn(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const sendReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { ok: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      return { ok: false as const, error: message };
    }
  };

  const isAuthenticated = !!user;
  const isOwner = claims.role === 'owner';
  const isAdmin = claims.role === 'admin' || claims.role === 'owner';
  const isPrimaryOwner = isPrimaryOwnerEmail(user?.email);
  const isExpired = useMemo(() => {
    if (!isAuthenticated) return false;
    if (isOwner) return false; // owner nunca expira
    if (claims.expiresAt == null) return false;
    return claims.expiresAt <= Date.now();
  }, [claims.expiresAt, isAuthenticated, isOwner]);

  const expiresInDays = useMemo<number | null>(() => {
    if (claims.expiresAt == null) return null;
    const diff = claims.expiresAt - Date.now();
    return Math.ceil(diff / MS_IN_DAY);
  }, [claims.expiresAt]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      claims,
      isAuthenticated,
      isOwner,
      isAdmin,
      isPrimaryOwner,
      isCheckingAuth,
      isSigningIn,
      isExpired,
      expiresInDays,
      error,
      login,
      logout,
      sendReset,
      refreshClaims,
    }),
    [
      user,
      claims,
      isAuthenticated,
      isOwner,
      isAdmin,
      isPrimaryOwner,
      isCheckingAuth,
      isSigningIn,
      isExpired,
      expiresInDays,
      error,
      refreshClaims,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
