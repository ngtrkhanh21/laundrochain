import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { COLORS } from '../constants/config';
import { useLanguage } from '../context/LanguageContext';

// Kích hoạt hoàn tất AuthSession nếu cần trên web / redirect
WebBrowser.maybeCompleteAuthSession();

// Google Client ID từ Web & Backend cấu hình
const GOOGLE_CLIENT_ID = '74731448226-861gtmlc71sr096tgkld2oelafuokds5.apps.googleusercontent.com';

export default function GoogleSignInButton({ onRealLogin, onDemoLogin, loading = false }) {
  const { isVietnamese } = useLanguage();
  const [authenticating, setAuthenticating] = useState(false);

  // Xử lý luồng Google OAuth THẬT qua WebBrowser
  const handleRealGoogleSignIn = async () => {
    setAuthenticating(true);
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'laundrochain',
        preferLocalhost: false,
      });

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=id_token%20token` +
        `&scope=${encodeURIComponent('openid email profile')}` +
        `&nonce=${Date.now()}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        // Trích xuất id_token từ URL hash hoặc query string
        const hashIndex = result.url.indexOf('#');
        const queryIndex = result.url.indexOf('?');
        const fragment = hashIndex !== -1 ? result.url.substring(hashIndex + 1) : (queryIndex !== -1 ? result.url.substring(queryIndex + 1) : '');

        const params = new URLSearchParams(fragment);
        const idToken = params.get('id_token');

        if (idToken) {
          if (onRealLogin) {
            await onRealLogin(idToken);
          }
          return;
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // Người dùng tự đóng cửa sổ
        return;
      }

      // Nếu không trích xuất được id_token hoặc redirect URI chưa được cấp phép trong Google Console
      Alert.alert(
        isVietnamese ? 'Thông báo đăng nhập Google' : 'Google Sign-in Note',
        isVietnamese
          ? 'Nếu tài khoản Google Client ID của bạn chưa thêm Redirect URI của ứng dụng Mobile vào Google Cloud Console, bạn có thể nhấn "Đăng nhập nhanh Google Demo" để trải nghiệm ngay với cơ sở dữ liệu thật!'
          : 'If this redirect URI is not registered in Google Cloud Console, you can use the 1-Click Google Demo button to connect directly to the real database.',
        [
          { text: isVietnamese ? 'Đóng' : 'Close', style: 'cancel' },
          {
            text: isVietnamese ? 'Đăng nhập Google Demo' : '1-Click Google Demo',
            onPress: () => onDemoLogin && onDemoLogin(),
          },
        ]
      );
    } catch (err) {
      console.warn('Lỗi Google OAuth:', err);
      Alert.alert(
        'Lỗi',
        err.message || (isVietnamese ? 'Không thể mở cửa sổ đăng nhập Google lúc này.' : 'Failed to launch Google authentication.')
      );
    } finally {
      setAuthenticating(false);
    }
  };

  const isBusy = loading || authenticating;

  return (
    <View style={styles.container}>
      {/* 1. NÚT ĐĂNG NHẬP GOOGLE OAUTH THẬT */}
      <TouchableOpacity
        style={styles.realButton}
        onPress={handleRealGoogleSignIn}
        disabled={isBusy}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <Path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <Path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <Path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </Svg>
        </View>

        {isBusy ? (
          <ActivityIndicator size="small" color={COLORS.text} />
        ) : (
          <Text style={styles.realText}>
            {isVietnamese ? 'Đăng nhập bằng tài khoản Google' : 'Sign in with Google Account'}
          </Text>
        )}
      </TouchableOpacity>

      {/* 2. NÚT ĐĂNG NHẬP GOOGLE 1-CLICK (LƯU DB THẬT) */}
      <TouchableOpacity
        style={styles.demoButton}
        onPress={onDemoLogin}
        disabled={isBusy}
        activeOpacity={0.8}
      >
        <Text style={styles.demoText}>
          {isVietnamese
            ? '⚡ Đăng nhập Google 1-Click (Demo DB Thật)'
            : '⚡ 1-Click Google Demo (Real DB)'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 8,
  },
  realButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#243447',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    width: '100%',
  },
  demoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    width: '100%',
  },
  iconContainer: {
    marginRight: 10,
  },
  realText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  demoText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
