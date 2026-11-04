import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { walletsApi } from '../api/walletsApi';
import { useLanguage } from '../context/LanguageContext';
import {
  Crown,
  CheckCircle2,
  XCircle,
  Wallet,
  ArrowRight,
  RotateCw,
  Receipt,
  ShieldCheck,
  Check,
  Copy,
  Clock,
  Sparkles,
  AlertTriangle,
  History,
} from 'lucide-react';

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isVietnamese } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Lấy các tham số từ URL do PayOS redirect về
  const orderCode = searchParams.get('orderCode') || searchParams.get('order_code');
  const statusParam = (searchParams.get('status') || '').toUpperCase();
  const cancelParam = searchParams.get('cancel');
  const codeParam = searchParams.get('code');
  const amountParam = searchParams.get('amount');
  const typeParam = (searchParams.get('type') || '').toLowerCase();
  const isOrder = typeParam === 'order';

  const [resolvedAmount, setResolvedAmount] = useState(amountParam);
  const effectiveAmount = amountParam || resolvedAmount;

  // Xác định trạng thái thanh toán
  const isCancelled = cancelParam === 'true' || statusParam === 'CANCELLED';
  const initialSuccess =
    !isCancelled &&
    (statusParam === 'PAID' ||
      statusParam === 'SUCCESS' ||
      codeParam === '00' ||
      searchParams.get('depositSuccess') === 'true' ||
      searchParams.get('success') === 'true');

  const [isSuccess, setIsSuccess] = useState(initialSuccess);

  const syncPayment = async (active = true) => {
    setLoading(true);
    try {
      // Tự động đồng bộ với backend để cập nhật số dư mới nhất
      const walletData = await walletsApi.getMyWallet();
      if (active && walletData) {
        setWallet(walletData);
      }

      // Lấy các giao dịch ví gần nhất để đối soát
      const txData = await walletsApi.getMyTransactions({ page: 1, pageSize: 5 });
      const items = Array.isArray(txData) ? txData : (txData?.items || []);

      if (active && items.length > 0) {
        const latestTopup = items.find(
          (t) =>
            (t.transactionType === 'TOPUP' || t.transaction_type === 'TOPUP') &&
            (t.status === 'SUCCESS' || t.status === 'PAID')
        );

        if (!amountParam && (latestTopup?.amount || items[0]?.amount)) {
          setResolvedAmount(String(Math.abs(latestTopup?.amount || items[0].amount)));
        }

        if (!isCancelled) {
          if (initialSuccess) {
            setIsSuccess(true);
          } else if (orderCode) {
            const matchedTx = items.find(
              (t) => String(t.payOsOrderCode) === String(orderCode) || String(t.referenceCode) === String(orderCode)
            );
            if (matchedTx && (matchedTx.status === 'SUCCESS' || matchedTx.status === 'PAID')) {
              setIsSuccess(true);
              setResolvedAmount(String(Math.abs(matchedTx.amount)));
            }
          } else if (!isOrder && latestTopup) {
            // Không phải đơn giặt, và người dùng có giao dịch nạp tiền thành công gần nhất
            setIsSuccess(true);
            setResolvedAmount(String(Math.abs(latestTopup.amount)));
          }
        }
      }
    } catch (err) {
      console.warn('Sync wallet on payment result note', err);
    } finally {
      if (active) setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    syncPayment(active);

    return () => {
      active = false;
    };
  }, [amountParam, orderCode, statusParam]);

  useEffect(() => {
    if (isSuccess) {
      try {
        sessionStorage.setItem(
          'lc_recent_topup',
          JSON.stringify({
            amount: effectiveAmount || 100000,
            time: Date.now(),
          })
        );
      } catch {}
    }
  }, [isSuccess, effectiveAmount]);

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-8 px-4 animate-in fade-in duration-300">
      <div className="max-w-xl w-full">
        {loading ? (
          /* ======================================================== */
          /* MÀN HÌNH ĐANG ĐỒNG BỘ VÀ XÁC NHẬN GIAO DỊCH             */
          /* ======================================================== */
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center mx-auto text-blue-600">
              <RotateCw className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {isVietnamese ? 'Đang đồng bộ kết quả nạp tiền...' : 'Verifying Payment & Updating Wallet...'}
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isVietnamese
                ? 'Vui lòng chờ trong giây lát trong khi hệ thống xác nhận giao dịch qua VietQR Napas 24/7.'
                : 'Please wait while we confirm the transaction with the bank.'}
            </p>
          </div>
        ) : isSuccess ? (
          /* ======================================================== */
          /* MÀN HÌNH THANH TOÁN THÀNH CÔNG                          */
          /* ======================================================== */
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 relative overflow-hidden">
            {/* Glowing background halo */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Success Badge Icon */}
            <div className="relative inline-block mx-auto mt-2">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 fill-current" />
              </div>
            </div>

            {/* Title & Subtitle */}
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                {isOrder
                  ? (isVietnamese ? 'Thanh toán thành công!' : 'Payment Successful!')
                  : (isVietnamese ? 'Nạp Tiền Thành Công!' : 'Payment Successful!')}
              </h1>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-2">
                {isOrder
                  ? (isVietnamese ? 'Vui lòng kiểm tra đơn giặt của bạn' : 'Please check your laundry order')
                  : (isVietnamese ? 'Giao dịch qua cổng VietQR Napas 24/7 (PayOS) đã được xác nhận.' : 'Your VietQR Napas 24/7 (PayOS) payment has been confirmed.')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isOrder
                  ? (isVietnamese ? 'Giao dịch thanh toán đơn giặt đã hoàn tất. Máy giặt/sấy đã sẵn sàng khởi động.' : 'Order payment completed. Machine is ready.')
                  : (isVietnamese ? 'Số dư mới đã được cộng vào ví của bạn.' : 'New balance has been credited to your wallet.')}
              </p>

              {isOrder && effectiveAmount && (
                <div className="mt-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2 font-bold">
                  <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    {isVietnamese
                      ? `Đơn hàng sẽ tự động tích lũy +${Number(effectiveAmount).toLocaleString('vi-VN')} điểm thành viên ngay khi hoàn thành chu trình giặt!`
                      : `You will earn +${Number(effectiveAmount).toLocaleString('vi-VN')} tier points once the cycle completes!`}
                  </span>
                </div>
              )}
            </div>

            {/* Amount Display */}
            {effectiveAmount && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl">
                <div className="text-xs uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">
                  {isOrder
                    ? (isVietnamese ? 'Số tiền thanh toán đơn giặt' : 'Order Payment Amount')
                    : (isVietnamese ? 'Số tiền đã nạp vào ví' : 'Amount Credited')}
                </div>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-300 mt-1 font-mono">
                  {Number(effectiveAmount).toLocaleString('vi-VN')} ₫
                </div>
              </div>
            )}

            {/* Transaction Receipt Details */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 text-xs text-left space-y-2.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>{isVietnamese ? 'Chi tiết giao dịch' : 'Transaction Details'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">{isVietnamese ? 'Dịch vụ:' : 'Service:'}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {isOrder
                    ? (isVietnamese ? 'Đơn giặt LaundroChain' : 'LaundroChain Laundry Service')
                    : (isVietnamese ? 'Nạp tiền ví LaundroChain' : 'LaundroChain Wallet Top-up')}
                </span>
              </div>

              {orderCode && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{isVietnamese ? 'Mã đơn PayOS:' : 'PayOS Order Code:'}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">#{orderCode}</span>
                    <button
                      onClick={() => handleCopy(orderCode)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                      title="Sao chép mã"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-400">{isVietnamese ? 'Cổng thanh toán:' : 'Gateway:'}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">VietQR Napas 24/7 (PayOS)</span>
              </div>

              {!isOrder && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{isVietnamese ? 'Số dư khả dụng mới:' : 'New Available Balance:'}</span>
                  <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm font-mono">
                    {loading ? '...' : (wallet?.balance ?? 0).toLocaleString('vi-VN')} {wallet?.currency || 'VND'}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-400">{isVietnamese ? 'Trạng thái:' : 'Status:'}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {isVietnamese ? 'Thành công (Đã xác nhận)' : 'Successful (Confirmed)'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">{isVietnamese ? 'Thời gian:' : 'Timestamp:'}</span>
                <span className="font-mono text-slate-500">{new Date().toLocaleString('vi-VN')}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {isOrder ? (
                <>
                  <button
                    onClick={() => navigate('/dashboard/my-orders', { state: { paymentSuccess: true } })}
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
                  >
                    <History className="w-4 h-4" />
                    <span>{isVietnamese ? 'Chuyển hướng qua đơn giặt' : 'Go to Laundry Orders'}</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>

                  <button
                    onClick={() => navigate('/dashboard/new-order')}
                    className="w-full py-3 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    {isVietnamese ? 'Đặt thêm đơn giặt / sấy' : 'Book Another Machine'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/dashboard/wallet', { state: { depositSuccess: true, amount: effectiveAmount } })}
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>{isVietnamese ? 'Quay về trang Ví của tôi' : 'Return to My Wallet'}</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>

                  <button
                    onClick={() => navigate('/dashboard/new-order', { state: { topupSuccess: true, amount: effectiveAmount } })}
                    className="w-full py-3 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    {isVietnamese ? 'Đặt đơn giặt / sấy ngay' : 'Book a Laundry Machine'}
                  </button>
                </>
              )}
            </div>

            {/* Trust footnote */}
            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Giao dịch an toàn được bảo vệ bởi Napas và PayOS</span>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* MÀN HÌNH THANH TOÁN THẤT BẠI / ĐÃ HỦY                   */
          /* ======================================================== */
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 relative overflow-hidden">
            {/* Glowing background halo */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Failed Badge Icon */}
            <div className="w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-lg shadow-rose-500/20 mx-auto mt-2">
              <XCircle className="w-10 h-10 stroke-[2.5]" />
            </div>

            {/* Title & Subtitle */}
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                {isOrder
                  ? (isVietnamese ? 'Thanh Toán Đơn Giặt Chưa Hoàn Tất' : 'Laundry Payment Cancelled or Failed')
                  : (isVietnamese ? 'Thanh Toán Chưa Hoàn Tất' : 'Payment Cancelled or Failed')}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {isOrder
                  ? (isVietnamese
                    ? 'Giao dịch thanh toán đơn giặt qua cổng PayOS chưa được thực hiện hoặc đã bị hủy. Máy chưa được kích hoạt.'
                    : 'Your laundry payment was not completed or was cancelled. Machine was not started.')
                  : (isVietnamese
                    ? 'Giao dịch nạp tiền qua cổng PayOS chưa được thực hiện hoặc đã bị hủy. Tiền của bạn chưa bị trừ khỏi tài khoản ngân hàng.'
                    : 'Your payment was not completed or was cancelled. No funds were deducted from your bank account.')}
              </p>
            </div>

            {/* Details / Explanation Box */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 text-xs text-left space-y-2.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>{isVietnamese ? 'Thông tin giao dịch' : 'Transaction Information'}</span>
              </div>

              {orderCode && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{isVietnamese ? 'Mã tham chiếu PayOS:' : 'PayOS Reference:'}</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">#{orderCode}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-400">{isVietnamese ? 'Trạng thái:' : 'Status:'}</span>
                <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                  {isCancelled
                    ? (isVietnamese ? 'Đã hủy giao dịch' : 'Cancelled')
                    : (isVietnamese ? 'Không thành công' : 'Failed')}
                </span>
              </div>

              {!isOrder && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{isVietnamese ? 'Số dư ví hiện tại:' : 'Current Balance:'}</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm font-mono">
                    {loading ? '...' : (wallet?.balance ?? 0).toLocaleString('vi-VN')} {wallet?.currency || 'VND'}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {isOrder ? (
                <>
                  <button
                    onClick={() => navigate('/dashboard/new-order')}
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>{isVietnamese ? 'Quay lại đặt đơn giặt' : 'Return to New Order'}</span>
                  </button>

                  <button
                    onClick={() => navigate('/dashboard/my-orders')}
                    className="w-full py-3 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    {isVietnamese ? 'Xem đơn giặt của tôi' : 'View My Laundry Orders'}
                  </button>
                </>
              ) : (
                <>
                  {/* Demo test helper button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSuccess(true);
                      if (!resolvedAmount) setResolvedAmount('100000');
                    }}
                    className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>{isVietnamese ? '⚡ Giả lập xác nhận nạp tiền thành công (Demo / Test)' : '⚡ Simulate Success (Demo / Test)'}</span>
                  </button>

                  <button
                    onClick={() => syncPayment(true)}
                    className="w-full py-3 px-6 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-800 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>{isVietnamese ? 'Kiểm tra lại số dư & giao dịch ví' : 'Re-check Balance & Transactions'}</span>
                  </button>

                  <button
                    onClick={() => navigate('/dashboard/wallet')}
                    className="w-full py-3 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    <span>{isVietnamese ? 'Quay về trang Ví của tôi' : 'Return to My Wallet'}</span>
                  </button>

                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full py-2.5 px-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs transition cursor-pointer"
                  >
                    {isVietnamese ? 'Về trang chủ Dashboard' : 'Back to Dashboard'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
