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

export const ordersApi = {
  // 1. Tính báo giá dự kiến & áp voucher chiết khấu
  calculateQuote: async ({ siteId, items, voucherCode = null, customerType = 'MEMBER', memberId = null }) => {
    return await apiRequest('/api/pricing/quote', {
      method: 'POST',
      body: JSON.stringify({ siteId, items, voucherCode, customerType, memberId }),
    });
  },

  // 2. Tra cứu chi tiết báo giá theo QuoteId
  getQuoteById: async (quoteId) => {
    return await apiRequest(`/api/pricing/quote/${quoteId}`);
  },

  // 3. Kiểm tra tính hợp lệ của Voucher
  validateVoucher: async (code, subtotal = 0, memberId = null) => {
    return await apiRequest('/api/vouchers/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal, memberId }),
    });
  },

  // 3.1. Lấy danh sách Voucher khả dụng (/api/vouchers/available)
  getAvailableVouchers: async (subtotal = null, memberId = null) => {
    const params = new URLSearchParams();
    if (subtotal !== null && subtotal !== undefined && Number(subtotal) > 0) {
      params.append('subtotal', subtotal);
    }
    if (memberId) {
      params.append('memberId', memberId);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/api/vouchers/available${query}`);
  },

  // 4. Lấy danh sách chiến dịch khuyến mãi đang hoạt động
  getPromotions: async () => {
    return await apiRequest('/api/promotions?activeOnly=true');
  },

  // 5. Tạo đơn hàng từ QuoteId & Tự động giữ máy (HELD)
  createOrder: async ({ quoteId, channel = 'APP', guestName = null, guestPhone = null, note = null }) => {
    return await apiRequest('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ quoteId, channel, guestName, guestPhone, note }),
    });
  },

  // 6. Tra cứu chi tiết đơn hàng theo ID
  getOrderById: async (orderId) => {
    return await apiRequest(`/api/orders/${orderId}`);
  },

  // 7. Tra cứu chi tiết đơn hàng theo Mã đơn (OrderCode)
  getOrderByCode: async (orderCode) => {
    return await apiRequest(`/api/orders/code/${orderCode}`);
  },

  // 8. Thanh toán đơn giặt (CASH, WALLET, BANK_TRANSFER, VNPAY, MOCK)
  payOrder: async (orderId, { paymentMethod = 'WALLET', note = 'Thanh toán đơn giặt' } = {}) => {
    return await apiRequest(`/api/orders/${orderId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod, note }),
    });
  },

  // 8.1. Thanh toán đơn hàng trực tiếp bằng số dư Ví thành viên (WALLET)
  payOrderWithWallet: async (orderId, request = {}) => {
    return await apiRequest(`/api/orders/${orderId}/pay/wallet`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // 8.2. [1 Bước] Tạo đơn giặt từ báo giá (QuoteId), giữ máy và trừ tiền ví thành viên xác nhận ngay
  checkoutWithWallet: async (request) => {
    return await apiRequest('/api/orders/checkout/wallet', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // 8.3. Tạo mã QR thanh toán PayOS VietQR cho đơn hàng
  createPayOsQrForOrder: async (orderId, options = {}) => {
    return await apiRequest(`/api/orders/${orderId}/payos-qr`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  // 8.4. Kiểm tra trạng thái thanh toán PayOS của đơn và tự động xác nhận đơn (CONFIRMED)
  getOrderPaymentStatus: async (orderId) => {
    return await apiRequest(`/api/orders/${orderId}/payment-status`);
  },

  // 8.5. [1 Bước] Checkout trực tiếp với PayOS (Tạo đơn + sinh VietQR tức thì qua /api/orders/checkout-payos)
  checkoutWithPayOs: async (request) => {
    return await apiRequest('/api/orders/checkout-payos', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // 8.6. Tạo link thanh toán PayOS cho Order
  createPayOsPaymentLink: async (request) => {
    return await apiRequest('/api/payments/payos/create-payment-link', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // 8.7. Kiểm tra trạng thái thanh toán PayOS theo OrderId
  getPayOsOrderStatus: async (orderId) => {
    return await apiRequest(`/api/payments/payos/order/${orderId}/status`);
  },

  // 9. Bắt đầu chu trình giặt (Kích hoạt máy chạy -> BUSY, đếm ngược)
  startOrder: async (orderId, { note = 'Kích hoạt chu trình giặt' } = {}) => {
    return await apiRequest(`/api/orders/${orderId}/start`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  // 10. Hoàn tất đơn giặt (Giải phóng máy về AVAILABLE)
  completeOrder: async (orderId, { note = 'Hoàn tất đơn giặt' } = {}) => {
    return await apiRequest(`/api/orders/${orderId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  // 11. Hủy đơn giặt (Giải phóng máy đang được giữ)
  cancelOrder: async (orderId, { reason = 'Khách hủy đơn' } = {}) => {
    return await apiRequest(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // 12. Thành viên xem lịch sử đơn hàng của mình
  getMyOrders: async (status = null, page = 1, pageSize = 20) => {
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    query.append('page', page);
    query.append('pageSize', pageSize);
    return await apiRequest(`/api/orders/me?${query.toString()}`);
  },

  // 13. Khách vãng lai tra cứu đơn hàng qua Số điện thoại
  getGuestOrders: async (phone, status = null, page = 1, pageSize = 20) => {
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    query.append('page', page);
    query.append('pageSize', pageSize);
    return await apiRequest(`/api/orders/guest/${encodeURIComponent(phone)}?${query.toString()}`);
  },

  // 14. Danh sách toàn bộ đơn hàng (Dành cho Quản lý / Staff)
  getOrders: async (filter = {}) => {
    const query = new URLSearchParams();
    if (filter.siteId) query.append('siteId', filter.siteId);
    if (filter.status) query.append('status', filter.status);
    if (filter.customerType) query.append('customerType', filter.customerType);
    if (filter.search) query.append('search', filter.search);
    if (filter.page) query.append('page', filter.page);
    if (filter.pageSize) query.append('pageSize', filter.pageSize);
    return await apiRequest(`/api/orders?${query.toString()}`);
  },

  // 14.1 Lấy toàn bộ đơn hàng không giới hạn trang cho trạm
  getAllOrders: async (filter = {}) => {
    return await ordersApi.getOrders({ pageSize: 100, ...filter });
  },

  // 15. Báo sự cố & Đổi máy tương đồng (Gọi 1 API DUY NHẤT: POST /api/orders/{orderId}/report-issue)
  reportIssue: async (orderId, options = {}) => {
    const {
      issueType = 'MACHINE_STOPPED',
      description = '',
      resolutionNote = '',
      resolutionAction = 'TRANSFER_MACHINE',
      contactPhone = null,
    } = options;

    const chosenIssueType = issueType || 'MACHINE_STOPPED';
    let finalDesc = (description || resolutionNote || 'Máy gặp sự cố tại trạm, chuyển máy tương đồng.').trim();
    if (!finalDesc.includes('Loại lỗi:') && !finalDesc.includes('Loại sự cố:')) {
      finalDesc = `[Loại lỗi: ${chosenIssueType}] ${finalDesc}`;
    }

    return await apiRequest(`/api/orders/${orderId}/report-issue`, {
      method: 'POST',
      body: JSON.stringify({
        issueType: chosenIssueType,
        description: finalDesc,
        contactPhone: contactPhone ? String(contactPhone).trim() : undefined,
        resolutionAction: resolutionAction || 'TRANSFER_MACHINE',
      }),
    });
  },

  // 16. Xử lý sự cố & Đổi máy (Gọi chung 1 API duy nhất POST /api/orders/{orderId}/report-issue)
  resolveIssue: async (orderId, options = {}) => {
    return await ordersApi.reportIssue(orderId, options);
  },

  // 17. Tra cứu danh sách lịch sử báo cáo sự cố của đơn hàng
  getOrderIssues: async (orderId) => {
    return await apiRequest(`/api/orders/${orderId}/issues`);
  },
};
