import { initializeApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Firebase設定（直接記述で確実に動作させる）
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Google OAuth Web Client ID（Google Cloud Consoleで作成したもの）
export const GOOGLE_WEB_CLIENT_ID = "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";

// Firebase アプリを初期化
const app = initializeApp(firebaseConfig);

// Firestore を初期化
const db = getFirestore(app);
// プラットフォーム別のFirebase Auth初期化
let auth: Auth;

if (Platform.OS === 'web') {
  // Web環境の場合
  const { getAuth, browserLocalPersistence, setPersistence } = require('firebase/auth');
  
  auth = getAuth(app);
  
  // Web環境でのpersistence設定 - より確実なログアウトのためにpersistenceを調整
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
    })
    .catch((error: any) => {
      console.error('Failed to set persistence for web:', error);
      // persistence設定に失敗した場合でも認証は動作するため、エラーを記録するのみ
    });
    
} else {
  // ネイティブ環境の場合
  const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
  const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
  
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

export { auth, db };
