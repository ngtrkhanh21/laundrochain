import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './client';
import { STORAGE_KEYS } from '../constants/config';

export const authApi = {
  // 1. Đăng ký tài khoản Hội viên (lưu vào PostgreSQL)
  register: (payload) =>
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: payload.username,
        fullName: payload.fullName || undefined,
        email: payload.email || undefined,
        phone: payload.phoneNumber || payload.phone || undefined,
        password: payload.password,
        confirmPassword: payload.confirmPassword || payload.password,
      }),
    }),

  // 2. Đăng nhập hệ thống (nhận JWT Token thật từ ASP.NET Core)
  login: (payload) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: payload.username || payload.email,
        password: payload.password,
      }),
    }),

  // 3. Đăng nhập Google (đồng bộ vào database PostgreSQL)
  googleLogin: (idToken) =>
    apiRequest('/api/auth/google-login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  // 4. Lấy thông tin cá nhân từ database
  getMe: async () => {
    const data = await apiRequest('/api/users/me');
    const rawUser = data?.user || data;
    return rawUser ? { user: rawUser, ...rawUser } : null;
  },

  // 5. Cập nhật thông tin cá nhân
  updateMe: async (payload) => {
    return apiRequest('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify({
        fullName: payload.fullName,
        email: payload.email || undefined,
        phone: payload.phoneNumber || payload.phone || undefined,
        language: payload.language || undefined,
      }),
    });
  },

  // 6. Đổi mật khẩu
  changePassword: (payload) =>
    apiRequest('/api/users/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
        confirmNewPassword: payload.confirmNewPassword,
      }),
    }),
};
