import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { memberApi } from '../api/memberApi';
import { walletsApi } from '../api/walletsApi';
import { memberTiersApi } from '../api/memberTiersApi';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Wallet,
  RefreshCw,
  Check,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  History,
  PlusCircle,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wifi,
  Zap,
  Copy,
  RotateCw,
  ExternalLink,
  Crown,
  Award,
  TrendingUp,
  Star,
  Gift,
  ChevronRight,
} from 'lucide-react';

const WALLET_CACHE_KEY = 'laundro_cached_wallet';
const CARD_CACHE_KEY = 'laundro_cached_card';
const TX_CACHE_KEY = 'laundro_cached_transactions';
const PROFILE_CACHE_KEY = 'laundro_cached_profile';
const TIERS_CACHE_KEY = 'laundro_cached_tiers';

function getCachedJson(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

function setCachedJson(key, data) {
  try {
    if (data) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch {
    // ignore
  }
}

function playSuccessChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch { }
}

export default function MemberWalletPage() {
  const { user } = useAuth();
  const { isVietnamese } = useLanguage();

  // Instant SWR Hydration: Đọc ngay cache từ localStorage để load UI trong 0ms
  const [cachedWallet] = useState(() => getCachedJson(WALLET_CACHE_KEY));
  const [cachedCard] = useState(() => getCachedJson(CARD_CACHE_KEY));
  const [cachedTxs] = useState(() => getCachedJson(TX_CACHE_KEY));
  const [cachedProfile] = useState(() => getCachedJson(PROFILE_CACHE_KEY));
  const [cachedTiers] = useState(() => getCachedJson(TIERS_CACHE_KEY));

  const [wallet, setWallet] = useState(cachedWallet);
  const [card, setCard] = useState(cachedCard);
  const [profile, setProfile] = useState(cachedProfile);
  const [tiersList, setTiersList] = useState(cachedTiers || []);
  const [tierProgress, setTierProgress] = useState(null);
  const [transactions, setTransactions] = useState(cachedTxs || []);

  const [loadingCardAndWallet, setLoadingCardAndWallet] = useState(!cachedWallet);
  const [loadingTxs, setLoadingTxs] = useState(!cachedTxs);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Digital Member Card State
  const [copiedCode, setCopiedCode] = useState(false);

  const isVietnameseRef = useRef(isVietnamese);
  useEffect(() => {
    isVietnameseRef.current = isVietnamese;
  }, [isVietnamese]);

  const hasFetchedWalletRef = useRef(false);
  const hasFetchedTxsRef = useRef(false);

  const location = useLocation();

  // Filter & Toast
  const [depositSuccess, setDepositSuccess] = useState(() => {
    const search = new URLSearchParams(location.search);
    const isPaid =
      search.get('status')?.toUpperCase() === 'PAID' ||
      search.get('status')?.toUpperCase() === 'SUCCESS' ||
      search.get('code') === '00' ||
      search.get('depositSuccess') === 'true';
    if (location.state?.depositSuccess || isPaid) {
      const amt = location.state?.amount || search.get('amount');
      return isVietnamese
        ? `🎉 Nạp thành công ${amt ? Number(amt).toLocaleString('vi-VN') + ' ₫' : ''} vào ví!`
        : `🎉 Successfully topped up ${amt ? Number(amt).toLocaleString('vi-VN') + ' ₫' : ''}!`;
    }

    try {
      const saved = sessionStorage.getItem('lc_recent_topup');
      if (saved) {
        const parsed = JSON.parse(saved);
        return isVietnamese
          ? `🎉 Nạp thành công ${Number(parsed.amount).toLocaleString('vi-VN')} ₫ vào ví!`
          : `🎉 Successfully topped up ${Number(parsed.amount).toLocaleString('vi-VN')} ₫!`;
      }
    } catch { }

    // Kiểm tra ngay trong cache giao dịch nếu có giao dịch TOPUP SUCCESS chưa bị tắt thông báo
    try {
      const cached = getCachedJson(TX_CACHE_KEY);
      if (cached && Array.isArray(cached)) {
        const topup = cached.find(
          (t) =>
            (t.transactionType === 'TOPUP' || t.transaction_type === 'TOPUP') &&
            (t.status === 'SUCCESS' || t.status === 'PAID')
        );
        if (topup && !localStorage.getItem('lc_dismissed_topup_' + topup.transactionId)) {
          return isVietnamese
            ? `🎉 Nạp thành công ${Number(topup.amount).toLocaleString('vi-VN')} ₫ vào ví!`
            : `🎉 Successfully topped up ${Number(topup.amount).toLocaleString('vi-VN')} ₫!`;
        }
      }
    } catch { }

    return '';
  });

  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const isPaid = search.get('status')?.toUpperCase() === 'PAID' || search.get('status')?.toUpperCase() === 'SUCCESS' || search.get('code') === '00' || search.get('depositSuccess') === 'true';
    if (location.state?.depositSuccess || isPaid) {
      const amt = location.state?.amount || search.get('amount');
      setDepositSuccess(
        isVietnamese
          ? `🎉 Nạp thành công ${amt ? Number(amt).toLocaleString('vi-VN') + ' ₫' : ''} vào ví!`
          : `🎉 Successfully topped up ${amt ? Number(amt).toLocaleString('vi-VN') + ' ₫' : ''}!`
      );
    }
  }, [location.state, location.search, isVietnamese]);

  const [txFilter, setTxFilter] = useState('ALL'); // ALL | TOPUP | PAYMENT

  // Custom Amount Input State (On-page)
  const [customTopupAmount, setCustomTopupAmount] = useState('');

  // PayOS Topup Modal State
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [selectedTopupAmount, setSelectedTopupAmount] = useState(50000);
  const [topupLoading, setTopupLoading] = useState(false);
  const [payOsTopupData, setPayOsTopupData] = useState(null);
  const [payOsModalStep, setPayOsModalStep] = useState('QR'); // 'QR' | 'SUCCESS' | 'FAILED'
  const [payOsSuccessData, setPayOsSuccessData] = useState(null);
  const topupPollingRef = useRef(null);

  // Luồng 1 (Ưu tiên cao nhất): Tải Ví, Thẻ thành viên & Tiến trình Hạng (Member Tiers API) song song
  const fetchCardAndWallet = useCallback(async (silent = false) => {
    if (!silent && !hasFetchedWalletRef.current) setLoadingCardAndWallet(true);
    hasFetchedWalletRef.current = true;
    try {
      const [walletRes, cardRes, profileRes, tiersRes, progressRes] = await Promise.allSettled([
        walletsApi.getMyWallet(),
        memberApi.getCard(),
        memberApi.getProfile(),
        memberTiersApi.getTiers(),
        memberTiersApi.getMyProgress(),
      ]);

      if (walletRes.status === 'fulfilled' && walletRes.value) {
        setWallet(walletRes.value);
        setCachedJson(WALLET_CACHE_KEY, walletRes.value);
      }
      if (cardRes.status === 'fulfilled' && cardRes.value) {
        setCard(cardRes.value);
        setCachedJson(CARD_CACHE_KEY, cardRes.value);
      }
      if (profileRes.status === 'fulfilled' && profileRes.value) {
        setProfile(profileRes.value);
        setCachedJson(PROFILE_CACHE_KEY, profileRes.value);
      }
      if (tiersRes.status === 'fulfilled' && Array.isArray(tiersRes.value) && tiersRes.value.length > 0) {
        setTiersList(tiersRes.value);
        setCachedJson(TIERS_CACHE_KEY, tiersRes.value);
      }
      if (progressRes.status === 'fulfilled' && progressRes.value) {
        setTierProgress(progressRes.value);
      }
    } catch (err) {
      console.warn('Error loading card/wallet/tiers', err);
    } finally {
      setLoadingCardAndWallet(false);
    }
  }, []);

  // Luồng 2 (Song song độc lập): Tải lịch sử biến động số dư mà không làm nghẽn hiển thị thẻ/ví
  const fetchTransactions = useCallback(async (silent = false) => {
    if (!silent && !hasFetchedTxsRef.current) setLoadingTxs(true);
    hasFetchedTxsRef.current = true;
    try {
      const txRes = await walletsApi.getMyTransactions({ page: 1, pageSize: 25 });
      const items = txRes?.items || (Array.isArray(txRes) ? txRes : []);
      setTransactions(items);
      setCachedJson(TX_CACHE_KEY, items);

      // Tự động tìm giao dịch TOPUP SUCCESS gần nhất và hiển thị nếu chưa bị đóng
      const latestTopup = items.find(
        (t) =>
          (t.transactionType === 'TOPUP' || t.transaction_type === 'TOPUP') &&
          (t.status === 'SUCCESS' || t.status === 'PAID')
      );

      if (latestTopup) {
        const dismissedKey = 'lc_dismissed_topup_' + latestTopup.transactionId;
        if (!localStorage.getItem(dismissedKey)) {
          setDepositSuccess(
            isVietnameseRef.current
              ? `🎉 Nạp thành công ${Number(latestTopup.amount).toLocaleString('vi-VN')} ₫ vào ví!`
              : `🎉 Successfully topped up ${Number(latestTopup.amount).toLocaleString('vi-VN')} ₫!`
          );
        }
      }
    } catch (err) {
      console.warn('Error loading transactions', err);
    } finally {
      setLoadingTxs(false);
    }
  }, []);

  // Khởi chạy ngay khi mở trang
  useEffect(() => {
    fetchCardAndWallet(!!cachedWallet);
    fetchTransactions(!!cachedTxs);

    return () => {
      stopTopupPolling();
    };
  }, [cachedWallet, cachedTxs, fetchCardAndWallet, fetchTransactions]);

  const stopTopupPolling = () => {
    if (topupPollingRef.current) {
      clearInterval(topupPollingRef.current);
      topupPollingRef.current = null;
    }
  };

  // Làm mới nhanh cả Ví và Giao dịch không gây giật lag trang
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        fetchCardAndWallet(true),
        fetchTransactions(true),
      ]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  }, [fetchCardAndWallet, fetchTransactions]);

  // Sao chép mã hội viên hoặc nội dung
  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Mở modal nạp tiền PayOS
  function handleOpenTopupModal(amount = 50000) {
    setSelectedTopupAmount(amount);
    setPayOsTopupData(null);
    setPayOsModalStep('QR');
    setPayOsSuccessData(null);
    setTopupModalOpen(true);
    createPayOsTopup(amount);
  }

  // Xử lý nạp số tiền tùy chọn từ ô nhập trên trang
  const handleCustomTopup = (rawVal) => {
    const numeric = typeof rawVal === 'number' ? rawVal : parseInt(String(rawVal).replace(/\D/g, ''), 10);
    if (!numeric || isNaN(numeric)) {
      alert(isVietnamese ? 'Vui lòng nhập số tiền hợp lệ!' : 'Please enter a valid amount!');
      return;
    }
    if (numeric < 2000) {
      alert(isVietnamese ? 'Số tiền nạp tối thiểu là 2.000 ₫!' : 'Minimum top-up is 2,000 ₫!');
      return;
    }
    if (numeric > 50000000) {
      alert(isVietnamese ? 'Số tiền nạp tối đa là 50.000.000 ₫!' : 'Maximum top-up is 50,000,000 ₫!');
      return;
    }
    handleOpenTopupModal(numeric);
  };

  // Gọi API tạo link nạp tiền PayOS VietQR
  async function createPayOsTopup(amount) {
    setTopupLoading(true);
    try {
      const returnUrl = `${window.location.origin}/dashboard/wallet/result?amount=${amount}&status=PAID`;
      const cancelUrl = `${window.location.origin}/dashboard/wallet/result?amount=${amount}&status=CANCELLED&cancel=true`;
      const description = `Nap vi ${card?.memberCode || wallet?.memberCode || 'Laundro'}`.slice(0, 25);

      const res = await walletsApi.topUpPayOs({
        amount,
        description,
        returnUrl,
        cancelUrl,
      });

      if (res) {
        setPayOsTopupData(res);
        if (res.transactionId) {
          startTopupPolling(res.transactionId, res.payOsOrderCode || res.orderCode);
        }
      }
    } catch (err) {
      console.error('PayOS TopUp API error', err);
      alert(err.message || (isVietnamese ? 'Tạo yêu cầu nạp tiền thất bại' : 'Topup request failed'));
    } finally {
      setTopupLoading(false);
    }
  }

  // Xử lý khi xác nhận nạp tiền thành công
  const handlePaymentSuccess = useCallback(
    async (amount, balanceAfter, orderCode, transactionId) => {
      stopTopupPolling();
      const finalAmount = amount || selectedTopupAmount;
      setPayOsSuccessData({
        amount: finalAmount,
        balanceAfter: balanceAfter,
        orderCode: orderCode,
        transactionId: transactionId,
      });
      setPayOsModalStep('SUCCESS');
      setTopupModalOpen(true); // Luôn mở modal thông báo thành công
      const bannerMsg = isVietnamese
        ? `🎉 Nạp thành công ${finalAmount.toLocaleString('vi-VN')} ₫ vào ví!`
        : `🎉 Successfully topped up ${finalAmount.toLocaleString('vi-VN')} ₫!`;
      setDepositSuccess(bannerMsg);
      playSuccessChime();
      try {
        sessionStorage.setItem(
          'lc_recent_topup',
          JSON.stringify({
            amount: finalAmount,
            time: Date.now(),
          })
        );
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      } catch { }
      await handleManualRefresh();
    },
    [isVietnamese, selectedTopupAmount, handleManualRefresh]
  );

  const lastBalanceRef = useRef(null);

  useEffect(() => {
    if (wallet?.balance !== undefined && lastBalanceRef.current === null) {
      lastBalanceRef.current = wallet.balance;
    }
  }, [wallet?.balance]);

  // Tự động nhận diện tiền vào ví theo thời gian thực (Real-time Balance Watcher)
  useEffect(() => {
    const watcher = setInterval(async () => {
      try {
        const freshWallet = await walletsApi.getMyWallet();
        if (freshWallet && typeof freshWallet.balance === 'number') {
          if (lastBalanceRef.current !== null && freshWallet.balance > lastBalanceRef.current) {
            const addedAmount = freshWallet.balance - lastBalanceRef.current;
            lastBalanceRef.current = freshWallet.balance;
            setWallet(freshWallet);
            setCachedJson(WALLET_CACHE_KEY, freshWallet);

            // BẬT NGAY THÔNG BÁO VÀ MODAL CHÚC MỪNG THÀNH CÔNG!
            handlePaymentSuccess(
              addedAmount,
              freshWallet.balance,
              freshWallet.memberCode || 'VietQR',
              'live_' + Date.now()
            );
            fetchTransactions(true);
          } else {
            lastBalanceRef.current = freshWallet.balance;
          }
        }
      } catch { }
    }, 2500);

    return () => clearInterval(watcher);
  }, [handlePaymentSuccess, fetchTransactions]);

  // Lắng nghe khi người dùng quay lại tab/app từ app ngân hàng
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchCardAndWallet(true);
        fetchTransactions(true);
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [fetchCardAndWallet, fetchTransactions]);

  // Polling kiểm tra trạng thái thanh toán PayOS tự động
  function startTopupPolling(transactionId, payOsOrderCode) {
    stopTopupPolling();
    topupPollingRef.current = setInterval(async () => {
      try {
        const statusRes = await walletsApi.checkTopUpStatus(transactionId);
        const statusUpper = (statusRes?.status || statusRes?.Status || '').toUpperCase();
        const isPaid = statusUpper === 'SUCCESS' || statusUpper === 'PAID' || !!statusRes?.isPaid;

        if (isPaid) {
          await handlePaymentSuccess(
            statusRes?.amount || statusRes?.Amount || selectedTopupAmount,
            statusRes?.balanceAfter ?? statusRes?.BalanceAfter,
            payOsOrderCode,
            transactionId
          );
        } else if (
          statusUpper === 'CANCELLED' ||
          statusUpper === 'EXPIRED' ||
          statusUpper === 'FAILED'
        ) {
          stopTopupPolling();
          setPayOsModalStep('FAILED');
        }
      } catch (err) {
        console.warn('Check topup polling note', err);
      }
    }, 2000);
  }

  // Lọc giao dịch
  const filteredTransactions = transactions.filter((tx) => {
    if (txFilter === 'TOPUP') return tx.transactionType === 'TOPUP';
    if (txFilter === 'PAYMENT') return tx.transactionType === 'PAYMENT';
    return true;
  });

  const memberCodeDisplay = card?.memberCode || wallet?.memberCode || '-';
  const memberNameDisplay =
    wallet?.memberName || card?.fullName || user?.fullName || user?.username || 'Khách hàng';

  // Cấu hình các cấp độ thành viên mặc định & đặc quyền chiết khấu
  const DEFAULT_TIERS = [
    {
      code: 'STANDARD',
      name: isVietnamese ? 'Tiêu Chuẩn' : 'Standard',
      rank: 1,
      minSpend: 0,
      discount: 0,
      perks: isVietnamese
        ? ['Tích lũy 1% điểm chi tiêu', 'Nhận mã voucher chào mừng', 'Hỗ trợ khách hàng tiêu chuẩn']
        : ['1% spending points cashback', 'Welcome vouchers', 'Standard customer support'],
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      gradient: 'from-slate-600 via-slate-700 to-slate-800',
      textColor: 'text-slate-400',
    },
    {
      code: 'SILVER',
      name: isVietnamese ? 'Hội Viên Bạc' : 'Silver Member',
      rank: 2,
      minSpend: 100000,
      discount: 0,
      perks: isVietnamese
        ? ['Giảm giá theo CTKM hạng Bạc', 'Hoàn 2% khi nạp ví trực tuyến', 'Tặng voucher sinh nhật 30.000 ₫']
        : ['Discount applied via active promotion rules', '2% wallet top-up bonus', '30,000 ₫ birthday voucher'],
      badgeBg: 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-400 dark:border-slate-600',
      gradient: 'from-slate-400 via-zinc-500 to-slate-600',
      textColor: 'text-slate-300',
    },
    {
      code: 'GOLD',
      name: isVietnamese ? 'Hội Viên Vàng' : 'Gold Member',
      rank: 3,
      minSpend: 2000000,
      discount: 0,
      perks: isVietnamese
        ? ['Giảm giá theo CTKM hạng Vàng', 'Ưu tiên giữ máy 10 phút', 'Tặng voucher 50.000 ₫ mỗi tháng', 'Hoàn 3% khi nạp ví']
        : ['Discount applied via active promotion rules', '10-min machine reservation', '50,000 ₫ monthly voucher', '3% wallet top-up bonus'],
      badgeBg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      gradient: 'from-amber-400 via-yellow-500 to-amber-600',
      textColor: 'text-amber-400',
    },
    {
      code: 'PLATINUM',
      name: isVietnamese ? 'Bạch Kim VIP' : 'Platinum VIP',
      rank: 4,
      minSpend: 5000000,
      discount: 0,
      perks: isVietnamese
        ? ['Giảm giá theo CTKM Bạch Kim VIP', 'Miễn phí nước giặt xả cao cấp', 'Ưu tiên xếp máy tối đa', 'Hotline chăm sóc VIP 24/7']
        : ['VIP promotion discount', 'Complimentary premium detergent', 'Maximum machine priority', '24/7 dedicated VIP hotline'],
      badgeBg: 'bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800',
      gradient: 'from-cyan-400 via-blue-500 to-indigo-600',
      textColor: 'text-cyan-400',
    },
  ];

  const allTiers = (tiersList && tiersList.length > 0)
    ? tiersList
      .filter((t) => t.code !== 'GUEST' && t.rank > 0)
      .map((t, idx) => {
        const match = DEFAULT_TIERS.find((d) => d.code === t.code || d.rank === t.rank);
        const resolvedDiscount = Number(t.discount ?? match?.discount ?? 0);
        const dynamicPerks = (match?.perks || (t.bonus ? [t.bonus] : ['Đặc quyền thành viên'])).map((p) => {
          if (resolvedDiscount > 0 && (p.includes('Giảm') || p.includes('Discount') || p.includes('discount'))) {
            return isVietnamese
              ? `Giảm trực tiếp ${resolvedDiscount}% mọi đơn giặt sấy`
              : `${resolvedDiscount}% off all laundry orders`;
          }
          return p;
        });

        return {
          code: t.code || match?.code || 'STANDARD',
          name: t.name || match?.name || `Hạng ${idx + 1}`,
          rank: t.rank || (idx + 1),
          minSpend: Number(t.minSpend ?? match?.minSpend ?? 0),
          discount: resolvedDiscount,
          promotionRule: t.promotionRule || null,
          perks: dynamicPerks,
          badgeBg: match?.badgeBg || 'bg-slate-100 text-slate-700',
          gradient: match?.gradient || 'from-blue-500 to-indigo-600',
          textColor: match?.textColor || 'text-blue-400',
        };
      })
    : DEFAULT_TIERS;

  allTiers.sort((a, b) => a.rank - b.rank);

  // Tổng chi tiêu tích lũy & điểm thưởng của hội viên (1đ = 1 điểm theo tiền thực thanh toán các đơn hoàn thành)
  const memberPoints = Number(tierProgress?.points ?? profile?.points ?? wallet?.points ?? card?.points ?? user?.points ?? 0);
  const totalSpent = Number(tierProgress?.totalOriginalSpend ?? (memberPoints > 0 ? memberPoints : (wallet?.totalSpent ?? 0)));

  // Nhận diện hạng của member (từ API /api/member-tiers/me/progress hoặc profile/card)
  let currentTier = null;
  const rawTierCode = (tierProgress?.currentTier?.code || profile?.tier?.code || card?.tierCode || user?.tierCode || '').toUpperCase();
  if (rawTierCode) {
    currentTier = allTiers.find((t) => t.code.toUpperCase() === rawTierCode || rawTierCode.includes(t.code.toUpperCase()));
  }
  if (!currentTier) {
    const rawTierName = (tierProgress?.currentTier?.name || card?.tierName || wallet?.tierName || profile?.tier?.name || '').toUpperCase();
    if (rawTierName) {
      currentTier = allTiers.find((t) => rawTierName.includes(t.code) || rawTierName.includes(t.name.toUpperCase()));
    }
  }
  if (!currentTier) {
    const qualifying = allTiers.filter((t) => totalSpent >= t.minSpend);
    currentTier = qualifying.length > 0 ? qualifying[qualifying.length - 1] : allTiers[0];
  }

  let nextTier = null;
  if (tierProgress?.nextTier?.code) {
    nextTier = allTiers.find((t) => t.code.toUpperCase() === tierProgress.nextTier.code.toUpperCase());
  }
  if (!nextTier) {
    nextTier = allTiers.find((t) => t.rank === currentTier.rank + 1);
  }

  let progressPercent = tierProgress?.progressPercentage != null
    ? Math.min(100, Math.max(5, Math.round(tierProgress.progressPercentage)))
    : 100;
  let remainingSpend = tierProgress?.spendNeededForNextTier != null
    ? tierProgress.spendNeededForNextTier
    : 0;

  if (nextTier && tierProgress?.progressPercentage == null) {
    const tierFloor = currentTier.minSpend || 0;
    const targetSpend = nextTier.minSpend;
    const span = targetSpend - tierFloor;
    const progressInSpan = Math.max(0, totalSpent - tierFloor);
    progressPercent = span > 0 ? Math.min(100, Math.max(5, Math.round((progressInSpan / span) * 100))) : 100;
    remainingSpend = Math.max(0, targetSpend - totalSpent);
  }

  const tierNameDisplay = currentTier?.name || card?.tierName || wallet?.tierName || 'THÀNH VIÊN';
  const tierCodeDisplay = currentTier?.code || card?.tierCode || user?.tierCode || 'STANDARD';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-blue-600" />
            {isVietnamese ? 'Ví & Thẻ thành viên số' : 'Digital Card & Wallet'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isVietnamese
              ? 'Quản lý số dư ví, nạp tiền trực tuyến VietQR 24/7 và theo dõi lịch sử chi tiêu'
              : 'Manage wallet balance, instant VietQR 24/7 top-up, and track laundry spending'}
          </p>
        </div>
      </div>

      {depositSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-300 text-sm font-semibold animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{depositSuccess}</span>
          </div>
          <button
            onClick={() => {
              setDepositSuccess('');
              try {
                sessionStorage.removeItem('lc_recent_topup');
                const latestTopup = transactions.find(
                  (t) =>
                    (t.transactionType === 'TOPUP' || t.transaction_type === 'TOPUP') &&
                    (t.status === 'SUCCESS' || t.status === 'PAID')
                );
                if (latestTopup) {
                  localStorage.setItem('lc_dismissed_topup_' + latestTopup.transactionId, 'true');
                }
              } catch { }
            }}
            className="p-1 hover:bg-emerald-200/50 dark:hover:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400 cursor-pointer transition shrink-0"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Digital Member Card (Left) + Wallet Balance & Quick Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column: NFC/RFID Digital Membership Card + Kiosk Connect Banner */}
        <div className="flex flex-col justify-between space-y-4">
          {loadingCardAndWallet && !wallet && !card ? (
            <div className="relative overflow-hidden rounded-3xl p-7 bg-slate-900 border border-white/10 min-h-[270px] flex flex-col justify-between animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-6 w-32 bg-slate-800 rounded-lg" />
                <div className="h-6 w-24 bg-slate-800 rounded-full" />
              </div>
              <div className="flex justify-between items-center my-4">
                <div className="w-14 h-10 bg-slate-800 rounded-lg" />
                <div className="h-7 w-40 bg-slate-800 rounded-lg" />
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <div className="h-5 w-32 bg-slate-800 rounded-lg" />
                <div className="h-5 w-20 bg-slate-800 rounded-full" />
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-3xl p-7 text-white shadow-xl transition-all hover:scale-[1.01] bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 border border-white/10 flex flex-col justify-between min-h-[270px]">
              {/* Background glowing orbs */}
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

              {/* Top Row: Brand & Tier Badge */}
              <div className="flex items-center justify-between relative z-10 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-sm tracking-wider border border-white/10">
                    LC
                  </div>
                  <div>
                    <div className="font-extrabold text-base tracking-wide flex items-center gap-2">
                      LAUNDROCHAIN
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    </div>
                    <div className="text-[10px] text-white/70 tracking-widest uppercase">
                      {isVietnamese ? 'Thẻ thành viên số' : 'Digital Member Card'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 rotate-90 text-white/70" />
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/15 backdrop-blur-md border border-white/20 text-amber-200 shadow-sm font-mono">
                    {tierCodeDisplay}
                  </span>
                </div>
              </div>

              {/* Middle Row: EMV Chip & Member Code */}
              <div className="flex items-center justify-between relative z-10 my-3">
                {/* Gold Chip Graphic */}
                <div className="w-14 h-10 rounded-lg bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 p-1 flex items-center justify-center shadow-inner">
                  <div className="w-10 h-7 border border-amber-700/30 rounded-sm grid grid-cols-2 gap-0.5 p-0.5">
                    <div className="border-r border-b border-amber-800/20"></div>
                    <div className="border-b border-amber-800/20"></div>
                    <div className="border-r border-amber-800/20"></div>
                    <div></div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-white/70 font-medium">
                    {isVietnamese ? 'Mã hội viên' : 'Member Code'}
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="font-mono font-black text-xl tracking-widest text-white">
                      {memberCodeDisplay}
                    </span>
                    {memberCodeDisplay !== '-' && (
                      <button
                        onClick={() => handleCopyCode(memberCodeDisplay)}
                        className="p-1 hover:bg-white/15 rounded-md transition text-white/70 hover:text-white cursor-pointer"
                        title="Sao chép mã"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Member Name & Active Status & Points */}
              <div className="flex items-end justify-between relative z-10 pt-3 border-t border-white/15">
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-white/70 font-medium">
                    {isVietnamese ? 'Chủ thẻ' : 'Cardholder'}
                  </div>
                  <div className="font-bold text-sm uppercase tracking-wider text-white">
                    {memberNameDisplay}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{isVietnamese ? 'HOẠT ĐỘNG' : 'ACTIVE'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Wallet Balance & Quick Actions */}
        {loadingCardAndWallet && !wallet ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-5.5 shadow-sm flex flex-col justify-between space-y-3 animate-pulse min-h-[270px]">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-7 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              </div>
              <div className="w-7 h-7 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            </div>
            <div className="h-14 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
            <div className="h-7 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-5.5 shadow-sm flex flex-col justify-between min-h-[250px] space-y-4">
            {/* Top row: Balance Header & Refresh */}
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-blue-600" />
                  {isVietnamese ? 'Số dư ví khả dụng' : 'Available Wallet Balance'}
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight flex items-baseline gap-1.5">
                  {(wallet?.balance ?? 0).toLocaleString('vi-VN')}
                  <span className="text-base text-blue-600 font-bold">{wallet?.currency || 'VND'}</span>
                </div>
              </div>

              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title={isVietnamese ? 'Làm mới số dư' : 'Refresh balance'}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>

            {/* Quick Top-up Preset Buttons + Custom Amount Input */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{isVietnamese ? 'Nạp tiền vào ví qua PayOS VietQR:' : 'Top Up via PayOS VietQR:'}</span>
                <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3" /> {isVietnamese ? 'Tự động 24/7' : 'Instant 24/7'}
                </span>
              </div>

              {/* Preset buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {[50000, 100000, 200000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleOpenTopupModal(amt)}
                    className="py-2 px-1 text-[11px] font-extrabold rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 text-slate-800 dark:text-slate-200 transition text-center cursor-pointer shadow-xs active:scale-95"
                  >
                    +{amt.toLocaleString('vi-VN')} ₫
                  </button>
                ))}
              </div>

              {/* Custom Amount Input Row */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCustomTopup(customTopupAmount);
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customTopupAmount}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '');
                      if (!clean) {
                        setCustomTopupAmount('');
                        return;
                      }
                      const num = parseInt(clean, 10);
                      setCustomTopupAmount(num.toLocaleString('vi-VN'));
                    }}
                    placeholder={
                      isVietnamese
                        ? 'Nhập số tiền khác (VD: 30.000)...'
                        : 'Enter other amount (e.g. 30,000)...'
                    }
                    className="w-full px-3 py-1.5 pr-7 text-xs font-bold bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal transition"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    ₫
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!customTopupAmount}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{isVietnamese ? 'Nạp tiền' : 'Top up'}</span>
                </button>
              </form>
            </div>

            {/* Security Assurance & Transfer Notes - Single compact line */}
            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="leading-tight">
                {isVietnamese
                  ? 'Tự động cộng số dư 24/7 khi chuyển đúng số tiền & nội dung VietQR.'
                  : 'Auto-credited 24/7 with exact amount & VietQR memo.'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* KHỐI HẠNG THÀNH VIÊN & LỘ TRÌNH THĂNG HẠNG (TIER PROGRESS) */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              {isVietnamese ? 'Cấp độ thành viên & Lộ trình thăng hạng' : 'Membership Tier & Level Progression'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isVietnamese
                ? 'Tích lũy chi tiêu tự động sau mỗi lần giặt sấy để thăng cấp và hưởng chiết khấu trực tiếp trọn đời'
                : 'Accumulate laundry spending automatically to level up and unlock lifetime discounts'}
            </p>
          </div>

        </div>

        {/* Hero Card: Current Tier Status & Live Progression Bar */}
        <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-white/10 shadow-lg space-y-5">
          {/* Subtle glowing orbs */}
          <div className="absolute -right-16 -top-16 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-60 h-60 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Row: Current Tier & Status Badge */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
                <Crown className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">
                    {isVietnamese ? 'Hạng thành viên hiện tại' : 'Current Tier'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black bg-white/15 backdrop-blur-md border border-white/20 text-white tracking-wider">
                    {currentTier.code}
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5 mt-0.5">
                  <span>{currentTier.name}</span>
                  {currentTier.discount > 0 ? (
                    <span
                      title={currentTier.promotionRule?.name ? `Khuyến mãi: ${currentTier.promotionRule.name}` : undefined}
                      className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xs"
                    >
                      GIẢM {currentTier.discount}% THEO HẠNG
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-white/20 text-slate-200">
                      TÍCH ĐIỂM 1%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Points stats pill */}
            <div className="sm:text-right bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 self-start sm:self-center">
              <div className="text-[11px] text-white/70 font-medium">
                {isVietnamese ? 'Điểm tích lũy' : 'Reward Points'}
              </div>
              <div className="font-mono font-black text-lg text-amber-300">
                {memberPoints.toLocaleString('vi-VN')} pts
              </div>
            </div>
          </div>

          {/* Progression Bar */}
          <div className="relative z-10 space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-white/80 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {nextTier ? (
                  <span>
                    {isVietnamese ? `Tiến trình lên hạng ${nextTier.name}` : `Progress to ${nextTier.name}`}
                    <span className="text-white/60 font-normal"> ({memberPoints.toLocaleString('vi-VN')} / {nextTier.minSpend.toLocaleString('vi-VN')} pts)</span>
                  </span>
                ) : (
                  <span className="text-amber-300 font-extrabold">{isVietnamese ? '👑 Bạn đã đạt cấp độ thành viên cao nhất!' : '👑 Highest tier reached!'}</span>
                )}
              </span>
              <span className="font-mono text-sm text-amber-300 font-black">{progressPercent}%</span>
            </div>

            {/* Outer Progress Track */}
            <div className="w-full h-3 rounded-full bg-white/15 overflow-hidden p-0.5 backdrop-blur-sm border border-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-amber-300 transition-all duration-700 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Bottom Motivation Message */}
            <div className="pt-1">
              {nextTier ? (
                <p className="text-xs text-white/85 flex items-center gap-1.5">
                  <span className="text-amber-300 font-bold">⚡ Cần thêm:</span>
                  <span>
                    {isVietnamese
                      ? `Tích lũy thêm ${remainingSpend.toLocaleString('vi-VN')} điểm nữa để thăng hạng ${nextTier.name}${nextTier.discount > 0 ? ` và tự động hưởng giảm ${nextTier.discount}% mọi đơn giặt!` : '!'}`
                      : `Earn ${remainingSpend.toLocaleString('vi-VN')} more points to reach ${nextTier.name}${nextTier.discount > 0 ? ` and get ${nextTier.discount}% off!` : '!'}`}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isVietnamese
                      ? `Tuyệt vời! Bạn đang nhận mức chiết khấu ${currentTier.discount > 0 ? `${currentTier.discount}% ` : ''}và toàn bộ quyền lợi VIP cao cấp nhất.`
                      : `You are enjoying maximum ${currentTier.discount > 0 ? `${currentTier.discount}% ` : ''}discount and all VIP perks.`}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Table - Full Width */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-500" />
              {isVietnamese ? 'Lịch sử biến động số dư ví' : 'Wallet Transaction History'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isVietnamese
                ? 'Toàn bộ giao dịch nạp tiền VietQR và thanh toán đơn giặt được lưu trữ minh bạch'
                : 'Transparent ledger of all wallet deposits and laundry payments'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTxFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${txFilter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {isVietnamese ? 'Tất cả' : 'All'} ({transactions.length})
            </button>
            <button
              onClick={() => setTxFilter('TOPUP')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${txFilter === 'TOPUP'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {isVietnamese ? 'Nạp tiền' : 'Top-up'}
            </button>
            <button
              onClick={() => setTxFilter('PAYMENT')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${txFilter === 'PAYMENT'
                ? 'bg-white dark:bg-slate-700 text-red-500 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {isVietnamese ? 'Thanh toán' : 'Payment'}
            </button>
          </div>
        </div>

        {loadingTxs && transactions.length === 0 ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Thời gian</th>
                  <th className="py-3 px-3">Loại giao dịch</th>
                  <th className="py-3 px-3">Mã đơn / Mã GD</th>
                  <th className="py-3 px-3">Số tiền</th>
                  <th className="py-3 px-3">Số dư sau</th>
                  <th className="py-3 px-3">Phương thức</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-4 rounded-r-xl">Nội dung ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((tx) => {
                  const isPositive = tx.transactionType === 'TOPUP' || tx.transactionType === 'REFUND';
                  return (
                    <tr key={tx.transactionId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] ${isPositive
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            }`}
                        >
                          {isPositive ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {tx.transactionType === 'TOPUP'
                            ? 'Nạp tiền ví'
                            : tx.transactionType === 'PAYMENT'
                              ? 'Thanh toán đơn'
                              : tx.transactionType}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {tx.orderCode || tx.orderId ? (
                          <Link
                            to={`/orders?search=${tx.orderCode || tx.orderId}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            title={isVietnamese ? 'Xem chi tiết đơn hàng và điểm tích lũy' : 'View order details and points'}
                          >
                            <span>{tx.orderCode || tx.orderId.slice(0, 8)}</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td
                        className={`py-3.5 px-3 font-extrabold text-sm whitespace-nowrap ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                          }`}
                      >
                        {isPositive ? '+' : '-'}
                        {Math.abs(tx.amount).toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {(tx.balanceAfter ?? 0).toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {tx.paymentMethod || 'WALLET'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${tx.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                        >
                          {tx.status === 'SUCCESS' ? 'Thành công' : tx.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 truncate max-w-xs">
                        {tx.description || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 text-sm space-y-2">
            <Coins className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <div>
              {isVietnamese ? 'Chưa có giao dịch biến động số dư nào.' : 'No wallet transactions found.'}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================= */}
      {/* MODAL: CHỈ HIỂN THỊ DUY NHẤT MÃ QR CỐ ĐỊNH CHÍNH GIỮA */}
      {/* ======================================================= */}
      {topupModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => {
              stopTopupPolling();
              setTopupModalOpen(false);
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in cursor-pointer select-none"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 sm:p-4 shadow-2xl text-slate-900 dark:text-white relative flex flex-col items-center justify-center max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl w-auto max-h-[94vh] animate-in zoom-in-95 duration-200 cursor-default"
            >
              {/* Modal Body: Switch between QR View, Success View, and Failed View */}
              {payOsModalStep === 'SUCCESS' ? (
                /* ======================================================== */
                /* MÀN HÌNH THANH TOÁN THÀNH CÔNG                          */
                /* ======================================================== */
                <div className="text-center space-y-5 w-full p-3 sm:p-4">
                  <div className="relative inline-block mx-auto">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center shadow">
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">
                      {isVietnamese ? 'Nạp Tiền Thành Công!' : 'Payment Successful!'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {isVietnamese
                        ? 'Tiền đã được nạp thành công vào ví LaundroChain của bạn.'
                        : 'Funds have been credited to your LaundroChain wallet.'}
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      {isVietnamese ? 'Số tiền đã cộng vào ví' : 'Amount Added'}
                    </div>
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-300 mt-0.5 font-mono">
                      +{(payOsSuccessData?.amount || selectedTopupAmount).toLocaleString('vi-VN')} ₫
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-left text-xs space-y-1.5">
                    {payOsSuccessData?.orderCode && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">{isVietnamese ? 'Mã đơn PayOS:' : 'PayOS Order:'}</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                          #{payOsSuccessData.orderCode}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isVietnamese ? 'Số dư khả dụng mới:' : 'New Balance:'}</span>
                      <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                        {(payOsSuccessData?.balanceAfter ?? wallet?.balance ?? 0).toLocaleString('vi-VN')}{' '}
                        {wallet?.currency || 'VND'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isVietnamese ? 'Thời gian:' : 'Time:'}</span>
                      <span className="font-mono text-slate-500">{new Date().toLocaleString('vi-VN')}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTopupModalOpen(false);
                    }}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-95"
                  >
                    {isVietnamese ? 'Hoàn tất & Đóng' : 'Done & Close'}
                  </button>
                </div>
              ) : payOsModalStep === 'FAILED' ? (
                /* ======================================================== */
                /* MÀN HÌNH THANH TOÁN THẤT BẠI                            */
                /* ======================================================== */
                <div className="text-center space-y-4 w-full p-3 sm:p-4">
                  <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-lg shadow-rose-500/20 mx-auto">
                    <XCircle className="w-9 h-9 stroke-[2.5]" />
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">
                      {isVietnamese ? 'Thanh Toán Chưa Hoàn Tất' : 'Payment Incomplete or Cancelled'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {isVietnamese
                        ? 'Giao dịch đã bị hủy hoặc hết thời gian chờ thanh toán. Tài khoản ngân hàng của bạn chưa bị trừ tiền.'
                        : 'The transaction was cancelled or expired. No money has been deducted from your bank.'}
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-left text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      {isVietnamese
                        ? 'Nếu tiền trong tài khoản ngân hàng của bạn đã bị trừ, hệ thống sẽ tự động cập nhật số dư khi đối soát hoàn tất.'
                        : 'If your bank account was debited, your wallet balance will automatically update once bank reconciliation finishes.'}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPayOsModalStep('QR');
                        createPayOsTopup(selectedTopupAmount);
                      }}
                      className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>{isVietnamese ? 'Thử tạo mã lại' : 'Try Again'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopupModalOpen(false)}
                      className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      {isVietnamese ? 'Đóng' : 'Close'}
                    </button>
                  </div>
                </div>
              ) : (
                /* ======================================================== */
                /* CHỈ HIỂN THỊ MÃ QR + LƯU Ý SỐ TIỀN & NỘI DUNG            */
                /* ======================================================== */
                <div className="flex flex-col items-center justify-center p-0.5 w-full">
                  {topupLoading ? (
                    <div className="w-80 h-80 sm:w-96 sm:h-96 md:w-[440px] md:h-[440px] flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-12 h-12 animate-spin text-blue-600" />
                      <span className="text-xs text-slate-500 font-medium">
                        {isVietnamese ? 'Đang tạo mã VietQR...' : 'Generating VietQR...'}
                      </span>
                    </div>
                  ) : payOsTopupData?.qrImageUrl || payOsTopupData?.qrUrl || payOsTopupData?.qrCode ? (
                    <>
                      <img
                        src={
                          payOsTopupData.qrImageUrl ||
                          payOsTopupData.qrUrl ||
                          `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                            payOsTopupData.qrCode
                          )}`
                        }
                        alt="VietQR PayOS"
                        className="w-84 h-auto sm:w-96 md:w-[440px] lg:w-[480px] max-w-[92vw] max-h-[75vh] object-contain rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800"
                      />

                      {/* Trạng thái tự động nhận diện thanh toán */}
                      <div className="mt-3.5 w-full flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span>
                          {isVietnamese
                            ? 'Hệ thống đang tự động nhận diện thanh toán từ ngân hàng...'
                            : 'Waiting for payment confirmation (auto detecting)...'}
                        </span>
                      </div>

                      {/* Các nút hỗ trợ mở trang thanh toán hoặc demo */}
                      <div className="mt-3.5 w-full max-w-sm space-y-2">
                        {payOsTopupData?.checkoutUrl && (
                          <a
                            href={payOsTopupData.checkoutUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2.5 px-4 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-800 transition flex items-center justify-center gap-2"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{isVietnamese ? 'Mở cổng thanh toán PayOS (Mở tab mới)' : 'Open PayOS Payment Page'}</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            handlePaymentSuccess(
                              selectedTopupAmount,
                              (wallet?.balance || 0) + selectedTopupAmount,
                              payOsTopupData?.payOsOrderCode || Date.now(),
                              payOsTopupData?.transactionId
                            )
                          }
                          className="w-full py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>{isVietnamese ? '⚡ Giả lập thanh toán thành công (Demo / Test)' : '⚡ Simulate Success (Demo / Test)'}</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="w-80 h-80 sm:w-96 sm:h-96 flex flex-col items-center justify-center text-slate-400 text-xs">
                      <span>{isVietnamese ? 'Không thể tạo mã VietQR' : 'Unable to generate VietQR'}</span>
                      <button
                        type="button"
                        onClick={() => createPayOsTopup(selectedTopupAmount)}
                        className="mt-2 text-blue-600 font-bold cursor-pointer hover:underline"
                      >
                        {isVietnamese ? 'Thử lại' : 'Retry'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
