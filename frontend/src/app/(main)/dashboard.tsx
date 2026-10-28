import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  RefreshControl,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  Modal,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_400Regular_Italic,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import axios from 'axios';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import { API_URL } from '@/config/apiConfig';
import { getToken, clearToken } from '@/services/authService';
import { setGlobalUserRole } from '@/store/appState';


// 4.1 Color Palette Specification
const COLORS = {
  yellow: '#FFC400',     // Brand yellow
  red: '#EC0000',        // Primary buttons, links, sales chart bars, alert icons
  cream: '#FFFDF5',      // Light cream screen background
  drawerCream: '#FDF8EA',// Side menu surface
  white: '#FFFFFF',      // Input fields, cards, text on red buttons
  nearBlack: '#0F1015',  // Titles, labels, and body text
};

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

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_400Regular_Italic,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

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

  // Drawer & Logout Confirmation State
  const [menuVisible, setMenuVisible] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const profileRes = await axios.get(`${API_URL}/protected/profile`, { headers });
      const loggedUser = profileRes.data?.user;
      setGlobalUserRole(loggedUser?.role);

      // Redirect cashiers to Cashier Dashboard automatically
      if (loggedUser?.role?.toLowerCase() === 'cashier') {
        router.replace('/cashier-dashboard' as Href);
        return;
      }

      // Real data only — an empty chart/table means there are no sales yet.
      const reportRes = await axios.get(`${API_URL}/protected/dashboard-report`, { headers });
      setMe(loggedUser);

      const fetchedSales: SalesItem[] = reportRes.data?.salesData || [];
      setSalesData(fetchedSales);
      setTotalSold(
        Number(
          reportRes.data?.totalSold ??
            fetchedSales.reduce((acc, curr) => acc + Number(curr.value || 0), 0)
        )
      );
      const maxVal = Math.max(...fetchedSales.map((item) => Number(item.value || 0)), 0);
      setMaxScale(computeMaxScale(maxVal));
      setTransactions(
        (reportRes.data?.transactions || []).map((tx: Transaction) => ({
          ...tx,
          amount: Number(tx.amount).toLocaleString(),
        }))
      );
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





  if (loading || !fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.red} />
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.red]}
            tintColor={COLORS.red}
          />
        }
      >
        <View style={styles.container}>
        <TouchableOpacity
                onPress={() => setMenuVisible(true)}
                hitSlop={{ top: 20, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="menu" size={32} color={COLORS.nearBlack} />
              </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {/* Padded Top Section (Header + Sales Report) */}
          
          <View style={styles.paddedSection}>
            {/* Header */}
            <View style={styles.header}>
              
              <View style={styles.profileContainer}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person-outline" size={36} color="#9e7b08" />
                </View>
                <View style={styles.welcomeWrapper}>
                  <Text style={styles.welcomeText}>Welcome,</Text>
                  <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                    {me.username}
                  </Text>
                </View>
              </View>

              
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
              onPress={() => router.push('/sales-report' as Href)}
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
              onPress={() => router.push('/transaction-history' as Href)}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>

            {/* Action Cards (Manager Tools) */}
            {isManager && (
              <>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push('/stocks' as Href)}
                >
                  <Feather name="eye" size={22} color="#7c6e1d" />
                  <Text style={styles.actionCardText}>View Stocks</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.red} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push('/restock' as Href)}
                >
                  <Feather name="package" size={22} color="#7c6e1d" />
                  <Text style={styles.actionCardText}>Restock</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.red} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push('/record-waste' as Href)}
                >
                  <Ionicons name="document-text-outline" size={22} color="#7c6e1d" />
                  <Text style={styles.actionCardText}>Record Waste</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.red} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push('/waste-history' as Href)}
                >
                  <Ionicons name="trash-outline" size={22} color="#7c6e1d" />
                  <Text style={styles.actionCardText}>Waste History</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.red} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <RoleSideDrawer visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    marginLeft: 600,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.cream,
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
    backgroundColor: COLORS.cream,
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
    backgroundColor: COLORS.yellow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeWrapper: {
    flex: 1,
  },
  welcomeText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: COLORS.nearBlack,
  },
  userName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: COLORS.nearBlack,
  },
  sectionTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    color: COLORS.nearBlack,
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
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: COLORS.nearBlack,
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
    backgroundColor: COLORS.red,
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
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: COLORS.nearBlack,
    textAlign: 'center',
  },
  salesSubtitle: {
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    fontSize: 15,
    color: COLORS.nearBlack,
    marginTop: 28,
  },
  seeAllBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 4,
  },
  seeAllText: {
    fontFamily: 'Poppins_500Medium',
    color: COLORS.red,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  /* Flush Edge-to-Edge Transaction History Block */
  tableCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.yellow,
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  thCell: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    color: COLORS.red,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  tableRowBorder: {
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.yellow,
  },
  tdCell: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: COLORS.nearBlack,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyRow: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: COLORS.nearBlack,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.yellow,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  actionCardText: {
    flex: 1,
    marginLeft: 12,
    fontFamily: 'Poppins_400Regular_Italic',
    fontSize: 13.5,
    color: COLORS.nearBlack,
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
    backgroundColor: COLORS.drawerCream,
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
    gap: 26,
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
    fontFamily: 'Poppins_400Regular',
    fontSize: 13.5,
    color: COLORS.nearBlack,
  },
  logoutBtn: {
    marginTop: 42,
    marginHorizontal: 18,
    height: 44,
    backgroundColor: COLORS.red,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    fontSize: 14,
  },
  /* Confirmation Dialog Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FDFBF0',
    borderRadius: 34,
    paddingVertical: 32,
    paddingHorizontal: 22,
    alignItems: 'center',
    elevation: 10,
  },
  modalIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: COLORS.nearBlack,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: COLORS.white,
  },
  modalPrompt: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: COLORS.red,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 26,
  },
  modalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.red,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.red,
    fontSize: 12.5,
  },
  confirmBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    fontSize: 12.5,
  },
  errorText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: COLORS.red,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: COLORS.red,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: COLORS.white,
  },
});