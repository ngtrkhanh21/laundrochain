import { apiRequest } from './client';

export const machinesApi = {
  // Lấy danh sách máy đang khả dụng (AVAILABLE) kèm dịch vụ tương thích
  getAvailableMachines: async (query = {}) => {
    const params = new URLSearchParams();
    if (query.siteId) params.append('siteId', query.siteId);
    if (query.kind) params.append('kind', query.kind);
    if (query.machineClassId) params.append('machineClassId', query.machineClassId);
    if (query.offeringId) params.append('offeringId', query.offeringId);
    if (query.search) params.append('search', query.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/api/machines/available${qs}`);
  },

  // Lấy danh sách dịch vụ tương thích của một máy cụ thể
  getCompatibleServices: async (machineId) => {
    return await apiRequest(`/api/machines/${machineId}/services`);
  },
};

