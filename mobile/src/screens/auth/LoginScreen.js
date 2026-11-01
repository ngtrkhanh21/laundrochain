import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Eye, EyeOff, Lock, User, Sparkles, Database, ArrowRight } from 'lucide-react-native';
import { COLORS, API_BASE_URL } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import LanguageModal from '../../components/LanguageModal';

export default function LoginScreen({ navigation }) {
  const { login, loginWithGoogle, loading } = useAuth();
  const { t, isVietnamese, currentLangObj } = useLanguage();

  const [username, setUsername] = useState('member01');
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMessage(isVietnamese ? 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' : 'Please enter username and password.');
      return;
    }
    setErrorMessage('');
    const res = await login(username.trim(), password);
    if (!res.success) {
      setErrorMessage(res.error || (isVietnamese ? 'Tên đăng nhập hoặc mật khẩu không chính xác.' : 'Invalid credentials.'));
    }
  };

  const handleRealGoogleLogin = async (idToken) => {
    setErrorMessage('');
    const res = await loginWithGoogle(idToken);
    if (!res.success) {
      setErrorMessage(res.error || (isVietnamese ? 'Xác thực Google thất bại.' : 'Google auth failed.'));
    }
  };

  const handleGoogleDemoLogin = async () => {
    setErrorMessage('');
    const mockToken = 'mock-google-token-' + Date.now();
    const res = await loginWithGoogle(mockToken);
    if (!res.success) {
      setErrorMessage(res.error || (isVietnamese ? 'Đăng nhập Google thất bại.' : 'Google login failed.'));
    }
  };

  const fillQuickAccount = (userVal, passVal) => {
    setUsername(userVal);
    setPassword(passVal);
    setErrorMessage('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top Bar with Language Toggle */}
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Zap size={20} color={COLORS.white} fill={COLORS.white} />
              </View>
              <Text style={styles.brandTitle}>LaundroChain</Text>
            </View>

            <TouchableOpacity
              style={styles.langBtn}
              onPress={() => setLangModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.langText}>{currentLangObj?.flag} {currentLangObj?.shortLabel}</Text>
            </TouchableOpacity>
          </View>

          {/* Welcome Title (Pinterest Style Clean & Large) */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeHeading}>
              {isVietnamese ? 'Đăng nhập Hội viên' : 'Welcome back'}
            </Text>
            <Text style={styles.welcomeSub}>
              {isVietnamese
                ? 'Trải nghiệm giặt sấy thông minh, quản lý đơn hàng thời gian thực.'
                : 'Smart laundry made effortless. Track your cycles in real time.'}
            </Text>
          </View>

          {/* Live DB Indicator */}
          <View style={styles.dbBadge}>
            <View style={styles.dbDot} />
            <Text style={styles.dbBadgeText}>
              PostgreSQL Neon • {API_BASE_URL}
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Input Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('auth.usernameLabel', 'Tên đăng nhập')}
              </Text>
              <View style={styles.inputWrapper}>
                <User size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.usernamePlaceholder', 'Nhập tên đăng nhập...')}
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('auth.passwordLabel', 'Mật khẩu')}
              </Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.passwordPlaceholder', 'Nhập mật khẩu...')}
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={COLORS.textSecondary} />
                  ) : (
                    <Eye size={18} color={COLORS.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Fill Test Accounts */}
            <View style={styles.quickFillContainer}>
              <Text style={styles.quickFillTitle}>
                {isVietnamese ? 'Tài khoản thử nghiệm nhanh:' : 'Quick test accounts:'}
              </Text>
              <View style={styles.chipsRow}>
                <TouchableOpacity
                  style={[styles.chip, username === 'member01' && styles.chipActive]}
                  onPress={() => fillQuickAccount('member01', 'Password@123')}
                >
                  <Text style={[styles.chipText, username === 'member01' && styles.chipTextActive]}>
                    member01
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, username === 'demo_member' && styles.chipActive]}
                  onPress={() => fillQuickAccount('demo_member', 'Password@123')}
                >
                  <Text style={[styles.chipText, username === 'demo_member' && styles.chipTextActive]}>
                    demo_member
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <View style={styles.loginBtnContent}>
                  <Text style={styles.loginBtnText}>
                    {t('auth.loginBtn', 'Đăng nhập')}
                  </Text>
                  <ArrowRight size={18} color={COLORS.white} />
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                {isVietnamese ? 'hoặc tiếp tục với' : 'or continue with'}
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Login Options */}
            <GoogleSignInButton
              onRealLogin={handleRealGoogleLogin}
              onDemoLogin={handleGoogleDemoLogin}
              loading={loading}
            />

            {/* Register Link */}
            <View style={styles.registerPrompt}>
              <Text style={styles.promptText}>
                {t('auth.noAccountPrompt', 'Chưa có tài khoản?')}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
                <Text style={styles.registerLink}>
                  {t('auth.registerNow', 'Đăng ký ngay')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LanguageModal visible={langModalVisible} onClose={() => setLangModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  welcomeSection: {
    marginBottom: 16,
  },
  welcomeHeading: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  dbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  dbDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentDark,
  },
  dbBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  errorBanner: {
    backgroundColor: COLORS.dangerLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: COLORS.dangerDark,
    fontSize: 13,
    fontWeight: '600',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 4,
  },
  quickFillContainer: {
    gap: 6,
    marginTop: 2,
  },
  quickFillTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primaryDark,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  loginBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  loginBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  promptText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
});
