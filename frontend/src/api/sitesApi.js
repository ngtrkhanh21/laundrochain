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

  // Thống kê doanh thu chi nhánh (TODAY, THIS_WEEK, THIS_MONTH hoặc tùy chỉnh)
  getSiteRevenue: async (siteId, { period = 'THIS_MONTH', fromDate = null, toDate = null } = {}) => {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/api/sites/${siteId}/revenue${qs}`);
  },

  // Danh sách máy giặt/sấy tại chi nhánh
  getSiteMachines: async (siteId, { status = '', classId = '' } = {}) => {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (classId) params.append('classId', classId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/api/sites/${siteId}/machines${qs}`);
  },

  // Thống kê tính khả dụng của máy theo loại tại chi nhánh
  getSiteAvailability: async (siteId) => {
    return await apiRequest(`/api/sites/${siteId}/machines/availability`);
  },

  // Danh sách đơn hàng tại chi nhánh
  getSiteOrders: async (siteId, filter = {}) => {
    const params = new URLSearchParams();
    if (filter.period) params.append('period', filter.period);
    if (filter.status && filter.status !== 'ALL') params.append('status', filter.status);
    if (filter.customerType && filter.customerType !== 'ALL') params.append('customerType', filter.customerType);
    if (filter.search) params.append('search', filter.search);
    if (filter.page) params.append('page', filter.page);
    if (filter.pageSize) params.append('pageSize', filter.pageSize);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/api/sites/${siteId}/orders${qs}`);
  },
};
