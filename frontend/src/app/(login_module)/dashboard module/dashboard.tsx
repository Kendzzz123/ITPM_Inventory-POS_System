import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  RefreshControl,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  useWindowDimensions,
  Modal,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { getToken, clearToken } from '../Role';

const YOUR_PC_IP = '192.168.1.36'; // Update with your local IP if needed
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

type Me = {
  id: number;
  username: string;
  role: 'manager' | 'cashier' | 'Manager' | 'Cashier';
};

type SalesItem = {
  label: string;
  value: number;
};

type Transaction = {
  id: string;
  date: string;
  time: string;
  method: string;
  product: string;
  amount: string;
};

const CHART_HEIGHT = 180;

// Dynamic round-up ceiling logic so high numbers (like 100+) scale cleanly
const computeMaxScale = (val: number): number => {
  if (val <= 8) return 8;
  if (val <= 20) return Math.ceil(val / 4) * 4;
  if (val <= 50) return Math.ceil((val * 1.1) / 10) * 10;
  if (val <= 100) return Math.ceil((val * 1.05) / 20) * 20;
  return Math.ceil((val * 1.1) / 25) * 25;
};

export default function DashboardScreen() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

  // Backend and User Profile State
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Dynamic Dashboard States
  const [salesData, setSalesData] = useState<SalesItem[]>([]);
  const [maxScale, setMaxScale] = useState<number>(8);
  const [totalSold, setTotalSold] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Drawer Animation and State
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  const load = useCallback(async () => {
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const [profileRes, reportRes] = await Promise.all([
        axios.get(`${API_URL}/protected/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios
          .get(`${API_URL}/protected/dashboard-report`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() => null),
      ]);

      setMe(profileRes.data.user);

      if (reportRes && reportRes.data) {
        const fetchedSales: SalesItem[] = reportRes.data.salesData || [];
        setSalesData(fetchedSales);

        const calculatedTotal =
          reportRes.data.totalSold ??
          fetchedSales.reduce((acc, curr) => acc + Number(curr.value || 0), 0);
        setTotalSold(calculatedTotal);

        const maxVal = Math.max(...fetchedSales.map((item) => Number(item.value || 0)), 0);
        setMaxScale(computeMaxScale(maxVal));

        setTransactions(reportRes.data.transactions || []);
      } else {
        const fallbackSales: SalesItem[] = [
          { label: 'Whole Juicy Chicken', value: 8 },
          { label: 'Half Juicy chicken', value: 5 },
          { label: 'Spicy Chorizo', value: 1 },
          { label: 'Regular Chorizo', value: 1 },
        ];
        setSalesData(fallbackSales);
        setTotalSold(15);
        setMaxScale(8);
        setTransactions([
          { id: '1', date: '01/3/2026', time: '13:15', method: 'Cash', product: 'Whole Juicy Chicken', amount: '580' },
          { id: '2', date: '01/3/2026', time: '13:15', method: 'Cash', product: 'Half Juicy Chicken', amount: '300' },
          { id: '3', date: '01/3/2026', time: '13:15', method: 'Cash', product: 'Liempo', amount: '600' },
        ]);
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        await clearToken();
        router.replace('/');
        return;
      }
      setError(err.response?.data?.message || 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

  const navigateTo = (path: string) => {
    Animated.timing(slideAnim, {
      toValue: DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setMenuVisible(false);
      router.push(path as any);
    });
  };

  const handleLogout = async () => {
    await clearToken();
    closeMenu();
    router.replace('/');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e60000" />
      </View>
    );
  }

  if (error || !me) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Something went wrong.'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            load();
          }}
        >
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isManager = me.role?.toLowerCase() === 'manager';

  const gridSteps = [
    maxScale,
    Math.round(maxScale * 0.75),
    Math.round(maxScale * 0.5),
    Math.round(maxScale * 0.25),
    0,
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fffdf5" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#e60000']}
            tintColor="#e60000"
          />
        }
      >
        <View style={styles.card}>
          {/* Padded Top Section (Header + Sales Report) */}
          <View style={styles.paddedSection}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.profileContainer}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person-outline" size={36} color="#b8860b" />
                </View>
                <View style={styles.welcomeWrapper}>
                  <Text style={styles.welcomeText}>Welcome,</Text>
                  <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                    {me.username}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={openMenu}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="menu" size={32} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Sales Report Title */}
            <Text style={styles.sectionTitle}>Sales Report</Text>

            {/* Bar Chart Section */}
            <View style={styles.chartContainer}>
              <View style={styles.plotArea}>
                {/* Y-Axis and Horizontal Grid Lines */}
                <View style={styles.gridOverlay}>
                  {gridSteps.map((val, idx) => (
                    <View key={idx} style={styles.gridRow}>
                      <Text style={styles.axisLabel}>{val}</Text>
                      <View
                        style={[
                          styles.gridLine,
                          idx === gridSteps.length - 1 && styles.baselineGridLine,
                        ]}
                      />
                    </View>
                  ))}
                </View>

                {/* Bars */}
                <View style={styles.barsRow}>
                  {salesData.map((item, index) => {
                    const ratio = maxScale > 0 ? Number(item.value || 0) / maxScale : 0;
                    const barHeight = Math.min(
                      Math.max(ratio * CHART_HEIGHT, item.value > 0 ? 12 : 0),
                      CHART_HEIGHT
                    );

                    return (
                      <View key={index} style={styles.barColumn}>
                        <View style={[styles.bar, { height: barHeight }]} />
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* X-Axis Product Labels directly below 0 line */}
              <View style={styles.xAxisLabelsRow}>
                {salesData.map((item, index) => (
                  <View key={index} style={styles.xAxisLabelColumn}>
                    <Text
                      style={styles.barLabel}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={styles.salesSubtitle}>You sold {totalSold} items this day.</Text>
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => router.push('/dashboard module/sales-report' as any)}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>

            {/* Transaction History Title */}
            <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 14 }]}>
              Transaction History
            </Text>
          </View>

          {/* Edge-to-Edge Transaction History Block */}
          <View style={styles.tableCard}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.thCell, { flex: 1.1 }]}>Date</Text>
              <Text style={[styles.thCell, { flex: 0.85 }]}>Time</Text>
              <Text style={[styles.thCell, { flex: 1.55 }]}>Payment Method</Text>
              <Text style={[styles.thCell, { flex: 1.35 }]}>Product</Text>
              <Text style={[styles.thCell, { flex: 1.25 }]}>Total Amount</Text>
            </View>

            {/* Table Rows */}
            {transactions.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No recent transactions found.</Text>
              </View>
            ) : (
              transactions.map((tx, idx) => (
                <View
                  key={tx.id || idx}
                  style={[
                    styles.tableRow,
                    idx !== transactions.length - 1 && styles.tableRowBorder,
                  ]}
                >
                  <Text style={[styles.tdCell, { flex: 1.1 }]} numberOfLines={1}>
                    {tx.date}
                  </Text>
                  <Text style={[styles.tdCell, { flex: 0.85 }]} numberOfLines={1}>
                    {tx.time}
                  </Text>
                  <Text style={[styles.tdCell, { flex: 1.55 }]} numberOfLines={1}>
                    {tx.method}
                  </Text>
                  <Text style={[styles.tdCell, { flex: 1.35 }]} numberOfLines={2}>
                    {tx.product}
                  </Text>
                  <Text style={[styles.tdCell, { flex: 1.25 }]} numberOfLines={1}>
                    {tx.amount}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Padded Bottom Section (See All + Action Cards) */}
          <View style={styles.paddedSection}>
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => router.push('/TransactionHistory' as any)}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>

            {/* Action Cards (Manager/Cashier Tools) */}
            {isManager && (
              <>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push('/dashboard module/stocks' as any)}
                >
                  <Feather name="eye" size={22} color="#7c6e1d" />
                  <Text style={styles.actionCardText}>View Stocks</Text>
                  <Ionicons name="chevron-forward" size={20} color="#e60000" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push('/dashboard module/restock' as any)}
                >
                  <Feather name="package" size={22} color="#7c6e1d" />
                  <Text style={styles.actionCardText}>Restock</Text>
                  <Ionicons name="chevron-forward" size={20} color="#e60000" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Side Drawer Modal */}
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={closeMenu} />

          <Animated.View
            style={[
              styles.drawerContainer,
              { width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }] },
            ]}
          >
            {/* Top-Right Thin 'X' Close Button */}
            <TouchableOpacity
              style={styles.drawerCloseBtn}
              onPress={closeMenu}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="x" size={28} color="#1f2937" />
            </TouchableOpacity>

            {/* Menu Items List */}
            <View style={styles.drawerMenuWrapper}>
              <TouchableOpacity
  style={styles.drawerItem}
  onPress={() => navigateTo('/dashboard module/account-info')}
>
  <View style={styles.drawerIconBox}>
    <Ionicons name="person-outline" size={40} color="#ef0000" />
  </View>
  <Text style={styles.drawerItemText}>Account Information</Text>
</TouchableOpacity>

              <TouchableOpacity
  style={styles.drawerItem}
  onPress={() => navigateTo('/dashboard module/stock-alert')}
>
  <View style={styles.drawerIconBox}>
    <Ionicons name="notifications" size={40} color="#ef0000" />
  </View>
  <Text style={styles.drawerItemText}>Stock Alert</Text>
</TouchableOpacity>

              <TouchableOpacity
  style={styles.drawerItem}
  onPress={() => navigateTo('/dashboard module/manage-price')}
>
  <View style={styles.drawerIconBox}>
    <MaterialCommunityIcons name="tag-multiple" size={40} color="#ef0000" />
  </View>
  <Text style={styles.drawerItemText}>Manage Price</Text>
</TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateTo('/dashboard module/stocks')}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="eye-outline" size={42} color="#ef0000" />
                </View>
                <Text style={styles.drawerItemText}>Live Stock Count</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateTo('/dashboard module/record-waste')}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="document-text-outline" size={40} color="#ef0000" />
                </View>
                <Text style={styles.drawerItemText}>Record Waste</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateTo('/dashboard module/waste-history')}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="trash-outline" size={40} color="#ef0000" />
                </View>
                <Text style={styles.drawerItemText}>Waste History</Text>
              </TouchableOpacity>
            </View>

            {/* Log out Button */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>Log out</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fffdf5',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fffdf5',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#fffdf5',
  },
  paddedSection: {
    paddingHorizontal: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
    marginTop: Platform.OS === 'android' ? 8 : 0,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    gap: 12,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f6b800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeWrapper: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 13,
    color: '#374151',
  },
  userName: {
    fontWeight: '700',
    fontSize: 18,
    color: '#111827',
  },
  sectionTitle: {
    fontWeight: '500',
    fontSize: 22,
    color: '#111827',
    marginBottom: 22,
    marginLeft: 12,
  },
  /* Sales Report Chart Styles */
  chartContainer: {
    width: '100%',
    marginTop: 4,
  },
  plotArea: {
    height: CHART_HEIGHT,
    position: 'relative',
    width: '100%',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-between',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 16,
    marginVertical: -8,
  },
  axisLabel: {
    width: 24,
    fontSize: 11,
    color: '#1f2937',
    textAlign: 'right',
    paddingRight: 8,
  },
  gridLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#d6d3c9',
  },
  baselineGridLine: {
    backgroundColor: '#9ca3af',
  },
  barsRow: {
    position: 'absolute',
    left: 26,
    right: 0,
    bottom: 0,
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barColumn: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  bar: {
    width: '100%',
    backgroundColor: '#d92323',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  xAxisLabelsRow: {
    flexDirection: 'row',
    marginLeft: 26,
    marginTop: 8,
    justifyContent: 'space-between',
  },
  xAxisLabelColumn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  barLabel: {
    fontSize: 10,
    color: '#1f2937',
    textAlign: 'center',
  },
  salesSubtitle: {
    textAlign: 'center',
    fontSize: 16,
    color: '#111827',
    marginTop: 28,
    fontWeight: '400',
  },
  seeAllBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 4,
  },
  seeAllText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  /* Flush Edge-to-Edge Transaction History Block */
  tableCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#ffc400',
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  thCell: {
    fontWeight: '500',
    fontSize: 12,
    color: '#e60000',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  tableRowBorder: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#ffc400',
  },
  tdCell: {
    fontSize: 11,
    color: '#1f2937',
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyRow: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  emptyText: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#f6b800',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  actionCardText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontStyle: 'italic',
    color: '#262626',
    fontWeight: '500',
  },
  /* Sidebar Drawer Styles */
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerContainer: {
    backgroundColor: '#fdf8ea',
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingHorizontal: 22,
    paddingBottom: 32,
    justifyContent: 'flex-start',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: -2, height: 0 },
  },
  drawerCloseBtn: {
    alignSelf: 'flex-end',
    padding: 4,
    marginBottom: 24,
  },
  drawerMenuWrapper: {
    gap: 28,
    marginTop: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerIconBox: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  drawerItemText: {
    fontSize: 13.5,
    color: '#1f2937',
    fontWeight: '400',
  },
  logoutBtn: {
    marginTop: 42,
    marginHorizontal: 18,
    height: 44,
    backgroundColor: '#ef0000',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 15,
    color: '#b91c1c',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#e60000',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});