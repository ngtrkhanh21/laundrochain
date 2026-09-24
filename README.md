# LaundroChain — Sprint 1 / Review 1

> Hệ thống quản trị chuỗi tiệm giặt thông minh tự phục vụ tích hợp ki-ốt IoT và thẻ thành viên.

## Cấu trúc dự án

```
laundry_project/
├── backend/           # NestJS + Prisma + PostgreSQL + JWT
├── frontend/          # React + Vite + Tailwind CSS v4
├── shared/
│   └── pricing-engine/
│       ├── types.ts   # Interfaces: OrderContext, QuoteResult, PriceBundle...
│       └── evaluator.ts # Pure function: evaluatePrice()
└── laundrychain_RULES.md
```

---

## 🔧 BƯỚC 1: Cấu hình Database

Mở file `backend/.env` và thay `DATABASE_URL` bằng chuỗi kết nối PostgreSQL của bạn:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/laundrochain_db?schema=public"
JWT_SECRET="laundrochain_capstone_2026_secret_key"
PORT=3000
```

**Ví dụ:**
- **Local PostgreSQL:** `postgresql://postgres:123456@localhost:5432/laundrochain_db`
- **Supabase:** Lấy từ Project Settings → Database → Connection string (URI)
- **Neon:** Lấy từ Dashboard → Connection string

---

## 🚀 BƯỚC 2: Khởi chạy Backend

```bash
cd backend

# 1. Chạy migration (tạo bảng trong DB)
npx prisma migrate dev --name init_auth_rbac

# 2. Seed dữ liệu mẫu (5 roles + 5 users)
npx prisma db seed

# 3. Khởi chạy server development
npm run start:dev
```

Backend sẽ chạy tại: **http://localhost:3000**

---

## 🎨 BƯỚC 3: Khởi chạy Frontend

```bash
cd frontend

# Chạy development server
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:5173**

---

## 📋 Tài khoản mẫu (Seed Data)

Mật khẩu mặc định tất cả: **`123456`**

| Role | Email | Mô tả |
|------|-------|--------|
| ADMIN | admin@laundrochain.vn | Quản trị hệ thống |
| PRICING_MANAGER | pricing@laundrochain.vn | Quản lý giá & bundle |
| SITE_MANAGER | sitemgr@laundrochain.vn | Giám sát cửa hàng |
| TECHNICIAN | tech@laundrochain.vn | Kỹ thuật viên |
| MEMBER | member@gmail.com | Khách hàng |

---

## 🔗 API Endpoints

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| POST | `/auth/register` | ❌ | Đăng ký tài khoản Member |
| POST | `/auth/login` | ❌ | Đăng nhập, trả về JWT |
| GET | `/auth/me` | ✅ JWT | Lấy thông tin cá nhân |
| PUT | `/auth/me` | ✅ JWT | Cập nhật fullName, phoneNumber |
| GET | `/auth/pricing-test` | ✅ ADMIN / PRICING_MANAGER | Kiểm tra RBAC |

---

## 🏗️ Kiến trúc Backend

```
backend/src/
├── main.ts                  # Entry point, CORS config
├── app.module.ts            # Root module
├── prisma/
│   ├── prisma.service.ts    # PrismaClient injectable
│   └── prisma.module.ts
└── auth/
    ├── auth.module.ts       # JwtModule, PassportModule
    ├── auth.service.ts      # Business logic
    ├── auth.controller.ts   # HTTP endpoints
    ├── dto/auth.dto.ts      # RegisterDto, LoginDto, UpdateProfileDto
    ├── strategies/
    │   └── jwt.strategy.ts  # PassportStrategy(JWT)
    ├── guards/
    │   ├── jwt-auth.guard.ts
    │   └── roles.guard.ts   # RBAC guard
    └── decorators/
        ├── roles.decorator.ts
        └── current-user.decorator.ts
```

---

## 🎯 Shared Pricing Engine (Pure Function)

```typescript
import { evaluatePrice, DEFAULT_BUNDLE } from './shared/pricing-engine/evaluator';

// Tính giá đơn giặt — PURE FUNCTION
const result = evaluatePrice(DEFAULT_BUNDLE, {
  serviceType: 'WASH_DRY',
  memberTier: 'GOLD',
  requestTimestamp: new Date(),  // Inject từ ngoài, không dùng Date.now() trong hàm
  weightKg: 3,
});

// result.finalPrice = 67500 (25000 * 3 * 0.9 = 67500)
// result.appliedRules = [{ ruleName: 'Giảm giá Gold 10%', ... }]
```

---

## 📦 Tech Stack

| Thành phần | Công nghệ |
|-----------|-----------|
| Backend | NestJS 10, TypeScript |
| ORM | Prisma 5, PostgreSQL |
| Auth | JWT (@nestjs/jwt), Passport-JWT |
| Frontend | React 18, Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | React Router v6 |
| Icons | Lucide React |
