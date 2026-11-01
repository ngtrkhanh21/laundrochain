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
import { ArrowLeft, User, Lock, Mail, Phone, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react-native';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function RegisterScreen({ navigation }) {
  const { register, loading } = useAuth();
  const { t, isVietnamese } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMessage(isVietnamese ? 'Vui lòng nhập tên đăng nhập và mật khẩu.' : 'Please enter username and password.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(isVietnamese ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage(isVietnamese ? 'Mật khẩu phải có tối thiểu 6 ký tự.' : 'Password must be at least 6 characters.');
      return;
    }

    setErrorMessage('');
    const res = await register({
      username: username.trim(),
      fullName: fullName.trim() || undefined,
      email: email.trim() || undefined,
      phoneNumber: phone.trim() || undefined,
      password,
      confirmPassword,
    });

    if (res.success) {
      Alert.alert(
        isVietnamese ? 'Đăng ký thành công! 🎉' : 'Registered Successfully! 🎉',
        isVietnamese
          ? 'Tài khoản Hội viên của bạn đã được tạo thành công. Vui lòng đăng nhập để bắt đầu trải nghiệm.'
          : 'Your Member account has been created. Please log in to continue.',
        [
          {
            text: isVietnamese ? 'Đăng nhập ngay' : 'Log in now',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } else {
      setErrorMessage(res.error || (isVietnamese ? 'Đăng ký thất bại, vui lòng thử lại.' : 'Registration failed.'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Back Button */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {t('auth.registerTitle', 'Tạo tài khoản')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Subtitle */}
          <Text style={styles.subTitle}>
            {isVietnamese
              ? 'Trở thành Hội viên LaundroChain để tích điểm, thăng hạng và thanh toán ví một chạm.'
              : 'Join LaundroChain to earn reward points, tier benefits, and instant VietQR wallet.'}
          </Text>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Input Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('auth.fullNameLabel', 'Họ và tên')}
              </Text>
              <View style={styles.inputWrapper}>
                <User size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.fullNamePlaceholder', 'Nguyễn Văn A')}
                  placeholderTextColor={COLORS.textMuted}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('auth.usernameLabel', 'Tên đăng nhập')} *
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

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('auth.phoneLabel', 'Số điện thoại')}
              </Text>
              <View style={styles.inputWrapper}>
                <Phone size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.phonePlaceholder', '0901234567')}
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('auth.emailLabel', 'Email')}
              </Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.emailPlaceholder', 'example@email.com')}
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('auth.passwordLabel', 'Mật khẩu')} *
              </Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.passwordMinLength', 'Tối thiểu 6 ký tự')}
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

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('auth.confirmPasswordLabel', 'Xác nhận mật khẩu')} *
              </Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.confirmPasswordPlaceholder', 'Nhập lại mật khẩu...')}
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <View style={styles.submitBtnContent}>
                  <Text style={styles.submitBtnText}>
                    {t('auth.registerBtn', 'Tạo tài khoản')}
                  </Text>
                  <ArrowRight size={18} color={COLORS.white} />
                </View>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginPrompt}>
              <Text style={styles.promptText}>
                {t('auth.hasAccountPrompt', 'Đã có tài khoản?')}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                <Text style={styles.loginLink}>
                  {t('auth.loginNow', 'Đăng nhập ngay')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: 12,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  subTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: COLORS.dangerSoft,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.dangerLight,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 5,
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
    height: 50,
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
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  loginPrompt: {
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
  loginLink: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
});
