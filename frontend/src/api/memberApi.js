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

// Mock fallback nếu đang chạy offline hoặc chưa có token member
const MOCK_PROFILE = {
  memberCode: 'LC100003',
  username: 'admin_demo',
  fullName: 'Khách Hàng Trải Nghiệm Demo',
  email: 'demo@laundrochain.io',
  phone: '0909998877',
  registeredVia: 'WEB',
  status: 'ACTIVE',
  tier: {
    code: 'SILVER',
    name: 'Thành Viên Bạc',
    rank: 2,
    minSpend: 500000,
  },
  tierSince: '2026-03-01T00:00:00Z',
  homeBrandName: 'LaundroChain Express',
  wallet: {
    walletId: 'w-mock-01',
    balance: 350000,
    currency: 'VND',
    status: 'ACTIVE',
  },
};

const MOCK_CARD = {
  memberCode: 'LC100003',
  fullName: 'Khách Hàng Trải Nghiệm Demo',
  tierCode: 'SILVER',
  tierName: 'Thành Viên Bạc',
  cardToken: 'crd-tok-99887711',
  qrPayload: 'LC:CARD:LC100003:crd-tok-99887711',
  issuedAt: '2026-03-01T00:00:00Z',
};

const MOCK_TIERS = [
  { tierId: 't1', code: 'BRONZE', name: 'Đồng (Bronze)', rank: 1, minSpend: 0, isDefault: true, discount: 0, bonus: 'Tích 1% điểm' },
  { tierId: 't2', code: 'SILVER', name: 'Bạc (Silver)', rank: 2, minSpend: 500000, isDefault: false, discount: 5, bonus: 'Giảm 5% + Tích 2% điểm' },
  { tierId: 't3', code: 'GOLD', name: 'Vàng (Gold)', rank: 3, minSpend: 2000000, isDefault: false, discount: 10, bonus: 'Giảm 10% + Miễn phí giặt sấy sinh nhật' },
  { tierId: 't4', code: 'PLATINUM', name: 'Bạch Kim (Platinum)', rank: 4, minSpend: 5000000, isDefault: false, discount: 15, bonus: 'Giảm 15% + Ưu tiên máy giặt giờ cao điểm' },
];

export const memberApi = {
  getProfile: async () => {
    try {
      return await apiRequest('/api/members/me');
    } catch {
      return MOCK_PROFILE;
    }
  },

  getCard: async () => {
    try {
      return await apiRequest('/api/members/me/card');
    } catch {
      return MOCK_CARD;
    }
  },

  rotateCardToken: async () => {
    try {
      return await apiRequest('/api/members/me/card/rotate', { method: 'POST' });
    } catch {
      const newToken = 'crd-tok-' + Date.now();
      return {
        ...MOCK_CARD,
        cardToken: newToken,
        qrPayload: `LC:CARD:${MOCK_CARD.memberCode}:${newToken}`,
        issuedAt: new Date().toISOString(),
      };
    }
  },

  getWallet: async () => {
    try {
      return await apiRequest('/api/members/me/wallet');
    } catch {
      return MOCK_PROFILE.wallet;
    }
  },

  topupWallet: async (amount) => {
    return await apiRequest('/api/members/me/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  getTiers: async () => {
    try {
      const tiers = await apiRequest('/api/member-tiers');
      return tiers.map((t, index) => ({
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
    } catch {
      return MOCK_TIERS;
    }
  },

  getMembers: async (page = 1, pageSize = 20) => {
    try {
      return await apiRequest(`/api/members?page=${page}&pageSize=${pageSize}`);
    } catch {
      return {
        items: [MOCK_PROFILE],
        totalCount: 1,
        page,
        pageSize,
      };
    }
  },
};
