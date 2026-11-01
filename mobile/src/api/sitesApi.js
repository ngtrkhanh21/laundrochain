import { apiRequest } from './client';

export const sitesApi = {
  // Lấy danh sách toàn bộ chi nhánh / cơ sở
  getSites: async ({ search = '', status = '', brandId = '' } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);
    if (brandId) params.append('brandId', brandId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/api/sites${qs}`);
  },

  // Chi tiết chi nhánh theo ID
  getSiteById: async (siteId) => {
    return await apiRequest(`/api/sites/${siteId}`);
  },
};

