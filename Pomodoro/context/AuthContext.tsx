import { signOut as firebaseSignOut, User as FirebaseUser, onAuthStateChanged, User } from 'firebase/auth';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { auth as firebaseAuthServiceFromConfig } from '../firebaseConfig';

console.log("AuthContext: firebaseAuthServiceFromConfig imported:", !!firebaseAuthServiceFromConfig);
if (firebaseAuthServiceFromConfig && typeof firebaseAuthServiceFromConfig.onAuthStateChanged !== 'function') {
    console.error("AuthContext: ERROR - firebaseAuthServiceFromConfig is not a valid Firebase Auth instance!");
}

interface UserProfile {
  uid: string;
  email: string | null;
  username: string;
  createdAt?: number;
}

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseAuthServiceFromConfig) {
      console.error("AuthContext: firebaseAuthServiceFromConfig is undefined in useEffect!");
      setLoading(false);
      return;
    }

    console.log("AuthContext: Setting up onAuthStateChanged listener...");
    const unsubscribe = onAuthStateChanged(firebaseAuthServiceFromConfig, (currentUser) => {
      console.log("AuthContext: onAuthStateChanged triggered. User:", currentUser ? currentUser.uid : null);
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(firebaseAuthServiceFromConfig);
    } catch (error) {
      console.error("Lỗi đăng xuất: ", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
