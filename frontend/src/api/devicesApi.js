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

export const devicesApi = {
  // Lấy danh sách thiết bị IoT (Kiosk, Controller, ...)
  getDevices: async ({ siteId = null, deviceType = null, status = null, search = null } = {}) => {
    const params = new URLSearchParams();
    if (siteId) params.append('siteId', siteId);
    if (deviceType) params.append('deviceType', deviceType);
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/api/devices${qs}`);
  },

  // Xem nhật ký gần nhất của thiết bị
  getDeviceLogs: async (id, limit = 50) => {
    return await apiRequest(`/api/devices/${id}/logs?limit=${limit}`);
  },

  // [Kỹ thuật viên] Xem thông tin chẩn đoán thiết bị (PriceBundle hiện hành, lịch sử đồng bộ, errorHistory)
  getDeviceDiagnostics: async (id) => {
    return await apiRequest(`/api/devices/${id}/diagnostics`);
  },

  // [Kỹ thuật viên] Thay thế thiết bị & Chuyển liên kết trạm (cấp phát thiết bị mới, thu hồi khóa cũ, nhận rawApiKey)
  reprovisionReplacement: async (id, { newDeviceCode, newIpAddress, newMacAddress, newFirmwareVersion, maintenanceOrderId, reason }) => {
    return await apiRequest(`/api/devices/${id}/reprovision-replacement`, {
      method: 'POST',
      body: JSON.stringify({
        newDeviceCode: newDeviceCode?.trim(),
        newIpAddress: newIpAddress?.trim() || null,
        newMacAddress: newMacAddress?.trim() || null,
        newFirmwareVersion: newFirmwareVersion?.trim() || null,
        maintenanceOrderId: maintenanceOrderId || null,
        reason: reason?.trim() || null,
      }),
    });
  },

  // Xoay khóa API cho thiết bị
  rotateKey: async (id) => {
    return await apiRequest(`/api/devices/${id}/keys/rotate`, {
      method: 'POST',
    });
  },
};
