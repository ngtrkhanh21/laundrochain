import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Pressable,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Mail,
  Phone,
  Lock,
  Globe,
  PhoneCall,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Crown,
  KeyRound,
  X,
  FileText,
  Check,
  Sparkles,
  HelpCircle,
  Headphones,
} from 'lucide-react-native';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { authApi } from '../../api/authApi';
import Header from '../../components/Header';
import LanguageModal from '../../components/LanguageModal';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { isVietnamese, currentLangObj } = useLanguage();

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .filter(Boolean)
        .slice(-2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'LC';

  const handleOpenLogout = () => {
    setLogoutModalVisible(true);
  };

  const handleConfirmLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
    } catch (err) {
      console.warn('Lỗi khi đăng xuất:', err);
    } finally {
      setLogoutLoading(false);
      setLogoutModalVisible(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      Alert.alert('Lỗi', isVietnamese ? 'Vui lòng nhập đầy đủ các trường mật khẩu.' : 'Please fill all password fields.');
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert('Lỗi', isVietnamese ? 'Mật khẩu mới không khớp.' : 'New passwords do not match.');
      return;
    }
    if (newPwd.length < 6) {
      Alert.alert('Lỗi', isVietnamese ? 'Mật khẩu mới phải có tối thiểu 6 ký tự.' : 'Password must be at least 6 characters.');
      return;
    }

    setPwdLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: currentPwd,
        newPassword: newPwd,
        confirmNewPassword: confirmPwd,
      });
      setPwdModalVisible(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      Alert.alert('Thành công', isVietnamese ? 'Đổi mật khẩu thành công!' : 'Password changed successfully!');
    } catch (err) {
      Alert.alert('Lỗi', err.message || (isVietnamese ? 'Không thể đổi mật khẩu lúc này.' : 'Failed to change password.'));
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isVietnamese ? 'Tài khoản' : 'My Account'}
        subtitle={isVietnamese ? 'Thông tin hội viên & tùy chỉnh' : 'Member profile & preferences'}
        onOpenLang={() => setLangModalVisible(true)}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. PROFILE HEADER CARD (Pinterest Style) */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.fullName || user?.username || 'Hội viên LaundroChain'}
              </Text>
            </View>

            <Text style={styles.userPhone}>
              {user?.phoneNumber || user?.phone || user?.email || 'member@laundrochain.vn'}
            </Text>

            <View style={styles.badgeRow}>
              <View style={styles.tierPill}>
                <Crown size={11} color={COLORS.primary} />
                <Text style={styles.tierPillText}>
                  {user?.tierCode || 'STANDARD'}
                </Text>
              </View>

              <View style={styles.codePill}>
                <Text style={styles.codePillText}>
                  {user?.memberCode || 'LC100040'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2. SECTION: THÔNG TIN CÁ NHÂN */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>
            {isVietnamese ? 'Thông tin cá nhân' : 'Personal Information'}
          </Text>

          <View style={styles.menuCard}>
            <View style={styles.menuItem}>
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.primarySoft }]}>
                <User size={18} color={COLORS.primary} />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuLabel}>{isVietnamese ? 'Tên đăng nhập' : 'Username'}</Text>
                <Text style={styles.menuValue}>{user?.username || 'member01'}</Text>
              </View>
            </View>

            <View style={styles.menuDivider} />

            <View style={styles.menuItem}>
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.secondaryLight }]}>
                <Mail size={18} color={COLORS.secondaryDark} />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuLabel}>Email</Text>
                <Text style={styles.menuValue}>{user?.email || 'member01@laundrochain.vn'}</Text>
              </View>
            </View>

            <View style={styles.menuDivider} />

            <View style={styles.menuItem}>
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.primarySoft }]}>
                <Phone size={18} color={COLORS.primary} />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuLabel}>{isVietnamese ? 'Số điện thoại' : 'Phone Number'}</Text>
                <Text style={styles.menuValue}>{user?.phoneNumber || user?.phone || '0912345678'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. SECTION: BẢO MẬT & TÙY CHỌN */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>
            {isVietnamese ? 'Bảo mật & Cài đặt' : 'Security & Preferences'}
          </Text>

          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItemClickable}
              onPress={() => setPwdModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.primarySoft }]}>
                <Lock size={18} color={COLORS.primary} />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuTitle}>{isVietnamese ? 'Đổi mật khẩu' : 'Change Password'}</Text>
                <Text style={styles.menuSubtitle}>
                  {isVietnamese ? 'Cập nhật mật khẩu định kỳ để an toàn' : 'Keep your account secure'}
                </Text>
              </View>
              <ChevronRight size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItemClickable}
              onPress={() => setLangModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.primarySoft }]}>
                <Globe size={18} color={COLORS.primary} />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuTitle}>{isVietnamese ? 'Ngôn ngữ' : 'Language'}</Text>
                <Text style={styles.menuSubtitle}>{currentLangObj?.label || 'Tiếng Việt'}</Text>
              </View>
              <ChevronRight size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. SECTION: HỖ TRỢ & CSKH */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>
            {isVietnamese ? 'Hỗ trợ khách hàng' : 'Help & Support'}
          </Text>

          <View style={styles.supportBanner}>
            <View style={styles.supportLeft}>
              <View style={styles.supportIconWrap}>
                <Headphones size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.supportTitle}>
                  {isVietnamese ? 'Tổng đài hỗ trợ 24/7' : '24/7 Support Hotline'}
                </Text>
                <Text style={styles.supportSub}>
                  {isVietnamese ? 'Sự cố máy, nạp ví, tư vấn dịch vụ' : 'Machine issues & support'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.callNowBtn}
              onPress={() => Linking.openURL('tel:19001234')}
              activeOpacity={0.8}
            >
              <PhoneCall size={14} color={COLORS.white} />
              <Text style={styles.callNowText}>1900 1234</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. DANGER ZONE: LOGOUT BUTTON */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleOpenLogout}
          activeOpacity={0.8}
        >
          <LogOut size={18} color={COLORS.danger} />
          <Text style={styles.logoutBtnText}>
            {isVietnamese ? 'Đăng xuất tài khoản' : 'Log Out'}
          </Text>
        </TouchableOpacity>

        {/* Space for bottom tab navigation */}
        <View style={{ height: 130 }} />
      </ScrollView>

      {/* MODAL: ĐỔI MẬT KHẨU */}
      <Modal visible={pwdModalVisible} transparent animationType="fade" onRequestClose={() => setPwdModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPwdModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <KeyRound size={20} color={COLORS.primary} />
                <Text style={styles.modalTitle}>
                  {isVietnamese ? 'Đổi mật khẩu' : 'Change Password'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPwdModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{isVietnamese ? 'Mật khẩu hiện tại:' : 'Current Password:'}</Text>
              <TextInput
                style={styles.modalInput}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                value={currentPwd}
                onChangeText={setCurrentPwd}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{isVietnamese ? 'Mật khẩu mới:' : 'New Password:'}</Text>
              <TextInput
                style={styles.modalInput}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                value={newPwd}
                onChangeText={setNewPwd}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{isVietnamese ? 'Nhập lại mật khẩu mới:' : 'Confirm New Password:'}</Text>
              <TextInput
                style={styles.modalInput}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                value={confirmPwd}
                onChangeText={setConfirmPwd}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, pwdLoading && { opacity: 0.7 }]}
              onPress={handleChangePassword}
              disabled={pwdLoading}
              activeOpacity={0.85}
            >
              {pwdLoading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.saveBtnText}>
                  {isVietnamese ? 'Cập nhật mật khẩu' : 'Update Password'}
                </Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL: XÁC NHẬN ĐĂNG XUẤT */}
      <Modal visible={logoutModalVisible} transparent animationType="fade" onRequestClose={() => setLogoutModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLogoutModalVisible(false)}>
          <Pressable style={styles.logoutModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.logoutIconBox}>
              <LogOut size={26} color={COLORS.danger} />
            </View>

            <Text style={styles.logoutModalTitle}>
              {isVietnamese ? 'Xác nhận đăng xuất' : 'Confirm Logout'}
            </Text>

            <Text style={styles.logoutModalDesc}>
              {isVietnamese
                ? 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?'
                : 'Are you sure you want to sign out from your account?'}
            </Text>

            <View style={styles.logoutModalActions}>
              <TouchableOpacity
                style={styles.logoutCancelBtn}
                onPress={() => setLogoutModalVisible(false)}
                disabled={logoutLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutCancelBtnText}>
                  {isVietnamese ? 'Ở lại' : 'Stay'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.logoutConfirmBtn, logoutLoading && { opacity: 0.7 }]}
                onPress={handleConfirmLogout}
                disabled={logoutLoading}
                activeOpacity={0.8}
              >
                {logoutLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.logoutConfirmBtnText}>
                    {isVietnamese ? 'Đăng xuất' : 'Log Out'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Language Modal */}
      <LanguageModal visible={langModalVisible} onClose={() => setLangModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // 1. Profile Header Card
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#243447',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 2,
    borderColor: COLORS.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  userPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  tierPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  codePill: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  codePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  // 2. Sections
  sectionWrap: {
    marginBottom: 16,
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  menuItemClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextBox: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  menuValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  menuSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },

  // Support
  supportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  supportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  supportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  supportSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  callNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  callNowText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 12,
  },

  // Logout Button
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.dangerDark,
  },

  // Modal Common
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  saveBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
  },

  // Logout Modal
  logoutModalContent: {
    width: '85%',
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  logoutIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoutModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  logoutModalDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  logoutModalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  logoutCancelBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  logoutConfirmBtn: {
    flex: 1,
    backgroundColor: COLORS.danger,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutConfirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.white,
  },
});
