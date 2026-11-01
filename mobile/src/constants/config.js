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

// GLOBAL BLUE & WHITE DESIGN SYSTEM (LaundroChain Mobile App Standard)
export const COLORS = {
  // Primary Blue & Secondary Cyan Palette
  primary: '#1976D2',         // Primary Blue - Standard action color
  primaryDark: '#1565C0',     // Darker blue for active states/gradients
  primaryLight: '#42A5F5',    // Lighter blue for focus rings
  primarySoft: '#EBF5FF',     // Soft light blue tint for subtle backgrounds
  primaryBorder: '#BEE3F8',   // Light blue border
  secondary: '#42B8E8',       // Secondary Cyan - Accent highlights
  secondaryLight: '#E0F7FA',  // Soft cyan tint
  secondaryDark: '#0288D1',   // Deep cyan
  brandNavy: '#243447',       // Brand primary dark

  // Promotional Banner (Blue & White theme, replacing old yellow/warm)
  bannerWarm: '#EBF5FF',      // Soft clean light blue background
  bannerBorder: '#BEE3F8',    // Clean blue border
  bannerText: '#1976D2',      // Primary blue title
  bannerSubtext: '#243447',   // Primary text for description

  // Status Colors (Strict semantic status usage only)
  success: '#22C55E',         // Semantic green (Ready / Completed)
  successDark: '#16A34A',
  successSoft: '#ECFDF5',
  successBorder: '#A7F3D0',
  accent: '#22C55E',          // Backward compatibility for accent
  accentDark: '#16A34A',
  accentSoft: '#ECFDF5',
  accentBorder: '#A7F3D0',

  warning: '#F59E0B',         // Semantic amber (Busy / Pending payment)
  warningDark: '#D97706',
  warningSoft: '#FFFBEB',
  warningBorder: '#FDE68A',
  amber: '#F59E0B',
  amberDark: '#D97706',
  amberSoft: '#FFFBEB',
  amberBorder: '#FDE68A',

  danger: '#EF4444',          // Semantic red (Cancelled / Error)
  dangerLight: '#FEE2E2',
  dangerDark: '#DC2626',
  dangerSoft: '#FEF2F2',
  error: '#EF4444',
  info: '#1976D2',

  // Background & Surfaces
  background: '#F4F8FC',     // Standard page background
  card: '#FFFFFF',           // White cards & surfaces
  surface: '#FFFFFF',        // White surface
  surfaceAlt: '#F4F8FC',     // Secondary surface
  border: '#E2E8F0',         // Standard border
  borderLight: '#EDF2F7',    // Light divider border

  // Typography
  text: '#243447',           // Primary Text (Headings, titles, key numbers)
  textSecondary: '#718096',  // Secondary Text (Descriptions, metadata)
  textMuted: '#A0AEC0',      // Muted / placeholders
  white: '#FFFFFF',
};
