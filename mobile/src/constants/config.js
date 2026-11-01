import { Platform } from 'react-native';

// Địa chỉ IP của máy chủ Backend .NET 8 (chạy trên cổng 5119)
// Trên thiết bị thật cùng mạng Wi-Fi: Dùng IP máy tính (192.168.1.202)
// Trên Android Emulator: Dùng 10.0.2.2 hoặc 192.168.1.202
// Trên iOS Simulator / Web: Dùng hostname trình duyệt hoặc 192.168.1.202
const LOCAL_PC_IP = '192.168.1.202';
const BACKEND_PORT = '5119';

const getDefaultApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:${BACKEND_PORT}`;
  }
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return `http://${LOCAL_PC_IP}:${BACKEND_PORT}`;
  }
  return `http://localhost:${BACKEND_PORT}`;
};

export const API_BASE_URL = getDefaultApiUrl();

export const STORAGE_KEYS = {
  TOKEN: 'laundrochain_token',
  USER: 'laundrochain_user',
  ACTIVE_ROLE: 'laundrochain_active_role',
  LANGUAGE: 'laundrochain_lang',
  CACHED_WALLET: 'laundro_cached_wallet',
  CACHED_CARD: 'laundro_cached_card',
  CACHED_TXS: 'laundro_cached_transactions',
};

// Bảng màu thiết kế hiện đại Pinterest (Royal Blue, Soft Cream, Clean White & Slate)
export const COLORS = {
  // Primary Royal Blue Palette
  primary: '#2563EB',         // Xanh dương tươi sáng phong cách Pinterest
  primaryDark: '#1D4ED8',     // Xanh dương đậm nhấn mạnh
  primaryLight: '#3B82F6',    // Xanh dương sáng
  primarySoft: '#EFF6FF',     // Nền xanh nhạt dịu mắt
  primaryBorder: '#BFDBFE',   // Viền xanh nhạt
  brandNavy: '#0F172A',       // Xanh đen thương hiệu sang trọng

  // Warm Amber / Cream Banner Palette (cho các banner khuyến mãi & Freshness card)
  bannerWarm: '#FEF3C7',      // Vàng kem ấm (Fresh clothes banner)
  bannerBorder: '#FDE68A',
  bannerText: '#78350F',
  bannerSubtext: '#92400E',

  // Accent Green Palette
  accent: '#10B981',         // Xanh ngọc lục bảo (Thành công / Sẵn sàng)
  accentDark: '#059669',
  accentSoft: '#ECFDF5',
  accentBorder: '#A7F3D0',

  // Amber / Warning Palette
  amber: '#F59E0B',
  amberDark: '#D97706',
  amberSoft: '#FFFBEB',
  amberBorder: '#FDE68A',

  // Danger / Red Palette
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dangerDark: '#DC2626',
  dangerSoft: '#FEF2F2',

  // Neutral Background & Surface
  background: '#F8FAFC',     // Nền ứng dụng sáng sủa, thoáng đãng
  card: '#FFFFFF',           // Nền thẻ trắng tinh
  surface: '#F1F5F9',        // Bề mặt xám nhạt
  surfaceAlt: '#F8FAFC',
  border: '#E2E8F0',         // Viền thẻ tinh tế
  borderLight: '#F1F5F9',

  // Typography Colors
  text: '#0F172A',           // Văn bản chính đậm nét, dễ đọc
  textSecondary: '#475569',  // Văn bản phụ
  textMuted: '#94A3B8',      // Gợi ý / Nhãn mờ
  white: '#FFFFFF',
};
