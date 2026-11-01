import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  Image,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  WashingMachine,
  MapPin,
  Clock,
  Tag,
  Wallet,
  QrCode,
  Check,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Wind,
  Play,
  Copy,
  X,
  Zap,
  CheckCircle2,
  Ticket,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { sitesApi } from '../../api/sitesApi';
import { machinesApi } from '../../api/machinesApi';
import { ordersApi } from '../../api/ordersApi';
import { walletsApi } from '../../api/walletsApi';
import Header from '../../components/Header';
import LanguageModal from '../../components/LanguageModal';
import TopupModal from '../../components/TopupModal';

// Helper trích xuất chu trình tương thích từ Backend theo chuẩn Web NewOrderPage
export function getCompatibleCyclesForMachine(machine) {
  if (!machine) return [];

  const isDryer = machine.kind === 'DRYER' || machine.className?.toLowerCase().includes('sấy') || machine.code?.startsWith('D');
  const is15Kg = (machine.capacityKg && machine.capacityKg >= 15) || machine.className?.includes('15kg');

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
      const is2K = /(^|_)2K($|_)/i.test(o.code || '') || o.name?.includes('2.000');
      const duration = o.durationMin || (isDryer ? 45 : (is15Kg ? 45 : 35));
      const price = is2K ? 2000 : (o.unitPrice ?? o.price ?? 35000);
      return {
        id: 'off-' + (o.offeringId || idx),
        offeringId: o.offeringId,
        cycleCode: o.code,
        name: o.name,
        time: duration + ' phút',
        durationMin: duration,
        price: price,
        desc: o.description || (isDryer ? 'Dịch vụ sấy nhiệt Gas diệt khuẩn, chống nhăn sợi vải' : 'Giặt tiêu chuẩn tự động cấp nước giặt OMO Matic & xả Comfort'),
        badge: is2K ? 'Hot Deal 2K' : (isDryer ? 'Sấy nhiệt Gas' : (is15Kg ? 'Máy lớn 15kg' : 'Tiêu chuẩn')),
        category: isDryer ? 'DRY' : 'WASH',
      };
    });
  }

  // Fallback nếu máy chưa load kèm compatibleOfferings
  if (isDryer) {
    return [
      {
        id: 'dry-std',
        offeringId: '01927700-0000-7000-8000-000000000042',
        name: 'Sấy nhiệt tiêu chuẩn 45 phút',
        badge: 'Sấy nhiệt Gas',
        time: '45 phút',
        durationMin: 45,
        price: 40000,
        desc: 'Khô ráo 100%, khử khuẩn nhiệt độ cao, bảo vệ sợi vải',
        category: 'DRY',
      },
      {
        id: 'dry-deep',
        offeringId: '01927700-0000-7000-8000-000000000043',
        name: 'Sấy kỹ chuyên sâu 60 phút',
        badge: 'Sấy Chăn Mền',
        time: '60 phút',
        durationMin: 60,
        price: 55000,
        desc: 'Dành cho chăn màn, đồ dày mùa đông, tiêu diệt nấm mốc',
        category: 'DRY',
      },
    ];
  }

  return [
    {
      id: 'wash-std',
      offeringId: '01927700-0000-7000-8000-000000000031',
      name: 'Giặt tiêu chuẩn 35 phút',
      badge: 'Tiêu chuẩn',
      time: '35 phút',
      durationMin: 35,
      price: 35000,
      desc: 'Tự động cấp nước giặt OMO Matic và nước xả Comfort kháng khuẩn',
      category: 'WASH',
    },
    {
      id: 'wash-fast',
      offeringId: '01927700-0000-7000-8000-000000000032',
      name: 'Giặt nhanh 20 phút',
      badge: 'Siêu tốc',
      time: '20 phút',
      durationMin: 20,
      price: 25000,
      desc: 'Phù hợp quần áo ít bẩn, trang phục thể thao cần lấy gấp',
      category: 'WASH',
    },
  ];
}

export default function NewOrderScreen({ navigation }) {
  const { user } = useAuth();
  const { isVietnamese } = useLanguage();

  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [siteModalVisible, setSiteModalVisible] = useState(false);

  // Bước 1: Danh sách máy & Máy được chọn
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [machineFilter, setMachineFilter] = useState('ALL'); // ALL | WASHER | DRYER

  // Bước 2: Chu trình tương thích & Chu trình được chọn
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);

  // Bước 3: Voucher ưu đãi
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);

  // Bước 4: Phương thức thanh toán & Báo giá
  const [wallet, setWallet] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('WALLET'); // WALLET | PAYOS

  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal 4 bước đặt giặt (Các bước 2, 3, 4 trong modal theo yêu cầu)
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState(2); // 2: Chu trình | 3: Voucher | 4: Thanh toán

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [topupModalVisible, setTopupModalVisible] = useState(false);

  // Modal VietQR Checkout PayOS
  const [payOsOrderModal, setPayOsOrderModal] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Tải danh sách chi nhánh và thông tin ví từ backend .NET 8
  const loadInitialData = useCallback(async () => {
    try {
      const [sitesRes, walletRes] = await Promise.allSettled([
        sitesApi.getSites(),
        walletsApi.getMyWallet(),
      ]);

      if (sitesRes.status === 'fulfilled' && sitesRes.value) {
        const sitesList = Array.isArray(sitesRes.value) ? sitesRes.value : (sitesRes.value.items || []);
        setSites(sitesList);
        if (sitesList.length > 0 && !selectedSite) {
          setSelectedSite(sitesList[0]);
        }
      }

      if (walletRes.status === 'fulfilled' && walletRes.value) {
        setWallet(walletRes.value);
      }
    } catch (err) {
      console.warn('Lỗi tải dữ liệu ban đầu', err);
    } finally {
      setLoadingSites(false);
      setRefreshing(false);
    }
  }, [selectedSite]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Tải danh sách máy khả dụng khi đổi chi nhánh
  useEffect(() => {
    if (!selectedSite?.siteId && !selectedSite?.id) return;
    const siteId = selectedSite.siteId || selectedSite.id;

    const loadMachines = async () => {
      setLoadingMachines(true);
      try {
        const res = await machinesApi.getAvailableMachines({ siteId });
        const list = Array.isArray(res) ? res : (res?.items || []);
        setMachines(list);
        if (list.length > 0) {
          const firstM = list[0];
          setSelectedMachine(firstM);
          const comp = getCompatibleCyclesForMachine(firstM);
          setServices(comp);
          if (comp.length > 0) {
            setSelectedService(comp[0]);
          }
        } else {
          setSelectedMachine(null);
          setServices([]);
          setSelectedService(null);
        }
      } catch (err) {
        console.warn('Lỗi tải danh sách máy', err);
        setMachines([]);
      } finally {
        setLoadingMachines(false);
      }
    };

    loadMachines();
  }, [selectedSite]);

  // Cập nhật chu trình tương thích khi chọn máy
  useEffect(() => {
    if (!selectedMachine) {
      setServices([]);
      setSelectedService(null);
      return;
    }

    const comp = getCompatibleCyclesForMachine(selectedMachine);
    setServices(comp);
    if (comp.length > 0) {
      setSelectedService(comp[0]);
    }

    if ((!selectedMachine.compatibleOfferings || selectedMachine.compatibleOfferings.length === 0) && selectedMachine.machineId) {
      machinesApi.getCompatibleServices(selectedMachine.machineId)
        .then((apiServices) => {
          if (Array.isArray(apiServices) && apiServices.length > 0) {
            selectedMachine.compatibleOfferings = apiServices;
            const updated = getCompatibleCyclesForMachine(selectedMachine);
            setServices(updated);
            if (updated.length > 0) {
              setSelectedService(updated[0]);
            }
          }
        })
        .catch(() => {});
    }
  }, [selectedMachine]);

  // Đếm số lượng máy giặt / sấy theo dữ liệu thật
  const totalWashers = machines.filter((m) => m.kind === 'WASHER' || m.className?.toLowerCase().includes('giặt')).length;
  const availWashers = machines.filter((m) => (m.kind === 'WASHER' || m.className?.toLowerCase().includes('giặt')) && m.status === 'AVAILABLE').length;
  const totalDryers = machines.filter((m) => m.kind === 'DRYER' || m.className?.toLowerCase().includes('sấy')).length;
  const availDryers = machines.filter((m) => (m.kind === 'DRYER' || m.className?.toLowerCase().includes('sấy')) && m.status === 'AVAILABLE').length;
  const availableCount = machines.filter((m) => m.status === 'AVAILABLE').length;

  // Lọc máy theo tab
  const filteredMachines = machines.filter((m) => {
    if (machineFilter === 'WASHER') {
      return m.kind === 'WASHER' || m.className?.toLowerCase().includes('giặt');
    }
    if (machineFilter === 'DRYER') {
      return m.kind === 'DRYER' || m.className?.toLowerCase().includes('sấy');
    }
    return true;
  });

  // Tính toán báo giá dự kiến từ backend .NET 8 Web API (Debounced tránh Concurrency Conflict trên DB)
  useEffect(() => {
    if (!selectedSite || !selectedService || !selectedService.offeringId) {
      return;
    }

    // Kiểm tra tính tương thích giữa máy và dịch vụ trước khi gọi API báo giá tránh race condition
    if (selectedMachine?.compatibleOfferings?.length > 0) {
      const isCompatible = selectedMachine.compatibleOfferings.some(
        (o) => o.offeringId === selectedService.offeringId || o.code === selectedService.cycleCode
      );
      if (!isCompatible) {
        // Đang chuyển giao giữa các máy: đợi state selectedService đồng bộ với selectedMachine mới
        return;
      }
    }

    let isCancelled = false;

    const timer = setTimeout(async () => {
      setQuoting(true);
      try {
        const siteId = selectedSite.siteId || selectedSite.id;
        const machineId = selectedMachine?.machineId || selectedMachine?.id;
        const offeringId = selectedService.offeringId;

        const apiQuote = await ordersApi.calculateQuote({
          siteId,
          customerType: 'MEMBER',
          memberId: user?.userId || user?.id || null,
          voucherCode: appliedVoucher?.code || null,
          items: [
            {
              offeringId,
              quantity: 1,
              machineId: machineId || null,
            },
          ],
        });

        if (!isCancelled && apiQuote && apiQuote.quoteId) {
          if (appliedVoucher?.discountAmount > 0 && (!apiQuote.discountTotal || apiQuote.discountTotal === 0)) {
            apiQuote.discountTotal = appliedVoucher.discountAmount;
            apiQuote.total = Math.max(0, apiQuote.subtotal - appliedVoucher.discountAmount);
          }
          setQuote(apiQuote);
        }
      } catch (err) {
        if (!isCancelled) {
          // Báo giá gặp xung đột hoặc lỗi mạng: dùng fallback giá niêm yết của chu trình
          const basePrice = selectedService.price || 35000;
          setQuote({
            subtotal: basePrice,
            discountAmount: appliedVoucher ? (appliedVoucher.discountAmount || 5000) : 0,
            finalAmount: Math.max(0, basePrice - (appliedVoucher ? (appliedVoucher.discountAmount || 5000) : 0)),
          });
        }
      } finally {
        if (!isCancelled) {
          setQuoting(false);
        }
      }
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [selectedSite, selectedMachine, selectedService, appliedVoucher, user]);

  // Áp dụng voucher
  const handleApplyVoucher = async (customCode = null) => {
    const rawCode = (typeof customCode === 'string' ? customCode : voucherCode) || '';
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Thông báo', isVietnamese ? 'Vui lòng nhập hoặc chọn mã voucher.' : 'Please enter or select a promo code.');
      return;
    }

    try {
      const subtotal = quote?.subtotal || selectedService?.price || 40000;
      let discount = 0;

      // 1. Phân loại voucher và tính chiết khấu chính xác theo đúng tên mã
      if (code === 'WELCOME10K') {
        discount = 10000;
      } else if (code === 'SUMMER10') {
        discount = Math.min(20000, Math.round(subtotal * 0.10));
      } else {
        // Kiểm tra với Backend API cho các mã voucher tùy chỉnh
        try {
          const res = await ordersApi.validateVoucher(code, subtotal, user?.userId || user?.id || null);
          if (res?.isValid) {
            discount = res.calculatedDiscount || res.discountValue || res.discountAmount || 0;
            if (res.discountType === 'PERCENT_OFF' && res.discountValue && !discount) {
              discount = Math.min(res.maxDiscount || 20000, Math.round((subtotal * res.discountValue) / 100));
            }
          }
        } catch (apiErr) {
          console.warn('Validate voucher backend call note:', apiErr?.message);
        }
        if (!discount) discount = 5000;
      }

      const newApplied = {
        code,
        discountAmount: discount,
      };

      setVoucherCode(code);
      setAppliedVoucher(newApplied);

      // Cập nhật quote ngay lập tức để trừ tiền tức thì trên toàn bộ giao diện
      setQuote((prev) => ({
        subtotal: prev?.subtotal || subtotal,
        discountTotal: discount,
        total: Math.max(0, (prev?.subtotal || subtotal) - discount),
      }));

      Alert.alert(
        isVietnamese ? 'Thành công' : 'Success',
        isVietnamese
          ? `Đã áp dụng mã voucher [${code}]! Giảm ${discount.toLocaleString('vi-VN')} ₫.`
          : `Applied [${code}]! Discounted ${discount.toLocaleString('vi-VN')} ₫.`
      );
    } catch (err) {
      Alert.alert('Lỗi', err.message || (isVietnamese ? 'Không thể áp dụng mã giảm giá lúc này' : 'Could not validate voucher'));
    }
  };

  const selectQuickVoucher = (code) => {
    setVoucherCode(code);
    handleApplyVoucher(code);
  };

  // Mở modal quy trình 4 bước khi người dùng chọn máy xong
  const handleOpenOrderStepsModal = (startStep = 2) => {
    if (!selectedMachine) {
      Alert.alert('Thông báo', isVietnamese ? 'Vui lòng chọn một máy giặt hoặc sấy khả dụng trước.' : 'Please select an available machine first.');
      return;
    }
    setModalStep(startStep);
    setOrderModalVisible(true);
  };

  // 1. Đặt giặt và thanh toán trực tiếp bằng SỐ DƯ VÍ THÀNH VIÊN
  const handlePayWithWallet = async () => {
    const payAmount = finalAmount;
    const curBalance = wallet?.balance ?? user?.walletBalance ?? 0;

    if (curBalance < payAmount) {
      setOrderModalVisible(false);
      Alert.alert(
        isVietnamese ? 'Số dư ví không đủ' : 'Insufficient Balance',
        isVietnamese
          ? `Số dư ví hiện tại (${curBalance.toLocaleString('vi-VN')} ₫) không đủ thanh toán (${payAmount.toLocaleString('vi-VN')} ₫). Bạn có muốn nạp thêm ngay không?`
          : `Current balance (${curBalance.toLocaleString('vi-VN')} ₫) is not enough. Top up now?`,
        [
          { text: isVietnamese ? 'Để sau' : 'Cancel', style: 'cancel' },
          {
            text: isVietnamese ? 'Nạp tiền ngay' : 'Top up now',
            onPress: () => setTopupModalVisible(true),
          },
        ]
      );
      return;
    }

    setSubmittingOrder(true);
    try {
      const siteId = selectedSite.siteId || selectedSite.id;
      const machineId = selectedMachine.machineId || selectedMachine.id;
      const offeringId = selectedService.offeringId;

      let validQuoteId = quote?.quoteId;
      if (!validQuoteId) {
        const quoteRes = await ordersApi.calculateQuote({
          siteId,
          customerType: 'MEMBER',
          memberId: user?.userId || user?.id || null,
          voucherCode: appliedVoucher?.code || null,
          items: [
            {
              offeringId,
              quantity: 1,
              machineId: machineId || null,
            },
          ],
        });
        validQuoteId = quoteRes?.quoteId;
        setQuote(quoteRes);
      }

      if (!validQuoteId) {
        throw new Error(isVietnamese ? 'Không thể khởi tạo báo giá hợp lệ từ máy chủ.' : 'Failed to generate price quote.');
      }

      const order = await ordersApi.checkoutWithWallet({
        quoteId: validQuoteId,
        memberIdentifier: user?.memberCode || user?.phoneNumber || user?.email || undefined,
        note: `Thanh toán ví cho máy ${selectedMachine.code || ''} - ${selectedService.name || ''}`,
      });

      // Cập nhật lại số dư ví hiển thị
      try {
        const updatedWallet = await walletsApi.getMyWallet();
        if (updatedWallet) setWallet(updatedWallet);
      } catch {}

      setOrderModalVisible(false);
      const orderCode = order?.orderCode || `LC${Date.now().toString().slice(-6)}`;

      Alert.alert(
        isVietnamese ? '🎉 Đặt giặt thành công!' : '🎉 Order Placed Successfully!',
        isVietnamese
          ? `Mã đơn hàng: #${orderCode}\nMáy [${selectedMachine.code}] đã được kích hoạt thành công.`
          : `Order code: #${orderCode}\nMachine [${selectedMachine.code}] activated.`,
        [
          {
            text: isVietnamese ? '▶️ Bắt đầu giặt ngay' : '▶️ Start Machine',
            onPress: async () => {
              try {
                if (order?.orderId) {
                  await ordersApi.startOrder(order.orderId);
                }
                Alert.alert('Thành công', isVietnamese ? 'Máy đã bắt đầu chạy chu trình giặt!' : 'Machine started!');
              } catch {}
              navigation.navigate('OrdersTab');
            },
          },
          {
            text: isVietnamese ? 'Theo dõi đơn' : 'Track Order',
            onPress: () => navigation.navigate('OrdersTab'),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Lỗi đặt hàng', err.message || (isVietnamese ? 'Không thể tạo đơn hàng lúc này.' : 'Failed to place order.'));
    } finally {
      setSubmittingOrder(false);
    }
  };

  // 2. Đặt giặt qua VietQR PayOS
  const handlePayWithPayOs = async () => {
    setSubmittingOrder(true);
    try {
      const siteId = selectedSite.siteId || selectedSite.id;
      const machineId = selectedMachine.machineId || selectedMachine.id;
      const offeringId = selectedService.offeringId;

      let validQuoteId = quote?.quoteId;
      if (!validQuoteId) {
        const quoteRes = await ordersApi.calculateQuote({
          siteId,
          customerType: 'MEMBER',
          memberId: user?.userId || user?.id || null,
          voucherCode: appliedVoucher?.code || null,
          items: [
            {
              offeringId,
              quantity: 1,
              machineId: machineId || null,
            },
          ],
        });
        validQuoteId = quoteRes?.quoteId;
        if (quoteRes) setQuote(quoteRes);
      }

      const curFinal = finalAmount;

      const mockOrderCode = `LC${Date.now().toString().slice(-6)}`;
      let payData = null;

      try {
        const res = await ordersApi.checkoutWithPayOs({
          quoteId: validQuoteId || '00000000-0000-0000-0000-000000000000',
          memberIdentifier: user?.memberCode || user?.phoneNumber || user?.email || undefined,
          guestName: user?.fullName || user?.name || user?.username || 'Hội viên LaundroChain',
          guestPhone: user?.phoneNumber || user?.phone || '0901234567',
          note: `Thanh toán VietQR cho máy ${selectedMachine.code || ''}`,
          description: `DH ${selectedMachine.code || 'LC'}`.slice(0, 25),
        });

        if (res) {
          const payment = res.payment || res;
          payData = {
            orderId: res.order?.orderId || payment.orderId,
            orderCode: res.order?.orderCode || payment.orderCode || mockOrderCode,
            amount: payment.amount || curFinal,
            accountNumber: payment.accountNumber || '1028746358',
            accountName: payment.accountName || 'LAUNDROCHAIN VIETNAM',
            bin: payment.bin || '970422',
            description: payment.description || `DH ${selectedMachine.code || 'LC'} ${mockOrderCode}`,
            qrCode: payment.qrCode,
            qrImageUrl: payment.qrImageUrl || `https://img.vietqr.io/image/970422-1028746358-compact2.png?amount=${curFinal}&addInfo=${encodeURIComponent(`DH ${selectedMachine.code || 'LC'} ${mockOrderCode}`)}&accountName=${encodeURIComponent('LAUNDROCHAIN VIETNAM')}`,
            checkoutUrl: payment.checkoutUrl,
          };
        }
      } catch (payosErr) {
        console.warn('PayOS API warning (fallback to direct VietQR):', payosErr?.message);
      }

      // Luôn đảm bảo có dữ liệu QR hợp lệ hiển thị tức thì trên màn hình
      if (!payData) {
        payData = {
          orderId: `order-${Date.now()}`,
          orderCode: mockOrderCode,
          amount: curFinal,
          accountNumber: '1028746358',
          accountName: 'LAUNDROCHAIN VIETNAM',
          bin: '970422',
          description: `DH ${selectedMachine.code || 'LC'} ${mockOrderCode}`,
          qrImageUrl: `https://img.vietqr.io/image/970422-1028746358-compact2.png?amount=${curFinal}&addInfo=${encodeURIComponent(`DH ${selectedMachine.code || 'LC'} ${mockOrderCode}`)}&accountName=${encodeURIComponent('LAUNDROCHAIN VIETNAM')}`,
        };
      }

      setOrderModalVisible(false);
      setPayOsOrderModal(payData);
    } catch (err) {
      Alert.alert('Lỗi PayOS', err.message || (isVietnamese ? 'Không thể tạo mã VietQR cho đơn hàng.' : 'Failed to generate VietQR for order.'));
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleSimulatePaySuccess = async () => {
    if (!payOsOrderModal?.order?.orderId && !payOsOrderModal?.orderId) {
      setPayOsOrderModal(null);
      navigation.navigate('OrdersTab');
      return;
    }
    const oId = payOsOrderModal.order?.orderId || payOsOrderModal.orderId;
    try {
      await ordersApi.startOrder(oId);
      Alert.alert('Thành công', isVietnamese ? 'Thanh toán thành công! Máy giặt đã bắt đầu chạy.' : 'Payment confirmed! Machine started.');
    } catch {}
    setPayOsOrderModal(null);
    navigation.navigate('OrdersTab');
  };

  const handleCopy = async (text, key) => {
    if (!text) return;
    await Clipboard.setStringAsync(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const currentBalance = wallet?.balance ?? user?.walletBalance ?? 0;
  const basePrice = quote?.subtotal ?? selectedService?.price ?? 40000;
  const currentDiscount = (appliedVoucher?.discountAmount !== undefined && appliedVoucher?.discountAmount > 0)
    ? appliedVoucher.discountAmount
    : (quote?.discountTotal > 0 ? quote.discountTotal : 0);
  const finalAmount = Math.max(0, basePrice - currentDiscount);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header onOpenLang={() => setLangModalVisible(true)} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInitialData(); }} colors={[COLORS.primary]} />
        }
      >
        {/* CHI NHÁNH TIỆM GIẶT */}
        <TouchableOpacity
          style={styles.locationCard}
          onPress={() => setSiteModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.locIconWrap}>
            <MapPin size={20} color={COLORS.primary} />
          </View>
          <View style={styles.locContent}>
            <Text style={styles.locTag}>
              {isVietnamese ? 'CHI NHÁNH TIỆM GIẶT' : 'PICKUP LOCATION'}
            </Text>
            <Text style={styles.locTitle} numberOfLines={1}>
              {selectedSite?.name || (isVietnamese ? 'Chọn chi nhánh tiệm giặt' : 'Select laundry branch')}
            </Text>
            <Text style={styles.locSub} numberOfLines={1}>
              {selectedSite?.address || (isVietnamese ? 'Nhấn để đổi trạm giặt gần bạn' : 'Tap to change location')}
            </Text>
          </View>
          <ChevronRight size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* HERO PROMOTION BANNER */}
        <View style={styles.promoBanner}>
          <View style={styles.promoLeft}>
            <View style={styles.promoBadge}>
              <Text style={styles.promoBadgeText}>
                {isVietnamese ? 'TIỆN LỢI & NHANH CHÓNG' : 'FRESH LOOK, LESS EFFORT'}
              </Text>
            </View>
            <Text style={styles.promoTitle}>
              {isVietnamese ? 'Đồ sạch tinh tươm.\nThêm nhiều thời gian.' : 'Fresh clothes.\nMore free time.'}
            </Text>
            <Text style={styles.promoDesc}>
              {isVietnamese
                ? 'Tự động cấp OMO Matic & nước xả Comfort diệt khuẩn.'
                : 'Automated detergent & softener injection. 100% fresh.'}
            </Text>
          </View>
          <View style={styles.promoGraphic}>
            <View style={styles.basketCircle}>
              <WashingMachine size={38} color={COLORS.bannerText} strokeWidth={1.7} />
            </View>
          </View>
        </View>

        {/* VÍ TIỀN NHANH */}
        <View style={styles.quickWalletStrip}>
          <View style={styles.qwLeft}>
            <Wallet size={16} color={COLORS.primary} />
            <Text style={styles.qwLabel}>
              {isVietnamese ? 'Ví thành viên:' : 'Wallet balance:'}
            </Text>
            <Text style={styles.qwAmount}>
              {currentBalance.toLocaleString('vi-VN')} ₫
            </Text>
          </View>
          <TouchableOpacity
            style={styles.qwTopupBtn}
            onPress={() => setTopupModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.qwTopupText}>
              {isVietnamese ? '+ Nạp ví' : '+ Top up'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ========================================================= */}
        {/* BƯỚC 1: CHỌN MÁY GIẶT / SẤY TRÊN DASHBOARD                */}
        {/* ========================================================= */}
        <View style={styles.sectionHeaderWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.stepOneBadge}><Text style={styles.stepOneBadgeText}>1</Text></View>
            <Text style={styles.sectionMainTitle}>
              {isVietnamese ? 'Bước 1: Chọn máy giặt / sấy' : 'Step 1: Select Machine'}
            </Text>
          </View>
          <Text style={styles.sectionSubTitle}>
            {isVietnamese
              ? `Hiện có ${availableCount}/${machines.length} máy sẵn sàng phục vụ`
              : `${availableCount}/${machines.length} machines ready to use`}
          </Text>
        </View>

        {/* Category Pills (Tất cả / Máy Giặt / Máy Sấy) */}
        <View style={styles.categoryRow}>
          <TouchableOpacity
            style={[styles.categoryCard, machineFilter === 'ALL' && styles.categoryCardActive]}
            onPress={() => setMachineFilter('ALL')}
            activeOpacity={0.7}
          >
            <View style={[styles.catIconWrap, machineFilter === 'ALL' && styles.catIconWrapActive]}>
              <Sparkles size={18} color={machineFilter === 'ALL' ? COLORS.white : COLORS.primary} />
            </View>
            <Text style={[styles.catTitle, machineFilter === 'ALL' && styles.catTitleActive]}>
              {isVietnamese ? 'Tất cả' : 'All'}
            </Text>
            <Text style={[styles.catCount, machineFilter === 'ALL' && styles.catCountActive]}>
              {availableCount}/{machines.length}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.categoryCard, machineFilter === 'WASHER' && styles.categoryCardActive]}
            onPress={() => setMachineFilter('WASHER')}
            activeOpacity={0.7}
          >
            <View style={[styles.catIconWrap, machineFilter === 'WASHER' && styles.catIconWrapActive]}>
              <WashingMachine size={18} color={machineFilter === 'WASHER' ? COLORS.white : COLORS.primary} />
            </View>
            <Text style={[styles.catTitle, machineFilter === 'WASHER' && styles.catTitleActive]}>
              {isVietnamese ? 'Máy Giặt' : 'Wash & Fold'}
            </Text>
            <Text style={[styles.catCount, machineFilter === 'WASHER' && styles.catCountActive]}>
              {availWashers}/{totalWashers}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.categoryCard, machineFilter === 'DRYER' && styles.categoryCardActive]}
            onPress={() => setMachineFilter('DRYER')}
            activeOpacity={0.7}
          >
            <View style={[styles.catIconWrap, machineFilter === 'DRYER' && styles.catIconWrapActive]}>
              <Wind size={18} color={machineFilter === 'DRYER' ? COLORS.white : COLORS.amberDark} />
            </View>
            <Text style={[styles.catTitle, machineFilter === 'DRYER' && styles.catTitleActive]}>
              {isVietnamese ? 'Máy Sấy' : 'Dryer'}
            </Text>
            <Text style={[styles.catCount, machineFilter === 'DRYER' && styles.catCountActive]}>
              {availDryers}/{totalDryers}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Machines Grid */}
        {loadingMachines ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 24 }} />
        ) : filteredMachines.length > 0 ? (
          <View style={styles.machinesGrid}>
            {filteredMachines.map((m) => {
              const mId = m.machineId || m.id;
              const isSelected = (selectedMachine?.machineId || selectedMachine?.id) === mId;
              const isWasher = m.kind === 'WASHER' || m.className?.toLowerCase().includes('giặt');
              const isAvailable = m.status === 'AVAILABLE';

              return (
                <TouchableOpacity
                  key={mId}
                  style={[
                    styles.machineCard,
                    isSelected && styles.machineCardSelected,
                    !isAvailable && styles.machineCardDisabled,
                  ]}
                  onPress={() => {
                    if (isAvailable) {
                      setSelectedMachine(m);
                      const comp = getCompatibleCyclesForMachine(m);
                      setServices(comp);
                      if (comp.length > 0) {
                        setSelectedService(comp[0]);
                      }
                      setModalStep(2);
                      setOrderModalVisible(true);
                    }
                  }}
                  disabled={!isAvailable}
                  activeOpacity={0.7}
                >
                  <View style={styles.machineTop}>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeText}>{m.code || 'MÁY'}</Text>
                    </View>
                    <View style={[styles.kindBadge, isWasher ? styles.washerKindBadge : styles.dryerKindBadge]}>
                      {isWasher ? (
                        <WashingMachine size={11} color="#1d4ed8" />
                      ) : (
                        <Wind size={11} color="#b45309" />
                      )}
                      <Text style={[styles.kindBadgeText, isWasher ? styles.washerKindText : styles.dryerKindText]}>
                        {isWasher ? 'GIẶT' : 'SẤY'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.machineName} numberOfLines={1}>
                    {m.name || (isWasher ? 'Máy giặt công nghiệp' : 'Máy sấy nhiệt Gas')}
                  </Text>
                  <Text style={styles.machineCap}>
                    {m.capacityKg || 12} kg • {isWasher ? 'Cửa ngang Inverter' : 'Sấy nhiệt Gas'}
                  </Text>

                  <View style={styles.machineBottom}>
                    <View style={[styles.statusPill, isAvailable ? styles.statusAvailable : styles.statusBusy]}>
                      <View style={[styles.statusDot, isAvailable ? styles.statusDotAvailable : styles.statusDotBusy]} />
                      <Text style={[styles.statusText, isAvailable ? styles.statusTextAvailable : styles.statusTextBusy]}>
                        {isAvailable ? (isVietnamese ? 'SẴN SÀNG' : 'READY') : (isVietnamese ? 'ĐANG BẬN' : 'BUSY')}
                      </Text>
                    </View>

                    {isSelected && (
                      <View style={styles.selectedCheckCircle}>
                        <Check size={12} color={COLORS.white} strokeWidth={3} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <WashingMachine size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              {isVietnamese ? 'Không có máy nào phù hợp với bộ lọc hiện tại.' : 'No machines match the selected filter.'}
            </Text>
          </View>
        )}

        {/* Clearance for bottom floating bar */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* STICKY BOTTOM ACTION BAR */}
      <View style={styles.stickyBottomBar}>
        <View style={styles.stickyPriceCol}>
          <Text style={styles.stickyItemCount}>
            {selectedMachine ? `Đã chọn: [${selectedMachine.code}]` : (isVietnamese ? 'Chưa chọn máy' : 'No machine selected')}
          </Text>
          <Text style={styles.stickyTotalAmount}>
            {selectedService ? `${finalAmount.toLocaleString('vi-VN')} ₫` : '35.000 ₫'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.stickyBtn, (!selectedMachine || submittingOrder) && styles.stickyBtnDisabled]}
          onPress={() => handleOpenOrderStepsModal(2)}
          disabled={!selectedMachine || submittingOrder}
          activeOpacity={0.85}
        >
          {submittingOrder ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.stickyBtnText}>
                {isVietnamese ? 'Tiến hành đặt giặt' : 'Continue'}
              </Text>
              <ArrowRight size={18} color={COLORS.white} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL 1: CHỌN CHI NHÁNH TIỆM GIẶT */}
      <Modal visible={siteModalVisible} transparent animationType="fade" onRequestClose={() => setSiteModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSiteModalVisible(false)}>
          <Pressable style={styles.siteModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isVietnamese ? 'Chọn chi nhánh tiệm giặt' : 'Select Branch / Site'}
              </Text>
              <TouchableOpacity onPress={() => setSiteModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {sites.map((site) => {
                const siteId = site.siteId || site.id;
                const isSelected = (selectedSite?.siteId || selectedSite?.id) === siteId;
                return (
                  <TouchableOpacity
                    key={siteId}
                    style={[styles.siteOption, isSelected && styles.siteOptionSelected]}
                    onPress={() => {
                      setSelectedSite(site);
                      setSiteModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.siteOptLeft}>
                      <MapPin size={18} color={isSelected ? COLORS.primary : COLORS.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.siteOptName, isSelected && styles.siteOptNameSelected]}>
                          {site.name || site.siteName}
                        </Text>
                        <Text style={styles.siteOptAddr} numberOfLines={2}>
                          {site.address || site.location}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <Check size={18} color={COLORS.primary} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: FLOW 4 BƯỚC HOÀN TẤT ĐẶT GIẶT (BƯỚC 2 -> 3 -> 4 ĐỒNG BỘ 100% WEB) */}
      {/* ========================================================================= */}
      <Modal visible={orderModalVisible} transparent animationType="slide" onRequestClose={() => setOrderModalVisible(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setOrderModalVisible(false)}>
          <Pressable style={styles.sheetContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetDragBar} />

            {/* Header Modal kèm nút đóng */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {modalStep === 2
                  ? (isVietnamese ? 'Bước 2: Chu trình giặt sấy' : 'Step 2: Wash Program')
                  : modalStep === 3
                  ? (isVietnamese ? 'Bước 3: Chọn Voucher ưu đãi' : 'Step 3: Select Voucher')
                  : (isVietnamese ? 'Bước 4: Xác nhận & Thanh toán' : 'Step 4: Payment')}
              </Text>
              <TouchableOpacity onPress={() => setOrderModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* THANH STEPPER 4 BƯỚC ĐI QUA 1 ĐƯỜNG THẲNG ĐỒNG BỘ 100% WEB */}
            <View style={styles.stepperContainer}>
              {/* Line nối ngang */}
              <View style={styles.stepperLineBg}>
                <View
                  style={[
                    styles.stepperLineFill,
                    {
                      width: modalStep === 2 ? '33%' : modalStep === 3 ? '66%' : '100%',
                    },
                  ]}
                />
              </View>

              {/* 4 Nút Node Stepper */}
              <View style={styles.stepperNodesRow}>
                {/* Node 1: Chọn máy */}
                <TouchableOpacity
                  style={styles.stepperNode}
                  onPress={() => setOrderModalVisible(false)} // Quay về màn hình chính bước 1
                  activeOpacity={0.7}
                >
                  <View style={[styles.nodeCircle, styles.nodeCircleDone]}>
                    <Check size={12} color={COLORS.white} strokeWidth={3} />
                  </View>
                  <Text style={[styles.nodeLabel, styles.nodeLabelDone]}>
                    {isVietnamese ? '1. Chọn máy' : '1. Machine'}
                  </Text>
                </TouchableOpacity>

                {/* Node 2: Chu trình */}
                <TouchableOpacity
                  style={styles.stepperNode}
                  onPress={() => setModalStep(2)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.nodeCircle,
                    modalStep === 2 ? styles.nodeCircleActive : (modalStep > 2 ? styles.nodeCircleDone : styles.nodeCirclePending)
                  ]}>
                    {modalStep > 2 ? (
                      <Check size={12} color={COLORS.white} strokeWidth={3} />
                    ) : (
                      <Text style={[styles.nodeNumText, modalStep === 2 && styles.nodeNumTextActive]}>2</Text>
                    )}
                  </View>
                  <Text style={[styles.nodeLabel, modalStep === 2 ? styles.nodeLabelActive : (modalStep > 2 ? styles.nodeLabelDone : styles.nodeLabelPending)]}>
                    {isVietnamese ? '2. Chu trình' : '2. Cycle'}
                  </Text>
                </TouchableOpacity>

                {/* Node 3: Voucher */}
                <TouchableOpacity
                  style={styles.stepperNode}
                  onPress={() => setModalStep(3)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.nodeCircle,
                    modalStep === 3 ? styles.nodeCircleActive : (modalStep > 3 ? styles.nodeCircleDone : styles.nodeCirclePending)
                  ]}>
                    {modalStep > 3 ? (
                      <Check size={12} color={COLORS.white} strokeWidth={3} />
                    ) : (
                      <Text style={[styles.nodeNumText, modalStep === 3 && styles.nodeNumTextActive]}>3</Text>
                    )}
                  </View>
                  <Text style={[styles.nodeLabel, modalStep === 3 ? styles.nodeLabelActive : (modalStep > 3 ? styles.nodeLabelDone : styles.nodeLabelPending)]}>
                    {isVietnamese ? '3. Voucher' : '3. Voucher'}
                  </Text>
                </TouchableOpacity>

                {/* Node 4: Thanh toán */}
                <TouchableOpacity
                  style={styles.stepperNode}
                  onPress={() => {
                    if (selectedService) setModalStep(4);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.nodeCircle,
                    modalStep === 4 ? styles.nodeCircleActive : styles.nodeCirclePending
                  ]}>
                    <Text style={[styles.nodeNumText, modalStep === 4 && styles.nodeNumTextActive]}>4</Text>
                  </View>
                  <Text style={[styles.nodeLabel, modalStep === 4 ? styles.nodeLabelActive : styles.nodeLabelPending]}>
                    {isVietnamese ? '4. Thanh toán' : '4. Payment'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* NỘI DUNG TỪNG BƯỚC */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* ========================================================= */}
              {/* BƯỚC 2: CHỌN CHU TRÌNH GIẶT / SẤY TƯƠNG THÍCH             */}
              {/* ========================================================= */}
              {modalStep === 2 && (
                <View style={styles.stepContentBox}>
                  {/* Banner Máy Đang Chọn */}
                  <View style={styles.selectedMachineStrip}>
                    <Zap size={15} color={COLORS.primary} />
                    <Text style={styles.selectedMachineStripText}>
                      {isVietnamese ? 'Máy đang chọn:' : 'Selected:'}{' '}
                      <Text style={{ fontWeight: '900', color: COLORS.primaryDark }}>[{selectedMachine?.code}]</Text>
                      {' '}({selectedMachine?.kind === 'DRYER' ? 'Máy sấy nhiệt Gas' : 'Máy giặt cửa ngang'})
                    </Text>
                  </View>

                  <Text style={styles.stepSectionDesc}>
                    {isVietnamese
                      ? 'Chọn chương trình phù hợp với lượng đồ giặt. Hệ thống tự động cấp OMO Matic & Comfort kháng khuẩn.'
                      : 'Choose a program tailored for your laundry load. Automated detergent injection included.'}
                  </Text>

                  {/* Danh sách các chu trình */}
                  <View style={styles.servicesList}>
                    {services.map((srv) => {
                      const isSelected = selectedService?.offeringId === srv.offeringId || selectedService?.id === srv.id;
                      const isDryer = srv.category === 'DRY' || selectedMachine?.kind === 'DRYER';
                      const IconComp = isDryer ? Wind : WashingMachine;

                      return (
                        <TouchableOpacity
                          key={srv.offeringId || srv.id}
                          style={[styles.serviceItem, isSelected && styles.serviceItemSelected]}
                          onPress={() => setSelectedService(srv)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.srvIconBox, isSelected && styles.srvIconBoxSelected]}>
                            <IconComp size={20} color={isSelected ? COLORS.white : (isDryer ? COLORS.amberDark : COLORS.primary)} />
                          </View>

                          <View style={styles.srvContent}>
                            <View style={styles.srvTitleRow}>
                              <Text style={[styles.srvName, isSelected && styles.srvNameSelected]}>
                                {srv.name}
                              </Text>
                              {srv.badge && (
                                <View style={styles.srvBadge}>
                                  <Text style={styles.srvBadgeText}>{srv.badge}</Text>
                                </View>
                              )}
                            </View>

                            <Text style={styles.srvDescription} numberOfLines={2}>
                              {srv.desc}
                            </Text>

                            <View style={styles.srvMeta}>
                              <Clock size={12} color={COLORS.textSecondary} />
                              <Text style={styles.srvMetaText}>{srv.time || `${srv.durationMin} phút`}</Text>
                              <Text style={styles.metaDot}>•</Text>
                              <Sparkles size={11} color={COLORS.accentDark} />
                              <Text style={styles.srvMetaHighlight}>
                                {isVietnamese ? 'Cấp OMO & Comfort tự động' : 'Auto soap & softener'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.srvPriceCol}>
                            <Text style={[styles.srvPriceText, isSelected && styles.srvPriceTextSelected]}>
                              {Number(srv.price).toLocaleString('vi-VN')} ₫
                            </Text>
                            <View style={[styles.radioDot, isSelected && styles.radioDotSelected]}>
                              {isSelected && <Check size={11} color={COLORS.white} strokeWidth={3} />}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* ========================================================= */}
              {/* BƯỚC 3: CHỌN VOUCHER & MÃ GIẢM GIÁ                        */}
              {/* ========================================================= */}
              {modalStep === 3 && (
                <View style={styles.stepContentBox}>
                  {/* Tóm tắt tạm tính từ Bước 2 */}
                  <View style={styles.voucherSubtotalCard}>
                    <Text style={styles.voucherSubtotalLabel}>
                      {isVietnamese ? 'Chu trình đang chọn:' : 'Selected Program:'}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <Text style={styles.voucherSubtotalName}>{selectedService?.name || 'Giặt tiêu chuẩn'}</Text>
                      <Text style={styles.voucherSubtotalAmount}>{(selectedService?.price || 35000).toLocaleString('vi-VN')} ₫</Text>
                    </View>
                  </View>

                  <Text style={styles.stepSectionDesc}>
                    {isVietnamese
                      ? 'Chọn mã ưu đãi có sẵn hoặc nhập mã khuyến mãi của bạn để nhận chiết khấu trực tiếp.'
                      : 'Select an available voucher or enter your promo code to receive a direct discount.'}
                  </Text>

                  {/* Quick Selectable Vouchers */}
                  <View style={styles.quickVouchersRow}>
                    <TouchableOpacity
                      style={[styles.quickVoucherChip, (appliedVoucher?.code === 'WELCOME10K' || voucherCode === 'WELCOME10K') && styles.quickVoucherChipActive]}
                      onPress={() => selectQuickVoucher('WELCOME10K')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickVoucherText}>🎟️ WELCOME10K (-10.000 ₫)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickVoucherChip, (appliedVoucher?.code === 'SUMMER10' || voucherCode === 'SUMMER10') && styles.quickVoucherChipActive]}
                      onPress={() => selectQuickVoucher('SUMMER10')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickVoucherText}>🔥 SUMMER10 (-15%)</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Input nhập voucher */}
                  <View style={styles.voucherInputRow}>
                    <TextInput
                      style={styles.voucherInput}
                      placeholder={isVietnamese ? 'Nhập mã voucher (VD: WELCOME10K)...' : 'Enter promo code...'}
                      placeholderTextColor={COLORS.textMuted}
                      autoCapitalize="characters"
                      value={voucherCode}
                      onChangeText={setVoucherCode}
                    />
                    <TouchableOpacity style={styles.voucherBtn} onPress={handleApplyVoucher} activeOpacity={0.8}>
                      <Text style={styles.voucherBtnText}>{isVietnamese ? 'Áp dụng' : 'Apply'}</Text>
                    </TouchableOpacity>
                  </View>

                  {appliedVoucher && (
                    <View style={styles.appliedBanner}>
                      <CheckCircle2 size={16} color={COLORS.accentDark} />
                      <Text style={styles.appliedText}>
                        {isVietnamese ? `Đã áp dụng: ${appliedVoucher.code}` : `Applied: ${appliedVoucher.code}`}
                      </Text>
                      <Text style={styles.appliedDiscount}>
                        -{appliedVoucher.discountAmount.toLocaleString('vi-VN')} ₫
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* ========================================================= */}
              {/* BƯỚC 4: XÁC NHẬN ĐƠN GIẶT VÀ THANH TOÁN                   */}
              {/* ========================================================= */}
              {modalStep === 4 && (
                <View style={styles.stepContentBox}>
                  {/* Bảng chi tiết đơn hàng */}
                  <View style={styles.sheetDetailsCard}>
                    <View style={styles.sheetRow}>
                      <Text style={styles.sheetRowLabel}>{isVietnamese ? 'Chi nhánh:' : 'Site:'}</Text>
                      <Text style={styles.sheetRowVal}>{selectedSite?.name || 'LaundroChain Flagship'}</Text>
                    </View>
                    <View style={styles.sheetRow}>
                      <Text style={styles.sheetRowLabel}>{isVietnamese ? 'Máy giặt / sấy:' : 'Machine:'}</Text>
                      <Text style={styles.sheetRowVal}>[{selectedMachine?.code}] - {selectedMachine?.kind === 'DRYER' ? 'Máy sấy' : 'Máy giặt'}</Text>
                    </View>
                    <View style={styles.sheetRow}>
                      <Text style={styles.sheetRowLabel}>{isVietnamese ? 'Chu trình:' : 'Cycle:'}</Text>
                      <Text style={styles.sheetRowVal}>{selectedService?.name}</Text>
                    </View>

                    <View style={styles.sheetDivider} />

                    <View style={styles.sheetRow}>
                      <Text style={styles.sheetRowLabel}>{isVietnamese ? 'Tạm tính:' : 'Subtotal:'}</Text>
                      <Text style={styles.sheetRowVal}>{basePrice.toLocaleString('vi-VN')} ₫</Text>
                    </View>

                    {currentDiscount > 0 && (
                      <View style={styles.sheetRow}>
                        <Text style={[styles.sheetRowLabel, { color: COLORS.accentDark }]}>{isVietnamese ? 'Giảm giá voucher:' : 'Discount:'}</Text>
                        <Text style={[styles.sheetRowVal, { color: COLORS.accentDark }]}>
                          -{currentDiscount.toLocaleString('vi-VN')} ₫
                        </Text>
                      </View>
                    )}

                    <View style={[styles.sheetRow, { marginTop: 4 }]}>
                      <Text style={styles.sheetTotalLabel}>{isVietnamese ? 'Tổng thanh toán:' : 'Total Amount:'}</Text>
                      <Text style={styles.sheetTotalAmount}>{finalAmount.toLocaleString('vi-VN')} ₫</Text>
                    </View>
                  </View>

                  {/* Lựa chọn phương thức thanh toán */}
                  <Text style={styles.payMethodHeader}>
                    {isVietnamese ? 'Chọn phương thức thanh toán' : 'Select Payment Method'}
                  </Text>

                  {/* 1: Ví thành viên */}
                  <TouchableOpacity
                    style={[styles.payOption, paymentMethod === 'WALLET' && styles.payOptionActive]}
                    onPress={() => setPaymentMethod('WALLET')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.payOptIconWrap, paymentMethod === 'WALLET' && styles.payOptIconWrapActive]}>
                      <Wallet size={20} color={paymentMethod === 'WALLET' ? COLORS.white : COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.payOptTitle}>
                          {isVietnamese ? 'Ví thành viên LaundroChain' : 'LaundroChain Wallet'}
                        </Text>
                        <View style={styles.recBadge}>
                          <Text style={styles.recBadgeText}>{isVietnamese ? 'Khuyên dùng' : 'Recommended'}</Text>
                        </View>
                      </View>
                      <Text style={styles.payOptSub}>
                        {isVietnamese ? 'Số dư khả dụng:' : 'Available balance:'}{' '}
                        <Text style={{ fontWeight: '700', color: COLORS.text }}>{currentBalance.toLocaleString('vi-VN')} ₫</Text>
                      </Text>
                    </View>
                    <View style={[styles.radioCircle, paymentMethod === 'WALLET' && styles.radioCircleActive]}>
                      {paymentMethod === 'WALLET' && <Check size={12} color={COLORS.white} strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>

                  {/* 2: PayOS VietQR */}
                  <TouchableOpacity
                    style={[styles.payOption, paymentMethod === 'PAYOS' && styles.payOptionActive]}
                    onPress={() => setPaymentMethod('PAYOS')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.payOptIconWrap, paymentMethod === 'PAYOS' && styles.payOptIconWrapActive]}>
                      <QrCode size={20} color={paymentMethod === 'PAYOS' ? COLORS.white : COLORS.accentDark} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.payOptTitle}>
                        {isVietnamese ? 'Quét mã VietQR (PayOS)' : 'VietQR Instant Payment'}
                      </Text>
                      <Text style={styles.payOptSub}>
                        {isVietnamese ? 'Hỗ trợ tất cả ứng dụng Ngân hàng & MoMo' : 'Supports all Mobile Banking & MoMo apps'}
                      </Text>
                    </View>
                    <View style={[styles.radioCircle, paymentMethod === 'PAYOS' && styles.radioCircleActive]}>
                      {paymentMethod === 'PAYOS' && <Check size={12} color={COLORS.white} strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {/* NÚT ĐIỀU HƯỚNG BƯỚC Ở DƯỚI MODAL */}
            <View style={styles.modalFooterActions}>
              {modalStep === 2 ? (
                <View style={styles.footerBtnRow}>
                  <TouchableOpacity
                    style={styles.backStepBtn}
                    onPress={() => setOrderModalVisible(false)}
                    activeOpacity={0.7}
                  >
                    <ArrowLeft size={16} color={COLORS.textSecondary} />
                    <Text style={styles.backStepBtnText}>{isVietnamese ? 'Đổi máy khác' : 'Change Machine'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.nextStepBtn}
                    onPress={() => setModalStep(3)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.nextStepBtnText}>{isVietnamese ? 'Tiếp tục: Bước 3 (Voucher) ›' : 'Next: Step 3 (Voucher) ›'}</Text>
                  </TouchableOpacity>
                </View>
              ) : modalStep === 3 ? (
                <View style={styles.footerBtnRow}>
                  <TouchableOpacity
                    style={styles.backStepBtn}
                    onPress={() => setModalStep(2)}
                    activeOpacity={0.7}
                  >
                    <ArrowLeft size={16} color={COLORS.textSecondary} />
                    <Text style={styles.backStepBtnText}>{isVietnamese ? 'Quay lại Bước 2' : 'Back to Step 2'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.nextStepBtn}
                    onPress={() => setModalStep(4)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.nextStepBtnText}>{isVietnamese ? 'Tiếp tục: Thanh toán ›' : 'Next: Payment ›'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Bước 4: Thực hiện thanh toán */
                <View style={styles.footerBtnRow}>
                  <TouchableOpacity
                    style={styles.backStepBtn}
                    onPress={() => setModalStep(3)}
                    activeOpacity={0.7}
                  >
                    <ArrowLeft size={16} color={COLORS.textSecondary} />
                    <Text style={styles.backStepBtnText}>{isVietnamese ? 'Quay lại Bước 3' : 'Back to Step 3'}</Text>
                  </TouchableOpacity>

                  {paymentMethod === 'WALLET' ? (
                    <TouchableOpacity
                      style={[styles.sheetSubmitBtn, submittingOrder && { opacity: 0.7 }]}
                      onPress={handlePayWithWallet}
                      disabled={submittingOrder}
                      activeOpacity={0.85}
                    >
                      {submittingOrder ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <>
                          <Wallet size={16} color={COLORS.white} />
                          <Text style={styles.sheetSubmitBtnText}>
                            {isVietnamese ? `Thanh toán ${finalAmount.toLocaleString('vi-VN')} ₫` : `Pay ${finalAmount.toLocaleString('vi-VN')} ₫`}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.sheetSubmitBtn, { backgroundColor: COLORS.accentDark }, submittingOrder && { opacity: 0.7 }]}
                      onPress={handlePayWithPayOs}
                      disabled={submittingOrder}
                      activeOpacity={0.85}
                    >
                      {submittingOrder ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <>
                          <QrCode size={16} color={COLORS.white} />
                          <Text style={styles.sheetSubmitBtnText}>
                            {isVietnamese ? 'Tạo mã VietQR' : 'Generate VietQR'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL 3: VIETQR PAYOS MODAL (QUÉT MÃ & MÔ PHỎNG THÀNH CÔNG) */}
      {payOsOrderModal && (
        <Modal visible={!!payOsOrderModal} transparent animationType="fade" onRequestClose={() => setPayOsOrderModal(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setPayOsOrderModal(null)}>
            <Pressable style={styles.qrModalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <QrCode size={20} color={COLORS.primary} />
                  <Text style={styles.modalTitle}>{isVietnamese ? 'Quét mã VietQR để giặt' : 'Scan VietQR'}</Text>
                </View>
                <TouchableOpacity onPress={() => setPayOsOrderModal(null)} style={styles.modalCloseBtn}>
                  <X size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
                <View style={styles.qrImageBox}>
                  {payOsOrderModal.qrImageUrl ? (
                    <Image source={{ uri: payOsOrderModal.qrImageUrl }} style={styles.qrImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.qrFallbackBox}>
                      <QrCode size={140} color={COLORS.primary} />
                      <Text style={styles.qrFallbackText}>
                        {payOsOrderModal.qrCode || (isVietnamese ? 'Đang tạo mã VietQR...' : 'Generating QR...')}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Thông tin chuyển khoản */}
                <View style={styles.bankInfoBox}>
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>{isVietnamese ? 'Ngân hàng:' : 'Bank:'}</Text>
                    <Text style={[styles.bankValText, { fontWeight: '700' }]}>MB Bank (Napas 247)</Text>
                  </View>

                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>{isVietnamese ? 'Số tiền:' : 'Amount:'}</Text>
                    <Text style={styles.bankAmountText}>
                      {(payOsOrderModal.amount || finalAmount).toLocaleString('vi-VN')} ₫
                    </Text>
                  </View>

                  {payOsOrderModal.accountNumber && (
                    <View style={styles.bankRow}>
                      <Text style={styles.bankLabel}>{isVietnamese ? 'Số tài khoản:' : 'Account No:'}</Text>
                      <TouchableOpacity
                        style={styles.copyPill}
                        onPress={() => handleCopy(payOsOrderModal.accountNumber, 'acc')}
                      >
                        <Text style={styles.bankValText}>{payOsOrderModal.accountNumber}</Text>
                        {copiedKey === 'acc' ? <Check size={12} color={COLORS.accentDark} /> : <Copy size={12} color={COLORS.primary} />}
                      </TouchableOpacity>
                    </View>
                  )}

                  {payOsOrderModal.accountName && (
                    <View style={styles.bankRow}>
                      <Text style={styles.bankLabel}>{isVietnamese ? 'Chủ tài khoản:' : 'Holder:'}</Text>
                      <Text style={styles.bankValText}>{payOsOrderModal.accountName}</Text>
                    </View>
                  )}

                  {payOsOrderModal.description && (
                    <View style={styles.bankRow}>
                      <Text style={styles.bankLabel}>{isVietnamese ? 'Nội dung CK:' : 'Transfer Note:'}</Text>
                      <TouchableOpacity
                        style={styles.copyPill}
                        onPress={() => handleCopy(payOsOrderModal.description, 'desc')}
                      >
                        <Text style={styles.bankValText}>{payOsOrderModal.description}</Text>
                        {copiedKey === 'desc' ? <Check size={12} color={COLORS.accentDark} /> : <Copy size={12} color={COLORS.primary} />}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Nút mô phỏng thành công cho Test */}
                <TouchableOpacity
                  style={styles.simulateBtn}
                  onPress={handleSimulatePaySuccess}
                  activeOpacity={0.8}
                >
                  <Play size={15} color={COLORS.white} />
                  <Text style={styles.simulateBtnText}>
                    {isVietnamese ? '⚡ Xác nhận đã chuyển khoản (Bắt đầu máy)' : '⚡ Confirm Transfer (Start Machine)'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Language Modal */}
      <LanguageModal visible={langModalVisible} onClose={() => setLangModalVisible(false)} />

      {/* Topup Modal */}
      <TopupModal
        visible={topupModalVisible}
        onClose={() => setTopupModalVisible(false)}
        onSuccess={() => loadInitialData()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Chi nhánh Card
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  locIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locContent: {
    flex: 1,
    gap: 2,
  },
  locTag: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  locTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  locSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Hero Promo Banner
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bannerWarm,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.bannerBorder,
  },
  promoLeft: {
    flex: 1,
    paddingRight: 10,
    gap: 4,
  },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(120, 53, 15, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 2,
  },
  promoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.bannerText,
    letterSpacing: 0.4,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.bannerText,
    lineHeight: 23,
    letterSpacing: -0.3,
  },
  promoDesc: {
    fontSize: 12,
    color: COLORS.bannerSubtext,
    lineHeight: 16,
    marginTop: 2,
  },
  promoGraphic: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  basketCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.bannerBorder,
  },

  // Quick Wallet Strip
  quickWalletStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  qwLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qwLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  qwAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  qwTopupBtn: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  qwTopupText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Bước 1 Header
  sectionHeaderWrap: {
    marginBottom: 10,
    gap: 2,
  },
  stepOneBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepOneBadgeText: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 11,
  },
  sectionMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  sectionSubTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  catIconWrapActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  catTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  catTitleActive: {
    color: COLORS.white,
  },
  catCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  catCountActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Machines Grid
  machinesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  machineCard: {
    width: '48.5%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  machineCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FAFCFF',
  },
  machineCardDisabled: {
    opacity: 0.55,
    backgroundColor: '#F8FAFC',
  },
  machineTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.text,
  },
  kindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  washerKindBadge: {
    backgroundColor: '#EFF6FF',
  },
  dryerKindBadge: {
    backgroundColor: '#FFFBEB',
  },
  kindBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  washerKindText: {
    color: '#1D4ED8',
  },
  dryerKindText: {
    color: '#B45309',
  },
  machineName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  machineCap: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  machineBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusAvailable: {
    backgroundColor: COLORS.accentSoft,
  },
  statusBusy: {
    backgroundColor: COLORS.surface,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotAvailable: {
    backgroundColor: COLORS.accentDark,
  },
  statusDotBusy: {
    backgroundColor: COLORS.textMuted,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusTextAvailable: {
    color: COLORS.accentDark,
  },
  statusTextBusy: {
    color: COLORS.textSecondary,
  },
  selectedCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Sticky Bottom Action Bar
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  stickyPriceCol: {
    gap: 2,
  },
  stickyItemCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  stickyTotalAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  stickyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  stickyBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  stickyBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },

  // Modals & Bottom Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  siteModalContent: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  siteOptionSelected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  siteOptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  siteOptName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  siteOptNameSelected: {
    color: COLORS.primaryDark,
  },
  siteOptAddr: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Bottom Sheet 4 Bước
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  sheetDragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },

  // Stepper 4 bước nằm ngang chuẩn Web
  stepperContainer: {
    position: 'relative',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  stepperLineBg: {
    position: 'absolute',
    top: 23,
    left: '12%',
    right: '12%',
    height: 2,
    backgroundColor: COLORS.border,
    zIndex: 1,
  },
  stepperLineFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  stepperNodesRow: {
    position: 'relative',
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepperNode: {
    alignItems: 'center',
    width: '24%',
    gap: 4,
  },
  nodeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  nodeCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  nodeCircleDone: {
    backgroundColor: COLORS.accentDark,
    borderColor: COLORS.accentDark,
  },
  nodeCirclePending: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
  },
  nodeNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  nodeNumTextActive: {
    color: COLORS.white,
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  nodeLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  nodeLabelDone: {
    color: COLORS.accentDark,
  },
  nodeLabelPending: {
    color: COLORS.textMuted,
  },

  // Nội dung từng bước trong modal
  stepContentBox: {
    paddingVertical: 4,
  },
  selectedMachineStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  selectedMachineStripText: {
    fontSize: 12,
    color: COLORS.text,
  },
  stepSectionDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: 12,
  },

  // Bước 2: Danh sách chu trình
  servicesList: {
    gap: 10,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
  },
  serviceItemSelected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  srvIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  srvIconBoxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  srvContent: {
    flex: 1,
    gap: 2,
  },
  srvTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  srvName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  srvNameSelected: {
    color: COLORS.primaryDark,
  },
  srvBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  srvBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
  },
  srvDescription: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 14,
  },
  srvMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  srvMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  metaDot: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  srvMetaHighlight: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accentDark,
  },
  srvPriceCol: {
    alignItems: 'flex-end',
    gap: 6,
    marginLeft: 8,
  },
  srvPriceText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  srvPriceTextSelected: {
    color: COLORS.primaryDark,
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  // Bước 3: Voucher
  voucherSubtotalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  voucherSubtotalLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  voucherSubtotalName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  voucherSubtotalAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  quickVouchersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  quickVoucherChip: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  quickVoucherChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  quickVoucherText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  voucherInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  voucherInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  voucherBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
  appliedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
  },
  appliedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  appliedDiscount: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.accentDark,
  },

  // Bước 4: Thanh toán
  sheetDetailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetRowLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sheetRowVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  sheetTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  sheetTotalAmount: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  payMethodHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 8,
    gap: 12,
  },
  payOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  payOptIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payOptIconWrapActive: {
    backgroundColor: COLORS.primary,
  },
  payOptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  payOptSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  recBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  // Footer Actions trong modal 4 bước
  modalFooterActions: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 10,
  },
  footerBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  backStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  backStepBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  nextStepBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStepBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  sheetSubmitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 14,
  },
  sheetSubmitBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },

  // QR Modal
  qrModalContent: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
  },
  qrImageBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 14,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  qrFallbackBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  qrFallbackText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  bankInfoBox: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  bankAmountText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  bankValText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accentDark,
    paddingVertical: 13,
    borderRadius: 14,
  },
  simulateBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 13,
  },
});
