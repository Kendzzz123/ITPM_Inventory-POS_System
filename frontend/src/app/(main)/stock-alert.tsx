/**
 * @file stock-alert.tsx
 * @description Stock Alert: checks on open and every 15 seconds whether any
 * menu item is low, and lists them as "Whole Juicy Chicken (10 remaining)".
 * Uses the same item list as Inventory (services/inventory.ts).
 */
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
import { useRouter, useFocusEffect } from 'expo-router';
import { api, API_ROUTES } from '@/config/apiConfig';
import { getToken } from '@/services/authService';
import { getUserRole, setGlobalUserRole, subscribeAppTheme } from '@/store/appState';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import { showAlert } from '@/utils/alert';
import { formatNumber } from '@/utils/stock';
import { fetchInventory, remainingLabel, type InventoryCard } from '@/services/inventory';


/** How often the screen re-checks the stock while it is open. */
const RECHECK_MS = 15000;

export default function StockAlertScreen() {
  const router = useRouter();
  // null = not known yet (first check still running, or it failed)
  const [hasLowStock, setHasLowStock] = useState<boolean | null>(null);
  const [lowItems, setLowItems] = useState<InventoryCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // first check only
  const [menuVisible, setMenuVisible] = useState<boolean>(false);

  const [role, setRole] = useState<'cashier' | 'manager'>(getUserRole());

  const isManager = role === 'manager';
  const textColor = { color: '#111827' };

  useEffect(() => {
    return subscribeAppTheme(() => {
      setRole(getUserRole());
    });
  }, []);

  // Role (for the side menu) — loaded once.
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
   * Checks whether any menu item is at or below its minimum stock level.
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
        const low = (await fetchInventory(token)).filter((c) => c.isLow);
        setLowItems(low);
        setHasLowStock(low.length > 0);
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
      style={styles.safeArea}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle="dark-content" />
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
              color={'#111827'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="menu" size={32} color={'#111827'} />
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
                  ? 'You need to restock the following menu:'
                  : 'These items are running low. Let the manager know:'}
              </Text>

              <View style={styles.lowList}>
                {lowItems.map((item) => (
                  <Text key={item.name} style={[styles.lowRow, textColor]}>
                    {'\u2022  '}
                    {item.name} <Text style={styles.lowQty}>({remainingLabel(item, formatNumber)})</Text>
                  </Text>
                ))}
              </View>
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

          
        </ScrollView>
      </View>

      <RoleSideDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        role={role}
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
    marginTop: 14,
    paddingHorizontal: 36,
  },
  lowRow: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 20,
  },
  lowQty: {
    color: '#ef0000',
  },
});

// TEST: with Whole at 10 (min 10) the list shows Whole Juicy Chicken (10 remaining) and Half Juicy Chicken (20 remaining)
