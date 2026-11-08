// stocks.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect, type Href } from 'expo-router';
import { api, API_ROUTES } from '@/config/apiConfig';
import { getToken, clearToken } from '@/services/authService';
import { imageFor } from '@/constants/images';
import { showAlert } from '@/utils/alert';
import { toStockLevel, formatNumber, joinNames, type StockLevel } from '@/utils/stock';
import { getDarkMode, setGlobalDarkMode, getUserRole, setGlobalUserRole, subscribeAppTheme } from '@/store/appState';
import RoleSideDrawer from '@/components/RoleSideDrawer';


type StockCardItem = StockLevel & { image: string };

export default function StocksScreen() {
  const router = useRouter();

  const [stocks, setStocks] = useState<StockCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const [role, setRole] = useState<'cashier' | 'manager'>(getUserRole());
  const [darkMode, setDarkMode] = useState(getDarkMode());

  const isCashierDark = role === 'cashier' && darkMode;
  const iconColor = isCashierDark ? '#FFFFFF' : '#111827';

  useEffect(() => {
    return subscribeAppTheme(() => {
      setDarkMode(getDarkMode());
      setRole(getUserRole());
    });
  }, []);

  const loadStocks = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const [accRes, res] = await Promise.all([
        api
          .get(API_ROUTES.ACCOUNT, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() => null),
        api.get(API_ROUTES.STOCKS, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (accRes?.data?.account?.role) {
        const fetchedRole =
          accRes.data.account.role.toLowerCase() === 'manager' ? 'manager' : 'cashier';
        setRole(fetchedRole);
        setGlobalUserRole(fetchedRole);
      }

      const dbStocks: unknown[] = res.data?.stocks || [];
      setStocks(
        dbStocks.map((row) => {
          const s = toStockLevel(row);
          return { ...s, image: imageFor(s.name) };
        })
      );
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        await clearToken();
        router.replace('/');
        return;
      }
      showAlert('Error', err.response?.data?.message || 'Could not load stocks. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Reload whenever the screen comes back into focus (e.g. after editing).
  useFocusEffect(
    useCallback(() => {
      loadStocks();
    }, [loadStocks])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStocks();
    setRefreshing(false);
  }, [loadStocks]);

  const lowItems = stocks.filter((s) => s.isLow);
  const isManager = role === 'manager';

  return (
    <SafeAreaView
      style={[styles.safeArea, isCashierDark && { backgroundColor: '#181920' }]}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle={isCashierDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e60000']} />
        }
      >
        <View style={styles.container}>
          {/* Top Navigation Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={30} color={iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="menu" size={32} color={iconColor} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.pageTitle, { color: iconColor }]}>Stocks</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#e60000" style={{ marginTop: 40 }} />
          ) : (
            <>
              {lowItems.length > 0 && (
                <TouchableOpacity
                  style={[styles.lowBanner, isCashierDark && styles.lowBannerDark]}
                  onPress={() => router.push((isManager ? '/restock' : '/stock-alert') as Href)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <Feather name="alert-triangle" size={20} color="#ef0000" />
                  <Text style={[styles.lowBannerText, isCashierDark && { color: '#FECACA' }]}>
                    {lowItems.length === 1 ? '1 item is' : `${lowItems.length} items are`} low:{' '}
                    {joinNames(lowItems.map((s) => s.name))}.{' '}
                    <Text style={styles.lowBannerLink}>{isManager ? 'Restock' : 'See Stock Alert'}</Text>
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.grid}>
                {stocks.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.stockCard,
                      isCashierDark && { backgroundColor: '#22242E' },
                      item.isLow && styles.stockCardLow,
                    ]}
                    accessibilityLabel={`${item.name}: ${formatNumber(item.quantity)} ${item.unit}${
                      item.isLow ? `, low stock (minimum ${formatNumber(item.minLevel)})` : ''
                    }`}
                  >
                    <View
                      style={[
                        styles.imageWrapper,
                        isCashierDark && { backgroundColor: '#22242E' },
                      ]}
                    >
                      <Image
                        source={{ uri: item.image }}
                        style={styles.stockImage}
                        resizeMode="contain"
                      />
                      {item.isLow && (
                        <View style={styles.lowBadge}>
                          <Text style={styles.lowBadgeText}>LOW</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.cardFooter, item.isLow && styles.cardFooterLow]}>
                      <Text
                        style={[styles.stockName, item.isLow && styles.textOnRed]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text style={[styles.stockQty, item.isLow && styles.textOnRed]}>
                        {formatNumber(item.quantity)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

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
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  container: {
    width: '100%',
    maxWidth: 480,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 28,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  stockCard: {
    width: '47.5%',
    backgroundColor: '#fffdf8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fcd34d',
    overflow: 'hidden',
  },
  stockCardLow: {
    borderWidth: 2,
    borderColor: '#ef0000',
  },
  lowBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef0000',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  lowBadgeText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardFooterLow: {
    backgroundColor: '#ef0000',
  },
  textOnRed: {
    color: '#FFFFFF',
  },
  lowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  lowBannerDark: {
    backgroundColor: '#3A1F22',
    borderColor: '#7F1D1D',
  },
  lowBannerText: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#991B1B',
  },
  lowBannerLink: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#ef0000',
    textDecorationLine: 'underline',
  },
  imageWrapper: {
    height: 115,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffdf8',
  },
  stockImage: {
    width: '90%',
    height: '90%',
    borderRadius: 8,
  },
  cardFooter: {
    backgroundColor: '#ffd428',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  stockName: {
    fontSize: 10.5,
    fontFamily: 'Poppins_500Medium',
    color: '#111827',
    flex: 1,
    marginRight: 4,
  },
  stockQty: {
    fontSize: 11.5,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
  },
});