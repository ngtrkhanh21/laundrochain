import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, Globe, Bell } from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Header({ title, subtitle, showLangToggle = true, onOpenLang, onBellPress }) {
  const { user } = useAuth();
  const { isVietnamese, currentLangObj } = useLanguage();

  const firstName = user?.fullName
    ? user.fullName.split(' ').filter(Boolean).slice(-1)[0]
    : user?.username || (isVietnamese ? 'Hội viên' : 'Member');

  const greetingTitle = title || (isVietnamese ? `Xin chào, ${firstName}` : `Hello, ${firstName}`);
  const defaultSub = isVietnamese ? 'Khởi đầu tươi mới cho trang phục của bạn.' : 'A fresh start for your everyday.';

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.titleContainer}>
          <Text style={styles.appTitle} numberOfLines={1}>
            {greetingTitle}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle || defaultSub}
          </Text>
        </View>
      </View>

      <View style={styles.rightActions}>
        {showLangToggle && onOpenLang && (
          <TouchableOpacity style={styles.langBtn} onPress={onOpenLang} activeOpacity={0.7}>
            <Globe size={15} color={COLORS.primary} />
            <Text style={styles.langText}>{currentLangObj?.shortLabel || (isVietnamese ? 'VI' : 'EN')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.bellBtn}
          onPress={onBellPress || onOpenLang}
          activeOpacity={0.7}
        >
          <Bell size={18} color={COLORS.textSecondary} />
          <View style={styles.bellDot} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: COLORS.white,
  },
  left: {
    flex: 1,
    paddingRight: 12,
  },
  titleContainer: {
    gap: 3,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
});
