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

export const walletsApi = {
  // 1. Thành viên xem số dư và thông tin ví
  getMyWallet: async () => {
    return await apiRequest('/api/wallets/me');
  },

  // 2. Thành viên xem lịch sử giao dịch ví (TOPUP, PAYMENT, REFUND)
  getMyTransactions: async ({ type = null, page = 1, pageSize = 20 } = {}) => {
    const query = new URLSearchParams();
    if (type) query.append('type', type);
    query.append('page', page);
    query.append('pageSize', pageSize);
    return await apiRequest(`/api/wallets/me/transactions?${query.toString()}`);
  },

  // 3. Khởi tạo giao dịch nạp tiền vào ví qua cổng PayOS (VietQR)
  topUpPayOs: async ({ amount, description = 'Nap vi LaundroChain', returnUrl = null, cancelUrl = null }) => {
    return await apiRequest('/api/wallets/topup/payos', {
      method: 'POST',
      body: JSON.stringify({ amount, description, returnUrl, cancelUrl }),
    });
  },

  // 4. Kiểm tra trạng thái nạp tiền PayOS và tự động cộng số dư (SUCCESS)
  checkTopUpStatus: async (transactionId) => {
    return await apiRequest(`/api/wallets/topup/${transactionId}/status`);
  },

  // 5. Thanh toán đơn hàng bằng ví
  payOrderWithWallet: async (orderId) => {
    return await apiRequest(`/api/wallets/pay-order/${orderId}`, {
      method: 'POST',
    });
  },

  // 6. Admin / Quản lý xem danh sách toàn bộ ví
  adminGetWallets: async ({ search = null, status = null, page = 1, pageSize = 20 } = {}) => {
    const query = new URLSearchParams();
    if (search) query.append('search', search);
    if (status) query.append('status', status);
    query.append('page', page);
    query.append('pageSize', pageSize);
    return await apiRequest(`/api/admin/wallets?${query.toString()}`);
  },

  // 7. Admin / Quản lý xem chi tiết 1 ví theo WalletId
  adminGetWalletById: async (walletId) => {
    return await apiRequest(`/api/admin/wallets/${walletId}`);
  },

  // 8. Admin / Quản lý xem lịch sử giao dịch của 1 ví
  adminGetWalletTransactions: async (walletId, { type = null, page = 1, pageSize = 20 } = {}) => {
    const query = new URLSearchParams();
    if (type) query.append('type', type);
    query.append('page', page);
    query.append('pageSize', pageSize);
    return await apiRequest(`/api/admin/wallets/${walletId}/transactions?${query.toString()}`);
  },

  // 9. Nạp tiền tại quầy linh hoạt bằng SĐT, Mã thành viên, Email, hoặc ID
  adminTopUp: async (payload) => {
    return await apiRequest('/api/admin/wallets/topup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // 10. Nạp tiền theo Email khách hàng (tự động tạo ví nếu chưa có)
  adminTopUpByEmail: async ({ email, amount, paymentMethod = 'CASH', note = 'Nạp tiền tại quầy' }) => {
    return await apiRequest('/api/admin/wallets/topup/email', {
      method: 'POST',
      body: JSON.stringify({ email, amount, paymentMethod, note }),
    });
  },
};

