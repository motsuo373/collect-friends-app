import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithGoogle, signInWithTwitter, signInWithLine } from '../utils/auth';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setLoadingProvider('google');
    try {
      const result = await signInWithGoogle();
      if (result) {
        onLoginSuccess?.();
      }
    } catch (error) {
      Alert.alert('ログインエラー', 'Googleログインに失敗しました。もう一度お試しください。');
      console.error('Google login error:', error);
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleTwitterSignIn = async () => {
    setLoading(true);
    setLoadingProvider('twitter');
    try {
      const result = await signInWithTwitter();
      if (result) {
        onLoginSuccess?.();
      }
    } catch (error) {
      Alert.alert('ログインエラー', 'Xログインに失敗しました。もう一度お試しください。');
      console.error('Twitter login error:', error);
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleLineSignIn = async () => {
    setLoading(true);
    setLoadingProvider('line');
    try {
      const result = await signInWithLine();
      if (result) {
        onLoginSuccess?.();
      }
    } catch (error) {
      Alert.alert('ログインエラー', 'LINEログインに失敗しました。もう一度お試しください。');
      console.error('LINE login error:', error);
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  const AuthButton = ({ 
    onPress, 
    backgroundColor, 
    textColor, 
    icon, 
    text, 
    provider 
  }: {
    onPress: () => void;
    backgroundColor: string;
    textColor: string;
    icon: string;
    text: string;
    provider: string;
  }) => (
    <TouchableOpacity
      style={[styles.authButton, { backgroundColor }]}
      onPress={onPress}
      disabled={loading}
    >
      {loadingProvider === provider ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          <Text style={[styles.authButtonIcon, { color: textColor }]}>{icon}</Text>
          <Text style={[styles.authButtonText, { color: textColor }]}>{text}</Text>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.background}
      >
        <View style={styles.content}>
          {/* ロゴ・ヘッダー部分 */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>👥</Text>
            </View>
            <Text style={styles.appTitle}>Collect Friends</Text>
            <Text style={styles.subtitle}>今すぐ遊べる人、近くにいない？</Text>
          </View>

          {/* 説明文 */}
          <View style={styles.description}>
            <Text style={styles.descriptionText}>
              位置情報ベースで友達同士の即日集まりを実現するアプリです。
            </Text>
            <Text style={styles.descriptionText}>
              フットワークが軽い友達とリアルタイムで繋がりましょう！
            </Text>
          </View>

          {/* ログインボタン */}
          <View style={styles.authSection}>
            <Text style={styles.loginTitle}>ログインして始める</Text>
            
            <AuthButton
              onPress={handleGoogleSignIn}
              backgroundColor="#ffffff"
              textColor="#333333"
              icon="🔍"
              text="Googleでログイン"
              provider="google"
            />

            <AuthButton
              onPress={handleTwitterSignIn}
              backgroundColor="#1DA1F2"
              textColor="#ffffff"
              icon="🐦"
              text="X(Twitter)でログイン"
              provider="twitter"
            />

            <AuthButton
              onPress={handleLineSignIn}
              backgroundColor="#00B900"
              textColor="#ffffff"
              icon="💬"
              text="LINEでログイン"
              provider="line"
            />
          </View>

          {/* フッター */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ログインすることで利用規約とプライバシーポリシーに同意したものとみなします
            </Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
  },
  description: {
    marginBottom: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  descriptionText: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
    opacity: 0.8,
  },
  authSection: {
    marginBottom: 40,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  authButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 18,
  },
}); 