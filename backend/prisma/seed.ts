import { PrismaClient, RoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
