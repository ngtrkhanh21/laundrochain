const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5119';

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
      if (data.detail) errorMessage = data.detail;
      else if (data.message) errorMessage = data.message;
      else if (data.title) errorMessage = data.title;
    }
    throw new Error(errorMessage);
  }

  return data;
}

export const memberApi = {
  getProfile: async () => {
    return await apiRequest('/api/members/me');
  },

  getCard: async () => {
    return await apiRequest('/api/members/me/card');
  },

  rotateCardToken: async () => {
    return await apiRequest('/api/members/me/card/rotate', { method: 'POST' });
  },

  getWallet: async () => {
    return await apiRequest('/api/members/me/wallet');
  },

  topupWallet: async (amount) => {
    return await apiRequest('/api/members/me/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  getTiers: async () => {
    const tiers = await apiRequest('/api/member-tiers');
    return (tiers || []).map((t) => ({
      ...t,
      discount: t.rank === 1 ? 0 : t.rank === 2 ? 5 : t.rank === 3 ? 10 : 15,
      bonus:
        t.rank === 1
          ? 'Tích 1% điểm'
          : t.rank === 2
            ? 'Giảm 5% đơn giặt'
            : t.rank === 3
              ? 'Giảm 10% đơn giặt'
              : 'Giảm 15% đơn giặt + Ưu tiên máy',
    }));
  },

  getMembers: async (page = 1, pageSize = 20) => {
    return await apiRequest(`/api/members?page=${page}&pageSize=${pageSize}`);
  },
};