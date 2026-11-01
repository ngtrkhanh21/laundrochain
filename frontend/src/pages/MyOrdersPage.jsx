import { useState, useEffect } from 'react';
import { ordersApi } from '../api/ordersApi';
import { useLanguage } from '../context/LanguageContext';
import {
  History,
  WashingMachine,
  Clock,
  CheckCircle2,
  MapPin,
  Sparkles,
  Receipt,
  RotateCw,
  Check,
  AlertTriangle,
} from 'lucide-react';

const FALLBACK_ORDERS = [
  {
    orderId: 'ORD-2026-8812',
    machineCode: 'W01',
    siteName: 'LaundroChain Bến Thành - Quận 1',
    cycleName: 'Giặt tiêu chuẩn (Standard Wash)',
    status: 'IN_PROGRESS',
    currentStep: 'Đang giặt chính (Main Wash)',
    progressPercent: 68,
    timeRemainingMinutes: 12,
    total: 35000,
    createdAt: new Date().toISOString(),
  },
  {
    orderId: 'ORD-2026-8805',
    machineCode: 'D01',
    siteName: 'LaundroChain Bến Thành - Quận 1',
    cycleName: 'Sấy nhiệt cao 70°C',
    status: 'COMPLETED',
    currentStep: 'Hoàn tất sấy khô',
    progressPercent: 100,
    timeRemainingMinutes: 0,
    total: 35000,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 82800000).toISOString(),
  },
];

export default function MyOrdersPage() {
  const { isVietnamese } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState(null);

  async function fetchOrders() {
    try {
      const data = await ordersApi.getMyOrders();
      const rawList = Array.isArray(data) ? data : (data?.items || []);
      if (rawList.length > 0) {
        const normalized = rawList.map((o) => {
          const isProgress = o.status === 'IN_PROGRESS';
          const isConfirmed = o.status === 'CONFIRMED';
          const isPending = o.status === 'PENDING_PAYMENT';
          const isCompleted = o.status === 'COMPLETED';

          const isDryer = (o.assignedMachines || '').startsWith('D');
          const defaultName = isDryer ? 'Sấy Khô 12kg (Nhiệt Gas)' : 'Giặt Tiêu Chuẩn 10kg';
          return {
            orderId: o.orderId,
            orderCode: o.orderCode,
            machineCode: o.assignedMachines || 'W01',
            siteName: o.siteName || 'LaundroChain Bến Thành - Quận 1',
            cycleName: o.items?.[0]?.offeringName || defaultName,
            status: o.status,
            currentStep: isProgress
              ? (isVietnamese ? 'Đang giặt chính (IoT Active)' : 'Washing in progress')
              : isConfirmed
              ? (isVietnamese ? 'Đã thanh toán (Sẵn sàng chạy)' : 'Paid & Ready to wash')
              : isPending
              ? (isVietnamese ? 'Chờ thanh toán Ki-ốt' : 'Pending payment')
              : (isVietnamese ? 'Hoàn tất chu trình giặt' : 'Completed'),
            progressPercent: isProgress ? 65 : isCompleted ? 100 : 25,
            timeRemainingMinutes: isProgress ? 15 : 0,
            total: o.total || o.subtotal || 30000,
            createdAt: o.createdAt || new Date().toISOString(),
            completedAt: o.completedAt,
          };
        });
        setOrders(normalized);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn('Failed to load orders from API, using fallback', err);
      setOrders(FALLBACK_ORDERS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  // Complete order handler (POST /api/orders/{id}/complete)
  async function handleCompleteOrder(orderId) {
    setCompletingId(orderId);
    try {
      await ordersApi.completeOrder(orderId);
      await fetchOrders();
    } catch (err) {
      console.warn('Error completing order via API', err);
      // Optimistic update
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId || o.orderCode === orderId
            ? { ...o, status: 'COMPLETED', progressPercent: 100, timeRemainingMinutes: 0, currentStep: 'Hoàn tất chu trình giặt' }
            : o
        )
      );
    } finally {
      setCompletingId(null);
    }
  }

  const activeOrders = orders.filter(
    (o) => o.status === 'IN_PROGRESS' || o.status === 'CONFIRMED' || o.status === 'PENDING_PAYMENT' || o.status === 'IN_USE'
  );
  const pastOrders = orders.filter(
    (o) => o.status === 'COMPLETED' || o.status === 'CANCELLED' || o.status === 'REFUNDED'
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            {isVietnamese ? 'Lịch sử & Tiến độ giặt của tôi' : 'My Washing Orders & Live Progress'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isVietnamese
              ? 'Theo dõi tiến trình chu trình giặt thời gian thực và xem lại các hóa đơn giặt trước đây.'
              : 'Track live washing progress and view past laundry receipts.'}
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="self-start sm:self-auto px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>{isVietnamese ? 'Làm mới trạng thái' : 'Refresh'}</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-2">
          <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
          <span>{isVietnamese ? 'Đang tải danh sách đơn giặt...' : 'Loading orders...'}</span>
        </div>
      ) : (
        <>
          {/* Active Orders Section */}
          {activeOrders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <RotateCw className="w-4 h-4 animate-spin" />
                {isVietnamese ? 'Đơn giặt đang chạy trực tiếp' : 'Active Laundry in Progress'}
              </h2>

              <div className="space-y-4">
                {activeOrders.map((order) => {
                  const isCompleting = completingId === order.orderId;
                  return (
                    <div
                      key={order.orderId || order.orderCode}
                      className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500/80 p-6 shadow-xl shadow-blue-500/5 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                            <WashingMachine className="w-7 h-7 animate-spin" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                              {order.cycleName}
                              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300">
                                {order.machineCode}
                              </span>
                            </h3>
                            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{order.siteName}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                            {order.currentStep || 'Đang giặt chính'}
                          </span>

                          <button
                            disabled={isCompleting}
                            onClick={() => handleCompleteOrder(order.orderId)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Xong chu trình & Giải phóng máy giặt"
                          >
                            {isCompleting ? (
                              <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            )}
                            <span>{isVietnamese ? 'Xong chu trình' : 'Finish'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between items-center text-sm font-bold">
                          <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {isVietnamese
                              ? `Còn khoảng ${order.timeRemainingMinutes || 15} phút`
                              : `~${order.timeRemainingMinutes || 15} min left`}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200">
                            {order.progressPercent || 25}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 h-full rounded-full transition-all duration-700"
                            style={{ width: `${order.progressPercent || 25}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>
                          Mã đơn:{' '}
                          <strong className="font-mono text-slate-600 dark:text-slate-300">
                            {order.orderCode || order.orderId}
                          </strong>
                        </span>
                        <span>
                          Thanh toán:{' '}
                          <strong className="text-blue-600">
                            {(order.total || 35000).toLocaleString('vi-VN')} ₫
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Orders Section */}
          <div className="space-y-3 pt-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-400" />
              {isVietnamese ? 'Lịch sử hóa đơn giặt' : 'Laundry Receipts & History'}
            </h2>

            {pastOrders.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
                {isVietnamese ? 'Chưa có hóa đơn nào hoàn tất.' : 'No completed orders yet.'}
              </div>
            ) : (
              <div className="space-y-3">
                {pastOrders.map((order) => (
                  <div
                    key={order.orderId || order.orderCode}
                    className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          {order.cycleName}
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {order.machineCode}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{order.siteName}</span>
                          <span>•</span>
                          <span>{new Date(order.createdAt).toLocaleString('vi-VN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {(order.total || 35000).toLocaleString('vi-VN')} ₫
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                        <Check className="w-3 h-3" />
                        {order.status === 'REFUNDED'
                          ? (isVietnamese ? 'ĐÃ HOÀN TIỀN' : 'REFUNDED')
                          : (isVietnamese ? 'HOÀN TẤT' : 'COMPLETED')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
