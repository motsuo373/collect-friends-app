import { User, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { auth, db } from '../firebaseConfig';

// React Native用のUUID生成関数
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
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
          customUuid: generateUUID(), // 任意のUUID
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
      } else {
        // 既存ユーザーの場合、最終更新日時を更新
        await setDoc(userDocRef, { 
          updatedAt: new Date(),
          name: firebaseUser.displayName || userDoc.data().name,
          email: firebaseUser.email || userDoc.data().email,
          avatar: firebaseUser.photoURL || userDoc.data().avatar,
        }, { merge: true });
      }
    } catch (error) {
      console.error('ユーザードキュメント作成/更新エラー:', error);
    }
  };

  const signOut = async () => {
    try {
      // Firebase認証からサインアウト
      await firebaseSignOut(auth);
      
      // Web版の場合、セッションストレージをクリア
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.sessionStorage.clear();
      }
      
      // ユーザー状態は onAuthStateChanged で自動的に null に設定される
      
    } catch (error) {
      console.error('Firebase signOut エラー:', error);
      
      // エラーを上位に再投げして、呼び出し元でハンドリングできるようにする
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