import {
  evaluatePrice,
  DEFAULT_BUNDLE,
  computeBundleIntegrityHash,
  analyzePriceBundle,
} from '../shared/pricing-engine';
import {
  OrderContext,
  PriceBundle,
} from '../shared/pricing-engine/types';

describe('Pricing Engine - Differential Testing (Kiểm thử vi sai)', () => {
  let bundle: PriceBundle;

  beforeEach(() => {
    // Clone DEFAULT_BUNDLE để các test độc lập
    bundle = JSON.parse(JSON.stringify(DEFAULT_BUNDLE));
    bundle.effectiveFrom = new Date(DEFAULT_BUNDLE.effectiveFrom);
    bundle.integrityHash = computeBundleIntegrityHash(bundle);
  });

  // =========================================================================
  // KỊCH BẢN 1: Khách vãng lai / Bronze (Giá cơ sở không giảm)
  // =========================================================================
  it('Kịch bản 1: Khách vãng lai (BRONZE) giặt tiêu chuẩn 4kg - không giảm giá', () => {
    const context: OrderContext = {
      serviceType: 'WASH_DRY', // 25.000đ/kg
      memberTier: 'BRONZE',
      weightKg: 4,
      requestTimestamp: new Date('2026-03-01T08:00:00Z'),
      timeSlot: 'NORMAL',
    };

    const quote = evaluatePrice(bundle, context);

    expect(quote.basePrice).toBe(100000); // 25.000 * 4 = 100.000
    expect(quote.finalPrice).toBe(100000);
    expect(quote.totalAdjustment).toBe(0);
    expect(quote.appliedRules.length).toBe(0);
    expect(quote.currency).toBe('VND');
  });

  // =========================================================================
  // KỊCH BẢN 2: Thành viên Silver (Giảm 5%)
  // =========================================================================
  it('Kịch bản 2: Thành viên Silver giặt 4kg - giảm chính xác 5%', () => {
    const context: OrderContext = {
      serviceType: 'WASH_DRY',
      memberTier: 'SILVER',
      weightKg: 4,
      requestTimestamp: new Date('2026-03-01T08:00:00Z'),
      timeSlot: 'NORMAL',
    };

    const quote = evaluatePrice(bundle, context);

    expect(quote.basePrice).toBe(100000);
    expect(quote.finalPrice).toBe(95000); // 100.000 - 5.000
    expect(quote.totalAdjustment).toBe(5000);
    expect(quote.appliedRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'RULE-TIER-SILVER',
          discountAmount: 5000,
        }),
      ]),
    );
  });

  // =========================================================================
  // KỊCH BẢN 3: Thành viên Gold (Giảm 10%)
  // =========================================================================
  it('Kịch bản 3: Thành viên Gold giặt 4kg - giảm chính xác 10%', () => {
    const context: OrderContext = {
      serviceType: 'WASH_DRY',
      memberTier: 'GOLD',
      weightKg: 4,
      requestTimestamp: new Date('2026-03-01T08:00:00Z'),
      timeSlot: 'NORMAL',
    };

    const quote = evaluatePrice(bundle, context);

    expect(quote.basePrice).toBe(100000);
    expect(quote.finalPrice).toBe(90000); // 100.000 - 10.000
    expect(quote.totalAdjustment).toBe(10000);
    expect(quote.appliedRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'RULE-TIER-GOLD',
          discountAmount: 10000,
        }),
      ]),
    );
  });

  // =========================================================================
  // KỊCH BẢN 4: Khung giờ cao điểm (Phụ thu 10%)
  // =========================================================================
  it('Kịch bản 4: Giặt trong khung giờ cao điểm (PEAK) - phụ thu thêm 10%', () => {
    const context: OrderContext = {
      serviceType: 'WASH_DRY',
      memberTier: 'BRONZE',
      weightKg: 4,
      requestTimestamp: new Date('2026-03-01T18:00:00Z'),
      timeSlot: 'PEAK', // Giờ cao điểm
    };

    const quote = evaluatePrice(bundle, context);

    expect(quote.basePrice).toBe(100000);
    expect(quote.finalPrice).toBe(110000); // 100.000 + 10.000 (phụ thu)
    expect(quote.totalAdjustment).toBe(-10000); // Điều chỉnh âm = tăng giá
    expect(quote.appliedRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'RULE-PEAK-HOUR',
          discountAmount: -10000,
        }),
      ]),
    );
  });

  // =========================================================================
  // KỊCH BẢN 5: Giảm giá xếp chồng (Gold + Khối lượng lớn 8kg + Voucher)
  // =========================================================================
  it('Kịch bản 5: Giảm giá xếp chồng (Gold 10% + Đơn >=7kg 10k + Voucher GIATXANH 20%)', () => {
    const context: OrderContext = {
      serviceType: 'WASH_DRY',
      memberTier: 'GOLD',
      weightKg: 8, // 8 * 25.000 = 200.000đ
      requestTimestamp: new Date('2026-03-01T08:00:00Z'),
      timeSlot: 'NORMAL',
      voucherCode: 'GIATXANH',
    };

    const quote = evaluatePrice(bundle, context);

    expect(quote.basePrice).toBe(200000);
    // 1. Gold giảm 10% của 200.000 = 20.000đ
    // 2. Bulk >= 7kg giảm 10.000đ
    // 3. Voucher GIATXANH giảm 20% của 200.000 = 40.000đ
    // Tổng giảm = 20.000 + 10.000 + 40.000 = 70.000đ
    expect(quote.totalAdjustment).toBe(70000);
    expect(quote.finalPrice).toBe(130000); // 200.000 - 70.000 = 130.000
    expect(quote.appliedRules.length).toBe(3);
  });

  // =========================================================================
  // KỊCH BẢN 6: Cơ chế bảo vệ giá sàn (Price Floor Guard)
  // =========================================================================
  it('Kịch bản 6: Chặn giá sàn khi áp dụng voucher giảm sâu (MEGA50) cho đơn hàng nhỏ', () => {
    const context: OrderContext = {
      serviceType: 'WASH_ONLY', // 15.000đ/kg
      memberTier: 'BRONZE',
      weightKg: 1, // Base price = 15.000đ
      requestTimestamp: new Date('2026-03-01T08:00:00Z'),
      timeSlot: 'NORMAL',
      voucherCode: 'MEGA50', // Giảm 50% = 7.500đ -> Giá còn 7.500đ, nhưng sàn là 20.000đ
    };

    const quote = evaluatePrice(bundle, context);

    expect(quote.basePrice).toBe(15000);
    // Sàn của rule MEGA50 là 20.000đ -> Giá cuối bị kéo lên 20.000đ
    expect(quote.finalPrice).toBe(20000);
    expect(quote.appliedRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'PRICE_FLOOR_GUARD',
        }),
      ]),
    );
  });

  // =========================================================================
  // KỊCH BẢN 7: Kiểm tra tính toán vẹn (Integrity Hash Check)
  // =========================================================================
  it('Kịch bản 7: Bundle hợp lệ vượt qua kiểm tra toàn vẹn; Bundle bị sửa đổi sẽ bị phát hiện', () => {
    // 1. Bundle chuẩn -> Báo cáo an toàn
    const cleanReport = analyzePriceBundle(bundle, new Date());
    expect(cleanReport.isSafeToPublish).toBe(true);
    expect(cleanReport.summary.errors).toBe(0);

    // 2. Chỉnh sửa giá mà không cập nhật hash -> Bị phát hiện INTEGRITY_MISMATCH
    const tamperedBundle = JSON.parse(JSON.stringify(bundle));
    tamperedBundle.effectiveFrom = new Date(bundle.effectiveFrom);
    tamperedBundle.basePricePerKg.WASH_DRY = 999999; // Hacker chỉnh giá

    const tamperedReport = analyzePriceBundle(tamperedBundle, new Date());
    expect(tamperedReport.isSafeToPublish).toBe(false);
    expect(
      tamperedReport.issues.some((i) => i.issueType === 'INTEGRITY_MISMATCH'),
    ).toBe(true);
  });

  // =========================================================================
  // KỊCH BẢN 8: Phân tích tĩnh phát hiện Dead Rules (Luật chết)
  // =========================================================================
  it('Kịch bản 8: Static Analysis phát hiện Dead Rules (applicableTiers rỗng hoặc thiếu voucherCode)', () => {
    const invalidBundle = JSON.parse(JSON.stringify(bundle));
    invalidBundle.effectiveFrom = new Date(bundle.effectiveFrom);
    // Thêm một luật chết (không áp dụng tier nào)
    invalidBundle.rules.push({
      ruleId: 'RULE-DEAD-TIERS',
      ruleName: 'Luật mồ côi',
      description: 'Không có tier nào được hưởng',
      ruleType: 'TIER_DISCOUNT',
      applicableTiers: [], // DEAD RULE!
      applicableServices: ['WASH_DRY'],
      discountPercent: 50,
      priceFloor: 10000,
    });
    invalidBundle.integrityHash = computeBundleIntegrityHash(invalidBundle);

    const report = analyzePriceBundle(invalidBundle, new Date());
    expect(report.isSafeToPublish).toBe(false);
    expect(
      report.issues.some(
        (i) => i.ruleId === 'RULE-DEAD-TIERS' && i.issueType === 'DEAD_RULE',
      ),
    ).toBe(true);
  });

  // =========================================================================
  // KỊCH BẢN 9: Phân tích tĩnh phát hiện rủi ro Giặt 0 đồng (Zero-price Bug)
  // =========================================================================
  it('Kịch bản 9: Static Analysis phát hiện rủi ro Giặt 0đ (Zero-price risk)', () => {
    const zeroPriceBundle = JSON.parse(JSON.stringify(bundle));
    zeroPriceBundle.effectiveFrom = new Date(bundle.effectiveFrom);
    // Gán danh sách rules chỉ gồm các rule có priceFloor = 0 và tổng discount >= 100%
    zeroPriceBundle.rules = [
      {
        ruleId: 'RULE-PROMO-70',
        ruleName: 'Giảm sốc 70%',
        description: 'Giảm 70%',
        ruleType: 'TIER_DISCOUNT',
        applicableTiers: ['PLATINUM'],
        applicableServices: ['WASH_DRY'],
        discountPercent: 70,
        priceFloor: 0, // Không có sàn!
      },
      {
        ruleId: 'RULE-VOUCHER-50',
        ruleName: 'Voucher 50%',
        description: 'Voucher 50%',
        ruleType: 'VOUCHER',
        applicableTiers: ['PLATINUM'],
        applicableServices: ['WASH_DRY'],
        voucherCode: 'FREE50',
        discountPercent: 50,
        priceFloor: 0, // Không có sàn!
      },
    ];
    zeroPriceBundle.integrityHash = computeBundleIntegrityHash(zeroPriceBundle);

    const report = analyzePriceBundle(zeroPriceBundle, new Date());
    expect(
      report.issues.some((i) => i.issueType === 'ZERO_PRICE_RISK'),
    ).toBe(true);
  });
});
