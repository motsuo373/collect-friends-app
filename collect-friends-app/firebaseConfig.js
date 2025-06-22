import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase設定（直接記述で確実に動作させる）
const firebaseConfig = {
  apiKey: "AIzaSyBZnjTFi_OJ4bF1IIY_Cr50Qu08EmXzDhU",
  authDomain: "collect-friends-app.firebaseapp.com",
  projectId: "collect-friends-app",
  storageBucket: "collect-friends-app.firebasestorage.app",
  messagingSenderId: "901027702238",
  appId: "1:901027702238:web:bd4742765b36c18965a94f",
  measurementId: "G-NF4579MH3F"
};

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