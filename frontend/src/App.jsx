import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '74731448226-861gtmlc71sr096tgkld2oelafuokds5.apps.googleusercontent.com';

// Core Pages
import LoginPage from './pages/LoginPage';
import MobileLoginPage from './pages/MobileLoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import DashboardHome from './pages/DashboardHome';
import PricingSimulatorPage from './pages/PricingSimulatorPage';

// Component tự động chọn giao diện: Trên Native Mobile App (Capacitor) dùng MobileLoginPage, trên Kiosk/Web desktop dùng LoginPage
function AdaptiveLoginPage() {
  return Capacitor.isNativePlatform() ? <MobileLoginPage /> : <LoginPage />;
}

// Admin Pages
import UsersManagementPage from './pages/UsersManagementPage';
import BrandsPage from './pages/BrandsPage';
import BranchesPage from './pages/BranchesPage';
import DevicesPage from './pages/DevicesPage';
import AuditLogPage from './pages/AuditLogPage';

// Operations & Tech Pages
import MachinesMonitoringPage from './pages/MachinesMonitoringPage';
import AlertsPage from './pages/AlertsPage';
import RepairsPage from './pages/RepairsPage';
import SiteManagerOrdersPage from './pages/SiteManagerOrdersPage';
import SiteManagerDashboard from './pages/SiteManagerDashboard';

// Member Pages
import NewOrderPage from './pages/NewOrderPage';
import MyOrdersPage from './pages/MyOrdersPage';
import MemberWalletPage from './pages/MemberWalletPage';
import PaymentResultPage from './pages/PaymentResultPage';

import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <Routes>
              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Public Routes — chỉ truy cập khi CHƯA đăng nhập */}
              <Route element={<PublicRoute />}>
                <Route path="/login" element={<AdaptiveLoginPage />} />
                <Route path="/kiosk" element={<LoginPage />} />
                <Route path="/mobile-login" element={<MobileLoginPage />} />
                <Route path="/app/login" element={<MobileLoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              {/* Protected Routes — phải đăng nhập */}
              <Route element={<ProtectedRoute />}>
                <Route
                  path="/dashboard"
                  element={<DashboardHome />}
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
                <Route
                  path="/dashboard/users"
                  element={
                    <DashboardLayout>
                      <UsersManagementPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/brands"
                  element={
                    <DashboardLayout>
                      <BrandsPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/branches"
                  element={
                    <DashboardLayout>
                      <BranchesPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/devices"
                  element={
                    <DashboardLayout>
                      <DevicesPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/audit-log"
                  element={
                    <DashboardLayout>
                      <AuditLogPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/settings"
                  element={
                    <DashboardLayout>
                      <ProfilePage />
                    </DashboardLayout>
                  }
                />

                {/* Pricing Manager routes */}
                <Route
                  path="/dashboard/pricing-simulator"
                  element={
                    <DashboardLayout>
                      <PricingSimulatorPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/pricing-rules"
                  element={
                    <DashboardLayout>
                      <PricingSimulatorPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/price-bundles"
                  element={
                    <DashboardLayout>
                      <PricingSimulatorPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/static-analysis"
                  element={
                    <DashboardLayout>
                      <PricingSimulatorPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/promotions"
                  element={
                    <DashboardLayout>
                      <PricingSimulatorPage />
                    </DashboardLayout>
                  }
                />

                {/* Site Manager routes */}
                <Route
                  path="/dashboard/site-overview"
                  element={
                    <DashboardLayout>
                      <SiteManagerDashboard />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/machines"
                  element={
                    <DashboardLayout>
                      <MachinesMonitoringPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/alerts"
                  element={
                    <DashboardLayout>
                      <AlertsPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/rule-trace"
                  element={
                    <DashboardLayout>
                      <PricingSimulatorPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/orders"
                  element={
                    <DashboardLayout>
                      <SiteManagerOrdersPage />
                    </DashboardLayout>
                  }
                />

                {/* Technician routes */}
                <Route
                  path="/dashboard/repairs"
                  element={
                    <DashboardLayout>
                      <RepairsPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/equipment"
                  element={
                    <DashboardLayout>
                      <DevicesPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/kiosk-swap"
                  element={
                    <DashboardLayout>
                      <DevicesPage />
                    </DashboardLayout>
                  }
                />

                {/* Member routes */}
                <Route
                  path="/dashboard/new-order"
                  element={
                    <DashboardLayout>
                      <ErrorBoundary>
                        <NewOrderPage />
                      </ErrorBoundary>
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/my-orders"
                  element={
                    <DashboardLayout>
                      <ErrorBoundary>
                        <MyOrdersPage />
                      </ErrorBoundary>
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/wallet"
                  element={
                    <DashboardLayout>
                      <ErrorBoundary>
                        <MemberWalletPage />
                      </ErrorBoundary>
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/card"
                  element={
                    <DashboardLayout>
                      <ErrorBoundary>
                        <MemberWalletPage />
                      </ErrorBoundary>
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/dashboard/transactions"
                  element={<Navigate to="/dashboard/my-orders" replace />}
                />
              </Route>

              {/* Payment & Wallet Result Routes — Có DashboardLayout nhưng không bị ProtectedRoute chặn nếu vừa redirect từ PayOS */}
              <Route
                path="/dashboard/wallet/result"
                element={
                  <DashboardLayout>
                    <ErrorBoundary>
                      <PaymentResultPage />
                    </ErrorBoundary>
                  </DashboardLayout>
                }
              />
              <Route
                path="/dashboard/wallet/success"
                element={
                  <DashboardLayout>
                    <ErrorBoundary>
                      <PaymentResultPage />
                    </ErrorBoundary>
                  </DashboardLayout>
                }
              />
              <Route
                path="/dashboard/payment-result"
                element={
                  <DashboardLayout>
                    <ErrorBoundary>
                      <PaymentResultPage />
                    </ErrorBoundary>
                  </DashboardLayout>
                }
              />
              <Route
                path="/dashboard/payment/success"
                element={
                  <DashboardLayout>
                    <ErrorBoundary>
                      <PaymentResultPage />
                    </ErrorBoundary>
                  </DashboardLayout>
                }
              />

              {/* Public fallback routes for PayOS returnUrl without dashboard layout */}
              <Route path="/payment/result" element={<ErrorBoundary><PaymentResultPage /></ErrorBoundary>} />
              <Route path="/payment-result" element={<ErrorBoundary><PaymentResultPage /></ErrorBoundary>} />
              <Route path="/payment/success" element={<ErrorBoundary><PaymentResultPage /></ErrorBoundary>} />
              <Route path="/wallet/success" element={<ErrorBoundary><PaymentResultPage /></ErrorBoundary>} />
              <Route path="/wallet/cancel" element={<ErrorBoundary><PaymentResultPage /></ErrorBoundary>} />
              <Route path="/payment/cancel" element={<ErrorBoundary><PaymentResultPage /></ErrorBoundary>} />

              {/* 404 */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
