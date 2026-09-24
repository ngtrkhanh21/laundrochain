// =============================================================================
// LAUNDROCHAIN - SHARED PRICING EVALUATOR (PURE FUNCTION)
// Sprint 1 - evaluatePrice()
//
// NGUYÊN TẮC BẮT BUỘC:
//   - Hàm này là PURE FUNCTION.
//   - TUYỆT ĐỐI KHÔNG gọi Database.
//   - TUYỆT ĐỐI KHÔNG gọi Date.now() hay new Date() bên trong.
//   - TUYỆT ĐỐI KHÔNG đọc biến môi trường (process.env).
//   - Mọi input phải đến từ tham số bundle và context.
// =============================================================================

import type {
  PriceBundle,
  OrderContext,
  QuoteResult,
  AppliedRule,
} from './types';

/**
 * evaluatePrice: Tính giá đơn giặt dựa trên bundle cấu hình và context đơn hàng.
 *
 * @param bundle - PriceBundle đã được ký số và có hiệu lực
 * @param context - OrderContext chứa toàn bộ thông tin đơn hàng
 * @returns QuoteResult - Kết quả tính giá có audit trail
 *
 * @pure - Hàm thuần túy: cùng input → cùng output, không side effects
 */
export function evaluatePrice(bundle: PriceBundle, context: OrderContext): QuoteResult {
  // 1. Tính giá gốc = giá/kg * số kg
  const pricePerKg = bundle.basePricePerKg[context.serviceType] ?? 0;
  const basePrice = Math.round(pricePerKg * context.weightKg);

  // 2. Tìm tất cả rules áp dụng được cho context này
  const applicableRules = bundle.rules.filter((rule) => {
    const tierMatch = rule.applicableTiers.includes(context.memberTier);
    const serviceMatch = rule.applicableServices.includes(context.serviceType);
    return tierMatch && serviceMatch;
  });

  // 3. Tính tổng discount (cộng dồn các rule, không vượt quá basePrice)
  const appliedRules: AppliedRule[] = [];
  let totalDiscount = 0;

  for (const rule of applicableRules) {
    const discountAmount = Math.round(basePrice * (rule.discountPercent / 100));
    totalDiscount += discountAmount;

    appliedRules.push({
      ruleId: rule.ruleId,
      ruleName: rule.ruleName,
      discountAmount,
      description: rule.description,
    });
  }

  // 4. Tính giá sau khi giảm
  let finalPrice = basePrice - totalDiscount;

  // 5. Áp dụng priceFloor: giá cuối không được thấp hơn sàn tối thiểu của bất kỳ rule nào
  const maxFloor = applicableRules.reduce(
    (floor, rule) => Math.max(floor, rule.priceFloor),
    0,
  );

  if (finalPrice < maxFloor) {
    // Ghi nhận việc chặn bởi priceFloor
    const floorAdjustment = maxFloor - finalPrice;
    finalPrice = maxFloor;

    // Ghi audit entry cho việc chặn priceFloor
    if (floorAdjustment > 0) {
      appliedRules.push({
        ruleId: 'PRICE_FLOOR_GUARD',
        ruleName: 'Chặn giá sàn',
        discountAmount: -floorAdjustment, // Âm = tăng giá lên
        description: `Giá sau giảm thấp hơn sàn ${maxFloor.toLocaleString('vi-VN')}đ, đã điều chỉnh lên.`,
      });
    }
  }

  // 6. Đảm bảo giá không âm
  finalPrice = Math.max(0, finalPrice);

  return {
    basePrice,
    finalPrice,
    appliedRules,
    bundleVersion: bundle.bundleVersion,
    currency: 'VND',
  };
}

/**
 * isBundleActive: Kiểm tra bundle có đang trong thời gian hiệu lực không.
 * Nhận timestamp từ ngoài để giữ pure function property.
 *
 * @pure
 */
export function isBundleActive(bundle: PriceBundle, atTimestamp: Date): boolean {
  if (atTimestamp < bundle.effectiveFrom) return false;
  if (bundle.effectiveTo !== null && atTimestamp > bundle.effectiveTo) return false;
  return true;
}

/**
 * DEFAULT_BUNDLE: Bundle mặc định cho Sprint 1 demo/testing.
 * Trong production sẽ được load từ DB và ký số.
 */
export const DEFAULT_BUNDLE: PriceBundle = {
  bundleId: 'bundle-sprint1-default',
  bundleVersion: '1.0.0',
  effectiveFrom: new Date('2026-01-01T00:00:00Z'),
  effectiveTo: null,
  basePricePerKg: {
    WASH_DRY: 25000,
    WASH_ONLY: 15000,
    DRY_ONLY: 15000,
    IRON: 10000,
    EXPRESS: 40000,
  },
  rules: [
    {
      ruleId: 'rule-silver-discount',
      ruleName: 'Giảm giá Silver 5%',
      description: 'Thành viên Silver được giảm 5% cho tất cả dịch vụ.',
      applicableTiers: ['SILVER'],
      applicableServices: ['WASH_DRY', 'WASH_ONLY', 'DRY_ONLY', 'IRON', 'EXPRESS'],
      discountPercent: 5,
      priceFloor: 10000,
    },
    {
      ruleId: 'rule-gold-discount',
      ruleName: 'Giảm giá Gold 10%',
      description: 'Thành viên Gold được giảm 10% cho tất cả dịch vụ.',
      applicableTiers: ['GOLD'],
      applicableServices: ['WASH_DRY', 'WASH_ONLY', 'DRY_ONLY', 'IRON', 'EXPRESS'],
      discountPercent: 10,
      priceFloor: 10000,
    },
    {
      ruleId: 'rule-platinum-discount',
      ruleName: 'Giảm giá Platinum 15%',
      description: 'Thành viên Platinum được giảm 15% cho tất cả dịch vụ.',
      applicableTiers: ['PLATINUM'],
      applicableServices: ['WASH_DRY', 'WASH_ONLY', 'DRY_ONLY', 'IRON', 'EXPRESS'],
      discountPercent: 15,
      priceFloor: 10000,
    },
  ],
};
