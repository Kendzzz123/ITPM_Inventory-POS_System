// stock-alert.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect, type Href } from 'expo-router';
import { api, API_ROUTES } from '@/config/apiConfig';
import { getToken } from '@/services/authService';
import { getDarkMode, setGlobalDarkMode, getUserRole, setGlobalUserRole, subscribeAppTheme } from '@/store/appState';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import { showAlert } from '@/utils/alert';
import { toStockLevel, formatNumber, type StockLevel } from '@/utils/stock';


/** How often the screen re-checks the stock while it is open. */
const RECHECK_MS = 15000;

/** "2:45 PM" */
function formatTime(date: Date): string {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

export default function StockAlertScreen() {
  const router = useRouter();
  // null = not known yet (first check still running, or it failed)
  const [hasLowStock, setHasLowStock] = useState<boolean | null>(null);
  const [lowItems, setLowItems] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // first check only
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);

  const [role, setRole] = useState<'cashier' | 'manager'>(getUserRole());
  const [darkMode, setDarkMode] = useState<boolean>(getDarkMode());

  const isCashierDark = role === 'cashier' && darkMode;
  const isManager = role === 'manager';
  const textColor = { color: isCashierDark ? '#FFFFFF' : '#111827' };

  useEffect(() => {
    return subscribeAppTheme(() => {
      setDarkMode(getDarkMode());
      setRole(getUserRole());
    });
  }, []);

  // Role (for dark mode and the side menu) — loaded once.
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      const accRes = await api
        .get(API_ROUTES.ACCOUNT, { headers: { Authorization: `Bearer ${token}` } })
        .catch(() => null);
      if (accRes?.data?.account?.role) {
        const fetchedRole =
          accRes.data.account.role.toLowerCase() === 'manager' ? 'manager' : 'cashier';
        setRole(fetchedRole);
        setGlobalUserRole(fetchedRole);
      }
    })();
  }, []);

  /**
   * Asks the server whether any stock is at or below its minimum level.
   * @param showErrors false for the automatic re-checks, so a dropped connection
   *   doesn't pop up an alert every 15 seconds (the last result stays on screen).
   */
  const checkStockStatus = useCallback(
    async (showErrors: boolean) => {
      try {
        const token = await getToken();
        if (!token) {
          router.replace('/');
          return;
        }
        const res = await api.get(API_ROUTES.STOCKS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const stocks = ((res.data?.stocks || []) as unknown[]).map(toStockLevel);
        const low = stocks.filter((s) => s.isLow);
        setLowItems(low);
        setHasLowStock(Boolean(res.data?.hasLowStock) || low.length > 0);
        setLastChecked(new Date());
      } catch (err: any) {
        if (showErrors) {
          showAlert('Error', err.response?.data?.message || 'Could not check stock levels.');
        }
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  // Check right away every time the screen is opened (e.g. coming back from
  // Restock or the POS), then keep re-checking while it stays open.
  useFocusEffect(
    useCallback(() => {
      checkStockStatus(true);
      const timer = setInterval(() => checkStockStatus(false), RECHECK_MS);
      return () => clearInterval(timer);
    }, [checkStockStatus])
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, isCashierDark && { backgroundColor: '#181920' }]}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle={isCashierDark ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name="chevron-back"
              size={30}
              color={isCashierDark ? '#FFFFFF' : '#111827'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="menu" size={32} color={isCashierDark ? '#FFFFFF' : '#111827'} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.pageTitle, textColor]}>Stock Alert</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#e60000" style={{ marginTop: 40 }} />
          ) : hasLowStock === null ? (
            <View style={styles.stateWrapper}>
              <Feather name="wifi-off" size={110} color="#9CA3AF" />
              <Text style={[styles.statusHeading, textColor]}>Can&apos;t check stock</Text>
              <Text style={[styles.statusSubtext, textColor]}>
                Couldn&apos;t reach the server. Trying again automatically...
              </Text>
            </View>
          ) : hasLowStock ? (
            <View style={styles.stateWrapper}>
              <Feather name="alert-triangle" size={lowItems.length > 2 ? 120 : 165} color="#ef0000" />
              <Text style={[styles.statusHeading, textColor]}>Low Stock!</Text>
              <Text style={[styles.statusSubtext, textColor]}>
                {isManager
                  ? 'You need to restock these items:'
                  : 'These items are running low. Let the manager know:'}
              </Text>

              <View style={[styles.lowList, isCashierDark && styles.lowListDark]}>
                {lowItems.map((item, idx) => (
                  <View
                    key={item.id}
                    style={[styles.lowRow, idx > 0 && styles.lowRowBorder]}
                    accessibilityLabel={`${item.name}: ${formatNumber(item.quantity)} left, minimum ${formatNumber(item.minLevel)} ${item.unit}`}
                  >
                    <Text style={[styles.lowName, textColor]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.lowQty}>
                      {formatNumber(item.quantity)}
                      <Text style={[styles.lowMin, isCashierDark && { color: '#9CA3AF' }]}>
                        {' '}/ min {formatNumber(item.minLevel)} {item.unit}
                      </Text>
                    </Text>
                  </View>
                ))}
              </View>

              {isManager && (
                <TouchableOpacity
                  style={styles.restockBtn}
                  onPress={() => router.push('/restock' as Href)}
                  accessibilityRole="button"
                >
                  <Text style={styles.restockBtnText}>Restock now</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.stateWrapper}>
              <View style={styles.greenCircle}>
                <Feather name="check" size={85} color="#3f7d00" />
              </View>
              <Text style={[styles.statusHeading, textColor]}>All set!</Text>
              <Text style={[styles.statusSubtext, textColor]}>No need to restock yet.</Text>
            </View>
          )}

          {!loading && lastChecked && (
            <Text style={[styles.lastChecked, textColor]}>
              Last checked {formatTime(lastChecked)} · updates automatically
            </Text>
          )}
        </ScrollView>
      </View>

      <RoleSideDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        role={role}
        darkMode={darkMode}
        onToggleDarkMode={() => setGlobalDarkMode(!darkMode)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fffdf5',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 95,
    paddingBottom: 24,
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
    marginBottom: 36,
  },
  stateWrapper: {
    alignItems: 'center',
    alignSelf: 'stretch', // lets the low-item list use the full width
  },
  greenCircle: {
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 12,
    borderColor: '#3f7d00',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusHeading: {
    fontSize: 24,
    fontFamily: 'Poppins_400Regular',
    color: '#111827',
    marginTop: 22,
    marginBottom: 12,
  },
  statusSubtext: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: '#1f2937',
    textAlign: 'center',
  },
  lowList: {
    alignSelf: 'stretch',
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  lowListDark: {
    backgroundColor: '#22242E',
    borderColor: '#7F1D1D',
  },
  lowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  lowRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#FDE2E2',
  },
  lowName: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 13.5,
  },
  lowQty: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13.5,
    color: '#ef0000',
  },
  lowMin: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: '#6B7280',
  },
  restockBtn: {
    marginTop: 18,
    backgroundColor: '#e60000',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  restockBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  lastChecked: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#6B7280',
    marginTop: 28,
    opacity: 0.8,
  },
});