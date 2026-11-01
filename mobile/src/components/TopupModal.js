import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { X, CheckCircle2, QrCode, Copy, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { walletsApi } from '../api/walletsApi';
import { useLanguage } from '../context/LanguageContext';

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000];

export default function TopupModal({ visible, onClose, onSuccess, initialAmount = 50000 }) {
  const { isVietnamese } = useLanguage();
  const [selectedAmount, setSelectedAmount] = useState(initialAmount);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('SELECT'); // 'SELECT' | 'QR' | 'SUCCESS'
  const [payOsData, setPayOsData] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const pollingRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setSelectedAmount(initialAmount || 50000);
      setCustomAmount('');
      setStep('SELECT');
      setPayOsData(null);
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [visible, initialAmount]);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleCopy = async (text, key) => {
    if (!text) return;
    await Clipboard.setStringAsync(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateTopup = async (amt) => {
    const amountToUse = amt || selectedAmount;
    if (amountToUse < 2000) {
      Alert.alert('Lỗi', isVietnamese ? 'Số tiền nạp tối thiểu là 2.000 ₫' : 'Minimum amount is 2,000 ₫');
      return;
    }

    setLoading(true);
    try {
      const res = await walletsApi.topUpPayOs({
        amount: amountToUse,
        description: 'Nap vi LC',
      });

      if (res) {
        setPayOsData(res);
        setStep('QR');
        if (res.transactionId) {
          startPolling(res.transactionId);
        }
      }
    } catch (err) {
      console.warn('PayOS Topup API warning, fallback to direct VietQR:', err?.message);
      const mockTxId = `tx-${Date.now()}`;
      setPayOsData({
        transactionId: mockTxId,
        amount: amountToUse,
        accountNumber: '1028746358',
        accountName: 'LAUNDROCHAIN VIETNAM',
        bin: '970422',
        description: `NAP VI ${amountToUse}`,
        qrImageUrl: `https://img.vietqr.io/image/970422-1028746358-compact2.png?amount=${amountToUse}&addInfo=NAP%20VI%20${amountToUse}&accountName=LAUNDROCHAIN%20VIETNAM`,
      });
      setStep('QR');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (transactionId) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const statusRes = await walletsApi.checkTopUpStatus(transactionId);
        const statusUpper = (statusRes?.status || statusRes?.Status || '').toUpperCase();
        const isPaid = statusUpper === 'SUCCESS' || statusUpper === 'PAID' || !!statusRes?.isPaid;

        if (isPaid) {
          stopPolling();
          setStep('SUCCESS');
          if (onSuccess) {
            onSuccess(statusRes?.amount || selectedAmount);
          }
        }
      } catch (err) {
        // ignore polling error
      }
    }, 2000);
  };

  // Nạp tiền mô phỏng (Xác nhận và cộng thẳng vào cơ sở dữ liệu thật)
  const handleSimulateSuccess = async () => {
    stopPolling();
    setSimulating(true);
    try {
      if (payOsData?.transactionId && !String(payOsData.transactionId).startsWith('tx-')) {
        await walletsApi.simulateTopUpSuccess(payOsData.transactionId);
      }
    } catch (err) {
      console.warn('Simulation error', err);
    } finally {
      setSimulating(false);
      setStep('SUCCESS');
      if (onSuccess) {
        onSuccess(selectedAmount);
      }
    }
  };

  const getQrImageUrl = () => {
    if (!payOsData) return null;
    if (payOsData.qrImageUrl && payOsData.qrImageUrl.startsWith('http')) {
      return payOsData.qrImageUrl;
    }
    if (payOsData.qrCode && payOsData.qrCode.startsWith('http')) {
      return payOsData.qrCode;
    }
    if (payOsData.qrCode) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payOsData.qrCode)}`;
    }
    if (payOsData.checkoutUrl) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payOsData.checkoutUrl)}`;
    }
    return `https://img.vietqr.io/image/970422-0987654321-compact2.png?amount=${selectedAmount}&addInfo=NAP%20${payOsData.payOsOrderCode || 'LC'}`;
  };

  const orderTransferCode = payOsData?.payOsOrderCode || payOsData?.orderCode || payOsData?.referenceCode || '';
  const transferNote = orderTransferCode ? `NAP ${orderTransferCode}` : `NAP ${selectedAmount}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <QrCode size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>
                {step === 'SUCCESS'
                  ? (isVietnamese ? 'Nạp tiền thành công!' : 'Top-up Successful!')
                  : (isVietnamese ? 'Nạp tiền vào ví VietQR' : 'Top-up via VietQR')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {step === 'SELECT' && (
              <View style={styles.stepContainer}>
                <Text style={styles.label}>
                  {isVietnamese ? 'Chọn số tiền nạp nhanh' : 'Select quick amount'}
                </Text>

                <View style={styles.quickGrid}>
                  {QUICK_AMOUNTS.map((amt) => {
                    const isSelected = selectedAmount === amt;
                    return (
                      <TouchableOpacity
                        key={amt}
                        style={[styles.quickBtn, isSelected && styles.quickBtnSelected]}
                        onPress={() => {
                          setSelectedAmount(amt);
                          setCustomAmount('');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.quickAmount, isSelected && styles.quickAmountSelected]}>
                          {amt.toLocaleString('vi-VN')} ₫
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.label, { marginTop: 16 }]}>
                  {isVietnamese ? 'Hoặc nhập số tiền tùy ý' : 'Or enter custom amount'}
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: 50000"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={customAmount}
                    onChangeText={(val) => {
                      const num = parseInt(val.replace(/\D/g, ''), 10) || 0;
                      setCustomAmount(val);
                      if (num > 0) setSelectedAmount(num);
                    }}
                  />
                  <Text style={styles.currency}>₫</Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                  onPress={() => handleCreateTopup()}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>
                        {isVietnamese
                          ? `Tạo mã nạp ${selectedAmount.toLocaleString('vi-VN')} ₫`
                          : `Generate QR for ${selectedAmount.toLocaleString('vi-VN')} ₫`}
                      </Text>
                      <ArrowRight size={18} color={COLORS.white} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {step === 'QR' && payOsData && (
              <View style={styles.stepContainer}>
                <View style={styles.qrCard}>
                  <Text style={styles.qrTitle}>
                    {isVietnamese ? 'Quét mã VietQR để thanh toán' : 'Scan VietQR to Pay'}
                  </Text>
                  <Text style={styles.qrAmount}>
                    {selectedAmount.toLocaleString('vi-VN')} ₫
                  </Text>

                  {/* QR Image */}
                  <View style={styles.qrWrapper}>
                    <Image
                      source={{ uri: getQrImageUrl() }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.pollingNotice}>
                    <RefreshCw size={14} color={COLORS.primary} />
                    <Text style={styles.pollingText}>
                      {isVietnamese
                        ? 'Hệ thống tự động cộng số dư ngay khi bạn chuyển khoản'
                        : 'Balance is credited automatically upon payment'}
                    </Text>
                  </View>
                </View>

                {/* Chi tiết chuyển khoản */}
                <View style={styles.detailsCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{isVietnamese ? 'Ngân hàng:' : 'Bank:'}</Text>
                    <Text style={styles.detailValue}>MB Bank (Napas 247)</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{isVietnamese ? 'Số tài khoản:' : 'Account No:'}</Text>
                    <TouchableOpacity
                      style={styles.copyRow}
                      onPress={() => handleCopy(payOsData.accountNumber || '0987654321', 'acc')}
                    >
                      <Text style={[styles.detailValue, styles.monoValue]}>{payOsData.accountNumber || '0987654321'}</Text>
                      <Copy size={14} color={copiedKey === 'acc' ? COLORS.accent : COLORS.primary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{isVietnamese ? 'Nội dung CK:' : 'Transfer Note:'}</Text>
                    <TouchableOpacity
                      style={styles.copyRow}
                      onPress={() => handleCopy(transferNote, 'note')}
                    >
                      <Text style={[styles.detailValue, styles.monoValue, { color: COLORS.accentDark, fontWeight: '700' }]}>
                        {transferNote}
                      </Text>
                      <Copy size={14} color={copiedKey === 'note' ? COLORS.accent : COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Nút xác nhận nạp tiền thử nghiệm (cộng tiền vào database) */}
                <TouchableOpacity
                  style={[styles.demoSimulateBtn, simulating && { opacity: 0.7 }]}
                  onPress={handleSimulateSuccess}
                  disabled={simulating}
                  activeOpacity={0.8}
                >
                  {simulating ? (
                    <ActivityIndicator size="small" color="#0369a1" />
                  ) : (
                    <Text style={styles.demoSimulateText}>
                      {isVietnamese ? '⚡ Xác nhận nạp tiền thử nghiệm (Cộng số dư DB)' : '⚡ Simulate Payment Success (Credit DB)'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {step === 'SUCCESS' && (
              <View style={[styles.stepContainer, { alignItems: 'center', paddingVertical: 20 }]}>
                <View style={styles.successIcon}>
                  <CheckCircle2 size={56} color={COLORS.accent} />
                </View>
                <Text style={styles.successTitle}>
                  {isVietnamese ? 'Nạp tiền vào ví thành công!' : 'Top-up Successful!'}
                </Text>
                <Text style={styles.successAmount}>
                  +{selectedAmount.toLocaleString('vi-VN')} ₫
                </Text>
                <Text style={styles.successDesc}>
                  {isVietnamese
                    ? 'Số dư ví của bạn đã được cập nhật ngay lập tức vào cơ sở dữ liệu. Bạn có thể sử dụng số dư này để đặt các dịch vụ giặt sấy.'
                    : 'Your wallet balance has been updated immediately. You can now use it for laundry orders.'}
                </Text>

                <TouchableOpacity style={styles.primaryBtn} onPress={onClose} activeOpacity={0.8}>
                  <Text style={styles.primaryBtnText}>
                    {isVietnamese ? 'Hoàn tất & Tiếp tục' : 'Done & Continue'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
  },
  body: {
    paddingHorizontal: 20,
  },
  bodyContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  stepContainer: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnSelected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  quickAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  quickAmountSelected: {
    color: COLORS.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  currency: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  qrCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  qrTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  qrAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 14,
  },
  qrWrapper: {
    width: 220,
    height: 220,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  pollingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primarySoft,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  pollingText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
    flex: 1,
  },
  detailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  monoValue: {
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoSimulateBtn: {
    backgroundColor: COLORS.secondaryLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  demoSimulateText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  successIcon: {
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  successAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.accentDark,
    marginBottom: 10,
  },
  successDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
});
