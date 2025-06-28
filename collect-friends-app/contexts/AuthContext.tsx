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
      setLoading(true); // ログアウト処理中はローディング状態にする
      
      // Firebase認証からサインアウト
      await firebaseSignOut(auth);
      
      // Web版の場合、追加の処理を実行
      if (Platform.OS === 'web') {
        // ローカルの状態を強制的にクリア
        setUser(null);
        setLoading(false);
        
        // ブラウザのセッションストレージもクリア
        if (typeof window !== 'undefined') {
          window.sessionStorage.clear();
          
          // Firebase関連のlocalStorageを削除
          const firebaseKeys = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && key.includes('firebase')) {
              firebaseKeys.push(key);
            }
          }
          firebaseKeys.forEach(key => window.localStorage.removeItem(key));
          
          // 強制的にページをリロードしてすべての状態をリセット
          setTimeout(() => {
            window.location.reload();
          }, 200);
        }
      }
      
      // ユーザー状態は onAuthStateChanged で自動的に null に設定される
      // ただし、Web版では上記で明示的に設定済み
      
    } catch (error) {
      console.error('Firebase signOut エラー:', error);
      
      // Web版でFirebaseのサインアウトに失敗した場合の代替処理
      if (Platform.OS === 'web') {
        console.log('Web版：Firebase signOut失敗時の代替処理を実行');
        
        // 強制的にローカル状態をクリア
        setUser(null);
        setLoading(false);
        
        if (typeof window !== 'undefined') {
          // すべてのストレージをクリア
          window.sessionStorage.clear();
          window.localStorage.clear();
          
          // ページをリロードして完全にリセット
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
        
        // エラーを投げずに正常終了とする（代替処理で対応済み）
        return;
      }
      
      // エラーが発生した場合はローディング状態をリセット
      setLoading(false);
      
      // エラーを上位に再投げ
      throw error;
    }
    // 成功時のloadingリセットは onAuthStateChanged または Web版では上記で行われる
  };

  const value = {
    user,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 