import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {
  Wallet,
  CreditCard,
  Crown,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
  Sparkles,
  Coins,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Zap,
} from 'lucide-react-native';
import { COLORS } from '../../constants/config';
import { walletsApi } from '../../api/walletsApi';
import { memberApi } from '../../api/memberApi';
import { memberTiersApi } from '../../api/memberTiersApi';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import Header from '../../components/Header';
import LanguageModal from '../../components/LanguageModal';
import TopupModal from '../../components/TopupModal';

const TX_FILTERS = [
  { key: 'ALL', labelVi: 'Tất cả', labelEn: 'All' },
  { key: 'TOPUP', labelVi: 'Nạp tiền', labelEn: 'Top-up' },
  { key: 'PAYMENT', labelVi: 'Thanh toán', labelEn: 'Payment' },
];

export default function MemberWalletScreen() {
  const { user } = useAuth();
  const { isVietnamese } = useLanguage();

  const [wallet, setWallet] = useState(null);
  const [memberCard, setMemberCard] = useState(null);
  const [tierProgress, setTierProgress] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txFilter, setTxFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);

  const hasLoadedRef = useRef(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent && !hasLoadedRef.current) setLoading(true);
    hasLoadedRef.current = true;
    try {
      const [walletRes, cardRes, txRes, progRes] = await Promise.allSettled([
        walletsApi.getMyWallet(),
        memberApi.getCard(),
        walletsApi.getMyTransactions({ pageSize: 30 }),
        memberTiersApi.getMyProgress(),
      ]);

      if (walletRes.status === 'fulfilled' && walletRes.value) {
        setWallet(walletRes.value);
      }
      if (cardRes.status === 'fulfilled' && cardRes.value) {
        setMemberCard(cardRes.value);
      }
      if (txRes.status === 'fulfilled' && txRes.value) {
        const items = txRes.value?.items || (Array.isArray(txRes.value) ? txRes.value : []);
        setTransactions(items);
      }
      if (progRes.status === 'fulfilled' && progRes.value) {
        setTierProgress(progRes.value);
      }
    } catch (err) {
      console.warn('Lỗi tải dữ liệu ví', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopy = async (text) => {
    if (!text) return;
    await Clipboard.setStringAsync(String(text));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const balance = wallet?.balance ?? user?.walletBalance ?? 0;
  const memberCode = memberCard?.memberCode || user?.memberCode || 'LC100040';
  const tierName = memberCard?.tierName || user?.tierCode || 'STANDARD';
  const points = wallet?.points || tierProgress?.currentPoints || 0;

  const filteredTxs = transactions.filter((tx) => {
    if (txFilter === 'ALL') return true;
    const type = String(tx.type || tx.transactionType || '').toUpperCase();
    if (txFilter === 'TOPUP') return type.includes('TOPUP') || type.includes('DEPOSIT') || type.includes('NAP');
    if (txFilter === 'PAYMENT') return type.includes('PAY') || type.includes('ORDER') || type.includes('GIAT');
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isVietnamese ? 'Ví thành viên' : 'My Wallet'}
        subtitle={isVietnamese ? 'Quản lý số dư, điểm thưởng & giao dịch' : 'Manage balance, points & history'}
        onOpenLang={() => setLangModalVisible(true)}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(true); }} colors={[COLORS.primary]} />
        }
      >
        {/* 1. DIGITAL MEMBER CARD (Thẻ thành viên điện tử sang trọng) */}
        <View style={styles.cardContainer}>
          {/* Card Top Row: Brand & Chip */}
          <View style={styles.cardTopRow}>
            <View style={styles.cardBrandBox}>
              <Zap size={18} color={COLORS.secondary} fill={COLORS.secondary} />
              <Text style={styles.cardBrandText}>LaundroChain Pay</Text>
            </View>
            <View style={styles.tierPill}>
              <Crown size={12} color={COLORS.secondary} />
              <Text style={styles.tierPillText}>{tierName.toUpperCase()}</Text>
            </View>
          </View>

          {/* Balance */}
          <View style={styles.cardBalanceBox}>
            <Text style={styles.cardBalanceLabel}>
              {isVietnamese ? 'SỐ DƯ KHẢ DỤNG' : 'AVAILABLE BALANCE'}
            </Text>
            <Text style={styles.cardBalanceAmount}>
              {balance.toLocaleString('vi-VN')} <Text style={styles.currencySymbol}>₫</Text>
            </Text>
          </View>

          {/* Card Bottom Row: Member Code & Name */}
          <View style={styles.cardBottomRow}>
            <View>
              <Text style={styles.cardHolderLabel}>{isVietnamese ? 'CHỦ THẺ' : 'CARD HOLDER'}</Text>
              <Text style={styles.cardHolderName} numberOfLines={1}>
                {user?.fullName || user?.username || 'Hội viên LaundroChain'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.cardCodeBtn}
              onPress={() => handleCopy(memberCode)}
              activeOpacity={0.7}
            >
              <Text style={styles.cardCodeText}>{memberCode}</Text>
              {copiedCode ? <Check size={13} color="#86EFAC" /> : <Copy size={13} color="#93C5FD" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. QUICK ACTIONS & TOP-UP BUTTON */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.topupMainBtn}
            onPress={() => setTopupModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.topupIconWrap}>
              <ArrowDownLeft size={18} color={COLORS.white} />
            </View>
            <Text style={styles.topupMainBtnText}>
              {isVietnamese ? '+ Nạp tiền qua VietQR' : '+ Top up via VietQR'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. TIER PROGRESSION & REWARD POINTS */}
        <View style={styles.tierProgressCard}>
          <View style={styles.tpHeader}>
            <View style={styles.tpLeft}>
              <View style={styles.tpCrownWrap}>
                <Coins size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.tpTitle}>
                  {isVietnamese ? 'Điểm thưởng thành viên' : 'Loyalty Reward Points'}
                </Text>
                <Text style={styles.tpSub}>
                  {isVietnamese ? `Tích lũy ${points} điểm khả dụng` : `${points} points available`}
                </Text>
              </View>
            </View>
            <Text style={styles.tpPointsNum}>{points} pts</Text>
          </View>

          {tierProgress && (
            <View style={styles.progressBarWrap}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(
                        100,
                        Math.max(
                          10,
                          tierProgress.pointsToNextTier
                            ? Math.round((points / (points + tierProgress.pointsToNextTier)) * 100)
                            : 100
                        )
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barText}>
                {tierProgress.nextTierName
                  ? (isVietnamese
                      ? `Còn ${tierProgress.pointsToNextTier || 100} điểm để lên hạng ${tierProgress.nextTierName}`
                      : `${tierProgress.pointsToNextTier || 100} pts to ${tierProgress.nextTierName}`)
                  : (isVietnamese ? 'Bạn đã đạt hạng cao nhất!' : 'Max tier achieved!')}
              </Text>
            </View>
          )}
        </View>

        {/* 4. TRANSACTION HISTORY SECTION */}
        <View style={styles.txSectionHeader}>
          <Text style={styles.txSectionTitle}>
            {isVietnamese ? 'Lịch sử giao dịch' : 'Transaction History'}
          </Text>
        </View>

        {/* Filter Chips */}
        <View style={styles.txFilterRow}>
          {TX_FILTERS.map((f) => {
            const isSelected = txFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.txChip, isSelected && styles.txChipActive]}
                onPress={() => setTxFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.txChipText, isSelected && styles.txChipTextActive]}>
                  {isVietnamese ? f.labelVi : f.labelEn}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Transactions List */}
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 30 }} />
        ) : filteredTxs.length > 0 ? (
          <View style={styles.txListCard}>
            {filteredTxs.map((tx, idx) => {
              const type = String(tx.type || tx.transactionType || '').toUpperCase();
              const isTopup = type.includes('TOPUP') || type.includes('DEPOSIT') || type.includes('NAP');
              const amount = Number(tx.amount || 0);

              return (
                <View key={tx.transactionId || tx.id || idx}>
                  <View style={styles.txItem}>
                    <View style={[styles.txIconWrap, isTopup ? styles.txIconTopup : styles.txIconPayment]}>
                      {isTopup ? (
                        <ArrowDownLeft size={18} color={COLORS.success} />
                      ) : (
                        <ArrowUpRight size={18} color={COLORS.primary} />
                      )}
                    </View>

                    <View style={styles.txContent}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {tx.description || tx.note || (isTopup ? (isVietnamese ? 'Nạp tiền vào ví' : 'Wallet Top-up') : (isVietnamese ? 'Thanh toán đơn giặt' : 'Order Payment'))}
                      </Text>
                      <Text style={styles.txDate}>
                        {new Date(tx.createdAt || Date.now()).toLocaleString('vi-VN')}
                      </Text>
                    </View>

                    <View style={styles.txAmountCol}>
                      <Text style={[styles.txAmountText, isTopup ? styles.txAmountTopup : styles.txAmountPayment]}>
                        {isTopup ? '+' : '-'}{Math.abs(amount).toLocaleString('vi-VN')} ₫
                      </Text>
                      <View style={[styles.txStatusPill, tx.status === 'SUCCESS' ? styles.txStatusSuccess : styles.txStatusPending]}>
                        <Text style={[styles.txStatusText, tx.status === 'SUCCESS' ? styles.txStatusTextSuccess : styles.txStatusTextPending]}>
                          {tx.status || 'THÀNH CÔNG'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {idx < filteredTxs.length - 1 && <View style={styles.txDivider} />}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Wallet size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              {isVietnamese ? 'Chưa có giao dịch nào phù hợp.' : 'No transactions recorded yet.'}
            </Text>
          </View>
        )}

        {/* Space for bottom navigation bar */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modals */}
      <LanguageModal visible={langModalVisible} onClose={() => setLangModalVisible(false)} />
      <TopupModal
        visible={topupModalVisible}
        onClose={() => setTopupModalVisible(false)}
        onSuccess={() => fetchData(true)}
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

  // Digital Card (Primary Blue with Cyan highlights)
  cardContainer: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardBrandBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardBrandText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierPillText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardBalanceBox: {
    marginBottom: 20,
    gap: 2,
  },
  cardBalanceLabel: {
    color: COLORS.secondaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cardBalanceAmount: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.secondaryLight,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
    paddingTop: 12,
  },
  cardHolderLabel: {
    color: COLORS.secondaryLight,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardHolderName: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  cardCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cardCodeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Actions
  actionRow: {
    marginBottom: 16,
  },
  topupMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  topupIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topupMainBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
  },

  // Tier Progress Card
  tierProgressCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  tpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tpCrownWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tpTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  tpSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  tpPointsNum: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primary,
  },
  progressBarWrap: {
    gap: 6,
  },
  barTrack: {
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  barText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // Transactions Section
  txSectionHeader: {
    marginBottom: 10,
  },
  txSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  txFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  txChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  txChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  txChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  txChipTextActive: {
    color: COLORS.white,
  },

  // Transactions List
  txListCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  txIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txIconTopup: {
    backgroundColor: COLORS.successSoft,
  },
  txIconPayment: {
    backgroundColor: COLORS.primarySoft,
  },
  txContent: {
    flex: 1,
    gap: 2,
    paddingRight: 8,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  txDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  txAmountCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  txAmountText: {
    fontSize: 14,
    fontWeight: '800',
  },
  txAmountTopup: {
    color: COLORS.success,
  },
  txAmountPayment: {
    color: COLORS.text,
  },
  txStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txStatusSuccess: {
    backgroundColor: COLORS.successSoft,
  },
  txStatusPending: {
    backgroundColor: COLORS.warningSoft,
  },
  txStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  txStatusTextSuccess: {
    color: COLORS.success,
  },
  txStatusTextPending: {
    color: COLORS.warning,
  },
  txDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },

  // Empty
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
