import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  History,
  Clock,
  WashingMachine,
  AlertTriangle,
  X,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Ban,
  PhoneCall,
  Play,
  RotateCcw,
  ChevronRight,
  Sparkles,
  Wind,
  Phone,
  MessageCircle,
  HelpCircle,
  ShieldCheck,
  Check,
} from 'lucide-react-native';
import { COLORS } from '../../constants/config';
import { ordersApi } from '../../api/ordersApi';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import Header from '../../components/Header';
import LanguageModal from '../../components/LanguageModal';

const STATUS_FILTERS = [
  { key: 'ALL', labelVi: 'Tất cả', labelEn: 'All' },
  { key: 'IN_PROGRESS', labelVi: 'Đang giặt / sấy', labelEn: 'Running' },
  { key: 'CONFIRMED', labelVi: 'Đã xác nhận', labelEn: 'Confirmed' },
  { key: 'COMPLETED', labelVi: 'Hoàn thành', labelEn: 'Completed' },
  { key: 'CANCELLED', labelVi: 'Đã hủy', labelEn: 'Cancelled' },
];

export default function MyOrdersScreen({ navigation }) {
  const { isVietnamese } = useLanguage();
  const { logout } = useAuth();
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const statusParam = activeFilter === 'ALL' ? null : activeFilter;
      const res = await ordersApi.getMyOrders(statusParam);
      const list = res?.items || (Array.isArray(res) ? res : []);
      setOrders(list);
    } catch (err) {
      console.warn('Lỗi lấy danh sách đơn hàng', err);
      setOrders([]);
      if (
        err?.status === 401 ||
        err?.message?.includes('Authentication required') ||
        err?.message?.includes('token is invalid') ||
        err?.message?.includes('expired')
      ) {
        logout();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Bắt đầu chu trình giặt cho đơn đã CONFIRMED
  const handleStartOrder = async (order) => {
    setActionLoading(true);
    try {
      await ordersApi.startOrder(order.orderId);
      Alert.alert(
        'Thành công',
        isVietnamese
          ? `Máy đã nhận lệnh và bắt đầu chạy chu trình giặt!`
          : `Machine has started the laundry cycle!`
      );
      if (selectedOrder) setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      Alert.alert('Lỗi khởi động máy', err.message || (isVietnamese ? 'Không thể kích hoạt máy lúc này' : 'Failed to start machine'));
    } finally {
      setActionLoading(false);
    }
  };

  // Hủy đơn hàng
  const handleCancelOrder = (order) => {
    Alert.alert(
      isVietnamese ? 'Hủy đơn giặt' : 'Cancel Order',
      isVietnamese
        ? `Bạn có chắc chắn muốn hủy đơn hàng #${order.orderCode || order.orderId?.slice(-6)}? Máy sẽ được giải phóng.`
        : `Are you sure you want to cancel order #${order.orderCode || order.orderId?.slice(-6)}?`,
      [
        { text: isVietnamese ? 'Không' : 'No', style: 'cancel' },
        {
          text: isVietnamese ? 'Hủy đơn' : 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await ordersApi.cancelOrder(order.orderId || order.id);
              Alert.alert('Thành công', isVietnamese ? 'Đã hủy đơn hàng.' : 'Order cancelled.');
              if (selectedOrder) setSelectedOrder(null);
              fetchOrders();
            } catch (err) {
              Alert.alert('Lỗi', err.message || (isVietnamese ? 'Không thể hủy đơn lúc này.' : 'Failed to cancel order.'));
              fetchOrders();
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'IN_PROGRESS' || s === 'RUNNING' || s === 'WASHING' || s === 'DRYING') {
      return {
        bg: COLORS.primarySoft,
        text: COLORS.primary,
        label: isVietnamese ? 'ĐANG GIẶT / SẤY' : 'RUNNING',
        step: 3,
      };
    }
    if (s === 'CONFIRMED') {
      return {
        bg: COLORS.successSoft,
        text: COLORS.success,
        label: isVietnamese ? 'ĐÃ XÁC NHẬN - CHỜ BẤM' : 'CONFIRMED',
        step: 2,
      };
    }
    if (s === 'COMPLETED' || s === 'PAID' || s === 'SUCCESS') {
      return {
        bg: COLORS.successSoft,
        text: COLORS.success,
        label: isVietnamese ? 'HOÀN THÀNH' : 'COMPLETED',
        step: 4,
      };
    }
    if (s === 'PENDING_PAYMENT' || s === 'PENDING') {
      return {
        bg: COLORS.warningSoft,
        text: COLORS.warning,
        label: isVietnamese ? 'CHỜ THANH TOÁN' : 'PENDING',
        step: 1,
      };
    }
    if (s === 'CANCELLED' || s === 'FAILED') {
      return {
        bg: COLORS.dangerSoft,
        text: COLORS.danger,
        label: isVietnamese ? 'ĐÃ HỦY' : 'CANCELLED',
        step: 0,
      };
    }
    return {
      bg: COLORS.surfaceAlt,
      text: COLORS.textSecondary,
      label: s || (isVietnamese ? 'ĐANG XỬ LÝ' : 'PROCESSING'),
      step: 1,
    };
  };

  const renderOrderItem = ({ item }) => {
    const badge = getStatusBadge(item.status);
    const isRunning = item.status === 'IN_PROGRESS';
    const isConfirmed = item.status === 'CONFIRMED';
    const orderTotal = Number(item.total ?? item.amount ?? item.totalAmount ?? 0);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => setSelectedOrder(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.codeRow}>
            <Text style={styles.orderCode}>#{item.orderCode || (item.orderId ? item.orderId.slice(-8) : 'ORD')}</Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
          </View>
          <Text style={styles.orderAmount}>
            {orderTotal.toLocaleString('vi-VN')} ₫
          </Text>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <WashingMachine size={15} color={COLORS.primary} />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.assignedMachines || item.machineName || item.serviceName || (isVietnamese ? 'Dịch vụ giặt sấy tự động' : 'Automated Laundry')}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Clock size={15} color={COLORS.textSecondary} />
            <Text style={styles.infoTextSecondary}>
              {new Date(item.createdAt || Date.now()).toLocaleString('vi-VN')}
            </Text>
          </View>

          {isRunning && (
            <View style={styles.countdownBanner}>
              <View style={styles.pulseDot} />
              <Text style={styles.countdownText}>
                {isVietnamese
                  ? 'Máy đang hoạt động chu trình • Vui lòng chờ máy hoàn tất'
                  : 'Cycle in progress • Machine running'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.siteText} numberOfLines={1}>
            {item.siteName || (isVietnamese ? 'LaundroChain Flagship' : 'Main Site')}
          </Text>

          {isConfirmed ? (
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => handleStartOrder(item)}
              activeOpacity={0.8}
            >
              <Play size={13} color={COLORS.white} />
              <Text style={styles.startBtnText}>{isVietnamese ? 'Bắt đầu giặt' : 'Start Machine'}</Text>
            </TouchableOpacity>
          ) : item.status === 'PENDING_PAYMENT' ? (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => handleCancelOrder(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>{isVietnamese ? 'Hủy' : 'Cancel'}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.viewDetailText}>
              {isVietnamese ? 'Theo dõi' : 'Track'} ›
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isVietnamese ? 'Theo dõi đơn hàng' : 'Track Orders'}
        subtitle={isVietnamese ? 'Tiến độ & chu trình giặt thời gian thực' : 'Real-time order progress & history'}
        onOpenLang={() => setLangModalVisible(true)}
      />

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATUS_FILTERS.map((f) => {
            const isSelected = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterLabel, isSelected && styles.filterLabelActive]}>
                  {isVietnamese ? f.labelVi : f.labelEn}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 10, color: COLORS.textSecondary, fontSize: 13 }}>
            {isVietnamese ? 'Đang tải danh sách đơn...' : 'Loading orders...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item, index) => item.orderId || item.id || String(index)}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <History size={36} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {isVietnamese ? 'Chưa có đơn hàng nào' : 'No orders found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isVietnamese
                  ? 'Các đơn giặt sấy của bạn sẽ xuất hiện tại đây sau khi đặt hàng.'
                  : 'Your laundry orders will appear here once you place them.'}
              </Text>
              <TouchableOpacity
                style={styles.orderNowBtn}
                onPress={() => navigation.navigate('ServicesTab')}
                activeOpacity={0.8}
              >
                <Text style={styles.orderNowText}>
                  {isVietnamese ? 'Đặt giặt ngay' : 'Order Now'}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* MODAL: TRACK YOUR ORDER (Pinterest Screen 4 Reference Style) */}
      {selectedOrder && (
        <Modal visible={!!selectedOrder} transparent animationType="slide" onRequestClose={() => setSelectedOrder(null)}>
          <Pressable style={styles.trackOverlay} onPress={() => setSelectedOrder(null)}>
            <Pressable style={styles.trackSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />

              {/* Header Modal */}
              <View style={styles.trackHeader}>
                <View>
                  <Text style={styles.trackTopTitle}>
                    {isVietnamese ? 'Theo dõi đơn hàng' : 'Track your order'}
                  </Text>
                  <Text style={styles.trackTopSub}>
                    #{selectedOrder.orderCode || selectedOrder.orderId?.slice(-8)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.trackCloseBtn}>
                  <X size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
                {/* 1. WARM FRESHNESS CARD (Pinterest Screen 4 Top Card) */}
                <View style={styles.warmFreshCard}>
                  <Text style={styles.warmOrderCode}>
                    ORDER #{selectedOrder.orderCode || selectedOrder.orderId?.slice(-8)}
                  </Text>
                  <Text style={styles.warmTitle}>
                    {selectedOrder.status === 'COMPLETED'
                      ? (isVietnamese ? 'Đồ giặt đã sẵn sàng!' : 'Freshness is ready!')
                      : (isVietnamese ? 'Đồ sạch tinh tươm đang tới.' : 'Freshness is on its way.')}
                  </Text>
                  <View style={styles.warmDateRow}>
                    <Calendar size={13} color={COLORS.bannerText} />
                    <Text style={styles.warmDateText}>
                      {new Date(selectedOrder.createdAt || Date.now()).toLocaleDateString('vi-VN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.warmSub}>
                    {isVietnamese
                      ? 'Hệ thống tự động thông báo khi chu trình giặt hoàn tất.'
                      : 'We will notify you once the machine completes the cycle.'}
                  </Text>
                </View>

                {/* 2. VERTICAL TIMELINE / STEPPER (Pinterest Screen 4 Stepper) */}
                <View style={styles.timelineCard}>
                  <Text style={styles.timelineHeaderTitle}>
                    {isVietnamese ? 'Tiến độ chu trình' : 'Cycle Progression'}
                  </Text>

                  {/* Step 1: Order Confirmed */}
                  <View style={styles.timelineStep}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.stepDot, styles.stepDotDone]}>
                        <Check size={11} color={COLORS.white} strokeWidth={3} />
                      </View>
                      <View style={[styles.stepLine, styles.stepLineActive]} />
                    </View>
                    <View style={styles.stepRight}>
                      <Text style={styles.stepTitle}>
                        {isVietnamese ? 'Đã xác nhận đơn hàng' : 'Order confirmed'}
                      </Text>
                      <Text style={styles.stepTime}>
                        {new Date(selectedOrder.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>

                  {/* Step 2: Machine Assigned */}
                  <View style={styles.timelineStep}>
                    <View style={styles.timelineLeft}>
                      <View style={[
                        styles.stepDot,
                        (selectedOrder.status === 'CONFIRMED' || selectedOrder.status === 'IN_PROGRESS' || selectedOrder.status === 'COMPLETED')
                          ? styles.stepDotDone
                          : styles.stepDotPending
                      ]}>
                        <Check size={11} color={COLORS.white} strokeWidth={3} />
                      </View>
                      <View style={[
                        styles.stepLine,
                        (selectedOrder.status === 'IN_PROGRESS' || selectedOrder.status === 'COMPLETED') ? styles.stepLineActive : styles.stepLineInactive
                      ]} />
                    </View>
                    <View style={styles.stepRight}>
                      <Text style={styles.stepTitle}>
                        {isVietnamese ? 'Gán máy & Nạp nước giặt OMO' : 'Machine Assigned & Soap Injected'}
                      </Text>
                      <Text style={styles.stepDesc}>
                        {selectedOrder.assignedMachines || selectedOrder.machineName || 'Máy giặt công nghiệp'}
                      </Text>
                    </View>
                  </View>

                  {/* Step 3: Cleaning with Care */}
                  <View style={styles.timelineStep}>
                    <View style={styles.timelineLeft}>
                      <View style={[
                        styles.stepDot,
                        selectedOrder.status === 'IN_PROGRESS'
                          ? styles.stepDotActive
                          : (selectedOrder.status === 'COMPLETED' ? styles.stepDotDone : styles.stepDotPending)
                      ]}>
                        {selectedOrder.status === 'COMPLETED' ? (
                          <Check size={11} color={COLORS.white} strokeWidth={3} />
                        ) : (
                          <WashingMachine size={12} color={COLORS.white} />
                        )}
                      </View>
                      <View style={[
                        styles.stepLine,
                        selectedOrder.status === 'COMPLETED' ? styles.stepLineActive : styles.stepLineInactive
                      ]} />
                    </View>
                    <View style={styles.stepRight}>
                      <Text style={[styles.stepTitle, selectedOrder.status === 'IN_PROGRESS' && { color: COLORS.primaryDark }]}>
                        {isVietnamese ? 'Đang giặt sấy diệt khuẩn' : 'Cleaning with care'}
                      </Text>
                      <Text style={styles.stepDesc}>
                        {isVietnamese ? 'Trang phục của bạn đang được chăm sóc cẩn thận' : 'Your clothes are in the cycle'}
                      </Text>
                    </View>
                  </View>

                  {/* Step 4: Finished */}
                  <View style={[styles.timelineStep, { paddingBottom: 4 }]}>
                    <View style={styles.timelineLeft}>
                      <View style={[
                        styles.stepDot,
                        selectedOrder.status === 'COMPLETED' ? styles.stepDotDone : styles.stepDotPending
                      ]}>
                        <Check size={11} color={COLORS.white} strokeWidth={3} />
                      </View>
                    </View>
                    <View style={styles.stepRight}>
                      <Text style={[styles.stepTitle, selectedOrder.status === 'COMPLETED' && { color: COLORS.accentDark }]}>
                        {isVietnamese ? 'Hoàn tất chu trình' : 'Delivered & Ready'}
                      </Text>
                      <Text style={styles.stepDesc}>
                        {isVietnamese ? 'Sạch sẽ, thơm tho và sẵn sàng lấy đồ' : 'Fresh, folded, and ready to wear'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 3. STORE PARTNER BOX (Pinterest Screen 4 Partner Box) */}
                <View style={styles.partnerCard}>
                  <View style={styles.partnerAvatar}>
                    <WashingMachine size={22} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.partnerName}>
                      {selectedOrder.siteName || 'LaundroChain Flagship'}
                    </Text>
                    <Text style={styles.partnerRole}>
                      {isVietnamese ? 'Trạm giặt phục vụ 24/7' : 'Your Laundry Station'}
                    </Text>
                  </View>
                  <View style={styles.partnerActions}>
                    <TouchableOpacity
                      style={styles.partnerIconBtn}
                      onPress={() => Linking.openURL('tel:19001234')}
                      activeOpacity={0.7}
                    >
                      <Phone size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.partnerIconBtn}
                      onPress={() => Alert.alert('Hỗ trợ', isVietnamese ? 'Tổng đài viên LaundroChain đang sẵn sàng hỗ trợ bạn qua hotline 1900 1234' : 'Support hotline: 1900 1234')}
                      activeOpacity={0.7}
                    >
                      <MessageCircle size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 4. ORDER DETAILS (Pinterest Screen 4 Order Details) */}
                <View style={styles.detailsCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailTitle}>
                      {isVietnamese ? 'Chi tiết đơn hàng' : 'Order details'}
                    </Text>
                    <Text style={styles.detailPrice}>
                      {Number(selectedOrder.total ?? selectedOrder.amount ?? 35000).toLocaleString('vi-VN')} ₫
                    </Text>
                  </View>
                  <Text style={styles.detailSub}>
                    {selectedOrder.assignedMachines || selectedOrder.serviceName || 'Dịch vụ giặt sấy tiêu chuẩn'} • {selectedOrder.siteName || 'HQ'}
                  </Text>
                </View>

                {/* Action Buttons */}
                {selectedOrder.status === 'CONFIRMED' && (
                  <TouchableOpacity
                    style={[styles.modalStartBtn, actionLoading && { opacity: 0.7 }]}
                    onPress={() => handleStartOrder(selectedOrder)}
                    disabled={actionLoading}
                    activeOpacity={0.85}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Play size={16} color={COLORS.white} />
                        <Text style={styles.modalStartBtnText}>
                          {isVietnamese ? 'Bắt đầu chạy máy ngay' : 'Start Cycle Now'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {selectedOrder.status === 'PENDING_PAYMENT' && (
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => handleCancelOrder(selectedOrder)}
                    activeOpacity={0.8}
                  >
                    <Ban size={15} color={COLORS.danger} />
                    <Text style={styles.modalCancelBtnText}>
                      {isVietnamese ? 'Hủy đơn hàng này' : 'Cancel Order'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Need Help Button */}
                <TouchableOpacity
                  style={styles.helpBtn}
                  onPress={() => Alert.alert('Hỗ trợ', isVietnamese ? 'Hotline hỗ trợ kỹ thuật và đơn hàng: 1900 1234 (miễn phí)' : 'Hotline: 1900 1234')}
                  activeOpacity={0.7}
                >
                  <HelpCircle size={15} color={COLORS.textSecondary} />
                  <Text style={styles.helpBtnText}>
                    {isVietnamese ? 'Bạn cần trợ giúp về đơn hàng?' : 'Need help with your order?'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      <LanguageModal visible={langModalVisible} onClose={() => setLangModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterBar: {
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterLabelActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Order Card
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#243447',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderCode: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 12,
  },
  cardBody: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  infoTextSecondary: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  siteText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accentDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  startBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.dangerLight,
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.dangerDark,
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  orderNowBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  orderNowText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 13,
  },

  // Track Sheet (Pinterest Screen 4)
  trackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  trackSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  trackTopTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  trackTopSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  trackCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 1. Warm Fresh Card
  warmFreshCard: {
    backgroundColor: COLORS.bannerWarm,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.bannerBorder,
    marginBottom: 14,
    gap: 4,
  },
  warmOrderCode: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.bannerText,
    letterSpacing: 0.5,
  },
  warmTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.bannerText,
    letterSpacing: -0.3,
  },
  warmDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  warmDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.bannerText,
  },
  warmSub: {
    fontSize: 11,
    color: COLORS.bannerSubtext,
    lineHeight: 15,
    marginTop: 2,
  },

  // 2. Vertical Timeline (Pinterest Screen 4)
  timelineCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  timelineHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  timelineStep: {
    flexDirection: 'row',
    paddingBottom: 16,
  },
  timelineLeft: {
    width: 32,
    alignItems: 'center',
    marginRight: 10,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: COLORS.primary,
  },
  stepDotActive: {
    backgroundColor: COLORS.primaryLight,
  },
  stepDotPending: {
    backgroundColor: COLORS.border,
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary,
  },
  stepLineInactive: {
    backgroundColor: COLORS.border,
  },
  stepRight: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  stepTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  stepDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // 3. Partner Box
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 12,
    gap: 12,
  },
  partnerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  partnerRole: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  partnerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  partnerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 4. Details
  detailsCard: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  detailPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  detailSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // Action Buttons
  modalStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accentDark,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  modalStartBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
  },
  modalCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.dangerSoft,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  modalCancelBtnText: {
    color: COLORS.dangerDark,
    fontWeight: '700',
    fontSize: 13,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  helpBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
