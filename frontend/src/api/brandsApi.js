const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5119';

/**
 * API client chuyên dụng cho Brand Management (/api/brands)
 * Tự động hỗ trợ cả JSON payload lẫn Multipart/Form-Data khi tải file Logo lên Cloudinary
 */
async function brandRequest(endpoint, options = {}) {
  const token = localStorage.getItem('laundrochain_token');

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Nếu body là FormData (upload ảnh), để browser tự sinh boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return true;
  }

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

// Fallback demo trong trường hợp backend offline hoặc chưa có quyền
const MOCK_BRANDS = [
  {
    brandId: '01927700-0000-7000-8000-000000000010',
    code: 'LAUNDRO_FLAGSHIP',
    name: 'LaundroChain Flagship',
    logoUrl: null,
    description: 'Thương hiệu tiệm giặt thông minh tự động 24/7',
    status: 'ACTIVE',
    createdAt: '2026-10-13T12:20:42.815662Z',
    totalSites: 1,
    totalMembers: 2,
  },
  {
    brandId: '01927700-0000-7000-8000-000000000020',
    code: 'AQUAPRO_EXPRESS',
    name: 'AquaPro Express Laundry',
    logoUrl: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=200&auto=format&fit=crop&q=80',
    description: 'Dịch vụ giặt sấy siêu tốc tích hợp sấy diệt khuẩn tia UV',
    status: 'ACTIVE',
    createdAt: '2026-10-14T08:15:20.100Z',
    totalSites: 3,
    totalMembers: 120,
  },
  {
    brandId: '01927700-0000-7000-8000-000000000030',
    code: 'SPEED_CLEAN_VN',
    name: 'SpeedClean Eco Care',
    logoUrl: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=200&auto=format&fit=crop&q=80',
    description: 'Hệ sinh thái giặt ủi thân thiện môi trường sử dụng nước giặt hữu cơ',
    status: 'INACTIVE',
    createdAt: '2026-10-15T09:30:00.000Z',
    totalSites: 0,
    totalMembers: 0,
  },
];

export const brandsApi = {
  /**
   * Lấy danh sách thương hiệu (Search & Filter status)
   */
  getBrands: async (search = '', status = '') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);

    const query = params.toString() ? `?${params.toString()}` : '';

    try {
      return await brandRequest(`/api/brands${query}`);
    } catch (err) {
      console.warn('Backend brands fetch fallback:', err.message);
      // Fallback local filtering
      let result = [...MOCK_BRANDS];
      if (search) {
        const q = search.toLowerCase();
        result = result.filter(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            b.code.toLowerCase().includes(q) ||
            (b.description && b.description.toLowerCase().includes(q))
        );
      }
      if (status && status !== 'ALL') {
        result = result.filter((b) => b.status === status);
      }
      return result;
    }
  },

  /**
   * Lấy chi tiết thương hiệu theo ID
   */
  getBrandById: async (id) => {
    try {
      return await brandRequest(`/api/brands/${id}`);
    } catch (err) {
      const found = MOCK_BRANDS.find((b) => b.brandId === id);
      if (found) return found;
      throw err;
    }
  },

  /**
   * Tạo thương hiệu mới (Hỗ trợ upload ảnh logo multipart/form-data)
   */
  createBrand: async (payload) => {
    let body;
    if (payload instanceof FormData) {
      body = payload;
    } else {
      body = new FormData();
      if (payload.code) body.append('code', payload.code);
      if (payload.name) body.append('name', payload.name);
      if (payload.description) body.append('description', payload.description);
      if (payload.status) body.append('status', payload.status);
      if (payload.logoUrl) body.append('logoUrl', payload.logoUrl);
      if (payload.logoFile) body.append('logoFile', payload.logoFile);
    }

    return brandRequest('/api/brands', {
      method: 'POST',
      body,
    });
  },

  /**
   * Cập nhật thông tin thương hiệu và đổi logo
   */
  updateBrand: async (id, payload) => {
    let body;
    if (payload instanceof FormData) {
      body = payload;
    } else {
      body = new FormData();
      if (payload.code) body.append('code', payload.code);
      if (payload.name) body.append('name', payload.name);
      if (payload.description !== undefined) body.append('description', payload.description || '');
      if (payload.status) body.append('status', payload.status);
      if (payload.logoUrl !== undefined) body.append('logoUrl', payload.logoUrl || '');
      if (payload.logoFile) body.append('logoFile', payload.logoFile);
    }

    return brandRequest(`/api/brands/${id}`, {
      method: 'PUT',
      body,
    });
  },

  /**
   * Xóa thương hiệu theo ID (Quyền ADMIN)
   */
  deleteBrand: async (id) => {
    return brandRequest(`/api/brands/${id}`, {
      method: 'DELETE',
    });
  },
};
