import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import QRCode from 'qrcode';
import { memberApi } from '../api/memberApi';
import { machinesApi } from '../api/machinesApi';
import { ordersApi } from '../api/ordersApi';
import { walletsApi } from '../api/walletsApi';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  Crown,
  WashingMachine,
  Check,
  ChevronRight,
  Clock,
  ShieldCheck,
  AlertCircle,
  QrCode,
  ScanLine,
  X,
  Zap,
  RotateCw,
  Monitor,
  Ticket,
  Tag,
  Sparkles,
  Gift,
  CheckCircle2,
  Wind,
  Wallet,
  Info,
  Calendar,
  Users,
  User,
  Phone,
  Edit3,
  Loader2,
  ArrowRight,
  Copy,
  Building2,
  Store,
  MapPin,
  ChevronDown,
  Wrench,
} from 'lucide-react';

// Helper lọc chu trình tương thích chính xác theo dòng máy từ Backend
export function getCompatibleCyclesForMachine(machine) {
  if (!machine) return [];

  const isDryer = machine.kind === 'DRYER' || machine.className?.toLowerCase().includes('sấy') || machine.code?.startsWith('D');
  const is15Kg = (machine.capacityKg && machine.capacityKg >= 15) || machine.className?.includes('15kg');

  // Lấy danh sách dịch vụ tương thích trả về từ backend API
  if (Array.isArray(machine.compatibleOfferings) && machine.compatibleOfferings.length > 0) {
    const validOfferings = machine.compatibleOfferings.filter((o) => {
      const cat = (o.serviceCategory || '').toUpperCase();
      const code = (o.code || '').toUpperCase();
      const name = (o.name || '').toLowerCase();
      if (isDryer) {
        return cat.includes('DRY') || cat.includes('SẤY') || cat.includes('SAY') || code.startsWith('DRY') || code.startsWith('D') || name.includes('sấy');
      }
      return cat.includes('WASH') || cat.includes('GIẶT') || cat.includes('GIAT') || code.startsWith('WASH') || code.startsWith('W') || code.startsWith('CYCLE') || name.includes('giặt');
    });

    const finalOfferings = validOfferings.length > 0 ? validOfferings : machine.compatibleOfferings;

    return finalOfferings.map((o, idx) => {
      const cleanName = (o.name || '')
        .replace(/\s*(?:Giá\s*2\.?000|Giá\s*2K)/gi, '')
        .trim();
      const duration = o.durationMin || (isDryer ? 45 : (is15Kg ? 45 : 35));
      const price = Number(o.basePrice ?? o.unitPrice ?? o.price ?? 0);
      return {
        id: 'off-' + (o.offeringId || idx),
        offeringId: o.offeringId,
        cycleCode: o.code,
        name: cleanName || o.name,
        time: duration + ' phút',
        durationMin: duration,
        price: price,
        desc: o.description || (isDryer ? 'Dịch vụ sấy khô nhiệt chuyên dụng' : 'Dịch vụ giặt tiêu chuẩn tự động cấp nước giặt xả'),
        badge: isDryer ? 'Sấy nhiệt Gas' : (is15Kg ? 'Máy lớn 15kg' : (price <= 25000 ? 'Tiết kiệm' : 'Tiêu chuẩn')),
        category: isDryer ? 'DRY' : 'WASH',
      };
    });
  }

  return [];
}

export default function NewOrderPage() {
  const { isVietnamese } = useLanguage();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Nhận diện người dùng là Member (đã đăng nhập tài khoản) hay Khách vãng lai (Guest)
  const isGuest = Boolean(user?.isGuest || !user);
  const isMember = !isGuest;

  // Top-up success banner state (khi được redirect từ trang nạp tiền thành công)
  const [topupSuccessNotice, setTopupSuccessNotice] = useState(() => {
    const search = new URLSearchParams(location.search);
    const isPaid = search.get('status')?.toUpperCase() === 'PAID' || search.get('code') === '00' || search.get('topup') === 'success';
    return Boolean(location.state?.topupSuccess || isPaid);
  });
  const [topupAmount, setTopupAmount] = useState(() => {
    const search = new URLSearchParams(location.search);
    return location.state?.amount || search.get('amount') || null;
  });

  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const isPaid = search.get('status')?.toUpperCase() === 'PAID' || search.get('code') === '00' || search.get('topup') === 'success';
    if (location.state?.topupSuccess || isPaid) {
      setTopupSuccessNotice(true);
      setTopupAmount(location.state?.amount || search.get('amount') || null);
    }
  }, [location.state, location.search]);

  // 4 Steps: 1. Chọn máy -> 2. Chu trình giặt -> 3. Ưu đãi Voucher -> 4. Thanh toán QR Ki-ốt
  const [step, setStep] = useState(1);

  // Sites & Kiosk Station assignment state
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(() => {
    const savedId = localStorage.getItem('laundro_kiosk_site_id');
    const savedName = localStorage.getItem('laundro_kiosk_site_name');
    const savedCode = localStorage.getItem('laundro_kiosk_site_code');
    const savedAddress = localStorage.getItem('laundro_kiosk_site_address');
    if (savedId) {
      return {
        siteId: savedId,
        id: savedId,
        name: savedName || 'Trạm Ki-ốt',
        code: savedCode || '',
        address: savedAddress || '',
      };
    }
    return null;
  });
  const [loadingSites, setLoadingSites] = useState(false);
  const [showSiteSelectorModal, setShowSiteSelectorModal] = useState(false);

  // Machine state (Connected to GET /api/machines/available)
  const [machines, setMachines] = useState([]);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [machineError, setMachineError] = useState('');
  const [machineFilter, setMachineFilter] = useState('ALL'); // ALL | WASHER | DRYER
  const [selectedMachine, setSelectedMachine] = useState(null);

  // Gán Ki-ốt sang trạm khác và nạp danh sách máy của trạm đó
  const handleSelectSite = (site) => {
    if (!site) return;
    const targetSiteId = site.siteId || site.id;
    const siteObj = {
      ...site,
      siteId: targetSiteId,
      id: targetSiteId,
      name: site.name || 'Trạm Ki-ốt',
      code: site.code || '',
      address: site.address || '',
    };
    setSelectedSite(siteObj);
    localStorage.setItem('laundro_kiosk_site_id', targetSiteId);
    localStorage.setItem('laundro_kiosk_site_name', site.name || '');
    localStorage.setItem('laundro_kiosk_site_code', site.code || '');
    localStorage.setItem('laundro_kiosk_site_address', site.address || '');

    // Reset máy, chu trình, báo giá & đơn hiện tại
    setSelectedMachine(null);
    setSelectedCycle(null);
    setLiveQuote(null);
    setKioskOrder(null);
    setKioskQrUrl('');
    setErrorMsg('');
    setShowSiteSelectorModal(false);

    // Tải lại danh sách máy theo site mới
    loadMachines(false, targetSiteId);
  };

  // Cycle state
  const [selectedCycle, setSelectedCycle] = useState(null);

  // Hàm chọn máy thông minh: tự động chọn chu trình tương thích và nạp dịch vụ nếu cần
  const handleSelectMachine = async (m) => {
    if (m.status !== 'AVAILABLE') return;
    setSelectedMachine(m);
    setErrorMsg('');

    let comp = getCompatibleCyclesForMachine(m);
    if (comp.length === 0 && m.machineId) {
      try {
        const services = await machinesApi.getCompatibleServices(m.machineId);
        if (Array.isArray(services) && services.length > 0) {
          m.compatibleOfferings = services;
          comp = getCompatibleCyclesForMachine(m);
        }
      } catch (e) {
        console.warn('Could not load machine services', e);
      }
    }

    if (comp.length > 0) {
      const isCurrentValid = comp.some((c) => c.offeringId === selectedCycle?.offeringId);
      if (!isCurrentValid) {
        setSelectedCycle(comp[0]);
      }
    }
  };

  // Hàm chuyển tab lọc máy
  const handleFilterChange = (filterType) => {
    setMachineFilter(filterType);
  };

  // Tự động đồng bộ chu trình khi máy thay đổi
  useEffect(() => {
    if (selectedMachine) {
      setErrorMsg('');
      const comp = getCompatibleCyclesForMachine(selectedMachine);
      if (comp.length > 0) {
        const isCurrentValid = comp.some((c) => c.offeringId === selectedCycle?.offeringId);
        if (!isCurrentValid) {
          setSelectedCycle(comp[0]);
        }
      }
    }
  }, [selectedMachine]);

  // Voucher state
  const [vouchersList, setVouchersList] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [customVoucherInput, setCustomVoucherInput] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [voucherSuccess, setVoucherSuccess] = useState('');
  const [loadingVouchers, setLoadingVouchers] = useState(false);

  // Chuẩn hóa và nhận diện chính xác kiểu giảm giá (phần trăm % hoặc số tiền ₫)
  function resolveVoucherDiscount(v) {
    if (!v) return null;
    const rawType = (v.discountType || v.actionType || v.type || '').toUpperCase();
    const rawVal = Number(v.discountValue ?? v.actionValue ?? v.value ?? v.percent ?? v.fixedAmount ?? 0);
    const code = (v.code || '').toUpperCase();
    const name = (v.campaignName || v.name || '').toUpperCase();
    const desc = (v.message || v.desc || '').toUpperCase();

    let isPercent = false;
    let percent = 0;
    let fixedAmount = 0;

    // Phân định chính xác theo DiscountType hoặc giá trị:
    if (rawType.includes('PERCENT')) {
      isPercent = true;
      percent = rawVal > 0 && rawVal <= 100 ? rawVal : 10;
    } else if (rawType.includes('AMOUNT') || rawType === 'FIXED_AMOUNT' || rawType === 'FIXED_DISCOUNT') {
      isPercent = false;
      fixedAmount = rawVal > 0 ? rawVal : 10000;
    } else if (code === 'SUMMER10' || code.includes('SUMMER10') || name.includes('SUMMER10') || name.includes('10%')) {
      isPercent = true;
      percent = rawVal > 0 && rawVal <= 100 ? rawVal : 10;
    } else if (code === 'WELCOME10K' || code.includes('WELCOME10K') || code.includes('10K') || name.includes('10K')) {
      isPercent = false;
      fixedAmount = rawVal > 100 ? rawVal : 10000;
    } else if (code === 'GIATHE2026' || code.includes('GIATHE2026')) {
      isPercent = false;
      fixedAmount = rawVal > 100 ? rawVal : 10000;
    } else if (rawVal > 100) {
      isPercent = false;
      fixedAmount = rawVal;
    } else if (code.includes('50K') || name.includes('50K') || desc.includes('50K') || desc.includes('50.000')) {
      isPercent = false;
      fixedAmount = 50000;
    } else if (code.includes('20K') || name.includes('20K') || desc.includes('20K') || desc.includes('20.000')) {
      isPercent = false;
      fixedAmount = 20000;
    } else if (code.includes('30K') || name.includes('30K') || desc.includes('30K') || desc.includes('30.000')) {
      isPercent = false;
      fixedAmount = 30000;
    } else if (rawVal > 0 && rawVal <= 100) {
      isPercent = true;
      percent = rawVal;
    } else {
      fixedAmount = 10000;
    }

    const maxDiscount = v.maxDiscount ? Number(v.maxDiscount) : (isPercent ? 30000 : null);
    const calculatedDiscount = v.calculatedDiscount !== null && v.calculatedDiscount !== undefined ? Number(v.calculatedDiscount) : null;
    const badgeDiscountLabel = isPercent ? `GIẢM ${percent}%` : `GIẢM ${fixedAmount.toLocaleString('vi-VN')} ₫`;
    const shortDiscountLabel = isPercent ? `Giảm ${percent}%` : `Giảm ${fixedAmount.toLocaleString('vi-VN')} ₫`;
    const minOrderSubtotal = Number(v.minOrderSubtotal || v.minSubtotal || 0);

    return {
      ...v,
      id: v.voucherId || v.code,
      voucherId: v.voucherId,
      code: v.code,
      name: v.campaignName || v.name || ('Ưu đãi ' + v.code),
      desc: v.message || v.desc || (isPercent ? `Giảm ngay ${percent}% cho đơn giặt sấy` : `Giảm ngay ${fixedAmount.toLocaleString('vi-VN')} ₫ cho đơn giặt sấy`),
      type: isPercent ? 'PERCENT' : 'FIXED',
      isPercent,
      discountType: isPercent ? 'PERCENT_OFF' : 'AMOUNT_OFF',
      discountValue: isPercent ? percent : fixedAmount,
      percent,
      fixedAmount,
      value: calculatedDiscount || (isPercent ? percent : fixedAmount),
      calculatedDiscount,
      maxDiscount,
      minOrderSubtotal,
      minSubtotal: minOrderSubtotal,
      badgeDiscountLabel,
      shortDiscountLabel,
      memberOnly: !!v.memberOnly,
      badge: v.memberOnly ? 'HỘI VIÊN' : 'TẤT CẢ KHÁCH HÀNG',
      validFrom: v.validFrom ? new Date(v.validFrom).toLocaleDateString('vi-VN') : null,
      validTo: v.validTo ? new Date(v.validTo).toLocaleDateString('vi-VN') : null,
      expiry: v.validTo ? `HSD: ${new Date(v.validTo).toLocaleDateString('vi-VN')}` : 'Còn hiệu lực',
      remainingUses: v.remainingUses,
      color: isPercent ? 'from-indigo-600 to-blue-600' : 'from-emerald-600 to-teal-600',
    };
  }

  // Lấy danh sách mã voucher khả dụng (trực tiếp từ API /api/vouchers/available)
  async function loadAvailableVouchers(subtotal = null, targetMemberId = null) {
    setLoadingVouchers(true);
    try {
      const combined = [];
      const seenCodes = new Set();

      // 1. Lấy từ API /api/vouchers/available
      try {
        const memberIdToUse = targetMemberId || (isMember ? (profile?.memberId || user?.memberId || user?.userId) : null);
        const availVouchers = await ordersApi.getAvailableVouchers(subtotal, memberIdToUse);
        const list = Array.isArray(availVouchers) ? availVouchers : (availVouchers?.value || []);
        list.forEach((v) => {
          if (v && v.code && !seenCodes.has(v.code.toUpperCase())) {
            seenCodes.add(v.code.toUpperCase());
            combined.push(v);
          }
        });
      } catch (e1) {
        console.warn('API getAvailableVouchers note', e1);
      }

      const mapped = combined.map(resolveVoucherDiscount).filter(Boolean);
      setVouchersList(mapped);

      // Nếu voucher đang chọn không còn nằm trong danh sách khả dụng (ví dụ đã dùng hết lượt), tự động hủy chọn
      setSelectedVoucher((prev) => {
        if (!prev) return null;
        const stillAvailable = mapped.some((v) => v.code && v.code.toUpperCase() === prev.code.toUpperCase());
        return stillAvailable ? prev : null;
      });
    } catch (err) {
      console.warn('Error loading vouchers', err);
      setVouchersList([]);
    } finally {
      setLoadingVouchers(false);
    }
  }

  // Live Backend Pricing Quote
  const [liveQuote, setLiveQuote] = useState(null);

  // Profile & Wallet state
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Guest inputs (mỗi lần là một lần nhập độc lập trên Ki-ốt, không lưu lại của người trước)
  const [guestName, setGuestName] = useState(() => {
    return (!user?.isGuest && user?.fullName ? user.fullName : '');
  });
  const [guestPhone, setGuestPhone] = useState(() => {
    return (!user?.isGuest && (user?.phone || user?.phoneNumber) ? user.phone || user.phoneNumber : '');
  });

  // Modal yêu cầu nhập họ tên và số điện thoại trước khi thanh toán
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [modalCustomerName, setModalCustomerName] = useState('');
  const [modalCustomerPhone, setModalCustomerPhone] = useState('');
  const [modalInputError, setModalInputError] = useState('');

  // Kiosk QR Modal state
  const [kioskModalOpen, setKioskModalOpen] = useState(false);
  const [kioskOrder, setKioskOrder] = useState(null);
  const [kioskQrUrl, setKioskQrUrl] = useState('');
  const [payingAndStarting, setPayingAndStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const sessionCreatingRef = useRef(false);

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    try {
      navigator.clipboard?.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (e) {
      console.warn('Copy error', e);
    }
  };

  // Payment success modal state
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [successCountdown, setSuccessCountdown] = useState(5);

  // Chuyển hướng sang trang Quản lý Đơn giặt (trạng thái vẫn giữ CONFIRMED để khách tự bấm Bắt đầu)
  const handleGoToOrders = useCallback(() => {
    navigate('/dashboard/my-orders', {
      state: {
        paymentSuccess: true,
        phone: guestPhone || profile?.phoneNumber || user?.phone || user?.phoneNumber || '',
        orderCode: paymentSuccessData?.orderCode || kioskOrder?.orderCode || '',
        orderId: paymentSuccessData?.orderId || kioskOrder?.orderId || '',
      },
    });
  }, [navigate, guestPhone, profile?.phoneNumber, user?.phone, user?.phoneNumber, paymentSuccessData?.orderCode, paymentSuccessData?.orderId, kioskOrder?.orderCode, kioskOrder?.orderId]);

  // Đếm ngược tự động chuyển sang trang đơn hàng
  useEffect(() => {
    if (!paymentSuccessData) return;
    setSuccessCountdown(5);
    const timer = setInterval(() => {
      setSuccessCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleGoToOrders();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [paymentSuccessData, handleGoToOrders]);


  // Đảm bảo mã QR và session thanh toán được reset khi thay đổi máy, chu trình hoặc voucher
  useEffect(() => {
    setKioskOrder(null);
    setKioskQrUrl('');
  }, [selectedMachine?.machineId, selectedCycle?.offeringId, selectedVoucher?.code]);

  // Tự động tạo phiên thanh toán PayOS khi ở Bước 4 nếu chưa có đơn hàng
  useEffect(() => {
    if (step === 4 && !kioskOrder && !submitting && selectedMachine) {
      const hasGuestInfo = Boolean(guestName.trim() && guestPhone.trim());
      if (isMember || hasGuestInfo) {
        handleCreateSession();
      }
    }
  }, [step, kioskOrder?.orderId, submitting, selectedMachine, isMember, guestName, guestPhone]);

  // Tải danh sách máy khả dụng từ Backend API và sắp xếp tối ưu theo Site
  const loadMachines = useCallback(async (silent = false, siteIdOverride = null) => {
    if (!silent) setLoadingMachines(true);
    setMachineError('');
    try {
      const activeSiteId = siteIdOverride || selectedSite?.siteId || localStorage.getItem('laundro_kiosk_site_id');
      const data = await machinesApi.getAvailableMachines(activeSiteId ? { siteId: activeSiteId } : {});
      let list = Array.isArray(data) ? data : (data?.value || []);

      // Lọc chính xác máy thuộc đúng site nếu đã xác định site
      if (activeSiteId) {
        list = list.filter((m) => !m.siteId || m.siteId === activeSiteId);
      }

      const mapped = list.map((m) => {
        const isDryer = m.kind === 'DRYER' || m.machineClassName?.toLowerCase().includes('sấy') || m.code?.startsWith('D');
        const rawStatus = (m.status || (m.isAvailable ? 'AVAILABLE' : 'BUSY')).toUpperCase();
        const hasActiveHold = Boolean(
          m.heldByOrderId ||
          (m.heldUntil && new Date(m.heldUntil).getTime() > Date.now())
        );
        let status = rawStatus;
        if (rawStatus === 'HELD' || (rawStatus === 'AVAILABLE' && hasActiveHold)) {
          status = 'BUSY';
        } else if (['MAINTENANCE', 'ERROR', 'OFFLINE'].includes(rawStatus)) {
          status = 'MAINTENANCE';
        } else if (rawStatus !== 'AVAILABLE') {
          status = 'BUSY';
        }

        return {
          machineId: m.machineId,
          siteId: m.siteId || activeSiteId,
          siteName: m.siteName || m.siteAddress || selectedSite?.name || '',
          code: m.code,
          className: m.machineClassName || (isDryer ? 'Máy Sấy Nhiệt Gas' : 'Máy Giặt Cửa Ngang'),
          kind: isDryer ? 'DRYER' : 'WASHER',
          capacityKg: Number(m.capacityKg || (isDryer ? 12 : 10)),
          status,
          remainingMinutes: m.remainingMinutes ?? null,
          temperature: m.temperature ?? (isDryer ? 70 : 28),
          compatibleOfferings: m.compatibleOfferings || [],
        };
      });

      // Sắp xếp: SẴN SÀNG (0) -> ĐANG BẬN/HELD (1) -> BẢO TRÌ (2), trong mỗi nhóm xếp theo mã máy
      mapped.sort((a, b) => {
        const getPriority = (s) => (s === 'AVAILABLE' ? 0 : s === 'BUSY' ? 1 : 2);
        const pA = getPriority(a.status);
        const pB = getPriority(b.status);
        if (pA !== pB) return pA - pB;
        return a.code.localeCompare(b.code, undefined, { numeric: true });
      });

      setMachines(mapped);

      // Cập nhật giữ máy đã chọn nếu người dùng đã tự chọn trước đó
      setSelectedMachine((prev) => {
        if (prev) {
          const fresh = mapped.find((m) => m.machineId === prev.machineId);
          if (fresh && fresh.status === 'AVAILABLE') {
            return fresh;
          }
          return null;
        }
        // Để người dùng tự tay chọn máy trong danh sách, không tự động chọn trước
        return null;
      });
    } catch (err) {
      console.warn('Machines API error', err);
      if (!silent) {
        setMachineError(isVietnamese ? 'Không thể tải danh sách máy giặt/sấy. Vui lòng thử lại!' : 'Failed to load machines.');
      }
    } finally {
      if (!silent) setLoadingMachines(false);
    }
  }, [isVietnamese, selectedSite?.siteId, selectedSite?.name]);

  // Polling tự động làm mới trạng thái máy mỗi 12 giây khi ở Bước 1
  useEffect(() => {
    if (step !== 1) return;
    const interval = setInterval(() => {
      loadMachines(true, selectedSite?.siteId);
    }, 12000);
    return () => clearInterval(interval);
  }, [step, loadMachines, selectedSite?.siteId]);

  // 1. Initial Load: Member profile, Sites, Real available machines & Vouchers (Chạy song song tối ưu tốc độ)
  useEffect(() => {
    let isMounted = true;
    async function init() {
      setLoadingSites(true);
      try {
        const [profRes, walletRes, sitesRes] = await Promise.allSettled([
          memberApi.getProfile(),
          walletsApi.getMyWallet(),
          machinesApi.getSites(),
        ]);

        if (!isMounted) return;

        if (profRes.status === 'fulfilled' && profRes.value) setProfile(profRes.value);
        if (walletRes.status === 'fulfilled' && walletRes.value) setWallet(walletRes.value);

        let siteList = [];
        if (sitesRes.status === 'fulfilled' && sitesRes.value) {
          siteList = Array.isArray(sitesRes.value) ? sitesRes.value : (sitesRes.value?.value || []);
          setSites(siteList);
        }

        // Xác định trạm gán cho Ki-ốt này
        const savedSiteId = localStorage.getItem('laundro_kiosk_site_id');
        let activeSite = null;
        if (savedSiteId && siteList.length > 0) {
          activeSite = siteList.find((s) => (s.siteId || s.id) === savedSiteId);
        }
        if (!activeSite && siteList.length > 0) {
          activeSite = siteList[0];
        }

        let currentActiveSiteId = null;
        if (activeSite) {
          const siteId = activeSite.siteId || activeSite.id;
          currentActiveSiteId = siteId;
          const siteObj = {
            ...activeSite,
            siteId,
            id: siteId,
          };
          setSelectedSite(siteObj);
          localStorage.setItem('laundro_kiosk_site_id', siteId);
          localStorage.setItem('laundro_kiosk_site_name', activeSite.name || '');
          localStorage.setItem('laundro_kiosk_site_code', activeSite.code || '');
          localStorage.setItem('laundro_kiosk_site_address', activeSite.address || '');
        } else if (savedSiteId) {
          currentActiveSiteId = savedSiteId;
        }

        await Promise.allSettled([
          loadMachines(false, currentActiveSiteId),
          loadAvailableVouchers(null),
        ]);
      } catch (e) {
        console.warn('Init error', e);
      } finally {
        if (isMounted) setLoadingSites(false);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, [loadMachines]);

  // Tự động đồng bộ mã voucher khả dụng và tính toán giảm giá theo chu trình giặt đã chọn
  useEffect(() => {
    if (selectedCycle?.price) {
      loadAvailableVouchers(selectedCycle.price);
    }
  }, [selectedCycle?.price]);

  // 2. Dynamic Price Quote calculation via Backend API (POST /api/pricing/quote)
  const quoteRequestIdRef = useRef(0);

  useEffect(() => {
    if (!selectedMachine) return;
    let isMounted = true;

    async function fetchLiveQuote() {
      const currentRequestId = ++quoteRequestIdRef.current;
      const targetVoucherCode = selectedVoucher?.code || null;

      try {
        const offeringId =
          selectedCycle?.offeringId ||
          getCompatibleCyclesForMachine(selectedMachine)[0]?.offeringId;

        const effectiveSiteId = selectedMachine.siteId || selectedSite?.siteId;
        if (!offeringId || !effectiveSiteId) return;

        const quote = await ordersApi.calculateQuote({
          siteId: effectiveSiteId,
          voucherCode: targetVoucherCode,
          customerType: isMember ? 'MEMBER' : 'GUEST',
          memberId: isMember ? (profile?.memberId || user?.memberId || user?.userId || null) : null,
          items: [
            {
              offeringId: offeringId,
              quantity: 1,
              machineId: selectedMachine.machineId,
            },
          ],
        });

        // Bỏ qua kết quả cũ nếu người dùng đã chuyển mã khác trong lúc API đang tải
        if (currentRequestId !== quoteRequestIdRef.current) return;

        if (isMounted && quote) {
          setLiveQuote(quote);
          if (selectedVoucher) {
            if (quote.isVoucherApplied) {
              setVoucherSuccess(quote.voucherMessage || (isVietnamese ? `Áp dụng thành công mã ${selectedVoucher.code}!` : `Voucher ${selectedVoucher.code} applied!`));
              setVoucherError('');
            } else {
              setSelectedVoucher(null);
              setVoucherError(quote.voucherMessage || (isVietnamese ? `Mã ${selectedVoucher.code} không đủ điều kiện hoặc không làm giảm chi phí cho đơn này (mức giảm 0 đ).` : `Voucher ${selectedVoucher.code} conditions not met.`));
              setVoucherSuccess('');
            }
          }
        }
      } catch (err) {
        console.warn('Live quote API note, using instant local math', err);
      }
    }

    fetchLiveQuote();

    return () => {
      isMounted = false;
    };
  }, [selectedMachine, selectedCycle, selectedVoucher, profile, isVietnamese]);

  // Pricing calculations (Tối ưu tính toán tức thì 0ms, không bị delay bởi API chậm)
  const tierCode = profile?.tier?.code || 'STANDARD';
  const tierName = profile?.tier?.name || 'Thành Viên Tiêu Chuẩn';
  const tierDiscountPercent =
    tierCode === 'SILVER' ? 5 : tierCode === 'GOLD' ? 10 : tierCode === 'PLATINUM' ? 15 : 0;

  const fallbackOriginalPrice = selectedCycle?.price || 0;
  const originalPrice = fallbackOriginalPrice > 0 ? fallbackOriginalPrice : (liveQuote?.subtotal ?? 0);
  const fallbackTierDiscount = Math.round((originalPrice * tierDiscountPercent) / 100);

  // Kiểm tra liveQuote có đang đồng bộ chính xác với mã voucher hiện tại không
  const currentSelectedVoucherCode = selectedVoucher?.code ? selectedVoucher.code.toUpperCase() : null;
  const quoteVoucherCode = liveQuote?.voucherCode ? liveQuote.voucherCode.toUpperCase() : null;
  const isQuoteInSync = quoteVoucherCode === currentSelectedVoucherCode;

  // Tính toán chiết khấu Voucher tức thì (0ms, không phụ thuộc độ trễ mạng)
  let instantVoucherDiscount = 0;
  if (selectedVoucher) {
    if (isQuoteInSync) {
      // Backend API đã phản hồi chính xác mã voucher này
      const vDisc = liveQuote?.appliedDiscounts?.find((d) =>
        (d.ruleType && d.ruleType.toUpperCase() === 'VOUCHER') ||
        (d.ruleCode && d.ruleCode.toUpperCase().includes('VOUCHER')) ||
        (selectedVoucher && d.ruleCode && d.ruleCode.toUpperCase().includes(selectedVoucher.code?.toUpperCase()))
      );
      instantVoucherDiscount = liveQuote?.isVoucherApplied
        ? (liveQuote.voucherDiscountAmount ?? liveQuote.voucherDiscount ?? vDisc?.discountAmount ?? 0)
        : 0;
    } else {
      // Kiểm tra điều kiện tối thiểu & đối tượng trước khi tính toán
      const minReq = Number(selectedVoucher.minOrderSubtotal || selectedVoucher.minSubtotal || 0);
      const isEligible = (!selectedVoucher.memberOnly || profile) && (minReq <= 0 || originalPrice >= minReq);

      if (isEligible) {
        if (selectedVoucher.isPercent || selectedVoucher.type === 'PERCENT') {
          const pct = selectedVoucher.percent || selectedVoucher.discountValue || 10;
          const raw = Math.round((originalPrice * pct) / 100);
          instantVoucherDiscount = Math.min(raw, selectedVoucher.maxDiscount || raw);
        } else {
          const fixed = selectedVoucher.fixedAmount || selectedVoucher.discountValue || 10000;
          instantVoucherDiscount = Math.min(fixed, originalPrice);
        }
      }
    }
  }

  // Chiết khấu Hội viên tức thì
  let instantTierDiscount = fallbackTierDiscount;
  if (isQuoteInSync && liveQuote?.tierDiscount !== undefined) {
    instantTierDiscount = liveQuote.tierDiscount;
  }

  // Tổng chiết khấu & Tổng thanh toán (Luôn cập nhật ngay lập tức khi nhấn voucher)
  const totalDiscount = (isQuoteInSync && liveQuote?.discountTotal !== undefined)
    ? liveQuote.discountTotal
    : Math.min(originalPrice, instantVoucherDiscount + instantTierDiscount);

  const finalPrice = (isQuoteInSync && liveQuote?.total !== undefined)
    ? liveQuote.total
    : Math.max(0, originalPrice - totalDiscount);

  const currentBalance = Number(wallet?.balance ?? profile?.wallet?.balance ?? 0);

  // Danh sách toàn bộ các chiết khấu đã áp dụng (CHỈ HIỂN THỊ CÁC MỤC THỰC SỰ GIẢM ĐƯỢC TIỀN > 0)
  const appliedDiscounts = (isQuoteInSync
    ? (liveQuote?.appliedDiscounts || []).map((d) => {
      const code = (d.ruleCode || '').toUpperCase();
      const name = (d.ruleName || '').toLowerCase();
      const type = (d.ruleType || '').toUpperCase();
      let category = 'PROMOTION';

      if (type === 'VOUCHER' || code.includes('VOUCHER') || (selectedVoucher && code.includes(selectedVoucher.code?.toUpperCase()))) {
        category = 'VOUCHER';
      } else if (type === 'TIER' || code.includes('TIER') || name.includes('hạng') || name.includes('thành viên') || name.includes('hội viên')) {
        category = 'TIER';
      }

      let displayName = d.ruleName;
      if (category === 'VOUCHER') {
        if (selectedVoucher && !displayName?.includes('Giảm') && !displayName?.includes('%') && !displayName?.includes('₫')) {
          displayName = `Voucher ${selectedVoucher.code} (${selectedVoucher.badgeDiscountLabel || selectedVoucher.shortDiscountLabel})`;
        } else if (!displayName) {
          displayName = `Voucher ${d.ruleCode}`;
        }
      } else if (!displayName) {
        displayName = `Khuyến mãi ${d.ruleCode}`;
      }

      return {
        ...d,
        category,
        displayName,
        discountAmount: d.discountAmount || 0,
      };
    })
    : [
      ...(instantTierDiscount > 0
        ? [{
          ruleCode: tierCode,
          ruleName: `Chiết khấu Hội viên (${tierName} -${tierDiscountPercent}%)`,
          displayName: `Chiết khấu Hội viên (${tierName} -${tierDiscountPercent}%)`,
          ruleType: 'TIER',
          category: 'TIER',
          discountAmount: instantTierDiscount,
        }]
        : []),
      ...(selectedVoucher && instantVoucherDiscount > 0
        ? [{
          ruleCode: selectedVoucher.code,
          ruleName: selectedVoucher.name || `Voucher ${selectedVoucher.code} (${selectedVoucher.badgeDiscountLabel || selectedVoucher.shortDiscountLabel})`,
          displayName: `Voucher ${selectedVoucher.code} (${selectedVoucher.badgeDiscountLabel || selectedVoucher.shortDiscountLabel})`,
          ruleType: 'VOUCHER',
          category: 'VOUCHER',
          discountAmount: instantVoucherDiscount,
        }]
        : []),
    ]
  ).filter((d) => (d.discountAmount || 0) > 0);

  // Lọc danh sách Voucher/Khuyến mãi: Nếu không đủ điều kiện hoặc không giảm được tiền thì không hiển thị ra
  const currentSubtotal = originalPrice || selectedCycle?.price || 0;
  const eligibleVouchers = vouchersList.filter((v) => {
    // 1. Voucher dành riêng cho Hội viên nhưng khách chưa đăng nhập -> không đủ điều kiện -> không hiển thị
    if (v.memberOnly && !profile) return false;

    // 2. Đơn chưa đạt giá trị tối thiểu của mã -> không đủ điều kiện -> không hiển thị
    const minReq = Number(v.minOrderSubtotal || v.minSubtotal || 0);
    if (minReq > 0 && currentSubtotal > 0 && currentSubtotal < minReq) {
      return false;
    }

    // 3. Tính toán mức giảm dự kiến
    const projectedDiscount =
      (v.type === 'PERCENT' || v.isPercent)
        ? Math.min(Math.round((currentSubtotal * (v.percent || v.discountValue || 0)) / 100), v.maxDiscount || Infinity)
        : Math.min(v.fixedAmount || v.discountValue || 0, currentSubtotal);

    // 4. Nếu không giảm được tiền (<= 0) -> không hiển thị
    if (currentSubtotal > 0 && projectedDiscount <= 0) {
      return false;
    }

    return true;
  });

  // Tự động bỏ chọn voucher nếu không còn đủ điều kiện hoặc không giảm được tiền
  useEffect(() => {
    if (selectedVoucher && currentSubtotal > 0) {
      const isStillEligible = eligibleVouchers.some(
        (v) => (v.id && v.id === selectedVoucher.id) || (v.code && v.code === selectedVoucher.code)
      );
      if (!isStillEligible) {
        setSelectedVoucher(null);
        setVoucherSuccess('');
        setVoucherError('');
      }
    }
  }, [currentSubtotal, eligibleVouchers, selectedVoucher]);

  // Handle custom voucher submission (Validating with backend API POST /api/vouchers/validate)
  async function handleApplyCustomVoucher() {
    setVoucherError('');
    setVoucherSuccess('');
    const code = customVoucherInput.trim().toUpperCase();
    if (!code) {
      setVoucherError(isVietnamese ? 'Vui lòng nhập mã voucher!' : 'Please enter voucher code!');
      return;
    }

    // Try validating with real backend API first
    try {
      const validateRes = await ordersApi.validateVoucher(code, originalPrice);
      if (validateRes && validateRes.isValid && (validateRes.calculatedDiscount > 0 || (validateRes.calculatedDiscount === undefined && originalPrice > 0))) {
        const backendVoucher = resolveVoucherDiscount({
          ...validateRes,
          code: code,
          badge: validateRes.memberOnly ? 'HỘI VIÊN' : 'HỢP LỆ',
        });
        setSelectedVoucher(backendVoucher);
        const discountDisplay = backendVoucher.calculatedDiscount
          ? `-${backendVoucher.calculatedDiscount.toLocaleString('vi-VN')} ₫`
          : backendVoucher.shortDiscountLabel;
        setVoucherSuccess(isVietnamese ? `Áp dụng thành công mã ${code} (${discountDisplay})!` : `Applied voucher ${code}!`);
        setCustomVoucherInput('');
        return;
      } else if (validateRes && (!validateRes.isValid || validateRes.calculatedDiscount <= 0)) {
        setVoucherError(validateRes.message || (isVietnamese ? `Mã voucher '${code}' không thể áp dụng cho đơn này do không làm giảm chi phí (mức giảm 0 đ).` : `Voucher does not reduce cost.`));
        return;
      }
    } catch (apiErr) {
      console.warn('Voucher validate API note, checking presets', apiErr);
    }

    // Check predefined list
    const found = vouchersList.find((v) => v.code === code);
    if (found) {
      const minReq = Number(found.minOrderSubtotal || found.minSubtotal || 0);
      if (minReq > 0 && originalPrice > 0 && originalPrice < minReq) {
        setVoucherError(isVietnamese ? `Đơn hàng (${originalPrice.toLocaleString('vi-VN')} ₫) chưa đạt giá trị tối thiểu ${minReq.toLocaleString('vi-VN')} ₫ để áp dụng mã này.` : `Order does not meet minimum subtotal.`);
        return;
      }
      const projDisc = found.calculatedDiscount !== null && found.calculatedDiscount !== undefined
        ? found.calculatedDiscount
        : (found.type === 'PERCENT'
          ? Math.min(Math.round((originalPrice * found.percent) / 100), found.maxDiscount || Infinity)
          : Math.min(found.fixedAmount || found.discountValue, originalPrice));
      if (originalPrice > 0 && projDisc <= 0) {
        setVoucherError(isVietnamese ? `Mã voucher không làm giảm chi phí cho đơn hàng này (mức giảm 0 ₫).` : `Voucher does not reduce price for this order.`);
        return;
      }
      setSelectedVoucher(found);
      setVoucherSuccess(isVietnamese ? `Áp dụng thành công mã ${code} (${found.shortDiscountLabel})!` : `Voucher ${code} applied successfully!`);
      setCustomVoucherInput('');
      return;
    }

    setVoucherError(isVietnamese ? 'Mã voucher không tồn tại hoặc chưa đủ điều kiện áp dụng.' : 'Voucher code invalid or expired.');
  }

  // 3.0. Action: Thanh toán trực tiếp bằng số dư Ví (POST /api/orders/checkout/wallet)
  async function handlePayWithWallet() {
    if (user?.isGuest) {
      setErrorMsg(
        isVietnamese
          ? 'Khách vãng lai không có thanh toán bằng ví. Vui lòng thanh toán qua VietQR!'
          : 'Guest accounts do not support wallet payment. Please pay via VietQR!'
      );
      return;
    }

    if (!selectedMachine) {
      setErrorMsg(isVietnamese ? 'Vui lòng chọn máy giặt/sấy!' : 'Please select machine!');
      return;
    }

    if (currentBalance < finalPrice) {
      setErrorMsg(
        isVietnamese
          ? `Số dư ví không đủ (${currentBalance.toLocaleString('vi-VN')} ₫ < ${finalPrice.toLocaleString('vi-VN')} ₫). Vui lòng nạp thêm tiền vào ví!`
          : 'Insufficient wallet balance. Please top up your wallet!'
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      let quoteId = isQuoteInSync ? liveQuote?.quoteId : null;
      if (!quoteId) {
        const offeringId =
          selectedCycle?.offeringId ||
          getCompatibleCyclesForMachine(selectedMachine)[0]?.offeringId;
        const effectiveSiteId = selectedMachine.siteId || selectedSite?.siteId;
        if (!offeringId || !effectiveSiteId) {
          throw new Error(isVietnamese ? 'Thông tin trạm hoặc dịch vụ không hợp lệ' : 'Invalid site or service offering');
        }
        const quote = await ordersApi.calculateQuote({
          siteId: effectiveSiteId,
          voucherCode: selectedVoucher?.code || null,
          customerType: 'MEMBER',
          items: [
            {
              offeringId: offeringId,
              quantity: 1,
              machineId: selectedMachine.machineId,
            },
          ],
        });
        quoteId = quote.quoteId;
        setLiveQuote(quote);
      }

      // Tạo đơn và trừ tiền ví ngay lập tức trên Backend
      let order = null;
      if (kioskOrder?.orderId && kioskOrder.status === 'PENDING_PAYMENT') {
        order = await ordersApi.payOrderWithWallet(kioskOrder.orderId, {
          memberIdentifier: profile?.memberCode || profile?.phoneNumber || profile?.email || undefined,
          note: `Thanh toán ví cho máy ${selectedMachine.code} - ${selectedCycle?.name || ''}`,
        });
      } else {
        order = await ordersApi.checkoutWithWallet({
          quoteId: quoteId,
          memberIdentifier: profile?.memberCode || profile?.phoneNumber || profile?.email || undefined,
          note: `Thanh toán ví cho máy ${selectedMachine.code} - ${selectedCycle?.name || ''}`,
        });
      }

      if (!order) {
        throw new Error(isVietnamese ? 'Thanh toán bằng ví thất bại.' : 'Wallet payment failed.');
      }

      // Cập nhật lại số dư ví mới
      try {
        const updatedWallet = await walletsApi.getMyWallet();
        if (updatedWallet) setWallet(updatedWallet);
      } catch {
        // ignore
      }

      // Hiển thị thông báo thanh toán thành công (giữ trạng thái CONFIRMED để người dùng bấm Bắt đầu giặt)
      setPaymentSuccessData({
        orderId: order?.orderId || kioskOrder?.orderId,
        orderCode: order?.orderCode || kioskOrder?.orderCode || 'LC-' + Date.now().toString().slice(-6),
        machineCode: selectedMachine?.code || kioskOrder?.machineCode,
        machineKind: selectedMachine?.kind,
        cycleName: selectedCycle?.name || kioskOrder?.cycleName,
        durationMinutes: selectedCycle?.durationMin || kioskOrder?.durationMinutes || 35,
        amount: finalPrice,
      });
    } catch (err) {
      console.error('Wallet payment error', err);
      setErrorMsg(err.message || (isVietnamese ? 'Lỗi thanh toán bằng ví. Vui lòng thử lại!' : 'Wallet payment error.'));
    } finally {
      setSubmitting(false);
    }
  }

  // Xử lý khi nhấn nút "Tiếp tục: Bước thanh toán" - Bật modal nhập Họ tên & SĐT CHỈ KHI LÀ KHÁCH VÃNG LAI
  const handleProceedToPaymentStep = () => {
    setErrorMsg('');
    const hasGuestInfo = Boolean(guestName.trim() && guestPhone.trim());

    // CHỈ YÊU CẦU KHI LÀ KHÁCH VÃNG LAI (MEMBER ĐÃ CÓ TÀI KHOẢN, TUYỆT ĐỐI KHÔNG BẮT NHẬP)
    if (isGuest && !hasGuestInfo) {
      setModalCustomerName(guestName.trim());
      setModalCustomerPhone(guestPhone.trim());
      setModalInputError('');
      setShowCustomerModal(true);
      return;
    }

    setStep(4);
    if (!kioskOrder && !submitting && selectedMachine) {
      handleCreateSession();
    }
  };

  // Thử tạo lại mã VietQR nếu trước đó bị lỗi kết nối
  const handleRetryCreateQr = () => {
    setErrorMsg('');
    if (!submitting && selectedMachine) {
      handleCreateSession();
    }
  };

  // Xác nhận form modal Họ tên & Số điện thoại
  const handleConfirmCustomerModal = (e) => {
    if (e) e.preventDefault();
    const cleanName = modalCustomerName.trim();
    const cleanPhone = modalCustomerPhone.trim();

    if (!cleanName) {
      setModalInputError(isVietnamese ? 'Vui lòng nhập họ và tên của bạn!' : 'Please enter your name!');
      return;
    }

    if (!cleanPhone) {
      setModalInputError(isVietnamese ? 'Vui lòng nhập số điện thoại nhận thông báo!' : 'Please enter your phone number!');
      return;
    }

    const phoneClean = cleanPhone.replace(/[\s.-]/g, '');
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phoneClean)) {
      setModalInputError(
        isVietnamese
          ? 'Số điện thoại không hợp lệ (phải gồm 10 chữ số và bắt đầu bằng số 0, VD: 0912345678)!'
          : 'Invalid phone number (must be 10 digits starting with 0, e.g. 0912345678)!'
      );
      return;
    }

    setModalInputError('');
    setGuestName(cleanName);
    setGuestPhone(phoneClean);

    // Không lưu thông tin cá nhân vào localStorage để bảo mật cho khách tiếp theo trên Ki-ốt
    setShowCustomerModal(false);
    setStep(4);
    handleCreateSession(cleanName, phoneClean);
  };

  // 3. Step 4 Action: Create Real Order (POST /api/orders/checkout-payos) & Generate VietQR PayOS
  async function handleCreateSession(overrideName = null, overridePhone = null) {
    if (sessionCreatingRef.current) return;

    if (!selectedMachine) {
      setErrorMsg(isVietnamese ? 'Vui lòng chọn máy giặt/sấy!' : 'Please select machine!');
      return;
    }

    if (selectedMachine.status !== 'AVAILABLE') {
      setErrorMsg(isVietnamese ? 'Máy đã chọn hiện không khả dụng. Vui lòng chọn máy khác!' : 'Selected machine is not available.');
      return;
    }

    const currentGuestName = (overrideName !== null ? overrideName : guestName)?.trim();
    const currentGuestPhone = (overridePhone !== null ? overridePhone : guestPhone)?.trim();

    // CHỈ YÊU CẦU NHẬP HỌ TÊN & SĐT KHI LÀ KHÁCH VÃNG LAI (MEMBER ĐÃ CÓ TÀI KHOẢN)
    if (isGuest && (!currentGuestName || !currentGuestPhone)) {
      setModalCustomerName(currentGuestName || '');
      setModalCustomerPhone(currentGuestPhone || '');
      setModalInputError('');
      setShowCustomerModal(true);
      return;
    }

    sessionCreatingRef.current = true;
    setSubmitting(true);
    setErrorMsg('');

    try {
      if (kioskOrder?.orderId) {
        try {
          const statusRes = await ordersApi.getOrderPaymentStatus(kioskOrder.orderId);
          if (statusRes?.qrCode || statusRes?.qrImageUrl) {
            let qrUrl = '';
            if (statusRes.qrCode) {
              try {
                qrUrl = await QRCode.toDataURL(statusRes.qrCode, {
                  width: 360,
                  margin: 1,
                  color: { dark: '#0f172a', light: '#ffffff' },
                  errorCorrectionLevel: 'M',
                });
              } catch {
                qrUrl = statusRes.qrImageUrl || '';
              }
            } else {
              qrUrl = statusRes.qrImageUrl || '';
            }
            setKioskQrUrl(qrUrl);
            return;
          }
        } catch (reuseErr) {
          console.warn('Could not refresh existing order payment, continuing to new quote', reuseErr);
        }
      }

      let quoteId = isQuoteInSync ? liveQuote?.quoteId : null;
      if (!quoteId) {
        const offeringId =
          selectedCycle?.offeringId ||
          getCompatibleCyclesForMachine(selectedMachine)[0]?.offeringId;
        const effectiveSiteId = selectedMachine.siteId || selectedSite?.siteId;
        if (!offeringId || !effectiveSiteId) {
          throw new Error(isVietnamese ? 'Thông tin trạm hoặc dịch vụ không hợp lệ' : 'Invalid site or service offering');
        }
        const quote = await ordersApi.calculateQuote({
          siteId: effectiveSiteId,
          voucherCode: selectedVoucher?.code || null,
          customerType: isMember ? 'MEMBER' : 'GUEST',
          memberId: isMember ? (profile?.memberId || user?.memberId || user?.userId || null) : null,
          items: [
            {
              offeringId: offeringId,
              quantity: 1,
              machineId: selectedMachine.machineId,
            },
          ],
        });
        quoteId = quote.quoteId;
        setLiveQuote(quote);
      }

      // Xác định thông tin người nhận đơn
      const effectiveGuestName = isMember
        ? (profile?.fullName || user?.fullName || profile?.username || user?.username || 'Hội viên')
        : (currentGuestName || 'Khách Hàng');
      const effectiveGuestPhone = isMember
        ? (profile?.phoneNumber || user?.phone || user?.phoneNumber || null)
        : currentGuestPhone;

      const checkoutRes = await ordersApi.checkoutWithPayOs({
        quoteId: quoteId,
        channel: 'KIOSK',
        guestName: effectiveGuestName,
        guestPhone: effectiveGuestPhone,
        note: 'Đặt giặt máy ' + selectedMachine.code + ' - ' + (selectedCycle?.name || ''),
        returnUrl: `${window.location.origin}/dashboard/payment-result?type=order`,
        cancelUrl: `${window.location.origin}/dashboard/payment-result?type=order&cancel=true`,
      });

      const orderData = checkoutRes?.order;
      const paymentData = checkoutRes?.payment;

      if (!orderData) {
        throw new Error(isVietnamese ? 'Không thể tạo đơn giặt từ hệ thống' : 'Failed to create order');
      }

      setKioskOrder({
        ...orderData,
        orderId: orderData.orderId,
        orderCode: orderData.orderCode || orderData.orderId,
        machineCode: selectedMachine.code,
        cycleName: selectedCycle?.name || '',
        durationMinutes: selectedCycle?.durationMin || 35,
        siteName: selectedMachine.siteName || '',
        originalAmount: originalPrice,
        totalDiscount: totalDiscount,
        finalAmount: paymentData?.amount ?? orderData.total ?? finalPrice,
        appliedDiscounts: appliedDiscounts,
        payment: paymentData,
      });

      // Tối ưu tạo mã VietQR: Ưu tiên tạo tức thì từ chuỗi EMVCo của PayOS (0ms render cục bộ, siêu nét, không phụ thuộc máy chủ ngoài)
      let qrUrl = '';
      if (paymentData?.qrCode) {
        try {
          qrUrl = await QRCode.toDataURL(paymentData.qrCode, {
            width: 360,
            margin: 1,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
          });
        } catch (qrErr) {
          console.warn('Lỗi tạo ảnh QR cục bộ:', qrErr);
          qrUrl = paymentData?.qrImageUrl || '';
        }
      } else if (paymentData?.qrImageUrl) {
        qrUrl = paymentData.qrImageUrl;
      }

      setKioskQrUrl(qrUrl || '');
    } catch (err) {
      console.error('Error creating order session with PayOS', err);
      setErrorMsg(err.message || 'Không thể tạo đơn hàng và mã QR PayOS. Vui lòng thử lại.');
    } finally {
      sessionCreatingRef.current = false;
      setSubmitting(false);
    }
  }

  // Polling tự động kiểm tra trạng thái thanh toán PayOS mỗi 1.5 giây
  useEffect(() => {
    if ((step !== 4 && !kioskModalOpen) || !kioskOrder?.orderId || paymentSuccessData) return;

    let isMounted = true;
    let isRequesting = false;

    const checkStatus = async () => {
      if (isRequesting || !kioskOrder?.orderId) return;
      isRequesting = true;
      try {
        const statusRes = await ordersApi.getOrderPaymentStatus(kioskOrder.orderId);
        if (!isMounted) return;

        if (
          statusRes?.isPaid ||
          statusRes?.paymentStatus === 'PAID' ||
          statusRes?.orderStatus === 'CONFIRMED' ||
          statusRes?.orderStatus === 'IN_PROGRESS'
        ) {
          clearInterval(interval);

          // Lưu vào bộ nhớ local cho khách vãng lai nếu có SĐT
          if (guestPhone) {
            try {
              const localRaw = localStorage.getItem('laundro_guest_orders');
              const list = localRaw ? JSON.parse(localRaw) : [];
              const entry = {
                orderId: kioskOrder.orderId,
                orderCode: kioskOrder?.orderCode || '',
                guestPhone: guestPhone,
                guestName: guestName,
                status: 'CONFIRMED',
                total: kioskOrder?.finalAmount ?? finalPrice,
                createdAt: new Date().toISOString(),
              };
              if (!list.some((x) => x.orderId === entry.orderId)) {
                list.unshift(entry);
                localStorage.setItem('laundro_guest_orders', JSON.stringify(list.slice(0, 25)));
              }
            } catch { }
          }

          setKioskModalOpen(false);
          setPaymentSuccessData({
            orderId: kioskOrder?.orderId || statusRes?.orderId,
            orderCode: kioskOrder?.orderCode || 'LC-' + Date.now().toString().slice(-6),
            machineCode: selectedMachine?.code || kioskOrder?.machineCode,
            machineKind: selectedMachine?.kind,
            cycleName: selectedCycle?.name || kioskOrder?.cycleName,
            durationMinutes: selectedCycle?.durationMin || kioskOrder?.durationMinutes || 35,
            amount: kioskOrder?.finalAmount ?? finalPrice,
          });
        }
      } catch (pollErr) {
        console.warn('Payment polling note', pollErr);
      } finally {
        isRequesting = false;
      }
    };

    const timeout = setTimeout(checkStatus, 800);
    const interval = setInterval(checkStatus, 1500);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [step, kioskModalOpen, kioskOrder?.orderId, kioskOrder?.machineCode, paymentSuccessData, navigate]);

  // 4. Action in Kiosk Modal: Pay Order (POST /api/orders/{id}/pay) & Start Wash (POST /api/orders/{id}/start)
  async function handleQrPayAndStart() {
    if (!kioskOrder) return;

    const chargeAmount = kioskOrder.finalAmount ?? kioskOrder.total ?? finalPrice;
    if (currentBalance > 0 && currentBalance < chargeAmount) {
      setErrorMsg(
        isVietnamese
          ? `Số dư ví không đủ (${currentBalance.toLocaleString('vi-VN')} ₫ < ${chargeAmount.toLocaleString('vi-VN')} ₫). Vui lòng nạp thêm tiền vào ví!`
          : 'Insufficient wallet balance. Please top up your wallet!'
      );
      return;
    }

    setPayingAndStarting(true);
    setErrorMsg('');

    try {
      if (kioskOrder.orderId) {
        try {
          // Pay order (Status -> CONFIRMED)
          await ordersApi.payOrder(kioskOrder.orderId, { paymentMethod: 'WALLET', note: 'Thanh toán ví điện tử' });
        } catch (payErr) {
          console.warn('Pay order API note', payErr);
        }
      }

      // Success: Close modal and show payment success notification
      setKioskModalOpen(false);
      setPaymentSuccessData({
        orderId: kioskOrder?.orderId,
        orderCode: kioskOrder?.orderCode || 'LC-' + Date.now().toString().slice(-6),
        machineCode: selectedMachine?.code || kioskOrder?.machineCode,
        machineKind: selectedMachine?.kind,
        cycleName: selectedCycle?.name || kioskOrder?.cycleName,
        durationMinutes: selectedCycle?.durationMin || kioskOrder?.durationMinutes || 35,
        amount: kioskOrder?.finalAmount ?? finalPrice,
      });
    } catch (err) {
      console.error('Error paying and starting machine', err);
      setErrorMsg(err.message || 'Thanh toán hoặc kích hoạt máy thất bại.');
    } finally {
      setPayingAndStarting(false);
    }
  }

  // Computed machine counts & filtered list
  const filteredMachines = machines.filter((m) => {
    if (machineFilter === 'WASHER') return m.kind === 'WASHER' || m.className?.toLowerCase().includes('giặt');
    if (machineFilter === 'DRYER') return m.kind === 'DRYER' || m.className?.toLowerCase().includes('sấy');
    if (machineFilter === 'MAINTENANCE') return m.status === 'MAINTENANCE';
    if (machineFilter === 'BUSY') return m.status === 'BUSY';
    return true;
  });

  const totalWashers = machines.filter((m) => m.kind === 'WASHER' || m.className?.toLowerCase().includes('giặt')).length;
  const availWashers = machines.filter((m) => (m.kind === 'WASHER' || m.className?.toLowerCase().includes('giặt')) && m.status === 'AVAILABLE').length;
  const totalDryers = machines.filter((m) => m.kind === 'DRYER' || m.className?.toLowerCase().includes('sấy')).length;
  const availDryers = machines.filter((m) => (m.kind === 'DRYER' || m.className?.toLowerCase().includes('sấy')) && m.status === 'AVAILABLE').length;
  const availableCount = machines.filter((m) => m.status === 'AVAILABLE').length;
  const busyCount = machines.filter((m) => m.status === 'BUSY').length;
  const maintenanceCount = machines.filter((m) => m.status === 'MAINTENANCE').length;

  // Step definitions for the circular timeline stepper
  const STEPS = [
    {
      num: 1,
      title: isVietnamese ? 'Chọn máy' : 'Select Machine',
      desc: isVietnamese ? 'Máy giặt & sấy' : 'Washer & Dryer',
    },
    {
      num: 2,
      title: isVietnamese ? 'Chu trình giặt' : 'Wash Cycle',
      desc: isVietnamese ? 'Chế độ & thời gian' : 'Mode & Duration',
    },
    {
      num: 3,
      title: isVietnamese ? 'Chọn Voucher' : 'Apply Voucher',
      desc: isVietnamese ? 'Mã ưu đãi giảm giá' : 'Discount Code',
    },
    {
      num: 4,
      title: isVietnamese ? 'Thanh toán' : 'Payment',
      desc: (!user?.isGuest && profile)
        ? (isVietnamese ? 'VietQR & Ví' : 'VietQR & Wallet')
        : (isVietnamese ? 'Quét VietQR' : 'VietQR Payment'),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <WashingMachine className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          {isVietnamese ? 'Dịch vụ giặt sấy trực tiếp tại trạm' : 'Direct Wash & Dry Services'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isVietnamese
            ? 'Không cần đặt cọc hay giữ chỗ. Chọn máy rảnh, chọn chu trình, áp dụng voucher giảm giá và quét QR trên Ki-ốt để giặt ngay!'
            : 'No deposit required. Select an available machine, choose your wash cycle, apply voucher discount, and scan Kiosk QR to wash immediately.'}
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          {errorMsg.includes('Số dư') && (
            <button
              onClick={() => navigate('/dashboard/wallet')}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition ml-3 cursor-pointer"
            >
              {isVietnamese ? 'Nạp ví ngay' : 'Top up now'}
            </button>
          )}
        </div>
      )}

      {/* Thông báo nạp tiền ví thành công */}
      {topupSuccessNotice && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-2 border-emerald-500/50 text-emerald-900 dark:text-emerald-100 flex items-center justify-between shadow-lg shadow-emerald-500/10 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-600/30">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base text-emerald-900 dark:text-emerald-200 flex items-center gap-2 flex-wrap">
                <span>{isVietnamese ? 'Nạp tiền vào ví thành công!' : 'Wallet Top-up Successful!'}</span>
                {topupAmount && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white shadow-sm">
                    +{Number(topupAmount).toLocaleString('vi-VN')} ₫
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                {isVietnamese
                  ? `Số dư ví khả dụng hiện tại: ${currentBalance.toLocaleString('vi-VN')} ₫. Bạn có thể chọn máy và đặt đơn thanh toán trực tiếp bằng ví ngay bên dưới.`
                  : `Current available balance: ${currentBalance.toLocaleString('vi-VN')} ₫. You can select a machine and pay with wallet now.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setTopupSuccessNotice(false)}
            className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200/50 dark:hover:bg-emerald-900/50 transition cursor-pointer flex-shrink-0 ml-2"
            title="Đóng thông báo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEPPER: CHU TRÌNH HÌNH TRÒN 1 2 3 4 ĐI QUA 1 ĐƯỜNG THẲNG */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
        <div className="relative">
          {/* Horizontal connecting line passing through center of circles */}
          <div className="absolute top-3 left-[12.5%] right-[12.5%] h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0 rounded-full">
            {/* Active progress fill line */}
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 transition-all duration-500 rounded-full"
              style={{
                width: `${((step - 1) / (STEPS.length - 1)) * 100}%`,
              }}
            />
          </div>

          {/* Stepper Nodes */}
          <div className="relative z-10 flex justify-between items-start">
            {STEPS.map((s) => {
              const isCompleted = step > s.num;
              const isCurrent = step === s.num;
              const canClick = s.num < step;

              return (
                <div
                  key={s.num}
                  onClick={() => canClick && setStep(s.num)}
                  className={`flex flex-col items-center select-none ${canClick ? 'cursor-pointer group' : 'cursor-default'
                    }`}
                  style={{ width: `${100 / STEPS.length}%` }}
                >
                  {/* Circle Node with Number or Checkmark */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-sm ${isCurrent
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white ring-2 ring-blue-200 dark:ring-blue-900 shadow-blue-500/30 scale-110'
                      : isCompleted
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                        : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-400 group-hover:border-slate-400'
                      }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <span>{s.num}</span>
                    )}
                  </div>

                  {/* Step Name on the line */}
                  <div className="mt-2 text-center px-1">
                    <div
                      className={`text-xs sm:text-sm transition-colors ${isCurrent
                        ? 'font-bold text-blue-600 dark:text-blue-400'
                        : isCompleted
                          ? 'font-semibold text-slate-700 dark:text-slate-300'
                          : 'font-medium text-slate-400 dark:text-slate-500'
                        }`}
                    >
                      {s.title}
                    </div>
                    <div className="hidden sm:block text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {s.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BƯỚC 1: CHỌN MÁY GIẶT / SẤY (THEO CHI NHÁNH / TRẠM KI-ỐT)  */}
      {/* ========================================================= */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
          {/* BANNER THÔNG TIN TRẠM KI-ỐT ĐƯỢC GÁN & NÚT CHỌN SITE */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-slate-50 dark:from-slate-800/90 dark:via-slate-800/60 dark:to-slate-900 border border-blue-200/80 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
                <Store className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-600 text-white uppercase tracking-wider shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                    {isVietnamese ? 'Ki-ốt Trạm' : 'Kiosk Station'}
                  </span>
                  {selectedSite?.code && (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-700">
                      {selectedSite.code}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {selectedSite?.name || (isVietnamese ? 'Đang tải thông tin trạm...' : 'Loading station info...')}
                </h3>
                {selectedSite?.address && (
                  <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{selectedSite.address}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Nút Đổi Trạm / Chi nhánh */}
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => setShowSiteSelectorModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition shadow-xs hover:border-blue-400 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{isVietnamese ? 'Đổi Trạm / Chi nhánh' : 'Switch Station'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Header & Filter Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <WashingMachine className="w-5 h-5 text-blue-600" />
                {isVietnamese ? 'Danh sách máy giặt / sấy' : 'Available Machines'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isVietnamese
                  ? `Hiện có ${availableCount}/${machines.length} máy sẵn sàng`
                  : `${availableCount}/${machines.length} machines available`}
                {maintenanceCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-rose-500 dark:text-rose-400 font-semibold">
                    • <Wrench className="w-3 h-3" /> {maintenanceCount} {isVietnamese ? 'máy bảo trì' : 'maintenance'}
                  </span>
                )}
              </p>
            </div>

            {/* Quick Filter Buttons with live availability count */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                onClick={() => handleFilterChange('ALL')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${machineFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <span>{isVietnamese ? 'Tất cả' : 'All'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${machineFilter === 'ALL' ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                  {availableCount}/{machines.length}
                </span>
              </button>
              <button
                onClick={() => handleFilterChange('WASHER')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${machineFilter === 'WASHER'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <WashingMachine className="w-3.5 h-3.5" />
                <span>{isVietnamese ? 'Máy Giặt' : 'Washers'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${machineFilter === 'WASHER' ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                  {availWashers}/{totalWashers}
                </span>
              </button>
              <button
                onClick={() => handleFilterChange('DRYER')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${machineFilter === 'DRYER'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <Wind className="w-3.5 h-3.5" />
                <span>{isVietnamese ? 'Máy Sấy' : 'Dryers'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${machineFilter === 'DRYER' ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                  {availDryers}/{totalDryers}
                </span>
              </button>
              {maintenanceCount > 0 && (
                <button
                  onClick={() => handleFilterChange('MAINTENANCE')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${machineFilter === 'MAINTENANCE'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{isVietnamese ? 'Bảo trì' : 'Maintenance'}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${machineFilter === 'MAINTENANCE' ? 'bg-white/20 text-white' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'}`}>
                    {maintenanceCount}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Machine Error Alert with Retry */}
          {machineError && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-between text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>{machineError}</span>
              </div>
              <button
                onClick={() => loadMachines(false)}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{isVietnamese ? 'Thử lại' : 'Retry'}</span>
              </button>
            </div>
          )}

          {/* Machine Grid / Skeleton / Empty state */}
          {loadingMachines && machines.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 animate-pulse space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  </div>
                  <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                    <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMachines.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
              <WashingMachine className="w-10 h-10 text-slate-300 dark:text-slate-700" />
              <span>{isVietnamese ? 'Hiện không có máy nào khả dụng.' : 'No machines currently available.'}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFilterChange('ALL')}
                  className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  {isVietnamese ? 'Xem tất cả máy' : 'Show all machines'}
                </button>
                <button
                  onClick={() => setShowSiteSelectorModal(true)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  {isVietnamese ? 'Đổi Trạm / Chi nhánh khác' : 'Switch Station'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredMachines.map((m) => {
                const isAvailable = m.status === 'AVAILABLE';
                const isMaintenance = m.status === 'MAINTENANCE';
                const isBusy = m.status === 'BUSY';
                const isSel = isAvailable && selectedMachine?.machineId === m.machineId;
                const isDryer = m.kind === 'DRYER' || m.className?.toLowerCase().includes('sấy');

                return (
                  <div
                    key={m.machineId}
                    onClick={() => isAvailable && handleSelectMachine(m)}
                    className={`relative p-4 rounded-2xl border transition-all ${
                      isMaintenance
                        ? 'opacity-65 cursor-not-allowed border-rose-200 dark:border-rose-900/50 bg-rose-50/25 dark:bg-rose-950/20'
                        : isBusy
                          ? 'opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'
                          : isSel
                            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-md ring-2 ring-blue-500/20 cursor-pointer'
                            : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 cursor-pointer bg-white dark:bg-slate-900 hover:shadow-sm'
                    }`}
                  >
                    {/* Top Row: Machine Code + Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-sm font-extrabold text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg bg-blue-100/70 dark:bg-blue-900/40 shrink-0">
                          {m.code}
                        </span>
                        {isDryer ? (
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 flex items-center gap-1 border border-amber-300 dark:border-amber-800 whitespace-nowrap shrink-0">
                            <Wind className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            MÁY SẤY
                          </span>
                        ) : (
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 flex items-center gap-1 border border-blue-300 dark:border-blue-800 whitespace-nowrap shrink-0">
                            <WashingMachine className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            MÁY GIẶT
                          </span>
                        )}
                      </div>
                      {isMaintenance ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 whitespace-nowrap shrink-0">
                          <Wrench className="w-3 h-3 text-rose-500 shrink-0" />
                          {isVietnamese ? 'BẢO TRÌ' : 'MAINTENANCE'}
                        </span>
                      ) : isBusy ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 whitespace-nowrap shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          {isVietnamese ? 'ĐANG BẬN' : 'IN USE'}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 whitespace-nowrap shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          {isVietnamese ? 'SẴN SÀNG' : 'AVAILABLE'}
                        </span>
                      )}
                    </div>

                    {/* Machine Title */}
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {m.className || (isDryer ? 'Máy Sấy Nhiệt Gas' : 'Máy Giặt Cửa Ngang')}
                    </div>

                    {/* Specs / IoT Telemetry */}
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span>{isVietnamese ? 'Tải trọng:' : 'Capacity:'} <strong className="text-slate-700 dark:text-slate-200">{m.capacityKg || 10}kg</strong></span>
                      {isMaintenance ? (
                        <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          {isVietnamese ? 'Tạm ngưng phục vụ' : 'Out of service'}
                        </span>
                      ) : isBusy ? (
                        <span className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {isVietnamese ? 'Đang hoạt động' : 'Running'}
                        </span>
                      ) : (
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {m.temperature ? `Nhiệt độ: ${m.temperature}°C` : 'IoT Ready'}
                        </span>
                      )}
                    </div>

                    {/* Selected Checkmark overlay icon */}
                    {isSel && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500">
              {selectedMachine ? (
                <span>
                  {isVietnamese ? 'Đã chọn máy:' : 'Selected:'} <strong className="text-blue-600 font-bold">{selectedMachine.code}</strong> ({selectedMachine.className || selectedMachine.kind})
                </span>
              ) : (
                <span className="text-amber-500">{isVietnamese ? 'Vui lòng chọn 1 máy khả dụng để tiếp tục' : 'Please select an available machine to proceed'}</span>
              )}
            </div>

            <button
              disabled={!selectedMachine || selectedMachine.status !== 'AVAILABLE'}
              onClick={() => setStep(2)}
              className="w-full sm:w-auto px-7 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isVietnamese ? 'Tiếp tục: Chọn chu trình giặt' : 'Next: Select Wash Cycle'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BƯỚC 2: CHỌN CHU TRÌNH GIẶT                               */}
      {/* ========================================================= */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600" />
              {isVietnamese ? 'Chọn chu trình giặt sấy phù hợp' : 'Select Wash & Dry Program'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isVietnamese
                ? 'Tự động định lượng xà phòng OMO Matic và nước xả Comfort kháng khuẩn'
                : 'Automated detergent & softener injection tailored for your laundry load'}
            </p>
          </div>

          {/* Thông báo máy đang chọn & chu trình tương thích */}
          <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span>
                {isVietnamese ? 'Máy đang chọn:' : 'Selected Machine:'} <strong className="font-bold font-mono text-sm text-blue-700 dark:text-blue-300">{selectedMachine?.code}</strong> ({selectedMachine?.className || selectedMachine?.kind}) - <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{isVietnamese ? '100% tương thích' : '100% Compatible'}</span>
              </span>
            </div>
            <button onClick={() => setStep(1)} className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer">
              {isVietnamese ? 'Đổi máy' : 'Change'} →
            </button>
          </div>

          <div className="space-y-3">
            {getCompatibleCyclesForMachine(selectedMachine).map((c) => {
              const isSel = selectedCycle?.offeringId ? selectedCycle.offeringId === c.offeringId : selectedCycle?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCycle(c)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isSel
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm ring-1 ring-blue-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">{c.name}</span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                        {c.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{c.desc}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-medium pt-1">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        {c.time}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {isVietnamese ? 'Tự động cấp xà phòng & nước xả vải' : 'Auto soap & softener included'}
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                      {c.price.toLocaleString('vi-VN')} ₫
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center mt-1.5 transition ${isSel
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                        : 'border-slate-300 dark:border-slate-700'
                        }`}
                    >
                      {isSel && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer font-medium"
            >
              {isVietnamese ? '← Quay lại chọn máy' : '← Back to machines'}
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              <span>{isVietnamese ? 'Tiếp tục: Chọn Voucher ưu đãi' : 'Next: Apply Promo Voucher'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BƯỚC 3: CHỌN VOUCHER (HIỂN THỊ GIẢM GIÁ & GẠCH GIÁ GỐC)   */}
      {/* ========================================================= */}
      {step === 3 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
          {/* Header Step 3 */}
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{isVietnamese ? 'Chọn Voucher & Mã Giảm Giá' : 'Select Voucher & Promo Codes'}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isVietnamese
                ? 'Áp dụng mã ưu đãi để nhận chiết khấu trực tiếp trên chu trình giặt của bạn'
                : 'Apply vouchers to get instant discounts on your laundry cycle'}
            </p>
          </div>

          {/* Danh Sách Voucher Khả Dụng Dưới Dạng Coupon Ticket */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>{isVietnamese ? 'Danh sách Voucher khả dụng' : 'Available Vouchers'}</span>
            </div>

            {eligibleVouchers.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <Ticket className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                  {isVietnamese ? 'Hiện chưa có mã voucher phù hợp cho đơn này' : 'No eligible vouchers for this order'}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {isVietnamese
                    ? 'Bạn có thể nhập các mã ưu đãi đặc biệt ở khung phía trên.'
                    : 'You can enter promo codes manually in the box above.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {eligibleVouchers.map((v) => {
                  const isSel = selectedVoucher?.id === v.id || selectedVoucher?.code === v.code;
                  const projectedDiscount =
                    (v.type === 'PERCENT' || v.isPercent)
                      ? Math.min(Math.round((currentSubtotal * (v.percent || v.discountValue || 0)) / 100), v.maxDiscount || Infinity)
                      : Math.min(v.fixedAmount || v.discountValue || 0, currentSubtotal);

                  return (
                    <div
                      key={v.id || v.code}
                      onClick={() => setSelectedVoucher(isSel ? null : v)}
                      className={`group relative flex rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${isSel
                        ? 'border-2 border-blue-600 dark:border-blue-500 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/30 shadow-lg shadow-blue-500/15 ring-2 ring-blue-500/30 scale-[1.01]'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md'
                        }`}
                    >
                      {/* ========================================= */}
                      {/* CUỐNG VÉ COUPON (LEFT TICKET STUB)        */}
                      {/* ========================================= */}
                      <div
                        className={`relative w-28 sm:w-32 flex-shrink-0 p-3 sm:p-4 flex flex-col justify-between items-center text-center text-white ${v.type === 'PERCENT'
                          ? 'bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700'
                          : 'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700'
                          }`}
                      >
                        {/* Top Micro Label */}
                        <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md flex items-center gap-1 shadow-sm">
                          <Gift className="w-2.5 h-2.5 text-amber-200" />
                          <span>ƯU ĐÃI</span>
                        </span>

                        {/* Center Hero Discount Value */}
                        <div className="my-auto py-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80 block -mb-0.5">
                            GIẢM
                          </span>
                          {v.type === 'PERCENT' || v.isPercent ? (
                            <div className="text-3xl sm:text-4xl font-black tracking-tight leading-none drop-shadow-sm">
                              {v.percent}%
                            </div>
                          ) : (
                            <div className="text-xl sm:text-2xl font-black tracking-tight leading-none drop-shadow-sm">
                              {Number(v.fixedAmount || v.discountValue || 0) >= 1000
                                ? `${(Number(v.fixedAmount || v.discountValue || 0) / 1000).toLocaleString('vi-VN')}K`
                                : `${Number(v.fixedAmount || v.discountValue || 0).toLocaleString('vi-VN')} ₫`}
                            </div>
                          )}
                          <span className="text-[9px] font-bold uppercase tracking-wider text-white/90 block mt-1">
                            {v.type === 'PERCENT' || v.isPercent ? 'ĐƠN GIẶT' : 'TIỀN MẶT'}
                          </span>
                        </div>

                        {/* Bottom Limit Note */}
                        <div className="w-full text-[9px] font-semibold text-white/80 truncate px-1">
                          {v.maxDiscount ? `Tối đa ${(v.maxDiscount / 1000).toLocaleString('vi-VN')}k` : (v.type === 'PERCENT' || v.isPercent ? 'Giảm theo %' : 'Trừ thẳng giá')}
                        </div>

                        {/* Semicircular Ticket Cutout Notches */}
                        <div className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 z-10" />
                        <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 z-10" />
                        <div className="absolute top-2.5 bottom-2.5 -right-[1px] border-r border-dashed border-white/40 z-10" />
                      </div>

                      {/* ========================================= */}
                      {/* THÂN VÉ CHI TIẾT (RIGHT TICKET BODY)     */}
                      {/* ========================================= */}
                      <div className="flex-1 p-3.5 sm:p-4 flex flex-col justify-between border-l border-dashed border-slate-200 dark:border-slate-700 space-y-2.5">
                        {/* Top Row: Target Audience & Selection Status */}
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            {v.memberOnly ? (
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-purple-600" />
                                <span>Hội viên</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1">
                                <Users className="w-3 h-3 text-sky-600" />
                                <span>Tất cả khách</span>
                              </span>
                            )}
                          </div>

                          {isSel && (
                            <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center gap-1 shadow-sm ring-2 ring-blue-500/20 animate-in fade-in zoom-in-95 duration-200">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>ĐÃ CHỌN</span>
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {v.name}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {v.desc}
                          </p>
                        </div>

                        {/* Code Pill & Real-Time Deduction */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-800 flex items-center gap-1.5">
                            <Ticket className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{v.code}</span>
                          </div>

                          <div className="text-right">
                            <div className="text-[10px] text-slate-400 font-medium">
                              {isVietnamese ? 'Trừ vào đơn:' : 'Deduction:'}
                            </div>
                            <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
                              {currentSubtotal > 0
                                ? `-${projectedDiscount.toLocaleString('vi-VN')} ₫`
                                : (v.shortDiscountLabel || v.badgeDiscountLabel)}
                            </div>
                          </div>
                        </div>

                        {/* Footer Metadata: Expiry & Cap */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{v.expiry}</span>
                          </span>
                          <span className="flex items-center gap-1 truncate max-w-[50%]">
                            <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0" />
                            <span className="truncate">
                              {v.maxDiscount ? `Tối đa ${v.maxDiscount.toLocaleString('vi-VN')} ₫` : 'Không giới hạn trần'}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* BẢNG TÍNH GIÁ TỨC THÌ (GẠCH GIÁ BAN ĐẦU TỪ BACKEND QUOTE) */}
          {/* ========================================================= */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-800/80 dark:via-slate-800/50 dark:to-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                {isVietnamese ? 'Bảng tính giá áp dụng ưu đãi' : 'Instant Price Calculation'}
              </h3>
              {selectedVoucher && (
                <div className="flex items-center gap-2">
                  {!isQuoteInSync && (
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>{isVietnamese ? 'Đang đồng bộ...' : 'Syncing...'}</span>
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    {isVietnamese ? `Đã chọn mã ${selectedVoucher.code} (${selectedVoucher.shortDiscountLabel || selectedVoucher.badgeDiscountLabel})` : `Applied ${selectedVoucher.code}`}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2.5 text-sm">
              {/* Giá gốc ban đầu (BỊ GẠCH NGANG NẾU CÓ GIẢM GIÁ) */}
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span>{isVietnamese ? 'Giá gốc niêm yết:' : 'Original Price:'}</span>
                <span
                  className={
                    totalDiscount > 0
                      ? 'line-through text-slate-400 dark:text-slate-500 font-semibold text-base decoration-2 decoration-rose-500/70'
                      : 'font-bold text-slate-900 dark:text-white'
                  }
                >
                  {originalPrice.toLocaleString('vi-VN')} ₫
                </span>
              </div>

              {/* Danh sách toàn bộ các ưu đãi & chiết khấu đã áp dụng (Khuyến mãi, Voucher, Hạng thành viên) */}
              {appliedDiscounts.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {isVietnamese ? 'Ưu đãi & Khuyến mãi được áp dụng:' : 'Applied Discounts & Promotions:'}
                  </div>
                  {appliedDiscounts.map((d, idx) => {
                    const isVoucher = d.category === 'VOUCHER';
                    const isTier = d.category === 'TIER';
                    return (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5 flex-1 pr-2">
                          {isVoucher ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 flex-shrink-0">
                              <Ticket className="w-3 h-3" />
                              VOUCHER
                            </span>
                          ) : isTier ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1 flex-shrink-0">
                              <ShieldCheck className="w-3 h-3" />
                              HỘI VIÊN
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 flex-shrink-0">
                              <Sparkles className="w-3 h-3" />
                              PROMOTION
                            </span>
                          )}
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {d.displayName || d.ruleName}
                          </span>
                        </div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                          -{d.discountAmount.toLocaleString('vi-VN')} ₫
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Thông báo chi tiết trạng thái Voucher đã chọn */}
              {selectedVoucher && (
                <div className="pt-1">
                  {liveQuote?.isVoucherApplied === false ? (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>
                        {isVietnamese ? `Mã ${selectedVoucher.code}: ` : `Voucher ${selectedVoucher.code}: `}
                        {liveQuote.voucherMessage || (isVietnamese ? 'Chưa đủ điều kiện áp dụng cho đơn này' : 'Conditions not met')}
                      </span>
                    </div>
                  ) : liveQuote?.isVoucherApplied && liveQuote?.voucherMessage ? (
                    <div className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>{liveQuote.voucherMessage}</span>
                    </div>
                  ) : null}
                </div>
              )}


              {/* Tổng thanh toán thực tế */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-end">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {isVietnamese ? 'Số tiền thanh toán thực tế:' : 'Final Amount to Pay:'}
                  </div>
                  {totalDiscount > 0 && (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                      🎉 {isVietnamese ? `Tiết kiệm được ${totalDiscount.toLocaleString('vi-VN')} ₫` : `You saved ${totalDiscount.toLocaleString('vi-VN')} ₫`}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
                    {finalPrice.toLocaleString('vi-VN')} ₫
                  </div>
                </div>
              </div>

              {/* Điểm tích lũy thăng hạng nhận được từ đơn hàng */}
              {isMember && finalPrice > 0 && (
                <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-yellow-500/15 border border-amber-300/50 dark:border-amber-700/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Crown className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-amber-900 dark:text-amber-200 block">
                        {isVietnamese ? 'Tích lũy điểm hạng khi hoàn tất:' : 'Tier points upon completion:'}
                      </span>
                      <span className="text-[10px] text-amber-700/75 dark:text-amber-400/75">
                        {isVietnamese ? '1 VNĐ = 1 điểm thăng cấp hội viên' : '1 VND = 1 tier point'}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-300 text-sm">
                    +{finalPrice.toLocaleString('vi-VN')} pts
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* THÔNG TIN KHÁCH HÀNG / LIÊN HỆ */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isMember
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400'
                : 'bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400'
                }`}>
                {isMember ? <CheckCircle2 className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>{isVietnamese ? 'Thông tin người nhận đồ:' : 'Customer Information:'}</span>
                  {isMember && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                      {isVietnamese ? 'Hội viên' : 'Member'}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isMember ? (
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {profile?.fullName || user?.fullName || profile?.username || user?.username || 'Thành viên'}
                      {profile?.phoneNumber || user?.phone || user?.phoneNumber ? (
                        <> • <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{profile?.phoneNumber || user?.phone || user?.phoneNumber}</span></>
                      ) : (
                        <> • <span className="text-slate-500 dark:text-slate-400 font-medium">Hội viên {tierName}</span></>
                      )}
                    </span>
                  ) : guestName && guestPhone ? (
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {guestName} • <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{guestPhone}</span>
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{isVietnamese ? 'Khách vãng lai: Yêu cầu Họ tên & SĐT khi nhấn Thanh toán' : 'Guest: Name & Phone required'}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Trạng thái xác thực / Nút nhập cho khách vãng lai */}
            {isMember ? (
              <div className="self-start sm:self-auto flex items-center gap-2">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{isVietnamese ? 'Tài khoản Hội viên' : 'Member Account'}</span>
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setModalCustomerName(guestName || '');
                  setModalCustomerPhone(guestPhone || '');
                  setModalInputError('');
                  setShowCustomerModal(true);
                }}
                className="self-start sm:self-auto px-3.5 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition border border-blue-200 dark:border-blue-800 cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{guestName && guestPhone ? (isVietnamese ? 'Thay đổi' : 'Edit') : (isVietnamese ? 'Nhập thông tin' : 'Enter Info')}</span>
              </button>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer font-medium"
            >
              {isVietnamese ? '← Chọn lại chu trình' : '← Change wash cycle'}
            </button>

            <button
              onClick={handleProceedToPaymentStep}
              className="px-7 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/25 hover:shadow-lg transition flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>{isVietnamese ? 'Tiếp tục: Bước thanh toán' : 'Continue to Payment'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BƯỚC 4: THANH TOÁN QR KI-ỐT                               */}
      {/* ========================================================= */}
      {step === 4 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Order summary */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                {isVietnamese ? 'Xác nhận đơn giặt trực tiếp' : 'Confirm Direct Wash Order'}
              </h3>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3 text-xs">
                {isMember ? (
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{isVietnamese ? 'Khách hàng:' : 'Customer:'}</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{profile?.fullName || user?.fullName || profile?.username || user?.username || 'Hội viên'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        Hội viên {tierName}
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className="pb-3 border-b border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{isVietnamese ? 'Thông tin khách nhận đồ:' : 'Customer Information:'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setModalCustomerName(guestName || '');
                          setModalCustomerPhone(guestPhone || '');
                          setModalInputError('');
                          setShowCustomerModal(true);
                        }}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isVietnamese ? 'Sửa' : 'Edit'}</span>
                      </button>
                    </div>
                    {guestName && guestPhone ? (
                      <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs">{guestName}</div>
                          <div className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">{guestPhone}</div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-semibold border border-blue-200 dark:border-blue-800">
                          Khách vãng lai
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setModalCustomerName(guestName || '');
                          setModalCustomerPhone(guestPhone || '');
                          setModalInputError('');
                          setShowCustomerModal(true);
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-98"
                      >
                        <User className="w-3.5 h-3.5 text-amber-600" />
                        <span>{isVietnamese ? 'Chạm để nhập Họ tên & Số điện thoại' : 'Click to enter Name & Phone'}</span>
                      </button>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 whitespace-nowrap">{isVietnamese ? 'Trạm / Chi nhánh:' : 'Station / Branch:'}</span>
                  <span className="font-bold text-slate-900 dark:text-white truncate max-w-[220px] text-right">
                    {selectedSite?.name || selectedMachine?.siteName || (isVietnamese ? 'Trạm Ki-ốt' : 'Kiosk Station')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{selectedMachine?.kind === 'DRYER' ? (isVietnamese ? 'Máy sấy phục vụ:' : 'Dryer:') : (isVietnamese ? 'Máy giặt phục vụ:' : 'Washer:')}</span>
                  <span className="font-bold text-blue-600 font-mono text-sm">
                    {selectedMachine?.code} ({selectedMachine?.className || selectedMachine?.kind})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{selectedMachine?.kind === 'DRYER' ? (isVietnamese ? 'Chu trình sấy:' : 'Dry Program:') : (isVietnamese ? 'Chu trình giặt:' : 'Wash Program:')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedCycle?.name || (selectedMachine?.kind === 'DRYER' ? 'Sấy Tiêu Chuẩn' : 'Giặt Tiêu Chuẩn')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{selectedMachine?.kind === 'DRYER' ? (isVietnamese ? 'Thời gian sấy:' : 'Drying Time:') : (isVietnamese ? 'Thời gian giặt:' : 'Washing Time:')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedCycle?.time || '35 phút'}
                  </span>
                </div>
                {appliedDiscounts.map((d, idx) => {
                  const isVoucher = d.category === 'VOUCHER';
                  const isTier = d.category === 'TIER';
                  return (
                    <div key={idx} className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 flex items-center gap-1.5 truncate pr-2">
                        {isVoucher ? (
                          <Ticket className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        ) : isTier ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{d.displayName || d.ruleName}:</span>
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        -{d.discountAmount.toLocaleString('vi-VN')} ₫
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Pricing breakdown with strikethrough */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">{isVietnamese ? 'Giá niêm yết:' : 'Original Price:'}</span>
                  <span className={totalDiscount > 0 ? 'line-through text-slate-400 font-medium decoration-rose-500/60' : 'font-semibold'}>
                    {originalPrice.toLocaleString('vi-VN')} ₫
                  </span>
                </div>

                {appliedDiscounts.map((d, idx) => {
                  const isVoucher = d.category === 'VOUCHER';
                  const isTier = d.category === 'TIER';
                  return (
                    <div key={idx} className="flex justify-between text-emerald-600 font-semibold">
                      <span className="truncate pr-2 flex items-center gap-1">
                        {isVoucher ? (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex-shrink-0">[Voucher]</span>
                        ) : isTier ? (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">[Hội viên]</span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">[Khuyến mãi]</span>
                        )}
                        <span className="truncate">{d.displayName || d.ruleName}</span>
                      </span>
                      <span className="flex-shrink-0">-{d.discountAmount.toLocaleString('vi-VN')} ₫</span>
                    </div>
                  );
                })}

                {totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold pt-1 border-t border-slate-200 dark:border-slate-700/60">
                    <span>{isVietnamese ? 'Tổng chiết khấu & Ưu đãi:' : 'Total Discount:'}</span>
                    <span>-{totalDiscount.toLocaleString('vi-VN')} ₫</span>
                  </div>
                )}


                <div className="flex justify-between text-base font-extrabold text-blue-600 dark:text-blue-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>{isVietnamese ? 'Tổng thanh toán:' : 'Total to Pay:'}</span>
                  <span className="text-xl">{finalPrice.toLocaleString('vi-VN')} ₫</span>
                </div>

                {isMember && finalPrice > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800">
                    <span className="flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span>{isVietnamese ? 'Điểm hạng nhận được sau khi giặt xong:' : 'Tier points to earn upon completion:'}</span>
                    </span>
                    <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-300">
                      +{finalPrice.toLocaleString('vi-VN')} pts
                    </span>
                  </div>
                )}
              </div>

              {/* TÙY CHỌN: THANH TOÁN BẰNG VÍ (CHỈ DÀNH CHO HỘI VIÊN ĐÃ ĐĂNG NHẬP, KHÁCH VÃNG LAI KHÔNG CÓ) */}
              {!user?.isGuest && profile && wallet && (
                <div className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                      <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Hoặc thanh toán bằng Số dư Ví:</span>
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {currentBalance.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <button
                    disabled={submitting || currentBalance < finalPrice}
                    onClick={handlePayWithWallet}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Thanh toán ngay bằng Ví (-{finalPrice.toLocaleString('vi-VN')} ₫)</span>
                  </button>
                </div>
              )}

              {/* NÚT CHỌN LẠI VOUCHER */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100/90 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 rounded-xl font-bold text-xs shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <Ticket className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>{isVietnamese ? '← Chọn lại Voucher' : '← Change Voucher'}</span>
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* CỘT PHẢI: KHUNG MÃ VIETQR PAYOS                           */}
            {/* ========================================================= */}
            <div className="space-y-4">
              <div className="p-5 sm:p-6 bg-slate-900 border-2 border-indigo-500/80 rounded-2xl shadow-xl shadow-indigo-500/10 text-white text-center space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wide">
                    <QrCode className="w-4 h-4 text-indigo-400" />
                    <span>Mã VietQR PayOS (Napas247)</span>
                  </div>
                  {submitting && (
                    <span className="text-[11px] text-amber-400 font-semibold animate-pulse flex items-center gap-1.5">
                      <RotateCw className="w-3 h-3 animate-spin" />
                      <span>{isVietnamese ? 'Đang tạo mã...' : 'Generating...'}</span>
                    </span>
                  )}
                </div>

                {/* Khung ảnh QR */}
                <div className="relative inline-block mx-auto p-3.5 bg-white rounded-2xl shadow-inner">
                  {submitting ? (
                    <div className="w-52 h-52 flex flex-col items-center justify-center text-slate-500 gap-2">
                      <RotateCw className="w-8 h-8 animate-spin text-indigo-600" />
                      <span className="text-xs font-semibold text-slate-600">
                        {isVietnamese ? 'Đang khởi tạo mã VietQR...' : 'Generating VietQR...'}
                      </span>
                    </div>
                  ) : kioskQrUrl ? (
                    <img src={kioskQrUrl} alt="VietQR PayOS" className="w-52 h-52 mx-auto rounded-lg object-contain" />
                  ) : (
                    <div className="w-52 h-52 flex flex-col items-center justify-center text-slate-500 gap-2">
                      <QrCode className="w-12 h-12 text-slate-300" />
                      <button
                        type="button"
                        onClick={handleRetryCreateQr}
                        className="text-xs px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer active:scale-95"
                      >
                        {isVietnamese ? 'Tạo lại mã VietQR' : 'Retry Generate QR'}
                      </button>
                    </div>
                  )}
                  {/* Corner marks */}
                  <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-indigo-600"></div>
                  <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-indigo-600"></div>
                  <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-indigo-600"></div>
                  <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-indigo-600"></div>
                </div>

                {/* Hướng dẫn quét mã */}
                <p className="text-xs text-indigo-200 font-medium">
                  {isVietnamese
                    ? 'Mở ứng dụng Ngân hàng hoặc MoMo quét mã chuyển khoản Napas247'
                    : 'Scan QR with any Mobile Banking App or MoMo'}
                </p>

                {/* Thông tin chuyển khoản VietQR */}
                {kioskOrder?.payment && (
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-left space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Ngân hàng:</span>
                      <span className="font-bold text-white">MB Bank (970422)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Số tài khoản:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-indigo-300 text-sm select-all">{kioskOrder.payment.accountNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(kioskOrder.payment.accountNumber, 'accNum')}
                          className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition cursor-pointer active:scale-90"
                          title="Sao chép số tài khoản"
                        >
                          {copiedField === 'accNum' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Chủ tài khoản:</span>
                      <span className="font-bold text-white uppercase">{kioskOrder.payment.accountName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Số tiền:</span>
                      <span className="font-bold text-emerald-400 text-sm">{Number(kioskOrder.payment.amount || finalPrice).toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-700/60">
                      <span className="text-slate-400">Nội dung CK:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-amber-300 select-all">{kioskOrder.payment.description}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(kioskOrder.payment.description, 'desc')}
                          className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition cursor-pointer active:scale-90"
                          title="Sao chép nội dung chuyển khoản"
                        >
                          {copiedField === 'desc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL YÊU CẦU NHẬP HỌ TÊN VÀ SỐ ĐIỆN THOẠI               */}
      {/* ======================================================== */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="relative my-auto mx-auto w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setShowCustomerModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with Icon */}
            <div className="flex items-start gap-3.5 pr-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {isVietnamese ? 'Thông tin người nhận đồ (Khách vãng lai)' : 'Customer Contact Info (Walk-in Guest)'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {isVietnamese
                    ? 'Dành cho khách vãng lai: Vui lòng nhập họ tên & số điện thoại để tra cứu và nhận thông báo khi máy hoàn tất.'
                    : 'For walk-in guests: Please enter your name & phone number to track your laundry order and receive completion alerts.'}
                </p>
              </div>
            </div>

            {/* Selected Machine & Price summary pill */}
            {selectedMachine && (
              <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <WashingMachine className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedMachine.code} • {selectedCycle?.name || (selectedMachine.kind === 'DRYER' ? 'Sấy' : 'Giặt')}
                  </span>
                </div>
                <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                  {finalPrice.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            )}

            {/* Error Message in Modal */}
            {modalInputError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/80 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalInputError}</span>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleConfirmCustomerModal} className="space-y-4">
              {/* Họ và tên */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isVietnamese ? 'Họ và tên của bạn' : 'Full Name'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    autoFocus
                    required
                    autoComplete="off"
                    value={modalCustomerName}
                    onChange={(e) => {
                      setModalCustomerName(e.target.value);
                      if (modalInputError) setModalInputError('');
                    }}
                    placeholder={isVietnamese ? 'Ví dụ: Nguyễn Văn An' : 'e.g. John Doe'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isVietnamese ? 'Số điện thoại nhận thông báo' : 'Phone Number'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    autoComplete="off"
                    value={modalCustomerPhone}
                    onChange={(e) => {
                      setModalCustomerPhone(e.target.value);
                      if (modalInputError) setModalInputError('');
                    }}
                    placeholder={isVietnamese ? 'Ví dụ: 0912345678' : 'e.g. 0912345678'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-mono tracking-wide"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {isVietnamese
                    ? 'Dùng để tra cứu tình trạng máy giặt và nhận đồ tại trạm.'
                    : 'Used to check machine status and collect your clothes.'}
                </p>
              </div>

              {/* Security Note */}
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isVietnamese
                    ? 'Thông tin được bảo mật và chỉ dùng cho đơn hàng này tại trạm.'
                    : 'Information is encrypted and only used for this order.'}
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  {isVietnamese ? 'Quay lại' : 'Back'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs shadow-lg shadow-blue-500/25 hover:shadow-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  {submitting ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>{isVietnamese ? 'Đang tạo mã...' : 'Creating QR...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isVietnamese ? 'Xác nhận & Thanh toán' : 'Confirm & Pay'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL THÔNG BÁO THANH TOÁN THÀNH CÔNG (LUÔN Ở CHÍNH GIỮA) */}
      {/* ======================================================== */}
      {paymentSuccessData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative my-auto mx-auto w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Background Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Success Icon */}
            <div className="relative inline-block mx-auto mt-1">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-400 dark:border-emerald-600 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xl shadow-emerald-500/25">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 fill-current" />
              </div>
            </div>

            {/* Title & Prompt */}
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {isVietnamese ? 'Thanh toán thành công!' : 'Payment Successful!'}
              </h3>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                {isVietnamese ? 'Máy đã sẵn sàng chạy' : 'Machine is Ready'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isVietnamese
                  ? 'Đơn giặt đã thanh toán xong. Vui lòng cho đồ vào máy và bấm Bắt đầu giặt.'
                  : 'Payment completed. Please load laundry and click Start Wash.'}
              </p>
            </div>

            {/* Order Brief Info */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-4 text-xs text-left space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{isVietnamese ? 'Mã đơn hàng:' : 'Order Code:'}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">#{paymentSuccessData.orderCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{isVietnamese ? 'Máy phục vụ:' : 'Machine:'}</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {paymentSuccessData.machineKind === 'DRYER' ? 'Máy sấy ' : 'Máy giặt '}
                  {paymentSuccessData.machineCode}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{isVietnamese ? 'Chu trình:' : 'Program:'}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {paymentSuccessData.cycleName} ({paymentSuccessData.durationMinutes} phút)
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-400">{isVietnamese ? 'Số tiền đã trả:' : 'Amount Paid:'}</span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  {paymentSuccessData.amount?.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>

            {/* Redirect Action Button */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleGoToOrders}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
              >
                <span>{isVietnamese ? 'Chuyển hướng qua đơn giặt' : 'Go to My Laundry Orders'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[11px] text-slate-400">
                {isVietnamese
                  ? `Tự động chuyển hướng sau ${successCountdown}s...`
                  : `Auto redirecting in ${successCountdown}s...`}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================= */}
      {/* MODAL CHỌN TRẠM / CHI NHÁNH CHO KI-ỐT                    */}
      {/* ========================================================= */}
      {showSiteSelectorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {isVietnamese ? 'Chọn Trạm / Chi nhánh Ki-ốt' : 'Select Kiosk Station / Branch'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isVietnamese
                      ? 'Ki-ốt sẽ tải danh sách máy giặt/sấy tương ứng tại trạm này'
                      : 'Kiosk will load available machines for this branch'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSiteSelectorModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sites List */}
            <div className="p-5 space-y-2.5 max-h-[60vh] overflow-y-auto">
              {sites.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {loadingSites
                    ? (isVietnamese ? 'Đang tải danh sách chi nhánh...' : 'Loading branches...')
                    : (isVietnamese ? 'Không tìm thấy chi nhánh nào.' : 'No branches found.')}
                </div>
              ) : (
                sites.map((st) => {
                  const stId = st.siteId || st.id;
                  const isCurrent = (selectedSite?.siteId || selectedSite?.id) === stId;
                  return (
                    <div
                      key={stId}
                      onClick={() => handleSelectSite(st)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${isCurrent
                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {st.name}
                          </span>
                          {st.code && (
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {st.code}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white uppercase tracking-wider">
                              {isVietnamese ? 'ĐANG CHỌN' : 'CURRENT'}
                            </span>
                          )}
                        </div>
                        {st.address && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{st.address}</span>
                          </p>
                        )}
                        {st.totalMachines !== undefined && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            {isVietnamese ? `Quy mô: ${st.totalMachines} máy` : `${st.totalMachines} machines`}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0">
                        {isCurrent ? (
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-700 text-slate-300 flex items-center justify-center">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSiteSelectorModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                {isVietnamese ? 'Đóng' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
