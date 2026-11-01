const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5119';

/**
 * API helper — tự động đính kèm Authorization header nếu có token
 * Hỗ trợ bóc tách chi tiết thông báo lỗi từ ASP.NET Core ProblemDetails
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('laundrochain_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text ? { message: text } : null;
    }
  }

  if (!response.ok) {
    let errorMessage = `Lỗi ${response.status}`;
    if (data) {
      if (data.message) {
        errorMessage = data.message;
      } else if (data.detail) {
        errorMessage = data.detail;
      } else if (data.errors && typeof data.errors === 'object') {
        const firstKey = Object.keys(data.errors)[0];
        const errList = data.errors[firstKey];
        errorMessage = Array.isArray(errList) ? errList[0] : String(errList);
      } else if (data.title) {
        errorMessage = data.title;
      }
    }
    throw new Error(errorMessage);
  }

  return data;
}

export const authApi = {
  register: (payload) =>
    apiRequest('/api/Auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: payload.username,
        fullName: payload.fullName || undefined,
        email: payload.email || undefined,
        phone: payload.phoneNumber || payload.phone || undefined,
        password: payload.password,
        confirmPassword: payload.confirmPassword,
      }),
    }),

  login: (payload) =>
    apiRequest('/api/Auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: payload.username || payload.email,
        password: payload.password,
      }),
    }),

  googleLogin: (idToken) =>
    apiRequest('/api/Auth/google-login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  getMe: async () => {
    const token = localStorage.getItem('laundrochain_token');
    if (token && (token.startsWith('mock-') || token.startsWith('demo-'))) {
      const saved = localStorage.getItem('laundrochain_user');
      return saved ? JSON.parse(saved) : null;
    }
    return apiRequest('/api/users/me');
  },

  updateMe: async (payload) => {
    const token = localStorage.getItem('laundrochain_token');
    if (token && (token.startsWith('mock-') || token.startsWith('demo-'))) {
      const saved = localStorage.getItem('laundrochain_user');
      const user = saved ? JSON.parse(saved) : {};
      const updated = {
        ...user,
        fullName: payload.fullName || user.fullName,
        email: payload.email || user.email,
        phone: payload.phoneNumber || payload.phone || user.phone,
        language: payload.language || user.language,
      };
      localStorage.setItem('laundrochain_user', JSON.stringify(updated));
      return updated;
    }
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
