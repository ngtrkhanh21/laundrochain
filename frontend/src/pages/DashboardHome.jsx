import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  WashingMachine,
  SlidersHorizontal,
  UserCheck,
  QrCode,
  PlayCircle,
  Clock,
  ArrowRight,
  ArrowDown,
  Sparkles,
  History,
  Search,
  PhoneCall,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import SiteManagerDashboard from './SiteManagerDashboard';

export default function DashboardHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isVietnamese } = useLanguage();

  const primaryRole = (user?.activeRole || user?.roles?.[0] || (user?.isGuest ? 'MEMBER' : 'ADMIN')).toUpperCase();

  // 1. SITE MANAGER -> Hiển thị Dashboard Tổng quan trạm giặt
  if (primaryRole === 'SITE_MANAGER' || primaryRole === 'SITEMANAGER' || primaryRole === 'STORE_MANAGER') {
    return <SiteManagerDashboard />;
  }

  // 2. ADMIN -> Chuyển hướng Quản trị người dùng
  if (primaryRole === 'ADMIN') {
    return <Navigate to="/dashboard/users" replace />;
  }

  // 3. PRICING MANAGER -> Chuyển hướng Cấu hình giá
  if (primaryRole === 'PRICING_MANAGER') {
    return <Navigate to="/dashboard/pricing-rules" replace />;
  }

  // 4. TECHNICIAN -> Chuyển hướng Sửa chữa máy
  if (primaryRole === 'TECHNICIAN') {
    return <Navigate to="/dashboard/repairs" replace />;
  }

  // 5. MEMBER & GUEST (Khách vãng lai) -> Hiển thị Dashboard Tổng quan & Hướng dẫn sử dụng
  const stepsRow1 = isVietnamese
    ? [
      {
        num: '01',
        title: '1. Chọn máy giặt / sấy',
        desc: 'Chọn máy có đèn xanh SẴN SÀNG phù hợp với khối lượng đồ.',
        tag: 'Máy 10kg • 12kg • 15kg',
        icon: WashingMachine,
        color: 'from-blue-600 to-indigo-600',
        accent: 'text-blue-600 bg-blue-50 border-blue-200',
      },
      {
        num: '02',
        title: '2. Chọn chu trình giặt',
        desc: 'Chọn chế độ giặt nhanh, tiêu chuẩn, nước nóng hoặc sấy khô.',
        tag: 'Biết trước giá & thời gian',
        icon: SlidersHorizontal,
        color: 'from-indigo-600 to-purple-600',
        accent: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      },
      {
        num: '03',
        title: '3. Nhập thông tin & Mã giảm',
        desc: 'Nhập Họ tên, Số điện thoại và chọn mã Voucher (nếu có).',
        tag: 'Lưu đơn & tra cứu theo SĐT',
        icon: UserCheck,
        color: 'from-purple-600 to-pink-600',
        accent: 'text-purple-600 bg-purple-50 border-purple-200',
      },
    ]
    : [
      {
        num: '01',
        title: '1. Select Machine',
        desc: 'Pick an AVAILABLE washer or dryer matching your laundry load.',
        tag: 'Capacity: 10kg • 12kg • 15kg',
        icon: WashingMachine,
        color: 'from-blue-600 to-indigo-600',
        accent: 'text-blue-600 bg-blue-50 border-blue-200',
      },
      {
        num: '02',
        title: '2. Choose Cycle',
        desc: 'Select Quick, Standard, Hot wash or High-heat tumble dry.',
        tag: 'Clear pricing & duration',
        icon: SlidersHorizontal,
        color: 'from-indigo-600 to-purple-600',
        accent: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      },
      {
        num: '03',
        title: '3. Enter Info & Voucher',
        desc: 'Enter Name, Phone number and select available discount vouchers.',
        tag: 'Track order by Phone',
        icon: UserCheck,
        color: 'from-purple-600 to-pink-600',
        accent: 'text-purple-600 bg-purple-50 border-purple-200',
      },
    ];

  const stepsRow2 = isVietnamese
    ? [
      {
        num: '04',
        title: '4. Quét mã VietQR',
        desc: 'Mở app ngân hàng quét mã VietQR tự động xác nhận trong 2 giây.',
        tag: 'Không cần tiền mặt',
        icon: QrCode,
        color: 'from-emerald-600 to-teal-600',
        accent: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      },
      {
        num: '05',
        title: '5. Bấm nút Khởi động',
        desc: 'Bỏ quần áo vào lồng giặt, đóng chặt cửa và bấm nút Bắt đầu giặt.',
        tag: 'Kích hoạt máy tự động',
        icon: PlayCircle,
        color: 'from-amber-600 to-orange-600',
        accent: 'text-amber-600 bg-amber-50 border-amber-200',
      },
      {
        num: '06',
        title: '6. Theo dõi & Nhận đồ',
        desc: 'Xem đồng hồ đếm ngược trực tiếp trên điện thoại hoặc nhận đồ khi hoàn tất.',
        tag: 'Thông báo xong đồ',
        icon: Clock,
        color: 'from-blue-600 to-cyan-600',
        accent: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      },
    ]
    : [
      {
        num: '04',
        title: '4. Scan VietQR Code',
        desc: 'Open your banking app to scan VietQR code with instant 2s payment confirmation.',
        tag: '100% Cashless',
        icon: QrCode,
        color: 'from-emerald-600 to-teal-600',
        accent: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      },
      {
        num: '05',
        title: '5. Press Start Button',
        desc: 'Load clothes into drum, close door securely, and click Start Washing on screen.',
        tag: 'IoT Auto-startup',
        icon: PlayCircle,
        color: 'from-amber-600 to-orange-600',
        accent: 'text-amber-600 bg-amber-50 border-amber-200',
      },
      {
        num: '06',
        title: '6. Track & Pick Up',
        desc: 'Check live countdown via Phone in History tab and pick up clothes.',
        tag: 'Completion alerts',
        icon: Clock,
        color: 'from-blue-600 to-cyan-600',
        accent: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      },
    ];

  return (
    <div className="flex flex-col gap-7 pb-12 animate-fade-in text-slate-800">
      {/* 1. HERO BANNER: Chữ to, nổi bật, dễ quan sát từ xa trên Ki-ốt */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a3556] via-[#0f4e7f] to-[#1e3a8a] text-white p-7 sm:p-9 shadow-lg border border-blue-900/30">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              {isVietnamese
                ? 'LaundroChain — Hướng Dẫn Sử Dụng & Đặt Giặt'
                : 'LaundroChain — User Guide & Laundry Orders'}
            </h1>

            <p className="mt-3 text-sm sm:text-base text-blue-100 font-medium leading-relaxed max-w-xl">
              {isVietnamese
                ? 'Quy trình giặt sấy tự phục vụ tự động hóa 100%. Khách hàng chủ động chọn máy, thanh toán VietQR và theo dõi tiến trình trực tiếp.'
                : '100% automated self-service laundry platform. Choose a machine, pay via VietQR, and track live cycle status in real-time.'}
            </p>

            {/* 3 Pills chữ to rõ ràng */}
            <div className="mt-5 flex flex-wrap gap-2.5 text-xs sm:text-sm font-bold text-blue-100">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 shadow-2xs">
                <Zap className="size-4 text-amber-300" />
                {isVietnamese ? 'Bật máy tự động' : 'Auto Start'}
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 shadow-2xs">
                <QrCode className="size-4 text-emerald-300" />
                {isVietnamese ? 'VietQR siêu tốc' : 'Instant VietQR'}
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 shadow-2xs">
                <Clock className="size-4 text-cyan-300" />
                {isVietnamese ? 'Theo dõi tiến trình' : 'Live Tracking'}
              </span>
            </div>
          </div>

          {/* Action Buttons to rõ, bấm chạm dễ dàng */}
          <div className="flex flex-row lg:flex-col gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/dashboard/new-order')}
              className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm sm:text-base shadow-lg active:scale-95 transition-all cursor-pointer border border-emerald-400/40"
            >
              <WashingMachine className="size-5" />
              <span>{isVietnamese ? 'Bắt đầu đặt giặt ngay' : 'Start Wash Order'}</span>
              <ArrowRight className="size-5 opacity-90" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard/my-orders')}
              className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm sm:text-base backdrop-blur-md border border-white/25 transition-all cursor-pointer active:scale-95"
            >
              {user?.isGuest ? (
                <Search className="size-4 text-cyan-300" />
              ) : (
                <History className="size-4 text-cyan-300" />
              )}
              <span>
                {user?.isGuest
                  ? (isVietnamese ? 'Tra cứu đơn giặt' : 'Track Orders')
                  : (isVietnamese ? 'Lịch sử đơn hàng' : 'My Orders')}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. QUY TRÌNH 6 BƯỚC ĐẶT GIẶT CÓ MŨI TÊN CHỈ TỪNG BƯỚC (CHỮ TO RÕ) */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-xs sm:text-sm font-extrabold border border-blue-200 mb-1.5">
              <CheckCircle2 className="size-4 text-blue-600" />
              <span>{isVietnamese ? 'QUY TRÌNH THỰC HIỆN' : 'ORDERING FLOW'}</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {isVietnamese
                ? 'Quy trình đặt đơn giặt 6 bước'
                : '6-Step Laundry Ordering Process'}
            </h2>
          </div>
          <p className="text-sm font-semibold text-slate-500">
            {isVietnamese
              ? 'Thao tác lần lượt theo hướng mũi tên chỉ dẫn'
              : 'Follow directional arrows step-by-step'}
          </p>
        </div>

        {/* HÀNG 1: BƯỚC 1 ➔ BƯỚC 2 ➔ BƯỚC 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 relative">
          {stepsRow1.map((step, idx) => {
            const Icon = step.icon;
            const hasNext = idx < stepsRow1.length - 1;
            return (
              <div key={step.num} className="relative flex flex-col">
                <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-white border-2 border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-500 transition-all group">
                  <div>
                    {/* Header: Số bước to + Icon to */}
                    <div className="flex items-center justify-between mb-3.5">
                      <span className={`w-9 h-9 rounded-xl bg-gradient-to-r ${step.color} text-white font-black text-sm flex items-center justify-center shadow-xs`}>
                        {step.num}
                      </span>
                      <div className={`p-2.5 rounded-xl border ${step.accent}`}>
                        <Icon className="size-5" />
                      </div>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm sm:text-[15px] font-medium text-slate-700 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      {step.tag}
                    </span>
                  </div>
                </div>

                {/* Mũi tên ngang to chỉ sang bước tiếp theo (Desktop md:flex) */}
                {hasNext && (
                  <div
                    className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-blue-600 text-white shadow-lg items-center justify-center ring-4 ring-white"
                    title={isVietnamese ? 'Bước tiếp theo' : 'Next Step'}
                  >
                    <ArrowRight className="size-4 stroke-[3]" />
                  </div>
                )}

                {/* Mũi tên dọc cho màn hình điện thoại (Mobile md:hidden) */}
                {hasNext && (
                  <div className="flex md:hidden justify-center py-1.5">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shadow-2xs">
                      <ArrowDown className="size-3.5 stroke-[3]" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Thanh kết nối chuyển tiếp từ Bước 3 xuống Bước 4: To, rõ, bắt mắt */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-blue-50 border-2 border-blue-200 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-extrabold text-blue-900">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span>
              {isVietnamese
                ? 'Sau khi nhập thông tin ➔ Chuyển sang bước Thanh toán & Khởi động máy'
                : 'After entering info ➔ Proceed to Payment & Machine Startup'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-700 font-black text-xs sm:text-sm">
            <span>{isVietnamese ? 'Tiếp tục bước 4' : 'Continue Step 4'}</span>
            <ArrowDown className="size-4 stroke-[3]" />
          </div>
        </div>

        {/* HÀNG 2: BƯỚC 4 ➔ BƯỚC 5 ➔ BƯỚC 6 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 relative">
          {stepsRow2.map((step, idx) => {
            const Icon = step.icon;
            const hasNext = idx < stepsRow2.length - 1;
            return (
              <div key={step.num} className="relative flex flex-col">
                <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-white border-2 border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-500 transition-all group">
                  <div>
                    {/* Header: Số bước to + Icon to */}
                    <div className="flex items-center justify-between mb-3.5">
                      <span className={`w-9 h-9 rounded-xl bg-gradient-to-r ${step.color} text-white font-black text-sm flex items-center justify-center shadow-xs`}>
                        {step.num}
                      </span>
                      <div className={`p-2.5 rounded-xl border ${step.accent}`}>
                        <Icon className="size-5" />
                      </div>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm sm:text-[15px] font-medium text-slate-700 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      {step.tag}
                    </span>
                  </div>
                </div>

                {/* Mũi tên ngang to chỉ sang bước tiếp theo (Desktop md:flex) */}
                {hasNext && (
                  <div
                    className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-emerald-600 text-white shadow-lg items-center justify-center ring-4 ring-white"
                    title={isVietnamese ? 'Bước tiếp theo' : 'Next Step'}
                  >
                    <ArrowRight className="size-4 stroke-[3]" />
                  </div>
                )}

                {/* Mũi tên dọc cho màn hình điện thoại (Mobile md:hidden) */}
                {hasNext && (
                  <div className="flex md:hidden justify-center py-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                      <ArrowDown className="size-3.5 stroke-[3]" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. LƯU Ý AN TOÀN: 4 Ô chữ to, đậm nét, dễ theo dõi */}
      <section className="p-5 sm:p-6 rounded-2xl bg-amber-50/70 border-2 border-amber-200">
        <div className="flex items-center gap-2 text-amber-900 mb-3.5">
          <AlertTriangle className="size-5 text-amber-600 shrink-0" />
          <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide">
            {isVietnamese ? '4 Lưu ý quan trọng khi giặt sấy' : '4 Quick Safety Tips'}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs sm:text-sm">
          <div className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-2xs">
            <span className="font-extrabold text-amber-950 text-sm">1. Kiểm tra túi áo quần:</span>
            <p className="text-slate-700 font-medium mt-1 leading-snug">Lấy sạch chìa khóa, tiền xu, bật lửa, giấy tờ.</p>
          </div>
          <div className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-2xs">
            <span className="font-extrabold text-amber-950 text-sm">2. Phân loại màu sắc:</span>
            <p className="text-slate-700 font-medium mt-1 leading-snug">Giặt riêng đồ trắng và đồ màu dễ phai màu.</p>
          </div>
          <div className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-2xs">
            <span className="font-extrabold text-amber-950 text-sm">3. Lưu ý máy sấy:</span>
            <p className="text-slate-700 font-medium mt-1 leading-snug">Không sấy đồ da, cao su, hoặc đồ dính dầu mỡ.</p>
          </div>
          <div className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-2xs">
            <span className="font-extrabold text-amber-950 text-sm">4. Lấy đồ đúng giờ:</span>
            <p className="text-slate-700 font-medium mt-1 leading-snug">Lấy đồ ngay khi xong để nhường máy cho người sau.</p>
          </div>
        </div>
      </section>

      {/* 4. HOTLINE & HỖ TRỢ TRỰC TIẾP: To rõ, dễ bấm chạm */}
      <section className="p-5 sm:p-6 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-blue-600 text-white shadow-md">
            <PhoneCall className="size-5" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-white">
              {isVietnamese ? 'Cần hỗ trợ kỹ thuật tại trạm?' : 'Need Help at Kiosk?'}
            </h4>
            <p className="text-xs sm:text-sm font-medium text-slate-300 mt-0.5">
              {isVietnamese
                ? 'Đội ngũ kỹ thuật trực ban 24/7 hỗ trợ kích hoạt máy và sự cố thanh toán.'
                : 'Technicians on duty 24/7 for hardware or payment inquiries.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="tel:19008888"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm transition no-underline cursor-pointer shadow-sm"
          >
            <PhoneCall className="size-4" />
            <span>Hotline: 1900 8888</span>
          </a>
          <button
            type="button"
            onClick={() => navigate('/dashboard/new-order')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm transition cursor-pointer shadow-sm"
          >
            <WashingMachine className="size-4" />
            <span>{isVietnamese ? 'Đặt giặt ngay' : 'Order Now'}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
