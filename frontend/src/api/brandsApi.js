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

export const brandsApi = {
  /**
   * Lấy danh sách thương hiệu (Search & Filter status)
   */
  getBrands: async (search = '', status = '') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);

    const query = params.toString() ? `?${params.toString()}` : '';
    return await brandRequest(`/api/brands${query}`);
  },

  /**
   * Lấy chi tiết thương hiệu theo ID
   */
  getBrandById: async (id) => {
    return await brandRequest(`/api/brands/${id}`);
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