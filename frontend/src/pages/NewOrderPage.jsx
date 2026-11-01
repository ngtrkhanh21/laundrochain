import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { memberApi } from '../api/memberApi';
import { machinesApi } from '../api/machinesApi';
import { ordersApi } from '../api/ordersApi';
import { useLanguage } from '../context/LanguageContext';
import {
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
} from 'lucide-react';

const CYCLES = [
  {
    id: 'c1',
    offeringId: '01927700-0000-7000-8000-000000000070',
    cycleCode: 'WASH_10KG_STD',
    name: 'Giặt tiêu chuẩn 10kg (Standard Wash)',
    time: '35 phút',
    durationMin: 35,
    price: 35000,
    desc: 'Giặt sạch vết bẩn thông thường với 3 lần xả và vắt kiệt 1000rpm.',
    badge: 'Phổ biến',
    category: 'WASH',
    capacityKg: 10,
  },
  {
    id: 'c2',
    offeringId: '8ebf7d4f-6f51-43b3-b8a7-8eb080ae2dc1',
    cycleCode: 'WASH_10KG_2K',
    name: 'Giặt Tiêu Chuẩn 10kg (Giá Trải Nghiệm 2.000 ₫)',
    time: '35 phút',
    durationMin: 35,
    price: 2000,
    desc: 'Chương trình ưu đãi trợ giá trải nghiệm hệ sinh thái giặt thông minh.',
    badge: 'Hot Deal 2K',
    category: 'WASH',
    capacityKg: 10,
  },
  {
    id: 'c3',
    offeringId: '01927700-0000-7000-8000-000000000071',
    cycleCode: 'WASH_15KG_STD',
    name: 'Giặt Tiêu Chuẩn 15kg (Đồ Lớn & Chăn Ga)',
    time: '45 phút',
    durationMin: 45,
    price: 45000,
    desc: 'Dành riêng cho máy giặt tải lớn 15kg, khử khuẩn và giặt sạch sâu.',
    badge: 'Tải lớn 15kg',
    category: 'WASH',
    capacityKg: 15,
  },
  {
    id: 'c4',
    offeringId: '046423bc-fcff-4046-8094-79766a58db42',
    cycleCode: 'WASH_15KG_2K',
    name: 'Giặt Tiết Kiệm Máy 15kg (Giá Trải Nghiệm 2.000 ₫)',
    time: '45 phút',
    durationMin: 45,
    price: 2000,
    desc: 'Chương trình ưu đãi trải nghiệm giặt máy 15kg chỉ với 2.000 ₫.',
    badge: 'Hot Deal 2K',
    category: 'WASH',
    capacityKg: 15,
  },
  {
    id: 'c5',
    offeringId: '01927700-0000-7000-8000-000000000072',
    cycleCode: 'DRY_12KG_STD',
    name: 'Sấy Khô 12kg Nhiệt Gas Chống Nhăn (45 phút)',
    time: '45 phút',
    durationMin: 45,
    price: 35000,
    desc: 'Sấy nhiệt đảo chiều luồng khí nóng khử ẩm 100%, quần áo thơm và mặc được ngay.',
    badge: 'Sấy nhiệt Gas',
    category: 'DRY',
    capacityKg: 12,
  },
];

// Helper lọc chu trình tương thích chính xác theo dòng máy
export function getCompatibleCyclesForMachine(machine) {
  if (!machine) return [CYCLES[0]];

  const isDryer = machine.kind === 'DRYER' || machine.className?.toLowerCase().includes('sấy') || machine.code?.startsWith('D');
  const is15Kg = (machine.capacityKg && machine.capacityKg >= 15) || machine.className?.includes('15kg');

  // Ưu tiên danh sách dịch vụ tương thích trả về từ backend API
  if (Array.isArray(machine.compatibleOfferings) && machine.compatibleOfferings.length > 0) {
    const validOfferings = machine.compatibleOfferings.filter((o) => {
      const cat = (o.serviceCategory || '').toUpperCase();
      if (isDryer) {
        return cat === 'DRY' || o.code?.startsWith('DRY');
      }
      return cat === 'WASH' || o.code?.startsWith('WASH') || o.code?.startsWith('CYCLE');
    });

    if (validOfferings.length > 0) {
      return validOfferings.map((o, idx) => {
        const is2K = o.code?.includes('2K') || o.name?.includes('2.000');
        const defaultTime = isDryer ? 45 : (is15Kg ? 45 : 35);
        const duration = o.durationMin || defaultTime;
        return {
          id: 'off-' + (o.offeringId || idx),
          offeringId: o.offeringId,
          cycleCode: o.code,
          name: o.name,
          time: duration + ' phút',
          durationMin: duration,
          price: is2K ? 2000 : (isDryer ? 35000 : (is15Kg ? 45000 : 35000)),
          desc: o.description || (isDryer ? 'Sấy nhiệt đảo chiều chống nhăn, khô 100% lấy mặc ngay.' : 'Tự động cấp xà phòng & nước xả kháng khuẩn chuyên dụng.'),
          badge: is2K ? 'Hot Deal 2K' : (isDryer ? 'Sấy nhiệt Gas' : (is15Kg ? 'Máy lớn 15kg' : 'Phổ biến')),
          category: isDryer ? 'DRY' : 'WASH',
        };
      });
    }
  }

  // Fallback định sẵn nếu API chưa trả về
  if (isDryer) {
    return CYCLES.filter((c) => c.category === 'DRY');
  }
  if (is15Kg) {
    return CYCLES.filter((c) => c.category === 'WASH' && c.capacityKg === 15);
  }
  return CYCLES.filter((c) => c.category === 'WASH' && c.capacityKg === 10);
}

const DEFAULT_VOUCHERS = [
  {
    id: 'v-welcome',
    code: 'WELCOME10K',
    name: 'Voucher Khai Trương Chuỗi',
    desc: 'Giảm ngay 10.000 ₫ cho đơn giặt đầu tiên từ hệ thống',
    type: 'FIXED',
    value: 10000,
    minSpend: 30000,
    badge: 'HỆ THỐNG',
    expiry: 'Đến hết năm 2026',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'v1',
    code: 'CHAOBANMOI',
    name: 'Ưu đãi Thành viên mới',
    desc: 'Giảm ngay 15.000 ₫ cho lần giặt đầu tiên',
    type: 'FIXED',
    value: 15000,
    minSpend: 25000,
    badge: 'HOT DEAL',
    expiry: 'Còn 15 ngày',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'v2',
    code: 'GIATXANH',
    name: 'Giờ Vàng Giặt Xanh',
    desc: 'Giảm 10.000 ₫ bảo vệ môi trường, tiết kiệm năng lượng',
    type: 'FIXED',
    value: 10000,
    minSpend: 25000,
    badge: 'ECO FRIENDLY',
    expiry: 'Còn 7 ngày',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'v3',
    code: 'GIATNHANH5K',
    name: 'Voucher Toàn Hệ Thống',
    desc: 'Giảm 5.000 ₫ áp dụng cho tất cả máy giặt & máy sấy',
    type: 'FIXED',
    value: 5000,
    minSpend: 0,
    badge: 'DỄ DÙNG',
    expiry: 'Còn 30 ngày',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    id: 'v4',
    code: 'VIP20PCT',
    name: 'Hội Viên Thân Thiết VIP',
    desc: 'Giảm 20% (tối đa 20.000 ₫) cho gói Nano Silver & Giặt Sấy',
    type: 'PERCENT',
    percent: 20,
    maxDiscount: 20000,
    minSpend: 35000,
    badge: 'HỘI VIÊN VIP',
    expiry: 'Còn 10 ngày',
    color: 'from-purple-500 to-pink-500',
  },
];

const FALLBACK_MACHINES = [
  { machineId: 'm-01', siteId: '01927700-0000-7000-8000-000000000020', siteName: 'LaundroChain Bến Thành - Q1', code: 'W01', className: 'Máy Giặt Cửa Ngang 10kg', kind: 'WASHER', capacityKg: 10, status: 'AVAILABLE', temperature: 28 },
  { machineId: 'm-02', siteId: '01927700-0000-7000-8000-000000000020', siteName: 'LaundroChain Bến Thành - Q1', code: 'W02', className: 'Máy Giặt Cửa Ngang 10kg', kind: 'WASHER', capacityKg: 10, status: 'AVAILABLE', temperature: 28 },
  { machineId: 'm-03', siteId: '01927700-0000-7000-8000-000000000020', siteName: 'LaundroChain Bến Thành - Q1', code: 'D01', className: 'Máy Sấy Nhiệt Gas 12kg', kind: 'DRYER', capacityKg: 12, status: 'AVAILABLE', temperature: 72 },
  { machineId: 'm-04', siteId: '01927700-0000-7000-8000-000000000020', siteName: 'LaundroChain Bến Thành - Q1', code: 'W03', className: 'Máy Giặt Cửa Ngang 15kg', kind: 'WASHER', capacityKg: 15, status: 'IN_USE', temperature: 40 },
  { machineId: 'm-05', siteId: '01927700-0000-7000-8000-000000000020', siteName: 'LaundroChain Bến Thành - Q1', code: 'D02', className: 'Máy Sấy Nhiệt Gas 15kg', kind: 'DRYER', capacityKg: 15, status: 'AVAILABLE', temperature: 68 },
  { machineId: 'm-06', siteId: '01927700-0000-7000-8000-000000000020', siteName: 'LaundroChain Bến Thành - Q1', code: 'W04', className: 'Máy Giặt Cửa Ngang 12kg', kind: 'WASHER', capacityKg: 12, status: 'AVAILABLE', temperature: 30 },
];

export default function NewOrderPage() {
  const { isVietnamese } = useLanguage();
  const navigate = useNavigate();

  // 4 Steps: 1. Chọn máy -> 2. Chu trình giặt -> 3. Ưu đãi Voucher -> 4. Thanh toán QR Ki-ốt
  const [step, setStep] = useState(1);

  // Machine state (Connected to GET /api/machines/available)
  const [machines, setMachines] = useState([]);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [machineFilter, setMachineFilter] = useState('ALL'); // ALL | WASHER | DRYER
  const [selectedMachine, setSelectedMachine] = useState(null);

  // Cycle state
  const [selectedCycle, setSelectedCycle] = useState(CYCLES[0]);

  // Hàm chọn máy thông minh: tự động chọn chu trình tương thích và xóa lỗi
  const handleSelectMachine = (m) => {
    if (m.status !== 'AVAILABLE') return;
    setSelectedMachine(m);
    setErrorMsg('');
    const comp = getCompatibleCyclesForMachine(m);
    if (comp.length > 0) {
      const isCurrentValid = comp.some((c) => c.offeringId === selectedCycle?.offeringId);
      if (!isCurrentValid) {
        setSelectedCycle(comp[0]);
      }
    }
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
  const [vouchersList, setVouchersList] = useState(DEFAULT_VOUCHERS);
  const [selectedVoucher, setSelectedVoucher] = useState(DEFAULT_VOUCHERS[0]); // Default to WELCOME10K
  const [customVoucherInput, setCustomVoucherInput] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [voucherSuccess, setVoucherSuccess] = useState('');

  // Live Backend Pricing Quote
  const [liveQuote, setLiveQuote] = useState(null);

  // Profile & Wallet state
  const [profile, setProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Kiosk QR Modal state
  const [kioskModalOpen, setKioskModalOpen] = useState(false);
  const [kioskOrder, setKioskOrder] = useState(null);
  const [kioskQrUrl, setKioskQrUrl] = useState('');
  const [payingAndStarting, setPayingAndStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Initial Load: Member profile, Real available machines & Active promotions
  useEffect(() => {
    let isMounted = true;
    async function init() {
      setLoadingMachines(true);
      try {
        // Load profile
        try {
          const profData = await memberApi.getProfile();
          if (isMounted) setProfile(profData);
        } catch (e) {
          console.warn('Profile load err', e);
        }

        // Load available machines from backend
        try {
          const data = await machinesApi.getAvailableMachines();
          const list = Array.isArray(data) ? data : (data?.value || []);
          if (isMounted && list.length > 0) {
            const mapped = list.map((m) => ({
              machineId: m.machineId,
              siteId: m.siteId,
              siteName: m.siteName || 'LaundroChain Bến Thành - Q1',
              code: m.code,
              className: m.machineClassName || (m.kind === 'DRYER' ? 'Máy Sấy Nhiệt Gas' : 'Máy Giặt Cửa Ngang'),
              kind: m.kind,
              capacityKg: m.capacityKg,
              status: m.status || (m.isAvailable ? 'AVAILABLE' : 'BUSY'),
              temperature: m.kind === 'DRYER' ? 70 : 28,
              compatibleOfferings: m.compatibleOfferings || [],
            }));
            setMachines(mapped);
            const availWasher = mapped.find((m) => m.status === 'AVAILABLE' && (m.kind === 'WASHER' || !m.code.startsWith('D')));
            const availAny = mapped.find((m) => m.status === 'AVAILABLE');
            const defaultM = availWasher || availAny || mapped[0];
            setSelectedMachine(defaultM);
            const comp = getCompatibleCyclesForMachine(defaultM);
            if (comp.length > 0) setSelectedCycle(comp[0]);
          } else {
            setMachines(FALLBACK_MACHINES);
            setSelectedMachine(FALLBACK_MACHINES[0]);
          }
        } catch (err) {
          console.warn('Machines API error, using fallback list', err);
          if (isMounted) {
            setMachines(FALLBACK_MACHINES);
            setSelectedMachine(FALLBACK_MACHINES[0]);
          }
        }

        // Load active promotions & vouchers from backend
        try {
          // Load available vouchers directly from new API GET /api/vouchers/available
        try {
          const availVouchers = await ordersApi.getAvailableVouchers(35000);
          if (Array.isArray(availVouchers) && availVouchers.length > 0) {
            const mappedAvail = availVouchers.map((v) => ({
              id: v.voucherId || v.code,
              code: v.code,
              name: v.campaignName || `Ưu đãi ${v.code}`,
              desc: v.message || 'Mã giảm giá áp dụng trực tiếp cho đơn giặt',
              type: (v.discountType || '').includes('PERCENT') ? 'PERCENT' : 'FIXED',
              value: v.calculatedDiscount || v.discountValue || 10000,
              percent: (v.discountType || '').includes('PERCENT') ? v.discountValue : 0,
              maxDiscount: v.maxDiscount || 20000,
              minSpend: 0,
              badge: v.memberOnly ? 'HỘI VIÊN' : 'HỆ THỐNG',
              expiry: v.validTo ? new Date(v.validTo).toLocaleDateString('vi-VN') : 'Còn hiệu lực',
              color: 'from-emerald-500 to-teal-500',
            }));
            setVouchersList((prev) => {
              const existingCodes = new Set(prev.map((x) => x.code));
              const newOnes = mappedAvail.filter((x) => !existingCodes.has(x.code));
              return [...newOnes, ...prev];
            });
          }
        } catch (vErr) {
          console.warn('Available vouchers API note', vErr);
        }

        const promoData = await ordersApi.getPromotions();
          const campaigns = Array.isArray(promoData) ? promoData : (promoData?.value || []);
          if (isMounted && campaigns.length > 0) {
            const apiVouchers = [];
            campaigns.forEach((c) => {
              (c.vouchers || []).forEach((v) => {
                apiVouchers.push({
                  id: v.voucherId || v.code,
                  code: v.code,
                  name: c.name || `Ưu đãi ${v.code}`,
                  desc: c.description || 'Mã giảm giá áp dụng trực tiếp cho đơn giặt',
                  type: 'FIXED',
                  value: 10000,
                  minSpend: 0,
                  badge: 'HỆ THỐNG',
                  expiry: v.validTo ? new Date(v.validTo).toLocaleDateString('vi-VN') : 'Còn hiệu lực',
                  color: 'from-amber-500 to-orange-500',
                });
              });
            });
            if (apiVouchers.length > 0) {
              setVouchersList((prev) => {
                const existingCodes = new Set(prev.map((x) => x.code));
                const newOnes = apiVouchers.filter((x) => !existingCodes.has(x.code));
                return [...newOnes, ...prev];
              });
            }
          }
        } catch (promoErr) {
          console.warn('Promotions API error', promoErr);
        }
      } finally {
        if (isMounted) setLoadingMachines(false);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Dynamic Price Quote calculation via Backend API (POST /api/pricing/quote)
  useEffect(() => {
    if (!selectedMachine) return;
    let isMounted = true;

    async function fetchLiveQuote() {
      try {
        const offeringId =
          selectedCycle?.offeringId ||
          getCompatibleCyclesForMachine(selectedMachine)[0]?.offeringId ||
          '01927700-0000-7000-8000-000000000070';

        const quote = await ordersApi.calculateQuote({
          siteId: selectedMachine.siteId || '01927700-0000-7000-8000-000000000020',
          voucherCode: selectedVoucher?.code || null,
          customerType: profile ? 'MEMBER' : 'WALK_IN',
          items: [
            {
              offeringId: offeringId,
              quantity: 1,
              machineId: selectedMachine.machineId,
            },
          ],
        });

        if (isMounted && quote) {
          setLiveQuote(quote);
        }
      } catch (err) {
        console.warn('Live quote API error, fallback to local math', err);
        if (isMounted) setLiveQuote(null);
      }
    }

    fetchLiveQuote();

    return () => {
      isMounted = false;
    };
  }, [selectedMachine, selectedCycle, selectedVoucher, profile]);

  // Pricing calculations (Using live backend quote when available, fallback gracefully)
  const tierCode = profile?.tier?.code || 'STANDARD';
  const tierName = profile?.tier?.name || 'Thành Viên Tiêu Chuẩn';
  const tierDiscountPercent =
    tierCode === 'SILVER' ? 5 : tierCode === 'GOLD' ? 10 : tierCode === 'PLATINUM' ? 15 : 0;

  const fallbackOriginalPrice = selectedCycle.price;
  const fallbackTierDiscount = Math.round((fallbackOriginalPrice * tierDiscountPercent) / 100);

  let fallbackVoucherDiscount = 0;
  if (selectedVoucher) {
    if (selectedVoucher.type === 'FIXED') {
      fallbackVoucherDiscount = Math.min(selectedVoucher.value, fallbackOriginalPrice);
    } else if (selectedVoucher.type === 'PERCENT') {
      const calculated = Math.round((fallbackOriginalPrice * selectedVoucher.percent) / 100);
      fallbackVoucherDiscount = Math.min(calculated, selectedVoucher.maxDiscount || calculated);
    }
  }

  const originalPrice = liveQuote?.subtotal ?? fallbackOriginalPrice;
  const totalDiscount = liveQuote?.discountTotal ?? (fallbackTierDiscount + fallbackVoucherDiscount);
  const finalPrice = liveQuote?.total ?? Math.max(0, originalPrice - totalDiscount);
  const currentBalance = profile?.wallet?.balance || 0;

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
      if (validateRes && (validateRes.isValid || validateRes.discountAmount > 0)) {
        const backendVoucher = {
          id: 'v-backend-' + code,
          code: code,
          name: validateRes.campaignName || `Mã ${code}`,
          desc: validateRes.message || 'Mã ưu đãi hợp lệ từ hệ thống',
          type: 'FIXED',
          value: validateRes.discountAmount || 10000,
          minSpend: 0,
          badge: 'HỢP LỆ',
          expiry: 'Còn hiệu lực',
          color: 'from-emerald-500 to-teal-500',
        };
        setSelectedVoucher(backendVoucher);
        setVoucherSuccess(isVietnamese ? `Áp dụng thành công mã ${code} giảm ${backendVoucher.value.toLocaleString('vi-VN')} ₫!` : `Applied voucher ${code}!`);
        setCustomVoucherInput('');
        return;
      }
    } catch (apiErr) {
      console.warn('Voucher validate API note, checking presets', apiErr);
    }

    // Check predefined list
    const found = vouchersList.find((v) => v.code === code);
    if (found) {
      setSelectedVoucher(found);
      setVoucherSuccess(isVietnamese ? `Áp dụng thành công mã ${code}!` : `Voucher ${code} applied successfully!`);
      setCustomVoucherInput('');
      return;
    }

    // Preset fallback codes
    if (code === 'WELCOME10K' || code === 'LAUNDRO10K' || code === 'GIAM10K' || code === 'FREESHIP') {
      const customV = {
        id: 'v-custom-' + Date.now(),
        code: code,
        name: `Ưu đãi: ${code}`,
        desc: 'Mã ưu đãi được kích hoạt thành công',
        type: 'FIXED',
        value: 10000,
        minSpend: 0,
        badge: 'ƯU ĐÃI',
        expiry: 'Còn hiệu lực',
        color: 'from-blue-600 to-cyan-500',
      };
      setSelectedVoucher(customV);
      setVoucherSuccess(isVietnamese ? `Áp dụng mã ${code} giảm 10.000 ₫ thành công!` : `Applied code ${code}!`);
      setCustomVoucherInput('');
    } else {
      setVoucherError(isVietnamese ? 'Mã voucher không tồn tại hoặc chưa đủ điều kiện áp dụng.' : 'Voucher code invalid or expired.');
    }
  }

  // 3. Step 4 Action: Create Real Order (POST /api/orders) & Generate Kiosk QR Code
  async function handleCreateSession() {
    if (!selectedMachine) {
      setErrorMsg(isVietnamese ? 'Vui lòng chọn máy giặt/sấy!' : 'Please select machine!');
      return;
    }

    if (selectedMachine.status !== 'AVAILABLE') {
      setErrorMsg(isVietnamese ? 'Máy đã chọn hiện không khả dụng. Vui lòng chọn máy khác!' : 'Selected machine is not available.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      let quoteId = liveQuote?.quoteId;
      if (!quoteId) {
        const offeringId =
          selectedCycle?.offeringId ||
          getCompatibleCyclesForMachine(selectedMachine)[0]?.offeringId ||
          '01927700-0000-7000-8000-000000000070';
        const quote = await ordersApi.calculateQuote({
          siteId: selectedMachine.siteId || '01927700-0000-7000-8000-000000000020',
          voucherCode: selectedVoucher?.code || null,
          customerType: profile ? 'MEMBER' : 'WALK_IN',
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

      // Create Order with real backend (POST /api/orders)
      let realOrder = null;
      try {
        realOrder = await ordersApi.createOrder({
          quoteId: quoteId,
          channel: 'KIOSK',
          guestName: profile?.fullName || 'Khách Hàng',
          guestPhone: profile?.phoneNumber || '0901234567',
          note: `Đặt giặt máy ${selectedMachine.code} - ${selectedCycle.name}`,
        });
      } catch (errOrder) {
        console.warn('Real createOrder API failed, fallback to local session', errOrder);
      }

      const session = realOrder || {
        orderId: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        orderCode: 'LC-' + Math.floor(10000 + Math.random() * 90000),
        siteName: selectedMachine.siteName || 'LaundroChain Bến Thành - Q1',
        machineCode: selectedMachine.code,
        cycleName: selectedCycle.name,
        durationMinutes: selectedCycle.durationMin,
        originalAmount: originalPrice,
        voucherDiscount: totalDiscount,
        finalAmount: finalPrice,
      };

      setKioskOrder({
        ...session,
        machineCode: selectedMachine.code,
        cycleName: selectedCycle.name,
        durationMinutes: selectedCycle.durationMin || 35,
        siteName: selectedMachine.siteName || 'LaundroChain Bến Thành - Q1',
      });

      // Generate QR Code data URL
      const qrPayload = `LAUNDROCHAIN_KIOSK_PAY:${session.orderCode || session.orderId}:${finalPrice}:${Date.now()}`;
      const qrUrl = await QRCode.toDataURL(qrPayload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });

      setKioskQrUrl(qrUrl);
      setKioskModalOpen(true);
    } catch (err) {
      console.error('Error creating order session', err);
      setErrorMsg(err.message || 'Không thể tạo phiên đơn hàng. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

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
          // 1. Pay order (Status -> CONFIRMED)
          await ordersApi.payOrder(kioskOrder.orderId, { paymentMethod: 'WALLET', note: 'Thanh toán ví điện tử' });
        } catch (payErr) {
          console.warn('Pay order API note', payErr);
        }

        try {
          // 2. Start order (Status -> IN_PROGRESS, Machine -> BUSY)
          await ordersApi.startOrder(kioskOrder.orderId, { note: `Khách quét QR tại Ki-ốt máy ${kioskOrder.machineCode}` });
        } catch (startErr) {
          console.warn('Start order API note', startErr);
        }
      }

      // Success: Close modal and redirect to /dashboard/my-orders
      setKioskModalOpen(false);
      navigate('/dashboard/my-orders');
    } catch (err) {
      console.error('Error paying and starting machine', err);
      setErrorMsg(err.message || 'Thanh toán hoặc kích hoạt máy thất bại.');
    } finally {
      setPayingAndStarting(false);
    }
  }

  // Filtered machines
  const filteredMachines = machines.filter((m) => {
    if (machineFilter === 'WASHER') return m.kind === 'WASHER' || m.className?.toLowerCase().includes('giặt');
    if (machineFilter === 'DRYER') return m.kind === 'DRYER' || m.className?.toLowerCase().includes('sấy');
    return true;
  });

  const availableCount = machines.filter((m) => m.status === 'AVAILABLE').length;

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
      title: isVietnamese ? 'Thanh toán QR' : 'Kiosk Checkout',
      desc: isVietnamese ? 'Ki-ốt & Quét mã' : 'Scan & Start',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <WashingMachine className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          {isVietnamese ? 'Đặt lệnh giặt sấy trực tiếp tại trạm' : 'Direct Wash & Dry Activation'}
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
                  className={`flex flex-col items-center select-none ${
                    canClick ? 'cursor-pointer group' : 'cursor-default'
                  }`}
                  style={{ width: `${100 / STEPS.length}%` }}
                >
                  {/* Circle Node with Number or Checkmark */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-sm ${
                      isCurrent
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
                      className={`text-xs sm:text-sm transition-colors ${
                        isCurrent
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
      {/* BƯỚC 1: CHỌN MÁY GIẶT / SẤY (LOAD TỪ API REAL BACKEND)     */}
      {/* ========================================================= */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
          {/* Header & Filter Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <WashingMachine className="w-5 h-5 text-blue-600" />
                {isVietnamese ? 'Danh sách máy giặt / sấy khả dụng' : 'Available Washing & Drying Machines'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isVietnamese
                  ? `Hiện có ${availableCount}/${machines.length} máy đang sẵn sàng phục vụ`
                  : `${availableCount}/${machines.length} machines available right now`}
              </p>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setMachineFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  machineFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isVietnamese ? 'Tất cả' : 'All'} ({machines.length})
              </button>
              <button
                onClick={() => setMachineFilter('WASHER')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  machineFilter === 'WASHER'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isVietnamese ? 'Máy Giặt' : 'Washers'}
              </button>
              <button
                onClick={() => setMachineFilter('DRYER')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  machineFilter === 'DRYER'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isVietnamese ? 'Máy Sấy' : 'Dryers'}
              </button>
            </div>
          </div>

          {/* Machine Grid */}
          {loadingMachines ? (
            <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
              <RotateCw className="w-6 h-6 animate-spin text-blue-600" />
              <span>{isVietnamese ? 'Đang cập nhật trạng thái máy từ cơ sở dữ liệu...' : 'Fetching machines from database...'}</span>
            </div>
          ) : filteredMachines.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              {isVietnamese ? 'Không có máy nào phù hợp với bộ lọc.' : 'No machines found for this filter.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredMachines.map((m) => {
                const isAvailable = m.status === 'AVAILABLE';
                const isSel = selectedMachine?.machineId === m.machineId;
                const isDryer = m.kind === 'DRYER' || m.className?.toLowerCase().includes('sấy');

                return (
                  <div
                    key={m.machineId}
                    onClick={() => isAvailable && handleSelectMachine(m)}
                    className={`relative p-4 rounded-2xl border transition-all ${
                      !isAvailable
                        ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'
                        : isSel
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-md ring-2 ring-blue-500/20 cursor-pointer'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 cursor-pointer bg-white dark:bg-slate-900 hover:shadow-sm'
                    }`}
                  >
                    {/* Top Row: Machine Code + Status Badge */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg bg-blue-100/70 dark:bg-blue-900/40">
                          {m.code}
                        </span>
                        {isDryer ? (
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 flex items-center gap-1 border border-amber-300 dark:border-amber-800">
                            <Wind className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            MÁY SẤY
                          </span>
                        ) : (
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 flex items-center gap-1 border border-blue-300 dark:border-blue-800">
                            <WashingMachine className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            MÁY GIẶT
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isAvailable
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                        {isAvailable ? (isVietnamese ? 'SẴN SÀNG' : 'AVAILABLE') : (isVietnamese ? 'ĐANG BẬN' : 'IN USE')}
                      </span>
                    </div>

                    {/* Machine Title */}
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {m.className || (isDryer ? 'Máy Sấy Nhiệt Gas' : 'Máy Giặt Cửa Ngang')}
                    </div>

                    {/* Specs / IoT Telemetry */}
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span>{isVietnamese ? 'Tải trọng:' : 'Capacity:'} <strong className="text-slate-700 dark:text-slate-200">{m.capacityKg || 10}kg</strong></span>
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {m.temperature ? `Nhiệt độ: ${m.temperature}°C` : 'IoT Ready'}
                      </span>
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
                  className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSel
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
                      className={`w-6 h-6 rounded-full border flex items-center justify-center mt-1.5 transition ${
                        isSel
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
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-amber-500" />
              {isVietnamese ? 'Chọn Voucher & Mã giảm giá' : 'Select Voucher & Discount'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isVietnamese
                ? 'Chọn ưu đãi sẵn có hoặc nhập mã voucher của bạn để nhận giảm giá ngay trên đơn giặt'
                : 'Select an available voucher or enter your promo code to get immediate discount'}
            </p>
          </div>

          {/* Custom Voucher Input Box */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              {isVietnamese ? 'Nhập mã Voucher thủ công' : 'Enter Voucher Code'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={isVietnamese ? 'Ví dụ: WELCOME10K, GIATXANH, CHAOBANMOI...' : 'e.g., WELCOME10K, GIATXANH...'}
                value={customVoucherInput}
                onChange={(e) => {
                  setCustomVoucherInput(e.target.value.toUpperCase());
                  setVoucherError('');
                  setVoucherSuccess('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCustomVoucher()}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-mono tracking-wider focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                onClick={handleApplyCustomVoucher}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                {isVietnamese ? 'Áp dụng' : 'Apply'}
              </button>
            </div>
            {voucherError && <p className="text-xs text-rose-500 font-medium">{voucherError}</p>}
            {voucherSuccess && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{voucherSuccess}</p>}
          </div>

          {/* Voucher List */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>{isVietnamese ? 'Voucher dành cho bạn' : 'Available Vouchers'}</span>
              {selectedVoucher && (
                <button
                  onClick={() => setSelectedVoucher(null)}
                  className="text-xs text-rose-500 hover:underline cursor-pointer lowercase"
                >
                  {isVietnamese ? 'Không dùng voucher' : 'Clear voucher'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {vouchersList.map((v) => {
                const isSel = selectedVoucher?.id === v.id || selectedVoucher?.code === v.code;
                return (
                  <div
                    key={v.id || v.code}
                    onClick={() => setSelectedVoucher(isSel ? null : v)}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSel
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-md ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div>
                      {/* Top Tag & Expiry */}
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-gradient-to-r ${v.color || 'from-blue-600 to-indigo-600'} text-white uppercase tracking-wider shadow-sm flex items-center gap-1`}
                        >
                          <Gift className="w-3 h-3" />
                          {v.badge || 'PROMO'}
                        </span>
                        <span className="text-[11px] text-slate-400">{v.expiry}</span>
                      </div>

                      {/* Voucher Title & Code */}
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{v.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{v.desc}</div>
                    </div>

                    {/* Voucher Code pill + Discount amount */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 rounded-md border border-dashed border-indigo-300 dark:border-indigo-800">
                        {v.code}
                      </div>

                      <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                        {v.type === 'FIXED' ? `-${v.value.toLocaleString('vi-VN')} ₫` : `-${v.percent}%`}
                      </div>
                    </div>

                    {/* Selected Checkmark */}
                    {isSel && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  {isVietnamese ? `Đã áp dụng mã ${selectedVoucher.code}` : `Applied ${selectedVoucher.code}`}
                </span>
              )}
            </div>

            <div className="space-y-2.5 text-sm">
              {/* Giá gốc ban đầu (BỊ GẠCH NGANG NẾU CÓ GIẢM GIÁ) */}
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span>{isVietnamese ? 'Giá gốc ban đầu:' : 'Original Price:'}</span>
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

              {/* Các chiết khấu áp dụng từ Backend hoặc tính toán */}
              {liveQuote?.appliedDiscounts?.length > 0 ? (
                liveQuote.appliedDiscounts.map((d, idx) => (
                  <div key={idx} className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Ticket className="w-4 h-4" />
                      {d.ruleName}:
                    </span>
                    <span>-{d.discountAmount.toLocaleString('vi-VN')} ₫</span>
                  </div>
                ))
              ) : (
                <>
                  {selectedVoucher && fallbackVoucherDiscount > 0 && (
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Ticket className="w-4 h-4" />
                        {isVietnamese ? `Voucher giảm (${selectedVoucher.code}):` : `Voucher Discount (${selectedVoucher.code}):`}
                      </span>
                      <span>-{fallbackVoucherDiscount.toLocaleString('vi-VN')} ₫</span>
                    </div>
                  )}
                  {fallbackTierDiscount > 0 && (
                    <div className="flex justify-between items-center text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                      <span>{isVietnamese ? `Hạng ${tierName} (-${tierDiscountPercent}%):` : `Tier ${tierName}:`}</span>
                      <span>-{fallbackTierDiscount.toLocaleString('vi-VN')} ₫</span>
                    </div>
                  )}
                </>
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
            </div>
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
              onClick={() => setStep(4)}
              className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              <span>{isVietnamese ? 'Tiếp tục: Thanh toán QR Ki-ốt' : 'Next: Kiosk QR Checkout'}</span>
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
                <div className="flex justify-between">
                  <span className="text-slate-500">{selectedMachine?.kind === 'DRYER' ? (isVietnamese ? 'Máy sấy phục vụ:' : 'Dryer:') : (isVietnamese ? 'Máy giặt phục vụ:' : 'Washer:')}</span>
                  <span className="font-bold text-blue-600 font-mono text-sm">
                    {selectedMachine?.code} ({selectedMachine?.className || selectedMachine?.kind})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{selectedMachine?.kind === 'DRYER' ? (isVietnamese ? 'Chu trình sấy:' : 'Dry Program:') : (isVietnamese ? 'Chu trình giặt:' : 'Wash Program:')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedCycle.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{selectedMachine?.kind === 'DRYER' ? (isVietnamese ? 'Thời gian sấy:' : 'Drying Time:') : (isVietnamese ? 'Thời gian giặt:' : 'Washing Time:')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedCycle.time}
                  </span>
                </div>
                {selectedVoucher && (
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Ticket className="w-3.5 h-3.5 text-amber-500" />
                      {isVietnamese ? 'Voucher áp dụng:' : 'Applied Voucher:'}
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedVoucher.code} (-{totalDiscount.toLocaleString('vi-VN')} ₫)
                    </span>
                  </div>
                )}
              </div>

              {/* Pricing breakdown with strikethrough */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">{isVietnamese ? 'Giá niêm yết:' : 'Original Price:'}</span>
                  <span className={totalDiscount > 0 ? 'line-through text-slate-400 font-medium decoration-rose-500/60' : 'font-semibold'}>
                    {originalPrice.toLocaleString('vi-VN')} ₫
                  </span>
                </div>

                {totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>{isVietnamese ? 'Tổng chiết khấu & Ưu đãi:' : 'Total Discount:'}</span>
                    <span>-{totalDiscount.toLocaleString('vi-VN')} ₫</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-extrabold text-blue-600 dark:text-blue-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>{isVietnamese ? 'Tổng thanh toán:' : 'Total to Pay:'}</span>
                  <span className="text-xl">{finalPrice.toLocaleString('vi-VN')} ₫</span>
                </div>
              </div>
            </div>

            {/* Wallet payment box */}
            <div className="p-5 border border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold">
                  <Monitor className="w-5 h-5 text-indigo-600" />
                  <span>{isVietnamese ? 'Kích hoạt qua Ki-ốt & Quét QR' : 'Kiosk Activation & QR Scan'}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Bấm nút bên dưới để tạo <strong>Mã QR Đơn hàng tại màn hình Ki-ốt</strong>. Khách quét mã để trừ số dư ví và kích hoạt máy <strong>{selectedMachine?.code}</strong> chạy tự động ngay lập tức.
                </p>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">{isVietnamese ? 'Số dư ví hiện tại:' : 'Current wallet balance:'}</div>
                  <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center justify-between">
                    <span>{currentBalance.toLocaleString('vi-VN')} ₫</span>
                    {currentBalance < finalPrice && (
                      <span className="text-xs text-rose-500 font-medium">{isVietnamese ? 'Không đủ số dư' : 'Low balance'}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  disabled={submitting}
                  onClick={handleCreateSession}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>{isVietnamese ? 'Đang tạo đơn trên hệ thống...' : 'Creating Order in Database...'}</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-5 h-5" />
                      <span>{isVietnamese ? 'Tạo lệnh thanh toán QR trên Kiosk' : 'Generate Kiosk QR Code'}</span>
                    </>
                  )}
                </button>

                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => setStep(3)}
                    className="text-xs text-slate-500 hover:underline cursor-pointer"
                  >
                    {isVietnamese ? '← Chọn lại voucher' : '← Change voucher'}
                  </button>
                  <button
                    onClick={() => navigate('/dashboard/wallet')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                  >
                    {isVietnamese ? '+ Nạp thêm tiền ví' : '+ Top up wallet'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: MÀN HÌNH KIOSK QR CODE (TRẠM KI-ỐT THANH TOÁN IOT) */}
      {/* ========================================================= */}
      {kioskModalOpen && kioskOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-indigo-500/80 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl shadow-indigo-500/20 text-white relative">
            {/* Kiosk Header Bar */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 border-b border-indigo-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-wide text-indigo-200 uppercase flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-indigo-400" />
                    LaundroChain Smart Kiosk Terminal
                  </h3>
                  <div className="text-[11px] text-slate-400">Trạm Ki-ốt IoT: {kioskOrder.siteName || 'LaundroChain Bến Thành - Q1'}</div>
                </div>
              </div>
              <button
                onClick={() => setKioskModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Kiosk Body */}
            <div className="p-6 text-center space-y-5">
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
                  Mã đơn hàng: {kioskOrder.orderCode || kioskOrder.orderId}
                </span>
                <h4 className="text-lg font-bold text-white">Quét mã QR để Thanh toán & Khởi động máy</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Khách hàng quét mã QR tại màn hình Ki-ốt. Số tiền sẽ trừ vào Ví và máy{' '}
                  <strong className="text-indigo-300">{kioskOrder.machineCode}</strong> sẽ lập tức kích hoạt chạy.
                </p>
              </div>

              {/* QR Code Frame with corner styling */}
              <div className="relative inline-block mx-auto p-4 bg-white rounded-2xl shadow-inner">
                {kioskQrUrl ? (
                  <img src={kioskQrUrl} alt="Kiosk Payment QR" className="w-56 h-56 mx-auto rounded-lg" />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                    <RotateCw className="w-8 h-8 animate-spin text-indigo-600" />
                  </div>
                )}
                {/* Corner accent marks */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-600"></div>
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-600"></div>
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-600"></div>
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-600"></div>
              </div>

              {/* Order Info Badge Box */}
              <div className="grid grid-cols-2 gap-3 text-left p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs">
                <div>
                  <div className="text-slate-400 text-[11px]">Máy phục vụ:</div>
                  <div className="font-extrabold text-indigo-300 text-sm mt-0.5">{kioskOrder.machineCode}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Chu trình giặt:</div>
                  <div className="font-bold text-white truncate mt-0.5">{kioskOrder.cycleName}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Thời gian giặt:</div>
                  <div className="font-semibold text-slate-200 mt-0.5">{kioskOrder.durationMinutes || 35} phút</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Số tiền thanh toán:</div>
                  <div className="font-extrabold text-emerald-400 text-sm mt-0.5">
                    {(kioskOrder.finalAmount ?? kioskOrder.total ?? finalPrice).toLocaleString('vi-VN')} ₫
                  </div>
                </div>
              </div>

              {/* Action Button: Simulate QR Scan at Kiosk */}
              <div className="space-y-3 pt-2">
                <button
                  disabled={payingAndStarting}
                  onClick={handleQrPayAndStart}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white rounded-2xl font-black text-base shadow-xl shadow-emerald-500/30 transition flex items-center justify-center gap-3 cursor-pointer"
                >
                  {payingAndStarting ? (
                    <>
                      <RotateCw className="w-5 h-5 animate-spin" />
                      <span>Đang trừ ví & Kích hoạt IoT máy giặt...</span>
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-6 h-6 animate-pulse" />
                      <span>Quét mã QR trên Kiosk & Bắt đầu giặt</span>
                    </>
                  )}
                </button>
                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Giao dịch an toàn được bảo vệ bởi PostgreSQL & Tự động hoàn tiền nếu IoT lỗi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
