import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/authApi';
import { STORAGE_KEYS } from '../constants/config';

const AuthContext = createContext(null);

export const VALID_ROLES = ['MEMBER']; // ỨNG DỤNG MOBILE CHỈ CHO PHÉP ROLE MEMBER

function normalizeUser(rawUser) {
  if (!rawUser) return null;

  // Luôn ép buộc activeRole trên Mobile là MEMBER
  return {
    ...rawUser,
    id: rawUser.userId || rawUser.id,
    userId: rawUser.userId || rawUser.id,
    username: rawUser.username || '',
    fullName: rawUser.fullName || rawUser.username || 'Hội viên LaundroChain',
    email: rawUser.email || '',
    phoneNumber: rawUser.phone || rawUser.phoneNumber || '',
    phone: rawUser.phone || rawUser.phoneNumber || '',
    language: rawUser.language || 'vi',
    status: rawUser.status || 'Active',
    activeRole: 'MEMBER', // Khóa chặt MEMBER-ONLY
    roles: ['MEMBER'],    // Tuyệt đối không để lộ role quản trị trên Mobile
    permissions: rawUser.permissions || [],
    memberCode: rawUser.memberCode || rawUser.member_code || `LC${String(rawUser.userId || rawUser.id || '8888').padStart(6, '0')}`,
    tierCode: rawUser.tierCode || rawUser.tier_code || 'STANDARD',
    walletBalance: rawUser.walletBalance ?? rawUser.balance ?? 0,
    points: rawUser.points ?? 0,
    createdAt: rawUser.createdAt || new Date().toISOString(),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Khôi phục phiên đăng nhập từ AsyncStorage
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
        const savedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);

        if (!savedToken || savedToken === 'null' || savedToken === 'undefined') {
          setInitializing(false);
          return;
        }

        // Xóa sạch token mock cũ còn lưu từ các phiên test trước
        if (savedToken.startsWith('mock-') || savedToken.startsWith('demo-')) {
          await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
          setToken(null);
          setUser(null);
          setInitializing(false);
          return;
        }

        setToken(savedToken);

        // Gọi API xác thực với Backend .NET 8 & PostgreSQL
        try {
          const data = await authApi.getMe();
          const rawUser = data?.user || data;
          if (rawUser) {
            const normUser = normalizeUser(rawUser);
            await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(normUser));
            setUser(normUser);
          }
        } catch (err) {
          console.warn('Lỗi xác thực phiên trên Mobile:', err?.message);
          // Nếu token hết hạn (401), buộc đăng xuất
          if (
            err?.status === 401 ||
            err?.message?.includes('401') ||
            err?.message?.includes('Unauthorized') ||
            err?.message?.includes('Authentication required') ||
            err?.message?.includes('token is invalid') ||
            err?.message?.includes('expired')
          ) {
            await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
            setUser(null);
            setToken(null);
          } else if (savedUser && savedUser !== 'null') {
            // Lỗi mạng tạm thời: Giữ session đã lưu
            try {
              const parsed = JSON.parse(savedUser);
              setUser(normalizeUser(parsed));
            } catch {}
          }
        }
      } finally {
        setInitializing(false);
      }
    };

    verifyToken();
  }, []);

  // Đăng nhập bằng Username / Email và Mật khẩu (100% kết nối Backend & PostgreSQL)
  const login = useCallback(async (usernameOrEmail, password) => {
    setLoading(true);
    try {
      const data = await authApi.login({ username: usernameOrEmail, password });
      const rawUserData = data.user || data;

      // KIỂM SOÁT NGHIÊM NGẶT ROLE: ỨNG DỤNG MOBILE CHỈ DÀNH RIÊNG CHO MEMBER
      const backendRoles = Array.isArray(rawUserData.roles)
        ? rawUserData.roles.map((r) => String(r).toUpperCase().trim())
        : (rawUserData.role ? [String(rawUserData.role).toUpperCase().trim()] : []);

      const hasAdminOrStaffRole = backendRoles.some((r) => ['ADMIN', 'SITE_MANAGER', 'SITEMANAGER', 'TECHNICIAN', 'PRICING_MANAGER'].includes(r));
      const hasMemberRole = backendRoles.includes('MEMBER') || backendRoles.length === 0;

      if (hasAdminOrStaffRole && !hasMemberRole) {
        Alert.alert(
          'Thông báo quyền truy cập',
          'Tài khoản này là tài khoản Quản trị/Kỹ thuật viên. Ứng dụng di động chỉ phục vụ Khách hàng (Member). Đang chuyển bạn sang giao diện Hội viên mua hàng.',
          [{ text: 'Đồng ý' }]
        );
      }

      // Ép buộc chuẩn hóa sang MEMBER
      const normUser = normalizeUser(rawUserData);
      const accessToken = data.accessToken || data.token;

      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(normUser));
      setToken(accessToken);
      setUser(normUser);

      return { success: true, user: normUser };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Đăng nhập bằng Google (kết nối trực tiếp Backend .NET 8 & PostgreSQL)
  const loginWithGoogle = useCallback(async (idToken) => {
    setLoading(true);
    try {
      const effectiveToken = idToken || 'mock-google-token-' + Date.now();
      const data = await authApi.googleLogin(effectiveToken);
      const rawUserData = data.user || data;
      const normUser = normalizeUser(rawUserData);
      const accessToken = data.accessToken || data.token;

      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(normUser));
      setToken(accessToken);
      setUser(normUser);

      return { success: true, user: normUser };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Đăng ký tài khoản mới (MEMBER lưu vào PostgreSQL)
  const register = useCallback(async (payload) => {
    setLoading(true);
    try {
      const data = await authApi.register({
        ...payload,
        confirmPassword: payload.confirmPassword || payload.password,
      });
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Đăng xuất (xóa sạch toàn bộ storage và cập nhật state phiên)
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.ACTIVE_ROLE,
        STORAGE_KEYS.CACHED_WALLET,
        STORAGE_KEYS.CACHED_CARD,
        STORAGE_KEYS.CACHED_TXS,
      ]);
    } catch (err) {
      console.warn('Lỗi khi xóa session AsyncStorage:', err);
    } finally {
      setUser(null);
      setToken(null);
      setLoading(false);
    }
  }, []);

  // Cập nhật thông tin User trong session
  const refreshUserData = useCallback(async () => {
    try {
      const data = await authApi.getMe();
      const rawUser = data?.user || data;
      if (rawUser) {
        const normUser = normalizeUser(rawUser);
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(normUser));
        setUser(normUser);
      }
    } catch {}
  }, []);

  const value = {
    user,
    token,
    loading,
    initializing,
    isAuthenticated: !!token && !!user,
    login,
    loginWithGoogle,
    register,
    logout,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
