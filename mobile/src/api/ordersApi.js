import { apiRequest } from './client';

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

  // 3.1. Lấy danh sách Voucher khả dụng
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

  // 8. Thanh toán đơn hàng trực tiếp bằng số dư Ví thành viên (WALLET)
  payOrderWithWallet: async (orderId, request = {}) => {
    return await apiRequest(`/api/orders/${orderId}/pay/wallet`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // 8.1. [1 Bước] Tạo đơn giặt từ báo giá (QuoteId), giữ máy và trừ tiền ví thành viên xác nhận ngay
  checkoutWithWallet: async (request) => {
    return await apiRequest('/api/orders/checkout/wallet', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // 8.2. Tạo mã QR thanh toán PayOS VietQR cho đơn hàng
  createPayOsQrForOrder: async (orderId, options = {}) => {
    return await apiRequest(`/api/orders/${orderId}/payos-qr`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  // 8.3. Kiểm tra trạng thái thanh toán PayOS của đơn và tự động xác nhận đơn (CONFIRMED)
  getOrderPaymentStatus: async (orderId) => {
    return await apiRequest(`/api/orders/${orderId}/payment-status`);
  },

  // 8.4. [1 Bước] Checkout trực tiếp với PayOS (Tạo đơn + sinh VietQR tức thì)
  checkoutWithPayOs: async (request) => {
    return await apiRequest('/api/orders/checkout-payos', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // 9. Bắt đầu chu trình giặt
  startOrder: async (orderId, { note = 'Kích hoạt chu trình giặt từ ứng dụng' } = {}) => {
    return await apiRequest(`/api/orders/${orderId}/start`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  // 10. Hoàn tất đơn giặt
  completeOrder: async (orderId, { note = 'Hoàn tất đơn giặt' } = {}) => {
    return await apiRequest(`/api/orders/${orderId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  // 11. Hủy đơn giặt
  cancelOrder: async (orderId, { reason = 'Khách hủy đơn từ ứng dụng' } = {}) => {
    return await apiRequest(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // 12. Thành viên xem lịch sử đơn hàng của mình
  getMyOrders: async (status = null, page = 1, pageSize = 20) => {
    const query = new URLSearchParams();
    if (status && status !== 'ALL') query.append('status', status);
    query.append('page', page);
    query.append('pageSize', pageSize);
    return await apiRequest(`/api/orders/me?${query.toString()}`);
  },

  // 13. Khách vãng lai tra cứu đơn hàng qua Số điện thoại
  getGuestOrders: async (phone, status = null, page = 1, pageSize = 20) => {
    const query = new URLSearchParams();
    if (status && status !== 'ALL') query.append('status', status);
    query.append('page', page);
    query.append('pageSize', pageSize);
    return await apiRequest(`/api/orders/guest/${encodeURIComponent(phone)}?${query.toString()}`);
  },

  // 14. Báo sự cố đơn hàng
  reportIssue: async (orderId, { issueType = 'MACHINE_STOPPED', description = '', contactPhone = null } = {}) => {
    return await apiRequest(`/api/orders/${orderId}/report-issue`, {
      method: 'POST',
      body: JSON.stringify({ issueType, description, contactPhone }),
    });
  },
};

