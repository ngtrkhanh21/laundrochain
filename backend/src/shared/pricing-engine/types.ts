// =============================================================================
// LAUNDROCHAIN - SHARED PRICING ENGINE TYPES
// Pure Types (No DB, No Date.now())
// =============================================================================

export type ServiceType = 'WASH_DRY' | 'DRY_ONLY' | 'WASH_ONLY' | 'IRON' | 'EXPRESS';

export type MemberTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export type TimeSlot = 'PEAK' | 'OFF_PEAK' | 'NORMAL';

export type RuleType = 'TIER_DISCOUNT' | 'VOUCHER' | 'TIME_PEAK' | 'WEIGHT_VOLUME';

/**
 * OrderContext: Tất cả thông tin cần thiết để tính giá.
 * TUYỆT ĐỐI KHÔNG để hàm tự gọi Date.now() hay đọc DB.
 * Mọi thứ phải được inject từ bên ngoài qua object này.
 */
export interface OrderContext {
  /** Loại dịch vụ giặt */
  serviceType: ServiceType;

  /** Hạng thành viên hiện tại của khách */
  memberTier: MemberTier;

  /** Thời điểm tính giá (phải được inject từ ngoài, không dùng Date.now()) */
  requestTimestamp: Date;

  /** Số kg cần giặt */
  weightKg: number;

  /** Mã giảm giá (voucher), có thể undefined nếu không có */
  voucherCode?: string;

  /** Khung giờ tính giá (tùy chọn hoặc suy diễn thuần túy từ requestTimestamp) */
  timeSlot?: TimeSlot;
}

/**
 * AppliedRule: Ghi lại từng rule nào đã được áp dụng (phục vụ audit trace).
 */
export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  ruleType: RuleType | 'SYSTEM_GUARD';
  discountAmount: number; // Số dương: giảm giá; Số âm: phụ thu hoặc nâng giá sàn
  description: string;
}

/**
 * QuoteResult: Kết quả trả về sau khi tính giá.
 */
export interface QuoteResult {
  /** Giá gốc trước khi áp dụng khuyến mãi (VND) */
  basePrice: number;

  /** Giá cuối sau khi áp dụng tất cả rule (VND) */
  finalPrice: number;

  /** Tổng số tiền giảm giá hoặc điều chỉnh (VND) */
  totalAdjustment: number;

  /** Danh sách các rule đã áp dụng theo thứ tự (audit trail) */
  appliedRules: AppliedRule[];

  /** Phiên bản của bundle giá đã dùng để tính */
  bundleVersion: string;

  /** Hash toàn vẹn của bundle dùng tính giá */
  integrityHash: string;

  /** Currency code */
  currency: 'VND';
}

/**
 * PriceRule: Một rule giảm giá hoặc phụ thu trong bundle.
 */
export interface PriceRule {
  ruleId: string;
  ruleName: string;
  description: string;
  ruleType: RuleType;

  /** Tiers được hưởng rule này (rỗng = không áp dụng tier nào) */
  applicableTiers: MemberTier[];

  /** Services được áp dụng */
  applicableServices: ServiceType[];

  /** Phần trăm giảm (số dương: giảm %, số âm: phụ thu %) */
  discountPercent?: number;

  /** Số tiền cố định giảm (VND) */
  discountAmountFixed?: number;

  /** Giá sàn tối thiểu cho đơn giặt (VND) */
  priceFloor: number;

  /** Mã voucher yêu cầu (nếu ruleType = VOUCHER) */
  voucherCode?: string;

  /** Khung giờ yêu cầu (nếu ruleType = TIME_PEAK) */
  timeSlotCondition?: TimeSlot;

  /** Số kg tối thiểu để áp dụng (nếu ruleType = WEIGHT_VOLUME) */
  minWeightKg?: number;

  /** Độ ưu tiên thực thi (số nhỏ chạy trước) */
  priority?: number;
}

/**
 * PriceBundle: Gói cấu hình giá đã đóng gói, có kiểm tra toàn vẹn và ngày hiệu lực.
 */
export interface PriceBundle {
  bundleId: string;
  bundleVersion: string;
  name: string;
  description?: string;

  /** Ngày bắt đầu hiệu lực */
  effectiveFrom: Date;

  /** Ngày kết thúc hiệu lực (null = vô thời hạn) */
  effectiveTo: Date | null;

  /** Giá cơ bản theo loại dịch vụ (VND/kg) */
  basePricePerKg: Record<ServiceType, number>;

  /** Danh sách các rule khuyến mãi */
  rules: PriceRule[];

  /** Mã băm SHA-256 xác thực toàn vẹn */
  integrityHash: string;

  /** Chữ ký số xác nhận tính hợp lệ */
  signature?: string;
}

// =============================================================================
// STATIC ANALYSIS (WP3) TYPES
// =============================================================================

export type RuleIssueType =
  | 'DEAD_RULE'
  | 'BELOW_FLOOR_RISK'
  | 'ZERO_PRICE_RISK'
  | 'MISSING_BASE_PRICE'
  | 'INTEGRITY_MISMATCH'
  | 'INVALID_DATE_RANGE';

export type RuleIssueSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface RuleIssue {
  ruleId?: string;
  issueType: RuleIssueType;
  severity: RuleIssueSeverity;
  message: string;
  recommendation?: string;
}

export interface StaticAnalysisReport {
  bundleVersion: string;
  bundleId: string;
  isSafeToPublish: boolean;
  totalRules: number;
  issues: RuleIssue[];
  checkedAt: Date;
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}
