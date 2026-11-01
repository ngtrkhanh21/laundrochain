import { apiRequest } from './client';

export const walletsApi = {
  // 1. Thành viên xem số dư và thông tin ví
  getMyWallet: async () => {
    return await apiRequest('/api/wallets/me');
  },

  // 2. Thành viên xem lịch sử giao dịch ví (TOPUP, PAYMENT, REFUND)
  getMyTransactions: async ({ type = null, page = 1, pageSize = 25 } = {}) => {
    const query = new URLSearchParams();
    if (type && type !== 'ALL') query.append('type', type);
    query.append('page', page);
    query.append('pageSize', pageSize);
    return await apiRequest(`/api/wallets/me/transactions?${query.toString()}`);
  },

  // 3. Khởi tạo giao dịch nạp tiền vào ví qua cổng PayOS (VietQR)
  topUpPayOs: async ({ amount, description = 'Nap vi LC', returnUrl = null, cancelUrl = null }) => {
    return await apiRequest('/api/wallets/topup/payos', {
      method: 'POST',
      body: JSON.stringify({ amount, description: String(description).slice(0, 25), returnUrl, cancelUrl }),
    });
  },

  // 4. Kiểm tra trạng thái nạp tiền PayOS và tự động cộng số dư (SUCCESS)
  checkTopUpStatus: async (transactionId) => {
    return await apiRequest(`/api/wallets/topup/${transactionId}/status`);
  },

  // 4.1. Xác nhận nạp tiền thử nghiệm trong môi trường Test/Demo (Cộng số dư vào DB)
  simulateTopUpSuccess: async (transactionId) => {
    return await apiRequest(`/api/wallets/topup/${transactionId}/simulate-success`, {
      method: 'POST',
    });
  },

  // 5. Thanh toán đơn hàng bằng ví
  payOrderWithWallet: async (orderId) => {
    return await apiRequest(`/api/wallets/pay-order/${orderId}`, {
      method: 'POST',
    });
  },
};
