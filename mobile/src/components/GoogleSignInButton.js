import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { COLORS } from '../constants/config';
import { useLanguage } from '../context/LanguageContext';

WebBrowser.maybeCompleteAuthSession();

// Google Client ID từ Web & Backend cấu hình
const GOOGLE_CLIENT_ID = '842258418482-7940n2srems7p3cikasvnrkh8tkluqeb.apps.googleusercontent.com';

export default function GoogleSignInButton({ onLogin, loading = false }) {
  const { isVietnamese } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const containerRef = useRef(null);

  // 1. Trên Web: Tải Google Identity Services (GIS) và hiển thị nút Google thật duy nhất
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const renderGoogleBtn = () => {
      if (typeof window === 'undefined' || !window.google?.accounts?.id) return;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (response?.credential && onLogin) {
              setSubmitting(true);
              try {
                await onLogin(response.credential);
              } finally {
                setSubmitting(false);
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(containerRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'signin_with',
            shape: 'rectangular',
            width: 320,
            logo_alignment: 'left',
            locale: isVietnamese ? 'vi' : 'en',
          });
          setGsiReady(true);
        }
      } catch (err) {
        console.warn('Google GSI render error:', err);
      }
    };

    const scriptId = 'google-gsi-client';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setTimeout(renderGoogleBtn, 100);
      };
      document.head.appendChild(script);
    } else {
      setTimeout(renderGoogleBtn, 100);
    }
  }, [isVietnamese, onLogin]);

  // 2. Trên Native (Android / iOS): Sử dụng AuthSession
  const handleNativePress = async () => {
    if (loading || submitting) return;
    setSubmitting(true);
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'laundrochain',
        preferLocalhost: true,
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
        const hashIndex = result.url.indexOf('#');
        const queryIndex = result.url.indexOf('?');
        const fragment = hashIndex !== -1 ? result.url.substring(hashIndex + 1) : (queryIndex !== -1 ? result.url.substring(queryIndex + 1) : '');
        const params = new URLSearchParams(fragment);
        const idToken = params.get('id_token');
        if (idToken && onLogin) {
          await onLogin(idToken);
        }
      }
    } catch (err) {
      console.warn('Native Google Auth error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = loading || submitting;

  // Trên Web: Render duy nhất nút Google chính thức từ Google Identity Services
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        {isBusy && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              {isVietnamese ? 'Đang xác thực với Google...' : 'Authenticating with Google...'}
            </Text>
          </View>
        )}
        <div
          ref={containerRef}
          style={{
            display: isBusy ? 'none' : 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            minHeight: 44,
          }}
        />
        {!gsiReady && !isBusy && (
          <View style={styles.placeholderButton}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}
      </View>
    );
  }

  // Trên Native: Nút TouchableOpacity chuẩn
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleNativePress}
        disabled={isBusy}
        activeOpacity={0.82}
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
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Text style={styles.googleText}>
            {isVietnamese ? 'Đăng nhập bằng Google' : 'Sign in with Google'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  webContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  placeholderButton: {
    width: 320,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#dadce0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  googleButton: {
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
  iconContainer: {
    marginRight: 10,
  },
  googleText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
});
