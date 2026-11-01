// =============================================================================
// LAUNDROCHAIN - SHARED PRICING EVALUATOR (PURE FUNCTION)
// Pure Evaluator: No DB, No Date.now(), No Environment Access
// =============================================================================

import type {
  PriceBundle,
  OrderContext,
  QuoteResult,
  AppliedRule,
  TimeSlot,
} from './types';

/**
 * Suy diễn khung giờ (TimeSlot) từ giờ trong ngày theo cách thuần túy.
 * Giờ cao điểm (PEAK): 17:00 - 21:00 (17, 18, 19, 20)
 * Giờ thấp điểm (OFF_PEAK): 22:00 - 06:00
 * Giờ bình thường (NORMAL): 07:00 - 16:00
 *
 * @pure
 */
export function resolveTimeSlot(timestamp: Date): TimeSlot {
  const hour = timestamp.getUTCHours(); // Dùng UTC để đồng nhất giữa các môi trường
  if (hour >= 10 && hour <= 14) {
    // 17h - 21h giờ VN (UTC+7) tương đương 10h - 14h UTC
    return 'PEAK';
  } else if (hour >= 15 || hour <= 23 && hour >= 22 || hour <= 0) {
    return 'OFF_PEAK';
  }
  return 'NORMAL';
}

/**
 * evaluatePrice: Hàm tính giá thuần túy (Pure Function)
 * Cùng tham số bundle & context luôn trả về kết quả QuoteResult đồng nhất 100%.
 *
 * @param bundle - Gói giá PriceBundle
 * @param context - Thông tin đơn hàng OrderContext
 * @returns QuoteResult
 *
 * @pure
 */
export function evaluatePrice(bundle: PriceBundle, context: OrderContext): QuoteResult {
  // 1. Tính giá cơ bản theo dịch vụ và khối lượng
  const pricePerKg = bundle.basePricePerKg[context.serviceType] ?? 0;
  const basePrice = Math.round(pricePerKg * Math.max(0, context.weightKg));

  // 2. Xác định khung giờ của đơn giặt nếu context chưa chỉ định rõ
  const effectiveTimeSlot: TimeSlot = context.timeSlot ?? resolveTimeSlot(context.requestTimestamp);

  // 3. Lọc và sắp xếp các rule phù hợp
  // Quy tắc ưu tiên: số nhỏ chạy trước (mặc định 100)
  const sortedRules = [...bundle.rules].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

  const appliedRules: AppliedRule[] = [];
  let runningPrice = basePrice;
  let maxApplicableFloor = 0;

  for (const rule of sortedRules) {
    // Kiểm tra tính phù hợp của Service
    const matchesService =
      rule.applicableServices.length === 0 ||
      rule.applicableServices.includes(context.serviceType);
    if (!matchesService) continue;

    // Kiểm tra tính phù hợp của MemberTier
    const matchesTier =
      rule.applicableTiers.length === 0 ||
      rule.applicableTiers.includes(context.memberTier);
    if (!matchesTier) continue;

    // Kiểm tra điều kiện theo loại rule
    let isTriggered = false;

    switch (rule.ruleType) {
      case 'TIER_DISCOUNT': {
        // Áp dụng nếu tier khớp và có cấu hình giảm
        isTriggered = matchesTier;
        break;
      }

      case 'VOUCHER': {
        // Chỉ kích hoạt nếu có mã voucher và khớp chính xác (không phân biệt hoa thường)
        if (
          context.voucherCode &&
          rule.voucherCode &&
          context.voucherCode.trim().toUpperCase() === rule.voucherCode.trim().toUpperCase()
        ) {
          isTriggered = true;
        }
        break;
      }

      case 'TIME_PEAK': {
        // Kích hoạt nếu khung giờ khớp
        if (rule.timeSlotCondition && rule.timeSlotCondition === effectiveTimeSlot) {
          isTriggered = true;
        }
        break;
      }

      case 'WEIGHT_VOLUME': {
        // Kích hoạt nếu số kg đạt ngưỡng tối thiểu
        if (rule.minWeightKg !== undefined && context.weightKg >= rule.minWeightKg) {
          isTriggered = true;
        }
        break;
      }
    }

    if (!isTriggered) continue;

    // Ghi nhận giá sàn cao nhất trong các rule hợp lệ
    if (rule.priceFloor > maxApplicableFloor) {
      maxApplicableFloor = rule.priceFloor;
    }

    // Tính toán số tiền điều chỉnh (discountAmount)
    let adjustment = 0;

    // A. Giảm theo phần trăm (nếu dương là giảm, nếu âm là phụ thu cao điểm)
    if (rule.discountPercent !== undefined && rule.discountPercent !== 0) {
      // Tính phần trăm trên giá gốc basePrice
      adjustment += Math.round(basePrice * (rule.discountPercent / 100));
    }

    // B. Giảm theo số tiền cố định (VND)
    if (rule.discountAmountFixed !== undefined && rule.discountAmountFixed > 0) {
      adjustment += Math.round(rule.discountAmountFixed);
    }

    // Cập nhật giá tạm thời
    runningPrice -= adjustment;

    appliedRules.push({
      ruleId: rule.ruleId,
      ruleName: rule.ruleName,
      ruleType: rule.ruleType,
      discountAmount: adjustment,
      description: rule.description,
    });
  }

  // 4. Cơ chế bảo vệ giá sàn tối thiểu (PRICE_FLOOR_GUARD)
  let finalPrice = runningPrice;
  if (maxApplicableFloor > 0 && finalPrice < maxApplicableFloor) {
    const floorCorrection = maxApplicableFloor - finalPrice;
    finalPrice = maxApplicableFloor;

    appliedRules.push({
      ruleId: 'PRICE_FLOOR_GUARD',
      ruleName: 'Chặn bảo vệ giá sàn',
      ruleType: 'SYSTEM_GUARD',
      discountAmount: -floorCorrection, // Số âm thể hiện bù giá lên mức sàn an toàn
      description: `Giá sau giảm (${runningPrice.toLocaleString('vi-VN')}đ) thấp hơn mức giá sàn cho phép (${maxApplicableFloor.toLocaleString('vi-VN')}đ). Hệ thống tự động nâng lên mức sàn.`,
    });
  }

  // 5. Đảm bảo giá không bao giờ âm
  finalPrice = Math.max(0, finalPrice);
  const totalAdjustment = basePrice - finalPrice;

  return {
    basePrice,
    finalPrice,
    totalAdjustment,
    appliedRules,
    bundleVersion: bundle.bundleVersion,
    integrityHash: bundle.integrityHash,
    currency: 'VND',
  };
}

/**
 * isBundleActive: Kiểm tra bundle có đang trong thời gian hiệu lực không.
 *
 * @pure
 */
export function isBundleActive(bundle: PriceBundle, atTimestamp: Date): boolean {
  if (atTimestamp < bundle.effectiveFrom) return false;
  if (bundle.effectiveTo !== null && atTimestamp > bundle.effectiveTo) return false;
  return true;
}

/**
 * Simple Pure FNV-1a & SHA256-like 64-char Hash Generator cho trình duyệt và Node.js
 * Giúp tính hash kiểm tra tính toàn vẹn 100% deterministic không phụ thuộc môi trường.
 *
 * @pure
 */
export function computeBundleIntegrityHash(bundle: {
  bundleVersion: string;
  basePricePerKg: Record<string, number>;
  rules: any[];
  effectiveFrom: Date;
}): string {
  // Sắp xếp các khóa để JSON luôn chuẩn hóa (canonical string)
  const canonicalContent = JSON.stringify({
    v: bundle.bundleVersion,
    prices: Object.keys(bundle.basePricePerKg)
      .sort()
      .reduce((acc, k) => {
        acc[k] = bundle.basePricePerKg[k];
        return acc;
      }, {} as Record<string, number>),
    rules: bundle.rules.map((r) => ({
      id: r.ruleId,
      type: r.ruleType,
      pct: r.discountPercent ?? 0,
      fixed: r.discountAmountFixed ?? 0,
      floor: r.priceFloor,
      voucher: r.voucherCode ?? '',
    })),
    eff: bundle.effectiveFrom.toISOString(),
  });

  // Pure 256-bit hash algorithm (FNV-1a 64-bit folded to 256-bit hex)
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x243f6a88;
  let h4 = 0x85a308d3;

  for (let i = 0; i < canonicalContent.length; i++) {
    const ch = canonicalContent.charCodeAt(i);
    h1 = (Math.imul(h1 ^ ch, 16777619) ^ (h2 >>> 5)) >>> 0;
    h2 = (Math.imul(h2 ^ ch, 2166136261) ^ (h3 >>> 7)) >>> 0;
    h3 = (Math.imul(h3 ^ ch, 16777619) ^ (h4 >>> 3)) >>> 0;
    h4 = (Math.imul(h4 ^ ch, 2166136261) ^ (h1 >>> 11)) >>> 0;
  }

  const p1 = h1.toString(16).padStart(8, '0');
  const p2 = h2.toString(16).padStart(8, '0');
  const p3 = h3.toString(16).padStart(8, '0');
  const p4 = h4.toString(16).padStart(8, '0');

  // Lặp lại với salt để đạt chuỗi 64 ký tự chuẩn sha256 format
  const fullHex = `sha256_${p1}${p2}${p3}${p4}${(h1 ^ h3).toString(16).padStart(8, '0')}${(h2 ^ h4).toString(16).padStart(8, '0')}${p1}`;
  return fullHex.substring(0, 64);
}

/**
 * DEFAULT_BUNDLE: Bundle mẫu chuẩn tích hợp các luật DMN phong phú
 */
export const DEFAULT_BUNDLE: PriceBundle = {
  bundleId: 'bnd-sprint1-core',
  bundleVersion: '1.2.0',
  name: 'Bảng giá chuẩn chuỗi LaundroChain 2026',
  description: 'Bao gồm chiết khấu cấp bậc thành viên, phụ thu giờ cao điểm và khuyến mãi xếp chồng.',
  effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
  effectiveTo: null,
  integrityHash: 'sha256_8a7d3f29b01c4e95123456789abcdef0123456789abcdef0123456789abcdef0',
  basePricePerKg: {
    WASH_DRY: 25000,
    WASH_ONLY: 15000,
    DRY_ONLY: 15000,
    IRON: 12000,
    EXPRESS: 40000,
  },
  rules: [
    // 1. Phụ thu giờ cao điểm (Peak Hour Surcharge +10%)
    {
      ruleId: 'RULE-PEAK-HOUR',
      ruleName: 'Phụ thu khung giờ cao điểm (17h - 21h)',
      description: 'Phụ thu thêm 10% trong khung giờ cao điểm để điều tiết công suất máy.',
      ruleType: 'TIME_PEAK',
      applicableTiers: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'],
      applicableServices: ['WASH_DRY', 'WASH_ONLY', 'DRY_ONLY', 'IRON', 'EXPRESS'],
      timeSlotCondition: 'PEAK',
      discountPercent: -10, // Âm nghĩa là phụ thu tăng thêm 10%
      priceFloor: 15000,
      priority: 10,
    },
    // 2. Chiết khấu hạng Silver (-5%)
    {
      ruleId: 'RULE-TIER-SILVER',
      ruleName: 'Đặc quyền thành viên Silver (-5%)',
      description: 'Giảm 5% cho thành viên hạng Silver trên tất cả các dịch vụ.',
      ruleType: 'TIER_DISCOUNT',
      applicableTiers: ['SILVER'],
      applicableServices: ['WASH_DRY', 'WASH_ONLY', 'DRY_ONLY', 'IRON', 'EXPRESS'],
      discountPercent: 5,
      priceFloor: 12000,
      priority: 20,
    },
    // 3. Chiết khấu hạng Gold (-10%)
    {
      ruleId: 'RULE-TIER-GOLD',
      ruleName: 'Đặc quyền thành viên Gold (-10%)',
      description: 'Giảm 10% cho thành viên hạng Gold trên tất cả các dịch vụ.',
      ruleType: 'TIER_DISCOUNT',
      applicableTiers: ['GOLD'],
      applicableServices: ['WASH_DRY', 'WASH_ONLY', 'DRY_ONLY', 'IRON', 'EXPRESS'],
      discountPercent: 10,
      priceFloor: 12000,
      priority: 20,
    },
    // 4. Chiết khấu hạng Platinum (-15%)
    {
      ruleId: 'RULE-TIER-PLATINUM',
      ruleName: 'Đặc quyền thành viên Platinum (-15%)',
      description: 'Giảm 15% cho thành viên hạng Platinum trên tất cả các dịch vụ.',
      ruleType: 'TIER_DISCOUNT',
      applicableTiers: ['PLATINUM'],
      applicableServices: ['WASH_DRY', 'WASH_ONLY', 'DRY_ONLY', 'IRON', 'EXPRESS'],
      discountPercent: 15,
      priceFloor: 10000,
      priority: 20,
    },
    // 5. Khuyến mãi khối lượng lớn (>= 7kg giảm thêm 10.000đ)
    {
      ruleId: 'RULE-BULK-7KG',
      ruleName: 'Ưu đãi giặt nhiều (>= 7kg)',
      description: 'Giảm ngay 10.000đ cho đơn giặt từ 7kg trở lên.',
      ruleType: 'WEIGHT_VOLUME',
      applicableTiers: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'],
      applicableServices: ['WASH_DRY', 'WASH_ONLY', 'DRY_ONLY'],
      minWeightKg: 7,
      discountAmountFixed: 10000,
      priceFloor: 15000,
      priority: 30,
    },
    // 6. Voucher ưu đãi sinh viên / tân thủ: GIATXANH (-20%)
    {
      ruleId: 'RULE-VOUCHER-GIATXANH',
      ruleName: 'Voucher GIATXANH (-20%)',
      description: 'Giảm 20% khi nhập mã voucher GIATXANH.',
      ruleType: 'VOUCHER',
      applicableTiers: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'],
      applicableServices: ['WASH_DRY', 'WASH_ONLY', 'DRY_ONLY', 'IRON', 'EXPRESS'],
      voucherCode: 'GIATXANH',
      discountPercent: 20,
      priceFloor: 15000,
      priority: 40,
    },
    // 7. Voucher xả kho mùa hè: MEGA50 (-50%) - có thể kích hoạt giá sàn nếu giặt ít
    {
      ruleId: 'RULE-VOUCHER-MEGA50',
      ruleName: 'Voucher tri ân MEGA50 (-50%)',
      description: 'Giảm 50% tổng đơn hàng (bảo vệ bởi giá sàn 20.000đ).',
      ruleType: 'VOUCHER',
      applicableTiers: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'],
      applicableServices: ['WASH_DRY', 'WASH_ONLY', 'DRY_ONLY', 'IRON', 'EXPRESS'],
      voucherCode: 'MEGA50',
      discountPercent: 50,
      priceFloor: 20000,
      priority: 40,
    },
  ],
};

// Cập nhật hash tính thực tế cho DEFAULT_BUNDLE
DEFAULT_BUNDLE.integrityHash = computeBundleIntegrityHash(DEFAULT_BUNDLE);
