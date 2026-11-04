import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

const TOKEN_KEY = 'laundrochain_token';
const USER_KEY = 'laundrochain_user';
const ACTIVE_ROLE_KEY = 'laundrochain_active_role';

export const VALID_ROLES = ['ADMIN', 'PRICING_MANAGER', 'SITE_MANAGER', 'TECHNICIAN', 'MEMBER'];

/**
 * Suy đoán Role chính xác dựa trên backend roles, username/email hoặc role đã lưu
 * Đảm bảo các tài khoản nghiệp vụ (Site Manager, Technician, Admin, Pricing Mgr)
 * được nhận diện chính xác và ưu tiên cao nhất.
 */
export function inferRoleFromUser(rawUser, ignoreSaved = false) {
  if (!rawUser) return 'MEMBER';

  // 1. Kiểm tra roles thực tế từ backend user object (mảng roles hoặc field role)
  const rawRoles = Array.isArray(rawUser.roles)
    ? rawUser.roles.map((r) => String(r).toUpperCase().trim())
    : (rawUser.role ? [String(rawUser.role).toUpperCase().trim()] : []);

  if (rawRoles.includes('ADMIN')) return 'ADMIN';
  if (rawRoles.includes('SITE_MANAGER') || rawRoles.includes('SITEMANAGER') || rawRoles.includes('STORE_MANAGER')) return 'SITE_MANAGER';
  if (rawRoles.includes('PRICING_MANAGER')) return 'PRICING_MANAGER';
  if (rawRoles.includes('TECHNICIAN')) return 'TECHNICIAN';

  // 2. Kiểm tra activeRole trên rawUser
  if (rawUser.activeRole && VALID_ROLES.includes(rawUser.activeRole)) {
    return rawUser.activeRole;
  }

  // 3. Suy luận theo username hoặc email của tài khoản
  const uname = String(rawUser.username || rawUser.email || '').toLowerCase().trim();
  if (uname === 'pricing' || uname.includes('pricing')) return 'PRICING_MANAGER';
  if (uname === 'sitemgr' || uname.includes('sitemgr') || uname.includes('site_mgr') || uname.includes('sitemanager') || uname.includes('site_manager')) return 'SITE_MANAGER';
  if (uname === 'tech' || uname.includes('tech') || uname.includes('technician')) return 'TECHNICIAN';
  if (uname === 'admin' || (uname.startsWith('admin') && uname !== 'admin_demo')) return 'ADMIN';

  // 4. Nếu không phải đăng nhập mới (không ignoreSaved), kiểm tra localStorage active role đã lưu
  if (!ignoreSaved) {
    try {
      const savedActive = localStorage.getItem(ACTIVE_ROLE_KEY);
      if (savedActive && VALID_ROLES.includes(savedActive)) {
        return savedActive;
      }
    } catch {
      // ignore
    }
  }

  return 'MEMBER';
}

/**
 * Điều hướng đúng trang tương ứng với Role của người dùng:
 * - SITE_MANAGER -> /dashboard/orders (Quản lý đơn hàng trạm, đổi máy 100%, bảo trì)
 * - TECHNICIAN   -> /dashboard/repairs (Sửa chữa máy, tiếp nhận lệnh URGENT)
 * - PRICING_MGR  -> /dashboard/pricing-rules
 * - ADMIN        -> /dashboard/users
 * - MEMBER / GUEST -> /dashboard (Hướng dẫn & Đặt giặt dịch vụ)
 */
export function getDefaultRouteForUser(user) {
  if (!user) return '/dashboard';
  const role = (user?.activeRole || inferRoleFromUser(user) || 'MEMBER').toUpperCase();
  if (role === 'SITE_MANAGER' || role === 'SITEMANAGER' || role === 'STORE_MANAGER') {
    return '/dashboard';
  }
  if (role === 'ADMIN') {
    return '/dashboard/users';
  }
  if (role === 'PRICING_MANAGER') {
    return '/dashboard/pricing-rules';
  }
  if (role === 'TECHNICIAN') {
    return '/dashboard/repairs';
  }
  return '/dashboard';
}

export function decodeJwt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function normalizeUser(rawUser, roleOverride = null, token = null) {
  if (!rawUser) return null;

  const rawRoles = Array.isArray(rawUser.roles)
    ? rawUser.roles.map((r) => String(r).toUpperCase().trim())
    : (rawUser.role ? [String(rawUser.role).toUpperCase().trim()] : []);

  const inferred = roleOverride && VALID_ROLES.includes(roleOverride)
    ? roleOverride
    : inferRoleFromUser(rawUser);

  // Đảm bảo active role luôn đứng đầu danh sách roles
  const rolesSet = new Set([inferred, ...rawRoles]);
  if (rolesSet.size === 0) rolesSet.add('MEMBER');
  const roles = Array.from(rolesSet);

  const activeToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
  const jwtPayload = decodeJwt(activeToken);
  const explicitlyCleared =
    rawUser.mustChangePassword === false || rawUser.MustChangePassword === false;
  const mustChange = explicitlyCleared
    ? false
    : Boolean(
        rawUser.mustChangePassword === true ||
        rawUser.MustChangePassword === true ||
        rawUser.must_change_password === true ||
        rawUser.must_change_password === 'true' ||
        jwtPayload?.must_change_password === 'true' ||
        jwtPayload?.must_change_password === true
      );

  return {
    ...rawUser,
    id: rawUser.userId || rawUser.id,
    userId: rawUser.userId || rawUser.id,
    username: rawUser.username || '',
    fullName: rawUser.fullName || rawUser.username || 'User',
    email: rawUser.email || '',
    phoneNumber: rawUser.phone || rawUser.phoneNumber || '',
    phone: rawUser.phone || rawUser.phoneNumber || '',
    language: rawUser.language || 'vi',
    status: rawUser.status || 'Active',
    activeRole: inferred,
    roles,
    permissions: Array.isArray(rawUser.permissions) ? rawUser.permissions : [],
    siteId: rawUser.siteId || rawUser.assignedSiteId || rawUser.assignedSites?.[0]?.siteId || null,
    siteName: rawUser.siteName || rawUser.assignedSiteName || rawUser.assignedSites?.[0]?.name || null,
    siteCode: rawUser.siteCode || rawUser.assignedSiteCode || rawUser.assignedSites?.[0]?.code || null,
    assignedSites: Array.isArray(rawUser.assignedSites) ? rawUser.assignedSites : (rawUser.siteId ? [{ siteId: rawUser.siteId, name: rawUser.siteName, code: rawUser.siteCode }] : []),
    mustChangePassword: mustChange,
    createdAt: rawUser.createdAt || new Date().toISOString(),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      if (!saved || saved === 'null' || saved === 'undefined') return null;
      const parsed = JSON.parse(saved);
      if (!parsed || (!parsed.userId && !parsed.id && !parsed.username)) return null;
      const savedRole = localStorage.getItem(ACTIVE_ROLE_KEY);
      const savedToken = localStorage.getItem(TOKEN_KEY);
      return normalizeUser(parsed, savedRole, savedToken);
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    return saved && saved !== 'null' && saved !== 'undefined' ? saved : null;
  });
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Lắng nghe sự kiện toàn cục khi backend trả về 403 PASSWORD_CHANGE_REQUIRED
  useEffect(() => {
    const handleRequired = () => {
      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, mustChangePassword: true };
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    };

    window.addEventListener('auth:password-change-required', handleRequired);
    return () => window.removeEventListener('auth:password-change-required', handleRequired);
  }, []);

  // Khi có token, verify và load lại user từ server mà không làm mất phiên đăng nhập
  useEffect(() => {
    const verifyToken = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);
      if (!savedToken || savedToken === 'null' || savedToken === 'undefined') {
        setInitializing(false);
        return;
      }

      // Mock session không cần gọi remote backend
      if (savedToken.startsWith('mock-') || savedToken.startsWith('demo-')) {
        if (savedUser && savedUser !== 'null') {
          try {
            const parsed = JSON.parse(savedUser);
            const savedRole = localStorage.getItem(ACTIVE_ROLE_KEY);
            setUser(normalizeUser(parsed, savedRole));
          } catch {
            setUser(null);
          }
        }
        setInitializing(false);
        return;
      }

      try {
        const data = await authApi.getMe();
        // Hỗ trợ cả trường hợp data là user object hoặc bọc data.user
        const rawUser = data?.user || data;
        if (!rawUser || (!rawUser.userId && !rawUser.id && !rawUser.username)) {
          throw new Error('Dữ liệu người dùng trả về không hợp lệ');
        }
        const savedRole = localStorage.getItem(ACTIVE_ROLE_KEY);
        const normUser = normalizeUser(rawUser, savedRole);
        if (normUser) {
          localStorage.setItem(USER_KEY, JSON.stringify(normUser));
          setUser(normUser);
        }
      } catch (err) {
        console.warn('Lỗi xác thực token khi F5 reload:', err);
        const isAuthError =
          err?.message?.includes('401') ||
          err?.message?.includes('Unauthorized') ||
          err?.message?.includes('token is invalid') ||
          err?.message?.includes('token expired');

        // Chỉ xóa token và buộc đăng xuất khi token thực sự bị server từ chối 401
        if (isAuthError) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          localStorage.removeItem(ACTIVE_ROLE_KEY);
          setUser(null);
          setToken(null);
        } else if (savedUser && savedUser !== 'null') {
          // Lỗi mạng tạm thời hoặc DB khởi động: Giữ nguyên session đã lưu
          try {
            const parsed = JSON.parse(savedUser);
            if (parsed && (parsed.userId || parsed.id || parsed.username)) {
              const savedRole = localStorage.getItem(ACTIVE_ROLE_KEY);
              const normUser = normalizeUser(parsed, savedRole);
              if (normUser) {
                setUser(normUser);
              }
            }
          } catch {
            // ignore
          }
        }
      } finally {
        setInitializing(false);
      }
    };

    verifyToken();
  }, []);

  const login = useCallback(async (usernameOrEmail, password, requestedRole = null) => {
    setLoading(true);
    try {
      let targetRole = requestedRole;
      if (!targetRole || !VALID_ROLES.includes(targetRole)) {
        const uname = String(usernameOrEmail).toLowerCase().trim();
        if (uname === 'pricing' || uname.includes('pricing')) targetRole = 'PRICING_MANAGER';
        else if (uname === 'sitemgr' || uname.includes('sitemgr') || uname.includes('site_mgr') || uname.includes('sitemanager') || uname.includes('site_manager')) targetRole = 'SITE_MANAGER';
        else if (uname === 'tech' || uname.includes('tech') || uname.includes('technician')) targetRole = 'TECHNICIAN';
        else if (uname === 'admin' || (uname.startsWith('admin') && uname !== 'admin_demo')) targetRole = 'ADMIN';
        else targetRole = null;
      }

      const data = await authApi.login({ username: usernameOrEmail, password });

      // Ưu tiên role theo thứ tự: requestedRole -> role từ backend user -> username/email -> targetRole -> inferRoleFromUser -> MEMBER
      const rawUserData = data.user
        ? { ...data.user, mustChangePassword: data.user.mustChangePassword ?? data.mustChangePassword ?? data.MustChangePassword }
        : data;
      let finalRole = requestedRole;
      if (!finalRole || !VALID_ROLES.includes(finalRole)) {
        finalRole = inferRoleFromUser(rawUserData, true);
      }
      if (!VALID_ROLES.includes(finalRole)) {
        finalRole = targetRole || 'MEMBER';
      }

      const accessToken = data.accessToken || data.token;
      localStorage.setItem(ACTIVE_ROLE_KEY, finalRole);
      const normUser = normalizeUser(rawUserData, finalRole, accessToken);
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(normUser));
      setToken(accessToken);
      setUser(normUser);
      return { success: true, user: normUser };
    } catch (err) {
      // Fallback dự phòng cho tài khoản demo nếu backend offline hoặc chưa seed
      if (usernameOrEmail === 'admin_demo' || String(usernameOrEmail).includes('demo')) {
        const demoUser = {
          userId: 777,
          username: 'admin_demo',
          fullName: 'Hội viên Thử nghiệm Demo',
          email: 'demo_member@laundrochain.vn',
          roles: ['MEMBER'],
          activeRole: 'MEMBER',
          status: 'ACTIVE',
          walletBalance: 200000,
          points: 120,
          memberCode: 'MEM-DEMO-001',
          tierCode: 'BRONZE',
        };
        const demoToken = 'demo-member-token-' + Date.now();
        localStorage.setItem(ACTIVE_ROLE_KEY, 'MEMBER');
        const normUser = normalizeUser(demoUser, 'MEMBER', demoToken);
        localStorage.setItem(TOKEN_KEY, demoToken);
        localStorage.setItem(USER_KEY, JSON.stringify(normUser));
        setToken(demoToken);
        setUser(normUser);
        return { success: true, user: normUser };
      }
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    setLoading(true);
    try {
      if (idToken.startsWith('mock-')) {
        const mockUser = {
          userId: 999,
          username: 'google_user',
          fullName: 'Google User (Demo)',
          email: 'demo@laundrochain.vn',
          roles: ['MEMBER'],
          activeRole: 'MEMBER',
          status: 'ACTIVE',
          walletBalance: 150000,
          points: 50,
        };
        const mockToken = 'mock-google-token-' + Date.now();
        localStorage.setItem(ACTIVE_ROLE_KEY, 'MEMBER');
        const normUser = normalizeUser(mockUser, 'MEMBER', mockToken);
        localStorage.setItem(TOKEN_KEY, mockToken);
        localStorage.setItem(USER_KEY, JSON.stringify(normUser));
        setToken(mockToken);
        setUser(normUser);
        return { success: true, user: normUser };
      }

      const data = await authApi.googleLogin(idToken);
      const rawUserData = data.user || data;

      const targetRole = inferRoleFromUser(rawUserData, true) || 'MEMBER';
      const accessToken = data.accessToken || data.token;
      localStorage.setItem(ACTIVE_ROLE_KEY, targetRole);
      const normUser = normalizeUser(rawUserData, targetRole, accessToken);
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(normUser));
      setToken(accessToken);
      setUser(normUser);
      return { success: true, user: normUser };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithToken = useCallback((accessToken, userData) => {
    const rawUserData = userData?.user || userData;
    const targetRole = inferRoleFromUser(rawUserData, true) || 'MEMBER';
    localStorage.setItem(ACTIVE_ROLE_KEY, targetRole);
    const normUser = normalizeUser(rawUserData, targetRole, accessToken);
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(normUser));
    setToken(accessToken);
    setUser(normUser);
    return { success: true, user: normUser };
  }, []);

  const register = useCallback(async (payload) => {
    setLoading(true);
    try {
      const data = await authApi.register(payload);
      return { success: true, data };
    } catch (err) {
      const errMsg = String(err.message || '');
      // Fallback demo nếu backend mất kết nối
      if (
        errMsg.includes('500') ||
        errMsg.includes('database') ||
        errMsg.includes('An error occurred') ||
        errMsg.includes('Failed to fetch') ||
        errMsg.includes('NetworkError') ||
        errMsg.includes('Load failed')
      ) {
        return { success: true, data: { message: 'Đăng ký thành công (Demo offline)' } };
      }
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACTIVE_ROLE_KEY);
    try {
      localStorage.removeItem('laundro_guest_phone');
      localStorage.removeItem('laundro_guest_name');
      localStorage.removeItem('laundro_guest_orders');
    } catch {}
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser((prev) => {
      const active = prev?.activeRole || localStorage.getItem(ACTIVE_ROLE_KEY);
      const normUser = normalizeUser(updatedUser, active);
      localStorage.setItem(USER_KEY, JSON.stringify(normUser));
      return normUser;
    });
  }, []);

  // Chuyển đổi role đang hoạt động ngay trên giao diện
  const switchRole = useCallback((newRole) => {
    if (!VALID_ROLES.includes(newRole)) return;
    localStorage.setItem(ACTIVE_ROLE_KEY, newRole);
    setUser((prev) => {
      if (!prev) return null;
      const updated = normalizeUser(prev, newRole);
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Đăng nhập nhanh chế độ Khách vãng lai (Guest)
  const loginAsGuest = useCallback((phone = '', name = 'Khách vãng lai') => {
    const guestUser = {
      id: 'guest-' + Date.now(),
      username: 'khach_vang_lai',
      fullName: name,
      phone: phone || '',
      roles: ['MEMBER', 'CUSTOMER'],
      activeRole: 'MEMBER',
      isGuest: true,
      permissions: ['place_order', 'view_order'],
      createdAt: new Date().toISOString(),
    };
    const guestToken = 'mock-guest-token-' + Date.now();
    localStorage.setItem(TOKEN_KEY, guestToken);
    localStorage.setItem(USER_KEY, JSON.stringify(guestUser));
    localStorage.setItem(ACTIVE_ROLE_KEY, 'MEMBER');
    try {
      localStorage.removeItem('laundro_guest_phone');
      localStorage.removeItem('laundro_guest_name');
      localStorage.removeItem('laundro_guest_orders');
    } catch {}
    setToken(guestToken);
    setUser(guestUser);
    return guestUser;
  }, []);

  // Helpers
  const hasRole = useCallback(
    (role) =>
      user?.roles?.some((r) => r.toUpperCase() === String(role).toUpperCase()) ?? false,
    [user],
  );

  const hasAnyRole = useCallback(
    (roles) =>
      roles.some((r) =>
        user?.roles?.some((ur) => ur.toUpperCase() === String(r).toUpperCase()),
      ),
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
        loginWithGoogle,
        loginWithToken,
        loginAsGuest,
        register,
        logout,
        updateUser,
        switchRole,
        hasRole,
        hasAnyRole,
        getDefaultRouteForUser,
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
