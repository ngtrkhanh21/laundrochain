import { apiRequest } from './client';

export const memberTiersApi = {
  getTiers: async () => {
    return await apiRequest('/api/member-tiers');
  },

  getMyProgress: async () => {
    return await apiRequest('/api/member-tiers/my-progress');
  },
};

