import { 
  GoogleAuthProvider, 
  TwitterAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Google認証
export const signInWithGoogle = async () => {
  try {
    if (Platform.OS === 'web') {
      // Web版の場合
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } else {
      // モバイル版の場合 (Expo Auth Session使用)
      const redirectUri = AuthSession.makeRedirectUri();

      const request = new AuthSession.AuthRequest({
        clientId: Constants.expoConfig?.extra?.googleClientId || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
      });

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/oauth/authorize',
      });

      if (result.type === 'success') {
        // Google認証が成功した場合の処理
        console.log('Google認証成功:', result);
        return result;
      } else {
        throw new Error('Google認証がキャンセルされました');
      }
    }
  } catch (error) {
    console.error('Google認証エラー:', error);
    throw error;
  }
};

// X(Twitter)認証
export const signInWithTwitter = async () => {
  try {
    if (Platform.OS === 'web') {
      // Web版の場合
      const provider = new TwitterAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } else {
      // モバイル版の場合
      const redirectUri = AuthSession.makeRedirectUri();

      const request = new AuthSession.AuthRequest({
        clientId: Constants.expoConfig?.extra?.twitterClientId || process.env.EXPO_PUBLIC_TWITTER_CLIENT_ID,
        scopes: ['tweet.read', 'users.read'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
      });

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize',
      });

      if (result.type === 'success') {
        console.log('Twitter認証成功:', result);
        return result;
      } else {
        throw new Error('Twitter認証がキャンセルされました');
      }
    }
  } catch (error) {
    console.error('Twitter認証エラー:', error);
    throw error;
  }
};

// LINE認証（将来的な実装用）
export const signInWithLine = async () => {
  try {
    // LINE認証は現在ExpoのWeb Browserを使用したカスタム実装が必要
    const redirectUri = AuthSession.makeRedirectUri();

    const request = new AuthSession.AuthRequest({
      clientId: Constants.expoConfig?.extra?.lineClientId || process.env.EXPO_PUBLIC_LINE_CLIENT_ID,
      scopes: ['profile', 'openid'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
    });

    const result = await request.promptAsync({
      authorizationEndpoint: 'https://access.line.me/oauth2/v2.1/authorize',
    });

    if (result.type === 'success') {
      console.log('LINE認証成功:', result);
      return result;
    } else {
      throw new Error('LINE認証がキャンセルされました');
    }
  } catch (error) {
    console.error('LINE認証エラー:', error);
    throw error;
  }
};

// WebBrowserの設定を完了する
WebBrowser.maybeCompleteAuthSession(); 