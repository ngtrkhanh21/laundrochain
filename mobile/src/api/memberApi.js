import { apiRequest } from './client';

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
};

