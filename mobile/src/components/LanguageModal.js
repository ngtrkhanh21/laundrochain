import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';

export default function LanguageModal({ visible, onClose }) {
  const { language, setLanguage, isVietnamese } = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isVietnamese ? 'Chọn ngôn ngữ' : 'Select Language'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.list}>
            {LANGUAGES.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langItem, isSelected && styles.langItemSelected]}
                  onPress={() => {
                    setLanguage(lang.code);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.langLeft}>
                    <Text style={styles.flag}>{lang.flag}</Text>
                    <Text style={[styles.langName, isSelected && styles.langNameSelected]}>
                      {lang.label}
                    </Text>
                  </View>
                  {isSelected && <Check size={18} color={COLORS.primary} strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    gap: 10,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  langItemSelected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flag: {
    fontSize: 22,
  },
  langName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  langNameSelected: {
    color: COLORS.primary,
    fontWeight: '800',
  },
});

