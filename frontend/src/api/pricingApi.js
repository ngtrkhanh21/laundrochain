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

  if (response.status === 204) {
    return null;
  }

  let data = null;
  const text = await response.text();
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    if (
      response.status === 403 &&
      (data?.error === 'PASSWORD_CHANGE_REQUIRED' ||
        data?.code === 'PASSWORD_CHANGE_REQUIRED' ||
        data?.message?.includes('PASSWORD_CHANGE_REQUIRED'))
    ) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:password-change-required', { detail: data }));
      }
    }

    const errorMsg =
      data?.message ||
      data?.title ||
      data?.error ||
      (response.status === 401
        ? 'Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập.'
        : response.status === 403
        ? 'Bạn không có quyền thực hiện thao tác này.'
        : response.status === 404
        ? `Không tìm thấy tài nguyên (${endpoint})`
        : `Lỗi ${response.status}`);
    throw new Error(errorMsg);
  }

  return data;
}

export const pricingApi = {
  evaluate: (payload) =>
    apiRequest('/pricing/evaluate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getActiveBundle: () => apiRequest('/pricing/bundles/active'),

  getAllBundles: () => apiRequest('/pricing/bundles'),

  getBundleById: (id) => apiRequest(`/pricing/bundles/${id}`),

  createBundle: (payload) =>
    apiRequest('/pricing/bundles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  publishBundle: (id) =>
    apiRequest(`/pricing/bundles/${id}/publish`, {
      method: 'POST',
    }),

  analyze: (bundleId) =>
    apiRequest(`/pricing/analyze${bundleId ? `?bundleId=${bundleId}` : ''}`, {
      method: 'POST',
    }),

  // ---- Giá cơ sở dịch vụ (/api/pricing/base-prices) ----
  getBasePrices: (brandId) =>
    apiRequest(`/api/pricing/base-prices${brandId ? `?brandId=${brandId}` : ''}`),

  updateServicePrice: (offeringId, { brandId = null, unitPrice }) =>
    apiRequest(`/api/pricing/base-prices/${offeringId}`, {
      method: 'PUT',
      body: JSON.stringify({ brandId, unitPrice }),
    }),

  setBasePrice: ({ offeringId, brandId = null, unitPrice }) =>
    apiRequest('/api/pricing/base-prices', {
      method: 'PUT',
      body: JSON.stringify({ offeringId, brandId, unitPrice }),
    }),

  // ---- Cấu hình giá sàn & thời hạn giữ chỗ (/api/pricing/config) ----
  getConfig: () => apiRequest('/api/pricing/config'),
  getPricingConfig: () => apiRequest('/api/pricing/config'),

  updateConfig: (payload) =>
    apiRequest('/api/pricing/config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  updatePricingConfig: (payload) =>
    apiRequest('/api/pricing/config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // ---- Quản lý chiến dịch khuyến mãi (18.3 /api/promotions) ----
  getPromotions: ({ search = '', status = '', activeOnly = false } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);
    if (activeOnly) params.append('activeOnly', 'true');
    const qs = params.toString();
    return apiRequest(`/api/promotions${qs ? `?${qs}` : ''}`);
  },

  getPromotionById: (id) => apiRequest(`/api/promotions/${id}`),

  createPromotion: (payload) =>
    apiRequest('/api/promotions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updatePromotion: (id, payload) =>
    apiRequest(`/api/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  updatePromotionStatus: (id, status) =>
    apiRequest(`/api/promotions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  deletePromotion: (id) =>
    apiRequest(`/api/promotions/${id}`, {
      method: 'DELETE',
    }),

  // ---- Quản lý quy tắc giảm giá (18.4 /api/pricing-rules) ----
  getPricingRules: async ({ search = '', ruleType = '', scope = '', isActive = null, campaignId = null } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (ruleType && ruleType !== 'ALL') params.append('ruleType', ruleType);
    if (scope && scope !== 'ALL') params.append('scope', scope);
    if (isActive !== null && isActive !== undefined && isActive !== 'ALL') params.append('isActive', String(isActive));
    if (campaignId) params.append('campaignId', campaignId);
    const qs = params.toString();
    try {
      return await apiRequest(`/api/pricing-rules${qs ? `?${qs}` : ''}`);
    } catch (err) {
      return await apiRequest(`/api/pricing/rules${qs ? `?${qs}` : ''}`);
    }
  },

  getPricingRuleById: async (id) => {
    try {
      return await apiRequest(`/api/pricing-rules/${id}`);
    } catch (err) {
      return await apiRequest(`/api/pricing/rules/${id}`);
    }
  },

  createPricingRule: async (payload) => {
    try {
      return await apiRequest('/api/pricing-rules', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      return await apiRequest('/api/pricing/rules', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
  },

  updatePricingRule: async (id, payload) => {
    try {
      return await apiRequest(`/api/pricing-rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      return await apiRequest(`/api/pricing/rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    }
  },

  deletePricingRule: async (id, hardDelete = false) => {
    try {
      return await apiRequest(`/api/pricing-rules/${id}${hardDelete ? '?hardDelete=true' : ''}`, {
        method: 'DELETE',
      });
    } catch (err) {
      return await apiRequest(`/api/pricing/rules/${id}${hardDelete ? '?hardDelete=true' : ''}`, {
        method: 'DELETE',
      });
    }
  },

  // ---- Quản lý Voucher khuyến mãi (18.5 /api/vouchers) ----
  getVouchers: ({
    search = '',
    status = '',
    campaignId = '',
    memberOnly = null,
    page = 1,
    pageNumber = 1,
    pageSize = 10,
  } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);
    if (campaignId) params.append('campaignId', campaignId);
    if (memberOnly !== null && memberOnly !== undefined && memberOnly !== 'ALL') {
      params.append('memberOnly', String(memberOnly));
    }
    const resolvedPage = pageNumber || page || 1;
    params.append('pageNumber', String(resolvedPage));
    params.append('pageSize', String(pageSize || 10));
    const qs = params.toString();
    return apiRequest(`/api/vouchers${qs ? `?${qs}` : ''}`);
  },

  getVoucherById: (id) => apiRequest(`/api/vouchers/${id}`),

  createVoucher: (payload) => {
    const isAmt =
      payload.discountType === 'FIXED_AMOUNT' ||
      payload.discountType === 'FIXED_DISCOUNT' ||
      payload.discountType === 'AMOUNT_OFF';
    const norm = {
      ...payload,
      discountType: isAmt ? 'AMOUNT_OFF' : 'PERCENT_OFF',
      minOrderSubtotal: payload.minOrderAmount ?? payload.minOrderSubtotal,
      maxUses: payload.maxUsageTotal ?? payload.maxUses,
      maxUsesPerMember: payload.maxUsagePerUser ?? payload.maxUsesPerMember ?? 1,
    };
    return apiRequest('/api/vouchers', {
      method: 'POST',
      body: JSON.stringify(norm),
    });
  },

  updateVoucher: (id, payload) => {
    const isAmt =
      payload.discountType === 'FIXED_AMOUNT' ||
      payload.discountType === 'FIXED_DISCOUNT' ||
      payload.discountType === 'AMOUNT_OFF';
    const norm = {
      ...payload,
      discountType: payload.discountType ? (isAmt ? 'AMOUNT_OFF' : 'PERCENT_OFF') : undefined,
      minOrderSubtotal: payload.minOrderAmount ?? payload.minOrderSubtotal,
      maxUses: payload.maxUsageTotal ?? payload.maxUses,
      maxUsesPerMember: payload.maxUsagePerUser ?? payload.maxUsesPerMember,
    };
    return apiRequest(`/api/vouchers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(norm),
    });
  },

  updateVoucherStatus: (id, status) =>
    apiRequest(`/api/vouchers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  deleteVoucher: (id) =>
    apiRequest(`/api/vouchers/${id}`, {
      method: 'DELETE',
    }),

  getVoucherUsages: (id, { page = 1, pageNumber = 1, pageSize = 10 } = {}) => {
    const resolvedPage = pageNumber || page || 1;
    return apiRequest(`/api/vouchers/${id}/usages?pageNumber=${resolvedPage}&pageSize=${pageSize || 10}`);
  },
};

