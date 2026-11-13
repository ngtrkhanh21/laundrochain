import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from '../constants/config';

/**
 * API helper cho React Native — tự động đính kèm Authorization header nếu có token trong AsyncStorage
 * Hỗ trợ bóc tách chi tiết thông báo lỗi từ ASP.NET Core ProblemDetails
 */
export async function apiRequest(endpoint, options = {}) {
  let token = null;
  try {
    token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch {
    // ignore
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr) {
    throw new Error(`Không thể kết nối đến máy chủ (${url}). Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.`);
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
      if (data.message) {
        errorMessage = data.message;
      } else if (data.detail) {
        errorMessage = data.detail;
      } else if (data.errors && typeof data.errors === 'object') {
        const firstKey = Object.keys(data.errors)[0];
        const errList = data.errors[firstKey];
        errorMessage = Array.isArray(errList) ? errList[0] : String(errList);
      } else if (data.title) {
        errorMessage = data.title;
      } else if (typeof data === 'string') {
        errorMessage = data;
      }
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return data;
}

