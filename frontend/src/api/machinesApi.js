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
      if (data.message) errorMessage = data.message;
      else if (data.detail) errorMessage = data.detail;
      else if (data.title) errorMessage = data.title;
      else if (typeof data === 'string') errorMessage = data;
    }
    throw new Error(errorMessage);
  }

  return data;
}

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

    // Lấy danh sách toàn bộ máy trong hệ thống (hỗ trợ lọc theo siteId, kind: WASHER/DRYER, status, search)
  getMachines: async (filter = {}) => {
    if (typeof filter === 'string') {
      return await apiRequest(`/api/machines?siteId=${encodeURIComponent(filter)}`);
    }
    const params = new URLSearchParams();
    if (filter?.siteId) params.append('siteId', filter.siteId);
    if (filter?.kind && filter.kind !== 'ALL') params.append('kind', filter.kind);
    if (filter?.status && filter.status !== 'ALL') params.append('status', filter.status);
    if (filter?.machineClassId) params.append('machineClassId', filter.machineClassId);
    if (filter?.offeringId) params.append('offeringId', filter.offeringId);
    if (filter?.search) params.append('search', filter.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/api/machines${qs}`);
  },

  // Chi tiết máy theo ID
  getMachineById: async (machineId) => {
    return await apiRequest(`/api/machines/${machineId}`);
  },

  // Lấy danh sách các gói dịch vụ giặt sấy (Offerings)
  getOfferings: async (machineClassId = null, category = null) => {
    const params = new URLSearchParams();
    if (machineClassId) params.append('machineClassId', machineClassId);
    if (category) params.append('category', category);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/api/offerings${qs}`);
  },

  // Lấy danh sách chi nhánh
  getSites: async () => {
    return await apiRequest('/api/sites');
  },

  // Cập nhật trạng thái máy
  updateMachineStatus: async (machineId, status, busyUntil = null, heldUntil = null) => {
    return await apiRequest(`/api/machines/${machineId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, busyUntil, heldUntil }),
    });
  },
};
