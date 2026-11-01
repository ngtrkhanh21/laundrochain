const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

export const pricingApi = {
  evaluate: (payload) =>
    apiRequest('/pricing/evaluate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getActiveBundle: () => apiRequest('/pricing/bundles/active'),

  getAllBundles: () => apiRequest('/pricing/bundles'),

  getBundleById: (id) => apiRequest(`/pricing/bundles/${id}`),

  createBundle: (payload) =>
    apiRequest('/pricing/bundles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  publishBundle: (id) =>
    apiRequest(`/pricing/bundles/${id}/publish`, {
      method: 'POST',
    }),

  analyze: (bundleId) =>
    apiRequest(`/pricing/analyze${bundleId ? `?bundleId=${bundleId}` : ''}`, {
      method: 'POST',
    }),
};
