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

/**
 * Helper tìm quy tắc khuyến mãi / chiết khấu (Promotion Rule) khớp với hạng thành viên
 */
export function matchTierDiscount(tierCode, rules = []) {
  if (!tierCode) return { discount: 0, rule: null };
  const codeUpper = String(tierCode).trim().toUpperCase();
  const ruleList = Array.isArray(rules) ? rules : (rules?.value || rules?.items || []);

  const candidates = ruleList.filter((r) => {
    if (!r || r.isActive === false) return false;
    const isTierType =
      r.ruleType === 'TIER_RATE' ||
      r.exclusiveGroup === 'TIER_BENEFIT' ||
      (typeof r.code === 'string' && r.code.toUpperCase().startsWith('TIER_'));

    let matchesTier = false;
    if (r.conditions) {
      try {
        const cond = typeof r.conditions === 'string' ? JSON.parse(r.conditions) : r.conditions;
        const targetTiers = cond?.tiers || cond?.tier;
        if (Array.isArray(targetTiers)) {
          matchesTier = targetTiers.some((t) => String(t).trim().toUpperCase() === codeUpper);
        } else if (typeof targetTiers === 'string') {
          matchesTier = targetTiers.trim().toUpperCase() === codeUpper;
        }
      } catch { }
    }

    if (!matchesTier && typeof r.code === 'string') {
      const codeOnly = r.code.toUpperCase();
      if (codeOnly.includes(`_${codeUpper}_`) || codeOnly.endsWith(`_${codeUpper}`) || codeOnly.includes(codeUpper)) {
        matchesTier = true;
      }
    }

    return (isTierType || matchesTier) && matchesTier;
  });

  if (candidates.length === 0) {
    return { discount: 0, rule: null };
  }

  // Ưu tiên quy tắc có mức giảm % cao nhất
  candidates.sort((a, b) => {
    const valA = a.actionType === 'PERCENT_OFF' ? (Number(a.actionValue) || 0) : 0;
    const valB = b.actionType === 'PERCENT_OFF' ? (Number(b.actionValue) || 0) : 0;
    return valB - valA;
  });

  const best = candidates[0];
  const discount = best.actionType === 'PERCENT_OFF' ? (Number(best.actionValue) || 0) : 0;
  return { discount, rule: best };
}

export const memberTiersApi = {
  /**
   * Lấy danh sách toàn bộ các hạng hội viên từ hệ thống,
   * tự động gắn kèm chiết khấu thực tế từ Promotion Rule (TIER_RATE) đang có hiệu lực
   */
  getTiers: async () => {
    try {
      const [tiersRes, rulesRes] = await Promise.allSettled([
        apiRequest('/api/member-tiers'),
        apiRequest('/api/pricing-rules?isActive=true'),
      ]);

      const tiers = tiersRes.status === 'fulfilled' && Array.isArray(tiersRes.value) ? tiersRes.value : [];
      const rules =
        rulesRes.status === 'fulfilled'
          ? (Array.isArray(rulesRes.value) ? rulesRes.value : (rulesRes.value?.value || rulesRes.value?.items || []))
          : [];

      return tiers.map((t) => {
        const { discount, rule } = matchTierDiscount(t.code, rules);
        return {
          ...t,
          discount: discount,
          promotionRule: rule
            ? {
                ruleId: rule.ruleId,
                code: rule.code,
                name: rule.name,
                actionValue: rule.actionValue,
                maxDiscount: rule.maxDiscount,
              }
            : null,
          bonus:
            discount > 0
              ? `Giảm ${discount}% đơn giặt`
              : t.rank === 1
                ? 'Tích 1% điểm'
                : 'Đặc quyền thành viên',
        };
      });
    } catch {
      // Fallback an toàn nếu có lỗi
      const tiers = await apiRequest('/api/member-tiers').catch(() => []);
      return (tiers || []).map((t) => ({
        ...t,
        discount: 0,
        bonus: t.rank === 1 ? 'Tích 1% điểm' : 'Đặc quyền thành viên',
      }));
    }
  },

  /**
   * Xem tiến trình thăng hạng và chi tiêu tích lũy theo đơn giá gốc của chính hội viên
   */
  getMyProgress: async () => {
    return await apiRequest('/api/member-tiers/me/progress');
  },

  /**
   * Lấy lịch sử các lần thăng / đổi hạng của hội viên
   */
  getMyHistory: async () => {
    return await apiRequest('/api/member-tiers/me/history');
  },

  /**
   * Tra cứu chi tiết một hạng thành viên theo TierId
   */
  getTierById: async (tierId) => {
    return await apiRequest(`/api/member-tiers/${tierId}`);
  },

  /**
   * (Admin / Staff) Tra cứu tiến độ nâng hạng của một hội viên bất kỳ
   */
  getMemberProgress: async (memberId) => {
    return await apiRequest(`/api/member-tiers/members/${memberId}/progress`);
  },

  /**
   * (Admin / Staff) Gán thủ công hạng thành viên
   */
  assignTier: async (memberId, tierId, reason = '') => {
    return await apiRequest(`/api/member-tiers/members/${memberId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ tierId, reason }),
    });
  },
};
