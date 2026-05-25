import React, { createContext, useContext, useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

export interface UserProfile {
  id: string;
  name: string;
  avatarId: number;
  createdAt?: number;
}

export interface ProfileData {
  favorites: string[] | Record<string, number>;
  progress: Record<string, number>;
  watched: string[];
}

export interface AccountData {
  email: string;
  plan: string;
  maxProfiles: number;
}

interface ProfileContextType {
  profiles: UserProfile[];
  activeProfile: UserProfile | null;
  isLoadingProfiles: boolean;
  selectProfile: (id: string | null) => void;
  createProfile: (name: string, avatarId: number) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  userData: ProfileData;
  updateUserData: (
    data: Partial<ProfileData> | ((prev: ProfileData) => Partial<ProfileData>)
  ) => Promise<void>;
  accountData: AccountData | null;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

const DEFAULT_USER_DATA: ProfileData = {
  favorites: [],
  progress: {},
  watched: [],
};

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [userData, setUserData] = useState<ProfileData>(DEFAULT_USER_DATA);
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const activeProfileId = activeProfile?.id ?? null;

  useEffect(() => {
    if (!user) {
      setAccountData(null);
      return;
    }

    const accountRef = doc(db, `users/${user.uid}`);
    const unsubscribe = onSnapshot(accountRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAccountData({
          email: data.email || user.email || '',
          plan: data.plan || 'Gratuito',
          maxProfiles: data.maxProfiles || 1,
        });
        return;
      }

      const newAccount = {
        email: user.email || '',
        plan: 'Gratuito',
        maxProfiles: 1,
        createdAt: Date.now(),
      };
      setAccountData(newAccount as AccountData);
      void setDoc(accountRef, newAccount, { merge: true });
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfiles([]);
      setActiveProfile(null);
      setIsLoadingProfiles(false);
      return;
    }

    const profilesRef = collection(db, `users/${user.uid}/profiles`);
    const unsubscribe = onSnapshot(profilesRef, (snapshot) => {
      const loaded: UserProfile[] = [];

      snapshot.forEach((profileDoc) => {
        const data = profileDoc.data();
        loaded.push({
          id: profileDoc.id,
          createdAt: data.createdAt || 0,
          ...data,
        } as UserProfile);
      });

      loaded.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setProfiles(loaded);
      setIsLoadingProfiles(false);
      setActiveProfile((prevActiveProfile) => {
        if (!prevActiveProfile) {
          return prevActiveProfile;
        }

        return loaded.find((profile) => profile.id === prevActiveProfile.id) ? prevActiveProfile : null;
      });
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !activeProfileId) {
      setUserData(DEFAULT_USER_DATA);
      return;
    }

    const dataRef = doc(db, `users/${user.uid}/profiles/${activeProfileId}/data/main`);
    const unsubscribe = onSnapshot(dataRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData({ ...DEFAULT_USER_DATA, ...docSnap.data() });
        return;
      }

      setUserData(DEFAULT_USER_DATA);
    });

    return () => unsubscribe();
  }, [user, activeProfileId]);

  const createProfile = async (name: string, avatarId: number) => {
    if (!user) return;

    try {
      await addDoc(collection(db, `users/${user.uid}/profiles`), {
        name,
        avatarId,
        createdAt: Date.now(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro ao criar perfil:', err);
      toast.error('Não foi possível criar o perfil', {
        description: `Verifique as regras de segurança do Firestore. Detalhes: ${message}`,
      });
      throw err;
    }
  };

  const deleteProfile = async (id: string) => {
    if (!user) return;

    if (profiles.length <= 1) {
      toast.warning('Você precisa manter pelo menos um perfil.');
      return;
    }

    if (activeProfileId === id) {
      setActiveProfile(null);
    }

    await deleteDoc(doc(db, `users/${user.uid}/profiles`, id));
  };

  const updateUserData = async (
    data: Partial<ProfileData> | ((prev: ProfileData) => Partial<ProfileData>)
  ) => {
    if (!user || !activeProfileId) return;

    setUserData((prev) => {
      const resolvedData = typeof data === 'function' ? data(prev) : data;
      const nextData = { ...prev, ...resolvedData };

      const dataRef = doc(db, `users/${user.uid}/profiles/${activeProfileId}/data/main`);
      void setDoc(dataRef, nextData);

      return nextData;
    });
  };

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        isLoadingProfiles,
        selectProfile: (id) => setActiveProfile(profiles.find((profile) => profile.id === id) || null),
        createProfile,
        deleteProfile,
        userData,
        updateUserData,
        accountData,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);

  if (!ctx) {
    throw new Error('useProfile must be used within ProfileProvider');
  }

  return ctx;
}
