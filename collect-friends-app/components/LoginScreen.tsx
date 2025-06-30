import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { signInWithEmail } from '../utils/auth';
import SignUpScreen from './SignUpScreen';
import { LinearGradient } from 'expo-linear-gradient';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [showSignUp, setShowSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email, password);
      onLoginSuccess();
    } catch (error: any) {
      console.error('メールログインエラー:', error);
      let errorMessage = 'ログインに失敗しました';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'ユーザーが見つかりません';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'パスワードが間違っています';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'ログイン試行回数が多すぎます。しばらく待ってから再試行してください';
      }
      
      Alert.alert('エラー', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (showSignUp) {
    return (
      <SignUpScreen
        onSwitchToLogin={() => setShowSignUp(false)}
        onSignUpSuccess={() => {
          setShowSignUp(false);
          onLoginSuccess();
        }}
      />
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.loginContainer}>
          {/* タイトルセクション */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Kanzy</Text>
            <Text style={styles.subtitle}>今すぐ遊べる友達を見つけよう！</Text>
          </View>
          
          {/* 入力フォーム */}
          <View style={styles.formSection}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>メールアドレス</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="メールアドレス"
                placeholderTextColor="#8E8E93"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>パスワード</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="パスワード"
                placeholderTextColor="#8E8E93"
                secureTextEntry
              />
            </View>
          </View>

          {/* ボタンセクション */}
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={styles.loginButtonContainer}
              onPress={handleEmailLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={['#FF7300', '#FF9C00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.loginButton, loading && styles.buttonDisabled]}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'ログイン中...' : 'メールでログイン'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signUpLink}
              onPress={() => setShowSignUp(true)}
            >
              <Text style={styles.signUpLinkText}>
                アカウントをお持ちでない方はこちら
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 112, // Status bar + some spacing
  },
  loginContainer: {
    flex: 1,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF8700',
    letterSpacing: 0.48,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#222222',
    textAlign: 'center',
    lineHeight: 20,
  },
  formSection: {
    marginBottom: 60,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  input: {
    height: 44,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#222222',
  },
  buttonSection: {
    width: '100%',
  },
  loginButtonContainer: {
    width: '100%',
    marginBottom: 12,
  },
  loginButton: {
    height: 48,
    borderRadius: 32.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signUpLink: {
    paddingVertical: 12,
  },
  signUpLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF8700',
    textAlign: 'center',
  },
}); 