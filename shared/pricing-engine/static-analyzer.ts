// =============================================================================
// LAUNDROCHAIN - SHARED STATIC ANALYZER (WP3)
// Constraint Solver & Logical Safety Checker for Price Bundles
// =============================================================================

import type {
  PriceBundle,
  StaticAnalysisReport,
  RuleIssue,
  ServiceType,
  MemberTier,
} from './types';
import { computeBundleIntegrityHash } from './evaluator';

const ALL_SERVICES: ServiceType[] = ['WASH_DRY', 'DRY_ONLY', 'WASH_ONLY', 'IRON', 'EXPRESS'];
const ALL_TIERS: MemberTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

/**
 * analyzePriceBundle: Quét và phân tích tĩnh gói giá để phát hiện sớm các lỗi logic:
 * 1. Dead Rules (Luật chết không bao giờ kích hoạt hoặc mâu thuẫn)
 * 2. Zero-Price Bug & Below-Floor Risk (Nguy cơ giặt 0đ ngoài ý muốn hoặc vi phạm giá sàn)
 * 3. Missing Base Prices (Thiếu giá cơ sở cho các loại dịch vụ)
 * 4. Invalid Date Ranges & Integrity Hash Mismatch
 *
 * @pure Hàm thuần túy, có thể chạy trên cả Backend và Frontend
 */
export function analyzePriceBundle(bundle: PriceBundle, checkTimestamp: Date): StaticAnalysisReport {
  const issues: RuleIssue[] = [];

  // =========================================================================
  // 1. KIỂM TRA TOÀN VẸN & THỜI HẠN (INTEGRITY & DATES)
  // =========================================================================
  if (bundle.effectiveTo && bundle.effectiveTo.getTime() <= bundle.effectiveFrom.getTime()) {
    issues.push({
      issueType: 'INVALID_DATE_RANGE',
      severity: 'ERROR',
      message: `Ngày kết thúc hiệu lực (${bundle.effectiveTo.toISOString()}) không được nhỏ hơn hoặc bằng ngày bắt đầu (${bundle.effectiveFrom.toISOString()}).`,
      recommendation: 'Hãy điều chỉnh effectiveTo lớn hơn effectiveFrom hoặc để null (vô thời hạn).',
    });
  }

  // Kiểm tra Integrity Hash
  if (bundle.integrityHash) {
    const recalculatedHash = computeBundleIntegrityHash(bundle);
    if (bundle.integrityHash !== recalculatedHash) {
      issues.push({
        issueType: 'INTEGRITY_MISMATCH',
        severity: 'ERROR',
        message: 'Mã băm kiểm tra toàn vẹn (integrityHash) không khớp với nội dung cấu hình thực tế!',
        recommendation: 'Cần tính toán lại chữ ký/hash trước khi phát hành.',
      });
    }
  }

  // =========================================================================
  // 2. KIỂM TRA BẢNG GIÁ CƠ BẢN (BASE PRICES)
  // =========================================================================
  for (const service of ALL_SERVICES) {
    const price = bundle.basePricePerKg[service];
    if (price === undefined || price === null || price <= 0) {
      issues.push({
        issueType: 'MISSING_BASE_PRICE',
        severity: 'ERROR',
        message: `Dịch vụ '${service}' chưa được thiết lập giá cơ bản hoặc giá <= 0 (giá hiện tại: ${price ?? 'chưa có'}).`,
        recommendation: `Thiết lập giá cơ sở hợp lệ (ví dụ: 15.000đ - 40.000đ/kg) cho dịch vụ ${service}.`,
      });
    } else if (price < 5000) {
      issues.push({
        issueType: 'BELOW_FLOOR_RISK',
        severity: 'WARNING',
        message: `Giá cơ bản dịch vụ '${service}' quá thấp (${price.toLocaleString('vi-VN')}đ/kg), có nguy cơ không bù đắp được chi phí vận hành.`,
        recommendation: 'Xem xét nâng mức giá cơ bản tối thiểu lên từ 10.000đ/kg.',
      });
    }
  }

  // =========================================================================
  // 3. KIỂM TRA TỪNG LUẬT ĐƠN LẺ (DEAD RULES & MISCONFIGURATIONS)
  // =========================================================================
  const seenVouchers = new Set<string>();

  bundle.rules.forEach((rule, idx) => {
    // A. Kiểm tra tiers rỗng
    if (!rule.applicableTiers || rule.applicableTiers.length === 0) {
      issues.push({
        ruleId: rule.ruleId,
        issueType: 'DEAD_RULE',
        severity: 'ERROR',
        message: `Luật [${rule.ruleId} - ${rule.ruleName}] có danh sách applicableTiers rỗng, sẽ không bao giờ được kích hoạt.`,
        recommendation: 'Chỉ định ít nhất một cấp bậc thành viên (ví dụ: BRONZE, SILVER, GOLD, PLATINUM).',
      });
    }

    // B. Kiểm tra services rỗng
    if (!rule.applicableServices || rule.applicableServices.length === 0) {
      issues.push({
        ruleId: rule.ruleId,
        issueType: 'DEAD_RULE',
        severity: 'ERROR',
        message: `Luật [${rule.ruleId} - ${rule.ruleName}] có danh sách applicableServices rỗng, không áp dụng cho dịch vụ nào.`,
        recommendation: 'Chọn ít nhất một dịch vụ áp dụng trong bảng giá.',
      });
    }

    // C. Kiểm tra discount vô nghĩa (cả percent và fixed đều = 0)
    const hasPercent = rule.discountPercent !== undefined && rule.discountPercent !== 0;
    const hasFixed = rule.discountAmountFixed !== undefined && rule.discountAmountFixed !== 0;
    if (!hasPercent && !hasFixed) {
      issues.push({
        ruleId: rule.ruleId,
        issueType: 'DEAD_RULE',
        severity: 'WARNING',
        message: `Luật [${rule.ruleId} - ${rule.ruleName}] không cấu hình tỷ lệ giảm (discountPercent) hay số tiền giảm (discountAmountFixed).`,
        recommendation: 'Thiết lập mức giảm giá cụ thể hoặc loại bỏ luật nếu không dùng.',
      });
    }

    // D. Kiểm tra quy tắc Voucher
    if (rule.ruleType === 'VOUCHER') {
      if (!rule.voucherCode || rule.voucherCode.trim() === '') {
        issues.push({
          ruleId: rule.ruleId,
          issueType: 'DEAD_RULE',
          severity: 'ERROR',
          message: `Luật Voucher [${rule.ruleId}] thiếu mã ký hiệu voucherCode!`,
          recommendation: 'Điền mã voucher (ví dụ: GIATXANH, MEGA50) để người dùng có thể kích hoạt.',
        });
      } else {
        const codeNormalized = rule.voucherCode.trim().toUpperCase();
        if (seenVouchers.has(codeNormalized)) {
          issues.push({
            ruleId: rule.ruleId,
            issueType: 'DEAD_RULE',
            severity: 'WARNING',
            message: `Trùng lặp mã voucher '${codeNormalized}' giữa các luật trong cùng một bundle. Luật trước có thể che khuất luật sau.`,
            recommendation: 'Sử dụng các mã voucher khác nhau cho từng chương trình.',
          });
        }
        seenVouchers.add(codeNormalized);
      }
    }

    // E. Kiểm tra quy tắc Giờ cao điểm
    if (rule.ruleType === 'TIME_PEAK' && !rule.timeSlotCondition) {
      issues.push({
        ruleId: rule.ruleId,
        issueType: 'DEAD_RULE',
        severity: 'ERROR',
        message: `Luật theo khung giờ [${rule.ruleId}] chưa chọn điều kiện timeSlotCondition (PEAK/OFF_PEAK).`,
        recommendation: 'Chọn khung giờ cụ thể áp dụng.',
      });
    }

    // F. Kiểm tra quy tắc Khối lượng
    if (rule.ruleType === 'WEIGHT_VOLUME') {
      if (rule.minWeightKg === undefined || rule.minWeightKg <= 0) {
        issues.push({
          ruleId: rule.ruleId,
          issueType: 'DEAD_RULE',
          severity: 'WARNING',
          message: `Luật ưu đãi theo khối lượng [${rule.ruleId}] có ngưỡng minWeightKg không hợp lệ (${rule.minWeightKg ?? 'chưa đặt'}).`,
          recommendation: 'Đặt ngưỡng khối lượng tối thiểu lớn hơn 0 (ví dụ: 5kg, 7kg, 10kg).',
        });
      }
    }

    // G. Kiểm tra giá sàn (Price Floor)
    if (rule.priceFloor < 5000 && rule.discountPercent && rule.discountPercent > 30) {
      issues.push({
        ruleId: rule.ruleId,
        issueType: 'BELOW_FLOOR_RISK',
        severity: 'WARNING',
        message: `Luật [${rule.ruleId}] có mức giảm cao (${rule.discountPercent}%) nhưng giá sàn lại quá thấp (${rule.priceFloor.toLocaleString('vi-VN')}đ).`,
        recommendation: 'Nâng giá sàn tối thiểu lên từ 10.000đ - 15.000đ để ngăn ngừa rủi ro tài chính.',
      });
    }
  });

  // =========================================================================
  // 4. KIỂM TRA RỦI RO XẾP CHỒNG KHUYẾN MÃI (STACKING & ZERO-PRICE SOLVER)
  // =========================================================================
  // Giả lập tổ hợp tối đa giữa Tier + Voucher + Volume Discount
  for (const tier of ALL_TIERS) {
    for (const service of ALL_SERVICES) {
      let maxStackPercentage = 0;
      let maxFixedDiscount = 0;
      let maxPriceFloor = 0;

      // Cộng dồn các luật có thể cùng áp dụng cho cặp (tier, service)
      for (const rule of bundle.rules) {
        const matchesTier = rule.applicableTiers.includes(tier);
        const matchesService = rule.applicableServices.includes(service);
        if (!matchesTier || !matchesService) continue;

        if (rule.priceFloor > maxPriceFloor) {
          maxPriceFloor = rule.priceFloor;
        }

        if (rule.discountPercent && rule.discountPercent > 0) {
          maxStackPercentage += rule.discountPercent;
        }

        if (rule.discountAmountFixed && rule.discountAmountFixed > 0) {
          maxFixedDiscount += rule.discountAmountFixed;
        }
      }

      // Nếu tổng discount % >= 100% hoặc có nguy cơ giảm về 0đ mà không có price floor bảo vệ
      if (maxStackPercentage >= 100 && maxPriceFloor <= 0) {
        issues.push({
          issueType: 'ZERO_PRICE_RISK',
          severity: 'ERROR',
          message: `RỦI RO GIẶT 0 ĐỒNG: Cặp (${tier}, ${service}) có tổng phần trăm giảm giá tích lũy lên tới ${maxStackPercentage}% mà không có giá sàn bảo vệ (priceFloor = ${maxPriceFloor}).`,
          recommendation: 'Cấu hình priceFloor >= 10.000đ hoặc giới hạn số lượng voucher áp dụng đồng thời.',
        });
      }
    }
  }

  // Tổng hợp thống kê
  const errors = issues.filter((i) => i.severity === 'ERROR').length;
  const warnings = issues.filter((i) => i.severity === 'WARNING').length;
  const infos = issues.filter((i) => i.severity === 'INFO').length;

  return {
    bundleVersion: bundle.bundleVersion,
    bundleId: bundle.bundleId,
    isSafeToPublish: errors === 0,
    totalRules: bundle.rules.length,
    issues,
    checkedAt: checkTimestamp,
    summary: {
      errors,
      warnings,
      infos,
    },
  };
}
