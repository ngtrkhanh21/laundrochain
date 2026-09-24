// =============================================================================
// LAUNDROCHAIN - SHARED PRICING ENGINE TYPES
// Sprint 1 Stub - Pure Types (No DB, No Date.now())
// =============================================================================

export type ServiceType = 'WASH_DRY' | 'DRY_ONLY' | 'WASH_ONLY' | 'IRON' | 'EXPRESS';

export type MemberTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

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

  /** Mã giảm giá (voucher), có thể undefined nếu không có */
  voucherCode?: string;

  /** Số kg cần giặt */
  weightKg: number;
}

/**
 * AppliedRule: Ghi lại từng rule nào đã được áp dụng (phục vụ audit trace).
 */
export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  discountAmount: number;
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

  /** Danh sách các rule đã áp dụng (audit trail) */
  appliedRules: AppliedRule[];

  /** Version của bundle giá đã dùng để tính */
  bundleVersion: string;

  /** Currency code */
  currency: 'VND';
}

/**
 * PriceRule: Một rule giảm giá trong bundle.
 */
export interface PriceRule {
  ruleId: string;
  ruleName: string;
  description: string;

  /** Tiers được hưởng rule này */
  applicableTiers: MemberTier[];

  /** Services được áp dụng */
  applicableServices: ServiceType[];

  /** Phần trăm giảm (0-100) */
  discountPercent: number;

  /** Giá sàn (VND) - giá cuối không được thấp hơn mức này */
  priceFloor: number;
}

/**
 * PriceBundle: Gói cấu hình giá đã ký số, có ngày hiệu lực.
 */
export interface PriceBundle {
  bundleId: string;
  bundleVersion: string;

  /** Ngày bắt đầu hiệu lực */
  effectiveFrom: Date;

  /** Ngày kết thúc hiệu lực (null = vô thời hạn) */
  effectiveTo: Date | null;

  /** Giá cơ bản theo loại dịch vụ (VND/kg) */
  basePricePerKg: Record<ServiceType, number>;

  /** Danh sách các rule khuyến mãi */
  rules: PriceRule[];

  /** Chữ ký số (Sprint 2+) */
  signature?: string;
}
