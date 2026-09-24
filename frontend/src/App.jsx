import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import DashboardHome from './pages/DashboardHome';

// Placeholder cho các trang chưa xây dựng
function ComingSoon({ title }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 16, textAlign: 'center' }}>
      <div style={{ fontSize: '4rem' }}>🚧</div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{title}</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
        Tính năng này sẽ được xây dựng trong Sprint tiếp theo.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Public Routes — chỉ truy cập khi CHƯA đăng nhập */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected Routes — phải đăng nhập */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/dashboard"
              element={
                <DashboardLayout>
                  <DashboardHome />
                </DashboardLayout>
              }
            />
            <Route
              path="/dashboard/profile"
              element={
                <DashboardLayout>
                  <ProfilePage />
                </DashboardLayout>
              }
            />

            {/* Admin routes */}
            <Route path="/dashboard/users" element={<DashboardLayout><ComingSoon title="Quản lý người dùng" /></DashboardLayout>} />
            <Route path="/dashboard/branches" element={<DashboardLayout><ComingSoon title="Chi nhánh & Cửa hàng" /></DashboardLayout>} />
            <Route path="/dashboard/devices" element={<DashboardLayout><ComingSoon title="Thiết bị IoT" /></DashboardLayout>} />
            <Route path="/dashboard/audit-log" element={<DashboardLayout><ComingSoon title="Audit Log" /></DashboardLayout>} />
            <Route path="/dashboard/settings" element={<DashboardLayout><ComingSoon title="Cài đặt hệ thống" /></DashboardLayout>} />

            {/* Pricing Manager routes */}
            <Route path="/dashboard/pricing-rules" element={<DashboardLayout><ComingSoon title="Cấu hình giá (DMN)" /></DashboardLayout>} />
            <Route path="/dashboard/price-bundles" element={<DashboardLayout><ComingSoon title="Price Bundle" /></DashboardLayout>} />
            <Route path="/dashboard/static-analysis" element={<DashboardLayout><ComingSoon title="Phân tích tĩnh (WP3)" /></DashboardLayout>} />
            <Route path="/dashboard/promotions" element={<DashboardLayout><ComingSoon title="Voucher & Promotion" /></DashboardLayout>} />

            {/* Site Manager routes */}
            <Route path="/dashboard/machines" element={<DashboardLayout><ComingSoon title="Giám sát máy móc" /></DashboardLayout>} />
            <Route path="/dashboard/alerts" element={<DashboardLayout><ComingSoon title="Cảnh báo & Sự cố" /></DashboardLayout>} />
            <Route path="/dashboard/rule-trace" element={<DashboardLayout><ComingSoon title="Rule Trace" /></DashboardLayout>} />
            <Route path="/dashboard/orders" element={<DashboardLayout><ComingSoon title="Lịch sử đơn giặt" /></DashboardLayout>} />

            {/* Technician routes */}
            <Route path="/dashboard/repairs" element={<DashboardLayout><ComingSoon title="Sửa chữa máy" /></DashboardLayout>} />
            <Route path="/dashboard/equipment" element={<DashboardLayout><ComingSoon title="Quản lý thiết bị" /></DashboardLayout>} />
            <Route path="/dashboard/kiosk-swap" element={<DashboardLayout><ComingSoon title="Thay thế Ki-ốt" /></DashboardLayout>} />

            {/* Member routes */}
            <Route path="/dashboard/new-order" element={<DashboardLayout><ComingSoon title="Đặt lệnh giặt" /></DashboardLayout>} />
            <Route path="/dashboard/my-orders" element={<DashboardLayout><ComingSoon title="Lịch sử giặt" /></DashboardLayout>} />
            <Route path="/dashboard/wallet" element={<DashboardLayout><ComingSoon title="Ví & Nạp tiền" /></DashboardLayout>} />
            <Route path="/dashboard/transactions" element={<DashboardLayout><ComingSoon title="Lịch sử giao dịch" /></DashboardLayout>} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
