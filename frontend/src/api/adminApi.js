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

// Mock fallback nếu backend chưa kết nối hoặc tài khoản chưa có quyền ADMIN
const MOCK_USERS = [
  {
    userId: '11111111-1111-1111-1111-111111111111',
    username: 'admin',
    fullName: 'System Administrator',
    email: 'admin@laundrochain.io',
    phone: '0901234567',
    roles: ['ADMIN'],
    permissions: ['all'],
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    userId: '22222222-2222-2222-2222-222222222222',
    username: 'pricing',
    fullName: 'Lê Hoàng Pricing Manager',
    email: 'pricing@laundrochain.io',
    phone: '0902345678',
    roles: ['PRICING_MANAGER'],
    permissions: ['pricing.manage', 'bundle.publish'],
    status: 'ACTIVE',
    createdAt: '2026-02-15T09:30:00Z',
  },
  {
    userId: '33333333-3333-3333-3333-333333333333',
    username: 'site_lead',
    fullName: 'Trần Văn Cửa Hàng Trưởng',
    email: 'site1@laundrochain.io',
    phone: '0903456789',
    roles: ['SITE_MANAGER'],
    permissions: ['site.monitor', 'machine.control'],
    status: 'ACTIVE',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    userId: '44444444-4444-4444-4444-444444444444',
    username: 'tech_huy',
    fullName: 'Nguyễn Văn Kỹ Thuật Viên',
    email: 'tech@laundrochain.io',
    phone: '0904567890',
    roles: ['TECHNICIAN'],
    permissions: ['device.repair', 'kiosk.swap'],
    status: 'ACTIVE',
    createdAt: '2026-03-12T14:20:00Z',
  },
  {
    userId: '55555555-5555-5555-5555-555555555555',
    username: 'admin_demo',
    fullName: 'Khách Hàng Trải Nghiệm Demo',
    email: 'demo@laundrochain.io',
    phone: '0909998877',
    roles: ['MEMBER'],
    permissions: ['order.create'],
    status: 'ACTIVE',
    createdAt: '2026-03-20T11:00:00Z',
  },
];

const MOCK_ROLES = [
  { roleId: 'r1', name: 'ADMIN', description: 'Toàn quyền quản trị hệ thống' },
  { roleId: 'r2', name: 'PRICING_MANAGER', description: 'Quản lý bảng giá DMN và khuyến mãi' },
  { roleId: 'r3', name: 'SITE_MANAGER', description: 'Quản lý cơ sở cửa hàng và máy giặt' },
  { roleId: 'r4', name: 'TECHNICIAN', description: 'Kỹ thuật viên bảo trì và sửa chữa thiết bị' },
  { roleId: 'r5', name: 'MEMBER', description: 'Khách hàng thành viên sử dụng dịch vụ' },
];

const MOCK_SITES = [
  {
    siteId: 's1',
    code: 'LC-Q1',
    name: 'LaundroChain Quận 1 - Flagship',
    address: '128 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP.HCM',
    brandName: 'LaundroChain Express',
  },
  {
    siteId: 's2',
    code: 'LC-BTH',
    name: 'LaundroChain Bình Thạnh - Campus',
    address: '475A Điện Biên Phủ, Phường 25, Bình Thạnh, TP.HCM',
    brandName: 'LaundroChain Eco',
  },
  {
    siteId: 's3',
    code: 'LC-Q7',
    name: 'LaundroChain Quận 7 - Sunrise',
    address: '23 Nguyễn Hữu Thọ, Tân Hưng, Quận 7, TP.HCM',
    brandName: 'LaundroChain Premium',
  },
  {
    siteId: 's4',
    code: 'LC-CG',
    name: 'LaundroChain Cầu Giấy - Hà Nội',
    address: '88 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    brandName: 'LaundroChain Express',
  },
];

export const adminApi = {
  getUsers: async (search = '', page = 1, pageSize = 20) => {
    try {
      const query = new URLSearchParams({ page, pageSize });
      if (search) query.append('search', search);
      const res = await apiRequest(`/api/admin/users?${query.toString()}`);
      return res;
    } catch {
      // Fallback lọc danh sách mock nếu API chưa có token admin
      let filtered = MOCK_USERS;
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.username.toLowerCase().includes(q) ||
            (u.fullName && u.fullName.toLowerCase().includes(q)) ||
            (u.email && u.email.toLowerCase().includes(q))
        );
      }
      return {
        items: filtered,
        page,
        pageSize,
        totalCount: filtered.length,
        totalPages: 1,
      };
    }
  },

  getRoles: async () => {
    try {
      return await apiRequest('/api/admin/users/roles');
    } catch {
      return MOCK_ROLES;
    }
  },

  getSites: async () => {
    try {
      return await apiRequest('/api/admin/users/sites');
    } catch {
      return MOCK_SITES;
    }
  },

  createUser: async (payload) => {
    try {
      return await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // Mock thêm người dùng cục bộ nếu offline
      const newUser = {
        userId: 'mock-' + Date.now(),
        username: payload.username,
        role: payload.role,
        assignedSiteId: payload.siteId || null,
        temporaryPassword: payload.password,
        message: 'Tạo tài khoản thành công (Offline simulation)',
        createdAt: new Date().toISOString(),
      };
      return newUser;
    }
  },

  updateWorkplace: async (userId, siteId) => {
    return apiRequest(`/api/admin/users/${userId}/workplace`, {
      method: 'PUT',
      body: JSON.stringify({ siteId }),
    });
  },
};
