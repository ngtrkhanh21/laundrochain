const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * API helper — tự động đính kèm Authorization header nếu có token
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Lỗi ${response.status}`);
  }

  return data;
}

export const authApi = {
  register: (payload) =>
    apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  getMe: () => apiRequest('/auth/me'),

  updateMe: (payload) =>
    apiRequest('/auth/me', { method: 'PUT', body: JSON.stringify(payload) }),

  pricingTest: () => apiRequest('/auth/pricing-test'),
};
