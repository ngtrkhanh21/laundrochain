# LAUNDROCHAIN - SYSTEM ARCHITECTURE & AI CODING INSTRUCTIONS

## 1. TỔNG QUAN DỰ ÁN & BỐI CẢNH (PROJECT CONTEXT)
LaundroChain là hệ thống quản trị chuỗi tiệm giặt thông minh tự phục vụ tích hợp ki-ốt IoT và thẻ thành viên.
Hệ thống giải quyết 4 bài toán kỹ thuật cốt lõi:
1. Deterministic Pricing: Hàm tính giá thuần túy (Pure Evaluator) chạy độc lập trên cả Backend Server và Ki-ốt offline với kết quả đồng nhất 100%.
2. Promotion Bundle & Versioning: Toàn bộ bảng giá, voucher, khuyến mãi được đóng gói thành "Price Bundle", có ký số và ngày hiệu lực (effective-dated).
3. Static Analysis (WP3): Quét lỗi logic khuyến mãi (giảm giá dưới sàn, giặt 0đ ngoài ý muốn, luật chết) bằng Constraint/SAT Solver trước khi phát hành.
4. Offline Double-spending Prevention: Ví thành viên lưu theo sổ cái kế toán kép (Double-entry ledger); ki-ốt offline chỉ được trừ tiền theo hạn mức tạm giữ (Bounded Reservation).

## 2. NGUYÊN TẮC KỸ THUẬT BẮT BUỘC (STRICT CODING CONSTRAINTS)
Khi sinh code, AI BẮT BUỘC tuân thủ các nguyên tắc sau:
- NGUYÊN TẮC HÀM THUẦN TÚY (PURE FUNCTION): Logic tính giá (Pricing Engine) TUYỆT ĐỐI KHÔNG được gọi Database, không đọc biến môi trường và không tự gọi `new Date()` hoặc `Date.now()`. Mọi thông tin (thời gian tính giá, hạng thành viên, mã giảm) phải được truyền qua `OrderContext`.
- KIẾN TRÚC PHÂN BỔ: Hệ thống gồm 2 thành phần chính:
  + `backend/`: NestJS, TypeScript, Prisma ORM, PostgreSQL.
  + `frontend/`: React, TypeScript, Tailwind CSS, Vite.
  + Thư viện tính giá Pure Evaluator nằm độc lập để có thể chia sẻ giữa Backend và Ki-ốt.
- BẢO MẬT & PHÂN QUYỀN (RBAC): Toàn bộ API nghiệp vụ phải bảo vệ qua JWT Guard và RolesGuard.

## 3. CÁC VAI TRÒ HỆ THỐNG (5 ROLES CHUẨN ĐỀ BÀI)
1. `ADMIN`: Quản trị hệ thống, chi nhánh, quản lý thiết bị IoT và audit log.
2. `PRICING_MANAGER`: Tạo luật giá DMN, chạy phân tích tĩnh, ký số và xuất bản bundle.
3. `SITE_MANAGER`: Giám sát máy móc cửa hàng, tra cứu rule trace giải quyết khiếu nại.
4. `TECHNICIAN`: Tiếp nhận sửa chữa máy, cấp phát và thay thế thiết bị ki-ốt/máy giặt.
5. `MEMBER`: Khách hàng giặt đồ, nạp tiền ví, đặt lệnh giặt, xem lịch sử và rule trace.

## 4. MỤC TIÊU HIỆN TẠI (PHASE 1 - SPRINT 1 / REVIEW 1)
Chỉ tập trung hoàn thiện module nền tảng phục vụ Review 1:
1. Hệ thống Database PostgreSQL (Prisma): Bảng User, Role, UserRole, PriceBundle (chứa JSONB rules).
2. Seed Data: Tạo sẵn 5 tài khoản mẫu cho 5 roles (mật khẩu mặc định: `123456`).
3. Backend Auth API:
   - `POST /auth/register`: Đăng ký tài khoản Member.
   - `POST /auth/login`: Đăng nhập, trả về JWT Token chứa danh sách roles.
   - `GET /auth/me`: Lấy thông tin cá nhân.
   - `PUT /auth/me`: Cập nhật Profile (Họ tên, SĐT).
   - `GET /auth/pricing-test`: Endpoint mẫu kiểm tra Guard phân quyền (chỉ ADMIN và PRICING_MANAGER truy cập được).
4. Shared Pricing Evaluator Stub:
   - File `types.ts` và `evaluator.ts` định nghĩa hàm `evaluatePrice(bundle, context)` theo chuẩn pure function để sẵn sàng cho Sprint tiếp theo.
5. Frontend UI:
   - Màn hình Đăng nhập (kèm 5 nút Quick Login để demo nhanh 5 Role).
   - Màn hình Đăng ký tài khoản.
   - Màn hình Profile cá nhân (xem và chỉnh sửa).
   - Sidebar động thay đổi danh mục menu theo Role của người dùng đăng nhập.