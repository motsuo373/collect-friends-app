import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { v4 as uuidv4 } from 'uuid';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Setting up auth state listener...');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        console.log('Auth state changed:', firebaseUser?.uid || 'null');
        
        if (firebaseUser) {
          // ユーザーがログインしている場合、Firestoreにユーザー情報を保存
          await createOrUpdateUserDocument(firebaseUser);
          setUser(firebaseUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const createOrUpdateUserDocument = async (firebaseUser: User) => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // 新規ユーザーの場合、追加のUUIDを生成してドキュメントを作成
        const userData = {
          uid: firebaseUser.uid,
          customUuid: uuidv4(), // 任意のUUID
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          avatar: firebaseUser.photoURL || '',
          status: {
            current: 'offline',
            mood: [],
            availableUntil: null,
            location: null,
            range: null,
          },
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await setDoc(userDocRef, userData);
        console.log('新規ユーザーが作成されました:', userData);
      } else {
        // 既存ユーザーの場合、最終更新日時を更新
        await setDoc(userDocRef, { 
          updatedAt: new Date(),
          name: firebaseUser.displayName || userDoc.data().name,
          email: firebaseUser.email || userDoc.data().email,
          avatar: firebaseUser.photoURL || userDoc.data().avatar,
        }, { merge: true });
        console.log('既存ユーザー情報を更新しました');
      }
    } catch (error) {
      console.error('ユーザードキュメント作成/更新エラー:', error);
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out...');
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('サインアウトエラー:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 