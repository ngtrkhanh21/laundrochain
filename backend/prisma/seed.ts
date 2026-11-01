import { PrismaClient, RoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { computeBundleIntegrityHash } from '../src/shared/pricing-engine';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = '123456';

const roles: { name: RoleType; description: string }[] = [
  { name: RoleType.ADMIN, description: 'Quản trị hệ thống, chi nhánh, thiết bị IoT và audit log' },
  { name: RoleType.PRICING_MANAGER, description: 'Tạo luật giá DMN, chạy phân tích tĩnh, ký số và xuất bản bundle' },
  { name: RoleType.SITE_MANAGER, description: 'Giám sát máy móc cửa hàng, tra cứu rule trace giải quyết khiếu nại' },
  { name: RoleType.TECHNICIAN, description: 'Tiếp nhận sửa chữa máy, cấp phát và thay thế thiết bị ki-ốt/máy giặt' },
  { name: RoleType.MEMBER, description: 'Khách hàng giặt đồ, nạp tiền ví, đặt lệnh giặt, xem lịch sử' },
];

const seedUsers: { email: string; fullName: string; phoneNumber: string; role: RoleType }[] = [
  { email: 'admin@laundrochain.vn', fullName: 'System Administrator', phoneNumber: '0900000001', role: RoleType.ADMIN },
  { email: 'pricing@laundrochain.vn', fullName: 'Pricing Manager', phoneNumber: '0900000002', role: RoleType.PRICING_MANAGER },
  { email: 'sitemgr@laundrochain.vn', fullName: 'Site Manager', phoneNumber: '0900000003', role: RoleType.SITE_MANAGER },
  { email: 'tech@laundrochain.vn', fullName: 'Technician', phoneNumber: '0900000004', role: RoleType.TECHNICIAN },
  { email: 'member@gmail.com', fullName: 'Nguyen Van A', phoneNumber: '0900000005', role: RoleType.MEMBER },
];

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Upsert all 5 roles
  console.log('📋 Creating roles...');
  const roleMap = new Map<RoleType, number>();

  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: roleData,
    });
    roleMap.set(role.name, role.id);
    console.log(`  ✓ Role: ${role.name} (id: ${role.id})`);
  }

  // 2. Create seed users
  console.log('\n👤 Creating seed users...');
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  for (const userData of seedUsers) {
    const roleId = roleMap.get(userData.role)!;

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        fullName: userData.fullName,
        phoneNumber: userData.phoneNumber,
        passwordHash,
      },
      create: {
        email: userData.email,
        fullName: userData.fullName,
        phoneNumber: userData.phoneNumber,
        passwordHash,
        isActive: true,
      },
    });

    // Upsert UserRole mapping
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      update: {},
      create: { userId: user.id, roleId },
    });

    console.log(`  ✓ User: ${user.email} → Role: ${userData.role}`);
  }

  // 3. Create default Price Bundle
  console.log('\n📦 Seeding default Price Bundle...');
  const basePrices = {
    WASH_DRY: 25000,
    WASH_ONLY: 15000,
    DRY_ONLY: 15000,
    IRON: 12000,
    EXPRESS: 40000,
  };
  const effectiveFrom = new Date('2026-01-01T00:00:00.000Z');
  const bundleRules = [
    {
      ruleId: 'RULE-PEAK-HOUR',
      ruleName: 'Phụ thu khung giờ cao điểm (17h - 21h)',
      description: 'Phụ thu thêm 10% trong khung giờ cao điểm để điều tiết công suất máy.',
      ruleType: 'TIME_PEAK',
      applicableTiers: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'],
      applicableServices: ['WASH_DRY', 'WASH_ONLY', 'DRY_ONLY', 'IRON', 'EXPRESS'],
      timeSlotCondition: 'PEAK',
      discountPercent: -10,
      priceFloor: 15000,
      priority: 10,
    },
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
  ];

  const integrityHash = computeBundleIntegrityHash({
    bundleVersion: '1.2.0',
    basePricePerKg: basePrices,
    rules: bundleRules,
    effectiveFrom,
  });

  await prisma.priceBundle.upsert({
    where: { version: '1.2.0' },
    update: {
      integrityHash,
      basePrices,
      rules: bundleRules,
      status: 'PUBLISHED',
    },
    create: {
      version: '1.2.0',
      name: 'Bảng giá chuẩn chuỗi LaundroChain 2026',
      description: 'Bao gồm chiết khấu cấp bậc thành viên, phụ thu giờ cao điểm và khuyến mãi xếp chồng.',
      status: 'PUBLISHED',
      effectiveFrom,
      effectiveTo: null,
      integrityHash,
      signature: 'ED25519_SIG_DEMO_2026_LAUNDROCHAIN_VALIDATED',
      publishedBy: 'pricing@laundrochain.vn',
      basePrices,
      rules: bundleRules,
    },
  });
  console.log(`  ✓ PriceBundle: v1.2.0 (Hash: ${integrityHash.substring(0, 20)}...)`);

  console.log('\n✅ Seed completed successfully!');
  console.log(`\n📝 Default password for all users: "${DEFAULT_PASSWORD}"`);
  console.log('\n🔑 Test accounts:');
  seedUsers.forEach((u) => console.log(`   ${u.role.padEnd(20)} → ${u.email}`));
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
