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
    if (
      response.status === 403 &&
      (data?.error === 'PASSWORD_CHANGE_REQUIRED' ||
        data?.code === 'PASSWORD_CHANGE_REQUIRED' ||
        data?.message?.includes('PASSWORD_CHANGE_REQUIRED') ||
        data?.message?.includes('temporary password'))
    ) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:password-change-required', { detail: data }));
      }
    }

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

export const maintenanceApi = {
  // Lấy danh sách việc cần xử lý đa cơ sở của Kỹ thuật viên (GET /api/maintenance-orders/my-sites)
  getMySitesMaintenanceOrders: async ({ siteId = null, status = null, priority = null } = {}) => {
    const params = new URLSearchParams();
    if (siteId) params.append('siteId', siteId);
    if (status && status !== 'ALL') params.append('status', status);
    if (priority && priority !== 'ALL') params.append('priority', priority);
    const qs = params.toString() ? `?${params.toString()}` : '';
    try {
      const res = await apiRequest(`/api/maintenance-orders/my-sites${qs}`);
      if (Array.isArray(res) && res.length > 0) {
        return res;
      }
      // Nếu my-sites trả về mảng rỗng (ví dụ tài khoản chưa được gán trạm hoặc trạm khác),
      // tự động fallback sang endpoint chung GET /api/maintenance-orders
      const fallback = await apiRequest(`/api/maintenance-orders${qs}`);
      return Array.isArray(fallback) && fallback.length > 0 ? fallback : (res || []);
    } catch {
      // Fallback cho tài khoản ADMIN hoặc khi endpoint my-sites gặp lỗi phân quyền
      try {
        return await apiRequest(`/api/maintenance-orders${qs}`);
      } catch {
        return [];
      }
    }
  },

  // Lấy danh sách phiếu bảo trì / sự cố máy (hỗ trợ lọc theo siteId, status: PENDING/IN_PROGRESS/COMPLETED/CANCELLED, priority)
  getMaintenanceOrders: async ({ siteId = null, status = null, priority = null, technicianId = null } = {}) => {
    const params = new URLSearchParams();
    if (siteId) params.append('siteId', siteId);
    if (status && status !== 'ALL') params.append('status', status);
    if (priority && priority !== 'ALL') params.append('priority', priority);
    if (technicianId) params.append('technicianId', technicianId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/api/maintenance-orders${qs}`);
  },

  // Chi tiết phiếu bảo trì theo ID
  getMaintenanceOrderById: async (id) => {
    return await apiRequest(`/api/maintenance-orders/${id}`);
  },

  // Tạo phiếu bảo trì mới
  createMaintenanceOrder: async (data) => {
    const issueType = data.issueType || 'MACHINE_STOPPED';
    let issueDescription = (data.issueDescription || '').trim();
    if (
      !issueDescription.includes('Loại lỗi:') &&
      !issueDescription.includes('Loại sự cố:') &&
      !issueDescription.includes('issueType:')
    ) {
      issueDescription = `[Báo lỗi trạm] Loại lỗi: ${issueType} | Chi tiết: ${issueDescription || 'Sự cố kỹ thuật máy'}`;
    }
    return await apiRequest('/api/maintenance-orders', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        issueDescription,
      }),
    });
  },

  // Kỹ thuật viên tự nhận phiếu sửa chữa
  acceptMaintenanceOrder: async (id) => {
    return await apiRequest(`/api/maintenance-orders/${id}/accept`, {
      method: 'POST',
    });
  },

  // Cập nhật trạng thái phiếu bảo trì
  updateMaintenanceStatus: async (id, status, notes = '') => {
    return await apiRequest(`/api/maintenance-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  },

  // Hoàn tất sửa chữa & ghi nhận nhật ký lịch sử sửa chữa trong 1 bước (POST /api/maintenance-orders/{id}/complete)
  completeMaintenanceOrder: async (id, { actionTaken, partsReplaced = '', notes = '' }) => {
    return await apiRequest(`/api/maintenance-orders/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        actionTaken: actionTaken.trim(),
        partsReplaced: partsReplaced ? partsReplaced.trim() : null,
        notes: notes ? notes.trim() : null,
      }),
    });
  },

  // Ghi thêm nhật ký lịch sử sửa chữa (POST /api/maintenance-orders/{id}/history)
  addMaintenanceHistory: async (id, { actionTaken, partsReplaced = '', notes = '' }) => {
    return await apiRequest(`/api/maintenance-orders/${id}/history`, {
      method: 'POST',
      body: JSON.stringify({
        actionTaken: actionTaken.trim(),
        partsReplaced: partsReplaced ? partsReplaced.trim() : null,
        notes: notes ? notes.trim() : null,
      }),
    });
  },
};
