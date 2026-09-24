import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

const TOKEN_KEY = 'laundrochain_token';
const USER_KEY = 'laundrochain_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Khi có token, verify và load lại user từ server
  useEffect(() => {
    const verifyToken = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        setInitializing(false);
        return;
      }
      try {
        const freshUser = await authApi.getMe();
        setUser(freshUser);
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
      } catch {
        // Token hết hạn hoặc invalid → logout
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setToken(null);
      } finally {
        setInitializing(false);
      }
    };

    verifyToken();
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.accessToken);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (payload) => {
    setLoading(true);
    try {
      const data = await authApi.register(payload);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  }, []);

  // Helpers
  const hasRole = useCallback(
    (role) => user?.roles?.includes(role) ?? false,
    [user],
  );

  const hasAnyRole = useCallback(
    (roles) => roles.some((r) => user?.roles?.includes(r)),
    [user],
  );

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        initializing,
        isAuthenticated,
        login,
        register,
        logout,
        updateUser,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được dùng bên trong AuthProvider');
  }
  return context;
}
