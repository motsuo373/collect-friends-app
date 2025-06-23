import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

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

console.log('Initializing Firebase with config:', firebaseConfig);

// Firebase アプリを初期化
const app = initializeApp(firebaseConfig);
console.log('Firebase app initialized');

// Firestore を初期化
const db = getFirestore(app);
console.log('Firestore initialized');

// Firebase Auth を AsyncStorage で初期化
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
console.log('Firebase Auth initialized with AsyncStorage');

export { db, auth }; 