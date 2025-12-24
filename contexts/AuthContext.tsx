
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebaseClient';
import { execute } from '../lib/tidbClient';
import { Profile } from '../types';
import { useStatus } from './StatusContext';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: Profile | null;
  isLoading: boolean;
  fetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setIsOffline } = useStatus();

  const fetchUserProfile = useCallback(async (currentUser: FirebaseUser) => {
    try {
      const result = await execute('SELECT * FROM profiles WHERE id = ?', [currentUser.uid]);
      
      if (result.length > 0) {
        setProfile(result[0] as Profile);
      } else {
        // Fallback for new users or if insert pending
        setProfile({ id: currentUser.uid, email: currentUser.email || '', username: '' });
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      if (error.message && error.message.includes('NetworkError')) {
        setIsOffline(true);
      }
      setProfile(null);
    }
  }, [setIsOffline]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchUserProfile(currentUser);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

  const fetchProfile = useCallback(async () => {
    if (user) {
        setTimeout(async () => {
             await fetchUserProfile(user);
        }, 500);
    }
  }, [user, fetchUserProfile]);

  const value = {
    user,
    profile,
    isLoading,
    fetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
