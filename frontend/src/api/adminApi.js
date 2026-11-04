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
      if (data.detail) {
        errorMessage = data.detail;
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data.errors && typeof data.errors === 'object') {
        const firstKey = Object.keys(data.errors)[0];
        const errList = data.errors[firstKey];
        errorMessage = Array.isArray(errList) ? errList[0] : String(errList);
      } else if (data.title) {
        errorMessage = data.title;
      }
    }
    throw new Error(errorMessage);
  }

  return data;
}

export const adminApi = {
  // 1. Lấy danh sách toàn bộ người dùng (hoặc lọc theo role: MEMBER / STAFF / ADMIN..., status, search, page)
  getAllUsers: async ({ search = '', role = '', status = '', page = 1, pageSize = 20 } = {}) => {
    const query = new URLSearchParams({ page, pageSize });
    if (search) query.append('search', search);
    if (role && role !== 'ALL') query.append('role', role);
    if (status && status !== 'ALL') query.append('status', status);
    return await apiRequest(`/api/users?${query.toString()}`);
  },

  // 2. Lấy danh sách tài khoản nhân viên & quản lý (GET /api/admin/users)
  getStaffUsers: async ({ search = '', page = 1, pageSize = 20 } = {}) => {
    const query = new URLSearchParams({ page, pageSize });
    if (search) query.append('search', search);
    return await apiRequest(`/api/admin/users?${query.toString()}`);
  },

  // 3. Thống kê số lượng người dùng từ Backend (Real Counts)
  getUserStats: async () => {
    const [allRes, memberRes, staffRes, lockedRes] = await Promise.all([
      apiRequest('/api/users?page=1&pageSize=1').catch(() => null),
      apiRequest('/api/users?role=MEMBER&page=1&pageSize=1').catch(() => null),
      apiRequest('/api/admin/users?page=1&pageSize=1').catch(() => null),
      apiRequest('/api/users?status=LOCKED&page=1&pageSize=1').catch(() => null),
    ]);

    const totalUsers = allRes?.totalCount || 0;
    const totalMembers = memberRes?.totalCount || 0;
    const totalStaff = staffRes?.totalCount || 0;
    const totalLocked = lockedRes?.totalCount || 0;
    const totalActive = Math.max(0, totalUsers - totalLocked);

    return {
      totalUsers,
      totalMembers,
      totalStaff,
      totalActive,
      totalLocked,
    };
  },

  // 4. Lấy danh sách vai trò có thể gán (GET /api/admin/users/roles)
  getRoles: async () => {
    return await apiRequest('/api/admin/users/roles');
  },

  // 5. Lấy danh sách chi nhánh hoạt động (GET /api/admin/users/sites)
  getSites: async () => {
    return await apiRequest('/api/admin/users/sites');
  },

  // 6. Đăng ký tài khoản nhân viên mới (POST /api/admin/users)
  createUser: async (payload) => {
    return await apiRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // 7. Cập nhật chi nhánh làm việc cho nhân viên (PUT /api/admin/users/{userId}/workplace)
  updateWorkplace: async (userId, siteId) => {
    return await apiRequest(`/api/admin/users/${userId}/workplace`, {
      method: 'PUT',
      body: JSON.stringify({ siteId }),
    });
  },

  // 8. Khóa hoặc kích hoạt tài khoản (PATCH /api/users/{userId}/status)
  updateUserStatus: async (userId, status) => {
    return await apiRequest(`/api/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // 9. Xem chi tiết người dùng theo ID (GET /api/users/{userId})
  getUserById: async (userId) => {
    return await apiRequest(`/api/users/${userId}`);
  },

  // 10. Danh sách thiết bị (GET /api/devices)
  getDevices: async (siteId = null) => {
    const query = siteId ? `?siteId=${siteId}` : '';
    return await apiRequest(`/api/devices${query}`);
  },
};
